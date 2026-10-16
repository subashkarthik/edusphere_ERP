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
    assert res_data["overall_attendance_pct"] is None
    assert res_data["average_assessment_score"] is None
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
            is_results_published=True,
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
    assert "attendance_by_department" in res_data
    assert "courses_without_faculty" in res_data
    assert "students_without_enrollments" in res_data
    assert "recent_audit_events" in res_data
    assert "counts" in res_data
    assert res_data["counts"]["students"] >= 1
    assert res_data["counts"]["faculty"] >= 1


def test_student_at_risk_warning_and_recovery_formula(dashboard_test_data):
    """
    Test 5: When attendance is below policy minimum (75%), student dashboard
    flags course as at-risk and calculates consecutive recovery classes needed.
    """
    data = dashboard_test_data
    db = SessionLocal()
    try:
        # Create course where held=4, attended=1 (25% < 75%)
        risk_code = f"RSK{uuid.uuid4().hex[:6].upper()}"
        risk_course = Course(
            id=str(uuid.uuid4()),
            org_id="org-edusphere",
            code=risk_code,
            name="Advanced Control Systems",
            credits=3,
            department_id="dept-dash-test",
            faculty_id=data["faculty_id"],
            is_active=True,
        )
        db.add(risk_course)
        db.commit()

        # Enroll student
        enr = Enrollment(
            id=str(uuid.uuid4()),
            org_id="org-edusphere",
            student_id=data["student_id"],
            course_id=risk_course.id,
            status=EnrollmentStatus.ACTIVE
        )
        db.add(enr)
        db.commit()

        # 4 sessions: 1 present, 3 absent
        for i in range(4):
            sess = AttendanceSession(
                id=str(uuid.uuid4()),
                org_id="org-edusphere",
                course_id=risk_course.id,
                faculty_id=data["faculty_id"],
                session_date=datetime.utcnow().date(),
            )
            db.add(sess)
            db.commit()

            status = AttendanceStatus.PRESENT if i == 0 else AttendanceStatus.ABSENT
            log = AttendanceLog(
                id=str(uuid.uuid4()),
                session_id=sess.id,
                student_id=data["student_id"],
                status=status,
                org_id="org-edusphere"
            )
            db.add(log)
            db.commit()

        res = client.get(
            "/api/dashboard/student",
            headers={"Authorization": f"Bearer {data['student_token']}"}
        )
        assert res.status_code == 200
        res_data = res.json()
        assert len(res_data["at_risk_courses"]) >= 1
        risk_info = next(c for c in res_data["at_risk_courses"] if c["course_id"] == risk_course.id)
        assert risk_info["current_pct"] == 25.0
        assert risk_info["policy_min_pct"] == 75.0
        # Formula: ceil((75 * 4 - 100 * 1) / (100 - 75)) = ceil(200 / 25) = 8 consecutive classes
        assert risk_info["classes_needed_to_recover"] == 8
        assert "8 consecutive classes" in risk_info["formula_explanation"]
    finally:
        db.close()


def test_faculty_dashboard_today_sessions_and_students_below_75(dashboard_test_data):
    """
    Test 6: Faculty dashboard exposes today's sessions, students below 75%, and class averages.
    """
    data = dashboard_test_data
    res = client.get(
        "/api/dashboard/faculty",
        headers={"Authorization": f"Bearer {data['faculty_token']}"}
    )
    assert res.status_code == 200
    res_data = res.json()
    assert "today_sessions" in res_data
    assert "today_sessions_count" in res_data
    assert "students_below_75" in res_data
    assert "class_averages_per_assessment" in res_data


