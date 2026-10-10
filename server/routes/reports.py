import io
import csv
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database import get_db
from models.user import User, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus
from models.exam import Quiz, QuizAttempt
from models.content import Assignment, Submission, AssignmentStatus
from models.certificate import Certificate, CertificateStatus
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def verify_course_access(course: Course, user: User):
    """Ensure faculty can only access reports for their own courses; admin has full access."""
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.FACULTY:
        if course.faculty_id != user.id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You can only export reports for your own courses."
            )
        return
    raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges.")


@router.get("/attendance.csv")
def export_attendance_csv(
    course_id: Optional[str] = Query(None, description="Optional Course ID filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export course-wise attendance ledger in CSV format for Excel/Sheets.
    Faculty limited to own courses; Admin can export all or specific courses.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.FACULTY]:
        raise HTTPException(status_code=403, detail="Forbidden: Admin or Faculty access required.")

    courses_query = db.query(Course).filter(Course.org_id == current_user.org_id)
    if course_id:
        course = db.query(Course).filter(Course.id == course_id, Course.org_id == current_user.org_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        verify_course_access(course, current_user)
        target_courses = [course]
    else:
        if current_user.role == UserRole.FACULTY:
            target_courses = courses_query.filter(Course.faculty_id == current_user.id).all()
        else:
            target_courses = courses_query.all()

    output = io.StringIO()
    writer = csv.writer(output)

    # CSV Header
    writer.writerow([
        "Student ID",
        "Roll No",
        "Student Name",
        "Student Email",
        "Course Code",
        "Course Name",
        "Classes Attended",
        "Classes Held",
        "Attendance Percentage",
        "Attendance Status"
    ])

    for crs in target_courses:
        # Total sessions for this course
        total_sessions = db.query(AttendanceSession).filter(
            AttendanceSession.course_id == crs.id,
            AttendanceSession.org_id == current_user.org_id
        ).count()

        # Enrolled students
        enrollments = db.query(Enrollment).filter(
            Enrollment.course_id == crs.id,
            Enrollment.status == EnrollmentStatus.ACTIVE
        ).all()

        for enr in enrollments:
            student = db.query(User).filter(User.id == enr.student_id).first()
            if not student:
                continue

            attended = db.query(AttendanceLog).join(AttendanceSession).filter(
                AttendanceSession.course_id == crs.id,
                AttendanceLog.student_id == student.id,
                AttendanceLog.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE])
            ).count()

            pct = round((attended / total_sessions * 100), 1) if total_sessions > 0 else 100.0
            status = "NORMAL" if pct >= 75.0 else "WARNING (< 75%)"

            writer.writerow([
                student.id,
                student.enrollment_no or "N/A",
                student.name,
                student.email,
                crs.code,
                crs.name,
                attended,
                total_sessions,
                f"{pct}%",
                status
            ])

    filename = f"attendance_report_{crs.code if course_id and target_courses else 'all'}_{date.today().isoformat()}.csv"
    csv_data = output.getvalue()
    output.close()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )


@router.get("/marks.csv")
def export_marks_csv(
    course_id: Optional[str] = Query(None, description="Optional Course ID filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export marks and assessment records (Quizzes + Graded Assignments) in CSV format.
    Faculty limited to own courses; Admin can export all or specific courses.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.FACULTY]:
        raise HTTPException(status_code=403, detail="Forbidden: Admin or Faculty access required.")

    courses_query = db.query(Course).filter(Course.org_id == current_user.org_id)
    if course_id:
        course = db.query(Course).filter(Course.id == course_id, Course.org_id == current_user.org_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        verify_course_access(course, current_user)
        target_courses = [course]
    else:
        if current_user.role == UserRole.FACULTY:
            target_courses = courses_query.filter(Course.faculty_id == current_user.id).all()
        else:
            target_courses = courses_query.all()

    output = io.StringIO()
    writer = csv.writer(output)

    # CSV Header
    writer.writerow([
        "Student ID",
        "Roll No",
        "Student Name",
        "Student Email",
        "Course Code",
        "Course Name",
        "Assessment Type",
        "Assessment Title",
        "Score Obtained",
        "Max Score",
        "Percentage",
        "Result Status",
        "Date Recorded"
    ])

    for crs in target_courses:
        # 1. Quizzes in this course
        quizzes = db.query(Quiz).filter(Quiz.course_id == crs.id).all()
        for q in quizzes:
            attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q.id).all()
            for att in attempts:
                student = db.query(User).filter(User.id == att.student_id).first()
                if not student:
                    continue
                writer.writerow([
                    student.id,
                    student.enrollment_no or "N/A",
                    student.name,
                    student.email,
                    crs.code,
                    crs.name,
                    "QUIZ",
                    q.title,
                    att.score,
                    q.total_marks,
                    f"{att.percentage:.1f}%",
                    "PASSED" if att.passed else "FAILED",
                    att.completed_at.strftime("%Y-%m-%d %H:%M") if att.completed_at else "N/A"
                ])

        # 2. Assignments in this course
        assignments = db.query(Assignment).filter(Assignment.course_id == crs.id).all()
        for a in assignments:
            submissions = db.query(Submission).filter(
                Submission.assignment_id == a.id,
                Submission.status == AssignmentStatus.GRADED
            ).all()
            for sub in submissions:
                student = db.query(User).filter(User.id == sub.student_id).first()
                if not student:
                    continue
                marks = sub.marks_obtained or 0.0
                pct = round((marks / a.max_marks * 100), 1) if a.max_marks > 0 else 0.0
                passed = pct >= 50.0
                writer.writerow([
                    student.id,
                    student.enrollment_no or "N/A",
                    student.name,
                    student.email,
                    crs.code,
                    crs.name,
                    "ASSIGNMENT",
                    a.title,
                    marks,
                    a.max_marks,
                    f"{pct}%",
                    "PASSED" if passed else "FAILED",
                    sub.submitted_at.strftime("%Y-%m-%d %H:%M") if sub.submitted_at else "N/A"
                ])

    filename = f"marks_report_{crs.code if course_id and target_courses else 'all'}_{date.today().isoformat()}.csv"
    csv_data = output.getvalue()
    output.close()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )


