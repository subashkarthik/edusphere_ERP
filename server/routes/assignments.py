from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from models.user import User, UserRole
from models.content import Assignment, Submission, AssignmentStatus
from middleware.auth import get_current_user, require_roles
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from utils.audit_logger import log_audit

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])

class AssignmentResponse(BaseModel):
    id: str
    course_id: str
    course_name: str
    title: str
    description: str
    due_date: str
    max_marks: int
    file_url: Optional[str] = None
    status: str
    submission_id: Optional[str] = None
    marks_obtained: Optional[float] = None
    
    class Config:
        from_attributes = True

class SubmissionRequest(BaseModel):
    assignment_id: str
    file_url: str

class AssignmentCreateRequest(BaseModel):
    course_id: str
    title: str
    description: str
    due_date: str
    max_marks: int

class GradeSubmissionRequest(BaseModel):
    marks_obtained: float
    feedback: str

class SubmissionResponse(BaseModel):
    id: str
    assignment_id: str
    assignment_title: str
    student_id: str
    student_name: str
    file_url: str
    submitted_at: str
    marks_obtained: Optional[float] = None
    feedback: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

@router.get("/", response_model=List[AssignmentResponse])
def get_assignments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all assignments for the student or faculty/admin in the organization."""
    from models.academic import Course, Enrollment

    # Fetch all assignments in the organization so student sees all published coursework
    assignments = db.query(Assignment).filter(
        Assignment.org_id == current_user.org_id
    ).order_by(Assignment.created_at.desc()).all()
        
    result = []
    for assign in assignments:
        submission = None
        if current_user.role == UserRole.STUDENT:
            submission = db.query(Submission).filter(
                Submission.assignment_id == assign.id,
                Submission.student_id == current_user.id
            ).first()
        
        status_val = "PENDING"
        sub_id = None
        marks = None
        
        if submission:
            status_val = submission.status.value
            sub_id = submission.id
            marks = submission.marks_obtained
        elif assign.due_date and assign.due_date < datetime.utcnow():
            status_val = "LATE"
            
        course_name = "General Course"
        if assign.course:
            course_name = assign.course.name
        elif assign.course_id.startswith("video-"):
            parts = assign.course_id.split("-")
            c_title = parts[-1].replace("_", " ").title() if len(parts) > 1 else assign.course_id
            cat_title = parts[1].replace("_", " ").title() if len(parts) > 2 else "Video Course"
            course_name = f"{c_title} ({cat_title})"
        else:
            course_name = f"Course {assign.course_id}"

        result.append(AssignmentResponse(
            id=assign.id,
            course_id=assign.course_id,
            course_name=course_name,
            title=assign.title,
            description=assign.description or "",
            due_date=assign.due_date.isoformat() if assign.due_date else "",
            max_marks=assign.max_marks,
            file_url=assign.file_url,
            status=status_val,
            submission_id=sub_id,
            marks_obtained=marks
        ))
        
    return result

@router.post("/", response_model=AssignmentResponse)
async def create_assignment(
    request_data: AssignmentCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN]))
):
    """Create a new assignment. Faculty/Admin only."""
    from models.academic import Course
    from models.user import Department
    from models.synced_legacy import SyncedSubject

    course = db.query(Course).filter(
        (Course.id == request_data.course_id) | 
        (Course.code == request_data.course_id) | 
        (Course.name == request_data.course_id)
    ).first()

    if not course:
        # Check SyncedSubject safely
        synced = None
        if request_data.course_id.isdigit():
            synced = db.query(SyncedSubject).filter(SyncedSubject.id == int(request_data.course_id)).first()
        else:
            synced = db.query(SyncedSubject).filter(SyncedSubject.name == request_data.course_id).first()

        if synced:
            course_name = synced.name
            course_code = f"SUB-{synced.id}"[:20]
        elif request_data.course_id.startswith("video-"):
            parts = request_data.course_id.split("-")
            c_title = parts[-1].replace("_", " ").title() if len(parts) > 1 else request_data.course_id
            cat_title = parts[1].replace("_", " ").title() if len(parts) > 2 else "Video Course"
            course_name = f"{c_title} ({cat_title})"
            course_code = f"VID-{parts[-1][:15].upper()}"
        else:
            course_name = f"Course {request_data.course_id}"
            course_code = f"CODE-{request_data.course_id[:15]}"

        dept = db.query(Department).first()
        dept_id = dept.id if dept else "dept-cse"

        course = Course(
            id=request_data.course_id[:36],
            code=course_code,
            name=course_name[:255],
            department_id=dept_id,
            org_id=current_user.org_id
        )
        db.add(course)
        db.commit()
        db.refresh(course)

    try:
        due_dt = datetime.fromisoformat(request_data.due_date.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid due_date format. Use ISO format.")

    new_assign = Assignment(
        org_id=current_user.org_id,
        course_id=request_data.course_id,
        title=request_data.title,
        description=request_data.description,
        due_date=due_dt,
        max_marks=request_data.max_marks
    )
    db.add(new_assign)
    db.commit()
    db.refresh(new_assign)

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="CREATE_ASSIGNMENT",
        resource_type="ASSIGNMENT",
        resource_id=new_assign.id,
        metadata={"title": new_assign.title, "course_id": new_assign.course_id},
        request=request
    )

    try:
        from utils.websocket_manager import manager
        await manager.broadcast_to_institution({
            "type": "NEW_ASSIGNMENT",
            "assignment": {
                "id": new_assign.id,
                "title": new_assign.title,
                "course_name": course.name,
                "due_date": new_assign.due_date.isoformat(),
                "max_marks": new_assign.max_marks
            }
        }, current_user.org_id)
    except Exception:
        pass

    return AssignmentResponse(
        id=new_assign.id,
        course_id=new_assign.course_id,
        course_name=course.name,
        title=new_assign.title,
        description=new_assign.description,
        due_date=new_assign.due_date.isoformat(),
        max_marks=new_assign.max_marks,
        file_url=new_assign.file_url,
        status="PENDING"
    )

@router.post("/submit", response_model=dict)
async def submit_assignment(
    request_data: SubmissionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit an assignment."""
    assignment = db.query(Assignment).filter(Assignment.id == request_data.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    # Check existing submission
    existing = db.query(Submission).filter(
        Submission.assignment_id == request_data.assignment_id,
        Submission.student_id == current_user.id
    ).first()
    
    if existing:
        existing.file_url = request_data.file_url
        existing.submitted_at = datetime.utcnow()
        existing.status = AssignmentStatus.SUBMITTED
        sub_id = existing.id
    else:
        new_submission = Submission(
            org_id=current_user.org_id,
            assignment_id=request_data.assignment_id,
            student_id=current_user.id,
            file_url=request_data.file_url,
            status=AssignmentStatus.SUBMITTED
        )
        db.add(new_submission)
        db.flush()
        sub_id = new_submission.id
        
    db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="SUBMIT_ASSIGNMENT",
        resource_type="SUBMISSION",
        resource_id=sub_id,
        metadata={"assignment_id": request_data.assignment_id},
        request=request
    )

    return {"message": "Assignment submitted successfully"}

