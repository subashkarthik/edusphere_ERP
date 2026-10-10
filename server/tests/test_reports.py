import io
import csv
import uuid
import pytest
from datetime import datetime, date
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus
from models.exam import Quiz, QuizAttempt
from models.content import Assignment, Submission, AssignmentStatus
from models.certificate import Certificate, CertificateStatus
from utils.password import hash_password
from utils.jwt import create_access_token

client = TestClient(app)


@pytest.fixture
def reports_fixture():
    db = SessionLocal()
    try:
        # 1. Dept
        dept = db.query(Department).filter(Department.id == "dept-rep-test").first()
        if not dept:
            dept = Department(id="dept-rep-test", org_id="org-edusphere", code="REPDEPT", name="Reports Dept")
            db.add(dept)
            db.commit()

        # 2. Admin
        admin = db.query(User).filter(User.email == "admin_rep_test@edusphere.edu.in").first()
        if not admin:
            admin = User(
                id="user-admin-rep-test",
                org_id="org-edusphere",
                email="admin_rep_test@edusphere.edu.in",
                password_hash=hash_password("adminpass123"),
                name="Admin Reporter",
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()

        # 3. Faculty 1
        faculty1 = db.query(User).filter(User.email == "faculty1_rep_test@edusphere.edu.in").first()
        if not faculty1:
            faculty1 = User(
                id="user-faculty1-rep-test",
                org_id="org-edusphere",
                email="faculty1_rep_test@edusphere.edu.in",
                password_hash=hash_password("facpass123"),
                name="Prof Alpha",
                role=UserRole.FACULTY,
            )
            db.add(faculty1)
            db.commit()

        # 4. Faculty 2
        faculty2 = db.query(User).filter(User.email == "faculty2_rep_test@edusphere.edu.in").first()
        if not faculty2:
            faculty2 = User(
                id="user-faculty2-rep-test",
                org_id="org-edusphere",
                email="faculty2_rep_test@edusphere.edu.in",
                password_hash=hash_password("facpass123"),
                name="Prof Beta",
                role=UserRole.FACULTY,
            )
            db.add(faculty2)
            db.commit()

        # 5. Student
        student = db.query(User).filter(User.email == "student_rep_test@edusphere.edu.in").first()
        if not student:
            student = User(
                id="user-student-rep-test",
                org_id="org-edusphere",
                email="student_rep_test@edusphere.edu.in",
                password_hash=hash_password("stupass123"),
                name="Report Test Student",
                enrollment_no="REP-2026-001",
                role=UserRole.STUDENT,
            )
            db.add(student)
            db.commit()

        # 6. Course 1 (Faculty 1)
        course1 = db.query(Course).filter(Course.id == "course-rep-1").first()
        if not course1:
            course1 = Course(
                id="course-rep-1",
                org_id="org-edusphere",
                department_id=dept.id,
                faculty_id=faculty1.id,
                code="REP101",
                name="Report Analytics 101",
                credits=4,
                is_active=True
            )
            db.add(course1)
            db.commit()

        # 7. Course 2 (Faculty 2)
        course2 = db.query(Course).filter(Course.id == "course-rep-2").first()
        if not course2:
            course2 = Course(
                id="course-rep-2",
                org_id="org-edusphere",
                department_id=dept.id,
                faculty_id=faculty2.id,
                code="REP202",
                name="Report Governance 202",
                credits=4,
                is_active=True
            )
            db.add(course2)
            db.commit()

        # 8. Enrollment of student in Course 1
        enr = db.query(Enrollment).filter(
            Enrollment.student_id == student.id,
            Enrollment.course_id == course1.id
        ).first()
        if not enr:
            enr = Enrollment(
                id="enr-rep-1",
                org_id="org-edusphere",
                student_id=student.id,
                course_id=course1.id,
                status=EnrollmentStatus.ACTIVE,
                enrolled_at=datetime.utcnow()
            )
            db.add(enr)
            db.commit()

        # 9. Attendance Session & Log
        sess = db.query(AttendanceSession).filter(AttendanceSession.course_id == course1.id).first()
        if not sess:
            from models.attendance import SessionStatus
            sess = AttendanceSession(
                id="sess-rep-1",
                org_id="org-edusphere",
                course_id=course1.id,
                faculty_id=faculty1.id,
                session_date=date.today(),
                status=SessionStatus.CLOSED
            )
            db.add(sess)
            db.commit()

            log = AttendanceLog(
                id="log-rep-1",
                session_id=sess.id,
                student_id=student.id,
                status=AttendanceStatus.PRESENT
            )
            db.add(log)
            db.commit()

        # 10. Quiz and Attempt
        quiz = db.query(Quiz).filter(Quiz.course_id == course1.id).first()
        if not quiz:
            quiz = Quiz(
                id="quiz-rep-1",
                org_id="org-edusphere",
                course_id=course1.id,
                title="Unit 1 Quiz",
                time_limit_minutes=15,
                passing_percentage=60,
                total_marks=20,
                created_by=faculty1.id
            )
            db.add(quiz)
            db.commit()

            att = QuizAttempt(
                id="att-rep-1",
                quiz_id=quiz.id,
                student_id=student.id,
                score=18.0,
                percentage=90.0,
                passed=True,
                tab_switch_violations=0,
                completed_at=datetime.utcnow()
            )
            db.add(att)
            db.commit()

        # 11. Certificate
        cert = db.query(Certificate).filter(Certificate.course_id == course1.id).first()
        if not cert:
            cert = Certificate(
                id="cert-rep-1",
                org_id="org-edusphere",
                user_id=student.id,
                course_id=course1.id,
                certificate_code="EDU-2026-REP12345",
                attendance_pct=100.0,
                assessment_pct=90.0,
                progress_pct=100.0,
                eligibility_status=CertificateStatus.ISSUED,
                issued_date=datetime.utcnow()
            )
            db.add(cert)
            db.commit()

        # Tokens
        admin_token = create_access_token({"sub": admin.id, "email": admin.email, "role": admin.role.value, "org_id": admin.org_id})
        fac1_token = create_access_token({"sub": faculty1.id, "email": faculty1.email, "role": faculty1.role.value, "org_id": faculty1.org_id})
        fac2_token = create_access_token({"sub": faculty2.id, "email": faculty2.email, "role": faculty2.role.value, "org_id": faculty2.org_id})
        stu_token = create_access_token({"sub": student.id, "email": student.email, "role": student.role.value, "org_id": student.org_id})

        return {
            "admin_token": admin_token,
            "fac1_token": fac1_token,
            "fac2_token": fac2_token,
            "stu_token": stu_token,
            "course1_id": course1.id,
            "course2_id": course2.id,
            "student_id": student.id,
        }
    finally:
        db.close()


def test_unauthenticated_reports_rejected(reports_fixture):
    """Unauthenticated requests must be rejected."""
    res1 = client.get("/api/reports/attendance.csv")
    assert res1.status_code in [401, 403]

    res2 = client.get("/api/reports/marks.csv")
    assert res2.status_code in [401, 403]

    res3 = client.get("/api/reports/certificates.csv")
    assert res3.status_code in [401, 403]

    res4 = client.get("/api/reports/admin/summary")
    assert res4.status_code in [401, 403]

    # Invalid token must yield 401 Unauthorized
    invalid_headers = {"Authorization": "Bearer invalid.token.value"}
    res_inv = client.get("/api/reports/attendance.csv", headers=invalid_headers)
    assert res_inv.status_code == 401


def test_student_reports_forbidden(reports_fixture):
    """Students must NOT be able to export reports (403 Forbidden)."""
    headers = {"Authorization": f"Bearer {reports_fixture['stu_token']}"}

    res1 = client.get("/api/reports/attendance.csv", headers=headers)
    assert res1.status_code == 403

    res2 = client.get("/api/reports/marks.csv", headers=headers)
    assert res2.status_code == 403

    res3 = client.get("/api/reports/certificates.csv", headers=headers)
    assert res3.status_code == 403

    res4 = client.get("/api/reports/admin/summary", headers=headers)
    assert res4.status_code == 403


def test_faculty_export_own_course_attendance(reports_fixture):
    """Faculty can export attendance CSV for their own course with proper columns."""
    headers = {"Authorization": f"Bearer {reports_fixture['fac1_token']}"}
    res = client.get(f"/api/reports/attendance.csv?course_id={reports_fixture['course1_id']}", headers=headers)
    
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attendance_report" in res.headers["content-disposition"]

    content = res.text
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    
    # Verify header columns
    header = rows[0]
    expected_cols = [
        "Student ID", "Roll No", "Student Name", "Student Email", 
        "Course Code", "Course Name", "Classes Attended", 
        "Classes Held", "Attendance Percentage", "Attendance Status"
    ]
    for col in expected_cols:
        assert col in header

    # Verify data row
    assert len(rows) >= 2
    student_row = next(r for r in rows[1:] if r[0] == reports_fixture["student_id"])
    assert student_row[4] == "REP101"
    assert student_row[8] == "100.0%"


def test_faculty_cannot_export_another_faculty_course(reports_fixture):
    """Faculty attempting to export another faculty's course receives 403 Forbidden."""
    headers = {"Authorization": f"Bearer {reports_fixture['fac1_token']}"}
    
    # Faculty 1 trying to access Faculty 2's course (course2_id)
    res_attn = client.get(f"/api/reports/attendance.csv?course_id={reports_fixture['course2_id']}", headers=headers)
    assert res_attn.status_code == 403
    assert "Forbidden" in res_attn.json()["detail"]

    res_marks = client.get(f"/api/reports/marks.csv?course_id={reports_fixture['course2_id']}", headers=headers)
    assert res_marks.status_code == 403

    res_cert = client.get(f"/api/reports/certificates.csv?course_id={reports_fixture['course2_id']}", headers=headers)
    assert res_cert.status_code == 403


def test_faculty_export_marks_csv(reports_fixture):
    """Faculty can export marks CSV containing quiz and assignment scores."""
    headers = {"Authorization": f"Bearer {reports_fixture['fac1_token']}"}
    res = client.get(f"/api/reports/marks.csv?course_id={reports_fixture['course1_id']}", headers=headers)

    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]

    reader = csv.reader(io.StringIO(res.text))
    rows = list(reader)
    header = rows[0]

    expected_cols = [
        "Student ID", "Roll No", "Student Name", "Student Email",
        "Course Code", "Course Name", "Assessment Type", "Assessment Title",
        "Score Obtained", "Max Score", "Percentage", "Result Status", "Date Recorded"
    ]
    for col in expected_cols:
        assert col in header

    assert len(rows) >= 2
    data_row = rows[1]
    assert data_row[4] == "REP101"
    assert data_row[6] == "QUIZ"
    assert "18" in data_row[8]


