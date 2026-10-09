import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from models.exam import Quiz, QuizQuestion, QuizAttempt
from utils.password import hash_password
from utils.jwt import create_access_token

client = TestClient(app)


@pytest.fixture
def quiz_test_data():
    db = SessionLocal()
    try:
        # Create faculty
        faculty = db.query(User).filter(User.email == "faculty_quiz_test@edusphere.edu.in").first()
        if not faculty:
            faculty = User(
                id="user-faculty-quiz-test",
                org_id="org-edusphere",
                email="faculty_quiz_test@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Prof. Quiz Master",
                role=UserRole.FACULTY,
            )
            db.add(faculty)
            db.commit()

        # Create enrolled student
        student_enrolled = db.query(User).filter(User.email == "student_quiz_enrolled@edusphere.edu.in").first()
        if not student_enrolled:
            student_enrolled = User(
                id="user-student-quiz-enrolled",
                org_id="org-edusphere",
                email="student_quiz_enrolled@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Enrolled Quiz Student",
                role=UserRole.STUDENT,
                enrollment_no="ED/2026/QZ01",
            )
            db.add(student_enrolled)
            db.commit()

        # Create unenrolled student
        student_other = db.query(User).filter(User.email == "student_quiz_other@edusphere.edu.in").first()
        if not student_other:
            student_other = User(
                id="user-student-quiz-other",
                org_id="org-edusphere",
                email="student_quiz_other@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Other Student",
                role=UserRole.STUDENT,
                enrollment_no="ED/2026/QZ02",
            )
            db.add(student_other)
            db.commit()

        # Create course
        course = db.query(Course).filter(Course.code == "CS-QUIZ-101").first()
        if not course:
            course = Course(
                id="course-quiz-101",
                org_id="org-edusphere",
                code="CS-QUIZ-101",
                name="Software Architecture & Cloud",
                department_id="dept-cse",
                faculty_id=faculty.id,
                semester=6,
                is_active=True,
            )
            db.add(course)
            db.commit()

        # Clean old quizzes and attempts for this course
        old_quizzes = db.query(Quiz).filter(Quiz.course_id == course.id).all()
        for q in old_quizzes:
            db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q.id).delete()
            db.query(QuizQuestion).filter(QuizQuestion.quiz_id == q.id).delete()
            db.delete(q)
        db.commit()

        # Enroll student_enrolled in course
        enr = db.query(Enrollment).filter(
            Enrollment.student_id == student_enrolled.id,
            Enrollment.course_id == course.id,
        ).first()
        if not enr:
            enr = Enrollment(
                id="enr-quiz-student-1",
                org_id="org-edusphere",
                student_id=student_enrolled.id,
                course_id=course.id,
                status=EnrollmentStatus.ACTIVE,
                semester_label="Semester 6",
            )
            db.add(enr)
            db.commit()

        # Ensure student_other is NOT enrolled
        db.query(Enrollment).filter(
            Enrollment.student_id == student_other.id,
            Enrollment.course_id == course.id,
        ).delete()
        db.commit()

        faculty_token = create_access_token({"sub": faculty.id, "role": faculty.role.value, "email": faculty.email})
        enrolled_token = create_access_token({"sub": student_enrolled.id, "role": student_enrolled.role.value, "email": student_enrolled.email})
        other_token = create_access_token({"sub": student_other.id, "role": student_other.role.value, "email": student_other.email})

        yield {
            "faculty_id": faculty.id,
            "course_id": course.id,
            "student_enrolled_id": student_enrolled.id,
            "student_other_id": student_other.id,
            "faculty_token": faculty_token,
            "enrolled_token": enrolled_token,
            "other_token": other_token,
        }
    finally:
        db.close()


