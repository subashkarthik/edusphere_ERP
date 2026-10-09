import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from models.content import Assignment, Submission, AssignmentStatus
from services.certificate_service import calculate_student_metrics
from utils.password import hash_password
from utils.jwt import create_access_token

client = TestClient(app)


@pytest.fixture
def assignment_test_data():
    db = SessionLocal()
    try:
        # Create faculty
        faculty = db.query(User).filter(User.email == "faculty_asg_test@edusphere.edu.in").first()
        if not faculty:
            faculty = User(
                id="user-faculty-asg-test",
                org_id="org-edusphere",
                email="faculty_asg_test@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Prof. Assignment Grader",
                role=UserRole.FACULTY,
            )
            db.add(faculty)
            db.commit()

        # Create student
        student = db.query(User).filter(User.email == "student_asg_test@edusphere.edu.in").first()
        if not student:
            student = User(
                id="user-student-asg-test",
                org_id="org-edusphere",
                email="student_asg_test@edusphere.edu.in",
                password_hash=hash_password("password123"),
                name="Assignment Submitter",
                role=UserRole.STUDENT,
                enrollment_no="ED/2026/ASG01",
            )
            db.add(student)
            db.commit()

        # Create course
        course = db.query(Course).filter(Course.code == "CS-ASG-101").first()
        if not course:
            course = Course(
                id="course-asg-101",
                org_id="org-edusphere",
                code="CS-ASG-101",
                name="Cloud Native DevOps",
                department_id="dept-cse",
                faculty_id=faculty.id,
                semester=6,
                is_active=True,
            )
            db.add(course)
            db.commit()

        # Clean old assignments and submissions for this course
        old_assignments = db.query(Assignment).filter(Assignment.course_id == course.id).all()
        for a in old_assignments:
            db.query(Submission).filter(Submission.assignment_id == a.id).delete()
            db.delete(a)
        db.commit()

        # Enroll student in course
        enr = db.query(Enrollment).filter(
            Enrollment.student_id == student.id,
            Enrollment.course_id == course.id,
        ).first()
        if not enr:
            enr = Enrollment(
                id="enr-asg-student-1",
                org_id="org-edusphere",
                student_id=student.id,
                course_id=course.id,
                status=EnrollmentStatus.ACTIVE,
                semester_label="Semester 6",
            )
            db.add(enr)
            db.commit()

        faculty_token = create_access_token({"sub": faculty.id, "role": faculty.role.value, "email": faculty.email})
        student_token = create_access_token({"sub": student.id, "role": student.role.value, "email": student.email})

        yield {
            "faculty_id": faculty.id,
            "student_id": student.id,
            "course_id": course.id,
            "faculty_token": faculty_token,
            "student_token": student_token,
        }
    finally:
        db.close()


def test_assignment_full_workflow_and_certificate_score(assignment_test_data):
    faculty_token = assignment_test_data["faculty_token"]
    student_token = assignment_test_data["student_token"]
    student_id = assignment_test_data["student_id"]
    course_id = assignment_test_data["course_id"]

    # 1. Faculty creates assignment
    create_res = client.post(
        "/api/assignments/",
        json={
            "course_id": course_id,
            "title": "Kubernetes Cluster Setup & Ingress Lab",
            "description": "Deploy a microservice cluster using Helm and configure TLS Ingress.",
            "due_date": "2026-11-01T23:59:59Z",
            "max_marks": 100,
        },
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert create_res.status_code == 200
    assignment_id = create_res.json()["id"]
    assert assignment_id is not None

    # 2. Student lists assignments, sees status PENDING
    list_res = client.get(
        "/api/assignments/",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert list_res.status_code == 200
    assignments = list_res.json()
    asg = next(a for a in assignments if a["id"] == assignment_id)
    assert asg["status"] == "PENDING"
    assert asg["marks_obtained"] is None

    # 3. Student submits assignment work
    sub_res = client.post(
        "/api/assignments/submit",
        json={
            "assignment_id": assignment_id,
            "file_url": "https://storage.edusphere.edu.in/assignments/k8s_ingress_report.pdf",
        },
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert sub_res.status_code == 200

    # 4. Faculty lists submissions and sees student submission
    submissions_res = client.get(
        "/api/assignments/submissions",
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert submissions_res.status_code == 200
    submissions = submissions_res.json()
    sub_item = next(s for s in submissions if s["assignment_id"] == assignment_id and s["student_id"] == student_id)
    assert sub_item["status"] == "SUBMITTED"
    assert sub_item["max_marks"] == 100
    submission_id = sub_item["id"]

    # 5. Invalid grading marks > max_marks returns 400
    invalid_grade_res = client.post(
        f"/api/assignments/submissions/{submission_id}/grade",
        json={
            "marks_obtained": 150.0,
            "feedback": "Too many marks",
        },
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert invalid_grade_res.status_code == 400

    # 6. Faculty grades submission with 95 marks and feedback
    grade_res = client.post(
        f"/api/assignments/submissions/{submission_id}/grade",
        json={
            "marks_obtained": 95.0,
            "feedback": "Outstanding Kubernetes manifest optimization and clean Ingress configuration.",
        },
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert grade_res.status_code == 200

    # 7. Student checks assignments, sees GRADED, 95/100, and feedback
    updated_list_res = client.get(
        "/api/assignments/",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert updated_list_res.status_code == 200
    updated_asg = next(a for a in updated_list_res.json() if a["id"] == assignment_id)
    assert updated_asg["status"] == "GRADED"
    assert updated_asg["marks_obtained"] == 95.0
    assert updated_asg["feedback"] == "Outstanding Kubernetes manifest optimization and clean Ingress configuration."

    # 8. Certificate calculation uses the graded marks
    db = SessionLocal()
    try:
        _, assessment_pct, _ = calculate_student_metrics(db, student_id, course_id)
        assert assessment_pct == 95.0
    finally:
        db.close()