@router.get("/submissions", response_model=List[SubmissionResponse])
def get_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN]))
):
    """Get all student submissions for Faculty/Admin grading registry."""
    # Return all student submissions within the institution/organization
    submissions = db.query(Submission).filter(
        Submission.org_id == current_user.org_id
    ).order_by(Submission.submitted_at.desc()).all()

    result = []
    for sub in submissions:
        result.append(SubmissionResponse(
            id=sub.id,
            assignment_id=sub.assignment_id,
            assignment_title=sub.assignment.title if sub.assignment else "Unknown Assignment",
            student_id=sub.student_id,
            student_name=sub.student.name if sub.student else "Unknown Student",
            file_url=sub.file_url,
            submitted_at=sub.submitted_at.isoformat(),
            marks_obtained=sub.marks_obtained,
            feedback=sub.feedback,
            status=sub.status.value
        ))
    return result

@router.post("/submissions/{submission_id}/grade", response_model=dict)
async def grade_submission(
    submission_id: str,
    grade_data: GradeSubmissionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN]))
):
    """Grade a student submission."""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    submission.marks_obtained = grade_data.marks_obtained
    submission.feedback = grade_data.feedback
    submission.status = AssignmentStatus.GRADED
    submission.graded_by_id = current_user.id

    db.commit()

    # Dispatch Multi-Channel SMS & Email Alert
    try:
        from services.notification_dispatcher import dispatch_grading_alert
        student = submission.student
        asg_title = submission.assignment.title if submission.assignment else "Assignment Submission"
        max_m = submission.assignment.max_marks if submission.assignment else 100
        if student:
            dispatch_grading_alert(
                user_name=student.name,
                phone=student.phone or "9876540001",
                email=student.email,
                assignment_title=asg_title,
                marks_obtained=grade_data.marks_obtained,
                max_marks=max_m,
                feedback=grade_data.feedback or "Great evaluation performance."
            )
    except Exception as ne:
        print(f"[NOTIFICATION TRIGGER ERROR] {ne}")

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="GRADE_ASSIGNMENT",
        resource_type="SUBMISSION",
        resource_id=submission.id,
        metadata={"marks": grade_data.marks_obtained, "student_id": submission.student_id},
        request=request
    )

    return {"message": "Submission graded successfully"}

