import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from database import get_db
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment, CourseMaterial, EnrollmentStatus
from models.content import Module, Lesson, LessonProgress
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus
from schemas.schemas import (
    CourseCreate, CourseUpdate, CourseResponse, CourseDetailResponse,
    ModuleCreate, LessonCreate, EnrollRequest, MaterialCreate, MaterialResponse
)
from middleware.auth import get_current_user, require_roles
from middleware.scoping import verify_course_access, verify_org_access
from models.synced_legacy import SyncedSubject
from services.notification_service import notify_enrollment
from services.metrics import attendance_for, assessment_for, progress_for


router = APIRouter(prefix="/api/courses", tags=["Courses"])


def _compute_progress(course: Course, db: Session) -> int:
    """Compute syllabus progress based on attendance sessions held vs estimated total (60)."""
    sessions_held = db.query(AttendanceSession).filter(AttendanceSession.course_id == course.id).count()
    estimated_total = 60  # Approximate sessions per semester
    return min(int((sessions_held / estimated_total) * 100), 100) if estimated_total > 0 else 0


def _build_course_response(course: Course, db: Session, current_user: User) -> CourseResponse:
    # 1. Fetch modules and lessons
    mod_query = db.query(Module).filter(
        Module.course_id == course.id,
        Module.org_id == current_user.org_id
    )
    if current_user.role == UserRole.STUDENT:
        mod_query = mod_query.filter(Module.is_published == True)
    modules = mod_query.order_by(Module.order_index).all()

    modules_data = []
    all_lessons = []
    for mod in modules:
        lesson_query = db.query(Lesson).filter(
            Lesson.module_id == mod.id,
            Lesson.org_id == current_user.org_id
        )
        if current_user.role == UserRole.STUDENT:
            lesson_query = lesson_query.filter(Lesson.is_published == True)
        lessons = lesson_query.order_by(Lesson.order_index).all()

        mod_lessons = []
        for l in lessons:
            c_type = l.content_type.value if hasattr(l.content_type, "value") else str(l.content_type)
            lesson_obj = {
                "id": l.id,
                "title": l.title,
                "content_type": c_type,
                "type": c_type.lower(),
                "content_url": l.content_url,
                "content_body": l.content_body,
                "duration": f"{l.duration_minutes} min" if l.duration_minutes else "Session",
                "duration_minutes": l.duration_minutes,
                "order_index": l.order_index,
                "is_published": getattr(l, "is_published", True),
            }
            mod_lessons.append(lesson_obj)
            all_lessons.append(lesson_obj)

        modules_data.append({
            "id": mod.id,
            "title": mod.title,
            "description": mod.description,
            "order_index": mod.order_index,
            "is_published": getattr(mod, "is_published", True),
            "lessons": mod_lessons,
        })

    lessons_count = len(all_lessons)
    lesson_types = sorted(list(set(l["type"] for l in all_lessons)))

    # 2. Scoped Student Metrics
    my_att_pct = None
    my_marks_pct = None
    if current_user.role == UserRole.STUDENT:
        att_res = attendance_for(db, current_user.org_id, current_user.id, course.id)
        my_att_pct = att_res.get("pct")

        ass_res = assessment_for(db, current_user.org_id, current_user.id, course.id)
        my_marks_pct = ass_res.get("pct")

        if lessons_count > 0:
            lesson_ids = [l["id"] for l in all_lessons]
            completed_count = db.query(LessonProgress).filter(
                LessonProgress.user_id == current_user.id,
                LessonProgress.completed == True,
                LessonProgress.lesson_id.in_(lesson_ids)
            ).count()
            prog_val = min(int((completed_count / lessons_count) * 100), 100)
        else:
            prog_val = 0
    else:
        prog_val = _compute_progress(course, db)

    enrolled = db.query(Enrollment).filter(
        Enrollment.course_id == course.id,
        Enrollment.status == EnrollmentStatus.ACTIVE
    ).count()

    return CourseResponse(
        id=course.id,
        code=course.code,
        name=course.name,
        title=course.title or course.name,
        credits=course.credits,
        department_id=course.department_id,
        department_name=course.department.name if course.department else None,
        faculty_id=course.faculty_id,
        faculty_name=course.faculty.name if course.faculty else None,
        semester=course.semester,
        description=course.description,
        schedule=course.schedule,
        max_students=course.max_students,
        enrolled_count=enrolled,
        progress=prog_val,
        is_active=course.is_active,
        syllabus_topics=course.syllabus_topics or [],
        lessons_count=lessons_count,
        lesson_types=lesson_types,
        modules=modules_data,
        my_attendance=my_att_pct,
        my_marks=my_marks_pct,
    )


