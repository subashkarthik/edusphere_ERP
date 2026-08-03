from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.user import User, UserRole
from models.academic import TimetableEntry, Enrollment, Course, EnrollmentStatus
from schemas.schemas import TimetableCreate, TimetableResponse
from middleware.auth import get_current_user, require_roles
from access_db import get_full_timetable

router = APIRouter(prefix="/api/timetable", tags=["Timetable"])


@router.get("")
@router.get("/", response_model=None)
def get_timetable(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get weekly timetable from the primary database.
    """
    return _get_timetable_sqlite(db, current_user)


def _get_timetable_sqlite(db: Session, current_user: User):
    """Original SQLite timetable as fallback."""
    if current_user.role == UserRole.STUDENT:
        enrolled_ids = [
            e.course_id for e in db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.status == EnrollmentStatus.ACTIVE,
            ).all()
        ]
        entries = db.query(TimetableEntry).filter(TimetableEntry.course_id.in_(enrolled_ids)).all()
    elif current_user.role == UserRole.FACULTY:
        entries = db.query(TimetableEntry).filter(TimetableEntry.faculty_id == current_user.id).all()
    else:
        entries = db.query(TimetableEntry).all()

    day_order = {"Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7}
    entries.sort(key=lambda e: (day_order.get(e.day_of_week, 8), e.start_time))

    return [
        TimetableResponse(
            id=e.id,
            day=e.day_of_week,
            time=f"{e.start_time} - {e.end_time}",
            course=e.course.name if e.course else "Unknown",
            venue=e.venue,
            faculty=e.faculty.name if e.faculty else None,
            entry_type=e.entry_type.value,
        )
        for e in entries
    ]


@router.post("/")
def create_timetable_entry(
    request: TimetableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Create a timetable entry. Admin only. Writes to SQLite."""
    course = db.query(Course).filter(Course.id == request.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    entry = TimetableEntry(
        course_id=request.course_id,
        faculty_id=request.faculty_id or course.faculty_id,
        day_of_week=request.day_of_week,
        start_time=request.start_time,
        end_time=request.end_time,
        venue=request.venue,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {"id": entry.id, "message": f"Timetable entry created for {course.name}"}


@router.put("/{entry_id}")
def update_timetable_entry(
    entry_id: str,
    request: TimetableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Update a timetable entry. Admin only. SQLite only."""
    entry = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    entry.course_id = request.course_id
    entry.faculty_id = request.faculty_id
    entry.day_of_week = request.day_of_week
    entry.start_time = request.start_time
    entry.end_time = request.end_time
    entry.venue = request.venue
    db.commit()

    return {"message": "Timetable entry updated"}


@router.delete("/{entry_id}")
def delete_timetable_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Delete a timetable entry. Admin only. SQLite only."""
    entry = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db.delete(entry)
    db.commit()
    return {"message": "Timetable entry deleted"}
