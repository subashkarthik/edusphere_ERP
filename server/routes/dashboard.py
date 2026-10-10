from datetime import datetime, date, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from database import get_db
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus
from models.exam import Quiz, QuizAttempt, ExamSchedule, ExamResult
from models.content import Assignment, Submission, AssignmentStatus, Module, Lesson, LessonProgress
from models.certificate import Certificate, CertificateStatus
from models.audit import AuditLog
from models.placement import PlacementStats
from middleware.auth import get_current_user, require_roles
from services.certificate_service import calculate_student_metrics
from utils.audit_logger import log_audit

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


# ---------------------------------------------------------
# 1. STUDENT DASHBOARD ENDPOINT
# ---------------------------------------------------------
@router.get("/student")
def get_student_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Real data dashboard for the authenticated student:
    - Enrolled courses with real attendance %, assessment %, and progress %
    - Overall attendance percentage (0% if no sessions)
    - Average assessment score
    - Upcoming / pending quizzes and assignments
    - Earned / eligible certificates
    """
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED])
    ).all()

    enrolled_course_ids = [e.course_id for e in enrollments]

    # Calculate per-course details and aggregate numbers
    courses_data = []
    total_sessions_all = 0
    total_present_all = 0
    all_assessment_scores = []
    certificates_earned_count = 0

    for enr in enrollments:
        course = db.query(Course).filter(Course.id == enr.course_id).first()
        if not course:
            continue

        faculty = db.query(User).filter(User.id == course.faculty_id).first() if course.faculty_id else None
        
        # Real metrics calculation
        attn_pct, assess_pct, prog_pct = calculate_student_metrics(db, current_user.id, course.id)
        
        # Count actual attendance sessions & logs
        sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == course.id).all()
        sess_ids = [s.id for s in sessions]
        if sess_ids:
            logs = db.query(AttendanceLog).filter(
                AttendanceLog.student_id == current_user.id,
                AttendanceLog.session_id.in_(sess_ids)
            ).all()
            present_cnt = sum(1 for l in logs if l.status == AttendanceStatus.PRESENT)
            total_sessions_all += max(len(sessions), len(logs))
            total_present_all += present_cnt

        if assess_pct > 0:
            all_assessment_scores.append(assess_pct)

        # Check certificate
        cert = db.query(Certificate).filter(
            Certificate.user_id == current_user.id,
            Certificate.course_id == course.id
        ).first()

        cert_status = cert.eligibility_status.value if cert else "INELIGIBLE"
        cert_code = cert.certificate_code if (cert and cert.eligibility_status == CertificateStatus.ISSUED) else None
        if cert and cert.eligibility_status == CertificateStatus.ISSUED:
            certificates_earned_count += 1

        courses_data.append({
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "credits": course.credits,
            "faculty_name": faculty.name if faculty else "Unassigned",
            "attendance_pct": attn_pct,
            "assessment_pct": assess_pct,
            "progress_pct": prog_pct,
            "certificate_status": cert_status,
            "certificate_code": cert_code,
            "certificate_url": cert.certificate_url if (cert and cert.eligibility_status == CertificateStatus.ISSUED) else None,
        })

    overall_attendance_pct = round((total_present_all / total_sessions_all) * 100.0, 1) if total_sessions_all > 0 else 0.0
    overall_assessment_avg = round(sum(all_assessment_scores) / len(all_assessment_scores), 1) if all_assessment_scores else 0.0

    # Upcoming / Unattempted Quizzes
    upcoming_quizzes = []
    if enrolled_course_ids:
        quizzes = db.query(Quiz).filter(
            Quiz.course_id.in_(enrolled_course_ids),
            Quiz.is_active == True
        ).all()
        for q in quizzes:
            # Check if student attempted
            attempt = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id == q.id,
                QuizAttempt.student_id == current_user.id
            ).first()
            if not attempt:
                c = db.query(Course).filter(Course.id == q.course_id).first()
                upcoming_quizzes.append({
                    "id": q.id,
                    "title": q.title,
                    "course_id": q.course_id,
                    "course_code": c.code if c else "",
                    "course_name": c.name if c else "",
                    "time_limit_minutes": q.time_limit_minutes,
                    "total_marks": q.total_marks,
                    "passing_percentage": q.passing_percentage
                })

    # Upcoming / Unsubmitted Assignments
    upcoming_assignments = []
    if enrolled_course_ids:
        assignments = db.query(Assignment).filter(
            Assignment.course_id.in_(enrolled_course_ids)
        ).order_by(Assignment.due_date.asc()).all()
        for a in assignments:
            sub = db.query(Submission).filter(
                Submission.assignment_id == a.id,
                Submission.student_id == current_user.id
            ).first()
            if not sub:
                c = db.query(Course).filter(Course.id == a.course_id).first()
                upcoming_assignments.append({
                    "id": a.id,
                    "title": a.title,
                    "course_id": a.course_id,
                    "course_code": c.code if c else "",
                    "course_name": c.name if c else "",
                    "due_date": a.due_date.strftime("%Y-%m-%d %H:%M") if a.due_date else "",
                    "max_marks": a.max_marks
                })

    # Earned Certificates List
    earned_certs = db.query(Certificate).filter(
        Certificate.user_id == current_user.id,
        Certificate.eligibility_status == CertificateStatus.ISSUED
    ).all()
    earned_certs_data = []
    for ec in earned_certs:
        c = db.query(Course).filter(Course.id == ec.course_id).first()
        earned_certs_data.append({
            "id": ec.id,
            "certificate_code": ec.certificate_code,
            "course_id": ec.course_id,
            "course_name": c.name if c else "Course",
            "course_code": c.code if c else "",
            "issued_date": ec.issued_date.strftime("%Y-%m-%d") if ec.issued_date else "",
            "certificate_url": ec.certificate_url
        })

    return {
        "enrolled_courses_count": len(courses_data),
        "overall_attendance_pct": overall_attendance_pct,
        "average_assessment_score": overall_assessment_avg,
        "certificates_earned_count": len(earned_certs_data),
        "courses": courses_data,
        "upcoming_quizzes": upcoming_quizzes,
        "upcoming_assignments": upcoming_assignments,
        "earned_certificates": earned_certs_data
    }


# ---------------------------------------------------------
# 2. FACULTY DASHBOARD ENDPOINT
# ---------------------------------------------------------
@router.get("/faculty")
def get_faculty_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN])),
):
    """
    Real data dashboard for the authenticated faculty member:
    - Courses taught by this faculty (or org courses if admin)
    - Total students enrolled across courses
    - Submissions pending evaluation / grading
    - Attendance sessions held today and overall attendance rate
    """
    if current_user.role == UserRole.ADMIN:
        courses = db.query(Course).filter(Course.org_id == current_user.org_id, Course.is_active == True).all()
    else:
        courses = db.query(Course).filter(
            Course.faculty_id == current_user.id,
            Course.is_active == True
        ).all()

    course_ids = [c.id for c in courses]

    # Enrolled students across courses
    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id.in_(course_ids),
        Enrollment.status == EnrollmentStatus.ACTIVE
    ).all() if course_ids else []

    unique_students_count = len(set(e.student_id for e in enrollments))

    # Pending Submissions for grading
    pending_submissions_query = db.query(Submission).join(Assignment).filter(
        Assignment.course_id.in_(course_ids),
        Submission.marks_obtained.is_(None)
    ) if course_ids else None

    pending_submissions = pending_submissions_query.all() if pending_submissions_query else []
    pending_grading_count = len(pending_submissions)

    pending_submissions_data = []
    for sub in pending_submissions[:10]:
        st = db.query(User).filter(User.id == sub.student_id).first()
        asg = sub.assignment
        c = db.query(Course).filter(Course.id == asg.course_id).first() if asg else None
        pending_submissions_data.append({
            "id": sub.id,
            "assignment_id": sub.assignment_id,
            "assignment_title": asg.title if asg else "Assignment",
            "student_id": sub.student_id,
            "student_name": st.name if st else "Student",
            "student_email": st.email if st else "",
            "course_id": c.id if c else "",
            "course_code": c.code if c else "",
            "course_name": c.name if c else "",
            "submitted_at": sub.submitted_at.strftime("%Y-%m-%d %H:%M") if sub.submitted_at else ""
        })

    # Attendance sessions held today
    today_date = datetime.utcnow().date()
    today_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.course_id.in_(course_ids),
        AttendanceSession.session_date == today_date
    ).all() if course_ids else []

    today_sessions_count = len(today_sessions)

    # Calculate overall attendance rate across faculty's courses
    total_logs = 0
    present_logs = 0
    if course_ids:
        sessions_all = db.query(AttendanceSession).filter(AttendanceSession.course_id.in_(course_ids)).all()
        sess_ids = [s.id for s in sessions_all]
        if sess_ids:
            logs = db.query(AttendanceLog).filter(AttendanceLog.session_id.in_(sess_ids)).all()
            total_logs = len(logs)
            present_logs = sum(1 for l in logs if l.status == AttendanceStatus.PRESENT)

    overall_attendance_pct = round((present_logs / total_logs) * 100.0, 1) if total_logs > 0 else 0.0

    # Course breakdown
    courses_data = []
    for c in courses:
        c_enrs = [e for e in enrollments if e.course_id == c.id]
        c_pending = sum(1 for s in pending_submissions if s.assignment and s.assignment.course_id == c.id)
        
        # attendance for this course
        c_sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == c.id).all()
        c_sids = [s.id for s in c_sessions]
        c_att_pct = 0.0
        if c_sids:
            c_logs = db.query(AttendanceLog).filter(AttendanceLog.session_id.in_(c_sids)).all()
            if c_logs:
                c_pres = sum(1 for l in c_logs if l.status == AttendanceStatus.PRESENT)
                c_att_pct = round((c_pres / len(c_logs)) * 100.0, 1)

        courses_data.append({
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "credits": c.credits,
            "enrolled_students_count": len(c_enrs),
            "pending_grading_count": c_pending,
            "attendance_pct": c_att_pct,
            "sessions_count": len(c_sessions)
        })

    return {
        "my_courses_count": len(courses),
        "total_students_count": unique_students_count,
        "pending_grading_count": pending_grading_count,
        "today_sessions_count": today_sessions_count,
        "overall_attendance_pct": overall_attendance_pct,
        "courses": courses_data,
        "pending_submissions": pending_submissions_data
    }


# ---------------------------------------------------------
# 3. ADMIN DASHBOARD ENDPOINT
# ---------------------------------------------------------
@router.get("/admin")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """
    Real data dashboard for administrators:
    - User counts breakdown by role (students, faculty, admins)
    - Active courses count and department breakdown
    - Total active enrollments
    - Certificates issued / revoked
    - System-wide attendance rate
    - Real assessment & submission metrics
    - Recent system audit logs
    """
    # Users breakdown
    total_users = db.query(User).filter(User.org_id == current_user.org_id).count()
    total_students = db.query(User).filter(User.org_id == current_user.org_id, User.role == UserRole.STUDENT).count()
    total_faculty = db.query(User).filter(User.org_id == current_user.org_id, User.role == UserRole.FACULTY).count()
    total_admins = db.query(User).filter(User.org_id == current_user.org_id, User.role == UserRole.ADMIN).count()

    # Courses & Departments
    total_courses = db.query(Course).filter(Course.org_id == current_user.org_id, Course.is_active == True).count()
    total_departments = db.query(Department).filter(Department.org_id == current_user.org_id).count()

    # Enrollments
    total_enrollments = db.query(Enrollment).filter(
        Enrollment.org_id == current_user.org_id,
        Enrollment.status == EnrollmentStatus.ACTIVE
    ).count()

    # Certificates
    certificates_issued = db.query(Certificate).filter(
        Certificate.org_id == current_user.org_id,
        Certificate.eligibility_status == CertificateStatus.ISSUED
    ).count()

    certificates_revoked = db.query(Certificate).filter(
        Certificate.org_id == current_user.org_id,
        Certificate.eligibility_status == CertificateStatus.REVOKED
    ).count()

    certificates_ineligible = db.query(Certificate).filter(
        Certificate.org_id == current_user.org_id,
        Certificate.eligibility_status == CertificateStatus.INELIGIBLE
    ).count()

    # System-wide Attendance
    total_sessions = db.query(AttendanceSession).filter(AttendanceSession.org_id == current_user.org_id).count()
    total_logs = db.query(AttendanceLog).filter(AttendanceLog.org_id == current_user.org_id).count()
    present_logs = db.query(AttendanceLog).filter(
        AttendanceLog.org_id == current_user.org_id,
        AttendanceLog.status == AttendanceStatus.PRESENT
    ).count()

    average_attendance_rate = round((present_logs / total_logs) * 100.0, 1) if total_logs > 0 else 0.0

    # Assessments summary
    total_quizzes = db.query(Quiz).filter(Quiz.org_id == current_user.org_id).count()
    total_quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.org_id == current_user.org_id).count()
    total_assignments = db.query(Assignment).filter(Assignment.org_id == current_user.org_id).count()
    total_submissions = db.query(Submission).filter(Submission.org_id == current_user.org_id).count()

    # Recent Audit Logs
    recent_logs = db.query(AuditLog).filter(
        AuditLog.org_id == current_user.org_id
    ).order_by(AuditLog.timestamp.desc()).limit(5).all()

    audit_logs_data = []
    now = datetime.now(timezone.utc)
    for log_item in recent_logs:
        delta = now - log_item.timestamp.replace(tzinfo=timezone.utc) if log_item.timestamp else None
        if delta:
            if delta.seconds < 3600:
                time_str = f"{delta.seconds // 60}m ago"
            elif delta.seconds < 86400:
                time_str = f"{delta.seconds // 3600}h ago"
            else:
                time_str = f"{delta.days}d ago"
        else:
            time_str = "Just now"

        actor = db.query(User).filter(User.id == log_item.user_id).first() if log_item.user_id else None
        audit_logs_data.append({
            "id": log_item.id,
            "action": log_item.action,
            "resource_type": log_item.resource_type,
            "actor_name": actor.name if actor else "System",
            "time": time_str,
            "timestamp": log_item.timestamp.isoformat() if log_item.timestamp else ""
        })

    return {
        "users": {
            "total": total_users,
            "students": total_students,
            "faculty": total_faculty,
            "admins": total_admins
        },
        "courses": {
            "total": total_courses,
            "departments": total_departments
        },
        "enrollments": {
            "total_active": total_enrollments
        },
        "certificates": {
            "issued": certificates_issued,
            "revoked": certificates_revoked,
            "ineligible": certificates_ineligible
        },
        "attendance": {
            "average_rate": average_attendance_rate,
            "total_sessions": total_sessions,
            "total_logs": total_logs
        },
        "assessments": {
            "total_quizzes": total_quizzes,
            "total_quiz_attempts": total_quiz_attempts,
            "total_assignments": total_assignments,
            "total_submissions": total_submissions
        },
        "recent_audit_logs": audit_logs_data
    }


# ---------------------------------------------------------
# 4. SYSTEM INFRASTRUCTURE & CONFIG HELPERS
# ---------------------------------------------------------
class ProvisionRequest(BaseModel):
    cores: int
    memory: int


@router.get("/system/config")
def get_system_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
        
    latest = db.query(AuditLog).filter(
        AuditLog.org_id == current_user.org_id,
        AuditLog.action == "SYSTEM_PROVISION"
    ).order_by(AuditLog.timestamp.desc()).first()
    
    if latest and latest.metadata_json:
        return {
            "cores": latest.metadata_json.get("cores", 64),
            "memory": latest.metadata_json.get("memory", 256)
        }
    return {"cores": 64, "memory": 256}


@router.post("/system/provision")
async def provision_system(
    request_data: ProvisionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
        
    latest = db.query(AuditLog).filter(
        AuditLog.org_id == current_user.org_id,
        AuditLog.action == "SYSTEM_PROVISION"
    ).order_by(AuditLog.timestamp.desc()).first()
    
    current_cores = 64
    current_memory = 256
    if latest and latest.metadata_json:
        current_cores = latest.metadata_json.get("cores", 64)
        current_memory = latest.metadata_json.get("memory", 256)
        
    new_cores = current_cores + request_data.cores
    new_memory = current_memory + request_data.memory
    
    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="SYSTEM_PROVISION",
        resource_type="SYSTEM",
        resource_id=None,
        metadata={"cores": new_cores, "memory": new_memory, "added_cores": request_data.cores, "added_memory": request_data.memory},
        request=request
    )
    
    return {"message": "System provisioned successfully", "cores": new_cores, "memory": new_memory}


@router.post("/system/audit")
async def run_system_audit(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
        
    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="SYSTEM_AUDIT",
        resource_type="SYSTEM",
        resource_id=None,
        metadata={"status": "COMPLIANT", "checked_at": datetime.utcnow().isoformat()},
        request=request
    )
    
    return {"message": "Security compliance audit completed successfully", "status": "COMPLIANT"}


@router.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Institutional analytics data for placement trends."""
    stats = db.query(PlacementStats).filter(
        PlacementStats.org_id == current_user.org_id
    ).order_by(PlacementStats.year).all()
    return {
        "placement_trends": [
            {"year": s.year, "placed": s.placed, "total": s.total, "avgLPA": s.avg_lpa}
            for s in stats
        ]
    }
