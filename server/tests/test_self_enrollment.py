import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from utils.password import hash_password
from utils.jwt import create_access_token

client = TestClient(app)


@pytest.fixture
def test_data():
    db = SessionLocal()
    try:
        # Create student user
        student = db.query(User).filter(User.email == "student_enroll_test@edusphere.edu.in").first()
        if not student:
            student = User(
                id="user-student-enroll-test",
                org_id="org-edusphere",
                email="student_enroll_test@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Enroll Test Student",
                role=UserRole.STUDENT,
                enrollment_no="TEST/2026/001",
            )
            db.add(student)
            db.commit()

        # Create faculty teaching user
        faculty_teacher = db.query(User).filter(User.email == "faculty_teacher_test@edusphere.edu.in").first()
        if not faculty_teacher:
            faculty_teacher = User(
                id="user-faculty-teacher-test",
                org_id="org-edusphere",
                email="faculty_teacher_test@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Teacher Faculty",
                role=UserRole.FACULTY,
            )
            db.add(faculty_teacher)
            db.commit()

        # Create faculty other user
        faculty_other = db.query(User).filter(User.email == "faculty_other_test@edusphere.edu.in").first()
        if not faculty_other:
            faculty_other = User(
                id="user-faculty-other-test",
                org_id="org-edusphere",
                email="faculty_other_test@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Other Faculty",
                role=UserRole.FACULTY,
            )
            db.add(faculty_other)
            db.commit()

        # Create admin user
        admin = db.query(User).filter(User.email == "admin_enroll_test@edusphere.edu.in").first()
        if not admin:
            admin = User(
                id="user-admin-enroll-test",
                org_id="org-edusphere",
                email="admin_enroll_test@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Admin Test",
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()

        # Create active course
        active_course = db.query(Course).filter(Course.code == "SELF_ENROLL_101").first()
        if not active_course:
            active_course = Course(
                id="course-self-enroll-101",
                org_id="org-edusphere",
                code="SELF_ENROLL_101",
                name="Self Enrollment Test Course",
                department_id="dept-cse",
                faculty_id=faculty_teacher.id,
                is_active=True,
            )
            db.add(active_course)
            db.commit()

        # Create inactive course
        inactive_course = db.query(Course).filter(Course.code == "INACTIVE_101").first()
        if not inactive_course:
            inactive_course = Course(
                id="course-inactive-101",
                org_id="org-edusphere",
                code="INACTIVE_101",
                name="Inactive Test Course",
                department_id="dept-cse",
                faculty_id=faculty_teacher.id,
                is_active=False,
            )
            db.add(inactive_course)
            db.commit()

        # Clean any prior test enrollment for student in active_course
        db.query(Enrollment).filter(
            Enrollment.student_id == student.id,
            Enrollment.course_id == active_course.id
        ).delete()
        db.commit()

        yield {
            "student": student,
            "faculty_teacher": faculty_teacher,
            "faculty_other": faculty_other,
            "admin": admin,
            "active_course": active_course,
            "inactive_course": inactive_course,
        }
    finally:
        db.close()


def test_student_self_enrollment_success_and_idempotency(test_data):
    """Test 1: Student can self-enroll, idempotent, uses EnrollmentStatus.ACTIVE."""
    student = test_data["student"]
    course = test_data["active_course"]

    token = create_access_token({"sub": student.id, "role": student.role.value, "email": student.email})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. First self-enroll
    res = client.post(f"/api/courses/{course.id}/self-enroll", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "Successfully enrolled" in data["message"]
    assert data["status"] == "ACTIVE"

    # Verify in DB
    db = SessionLocal()
    enr = db.query(Enrollment).filter(
        Enrollment.student_id == student.id,
        Enrollment.course_id == course.id
    ).first()
    assert enr is not None
    assert enr.status == EnrollmentStatus.ACTIVE
    db.close()

    # 2. Idempotent second self-enroll
    res2 = client.post(f"/api/courses/{course.id}/self-enroll", headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert "Already enrolled" in data2["message"]
    assert data2["status"] == "ACTIVE"
    assert data2["enrollment_id"] == data["enrollment_id"]


def test_self_enroll_inactive_or_nonexistent_returns_404(test_data):
    """Test 2: Self-enroll in inactive or nonexistent course returns 404."""
    student = test_data["student"]
    inactive_course = test_data["inactive_course"]

    token = create_access_token({"sub": student.id, "role": student.role.value, "email": student.email})
    headers = {"Authorization": f"Bearer {token}"}

    # Inactive course -> 404
    res_inactive = client.post(f"/api/courses/{inactive_course.id}/self-enroll", headers=headers)
    assert res_inactive.status_code == 404
    assert "inactive" in res_inactive.json()["detail"].lower()

    # Nonexistent course -> 404
    res_fake = client.post("/api/courses/fake-course-id-9999/self-enroll", headers=headers)
    assert res_fake.status_code == 404


def test_self_enroll_role_check(test_data):
    """Test 3: Non-student roles receive 403 Forbidden."""
    faculty = test_data["faculty_teacher"]
    course = test_data["active_course"]

    token = create_access_token({"sub": faculty.id, "role": faculty.role.value, "email": faculty.email})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(f"/api/courses/{course.id}/self-enroll", headers=headers)
    assert res.status_code == 403
    assert "Only students" in res.json()["detail"]


def test_my_enrollments_and_my_courses_appearance(test_data):
    """Test 4: GET /api/courses/my-enrollments returns enrolled course."""
    student = test_data["student"]
    course = test_data["active_course"]

    token = create_access_token({"sub": student.id, "role": student.role.value, "email": student.email})
    headers = {"Authorization": f"Bearer {token}"}

    # Enroll
    client.post(f"/api/courses/{course.id}/self-enroll", headers=headers)

    # Check GET /api/courses/my-enrollments
    res = client.get("/api/courses/my-enrollments", headers=headers)
    assert res.status_code == 200
    enrollments = res.json()
    course_ids = [e["course_id"] for e in enrollments]
    assert course.id in course_ids

    # Check GET /api/courses/ (My Courses listing for student)
    res_courses = client.get("/api/courses/", headers=headers)
    assert res_courses.status_code == 200
    courses_data = res_courses.json()
    my_course_ids = [c["id"] for c in courses_data]
    assert course.id in my_course_ids


def test_faculty_and_admin_view_enrolled_students(test_data):
    """Test 5: Faculty/Admin can view enrolled students list for course."""
    student = test_data["student"]
    faculty_teacher = test_data["faculty_teacher"]
    faculty_other = test_data["faculty_other"]
    admin = test_data["admin"]
    course = test_data["active_course"]

    # Student enrolls
    student_token = create_access_token({"sub": student.id, "role": student.role.value, "email": student.email})
    client.post(f"/api/courses/{course.id}/self-enroll", headers={"Authorization": f"Bearer {student_token}"})

    # Admin checks students roster
    admin_token = create_access_token({"sub": admin.id, "role": admin.role.value, "email": admin.email})
    res_admin = client.get(f"/api/courses/{course.id}/students", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    roster_admin = res_admin.json()
    assert roster_admin["total_enrolled"] >= 1
    assert any(s["student_id"] == student.id for s in roster_admin["students"])

    # Faculty teaching the course checks students roster
    teacher_token = create_access_token({"sub": faculty_teacher.id, "role": faculty_teacher.role.value, "email": faculty_teacher.email})
    res_teacher = client.get(f"/api/courses/{course.id}/students", headers={"Authorization": f"Bearer {teacher_token}"})
    assert res_teacher.status_code == 200
    roster_teacher = res_teacher.json()
    assert any(s["student_id"] == student.id for s in roster_teacher["students"])

    # Other faculty (not teaching course) gets 403
    other_token = create_access_token({"sub": faculty_other.id, "role": faculty_other.role.value, "email": faculty_other.email})
    res_other = client.get(f"/api/courses/{course.id}/students", headers={"Authorization": f"Bearer {other_token}"})
    assert res_other.status_code == 403

    # Student gets 403
    res_student = client.get(f"/api/courses/{course.id}/students", headers={"Authorization": f"Bearer {student_token}"})
    assert res_student.status_code == 403
