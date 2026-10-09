import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole
from models.academic import Course
from utils.password import hash_password
from utils.jwt import create_access_token

client = TestClient(app)


def test_public_registration_student_cannot_become_faculty_without_key():
    """Requirement 1 Test: Student registration cannot elevate to faculty without invite key."""
    response = client.post(
        "/api/auth/register-public",
        json={
            "email": "hacker_student_test@edusphere.edu.in",
            "password": "password123",
            "name": "Hacker Student",
            "role": "FACULTY",
            "faculty_key": "WRONG-KEY"
        }
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]


def test_unauthenticated_certificate_download_returns_401():
    """Requirement 7 Test: Downloading PDF certificate without token returns 401."""
    response = client.get("/api/certificates/download-pdf/CERT-2026-TEST-9999.pdf")
    assert response.status_code == 401


def test_unauthenticated_upload_file_returns_401():
    """Requirement 7 Test: Downloading uploaded file without token returns 401."""
    response = client.get("/api/upload/files/test-file.pdf")
    assert response.status_code == 401


def test_student_cannot_delete_faculty_course():
    """Requirement 8 Test: Student cannot delete another faculty's course."""
    db = SessionLocal()
    try:
        # Create a faculty user
        faculty = db.query(User).filter(User.email == "faculty_test_cms@edusphere.edu.in").first()
        if not faculty:
            faculty = User(
                org_id="org-edusphere",
                email="faculty_test_cms@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Prof. CMS Test",
                role=UserRole.FACULTY,
            )
            db.add(faculty)
            db.commit()

        # Create a course owned by faculty
        course = db.query(Course).filter(Course.code == "CMS_TEST_101").first()
        if not course:
            course = Course(
                id="course-test-cms-101",
                org_id="org-edusphere",
                code="CMS_TEST_101",
                name="CMS Security Test Course",
                department_id="dept-cse",
                faculty_id=faculty.id
            )
            db.add(course)
            db.commit()

        # Create a student user
        student = db.query(User).filter(User.email == "student_test_cms@edusphere.edu.in").first()
        if not student:
            student = User(
                org_id="org-edusphere",
                email="student_test_cms@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Student CMS Test",
                role=UserRole.STUDENT,
            )
            db.add(student)
            db.commit()

        # Generate student access token
        student_token = create_access_token({"sub": student.id, "role": student.role.value, "email": student.email})

        # Student attempts to delete faculty's course
        res = client.delete(
            f"/api/cms/courses/{course.id}",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        assert res.status_code == 403
        assert "Forbidden" in res.json()["detail"]

    finally:
        db.close()


def test_auth_me_restores_session():
    """Requirement 5 Test: User can restore profile via /auth/me with valid access token."""
    db = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "student_test_cms@edusphere.edu.in").first()
        assert student is not None
        student_token = create_access_token({"sub": student.id, "role": student.role.value, "email": student.email})

        res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {student_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "student_test_cms@edusphere.edu.in"
        assert data["role"] == "STUDENT"
    finally:
        db.close()
