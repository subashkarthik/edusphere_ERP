from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date, datetime
from database import get_db
from models.user import User, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from schemas.schemas import AttendanceSessionCreate, AttendanceMarkRequest, AttendanceSummaryResponse, AttendanceHistoryResponse
from middleware.auth import get_current_user, require_roles
from models.synced_legacy import SyncedAttendance, SyncedTimetable, SyncedSubject

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.get("/summary")
def get_attendance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get attendance summary per course.
    Reads from PostgreSQL synced tables, falls back to SQLite.
    """
    try:
        # Get timetable to map SlotID -> SubjectID
        timetable = db.query(SyncedTimetable).all()
        slot_to_subject = {t.slot_id: t.subject_id for t in timetable}
        
        subjects = db.query(SyncedSubject).all()
        subject_map = {s.id: s for s in subjects}
        
        # Filter attendance records
        query = db.query(SyncedAttendance)
        # In mock database we seeded student_id as "user-alex" for student alex
        if current_user.role == UserRole.STUDENT:
            query = query.filter(SyncedAttendance.student_id == current_user.id)
            
        records = query.all()
        if not records:
            raise RuntimeError("No synced attendance records found")
            
        subject_stats = {}
        for r in records:
            sub_id = slot_to_subject.get(r.slot_id)
            if not sub_id:
                continue
            if sub_id not in subject_stats:
                subj = subject_map.get(sub_id)
                subject_stats[sub_id] = {
                    "course_code": f"SUB-{sub_id}",
                    "course_name": subj.name if subj else f"Subject {sub_id}",
                    "total": 0,
                    "present": 0
                }
            subject_stats[sub_id]["total"] += 1
            if r.status == "Present":
                subject_stats[sub_id]["present"] += 1
                
        summary = [
            {
                "course_code": v["course_code"],
                "course_name": v["course_name"],
                "percentage": round((v["present"] / v["total"]) * 100, 1) if v["total"] > 0 else 0,
                "classes_held": v["total"],
                "classes_attended": v["present"]
            }
            for v in subject_stats.values()
        ]
        if summary:
            return summary
    except Exception as e:
        print(f"[PostgreSQL] Attendance summary sync failed: {e}")

    # Fallback to SQLite
    return _get_attendance_sqlite(db, current_user)



def _get_attendance_sqlite(db: Session, current_user: User):
    """Original SQLite attendance summary as fallback."""
    if current_user.role == UserRole.STUDENT:
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.status == EnrollmentStatus.ACTIVE,
        ).all()

        results = []
        for enrollment in enrollments:
            course = enrollment.course
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
            
            # Dispatch Low Attendance Warning Sentinel
            if percentage > 0 and percentage < 75.0:
                try:
                    from services.notification_dispatcher import dispatch_attendance_alert
                    dispatch_attendance_alert(
                        user_name=current_user.name,
                        phone=current_user.phone or "9876540001",
                        email=current_user.email,
                        subject_name=course.name,
                        attendance_pct=percentage,
                        required_lectures=3
                    )
                except Exception as ne:
                    print(f"[ATTENDANCE ALERT ERROR] {ne}")

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


@router.post("/sessions")
def create_session(
    request: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY])),
):
    """Start a new attendance session for a course. Faculty only. Writes to SQLite."""
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
def mark_attendance(
    session_id: str,
    request: AttendanceMarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY])),
):
    """Mark attendance for students in a session. Faculty only. Writes to SQLite."""
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
    """Get attendance session details with all logged marks. From SQLite."""
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
    """Get attendance history for a student in a specific course. From SQLite."""
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