@router.get("")
@router.get("/")
def list_courses(
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    all: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List courses.
    For students without `all=True`, returns their active enrolled courses.
    For faculty/admins or when `all=True`, returns active courses strictly within current_user.org_id.
    """
    return _list_courses_sqlite(db, current_user, limit, offset, force_all=all)


def _list_courses_sqlite(db: Session, current_user: User, limit: int, offset: int, force_all: bool = False):
    """Course listing scoped strictly to current_user.org_id."""
    query = db.query(Course).filter(Course.org_id == current_user.org_id, Course.is_active == True)
    
    if current_user.role == UserRole.STUDENT and not force_all:
        courses = query.join(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == EnrollmentStatus.ACTIVE
        ).offset(offset).limit(limit).all()
    elif current_user.role == UserRole.FACULTY and not force_all:
        courses = query.filter(Course.faculty_id == current_user.id).offset(offset).limit(limit).all()
    else:
        courses = query.offset(offset).limit(limit).all()

    return [_build_course_response(c, db, current_user) for c in courses]


@router.post("/", response_model=CourseResponse, dependencies=[Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY]))])
def create_course(
    request: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new course scoped to current_user.org_id. Admin or Faculty only."""
    existing = db.query(Course).filter(Course.org_id == current_user.org_id, Course.code == request.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Course code {request.code} already exists")

    course_data = request.model_dump(exclude_unset=True)
    course_data["org_id"] = current_user.org_id
    if current_user.role == UserRole.FACULTY:
        course_data["faculty_id"] = current_user.id
    elif not course_data.get("faculty_id"):
        course_data["faculty_id"] = current_user.id

    dept_val = course_data.pop("department", None) or course_data.get("department_id")
    resolved_dept_id = None
    if dept_val:
        dept = db.query(Department).filter(
            (Department.id == dept_val) | (Department.name == dept_val) | (Department.code == dept_val)
        ).first()
        if dept:
            resolved_dept_id = dept.id
        else:
            code_candidate = f"D-{uuid.uuid4().hex[:4].upper()}"
            new_dept = Department(
                id=str(uuid.uuid4()),
                org_id=current_user.org_id,
                name=dept_val,
                code=code_candidate
            )
            db.add(new_dept)
            db.commit()
            resolved_dept_id = new_dept.id
    if not resolved_dept_id:
        existing_first = db.query(Department).filter(Department.org_id == current_user.org_id).first()
        if existing_first:
            resolved_dept_id = existing_first.id

    course_data["department_id"] = resolved_dept_id

    faculty_arg = course_data.pop("faculty", None)
    if faculty_arg and not course_data.get("faculty_id"):
        course_data["faculty_id"] = faculty_arg

    if "syllabus_topics" in course_data and course_data["syllabus_topics"]:
        course_data["syllabus_topics"] = [t.strip() for t in course_data["syllabus_topics"] if t.strip()]

    course = Course(**course_data)
    db.add(course)
    db.commit()
    db.refresh(course)

    return _build_course_response(course, db, current_user)


@router.put("/{course_id}", response_model=CourseResponse)
@router.patch("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: str,
    request: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    """Update course attributes (title, description, credits, semester, department, syllabus_topics)."""
    course = verify_course_access(course_id, current_user, db, action="write")
    update_data = request.model_dump(exclude_unset=True)

    if "description" in update_data and update_data["description"] is not None:
        if len(update_data["description"].strip()) < 30:
            raise HTTPException(status_code=400, detail="Description must be at least 30 characters")
        course.description = update_data["description"].strip()

    if "code" in update_data and update_data["code"]:
        course.code = update_data["code"]
    if "title" in update_data and update_data["title"]:
        course.title = update_data["title"]
        if not update_data.get("name"):
            course.name = update_data["title"]
    if "name" in update_data and update_data["name"]:
        course.name = update_data["name"]
        if not course.title:
            course.title = update_data["name"]
    if "credits" in update_data and update_data["credits"] is not None:
        course.credits = update_data["credits"]
    if "semester" in update_data and update_data["semester"] is not None:
        course.semester = update_data["semester"]
    if "department_id" in update_data:
        course.department_id = update_data["department_id"]
    if "faculty_id" in update_data and current_user.role == UserRole.ADMIN:
        course.faculty_id = update_data["faculty_id"]
    if "schedule" in update_data:
        course.schedule = update_data["schedule"]
    if "is_active" in update_data and update_data["is_active"] is not None:
        course.is_active = update_data["is_active"]
    if "syllabus_topics" in update_data and update_data["syllabus_topics"] is not None:
        course.syllabus_topics = [t.strip() for t in update_data["syllabus_topics"] if t.strip()]

    db.commit()
    db.refresh(course)
    return _build_course_response(course, db, current_user)


ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov", ".pdf", ".zip", ".png", ".jpg", ".jpeg", ".doc", ".docx"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@router.post("/{course_id}/upload")
async def upload_course_file(
    course_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    """Authenticated upload of lesson content with file size and type limits."""
    course = verify_course_access(course_id, current_user, db, action="write")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '{ext}' not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds maximum allowed size of 50MB")

    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    clean_name = f"{uuid.uuid4()}_{os.path.basename(file.filename or 'upload').replace(' ', '_')}"
    dest_path = os.path.join(upload_dir, clean_name)
    with open(dest_path, "wb") as f:
        f.write(contents)

    detected_type = "VIDEO" if ext in [".mp4", ".webm", ".mov"] else ("PDF" if ext == ".pdf" else "DOCUMENT")

    return {
        "url": f"/uploads/{clean_name}",
        "filename": file.filename,
        "file_size": len(contents),
        "content_type": detected_type,
    }


@router.post("/{course_id}/modules")
def create_course_module(
    course_id: str,
    module_data: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    course = verify_course_access(course_id, current_user, db, action="write")
    new_module = Module(
        id=str(uuid.uuid4()),
        org_id=current_user.org_id,
        course_id=course.id,
        title=module_data.title,
        description=module_data.description,
        order_index=module_data.order_index,
        is_published=module_data.is_published,
    )
    db.add(new_module)
    db.commit()
    db.refresh(new_module)
    return new_module


@router.patch("/modules/{module_id}")
def update_course_module(
    module_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    module = db.query(Module).filter(Module.id == module_id, Module.org_id == current_user.org_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    verify_course_access(module.course_id, current_user, db, action="write")
    if "title" in data:
        module.title = data["title"]
    if "description" in data:
        module.description = data["description"]
    if "is_published" in data:
        module.is_published = bool(data["is_published"])
    if "order_index" in data:
        module.order_index = int(data["order_index"])
    db.commit()
    db.refresh(module)
    return module


@router.delete("/modules/{module_id}")
def delete_course_module(
    module_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    module = db.query(Module).filter(Module.id == module_id, Module.org_id == current_user.org_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    verify_course_access(module.course_id, current_user, db, action="write")
    db.delete(module)
    db.commit()
    return {"message": "Module deleted successfully"}


@router.post("/modules/{module_id}/lessons")
def create_module_lesson(
    module_id: str,
    lesson_data: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    module = db.query(Module).filter(Module.id == module_id, Module.org_id == current_user.org_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    verify_course_access(module.course_id, current_user, db, action="write")
    new_lesson = Lesson(
        id=str(uuid.uuid4()),
        org_id=current_user.org_id,
        module_id=module.id,
        title=lesson_data.title,
        content_type=lesson_data.content_type.upper(),
        content_url=lesson_data.content_url,
        content_body=lesson_data.content_body,
        duration_minutes=lesson_data.duration_minutes,
        order_index=lesson_data.order_index,
        is_published=lesson_data.is_published,
    )
    db.add(new_lesson)
    db.commit()
    db.refresh(new_lesson)
    return new_lesson


@router.patch("/lessons/{lesson_id}")
def update_module_lesson(
    lesson_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id, Lesson.org_id == current_user.org_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    module = db.query(Module).filter(Module.id == lesson.module_id).first()
    if module:
        verify_course_access(module.course_id, current_user, db, action="write")
    if "title" in data:
        lesson.title = data["title"]
    if "content_url" in data:
        lesson.content_url = data["content_url"]
    if "content_type" in data:
        lesson.content_type = data["content_type"].upper()
    if "duration_minutes" in data:
        lesson.duration_minutes = int(data["duration_minutes"])
    if "is_published" in data:
        lesson.is_published = bool(data["is_published"])
    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/lessons/{lesson_id}")
def delete_module_lesson(
    lesson_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id, Lesson.org_id == current_user.org_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    module = db.query(Module).filter(Module.id == lesson.module_id).first()
    if module:
        verify_course_access(module.course_id, current_user, db, action="write")
    db.delete(lesson)
    db.commit()
    return {"message": "Lesson deleted successfully"}


@router.get("/my-enrollments")
def get_my_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all courses the currently authenticated user is enrolled in."""
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.status == EnrollmentStatus.ACTIVE
    ).all()

    result = []
    for enr in enrollments:
        c = enr.course
        if not c:
            continue
        c_resp = _build_course_response(c, db, current_user)
        enr_dict = c_resp.model_dump()
        enr_dict.update({
            "enrollment_id": enr.id,
            "course_id": c.id,
            "status": enr.status.value if hasattr(enr.status, "value") else str(enr.status),
            "semester_label": enr.semester_label,
            "grade": enr.grade,
            "gpa_points": enr.gpa_points,
            "enrolled_at": enr.enrolled_at.isoformat() if enr.enrolled_at else None,
        })
        result.append(enr_dict)
    return result


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get course details by ID scoped to current_user.org_id."""
    course = verify_course_access(course_id, current_user, db, action="read")
    return _build_course_response(course, db, current_user)


@router.delete("/{course_id}")
def delete_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Delete course. Admin within same org only."""
    course = verify_course_access(course_id, current_user, db, action="manage")
    course.is_active = False
    db.commit()
    return {"message": "Course deleted successfully", "id": course.id}


@router.post("/{course_id}/self-enroll")
def self_enroll(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Self-enroll currently authenticated student in an active course.
    Role: STUDENT only. Current user only.
    Idempotent: if already enrolled, keeps ACTIVE status.
    404 if course not found or inactive.
    Uses EnrollmentStatus enum.
    """
    if current_user.role not in [UserRole.STUDENT, "STUDENT"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only students can self-enroll in courses."
        )

    # 404 if course does not exist or is inactive
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course or not course.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or is currently inactive."
        )

    # Check if already enrolled (idempotent)
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == course_id,
    ).first()

    if existing:
        if existing.status != EnrollmentStatus.ACTIVE:
            existing.status = EnrollmentStatus.ACTIVE
            db.commit()
            db.refresh(existing)
        return {
            "message": f"Already enrolled in {course.name}",
            "enrollment_id": existing.id,
            "course_id": course.id,
            "status": existing.status.value if hasattr(existing.status, "value") else str(existing.status),
        }

    new_enrollment = Enrollment(
        id=str(uuid.uuid4()),
        org_id=current_user.org_id or course.org_id or "org-edusphere",
        student_id=current_user.id,
        course_id=course_id,
        semester_label=f"Semester {course.semester or 7}",
        status=EnrollmentStatus.ACTIVE,
    )
    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)

    # Dispatch notification event
    try:
        from services.notification_service import notify_enrollment
        notify_enrollment(db, current_user.id, course)
    except Exception as e:
        print(f"[SELF-ENROLL NOTIFICATION ERROR] {e}")

    return {
        "message": f"Successfully enrolled in {course.name}",
        "enrollment_id": new_enrollment.id,
        "course_id": course.id,
        "status": new_enrollment.status.value if hasattr(new_enrollment.status, "value") else str(new_enrollment.status),
    }


@router.get("/{course_id}/students")
def get_course_enrolled_students(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the list of enrolled students for a course.
    Faculty teaching this course or Admins only in the same org.
    """
    course = verify_course_access(course_id, current_user, db, action="roster")

    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.status == EnrollmentStatus.ACTIVE
    ).all()

    students = []
    for enr in enrollments:
        student = enr.student
        if not student:
            continue
        students.append({
            "enrollment_id": enr.id,
            "student_id": student.id,
            "name": student.name,
            "email": student.email,
            "enrollment_no": student.enrollment_no,
            "phone": student.phone,
            "avatar": student.avatar,
            "department": student.department.name if student.department else None,
            "semester_label": enr.semester_label,
            "status": enr.status.value if hasattr(enr.status, "value") else str(enr.status),
            "enrolled_at": enr.enrolled_at.isoformat() if enr.enrolled_at else None,
            "grade": enr.grade,
        })

    return {
        "course_id": course.id,
        "course_name": course.name,
        "course_code": course.code,
        "total_enrolled": len(students),
        "students": students,
    }


@router.post("/{course_id}/enroll")
def enroll_students(
    course_id: str,
    request: EnrollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Enroll students in a course. Admin only in their organization."""
    course = verify_course_access(course_id, current_user, db, action="manage")

    enrolled_count = 0
    for student_id in request.student_ids:
        student = db.query(User).filter(
            User.id == student_id,
            User.org_id == current_user.org_id,
            User.role == UserRole.STUDENT
        ).first()
        if not student:
            continue
        existing = db.query(Enrollment).filter(
            Enrollment.student_id == student_id,
            Enrollment.course_id == course.id,
        ).first()
        if existing:
            continue
        enrollment = Enrollment(
            org_id=current_user.org_id,
            student_id=student_id,
            course_id=course.id,
            status=EnrollmentStatus.ACTIVE
        )
        db.add(enrollment)
        enrolled_count += 1
        try:
            notify_enrollment(db, student_id, course)
        except Exception:
            pass

    db.commit()
    return {"message": f"Enrolled {enrolled_count} students in {course.name}"}


@router.get("/{course_id}/materials", response_model=List[MaterialResponse])
def list_materials(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List course materials scoped by enrollment or teaching assignment."""
    course = verify_course_access(course_id, current_user, db, action="materials")
    materials = db.query(CourseMaterial).filter(
        CourseMaterial.course_id == course.id,
        CourseMaterial.org_id == current_user.org_id
    ).order_by(CourseMaterial.uploaded_at.desc()).all()
    return [
        MaterialResponse(
            id=m.id, title=m.title, file_type=m.file_type,
            file_url=m.file_url, file_size=m.file_size,
            uploaded_at=m.uploaded_at,
            uploaded_by_name=m.uploaded_by.name if m.uploaded_by else None,
        )
        for m in materials
    ]


@router.post("/{course_id}/materials", response_model=MaterialResponse)
def add_material(
    course_id: str,
    request: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN])),
):
    """Upload course material. Faculty teaching this course or Admin only."""
    course = verify_course_access(course_id, current_user, db, action="write")
    material = CourseMaterial(
        course_id=course.id,
        org_id=current_user.org_id,
        uploaded_by_id=current_user.id,
        title=request.title,
        file_type=request.file_type,
        file_url=request.file_url,
        file_size=request.file_size,
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    return MaterialResponse(
        id=material.id, title=material.title, file_type=material.file_type,
        file_url=material.file_url, file_size=material.file_size,
        uploaded_at=material.uploaded_at,
        uploaded_by_name=current_user.name,
    )
