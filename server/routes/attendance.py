from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime
from database import get_db
from models.user import User, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from schemas.schemas import (
    AttendanceSessionCreate,
    AttendanceMarkRequest,
    AttendanceMarkPayload,
    AttendanceSummaryResponse,
    AttendanceHistoryResponse,
)
from middleware.auth import get_current_user, require_roles
from models.synced_legacy import SyncedAttendance, SyncedTimetable, SyncedSubject

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


# ---------------------------------------------------------------------------
# 1. Mark Attendance (Faculty & Admin Only, Upsert per student+course+date)
# ---------------------------------------------------------------------------
@router.post("/mark")
def mark_course_attendance(
    payload: AttendanceMarkPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN])),
):
    """
    Mark or update attendance for students in a course on a specific date.
    Upserts AttendanceSession (course_id + date) and AttendanceLog per student.
    """
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        session_date = datetime.strptime(payload.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")

    marks_list = payload.marks or payload.students or []
    if not marks_list:
        raise HTTPException(status_code=400, detail="No student attendance marks provided")

    # Upsert AttendanceSession
    session = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == payload.course_id,
        AttendanceSession.session_date == session_date,
    ).first()

    if not session:
        session = AttendanceSession(
            course_id=payload.course_id,
            faculty_id=current_user.id,
            session_date=session_date,
            status=SessionStatus.CLOSED,
            org_id=getattr(current_user, "org_id", "org-edusphere") or "org-edusphere",
        )
        db.add(session)
        db.flush()
    else:
        session.status = SessionStatus.CLOSED

    # Upsert AttendanceLogs
    marked_count = 0
    for item in marks_list:
        st_id = item.student_id if hasattr(item, "student_id") else item.get("student_id")
        status_raw = (item.status if hasattr(item, "status") else item.get("status", "PRESENT")).upper()

        try:
            att_status = AttendanceStatus(status_raw)
        except ValueError:
            att_status = AttendanceStatus.PRESENT

        existing_log = db.query(AttendanceLog).filter(
            AttendanceLog.session_id == session.id,
            AttendanceLog.student_id == st_id,
        ).first()

        if existing_log:
            existing_log.status = att_status
            existing_log.marked_at = datetime.utcnow()
        else:
            log = AttendanceLog(
                session_id=session.id,
                student_id=st_id,
                status=att_status,
                marked_at=datetime.utcnow(),
                org_id=session.org_id,
            )
            db.add(log)
        marked_count += 1

    db.commit()

    return {
        "message": f"Successfully recorded attendance for {marked_count} students.",
        "course_id": course.id,
        "course_name": course.name,
        "date": str(session_date),
        "session_id": session.id,
        "count": marked_count,
    }


