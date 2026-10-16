"""
EduSphere LMS — Unified Metrics Service
server/services/metrics.py

Single source of truth for all academic metrics across EduSphere:
1. attendance_for(db, org_id, student_id, course_id)
2. attendance_overall(db, org_id, student_id)
3. assessment_for(db, org_id, student_id, course_id)
4. progress_for(db, org_id, student_id, course_id)
5. certificate_eligibility(db, org_id, student_id, course_id)

RULES:
- Zero frontend calculation of percentages.
- Reads ONLY from database models.
- When no sessions held yet: pct = None (UI displays 'No classes held yet', not 0% and not 100%).
- Consistent mathematical weights across all screens.
"""

from datetime import date, datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from models.content import Assignment, Submission, Module, Lesson, LessonProgress
from models.exam import Quiz, QuizAttempt, ExamSchedule, ExamResult
from models.certificate import Certificate, CertificatePolicy, CertificateSetting, CertificateStatus


def attendance_for(db: Session, org_id: str, student_id: str, course_id: str) -> Dict[str, Any]:
    """
    Compute attendance metrics for a specific student in a specific course.

    held = number of ClassSession (AttendanceSession) rows for that course up to today (session_date <= today).
    attended = present + od, late counts per policy setting (default 1.0).
    pct = (attended / held) * 100.0 (or None if held == 0).
    """
    today = date.today()
    held_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == course_id,
        AttendanceSession.session_date <= today
    ).all()
    held = len(held_sessions)

    if held == 0:
        return {
            "course_id": course_id,
            "student_id": student_id,
            "attended": 0,
            "held": 0,
            "pct": None,
            "status": "NO_SESSIONS",
            "is_low": False,
        }

    session_ids = [s.id for s in held_sessions]
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.student_id == student_id,
        AttendanceLog.session_id.in_(session_ids)
    ).all()

    present_count = sum(1 for l in logs if l.status == AttendanceStatus.PRESENT)
    od_count = sum(1 for l in logs if l.status == AttendanceStatus.OD)
    late_count = sum(1 for l in logs if l.status == AttendanceStatus.LATE)

    # Late policy setting: by institutional default, late counts as 1.0 session
    late_weight = 1.0
    attended = round(present_count + od_count + (late_count * late_weight), 2)
    # Ensure attended does not exceed held
    attended = min(attended, held)

    pct = round((attended / held) * 100.0, 1)

    # Risk categorization
    risk_status = "SAFE" if pct >= 75.0 else ("WARNING" if pct >= 65.0 else "CRITICAL")
    is_low = (pct < 75.0)

    return {
        "course_id": course_id,
        "student_id": student_id,
        "attended": attended,
        "held": held,
        "pct": pct,
        "status": risk_status,
        "is_low": is_low,
    }


def attendance_overall(db: Session, org_id: str, student_id: str) -> Dict[str, Any]:
    """
    Compute overall attendance across all enrolled active courses for a student.

    Formula:
        Overall Attendance Percentage = (Total Sessions Attended across all enrolled courses) / (Total Sessions Held across all enrolled courses) * 100.0

        Mathematically:
            P_overall = (sum_{c in Courses} attended_c / sum_{c in Courses} held_c) * 100.0
            where:
                - c iterates through the student's active enrolled courses
                - attended_c is computed via attendance_for(student_id, course_id)['attended']
                - held_c is computed via attendance_for(student_id, course_id)['held']

    Weighted by sessions held:
        This weighted calculation guarantees exact consistency between per-course attendance and overall attendance,
        preventing unweighted average distortion (e.g. a course with only 2 sessions having the same weight as a course with 40 sessions).

    Null Handling:
        When no sessions have been held yet across any enrolled course (sum_{c} held_c == 0):
            P_overall = None (UI displays 'No classes held yet', not 0% and not 100%).
    """
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED])
    ).all()

    per_course = []
    total_attended = 0.0
    total_held = 0

    for enr in enrollments:
        course = db.query(Course).filter(Course.id == enr.course_id).first()
        if not course:
            continue

        c_att = attendance_for(db, org_id, student_id, course.id)
        c_att["course_code"] = course.code
        c_att["course_name"] = course.name
        per_course.append(c_att)

        total_attended += c_att["attended"]
        total_held += c_att["held"]

    if total_held > 0:
        overall_pct = round((total_attended / total_held) * 100.0, 1)
        risk_status = "SAFE" if overall_pct >= 75.0 else ("WARNING" if overall_pct >= 65.0 else "CRITICAL")
        has_warning = (overall_pct < 75.0)
    else:
        overall_pct = None
        risk_status = "NO_SESSIONS"
        has_warning = False

    return {
        "student_id": student_id,
        "attended": total_attended,
        "held": total_held,
        "pct": overall_pct,
        "percentage": overall_pct,
        "status": risk_status,
        "has_warning": has_warning,
        "is_low": has_warning,
        "total_courses": len(per_course),
        "courses": per_course,
    }