def test_new_student_empty_then_admin_enrolls_and_faculty_marks_attendance_updates_numbers(dashboard_test_data):
    """
    Test 7 (Specification):
    1. New student -> empty dashboard with zeros.
    2. Admin enrolls student in a course.
    3. Faculty marks attendance.
    4. Student refreshes -> numbers update after refresh.
    5. Faculty refreshes -> numbers update after refresh.
    6. Admin refreshes -> numbers update after refresh.
    """
    data = dashboard_test_data
    db = SessionLocal()
    try:
        # 1. Create a brand new student
        new_uid = str(uuid.uuid4())
        fresh_email = f"fresh_student_{new_uid[:6]}@edusphere.edu.in"
        fresh_student = User(
            id=new_uid,
            org_id="org-edusphere",
            email=fresh_email,
            password_hash=hash_password("freshpass123"),
            name="Fresh Test Student",
            role=UserRole.STUDENT,
            enrollment_no=f"ED/NEW/{new_uid[:6].upper()}",
            is_active=True,
        )
        db.add(fresh_student)
        db.commit()

        fresh_token = create_access_token({
            "sub": fresh_student.id,
            "email": fresh_student.email,
            "role": fresh_student.role.value,
            "org_id": fresh_student.org_id
        })

        # Step 1: Check fresh student dashboard -> ALL ZEROS, EMPTY
        student_res_before = client.get(
            "/api/dashboard/student",
            headers={"Authorization": f"Bearer {fresh_token}"}
        )
        assert student_res_before.status_code == 200
        before_data = student_res_before.json()
        assert before_data["enrolled_courses_count"] == 0
        assert before_data["courses"] == []
        assert before_data["overall_attendance_pct"] is None
        assert before_data["average_assessment_score"] is None
        assert before_data["certificates_earned_count"] == 0
        assert before_data["at_risk_courses"] == []

        # Step 2: Admin enrolls the student into course
        enrollment = Enrollment(
            id=str(uuid.uuid4()),
            org_id="org-edusphere",
            student_id=fresh_student.id,
            course_id=data["course_id"],
            status=EnrollmentStatus.ACTIVE
        )
        db.add(enrollment)
        db.commit()

        # Step 3: Faculty marks attendance (creates today's session + logs PRESENT)
        sess = AttendanceSession(
            id=str(uuid.uuid4()),
            org_id="org-edusphere",
            course_id=data["course_id"],
            faculty_id=data["faculty_id"],
            session_date=datetime.utcnow().date(),
            period="Period 1",
            topic="Core Architecture"
        )
        db.add(sess)
        db.commit()

        attn_log = AttendanceLog(
            id=str(uuid.uuid4()),
            session_id=sess.id,
            student_id=fresh_student.id,
            status=AttendanceStatus.PRESENT,
            org_id="org-edusphere"
        )
        db.add(attn_log)
        db.commit()

        # Step 4: Student refreshes dashboard -> numbers update
        student_res_after = client.get(
            "/api/dashboard/student",
            headers={"Authorization": f"Bearer {fresh_token}"}
        )
        assert student_res_after.status_code == 200
        after_data = student_res_after.json()
        assert after_data["enrolled_courses_count"] == 1
        assert len(after_data["courses"]) == 1
        assert after_data["courses"][0]["id"] == data["course_id"]
        assert after_data["courses"][0]["attendance_pct"] == 100.0
        assert after_data["courses"][0]["attended"] == 1
        assert after_data["courses"][0]["held"] == 1
        assert after_data["overall_attendance_pct"] == 100.0
        assert after_data["courses"][0]["is_at_risk"] is False

        # Step 5: Faculty refreshes dashboard -> numbers update
        faculty_res = client.get(
            "/api/dashboard/faculty",
            headers={"Authorization": f"Bearer {data['faculty_token']}"}
        )
        assert faculty_res.status_code == 200
        fac_data = faculty_res.json()
        assert fac_data["today_sessions_count"] >= 1
        assert fac_data["total_students_count"] >= 1

        # Step 6: Admin refreshes dashboard -> numbers update
        admin_res = client.get(
            "/api/dashboard/admin",
            headers={"Authorization": f"Bearer {data['admin_token']}"}
        )
        assert admin_res.status_code == 200
        adm_data = admin_res.json()
        assert adm_data["counts"]["enrollments"] >= 1
        assert adm_data["attendance"]["total_sessions"] >= 1
        # Fresh student is now enrolled, so not in students_without_enrollments
        unenrolled_ids = [s["id"] for s in adm_data["students_without_enrollments"]]
        assert fresh_student.id not in unenrolled_ids
    finally:
        db.close()