# ---------------------------------------------------------------------------
# 2. Get Course Attendance & Enrolled Roster (Faculty / Admin)
# ---------------------------------------------------------------------------
@router.get("/course/{course_id}")
def get_course_attendance_roster(
    course_id: str,
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN])),
):
    """
    Get enrolled students for a course and their marked status for a given date.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    target_date = date
    if not target_date:
        target_date = datetime.utcnow().strftime("%Y-%m-%d")

    try:
        parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")

    # Find session if marked previously
    session = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == course_id,
        AttendanceSession.session_date == parsed_date,
    ).first()

    status_map = {}
    if session:
        logs = db.query(AttendanceLog).filter(AttendanceLog.session_id == session.id).all()
        status_map = {log.student_id: log.status.value for log in logs}

    # Fetch active enrollments
    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.status == EnrollmentStatus.ACTIVE,
    ).all()

    students = []
    for e in enrollments:
        student = e.student
        if not student:
            continue
        students.append({
            "student_id": student.id,
            "name": student.name,
            "email": student.email,
            "enrollment_no": student.enrollment_no or f"ED-{student.id[:6].upper()}",
            "avatar": student.avatar or f"https://ui-avatars.com/api/?name={student.name}&background=6366f1&color=fff",
            "status": status_map.get(student.id, "PRESENT"),
        })

    return {
        "course_id": course.id,
        "course_name": course.name,
        "course_code": course.code,
        "date": target_date,
        "session_id": session.id if session else None,
        "is_marked": session is not None,
        "total_enrolled": len(students),
        "students": students,
    }


# ---------------------------------------------------------------------------
# 3. Student Attendance View: Per-Course % and History Log
# ---------------------------------------------------------------------------
@router.get("/me")
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the authenticated student's per-course attendance breakdown, percentage,
    warning indicators (< 75%), and historical attendance records.
    """
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.status == EnrollmentStatus.ACTIVE,
    ).all()

    course_summaries = []
    total_attended_all = 0
    total_held_all = 0

    for e in enrollments:
        course = e.course
        if not course:
            continue

        closed_sessions = db.query(AttendanceSession).filter(
            AttendanceSession.course_id == course.id,
            AttendanceSession.status == SessionStatus.CLOSED,
        ).all()

        total_held = len(closed_sessions)
        session_ids = [s.id for s in closed_sessions]

        if total_held > 0 and session_ids:
            attended = db.query(AttendanceLog).filter(
                AttendanceLog.session_id.in_(session_ids),
                AttendanceLog.student_id == current_user.id,
                AttendanceLog.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
            ).count()
            pct = round((attended / total_held) * 100, 1)
        else:
            attended = 0
            pct = 100.0 if total_held == 0 else 0.0

        total_attended_all += attended
        total_held_all += total_held

        risk_status = "SAFE" if pct >= 75.0 else ("WARNING" if pct >= 65.0 else "CRITICAL")
        is_low = (pct < 75.0 and total_held > 0)

        course_summaries.append({
            "course_id": course.id,
            "course_code": course.code,
            "course_name": course.name,
            "percentage": pct,
            "classes_held": total_held,
            "classes_attended": attended,
            "status": risk_status,
            "is_low": is_low,
        })

    # Student's complete chronological history
    logs = (
        db.query(AttendanceLog)
        .join(AttendanceSession, AttendanceLog.session_id == AttendanceSession.id)
        .filter(AttendanceLog.student_id == current_user.id)
        .order_by(AttendanceSession.session_date.desc(), AttendanceLog.marked_at.desc())
        .all()
    )

    history = []
    for log in logs:
        session = log.session
        course = session.course if session else None
        faculty = session.faculty if session else None
        history.append({
            "id": log.id,
            "course_id": course.id if course else "",
            "course_code": course.code if course else "",
            "course_name": course.name if course else "Course",
            "date": str(session.session_date) if session else "",
            "status": log.status.value,
            "time": log.marked_at.strftime("%I:%M %p") if log.marked_at else "-",
            "faculty_name": faculty.name if faculty else "Faculty",
        })

    overall_pct = (
        round((total_attended_all / total_held_all) * 100, 1)
        if total_held_all > 0
        else 100.0
    )

    return {
        "summary": course_summaries,
        "history": history,
        "overall_percentage": overall_pct,
        "total_courses": len(course_summaries),
        "has_warning": any(c["is_low"] for c in course_summaries),
    }


# ---------------------------------------------------------------------------
# 4. Course Attendance Summary (Aggregate for a Course)
# ---------------------------------------------------------------------------
@router.get("/summary/{course_id}")
def get_course_attendance_summary(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get aggregate attendance statistics for a specific course.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    closed_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == course_id,
        AttendanceSession.status == SessionStatus.CLOSED,
    ).all()

    total_sessions = len(closed_sessions)
    session_ids = [s.id for s in closed_sessions]

    enrolled_count = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.status == EnrollmentStatus.ACTIVE,
    ).count()

    total_present = 0
    total_absent = 0
    total_late = 0

    if session_ids:
        total_present = db.query(AttendanceLog).filter(
            AttendanceLog.session_id.in_(session_ids),
            AttendanceLog.status == AttendanceStatus.PRESENT,
        ).count()
        total_absent = db.query(AttendanceLog).filter(
            AttendanceLog.session_id.in_(session_ids),
            AttendanceLog.status == AttendanceStatus.ABSENT,
        ).count()
        total_late = db.query(AttendanceLog).filter(
            AttendanceLog.session_id.in_(session_ids),
            AttendanceLog.status == AttendanceStatus.LATE,
        ).count()

    total_possible = total_sessions * enrolled_count
    avg_pct = (
        round(((total_present + total_late) / total_possible * 100), 1)
        if total_possible > 0
        else 0.0
    )

    return {
        "course_id": course.id,
        "course_code": course.code,
        "course_name": course.name,
        "total_sessions": total_sessions,
        "total_enrolled": enrolled_count,
        "average_percentage": avg_pct,
        "present_count": total_present,
        "absent_count": total_absent,
        "late_count": total_late,
    }


