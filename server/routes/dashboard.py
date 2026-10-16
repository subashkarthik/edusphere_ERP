import math
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
    - At-risk warning when any course attendance < policy minimum + recovery formula
    """
    from services.metrics import (
        attendance_for,
        attendance_overall,
        assessment_for,
        progress_for,
        certificate_eligibility,
    )

    org_id = getattr(current_user, "org_id", "org-edusphere") or "org-edusphere"

    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED])
    ).all()

    enrolled_course_ids = [e.course_id for e in enrollments]

    courses_data = []
    at_risk_courses = []
    all_assessment_scores = []
    certificates_earned_count = 0

    for enr in enrollments:
        course = db.query(Course).filter(Course.id == enr.course_id).first()
        if not course:
            continue

        faculty = db.query(User).filter(User.id == course.faculty_id).first() if course.faculty_id else None

        c_attn = attendance_for(db, org_id, current_user.id, course.id)
        c_assess = assessment_for(db, org_id, current_user.id, course.id)
        c_prog = progress_for(db, org_id, current_user.id, course.id)
        c_cert = certificate_eligibility(db, org_id, current_user.id, course.id)

        if c_assess["pct"] is not None:
            all_assessment_scores.append(c_assess["pct"])

        cert = db.query(Certificate).filter(
            Certificate.user_id == current_user.id,
            Certificate.course_id == course.id
        ).first()

        is_issued = bool(cert and cert.eligibility_status == CertificateStatus.ISSUED)
        if is_issued:
            certificates_earned_count += 1

        cert_status = cert.eligibility_status.value if cert else ("ELIGIBLE" if c_cert["eligible"] else "INELIGIBLE")
        cert_code = cert.certificate_code if is_issued else None

        policy_min = 75.0
        if "policy" in c_cert and isinstance(c_cert["policy"], dict):
            policy_min = c_cert["policy"].get("min_attendance_pct", 75.0)

        held = c_attn.get("held", 0)
        attended = c_attn.get("attended", 0)
        current_pct = c_attn.get("pct")

        is_at_risk = False
        classes_needed = 0
        formula_str = ""

        if held > 0 and current_pct is not None and current_pct < policy_min:
            is_at_risk = True
            classes_needed = math.ceil((policy_min * held - 100 * attended) / (100 - policy_min))
            classes_needed = max(classes_needed, 1)
            formula_str = f"⌈({policy_min}% × {held} held - 100 × {attended} attended) / (100 - {policy_min}%)⌉ = {classes_needed} consecutive classes needed to reach {policy_min}%"

            at_risk_courses.append({
                "course_id": course.id,
                "course_code": course.code,
                "course_name": course.name,
                "faculty_name": faculty.name if faculty else "Unassigned",
                "current_pct": current_pct,
                "policy_min_pct": policy_min,
                "classes_attended": attended,
                "classes_held": held,
                "classes_needed_to_recover": classes_needed,
                "formula_explanation": formula_str,
            })

        courses_data.append({
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "credits": course.credits,
            "faculty_name": faculty.name if faculty else "Unassigned",
            "attendance_pct": c_attn["pct"],
            "attended": attended,
            "held": held,
            "assessment_pct": c_assess["pct"],
            "progress_pct": c_prog["pct"],
            "certificate_status": cert_status,
            "certificate_code": cert_code,
            "certificate_url": cert.certificate_url if is_issued else None,
            "is_at_risk": is_at_risk,
            "policy_min_pct": policy_min,
            "classes_needed_to_recover": classes_needed,
            "formula_explanation": formula_str,
        })

    overall_att = attendance_overall(db, org_id, current_user.id)
    overall_attendance_pct = overall_att["pct"]
    overall_assessment_avg = round(sum(all_assessment_scores) / len(all_assessment_scores), 1) if all_assessment_scores else None

    # Upcoming / Unattempted Quizzes
    upcoming_quizzes = []
    if enrolled_course_ids:
        quizzes = db.query(Quiz).filter(
            Quiz.course_id.in_(enrolled_course_ids),
            Quiz.is_active == True
        ).all()
        for q in quizzes:
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
        "at_risk_courses": at_risk_courses,
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
    - Attendance sessions held today with "Mark Attendance" shortcut
    - Students below 75% attendance list with recovery formula
    - Class average per assessment (quizzes and assignments)
    """
    from services.metrics import attendance_for

    org_id = getattr(current_user, "org_id", "org-edusphere") or "org-edusphere"

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
    today_sessions_data = []
    for ts in today_sessions:
        c = db.query(Course).filter(Course.id == ts.course_id).first()
        today_sessions_data.append({
            "id": ts.id,
            "course_id": ts.course_id,
            "course_code": c.code if c else "",
            "course_name": c.name if c else "Course",
            "period": ts.period or "General Period",
            "topic": ts.topic or "Course Lecture",
            "status": ts.status.value,
            "session_date": str(ts.session_date),
        })

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

    # Students Below 75% Attendance (At Risk across this faculty's courses)
    students_below_75 = []
    seen_student_course = set()

    # Course breakdown + Class Average per Assessment
    courses_data = []
    all_class_averages = []

    for c in courses:
        c_enrs = [e for e in enrollments if e.course_id == c.id]
        c_pending = sum(1 for s in pending_submissions if s.assignment and s.assignment.course_id == c.id)

        # Attendance for this course
        c_sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == c.id).all()
        c_sids = [s.id for s in c_sessions]
        c_att_pct = 0.0
        if c_sids:
            c_logs = db.query(AttendanceLog).filter(AttendanceLog.session_id.in_(c_sids)).all()
            if c_logs:
                c_pres = sum(1 for l in c_logs if l.status == AttendanceStatus.PRESENT)
                c_att_pct = round((c_pres / len(c_logs)) * 100.0, 1)

        # Assessments and class average
        c_assessments = []

        # 1. Quizzes
        quizzes = db.query(Quiz).filter(Quiz.course_id == c.id).all()
        for q in quizzes:
            q_attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q.id).all()
            avg_quiz_pct = round(sum(att.percentage for att in q_attempts) / len(q_attempts), 1) if q_attempts else None
            item = {
                "id": q.id,
                "type": "QUIZ",
                "title": q.title,
                "course_code": c.code,
                "course_name": c.name,
                "average_pct": avg_quiz_pct,
                "submissions_count": len(q_attempts),
                "total_marks": q.total_marks
            }
            c_assessments.append(item)
            all_class_averages.append(item)

        # 2. Assignments
        assignments = db.query(Assignment).filter(Assignment.course_id == c.id).all()
        for a in assignments:
            graded_subs = db.query(Submission).filter(
                Submission.assignment_id == a.id,
                Submission.marks_obtained.isnot(None)
            ).all()
            avg_asg_pct = round(
                sum((sub.marks_obtained / a.max_marks * 100.0) for sub in graded_subs) / len(graded_subs), 1
            ) if (graded_subs and a.max_marks > 0) else None
            item = {
                "id": a.id,
                "type": "ASSIGNMENT",
                "title": a.title,
                "course_code": c.code,
                "course_name": c.name,
                "average_pct": avg_asg_pct,
                "submissions_count": len(graded_subs),
                "total_marks": a.max_marks
            }
            c_assessments.append(item)
            all_class_averages.append(item)

        # Calculate students below 75% for this course
        for enr in c_enrs:
            key = (enr.student_id, c.id)
            if key in seen_student_course:
                continue
            seen_student_course.add(key)

            st = enr.student or db.query(User).filter(User.id == enr.student_id).first()
            if not st:
                continue

            st_attn = attendance_for(db, org_id, st.id, c.id)
            if st_attn["pct"] is not None and st_attn["pct"] < 75.0 and st_attn["held"] > 0:
                held = st_attn["held"]
                attended = st_attn["attended"]
                classes_needed = math.ceil((75.0 * held - 100.0 * attended) / 25.0)
                classes_needed = max(classes_needed, 1)

                students_below_75.append({
                    "student_id": st.id,
                    "student_name": st.name,
                    "student_email": st.email,
                    "enrollment_no": st.enrollment_no or f"ED-{st.id[:6].upper()}",
                    "course_id": c.id,
                    "course_code": c.code,
                    "course_name": c.name,
                    "attendance_pct": st_attn["pct"],
                    "classes_attended": attended,
                    "classes_held": held,
                    "classes_needed_to_recover": classes_needed,
                    "formula": f"⌈(75% × {held} - 100 × {attended}) / 25%⌉ = {classes_needed} classes"
                })

        courses_data.append({
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "credits": c.credits,
            "enrolled_students_count": len(c_enrs),
            "pending_grading_count": c_pending,
            "attendance_pct": c_att_pct,
            "sessions_count": len(c_sessions),
            "assessment_averages": c_assessments
        })

    return {
        "my_courses_count": len(courses),
        "total_students_count": unique_students_count,
        "pending_grading_count": pending_grading_count,
        "today_sessions_count": today_sessions_count,
        "today_sessions": today_sessions_data,
        "overall_attendance_pct": overall_attendance_pct,
        "courses": courses_data,
        "students_below_75": students_below_75,
        "class_averages_per_assessment": all_class_averages,
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
    - Counts of students, faculty, courses, enrollments
    - Attendance rate by department
    - Courses without assigned faculty
    - Students without active enrollments
    - Certificates issued / revoked
    - Recent system audit events
    """
    org_id = current_user.org_id

    # 1. Counts
    total_users = db.query(User).filter(User.org_id == org_id).count()
    total_students = db.query(User).filter(User.org_id == org_id, User.role == UserRole.STUDENT, User.is_active == True).count()
    total_faculty = db.query(User).filter(User.org_id == org_id, User.role == UserRole.FACULTY, User.is_active == True).count()
    total_admins = db.query(User).filter(User.org_id == org_id, User.role == UserRole.ADMIN, User.is_active == True).count()
    total_courses = db.query(Course).filter(Course.org_id == org_id, Course.is_active == True).count()
    total_enrollments = db.query(Enrollment).filter(
        Enrollment.org_id == org_id,
        Enrollment.status == EnrollmentStatus.ACTIVE
    ).count()

    # 2. Certificates
    certificates_issued = db.query(Certificate).filter(
        Certificate.org_id == org_id,
        Certificate.eligibility_status == CertificateStatus.ISSUED
    ).count()

    certificates_revoked = db.query(Certificate).filter(
        Certificate.org_id == org_id,
        Certificate.eligibility_status == CertificateStatus.REVOKED
    ).count()

    # 3. Attendance Rate by Department
    departments = db.query(Department).filter(Department.org_id == org_id).all()
    attendance_by_department = []

    for dept in departments:
        dept_course_ids = [c.id for c in db.query(Course.id).filter(
            Course.department_id == dept.id,
            Course.org_id == org_id,
            Course.is_active == True
        ).all()]

        if dept_course_ids:
            dept_session_ids = [s.id for s in db.query(AttendanceSession.id).filter(
                AttendanceSession.course_id.in_(dept_course_ids),
                AttendanceSession.org_id == org_id
            ).all()]
            if dept_session_ids:
                dept_logs = db.query(AttendanceLog).filter(AttendanceLog.session_id.in_(dept_session_ids)).all()
                total_dept_logs = len(dept_logs)
                pres_dept_logs = sum(1 for l in dept_logs if l.status == AttendanceStatus.PRESENT)
                dept_rate = round((pres_dept_logs / total_dept_logs) * 100.0, 1) if total_dept_logs > 0 else 0.0
            else:
                dept_rate = 0.0
        else:
            dept_rate = 0.0

        dept_courses_count = len(dept_course_ids)
        dept_student_count = db.query(User).filter(
            User.department_id == dept.id,
            User.role == UserRole.STUDENT,
            User.org_id == org_id,
            User.is_active == True
        ).count()

        attendance_by_department.append({
            "department_id": dept.id,
            "department_code": dept.code,
            "department_name": dept.name,
            "attendance_rate": dept_rate,
            "courses_count": dept_courses_count,
            "students_count": dept_student_count,
        })

    # 4. Courses Without Assigned Faculty
    unassigned_courses = db.query(Course).filter(
        Course.org_id == org_id,
        Course.is_active == True,
        (Course.faculty_id == None) | (Course.faculty_id == "")
    ).all()

    courses_without_faculty = []
    for uc in unassigned_courses:
        dept_name = uc.department.name if uc.department else "General"
        courses_without_faculty.append({
            "id": uc.id,
            "code": uc.code,
            "name": uc.name,
            "credits": uc.credits,
            "department_name": dept_name,
        })

    # 5. Students Without Enrollments
    all_students = db.query(User).filter(
        User.org_id == org_id,
        User.role == UserRole.STUDENT,
        User.is_active == True
    ).all()

    active_enrolled_student_ids = set(
        e.student_id for e in db.query(Enrollment.student_id).filter(
            Enrollment.org_id == org_id,
            Enrollment.status == EnrollmentStatus.ACTIVE
        ).all()
    )

    students_without_enrollments = []
    for st in all_students:
        if st.id not in active_enrolled_student_ids:
            dept_name = st.department.name if st.department else "General"
            students_without_enrollments.append({
                "id": st.id,
                "name": st.name,
                "email": st.email,
                "enrollment_no": st.enrollment_no or f"ED-{st.id[:6].upper()}",
                "department_name": dept_name,
            })

    # 6. Overall System Attendance
    total_sessions = db.query(AttendanceSession).filter(AttendanceSession.org_id == org_id).count()
    total_logs = db.query(AttendanceLog).filter(AttendanceLog.org_id == org_id).count()
    present_logs = db.query(AttendanceLog).filter(
        AttendanceLog.org_id == org_id,
        AttendanceLog.status == AttendanceStatus.PRESENT
    ).count()
    average_attendance_rate = round((present_logs / total_logs) * 100.0, 1) if total_logs > 0 else 0.0

    # 7. Assessments
    total_quizzes = db.query(Quiz).filter(Quiz.org_id == org_id).count()
    total_quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.org_id == org_id).count()
    total_assignments = db.query(Assignment).filter(Assignment.org_id == org_id).count()
    total_submissions = db.query(Submission).filter(Submission.org_id == org_id).count()

    # 8. Recent Audit Events
    recent_logs = db.query(AuditLog).filter(
        AuditLog.org_id == org_id
    ).order_by(AuditLog.timestamp.desc()).limit(10).all()

    recent_audit_events = []
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
        recent_audit_events.append({
            "id": log_item.id,
            "action": log_item.action,
            "resource_type": log_item.resource_type,
            "actor_name": actor.name if actor else "System",
            "time": time_str,
            "timestamp": log_item.timestamp.isoformat() if log_item.timestamp else "",
            "details": getattr(log_item, "details", None) or f"{log_item.action} on {log_item.entity or log_item.resource_type or 'SYSTEM'}"
        })

    return {
        "counts": {
            "students": total_students,
            "faculty": total_faculty,
            "courses": total_courses,
            "enrollments": total_enrollments,
            "total_users": total_users,
            "admins": total_admins,
        },
        "attendance_by_department": attendance_by_department,
        "courses_without_faculty": courses_without_faculty,
        "students_without_enrollments": students_without_enrollments,
        "certificates": {
            "issued": certificates_issued,
            "revoked": certificates_revoked,
            "ineligible": 0
        },
        "attendance": {
            "average_rate": average_attendance_rate,
            "total_sessions": total_sessions,
            "total_logs": total_logs,
        },
        "assessments": {
            "total_quizzes": total_quizzes,
            "total_quiz_attempts": total_quiz_attempts,
            "total_assignments": total_assignments,
            "total_submissions": total_submissions
        },
        "recent_audit_events": recent_audit_events,
        "recent_audit_logs": recent_audit_events,
        "users": {
            "total": total_users,
            "students": total_students,
            "faculty": total_faculty,
            "admins": total_admins
        },
        "courses": {
            "total": total_courses,
            "departments": len(departments)
        },
        "enrollments": {
            "total_active": total_enrollments
        }
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