def assessment_for(db: Session, org_id: str, student_id: str, course_id: str) -> Dict[str, Any]:
    """
    Compute average of graded quiz/assignment/exam scores as a percentage.
    Ungraded items are excluded and counted as 'pending'.
    If no graded items exist: pct = None.
    """
    graded_scores: List[float] = []
    pending_count = 0

    # 1. Quizzes
    quizzes = db.query(Quiz).filter(Quiz.course_id == course_id, Quiz.is_active == True).all()
    for q in quizzes:
        if getattr(q, "is_results_published", False):
            attempt = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id == q.id,
                QuizAttempt.student_id == student_id
            ).order_by(QuizAttempt.percentage.desc()).first()

            if attempt:
                graded_scores.append(float(attempt.percentage))
            else:
                pending_count += 1
        else:
            pending_count += 1

    # 2. Assignments
    assignments = db.query(Assignment).filter(Assignment.course_id == course_id).all()
    for a in assignments:
        if getattr(a, "is_results_published", False):
            sub = db.query(Submission).filter(
                Submission.assignment_id == a.id,
                Submission.student_id == student_id
            ).first()

            if sub and sub.marks_obtained is not None:
                max_m = a.max_marks or 100
                score_pct = (sub.marks_obtained / max_m) * 100.0 if max_m > 0 else 100.0
                graded_scores.append(round(score_pct, 1))
            else:
                pending_count += 1
        else:
            pending_count += 1

    # 3. Exams
    exams = db.query(ExamSchedule).filter(ExamSchedule.course_id == course_id).all()
    for exam in exams:
        result = db.query(ExamResult).filter(
            ExamResult.exam_id == exam.id,
            ExamResult.student_id == student_id,
            ExamResult.is_published == True
        ).first()

        if result and result.marks_obtained is not None:
            max_m = exam.max_marks or 100
            score_pct = (result.marks_obtained / max_m) * 100.0 if max_m > 0 else 100.0
            graded_scores.append(round(score_pct, 1))
        else:
            pending_count += 1

    if graded_scores:
        avg_pct = round(sum(graded_scores) / len(graded_scores), 1)
    else:
        avg_pct = None

    return {
        "course_id": course_id,
        "student_id": student_id,
        "pct": avg_pct,
        "score": avg_pct,
        "graded_count": len(graded_scores),
        "pending_count": pending_count,
        "total_items": len(graded_scores) + pending_count,
    }


def progress_for(db: Session, org_id: str, student_id: str, course_id: str) -> Dict[str, Any]:
    """
    Compute student's learning progress in a course:
    completed lessons / total lessons.
    If total lessons == 0: pct = None.
    """
    modules = db.query(Module).filter(Module.course_id == course_id).all()
    module_ids = [m.id for m in modules]
    lessons = db.query(Lesson).filter(Lesson.module_id.in_(module_ids)).all() if module_ids else []
    total = len(lessons)

    if total == 0:
        return {
            "course_id": course_id,
            "student_id": student_id,
            "completed": 0,
            "total": 0,
            "pct": None,
        }

    lesson_ids = [l.id for l in lessons]
    completed = db.query(LessonProgress).filter(
        LessonProgress.user_id == student_id,
        LessonProgress.lesson_id.in_(lesson_ids),
        LessonProgress.completed == True
    ).count()

    pct = round((completed / total) * 100.0, 1)
    return {
        "course_id": course_id,
        "student_id": student_id,
        "completed": completed,
        "total": total,
        "pct": pct,
    }