# ---------------------------------------------------------------------------
# 5. General Summary (Multi-Course)
# ---------------------------------------------------------------------------
@router.get("/summary")
def get_attendance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get attendance summary per course for current user or all courses.
    """
    return _get_attendance_sqlite(db, current_user)


def _get_attendance_sqlite(db: Session, current_user: User):
    """SQLite attendance summary."""
    if current_user.role == UserRole.STUDENT:
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == EnrollmentStatus.ACTIVE,
        ).all()

        results = []
        for enrollment in enrollments:
            course = enrollment.course
            if not course:
                continue
            total_sessions = db.query(AttendanceSession).filter(
                AttendanceSession.course_id == course.id,
                AttendanceSession.status == SessionStatus.CLOSED,
            ).count()
            attended = db.query(AttendanceLog).join(AttendanceSession).filter(
                AttendanceSession.course_id == course.id,
                AttendanceLog.student_id == current_user.id,
                AttendanceLog.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
            ).count()
            percentage = round((attended / total_sessions * 100), 1) if total_sessions > 0 else 0
            risk_status = "SAFE" if percentage >= 75.0 else ("WARNING" if percentage >= 65.0 else "CRITICAL")

            results.append(AttendanceSummaryResponse(
                course_code=course.code, course_name=course.name,
                percentage=percentage, classes_held=total_sessions,
                classes_attended=attended, status=risk_status
            ))
        return results

    else:
        if current_user.role == UserRole.FACULTY:
            courses = db.query(Course).filter(Course.faculty_id == current_user.id).all()
        else:
            courses = db.query(Course).filter(Course.is_active == True).all()

        results = []
        for course in courses:
            total_sessions = db.query(AttendanceSession).filter(
                AttendanceSession.course_id == course.id,
                AttendanceSession.status == SessionStatus.CLOSED,
            ).count()
            total_enrolled = db.query(Enrollment).filter(
                Enrollment.course_id == course.id,
                Enrollment.status == EnrollmentStatus.ACTIVE,
            ).count()
            total_present = db.query(AttendanceLog).join(AttendanceSession).filter(
                AttendanceSession.course_id == course.id,
                AttendanceLog.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
            ).count()
            total_possible = total_sessions * total_enrolled
            avg_pct = round((total_present / total_possible * 100), 1) if total_possible > 0 else 0
            results.append(AttendanceSummaryResponse(
                course_code=course.code, course_name=course.name,
                percentage=avg_pct, classes_held=total_sessions,
                classes_attended=total_present,
            ))
        return results


# ---------------------------------------------------------------------------
# 6. Legacy / Supplementary Session Endpoints
# ---------------------------------------------------------------------------
@router.post("/sessions")
def create_session(
    request: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN])),
):
    """Start a new attendance session for a course. Faculty/Admin only."""
    course = db.query(Course).filter(Course.id == request.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    session = AttendanceSession(
        course_id=request.course_id,
        faculty_id=current_user.id,
        session_date=datetime.strptime(request.session_date, "%Y-%m-%d").date(),
        start_time=request.start_time,
        end_time=request.end_time,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {"id": session.id, "message": f"Session created for {course.name}", "status": session.status.value}


@router.post("/sessions/{session_id}/mark")
def mark_session_attendance(
    session_id: str,
    request: AttendanceMarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN])),
):
    """Mark attendance for students in a specific session ID."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    marked_count = 0
    for mark in request.marks:
        student_id = mark.get("student_id")
        status_str = mark.get("status", "PRESENT")

        try:
            att_status = AttendanceStatus(status_str)
        except ValueError:
            continue

        existing = db.query(AttendanceLog).filter(
            AttendanceLog.session_id == session_id,
            AttendanceLog.student_id == student_id,
        ).first()

        if existing:
            existing.status = att_status
            existing.marked_at = datetime.utcnow()
        else:
            log = AttendanceLog(
                session_id=session_id,
                student_id=student_id,
                status=att_status,
            )
            db.add(log)
        marked_count += 1

    session.status = SessionStatus.CLOSED
    db.commit()

    return {"message": f"Marked attendance for {marked_count} students", "session_status": "CLOSED"}


@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance session details with all logged marks."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    logs = db.query(AttendanceLog).filter(AttendanceLog.session_id == session_id).all()

    return {
        "id": session.id,
        "course_id": session.course_id,
        "course_name": session.course.name if session.course else None,
        "faculty": session.faculty.name if session.faculty else None,
        "date": str(session.session_date),
        "status": session.status.value,
        "logs": [
            {
                "student_id": log.student_id,
                "student_name": log.student.name if log.student else None,
                "status": log.status.value,
                "marked_at": str(log.marked_at),
            }
            for log in logs
        ],
    }


@router.get("/history/{course_id}", response_model=List[AttendanceHistoryResponse])
def get_attendance_history(
    course_id: str,
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance history for a student in a specific course."""
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == course_id,
        AttendanceSession.status == SessionStatus.CLOSED,
    ).order_by(AttendanceSession.session_date.desc()).offset(offset).limit(limit).all()

    history = []
    for session in sessions:
        log = db.query(AttendanceLog).filter(
            AttendanceLog.session_id == session.id,
            AttendanceLog.student_id == current_user.id,
        ).first()

        history.append(AttendanceHistoryResponse(
            date=session.session_date.strftime("%d %b %Y") if session.session_date else "",
            status=log.status.value if log else "NO_DATA",
            time=log.marked_at.strftime("%I:%M %p") if log and log.marked_at else "-",
            faculty=session.faculty.name if session.faculty else "Unknown",
        ))

    return history
