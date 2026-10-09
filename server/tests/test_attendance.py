import uuid
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from utils.password import hash_password
from utils.jwt import create_access_token

client = TestClient(app)


@pytest.fixture
def test_data():
    db = SessionLocal()
    try:
        # Create faculty
        faculty = db.query(User).filter(User.email == "faculty_att_test@edusphere.edu.in").first()
        if not faculty:
            faculty = User(
                id="user-faculty-att-test",
                org_id="org-edusphere",
                email="faculty_att_test@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Prof. Attendance",
                role=UserRole.FACULTY,
            )
            db.add(faculty)
            db.commit()

        # Create 3 students
        students = []
        for i in range(1, 4):
            email = f"student_att_{i}@edusphere.edu.in"
            st = db.query(User).filter(User.email == email).first()
            if not st:
                st = User(
                    id=f"user-student-att-{i}",
                    org_id="org-edusphere",
                    email=email,
                    password_hash=hash_password("password123"),
                    name=f"Student Number {i}",
                    role=UserRole.STUDENT,
                    enrollment_no=f"ED/2026/ATT0{i}",
                )
                db.add(st)
                db.commit()
            students.append(st)

        # Create test course
        course = db.query(Course).filter(Course.code == "CS-ATT-101").first()
        if not course:
            course = Course(
                id="course-att-101",
                org_id="org-edusphere",
                code="CS-ATT-101",
                name="Distributed Cloud Architecture",
                credits=4,
                department_id="dept-cse",
                faculty_id=faculty.id,
                semester=6,
                is_active=True,
            )
            db.add(course)
            db.commit()

        # Clean old logs and sessions for this course
        sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == course.id).all()
        for s in sessions:
            db.query(AttendanceLog).filter(AttendanceLog.session_id == s.id).delete()
            db.delete(s)
        db.commit()

        # Enroll all 3 students in course
        for st in students:
            enr = db.query(Enrollment).filter(
                Enrollment.student_id == st.id,
                Enrollment.course_id == course.id,
            ).first()
            if not enr:
                enr = Enrollment(
                    id=f"enr-att-{st.id}",
                    org_id="org-edusphere",
                    student_id=st.id,
                    course_id=course.id,
                    status=EnrollmentStatus.ACTIVE,
                    semester_label="Semester 6",
                )
                db.add(enr)
        db.commit()

        faculty_id = faculty.id
        course_id = course.id
        student_ids = [s.id for s in students]

        # Generate tokens with sub=user.id
        faculty_token = create_access_token({"sub": faculty.id, "role": faculty.role.value, "email": faculty.email})
        student1_token = create_access_token({"sub": students[0].id, "role": students[0].role.value, "email": students[0].email})
        student2_token = create_access_token({"sub": students[1].id, "role": students[1].role.value, "email": students[1].email})

        data = {
            "faculty_id": faculty_id,
            "student_ids": student_ids,
            "course_id": course_id,
            "faculty_token": faculty_token,
            "student1_token": student1_token,
            "student2_token": student2_token,
        }
        yield data
    finally:
        db.close()


def test_faculty_marks_attendance_and_student_views(test_data):
    faculty_token = test_data["faculty_token"]
    student1_id = test_data["student_ids"][0]
    student2_id = test_data["student_ids"][1]
    student3_id = test_data["student_ids"][2]
    student1_token = test_data["student1_token"]
    course_id = test_data["course_id"]

    # 1. Faculty marks attendance for 3 students
    mark_payload = {
        "course_id": course_id,
        "date": "2026-10-01",
        "marks": [
            {"student_id": student1_id, "status": "PRESENT"},
            {"student_id": student2_id, "status": "ABSENT"},
            {"student_id": student3_id, "status": "LATE"},
        ]
    }
    res = client.post(
        "/api/attendance/mark",
        json=mark_payload,
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 3
    assert data["course_id"] == course_id

    # 2. Verify course attendance roster returns the marked records for that date
    roster_res = client.get(
        f"/api/attendance/course/{course_id}?date=2026-10-01",
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert roster_res.status_code == 200
    roster_data = roster_res.json()
    assert roster_data["total_enrolled"] == 3
    status_map = {s["student_id"]: s["status"] for s in roster_data["students"]}
    assert status_map[student1_id] == "PRESENT"
    assert status_map[student2_id] == "ABSENT"
    assert status_map[student3_id] == "LATE"

    # 3. Student 1 views their attendance: 1 session held, 1 attended -> 100%
    st1_res = client.get(
        "/api/attendance/me",
        headers={"Authorization": f"Bearer {student1_token}"},
    )
    assert st1_res.status_code == 200
    st1_data = st1_res.json()
    course_stat = next(c for c in st1_data["summary"] if c["course_id"] == course_id)
    assert course_stat["percentage"] == 100.0
    assert course_stat["classes_held"] == 1
    assert course_stat["classes_attended"] == 1
    assert course_stat["is_low"] is False
    assert len(st1_data["history"]) >= 1


def test_attendance_below_75_shows_warning(test_data):
    faculty_token = test_data["faculty_token"]
    student1_id = test_data["student_ids"][0]
    student1_token = test_data["student1_token"]
    course_id = test_data["course_id"]

    # Mark 1 session where student1 is PRESENT
    client.post(
        "/api/attendance/mark",
        json={
            "course_id": course_id,
            "date": "2026-10-01",
            "marks": [{"student_id": student1_id, "status": "PRESENT"}]
        },
        headers={"Authorization": f"Bearer {faculty_token}"},
    )

    # Mark 3 sessions where student1 is ABSENT (dates: 2026-10-02, 2026-10-03, 2026-10-04)
    for d in ["2026-10-02", "2026-10-03", "2026-10-04"]:
        client.post(
            "/api/attendance/mark",
            json={
                "course_id": course_id,
                "date": d,
                "marks": [{"student_id": student1_id, "status": "ABSENT"}]
            },
            headers={"Authorization": f"Bearer {faculty_token}"},
        )

    # Student1 now has 1 present out of 4 sessions total -> 25.0%
    st1_res = client.get(
        "/api/attendance/me",
        headers={"Authorization": f"Bearer {student1_token}"},
    )
    assert st1_res.status_code == 200
    st1_data = st1_res.json()
    course_stat = next(c for c in st1_data["summary"] if c["course_id"] == course_id)
    assert course_stat["percentage"] == 25.0
    assert course_stat["classes_held"] == 4
    assert course_stat["classes_attended"] == 1
    assert course_stat["is_low"] is True
    assert course_stat["status"] in ["CRITICAL", "WARNING"]
    assert st1_data["has_warning"] is True


def test_student_cannot_mark_attendance(test_data):
    student1_token = test_data["student1_token"]
    student1_id = test_data["student_ids"][0]
    course_id = test_data["course_id"]

    res = client.post(
        "/api/attendance/mark",
        json={
            "course_id": course_id,
            "date": "2026-10-05",
            "marks": [{"student_id": student1_id, "status": "PRESENT"}]
        },
        headers={"Authorization": f"Bearer {student1_token}"},
    )
    assert res.status_code == 403


def test_attendance_summary_endpoint(test_data):
    faculty_token = test_data["faculty_token"]
    course_id = test_data["course_id"]

    res = client.get(
        f"/api/attendance/summary/{course_id}",
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["course_id"] == course_id
    assert "total_sessions" in data
    assert "total_enrolled" in data
    assert "average_percentage" in data
