import uuid
import pytest
from datetime import datetime, date
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from models.exam import Quiz, QuizQuestion, QuizAttempt
from models.content import Assignment, Submission, AssignmentStatus
from models.certificate import Certificate, CertificateStatus
from models.notification import Notification
from utils.password import hash_password
from utils.jwt import create_access_token
from services.email_service import send_email

client = TestClient(app)


@pytest.fixture
def notifications_fixture():
    db = SessionLocal()
    try:
        # 1. Dept
        dept = db.query(Department).filter(Department.id == "dept-notif-test").first()
        if not dept:
            dept = Department(id="dept-notif-test", org_id="org-edusphere", code="NOTIFDEPT", name="Notif Dept")
            db.add(dept)
            db.commit()

        # 2. Faculty
        faculty = db.query(User).filter(User.email == "faculty_notif_test@edusphere.edu.in").first()
        if not faculty:
            faculty = User(
                id="user-faculty-notif-test",
                org_id="org-edusphere",
                email="faculty_notif_test@edusphere.edu.in",
                password_hash=hash_password("facpass123"),
                name="Prof Notif",
                role=UserRole.FACULTY,
            )
            db.add(faculty)
        else:
            faculty.role = UserRole.FACULTY
        db.commit()

        # 3. Student
        student = db.query(User).filter(User.email == "student_notif_test@edusphere.edu.in").first()
        if not student:
            student = User(
                id="user-student-notif-test",
                org_id="org-edusphere",
                email="student_notif_test@edusphere.edu.in",
                password_hash=hash_password("stupass123"),
                name="Student Notif Receiver",
                enrollment_no="NOTIF-2026-001",
                role=UserRole.STUDENT,
            )
            db.add(student)
        else:
            student.role = UserRole.STUDENT
        db.commit()

        # 4. Course 1
        course = db.query(Course).filter(Course.id == "course-notif-test").first()
        if not course:
            course = Course(
                id="course-notif-test",
                org_id="org-edusphere",
                department_id=dept.id,
                faculty_id=faculty.id,
                code="NOTIF101",
                name="Notification Engineering 101",
                credits=4,
                is_active=True
            )
            db.add(course)
            db.commit()

        # 4b. Course 2 for Self-Enrollment
        course2 = db.query(Course).filter(Course.id == "course-notif-self").first()
        if not course2:
            course2 = Course(
                id="course-notif-self",
                org_id="org-edusphere",
                department_id=dept.id,
                faculty_id=faculty.id,
                code="NOTIF202",
                name="Self Enroll Subject 202",
                credits=4,
                is_active=True
            )
            db.add(course2)
            db.commit()

        # 4c. Active Enrollment in Course 1
        enr = db.query(Enrollment).filter(
            Enrollment.student_id == student.id,
            Enrollment.course_id == course.id
        ).first()
        if not enr:
            enr = Enrollment(
                id="enr-notif-test",
                org_id="org-edusphere",
                student_id=student.id,
                course_id=course.id,
                status=EnrollmentStatus.ACTIVE
            )
            db.add(enr)
            db.commit()

        # 5. Assignment
        assignment = db.query(Assignment).filter(Assignment.id == "asg-notif-test").first()
        if not assignment:
            assignment = Assignment(
                id="asg-notif-test",
                org_id="org-edusphere",
                course_id=course.id,
                title="System Design Architecture Submission",
                description="Submit design docs",
                max_marks=50,
                due_date=datetime(2026, 12, 31)
            )
            db.add(assignment)
            db.commit()

        # 6. Submission
        submission = db.query(Submission).filter(Submission.id == "sub-notif-test").first()
        if not submission:
            submission = Submission(
                id="sub-notif-test",
                org_id="org-edusphere",
                assignment_id=assignment.id,
                student_id=student.id,
                file_url="https://storage.edusphere.edu.in/submissions/doc1.pdf",
                status=AssignmentStatus.SUBMITTED,
                submitted_at=datetime.utcnow()
            )
            db.add(submission)
            db.commit()

        fac_token = create_access_token({"sub": faculty.id, "email": faculty.email, "role": faculty.role.value, "org_id": faculty.org_id})
        stu_token = create_access_token({"sub": student.id, "email": student.email, "role": student.role.value, "org_id": student.org_id})

        return {
            "fac_token": fac_token,
            "stu_token": stu_token,
            "faculty_id": faculty.id,
            "student_id": student.id,
            "course_id": course.id,
            "assignment_id": assignment.id,
            "submission_id": submission.id,
        }
    finally:
        db.close()