def certificate_eligibility(db: Session, org_id: str, student_id: str, course_id: str) -> Dict[str, Any]:
    """
    Evaluate student's certificate eligibility for a course using CertificatePolicy.
    Returns: {attendance_ok, assessment_ok, progress_ok, eligible, reasons[], ...}
    """
    policy = db.query(CertificatePolicy).filter(CertificatePolicy.course_id == course_id).first()
    if not policy:
        setting = db.query(CertificateSetting).filter(CertificateSetting.org_id == org_id).first()
        min_attn = setting.min_attendance_pct if setting else 75.0
        min_assess = setting.min_assessment_pct if setting else 50.0
        min_prog = setting.min_progress_pct if setting else 100.0
    else:
        min_attn = policy.min_attendance_pct
        min_assess = policy.min_assessment_pct
        min_prog = policy.min_progress_pct

    attn = attendance_for(db, org_id, student_id, course_id)
    assess = assessment_for(db, org_id, student_id, course_id)
    prog = progress_for(db, org_id, student_id, course_id)

    reasons = []

    # 1. Attendance check
    min_attn_fmt = f"{int(min_attn)}" if float(min_attn).is_integer() else f"{min_attn}"
    if attn["pct"] is None:
        attendance_ok = False
        reasons.append("No class sessions have been held yet")
    elif attn["pct"] >= min_attn:
        attendance_ok = True
    else:
        attendance_ok = False
        reasons.append(f"Not eligible: attendance {attn['pct']}% < {min_attn_fmt}%")

    # 2. Assessment check
    min_assess_fmt = f"{int(min_assess)}" if float(min_assess).is_integer() else f"{min_assess}"
    if assess["pct"] is None:
        if assess["total_items"] == 0:
            assessment_ok = True
        else:
            assessment_ok = False
            reasons.append(f"Assessments pending grading ({assess['pending_count']} pending)")
    elif assess["pct"] >= min_assess:
        assessment_ok = True
    else:
        assessment_ok = False
        reasons.append(f"Not eligible: assessment {assess['pct']}% < {min_assess_fmt}%")

    # 3. Progress check
    min_prog_fmt = f"{int(min_prog)}" if float(min_prog).is_integer() else f"{min_prog}"
    if prog["pct"] is None:
        progress_ok = True if prog["total"] == 0 else False
        if not progress_ok:
            reasons.append(f"Not eligible: course progress 0.0% < {min_prog_fmt}%")
    elif prog["pct"] >= min_prog:
        progress_ok = True
    else:
        progress_ok = False
        reasons.append(f"Not eligible: course progress {prog['pct']}% < {min_prog_fmt}%")

    eligible = bool(attendance_ok and assessment_ok and progress_ok)

    # Check if certificate is already issued or has manual override
    cert = db.query(Certificate).filter(
        Certificate.user_id == student_id,
        Certificate.course_id == course_id
    ).first()

    if cert and cert.eligibility_status == CertificateStatus.ISSUED:
        is_issued = True
        if getattr(cert, "is_override", False):
            eligible = True
    else:
        is_issued = False
    certificate_code = cert.certificate_code if (cert and is_issued) else None

    return {
        "course_id": course_id,
        "student_id": student_id,
        "attendance_ok": attendance_ok,
        "assessment_ok": assessment_ok,
        "progress_ok": progress_ok,
        "eligible": eligible,
        "reasons": reasons,
        "is_issued": is_issued,
        "certificate_code": certificate_code,
        "attendance": attn,
        "assessment": assess,
        "progress": prog,
        "policy": {
            "min_attendance_pct": min_attn,
            "min_assessment_pct": min_assess,
            "min_progress_pct": min_prog,
        }
    }
