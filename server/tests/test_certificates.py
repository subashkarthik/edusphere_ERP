import uuid
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus
from models.exam import Quiz, QuizQuestion, QuizAttempt
from models.content import Module, Lesson, LessonProgress
from models.certificate import Certificate, CertificateSetting, CertificateStatus
from services.certificate_service import evaluate_and_issue_certificate, calculate_student_metrics
from utils.password import hash_password
from utils.jwt import create_access_token

client = TestClient(app)


@pytest.fixture
def cert_test_data():
    db = SessionLocal()
    try:
        # 1. Ensure department
        dept = db.query(Department).filter(Department.id == "dept-cert-test").first()
        if not dept:
            dept = Department(id="dept-cert-test", org_id="org-edusphere", code="CERTDEPT", name="Certification Dept")
            db.add(dept)
            db.commit()

        # 2. Admin User
        admin = db.query(User).filter(User.email == "admin_cert_test@edusphere.edu.in").first()
        if not admin:
            admin = User(
                id="user-admin-cert-test",
                org_id="org-edusphere",
                email="admin_cert_test@edusphere.edu.in",
                password_hash=hash_password("adminpass123"),
                name="Admin Cert Officer",
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()

        # 3. Student A (Low Attendance, 60%)
        student_a = db.query(User).filter(User.email == "student_low_attn@edusphere.edu.in").first()
        if not student_a:
            student_a = User(
                id="user-student-low-attn",
                org_id="org-edusphere",
                email="student_low_attn@edusphere.edu.in",
                password_hash=hash_password("studentpass123"),
                name="Test Student One",
                role=UserRole.STUDENT,
                enrollment_no="ED/2026/CERT01",
            )
            db.add(student_a)
            db.commit()

        # 4. Student B (Eligible, 80% attendance, 75% quiz, 100% progress)
        student_b = db.query(User).filter(User.email == "student_eligible@edusphere.edu.in").first()
        if not student_b:
            student_b = User(
                id="user-student-eligible",
                org_id="org-edusphere",
                email="student_eligible@edusphere.edu.in",
                password_hash=hash_password("studentpass123"),
                name="Karthik Subash",
                role=UserRole.STUDENT,
                enrollment_no="ED/2026/CERT02",
            )
            db.add(student_b)
            db.commit()

        # 5. Course
        course = db.query(Course).filter(Course.id == "course-cert-test").first()
        if not course:
            course = Course(
                id="course-cert-test",
                org_id="org-edusphere",
                code="CS999",
                name="Advanced Distributed Systems",
                credits=4,
                department_id="dept-cert-test",
                is_active=True,
            )
            db.add(course)
            db.commit()

        # Enrollments
        for s in [student_a, student_b]:
            enr = db.query(Enrollment).filter(Enrollment.student_id == s.id, Enrollment.course_id == course.id).first()
            if not enr:
                enr = Enrollment(
                    id=str(uuid.uuid4()),
                    org_id="org-edusphere",
                    student_id=s.id,
                    course_id=course.id,
                    status=EnrollmentStatus.ACTIVE,
                )
                db.add(enr)
                db.commit()

        # Attendance Sessions (5 sessions)
        sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == course.id).all()
        if len(sessions) < 5:
            for i in range(5 - len(sessions)):
                sess = AttendanceSession(
                    id=f"session-cert-{i+1}",
                    org_id="org-edusphere",
                    course_id=course.id,
                    faculty_id=admin.id,
                    session_date=datetime(2026, 10, i+1).date(),
                )
                db.add(sess)
            db.commit()
            sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == course.id).all()

        # Attendance Logs:
        # Student A: 3 present, 2 absent -> 60% attendance
        # Student B: 4 present, 1 absent -> 80% attendance
        for idx, sess in enumerate(sessions):
            # Student A
            status_a = AttendanceStatus.PRESENT if idx < 3 else AttendanceStatus.ABSENT
            log_a = db.query(AttendanceLog).filter(AttendanceLog.session_id == sess.id, AttendanceLog.student_id == student_a.id).first()
            if not log_a:
                db.add(AttendanceLog(id=str(uuid.uuid4()), session_id=sess.id, student_id=student_a.id, status=status_a, org_id="org-edusphere"))
            else:
                log_a.status = status_a

            # Student B
            status_b = AttendanceStatus.PRESENT if idx < 4 else AttendanceStatus.ABSENT
            log_b = db.query(AttendanceLog).filter(AttendanceLog.session_id == sess.id, AttendanceLog.student_id == student_b.id).first()
            if not log_b:
                db.add(AttendanceLog(id=str(uuid.uuid4()), session_id=sess.id, student_id=student_b.id, status=status_b, org_id="org-edusphere"))
            else:
                log_b.status = status_b
        db.commit()

        # Quiz & Quiz Attempts:
        quiz = db.query(Quiz).filter(Quiz.course_id == course.id).first()
        if not quiz:
            quiz = Quiz(
                id="quiz-cert-test",
                course_id=course.id,
                title="Distributed Protocols Quiz",
                total_marks=100,
                is_results_published=True,
                org_id="org-edusphere",
            )
            db.add(quiz)
            db.commit()
        else:
            quiz.is_results_published = True
            db.commit()

        # Student A quiz attempt: 80%
        att_a = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id, QuizAttempt.student_id == student_a.id).first()
        if not att_a:
            db.add(QuizAttempt(
                id=str(uuid.uuid4()),
                quiz_id=quiz.id,
                student_id=student_a.id,
                score=80.0,
                percentage=80.0,
                passed=True,
                org_id="org-edusphere",
            ))
        else:
            att_a.percentage = 80.0

        # Student B quiz attempt: 75%
        att_b = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id, QuizAttempt.student_id == student_b.id).first()
        if not att_b:
            db.add(QuizAttempt(
                id=str(uuid.uuid4()),
                quiz_id=quiz.id,
                student_id=student_b.id,
                score=75.0,
                percentage=75.0,
                passed=True,
                org_id="org-edusphere",
            ))
        else:
            att_b.percentage = 75.0
        db.commit()

        # Clean existing certificates for deterministic test state
        db.query(Certificate).filter(Certificate.course_id == course.id).delete()
        db.commit()

        admin_token = create_access_token({"sub": admin.id, "email": admin.email, "role": admin.role.value, "org_id": admin.org_id})
        student_a_token = create_access_token({"sub": student_a.id, "email": student_a.email, "role": student_a.role.value, "org_id": student_a.org_id})
        student_b_token = create_access_token({"sub": student_b.id, "email": student_b.email, "role": student_b.role.value, "org_id": student_b.org_id})

        return {
            "admin_id": admin.id,
            "student_a_id": student_a.id,
            "student_b_id": student_b.id,
            "course_id": course.id,
            "admin_token": admin_token,
            "student_a_token": student_a_token,
            "student_b_token": student_b_token,
        }
    finally:
        db.close()