def test_faculty_creates_quiz_student_takes_and_scores_match(quiz_test_data):
    faculty_token = quiz_test_data["faculty_token"]
    enrolled_token = quiz_test_data["enrolled_token"]
    other_token = quiz_test_data["other_token"]
    course_id = quiz_test_data["course_id"]

    # 1. Faculty creates a 3-question quiz in one call
    create_payload = {
        "course_id": course_id,
        "title": "Cloud Computing & Microservices Quiz",
        "description": "Mid-semester microservices assessment",
        "time_limit_minutes": 20,
        "passing_percentage": 60.0,
        "questions": [
            {
                "question_text": "What does CAP theorem stand for in distributed systems?",
                "option_a": "Consistency, Availability, Partition Tolerance",
                "option_b": "Concurrency, Atomicity, Performance",
                "option_c": "Caching, Authentication, Persistence",
                "option_d": "Centralization, Authorization, Privacy",
                "correct_option": "A",
                "explanation": "CAP theorem states a distributed data store can only provide two of the three guarantees.",
                "marks": 10,
            },
            {
                "question_text": "Which HTTP method is idempotent according to REST standards?",
                "option_a": "POST",
                "option_b": "PUT",
                "option_c": "PATCH (without idempotency key)",
                "option_d": "CONNECT",
                "correct_option": "B",
                "explanation": "PUT is idempotent because multiple identical requests produce the same state.",
                "marks": 15,
            },
            {
                "question_text": "What is the primary role of an API Gateway in microservices?",
                "option_a": "Database indexing",
                "option_b": "Single point of entry for routing, auth, and rate limiting",
                "option_c": "CSS pre-processing",
                "option_d": "Code linting",
                "correct_option": "B",
                "explanation": "API gateways manage cross-cutting concerns for microservices.",
                "marks": 15,
            },
        ]
    }

    create_res = client.post(
        "/api/exams/quizzes",
        json=create_payload,
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert create_res.status_code == 200
    quiz_id = create_res.json()["quiz_id"]
    assert quiz_id is not None

    # 2. Enrolled student sees the quiz in list
    list_res = client.get(
        "/api/exams/quizzes",
        headers={"Authorization": f"Bearer {enrolled_token}"},
    )
    assert list_res.status_code == 200
    quizzes = list_res.json()
    assert any(q["id"] == quiz_id for q in quizzes)

    # 3. Unenrolled student does NOT see this quiz
    other_list_res = client.get(
        "/api/exams/quizzes",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert other_list_res.status_code == 200
    other_quizzes = other_list_res.json()
    assert not any(q["id"] == quiz_id for q in other_quizzes)

    # 4. Enrolled student fetches quiz questions
    detail_res = client.get(
        f"/api/exams/quizzes/{quiz_id}",
        headers={"Authorization": f"Bearer {enrolled_token}"},
    )
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert len(detail_data["questions"]) == 3
    # Verify correct_option is NOT leaked in question payload
    for q in detail_data["questions"]:
        assert "correct_option" not in q

    q1_id = detail_data["questions"][0]["id"]
    q2_id = detail_data["questions"][1]["id"]
    q3_id = detail_data["questions"][2]["id"]

    # 5. Student submits answers: Q1 = A (Correct: 10 pts), Q2 = B (Correct: 15 pts), Q3 = C (Incorrect: 0 pts)
    # Total marks: 10 + 15 + 15 = 40. Expected score: 25 / 40 = 62.5% -> Passed!
    submit_payload = {
        "answers": {
            q1_id: "A",
            q2_id: "B",
            q3_id: "C",  # Wrong answer
        },
        "tab_switch_violations": 1,
    }
    submit_res = client.post(
        f"/api/exams/quizzes/{quiz_id}/submit",
        json=submit_payload,
        headers={"Authorization": f"Bearer {enrolled_token}"},
    )
    assert submit_res.status_code == 200
    result = submit_res.json()
    assert result["score"] == 25.0
    assert result["total_marks"] == 40
    assert result["percentage"] == 62.5
    assert result["passed"] is True
    assert result["correct_answers"] == 2
    assert result["total_questions"] == 3
    assert len(result["review"]) == 3

    # 6. Faculty views attempts and results
    attempts_res = client.get(
        f"/api/exams/quizzes/{quiz_id}/attempts",
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert attempts_res.status_code == 200
    att_data = attempts_res.json()
    assert att_data["total_attempts"] == 1
    assert att_data["average_score"] == 25.0
    assert att_data["pass_rate"] == 100.0
    student_attempt = att_data["attempts"][0]
    assert student_attempt["score"] == 25.0
    assert student_attempt["passed"] is True
    assert student_attempt["tab_switch_violations"] == 1


def test_student_cannot_create_quiz(quiz_test_data):
    enrolled_token = quiz_test_data["enrolled_token"]
    course_id = quiz_test_data["course_id"]

    res = client.post(
        "/api/exams/quizzes",
        json={
            "course_id": course_id,
            "title": "Unauthorized Student Quiz",
            "questions": [{
                "question_text": "Sample?",
                "option_a": "1",
                "option_b": "2",
                "option_c": "3",
                "option_d": "4",
                "correct_option": "A",
            }]
        },
        headers={"Authorization": f"Bearer {enrolled_token}"},
    )
    assert res.status_code == 403


def test_unenrolled_student_cannot_fetch_quiz_details(quiz_test_data):
    faculty_token = quiz_test_data["faculty_token"]
    other_token = quiz_test_data["other_token"]
    course_id = quiz_test_data["course_id"]

    # Create quiz
    create_res = client.post(
        "/api/exams/quizzes",
        json={
            "course_id": course_id,
            "title": "Private Course Quiz",
            "questions": [{
                "question_text": "Test?",
                "option_a": "A",
                "option_b": "B",
                "option_c": "C",
                "option_d": "D",
                "correct_option": "A",
            }]
        },
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    quiz_id = create_res.json()["quiz_id"]

    # Unenrolled student tries to get quiz details -> 403
    res = client.get(
        f"/api/exams/quizzes/{quiz_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert res.status_code == 403
