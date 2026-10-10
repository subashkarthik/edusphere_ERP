import uuid
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus
from models.exam import Quiz, QuizAttempt
from models.content import Assignment, Submission
from models.certificate import Certificate, CertificateStatus
from utils.password import hash_password
from utils.jwt import create_access_token

client = TestClient(app)


@pytest.fixture
def dashboard_test_data():
    db = SessionLocal()
    try:
        # 1. Ensure department
        dept = db.query(Department).filter(Department.id == "dept-dash-test").first()
        if not dept:
            dept = Department(id="dept-dash-test", org_id="org-edusphere", code="DASHDEPT", name="Dashboard Dept")
            db.add(dept)
            db.commit()

        # 2. Admin User
        admin = db.query(User).filter(User.email == "admin_dash_test@edusphere.edu.in").first()
        if not admin:
            admin = User(
                id="user-admin-dash-test",
                org_id="org-edusphere",
                email="admin_dash_test@edusphere.edu.in",
                password_hash=hash_password("adminpass123"),
                name="Admin Officer",
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()

        # 3. Faculty User
        faculty = db.query(User).filter(User.email == "faculty_dash_test@edusphere.edu.in").first()
        if not faculty:
            faculty = User(
                id="user-faculty-dash-test",
                org_id="org-edusphere",
                email="faculty_dash_test@edusphere.edu.in",
                password_hash=hash_password("facpass123"),
                name="Dr. Dashboard Prof",
                role=UserRole.FACULTY,
            )
            db.add(faculty)
            db.commit()

        # 4. Brand New Student (No courses, no attendance)
        new_student = db.query(User).filter(User.email == "new_student_dash@edusphere.edu.in").first()
        if not new_student:
            new_student = User(
                id="user-student-dash-new",
                org_id="org-edusphere",
                email="new_student_dash@edusphere.edu.in",
                password_hash=hash_password("pass123"),
                name="New Fresh Student",
                role=UserRole.STUDENT,
                enrollment_no="ED/2026/NEW01",
            )
            db.add(new_student)
            db.commit()

        # 5. Course for faculty
        course = db.query(Course).filter(Course.id == "course-dash-test").first()
        if not course:
            course = Course(
                id="course-dash-test",
                org_id="org-edusphere",
                code="DASH101",
                name="Real-time Systems Engineering",
                credits=4,
                department_id="dept-dash-test",
                faculty_id=faculty.id,
                is_active=True,
            )
            db.add(course)
            db.commit()

        # Clean all course sessions, quizzes, enrollments to guarantee fresh isolated state
        existing_sess = db.query(AttendanceSession).filter(AttendanceSession.course_id == course.id).all()
        if existing_sess:
            sess_ids = [s.id for s in existing_sess]
            db.query(AttendanceLog).filter(AttendanceLog.session_id.in_(sess_ids)).delete(synchronize_session=False)
            db.query(AttendanceSession).filter(AttendanceSession.course_id == course.id).delete(synchronize_session=False)

        existing_quizzes = db.query(Quiz).filter(Quiz.course_id == course.id).all()
        if existing_quizzes:
            q_ids = [q.id for q in existing_quizzes]
            db.query(QuizAttempt).filter(QuizAttempt.quiz_id.in_(q_ids)).delete(synchronize_session=False)
            db.query(Quiz).filter(Quiz.course_id == course.id).delete(synchronize_session=False)

        db.query(Enrollment).filter(Enrollment.course_id == course.id).delete(synchronize_session=False)
        db.query(Enrollment).filter(Enrollment.student_id == new_student.id).delete(synchronize_session=False)
        db.commit()

        admin_token = create_access_token({"sub": admin.id, "email": admin.email, "role": admin.role.value, "org_id": admin.org_id})
        faculty_token = create_access_token({"sub": faculty.id, "email": faculty.email, "role": faculty.role.value, "org_id": faculty.org_id})
        student_token = create_access_token({"sub": new_student.id, "email": new_student.email, "role": new_student.role.value, "org_id": new_student.org_id})

        return {
            "admin_id": admin.id,
            "faculty_id": faculty.id,
            "student_id": new_student.id,
            "course_id": course.id,
            "admin_token": admin_token,
            "faculty_token": faculty_token,
            "student_token": student_token,
        }
    finally:
        db.close()


def test_new_student_dashboard_shows_zeros(dashboard_test_data):
    """
    Test 1: create a new student with no data -> dashboard shows zeros, not fake numbers.
    """
    data = dashboard_test_data
    res = client.get(
        "/api/dashboard/student",
        headers={"Authorization": f"Bearer {data['student_token']}"}
    )
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["enrolled_courses_count"] == 0
    assert res_data["overall_attendance_pct"] == 0.0
    assert res_data["average_assessment_score"] == 0.0
    assert res_data["certificates_earned_count"] == 0
    assert res_data["courses"] == []
    assert res_data["upcoming_quizzes"] == []
    assert res_data["upcoming_assignments"] == []
    assert res_data["earned_certificates"] == []


def test_student_enroll_and_attend_dashboard_updates(dashboard_test_data):
    """
    Test 2: student self-enrolls, attends session, takes quiz -> numbers change after refresh.
    """
    data = dashboard_test_data
    db = SessionLocal()
    try:
        # Self-enroll student in course
        enroll_res = client.post(
            f"/api/courses/{data['course_id']}/self-enroll",
            headers={"Authorization": f"Bearer {data['student_token']}"}
        )
        assert enroll_res.status_code == 200

        # Create 1 attendance session and mark student present
        sess = AttendanceSession(
            id=str(uuid.uuid4()),
            org_id="org-edusphere",
            course_id=data["course_id"],
            faculty_id=data["faculty_id"],
            session_date=datetime.utcnow().date(),
        )
        db.add(sess)
        db.commit()

        log = AttendanceLog(
            id=str(uuid.uuid4()),
            session_id=sess.id,
            student_id=data["student_id"],
            status=AttendanceStatus.PRESENT,
            org_id="org-edusphere"
        )
        db.add(log)
        db.commit()

        # Create quiz and student attempt with 85% score
        quiz = Quiz(
            id=str(uuid.uuid4()),
            course_id=data["course_id"],
            title="Real-time Scheduling Quiz",
            total_marks=100,
            org_id="org-edusphere"
        )
        db.add(quiz)
        db.commit()

        att = QuizAttempt(
            id=str(uuid.uuid4()),
            quiz_id=quiz.id,
            student_id=data["student_id"],
            score=85.0,
            percentage=85.0,
            passed=True,
            org_id="org-edusphere"
        )
        db.add(att)
        db.commit()

        # Query student dashboard again
        res = client.get(
            "/api/dashboard/student",
            headers={"Authorization": f"Bearer {data['student_token']}"}
        )
        assert res.status_code == 200
        res_data = res.json()
        assert res_data["enrolled_courses_count"] == 1
        assert res_data["overall_attendance_pct"] == 100.0
        assert res_data["average_assessment_score"] == 85.0
        assert len(res_data["courses"]) == 1
        assert res_data["courses"][0]["attendance_pct"] == 100.0
        assert res_data["courses"][0]["assessment_pct"] == 85.0
    finally:
        db.close()


def test_faculty_dashboard_real_data(dashboard_test_data):
    """
    Test 3: faculty dashboard returns accurate taught courses, enrolled students, attendance rate.
    """
    data = dashboard_test_data
    db = SessionLocal()
    try:
        # Ensure enrollment exists for faculty course
        enr = db.query(Enrollment).filter(
            Enrollment.course_id == data["course_id"],
            Enrollment.student_id == data["student_id"]
        ).first()
        if not enr:
            enr = Enrollment(
                id=str(uuid.uuid4()),
                org_id="org-edusphere",
                student_id=data["student_id"],
                course_id=data["course_id"],
                status=EnrollmentStatus.ACTIVE
            )
            db.add(enr)
            db.commit()

        res = client.get(
            "/api/dashboard/faculty",
            headers={"Authorization": f"Bearer {data['faculty_token']}"}
        )
        assert res.status_code == 200
        res_data = res.json()
        assert res_data["my_courses_count"] >= 1
        assert res_data["total_students_count"] >= 1
        assert "pending_grading_count" in res_data
        assert "overall_attendance_pct" in res_data
        assert len(res_data["courses"]) >= 1
    finally:
        db.close()


def test_admin_dashboard_real_data(dashboard_test_data):
    """
    Test 4: admin dashboard returns real users breakdown by role, active courses, enrollments, certificates.
    """
    data = dashboard_test_data
    res = client.get(
        "/api/dashboard/admin",
        headers={"Authorization": f"Bearer {data['admin_token']}"}
    )
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["users"]["total"] >= 3
    assert res_data["users"]["students"] >= 1
    assert res_data["users"]["faculty"] >= 1
    assert res_data["users"]["admins"] >= 1
    assert res_data["courses"]["total"] >= 1
    assert "enrollments" in res_data
    assert "certificates" in res_data
    assert "attendance" in res_data
    assert "assessments" in res_data