def test_student_ineligible_due_to_low_attendance(cert_test_data):
    """
    Test (a): student with 60% attendance -> NOT eligible, no certificate issued.
    """
    data = cert_test_data
    db = SessionLocal()
    try:
        # Check metrics
        attn, assess, prog = calculate_student_metrics(db, data["student_a_id"], data["course_id"])
        assert attn == 60.0
        assert assess == 80.0
        assert prog == 100.0

        # Evaluate certificate
        cert = evaluate_and_issue_certificate(db, data["student_a_id"], data["course_id"])
        assert cert.eligibility_status == CertificateStatus.INELIGIBLE
        assert cert.certificate_url is None
        assert cert.attendance_pct == 60.0

        # API Call as Student A
        res = client.get(
            "/api/certificates/my-certificates",
            headers={"Authorization": f"Bearer {data['student_a_token']}"}
        )
        assert res.status_code == 200
        items = res.json()
        target = next((item for item in items if item["course_id"] == data["course_id"]), None)
        assert target is not None
        assert target["attendance_pct"] == 60.0
        assert target["attendance_met"] is False
        assert target["is_eligible"] is False
        assert target["certificate_url"] is None
    finally:
        db.close()


def test_student_eligible_all_criteria_met(cert_test_data):
    """
    Test (b): all criteria met (80% attendance, 75% quiz, 100% progress) -> certificate issued with EDU-2026-XXXXXXXX.
    """
    data = cert_test_data
    db = SessionLocal()
    try:
        attn, assess, prog = calculate_student_metrics(db, data["student_b_id"], data["course_id"])
        assert attn == 80.0
        assert assess == 75.0
        assert prog == 100.0

        # API Call as Student B
        res = client.get(
            "/api/certificates/my-certificates",
            headers={"Authorization": f"Bearer {data['student_b_token']}"}
        )
        assert res.status_code == 200
        items = res.json()
        target = next((item for item in items if item["course_id"] == data["course_id"]), None)
        assert target is not None
        assert target["attendance_pct"] == 80.0
        assert target["attendance_met"] is True
        assert target["assessment_pct"] == 75.0
        assert target["assessment_met"] is True
        assert target["progress_pct"] == 100.0
        assert target["progress_met"] is True
        assert target["is_eligible"] is True
        assert target["eligibility_status"] == "ISSUED"
        assert target["certificate_code"].startswith("EDU-2026-")
        assert target["certificate_url"] is not None
    finally:
        db.close()


def test_public_verification_endpoint(cert_test_data):
    """
    Test (c): scan QR / open /verify/<code> or GET /api/certificates/verify/{code} -> returns valid certificate details.
    """
    data = cert_test_data
    db = SessionLocal()
    try:
        # Issue certificate for Student B
        cert = evaluate_and_issue_certificate(db, data["student_b_id"], data["course_id"])
        assert cert.eligibility_status == CertificateStatus.ISSUED

        # Public verification without any Authorization header
        res = client.get(f"/api/certificates/verify/{cert.certificate_code}")
        assert res.status_code == 200
        verify_data = res.json()
        assert verify_data["valid"] is True
        assert verify_data["status"] == "VALID"
        assert verify_data["certificate_code"] == cert.certificate_code
        assert verify_data["student_name"] == "Karthik Subash"
        assert verify_data["course_name"] == "Advanced Distributed Systems"
        assert verify_data["attendance_pct"] == 80.0
        assert verify_data["assessment_pct"] == 75.0
    finally:
        db.close()


def test_revocation_and_verification_revoked(cert_test_data):
    """
    Test (d): revoke certificate -> verify endpoint returns REVOKED.
    """
    data = cert_test_data
    db = SessionLocal()
    try:
        cert = evaluate_and_issue_certificate(db, data["student_b_id"], data["course_id"])
        assert cert.eligibility_status == CertificateStatus.ISSUED

        # Revoke as Admin
        revoke_res = client.post(
            f"/api/certificates/revoke/{cert.id}",
            headers={"Authorization": f"Bearer {data['admin_token']}"}
        )
        assert revoke_res.status_code == 200
        assert revoke_res.json()["status"] == "REVOKED"

        # Check public verify
        res = client.get(f"/api/certificates/verify/{cert.certificate_code}")
        assert res.status_code == 200
        verify_data = res.json()
        assert verify_data["valid"] is False
        assert verify_data["status"] == "REVOKED"
    finally:
        db.close()
