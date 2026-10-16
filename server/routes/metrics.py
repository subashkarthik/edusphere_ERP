from datetime import date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession
from models.certificate import Certificate, CertificateStatus
from middleware.auth import get_current_user, require_roles
from middleware.scoping import verify_course_access
from services.metrics import (
    attendance_for,
    attendance_overall,
    assessment_for,
    progress_for,
    certificate_eligibility,
)

router = APIRouter(tags=["Metrics"])


# ─────────────────────────────────────────────────────────────────────────────
# 1. /api/me/summary — Authenticated Student Overall Summary
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/api/me/summary")
def get_my_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns authenticated student's overall attendance, assessment, progress,
    and per-course breakdown. Computed entirely via server/services/metrics.py.
    """
    org_id = getattr(current_user, "org_id", "org-edusphere") or "org-edusphere"

    overall_att = attendance_overall(db, org_id, current_user.id)

    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
    ).all()

    courses_list = []
    assessment_scores = []
    progress_scores = []

    for enr in enrollments:
        course = db.query(Course).filter(Course.id == enr.course_id).first()
        if not course:
            continue

        c_attn = attendance_for(db, org_id, current_user.id, course.id)
        c_assess = assessment_for(db, org_id, current_user.id, course.id)
        c_prog = progress_for(db, org_id, current_user.id, course.id)
        c_cert = certificate_eligibility(db, org_id, current_user.id, course.id)

        faculty_name = course.faculty.name if course.faculty else "Unassigned"

        if c_assess["pct"] is not None:
            assessment_scores.append(c_assess["pct"])
        if c_prog["pct"] is not None:
            progress_scores.append(c_prog["pct"])

        courses_list.append({
            "course_id": course.id,
            "course_code": course.code,
            "course_name": course.name,
            "credits": course.credits,
            "faculty_name": faculty_name,
            "attendance": c_attn,
            "assessment": c_assess,
            "progress": c_prog,
            "certificate": c_cert,
        })

    overall_assess_pct = round(sum(assessment_scores) / len(assessment_scores), 1) if assessment_scores else None
    overall_prog_pct = round(sum(progress_scores) / len(progress_scores), 1) if progress_scores else None

    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "overall_attendance": overall_att,
        "overall_assessment_pct": overall_assess_pct,
        "overall_progress_pct": overall_prog_pct,
        "courses_count": len(courses_list),
        "courses": courses_list,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. /api/me/courses/{id}/metrics — Specific Course Metrics for Student
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/api/me/courses/{course_id}/metrics")
def get_my_course_metrics(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns single course metrics for the authenticated student.
    Enforces student enrollment and course access.
    """
    course = verify_course_access(course_id, current_user, db, action="read")

    org_id = getattr(current_user, "org_id", "org-edusphere") or "org-edusphere"

    c_attn = attendance_for(db, org_id, current_user.id, course.id)
    c_assess = assessment_for(db, org_id, current_user.id, course.id)
    c_prog = progress_for(db, org_id, current_user.id, course.id)
    c_cert = certificate_eligibility(db, org_id, current_user.id, course.id)

    return {
        "course_id": course.id,
        "course_code": course.code,
        "course_name": course.name,
        "credits": course.credits,
        "faculty_name": course.faculty.name if course.faculty else "Unassigned",
        "attendance": c_attn,
        "assessment": c_assess,
        "progress": c_prog,
        "certificate": c_cert,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. /api/faculty/courses/{id}/metrics — Course Metrics & Student Roster
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/api/faculty/courses/{course_id}/metrics")
def get_faculty_course_metrics(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN])),
):
    """
    Faculty / Admin: Return course metrics and per-student breakdown.
    Faculty only permitted for courses they teach.
    """
    course = verify_course_access(course_id, current_user, db, action="read_metrics")

    org_id = getattr(current_user, "org_id", "org-edusphere") or "org-edusphere"
    today = date.today()

    total_sessions_held = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == course_id,
        AttendanceSession.session_date <= today,
    ).count()

    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
    ).all()

    students_data = []
    attn_pcts = []
    assess_pcts = []

    for enr in enrollments:
        student = enr.student
        if not student:
            continue

        st_attn = attendance_for(db, org_id, student.id, course_id)
        st_assess = assessment_for(db, org_id, student.id, course_id)
        st_prog = progress_for(db, org_id, student.id, course_id)
        st_cert = certificate_eligibility(db, org_id, student.id, course_id)

        if st_attn["pct"] is not None:
            attn_pcts.append(st_attn["pct"])
        if st_assess["pct"] is not None:
            assess_pcts.append(st_assess["pct"])

        students_data.append({
            "student_id": student.id,
            "name": student.name,
            "email": student.email,
            "enrollment_no": student.enrollment_no or f"ED-{student.id[:6].upper()}",
            "avatar": student.avatar or f"https://ui-avatars.com/api/?name={student.name}&background=6366f1&color=fff",
            "attendance": st_attn,
            "assessment": st_assess,
            "progress": st_prog,
            "certificate": st_cert,
        })

    avg_attn = round(sum(attn_pcts) / len(attn_pcts), 1) if attn_pcts else None
    avg_assess = round(sum(assess_pcts) / len(assess_pcts), 1) if assess_pcts else None

    return {
        "course_id": course.id,
        "course_code": course.code,
        "course_name": course.name,
        "total_sessions_held": total_sessions_held,
        "total_enrolled": len(students_data),
        "average_attendance_pct": avg_attn,
        "average_assessment_pct": avg_assess,
        "students": students_data,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. /api/admin/overview — Institutional Academic Overview
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/api/admin/overview")
def get_admin_academic_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """
    Admin: High-level institutional academic metrics computed purely from DB models.
    """
    org_id = getattr(current_user, "org_id", "org-edusphere") or "org-edusphere"

    total_students = db.query(User).filter(User.org_id == org_id, User.role == UserRole.STUDENT, User.is_active == True).count()
    total_faculty = db.query(User).filter(User.org_id == org_id, User.role == UserRole.FACULTY, User.is_active == True).count()
    total_courses = db.query(Course).filter(Course.org_id == org_id, Course.is_active == True).count()
    total_enrollments = db.query(Enrollment).filter(Enrollment.org_id == org_id, Enrollment.status == EnrollmentStatus.ACTIVE).count()
    total_certs_issued = db.query(Certificate).filter(Certificate.org_id == org_id, Certificate.eligibility_status == CertificateStatus.ISSUED).count()

    # Calculate overall institutional attendance by querying all active students in this org
    students = db.query(User).filter(User.org_id == org_id, User.role == UserRole.STUDENT, User.is_active == True).all()
    all_attendance_pcts = []
    for st in students:
        st_ov = attendance_overall(db, org_id, st.id)
        if st_ov["pct"] is not None:
            all_attendance_pcts.append(st_ov["pct"])

    institutional_attn_pct = round(sum(all_attendance_pcts) / len(all_attendance_pcts), 1) if all_attendance_pcts else None

    # Departments breakdown
    departments = db.query(Department).filter(Department.org_id == org_id).all()
    depts_summary = []
    for dept in departments:
        dept_student_count = db.query(User).filter(
            User.org_id == org_id,
            User.role == UserRole.STUDENT,
            User.department_id == dept.id,
            User.is_active == True
        ).count()
        dept_course_count = db.query(Course).filter(
            Course.org_id == org_id,
            Course.department_id == dept.id,
            Course.is_active == True
        ).count()
        depts_summary.append({
            "department_id": dept.id,
            "code": dept.code,
            "name": dept.name,
            "student_count": dept_student_count,
            "course_count": dept_course_count,
        })

    return {
        "total_students": total_students,
        "total_faculty": total_faculty,
        "total_courses": total_courses,
        "total_enrollments": total_enrollments,
        "total_certificates_issued": total_certs_issued,
        "institutional_attendance_pct": institutional_attn_pct,
        "departments": depts_summary,
    }