def test_faculty_grades_assignment_triggers_student_notification(notifications_fixture):
    """Test: Faculty grades an assignment -> student receives live notification record in DB and API."""
    fac_headers = {"Authorization": f"Bearer {notifications_fixture['fac_token']}"}
    stu_headers = {"Authorization": f"Bearer {notifications_fixture['stu_token']}"}

    # 1. Faculty grades student submission
    grade_res = client.post(
        f"/api/assignments/submissions/{notifications_fixture['submission_id']}/grade",
        headers=fac_headers,
        json={"marks_obtained": 48.0, "feedback": "Exceptional system architecture diagram!"}
    )
    assert grade_res.status_code == 200

    # 2. Student fetches notifications (unread count must have increased)
    notif_res = client.get("/api/notifications", headers=stu_headers)
    assert notif_res.status_code == 200
    data = notif_res.json()

    assert data["unread_count"] >= 1
    assert len(data["notifications"]) >= 1

    grade_notif = next(
        (n for n in data["notifications"] if n["type"] == "ASSIGNMENT_GRADED"),
        None
    )
    assert grade_notif is not None
    assert "System Design Architecture Submission" in grade_notif["title"]
    assert "48.0/50" in grade_notif["message"]
    assert grade_notif["read"] is False

    # 3. Mark notification as read
    read_res = client.post(f"/api/notifications/{grade_notif['id']}/read", headers=stu_headers)
    assert read_res.status_code == 200
    assert read_res.json()["notification"]["read"] is True


def test_student_self_enroll_triggers_notification(notifications_fixture):
    """Test: Student enrolling in a course creates an enrollment notification."""
    db = SessionLocal()
    try:
        db.query(Enrollment).filter(
            Enrollment.student_id == notifications_fixture["student_id"],
            Enrollment.course_id == "course-notif-self"
        ).delete()
        db.commit()
    finally:
        db.close()

    stu_headers = {"Authorization": f"Bearer {notifications_fixture['stu_token']}"}

    # Enroll in course-notif-self via self-enroll endpoint
    res = client.post("/api/courses/course-notif-self/self-enroll", headers=stu_headers)
    assert res.status_code == 200

    # Check notification
    notif_res = client.get("/api/notifications", headers=stu_headers)
    assert notif_res.status_code == 200
    data = notif_res.json()

    enroll_notif = next((n for n in data["notifications"] if n["type"] == "ENROLLMENT"), None)
    assert enroll_notif is not None
    assert "NOTIF202" in enroll_notif["title"]


def test_attendance_drop_warning_notification(notifications_fixture):
    """Test: Attendance falling below 75% creates an attendance warning notification."""
    fac_headers = {"Authorization": f"Bearer {notifications_fixture['fac_token']}"}
    stu_headers = {"Authorization": f"Bearer {notifications_fixture['stu_token']}"}

    # Mark 2 sessions ABSENT so attendance is 0%
    client.post(
        "/api/attendance/mark",
        headers=fac_headers,
        json={
            "course_id": notifications_fixture["course_id"],
            "date": "2026-10-01",
            "marks": [{"student_id": notifications_fixture["student_id"], "status": "ABSENT"}]
        }
    )
    client.post(
        "/api/attendance/mark",
        headers=fac_headers,
        json={
            "course_id": notifications_fixture["course_id"],
            "date": "2026-10-02",
            "marks": [{"student_id": notifications_fixture["student_id"], "status": "ABSENT"}]
        }
    )

    notif_res = client.get("/api/notifications", headers=stu_headers)
    assert notif_res.status_code == 200
    data = notif_res.json()

    warn_notif = next((n for n in data["notifications"] if n["type"] == "ATTENDANCE_WARNING"), None)
    assert warn_notif is not None
    assert "Attendance Warning" in warn_notif["title"]
    assert "below the required 75%" in warn_notif["message"]


def test_quiz_published_notification(notifications_fixture):
    """Test: Publishing a quiz notifies all enrolled students."""
    fac_headers = {"Authorization": f"Bearer {notifications_fixture['fac_token']}"}
    stu_headers = {"Authorization": f"Bearer {notifications_fixture['stu_token']}"}

    quiz_res = client.post(
        "/api/exams/quizzes",
        headers=fac_headers,
        json={
            "course_id": notifications_fixture["course_id"],
            "title": "Cloud Microservices Live Quiz",
            "time_limit_minutes": 20,
            "passing_percentage": 60,
            "questions": [
                {
                    "question_text": "What is Docker?",
                    "option_a": "Container runtime",
                    "option_b": "Database",
                    "option_c": "Browser",
                    "option_d": "OS kernel",
                    "correct_option": "A",
                    "marks": 10
                }
            ]
        }
    )
    assert quiz_res.status_code == 200

    notif_res = client.get("/api/notifications", headers=stu_headers)
    assert notif_res.status_code == 200
    data = notif_res.json()

    quiz_notif = next((n for n in data["notifications"] if n["type"] == "QUIZ_PUBLISHED"), None)
    assert quiz_notif is not None
    assert "Cloud Microservices Live Quiz" in quiz_notif["title"]


def test_mark_all_notifications_read(notifications_fixture):
    """Test: POST /api/notifications/read-all marks all unread notifications as read."""
    stu_headers = {"Authorization": f"Bearer {notifications_fixture['stu_token']}"}

    res = client.post("/api/notifications/read-all", headers=stu_headers)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 0

    check_res = client.get("/api/notifications", headers=stu_headers)
    assert check_res.json()["unread_count"] == 0


def test_smtp_email_silent_skip_without_env():
    """Test: send_email works without crashing when SMTP is not configured."""
    result = send_email(
        to_email="test_student@edusphere.edu.in",
        subject="Automated Test Subject",
        body_text="Test notification body content."
    )
    # Returns True and logs silently without throwing any exception
    assert result is True
