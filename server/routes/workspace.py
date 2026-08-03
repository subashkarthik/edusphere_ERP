from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.content import Module, Lesson, Assignment, Submission, Discussion
from models.academic import Course
from routes.auth import get_current_user
from models.user import User
import uuid

router = APIRouter(prefix="/api/workspace", tags=["workspace"])

@router.get("/course/{course_id}/modules")
def get_course_modules(course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify course belongs to user's org
    course = db.query(Course).filter(Course.id == course_id, Course.org_id == current_user.org_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found in your institution")
        
    modules = db.query(Module).filter(Module.course_id == course_id, Module.org_id == current_user.org_id).order_by(Module.order_index).all()
    return modules

@router.get("/module/{module_id}/lessons")
def get_module_lessons(module_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lessons = db.query(Lesson).filter(Lesson.module_id == module_id, Lesson.org_id == current_user.org_id).order_by(Lesson.order_index).all()
    return lessons

@router.get("/course/{course_id}/assignments")
def get_course_assignments(course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Assignment).filter(Assignment.course_id == course_id, Assignment.org_id == current_user.org_id).all()

@router.post("/assignments/{assignment_id}/submit")
def submit_assignment(assignment_id: str, file_url: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    submission = Submission(
        id=str(uuid.uuid4()),
        org_id=current_user.org_id,
        assignment_id=assignment_id,
        student_id=current_user.id,
        file_url=file_url
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission

@router.get("/course/{course_id}/discussions")
def get_discussions(course_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Discussion).filter(
        Discussion.course_id == course_id, 
        Discussion.org_id == current_user.org_id,
        Discussion.parent_id == None
    ).all()

@router.post("/course/{course_id}/discussions")
def create_discussion(course_id: str, content: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    discussion = Discussion(
        id=str(uuid.uuid4()),
        org_id=current_user.org_id,
        course_id=course_id,
        user_id=current_user.id,
        content=content
    )
    db.add(discussion)
    db.commit()
    db.refresh(discussion)
    return discussion
