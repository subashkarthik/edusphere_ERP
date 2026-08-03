from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models.user import User, UserRole
from models.academic import Course, CourseMaterial, Enrollment
from models.content import Module, Lesson, ContentType
from middleware.auth import get_current_user
import uuid
import csv
import io

router = APIRouter(prefix="/api/cms", tags=["Faculty CMS"])

@router.post("/courses", status_code=status.HTTP_201_CREATED)
async def create_course(
    course_data: dict, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new course in 'DRAFT' or 'PUBLISHED' state."""
    if current_user.role not in [UserRole.FACULTY, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only faculty or admins can create courses")
    
    new_course = Course(
        org_id=current_user.org_id,
        code=course_data.get("code"),
        name=course_data.get("name"),
        description=course_data.get("description"),
        credits=course_data.get("credits", 3),
        department_id=course_data.get("department_id"),
        faculty_id=current_user.id,
        is_active=course_data.get("publish", False)
    )
    
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@router.post("/courses/{course_id}/bulk-enroll")
async def bulk_enroll_students(
    course_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enterprise feature: Batch enrollment of students via CSV."""
    if current_user.role not in [UserRole.FACULTY, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    content = await file.read()
    decoded = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    processed_count = 0
    for row in csv_reader:
        student_email = row.get("email")
        if not student_email:
            continue
        student = db.query(User).filter(User.email == student_email, User.org_id == current_user.org_id).first()
        if student:
            # Check if enrollment already exists
            existing = db.query(Enrollment).filter(
                Enrollment.student_id == student.id,
                Enrollment.course_id == course_id,
                Enrollment.org_id == current_user.org_id
            ).first()
            if not existing:
                new_enrollment = Enrollment(
                    id=str(uuid.uuid4()),
                    org_id=current_user.org_id,
                    student_id=student.id,
                    course_id=course_id,
                    semester_label=row.get("semester", "Semester 7"),
                    status="ACTIVE"
                )
                db.add(new_enrollment)
                processed_count += 1
                
    db.commit()
    return {"status": "success", "processed": processed_count}

@router.get("/my-inventory")
async def get_faculty_inventory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all courses and materials managed by the current faculty member in their org."""
    courses = db.query(Course).filter(
        Course.org_id == current_user.org_id,
        Course.faculty_id == current_user.id
    ).all()
    return courses

@router.put("/courses/{course_id}")
async def update_course(
    course_id: str,
    course_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update course details. Only owner/admin from the same org."""
    course = db.query(Course).filter(
        Course.id == course_id, 
        Course.org_id == current_user.org_id
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found in your institution")
        
    for key, value in course_data.items():
        if hasattr(course, key):
            setattr(course, key, value)
            
    db.commit()
    db.refresh(course)
    return course

@router.delete("/courses/{course_id}")
async def delete_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete a course and its contents from the institution."""
    course = db.query(Course).filter(
        Course.id == course_id, 
        Course.org_id == current_user.org_id
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found in your institution")
        
    db.delete(course)
    db.commit()
    return {"status": "deleted", "id": course_id}
@router.get("/courses/{course_id}/curriculum")
async def get_course_curriculum(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full curriculum (modules + lessons) for a specific course."""
    course = db.query(Course).filter(Course.id == course_id, Course.org_id == current_user.org_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    modules = db.query(Module).filter(Module.course_id == course_id).order_by(Module.order_index).all()
    return modules

@router.post("/courses/{course_id}/modules")
async def add_module(
    course_id: str,
    module_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new learning module to a course."""
    new_module = Module(
        id=str(uuid.uuid4()),
        org_id=current_user.org_id,
        course_id=course_id,
        title=module_data.get("title"),
        description=module_data.get("description"),
        order_index=module_data.get("order_index", 0)
    )
    db.add(new_module)
    db.commit()
    db.refresh(new_module)
    return new_module

@router.post("/modules/{module_id}/lessons")
async def add_lesson(
    module_id: str,
    lesson_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a lesson to a module."""
    new_lesson = Lesson(
        id=str(uuid.uuid4()),
        org_id=current_user.org_id,
        module_id=module_id,
        title=lesson_data.get("title"),
        content_type=lesson_data.get("content_type"),
        content_url=lesson_data.get("content_url"),
        content_body=lesson_data.get("content_body"),
        order_index=lesson_data.get("order_index", 0)
    )
    db.add(new_lesson)
    db.commit()
    db.refresh(new_lesson)
    return new_lesson


# ─── SYLLABUS STATE MACHINE APPROVAL ENDPOINTS ───
from pydantic import BaseModel

class ReviewRequest(BaseModel):
    remarks: str

@router.post("/courses/{course_id}/submit")
async def submit_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Faculty submits course for curriculum approval."""
    if current_user.role not in [UserRole.FACULTY, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    course = db.query(Course).filter(Course.id == course_id, Course.org_id == current_user.org_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    course.approval_status = "DEPT_PENDING"
    course.submitted_by_id = current_user.id
    db.commit()
    db.refresh(course)
    return {"status": "success", "approval_status": course.approval_status}

@router.post("/courses/{course_id}/approve")
async def approve_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin / HoD approves the course, making it active/published."""
    if current_user.role not in [UserRole.ADMIN]:
        # Allow faculty HODs as well, in this case admins can approve
        raise HTTPException(status_code=403, detail="Only administrators can approve curriculum changes")
        
    course = db.query(Course).filter(Course.id == course_id, Course.org_id == current_user.org_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    course.approval_status = "ACTIVE"
    course.is_active = True
    course.approved_by_id = current_user.id
    db.commit()
    db.refresh(course)
    return {"status": "success", "approval_status": course.approval_status}

@router.post("/courses/{course_id}/reject")
async def reject_course(
    course_id: str,
    review: ReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin / HoD rejects the course back to faculty draft stage with remarks."""
    if current_user.role not in [UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only administrators can review curriculum")
        
    course = db.query(Course).filter(Course.id == course_id, Course.org_id == current_user.org_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    course.approval_status = "REJECTED"
    course.review_remarks = review.remarks
    db.commit()
    db.refresh(course)
    return {"status": "success", "approval_status": course.approval_status}

