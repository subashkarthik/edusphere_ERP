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
from middleware.scoping import (
    verify_course_access,
    verify_attendance_session_access,
    verify_org_access,
)
from models.synced_legacy import SyncedAttendance, SyncedTimetable, SyncedSubject
from services.notification_service import notify_attendance_warning

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
    course = verify_course_access(payload.course_id, current_user, db, action="mark_attendance")

    raw_date = payload.date or payload.session_date
    if not raw_date:
        raw_date = date.today().isoformat()

    try:
        session_date = datetime.strptime(raw_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")

    marks_list = payload.marks or payload.students or payload.attendance or []
    if not marks_list:
        raise HTTPException(status_code=400, detail="No student attendance marks provided")

    # Upsert AttendanceSession
    session = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == payload.course_id,
        AttendanceSession.session_date == session_date,
    ).first()

    EDIT_WINDOW_HOURS = 24.0

    if session:
        # Check if edit window has expired (> 24 hours)
        elapsed_seconds = (datetime.utcnow() - session.created_at).total_seconds()
        elapsed_hours = elapsed_seconds / 3600.0
        if elapsed_hours > EDIT_WINDOW_HOURS:
            if not payload.reason or len(payload.reason.strip()) < 5:
                raise HTTPException(
                    status_code=400,
                    detail=f"Attendance edit window ({int(EDIT_WINDOW_HOURS)}h) has expired. A valid justification reason is required for retroactive edits."
                )
            # Create AuditLog entry for retroactive edit
            from models.audit import AuditLog
            audit = AuditLog(
                org_id=current_user.org_id,
                user_id=current_user.id,
                actor_id=current_user.id,
                action="ATTENDANCE_EDIT_OVERRIDE",
                entity="ATTENDANCE_SESSION",
                entity_id=session.id,
                metadata_json={
                    "reason": payload.reason.strip(),
                    "course_id": payload.course_id,
                    "session_date": str(session_date),
                    "elapsed_hours": round(elapsed_hours, 1)
                }
            )
            db.add(audit)

        if payload.period:
            session.period = payload.period
        session.status = SessionStatus.CLOSED
    else:
        session = AttendanceSession(
            course_id=payload.course_id,
            faculty_id=current_user.id,
            session_date=session_date,
            period=payload.period,
            status=SessionStatus.CLOSED,
            org_id=current_user.org_id,
        )
        db.add(session)
        db.flush()

    # Upsert AttendanceLogs (only for students enrolled in this course in this organization)
    marked_count = 0
    for item in marks_list:
        st_id = item.student_id if hasattr(item, "student_id") else item.get("student_id")
        if not st_id:
            continue

        enr = db.query(Enrollment).filter(
            Enrollment.student_id == st_id,
            Enrollment.course_id == course.id,
            Enrollment.org_id == current_user.org_id,
            Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
        ).first()
        if not enr:
            continue

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

    # Check for students whose attendance percentage is below 75%
    try:
        total_sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == course.id).count()
        if total_sessions > 0:
            for item in marks_list:
                st_id = item.student_id if hasattr(item, "student_id") else item.get("student_id")
                if not st_id:
                    continue
                attended = db.query(AttendanceLog).join(AttendanceSession).filter(
                    AttendanceSession.course_id == course.id,
                    AttendanceLog.student_id == st_id,
                    AttendanceLog.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE])
                ).count()
                pct = round((attended / total_sessions) * 100, 1)
                if pct < 75.0:
                    notify_attendance_warning(db, st_id, course, pct)
    except Exception:
        pass

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
    Faculty can only view rosters for courses where faculty_id = me.
    """
    course = verify_course_access(course_id, current_user, db, action="roster")

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
    Computed strictly via server/services/metrics.py.
    """
    from services.metrics import attendance_for, attendance_overall

    org_id = getattr(current_user, "org_id", "org-edusphere") or "org-edusphere"

    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
    ).all()

    course_summaries = []
    for e in enrollments:
        course = e.course or db.query(Course).filter(Course.id == e.course_id).first()
        if not course:
            continue

        c_attn = attendance_for(db, org_id, current_user.id, course.id)

        course_summaries.append({
            "course_id": course.id,
            "course_code": course.code,
            "course_name": course.name,
            "percentage": c_attn["pct"],
            "classes_held": c_attn["held"],
            "classes_attended": c_attn["attended"],
            "status": c_attn["status"],
            "is_low": c_attn["is_low"],
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

    overall_metrics = attendance_overall(db, org_id, current_user.id)

    return {
        "summary": course_summaries,
        "history": history,
        "overall_percentage": overall_metrics["pct"],
        "total_classes_held": overall_metrics["held"],
        "total_classes_attended": overall_metrics["attended"],
        "total_courses": len(course_summaries),
        "has_warning": overall_metrics["is_low"],
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
    course = verify_course_access(course_id, current_user, db, action="read_metrics")

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
    """Attendance summary wired to metrics."""
    if current_user.role == UserRole.STUDENT:
        from services.metrics import attendance_for
        org_id = getattr(current_user, "org_id", "org-edusphere") or "org-edusphere"
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
        ).all()

        results = []
        for enrollment in enrollments:
            course = enrollment.course
            if not course:
                continue
            c_attn = attendance_for(db, org_id, current_user.id, course.id)
            results.append(AttendanceSummaryResponse(
                course_code=course.code,
                course_name=course.name,
                percentage=c_attn["pct"],
                classes_held=c_attn["held"],
                classes_attended=c_attn["attended"],
                status=c_attn["status"],
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
    """Start a new attendance session for a course. Faculty teaching course or Admin only."""
    course = verify_course_access(request.course_id, current_user, db, action="write")

    session = AttendanceSession(
        course_id=course.id,
        faculty_id=current_user.id,
        session_date=datetime.strptime(request.session_date, "%Y-%m-%d").date(),
        period=request.period,
        topic=request.topic,
        start_time=request.start_time,
        end_time=request.end_time,
        status=SessionStatus.OPEN,
        org_id=current_user.org_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {"id": session.id, "message": f"Session created for {course.name}", "status": session.status.value, "period": session.period}


@router.post("/sessions/{session_id}/mark")
def mark_session_attendance(
    session_id: str,
    request: AttendanceMarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN])),
):
    """Mark attendance for students in a specific session ID."""
    session = verify_attendance_session_access(session_id, current_user, db, action="write")

    # Check edit window
    elapsed_seconds = (datetime.utcnow() - session.created_at).total_seconds()
    elapsed_hours = elapsed_seconds / 3600.0
    if elapsed_hours > 24.0:
        if not request.reason or len(request.reason.strip()) < 5:
            raise HTTPException(
                status_code=400,
                detail="Attendance edit window (24h) has expired. A valid justification reason is required for retroactive edits."
            )
        from models.audit import AuditLog
        audit = AuditLog(
            org_id=current_user.org_id,
            user_id=current_user.id,
            actor_id=current_user.id,
            action="ATTENDANCE_EDIT_OVERRIDE",
            entity="ATTENDANCE_SESSION",
            entity_id=session.id,
            metadata_json={
                "reason": request.reason.strip(),
                "course_id": session.course_id,
                "session_date": str(session.session_date),
                "elapsed_hours": round(elapsed_hours, 1)
            }
        )
        db.add(audit)

    marked_count = 0
    raw_marks = request.marks or request.attendance or []
    for mark in raw_marks:
        student_id = mark.get("student_id")
        status_str = mark.get("status", "PRESENT")

        # Verify student is actively enrolled
        enr = db.query(Enrollment).filter(
            Enrollment.student_id == student_id,
            Enrollment.course_id == session.course_id,
            Enrollment.org_id == current_user.org_id,
        ).first()
        if not enr:
            continue

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
                org_id=session.org_id,
            )
            db.add(log)
        marked_count += 1

    session.status = SessionStatus.CLOSED
    db.commit()

    return {"message": f"Marked attendance for {marked_count} students", "session_status": "CLOSED"}


@router.get("/course/{course_id}/student/{student_id}")
def get_student_course_attendance(
    course_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get course-specific attendance for a student with central scoping.
    Students can only view their own records; faculty only for assigned courses; admin whole org.
    """
    from middleware.scoping import verify_user_access
    verify_user_access(student_id, current_user, db, action="read")
    course = verify_course_access(course_id, current_user, db, action="read")

    from services.metrics import attendance_for
    return attendance_for(db, current_user.org_id, student_id, course.id)


@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance session details with all logged marks."""
    session = verify_attendance_session_access(session_id, current_user, db, action="read")

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
    course = verify_course_access(course_id, current_user, db, action="read_metrics")

    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == course.id,
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