@router.get("/certificates.csv")
def export_certificates_csv(
    course_id: Optional[str] = Query(None, description="Optional Course ID filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export issued and evaluated credentials in CSV format.
    Faculty limited to certificates in their own courses; Admin can export all.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.FACULTY]:
        raise HTTPException(status_code=403, detail="Forbidden: Admin or Faculty access required.")

    query = db.query(Certificate).filter(Certificate.org_id == current_user.org_id)
    if course_id:
        course = db.query(Course).filter(Course.id == course_id, Course.org_id == current_user.org_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found.")
        verify_course_access(course, current_user)
        query = query.filter(Certificate.course_id == course_id)
    elif current_user.role == UserRole.FACULTY:
        faculty_course_ids = [c.id for c in db.query(Course.id).filter(Course.faculty_id == current_user.id).all()]
        query = query.filter(Certificate.course_id.in_(faculty_course_ids))

    certificates = query.order_by(Certificate.issued_date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # CSV Header
    writer.writerow([
        "Certificate Code",
        "Student Name",
        "Roll No",
        "Student Email",
        "Course Code",
        "Course Name",
        "Attendance %",
        "Assessment %",
        "Course Progress %",
        "Status",
        "Issue Date"
    ])

    for cert in certificates:
        student = db.query(User).filter(User.id == cert.user_id).first()
        course = db.query(Course).filter(Course.id == cert.course_id).first()
        writer.writerow([
            cert.certificate_code,
            student.name if student else "N/A",
            (student.enrollment_no if student else None) or "N/A",
            student.email if student else "N/A",
            course.code if course else "N/A",
            course.name if course else "N/A",
            f"{cert.attendance_pct:.1f}%",
            f"{cert.assessment_pct:.1f}%",
            f"{cert.progress_pct:.1f}%",
            cert.eligibility_status.value,
            cert.issued_date.strftime("%Y-%m-%d") if cert.issued_date else "N/A"
        ])

    filename = f"certificates_report_{date.today().isoformat()}.csv"
    csv_data = output.getvalue()
    output.close()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )


@router.get("/admin/summary")
def get_admin_reports_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aggregated course-wise summary metrics for the Admin Reports view:
    Enrollment count, Average Attendance, Average Score, Certificates Issued count.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")

    courses = db.query(Course).filter(Course.org_id == current_user.org_id).all()
    results = []

    total_enrollments = 0
    total_certificates = 0
    attn_sum = 0.0
    attn_count = 0

    for crs in courses:
        # 1. Enrollments
        enrolled_count = db.query(Enrollment).filter(
            Enrollment.course_id == crs.id,
            Enrollment.status == EnrollmentStatus.ACTIVE
        ).count()
        total_enrollments += enrolled_count

        # 2. Average Attendance %
        total_sessions = db.query(AttendanceSession).filter(
            AttendanceSession.course_id == crs.id,
            AttendanceSession.org_id == current_user.org_id
        ).count()

        if total_sessions > 0 and enrolled_count > 0:
            total_possible_logs = total_sessions * enrolled_count
            actual_attended = db.query(AttendanceLog).join(AttendanceSession).filter(
                AttendanceSession.course_id == crs.id,
                AttendanceLog.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE])
            ).count()
            avg_attendance = round((actual_attended / total_possible_logs * 100), 1)
        else:
            avg_attendance = 100.0

        attn_sum += avg_attendance
        attn_count += 1

        # 3. Average Assessment % (Quizzes + Graded Assignments)
        quiz_percentages = [
            att.percentage for att in db.query(QuizAttempt.percentage).join(Quiz).filter(Quiz.course_id == crs.id).all()
        ]
        sub_percentages = []
        for sub, max_m in db.query(Submission.marks_obtained, Assignment.max_marks).join(Assignment).filter(
            Assignment.course_id == crs.id,
            Submission.status == AssignmentStatus.GRADED
        ).all():
            if max_m and max_m > 0 and sub is not None:
                sub_percentages.append((sub / max_m) * 100)

        all_scores = quiz_percentages + sub_percentages
        avg_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

        # 4. Certificates Issued
        certs_issued = db.query(Certificate).filter(
            Certificate.course_id == crs.id,
            Certificate.eligibility_status == CertificateStatus.ISSUED
        ).count()
        total_certificates += certs_issued

        faculty = db.query(User).filter(User.id == crs.faculty_id).first()

        results.append({
            "course_id": crs.id,
            "course_code": crs.code,
            "course_name": crs.name,
            "faculty_name": faculty.name if faculty else "Unassigned",
            "enrollment_count": enrolled_count,
            "average_attendance": avg_attendance,
            "average_score": avg_score,
            "certificates_issued": certs_issued
        })

    overall_attendance = round(attn_sum / attn_count, 1) if attn_count > 0 else 100.0

    return {
        "summary": {
            "total_courses": len(courses),
            "total_enrollments": total_enrollments,
            "total_certificates": total_certificates,
            "overall_attendance_rate": overall_attendance
        },
        "courses": results
    }
