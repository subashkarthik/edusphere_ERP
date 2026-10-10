import asyncio
import logging
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from models.user import User
from models.notification import Notification
from models.academic import Course, Enrollment, EnrollmentStatus
from utils.websocket_manager import manager
from services.email_service import send_email

logger = logging.getLogger("NotificationService")


def _fire_ws_notification(payload: dict, user_id: str):
    """Safely trigger WebSocket message dispatch across sync and async contexts."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(manager.send_personal_message(payload, user_id))
        else:
            loop.run_until_complete(manager.send_personal_message(payload, user_id))
    except RuntimeError:
        # If no event loop exists in the current thread, create a new one
        new_loop = asyncio.new_event_loop()
        try:
            new_loop.run_until_complete(manager.send_personal_message(payload, user_id))
        finally:
            new_loop.close()
    except Exception as e:
        logger.debug(f"[WS NOTIFICATION ERROR] {e}")


def dispatch_notification(
    db: Session,
    user_id: str,
    type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    org_id: str = "org-edusphere"
) -> Notification:
    """
    Core notification dispatcher:
    1. Persists Notification to database.
    2. Sends live push over WebSocket.
    3. Sends optional notification email via SMTP (skips silently if SMTP not configured).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.warning(f"[NOTIFICATION] Target user {user_id} not found.")
        return None

    actual_org_id = user.org_id or org_id

    # 1. Database Persistence
    notif = Notification(
        org_id=actual_org_id,
        user_id=user.id,
        type=type,
        title=title,
        message=message,
        link=link,
        read=False,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    notif_data = notif.to_dict()

    # 2. Live WebSocket Push
    ws_payload = {
        "type": "NOTIFICATION",
        "data": notif_data
    }
    _fire_ws_notification(ws_payload, user.id)

    # 3. Optional SMTP Email (Safe / Silent fallback)
    try:
        if user.email:
            send_email(
                to_email=user.email,
                subject=title,
                body_text=message,
                body_html=f"""
                <div style="font-family: sans-serif; padding: 20px; color: #1e293b; background: #f8fafc; border-radius: 12px;">
                    <h2 style="color: #4f46e5; margin-bottom: 8px;">EduSphere Alert: {title}</h2>
                    <p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px;">{message}</p>
                    <p style="font-size: 12px; color: #64748b;">This is an automated notification from the EduSphere Academic Platform.</p>
                </div>
                """
            )
    except Exception as e:
        logger.debug(f"[EMAIL SILENT SKIP] {e}")

    return notif


# ─── CONVENIENCE EVENT DISPATCHERS ───

def notify_enrollment(db: Session, student_id: str, course: Course):
    """Event: Enrolled in course."""
    title = f"Enrolled in {course.code}"
    message = f"You have been successfully enrolled in {course.code} — {course.name}."
    link = f"/courses/{course.id}"
    return dispatch_notification(
        db=db,
        user_id=student_id,
        type="ENROLLMENT",
        title=title,
        message=message,
        link=link,
        org_id=course.org_id
    )


def notify_attendance_warning(db: Session, student_id: str, course: Course, attendance_pct: float):
    """Event: Attendance dropped below 75%."""
    title = f"Attendance Warning: {course.code}"
    message = f"Your attendance in {course.code} ({course.name}) is currently {attendance_pct:.1f}%, which is below the required 75% threshold."
    link = "/attendance"
    return dispatch_notification(
        db=db,
        user_id=student_id,
        type="ATTENDANCE_WARNING",
        title=title,
        message=message,
        link=link,
        org_id=course.org_id
    )


def notify_quiz_published(db: Session, course: Course, quiz):
    """Event: Quiz published — notify all enrolled active students."""
    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course.id,
        Enrollment.status == EnrollmentStatus.ACTIVE
    ).all()

    title = f"New Quiz: {quiz.title}"
    message = f"A new quiz '{quiz.title}' ({quiz.time_limit_minutes} mins) has been published for {course.code} — {course.name}."
    link = "/assessments"

    dispatched = []
    for enr in enrollments:
        n = dispatch_notification(
            db=db,
            user_id=enr.student_id,
            type="QUIZ_PUBLISHED",
            title=title,
            message=message,
            link=link,
            org_id=course.org_id
        )
        if n:
            dispatched.append(n)
    return dispatched


def notify_assignment_graded(db: Session, student_id: str, course: Course, assignment, submission):
    """Event: Assignment graded."""
    title = f"Assignment Graded: {assignment.title}"
    marks = submission.marks_obtained or 0.0
    message = f"Your submission for '{assignment.title}' in {course.code} has been graded: {marks}/{assignment.max_marks} marks."
    link = "/assessments"
    return dispatch_notification(
        db=db,
        user_id=student_id,
        type="ASSIGNMENT_GRADED",
        title=title,
        message=message,
        link=link,
        org_id=course.org_id
    )


def notify_certificate_issued(db: Session, student_id: str, course: Course, cert):
    """Event: Certificate issued."""
    title = f"Certificate Issued: {course.name}"
    message = f"Congratulations! Your official academic certificate for {course.name} ({cert.certificate_code}) has been verified and issued."
    link = "/certificates"
    return dispatch_notification(
        db=db,
        user_id=student_id,
        type="CERTIFICATE_ISSUED",
        title=title,
        message=message,
        link=link,
        org_id=course.org_id
    )


def notify_certificate_revoked(db: Session, student_id: str, course: Course, cert):
    """Event: Certificate revoked."""
    title = f"Certificate Revoked: {course.name}"
    message = f"Notice: Your certificate {cert.certificate_code} for {course.name} has been revoked by administration."
    link = "/certificates"
    return dispatch_notification(
        db=db,
        user_id=student_id,
        type="CERTIFICATE_REVOKED",
        title=title,
        message=message,
        link=link,
        org_id=course.org_id
    )