def test_admin_export_certificates_csv(reports_fixture):
    """Admin can export all certificates across courses with correct columns."""
    headers = {"Authorization": f"Bearer {reports_fixture['admin_token']}"}
    res = client.get("/api/reports/certificates.csv", headers=headers)

    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]

    reader = csv.reader(io.StringIO(res.text))
    rows = list(reader)
    header = rows[0]

    expected_cols = [
        "Certificate Code", "Student Name", "Roll No", "Student Email",
        "Course Code", "Course Name", "Attendance %", "Assessment %",
        "Course Progress %", "Status", "Issue Date"
    ]
    for col in expected_cols:
        assert col in header

    cert_row = next(r for r in rows[1:] if "EDU-2026-REP12345" in r[0])
    assert cert_row[4] == "REP101"
    assert cert_row[9] == "ISSUED"


def test_admin_reports_summary_aggregation(reports_fixture):
    """Admin summary returns aggregated metrics for each course from DB."""
    headers = {"Authorization": f"Bearer {reports_fixture['admin_token']}"}
    res = client.get("/api/reports/admin/summary", headers=headers)

    assert res.status_code == 200
    data = res.json()

    assert "summary" in data
    assert "courses" in data
    assert data["summary"]["total_courses"] >= 2
    assert data["summary"]["total_enrollments"] >= 1

    # Check that REP101 course is present with computed stats
    rep101 = next(c for c in data["courses"] if c["course_code"] == "REP101")
    assert rep101["faculty_name"] == "Prof Alpha"
    assert rep101["enrollment_count"] >= 1
    assert rep101["average_attendance"] == 100.0
    assert rep101["average_score"] == 90.0
    assert rep101["certificates_issued"] >= 1
