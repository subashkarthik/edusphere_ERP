import uuid
from datetime import datetime, date, timedelta
import pytest
from fastapi.testclient import TestClient

from main import app
from database import SessionLocal
from models.organization import Organization, OrgPlan
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from models.content import Assignment, Submission, AssignmentStatus
from models.exam import Quiz, QuizAttempt
from models.certificate import Certificate, CertificateStatus
from utils.password import hash_password
from utils.jwt import create_access_token

client = TestClient(app)


@pytest.fixture(scope="module")
def idor_fixture():
    db = SessionLocal()
    try:
        # 1. Create two Organizations
        org1 = db.query(Organization).filter(Organization.id == "org-idor-1").first()
        if not org1:
            org1 = Organization(id="org-idor-1", name="IDOR Matrix Org Alpha", plan=OrgPlan.ENTERPRISE)
            db.add(org1)

        org2 = db.query(Organization).filter(Organization.id == "org-idor-2").first()
        if not org2:
            org2 = Organization(id="org-idor-2", name="IDOR Matrix Org Beta", plan=OrgPlan.ENTERPRISE)
            db.add(org2)
        db.commit()

        # 2. Departments
        dept1 = db.query(Department).filter(Department.id == "dept-idor-1").first()
        if not dept1:
            dept1 = Department(id="dept-idor-1", org_id="org-idor-1", name="Computer Science", code="CSIDOR1")
            db.add(dept1)

        dept2 = db.query(Department).filter(Department.id == "dept-idor-2").first()
        if not dept2:
            dept2 = Department(id="dept-idor-2", org_id="org-idor-2", name="Information Tech", code="ITIDOR2")
            db.add(dept2)
        db.commit()

        # Helper to get or create user
        def get_or_create_user(uid, email, name, role, org_id, enroll_no=None):
            user = db.query(User).filter(User.id == uid).first()
            if not user:
                user = User(
                    id=uid,
                    org_id=org_id,
                    email=email,
                    login_id=email.split("@")[0],
                    password_hash=hash_password("MatrixSecure#2026"),
                    name=name,
                    role=role,
                    is_active=True,
                    enrollment_no=enroll_no,
                )
                db.add(user)
                db.commit()
            return user

        # 3. Users
        admin_1 = get_or_create_user("user-admin-idor-1", "admin1_idor@edusphere.edu", "Admin Alpha", UserRole.ADMIN, "org-idor-1")
        admin_2 = get_or_create_user("user-admin-idor-2", "admin2_idor@edusphere.edu", "Admin Beta", UserRole.ADMIN, "org-idor-2")

        faculty_1a = get_or_create_user("user-fac-idor-1a", "fac1a_idor@edusphere.edu", "Prof. Alice 1A", UserRole.FACULTY, "org-idor-1")
        faculty_1b = get_or_create_user("user-fac-idor-1b", "fac1b_idor@edusphere.edu", "Prof. Bob 1B", UserRole.FACULTY, "org-idor-1")

        student_1a = get_or_create_user("user-stu-idor-1a", "stu1a_idor@edusphere.edu", "Student 1A", UserRole.STUDENT, "org-idor-1", "ENR-IDOR-1A")
        student_1b = get_or_create_user("user-stu-idor-1b", "stu1b_idor@edusphere.edu", "Student 1B", UserRole.STUDENT, "org-idor-1", "ENR-IDOR-1B")
        student_2 = get_or_create_user("user-stu-idor-2", "stu2_idor@edusphere.edu", "Student 2 Beta", UserRole.STUDENT, "org-idor-2", "ENR-IDOR-2")

        # 4. Courses
        def get_or_create_course(cid, code, name, faculty_id, org_id, dept_id):
            course = db.query(Course).filter(Course.id == cid).first()
            if not course:
                course = Course(
                    id=cid,
                    org_id=org_id,
                    code=code,
                    name=name,
                    faculty_id=faculty_id,
                    department_id=dept_id,
                    is_active=True,
                )
                db.add(course)
                db.commit()
            return course

        course_1a = get_or_create_course("crs-idor-1a", "CS-IDOR-1A", "Distributed Systems 1A", faculty_1a.id, "org-idor-1", dept1.id)
        course_1b = get_or_create_course("crs-idor-1b", "CS-IDOR-1B", "Database Internals 1B", faculty_1b.id, "org-idor-1", dept1.id)
        course_2 = get_or_create_course("crs-idor-2", "IT-IDOR-2", "Cloud Computing Beta", None, "org-idor-2", dept2.id)

        # 5. Enrollments
        def enroll_if_missing(eid, stu_id, crs_id, org_id):
            enr = db.query(Enrollment).filter(Enrollment.id == eid).first()
            if not enr:
                enr = Enrollment(
                    id=eid,
                    org_id=org_id,
                    student_id=stu_id,
                    course_id=crs_id,
                    status=EnrollmentStatus.ACTIVE,
                )
                db.add(enr)
                db.commit()
            return enr

        enroll_if_missing("enr-idor-1a", student_1a.id, course_1a.id, "org-idor-1")
        enroll_if_missing("enr-idor-1b", student_1b.id, course_1b.id, "org-idor-1")
        enroll_if_missing("enr-idor-2", student_2.id, course_2.id, "org-idor-2")

        # 6. Assignments
        def get_or_create_asg(asg_id, crs_id, org_id, title):
            asg = db.query(Assignment).filter(Assignment.id == asg_id).first()
            if not asg:
                asg = Assignment(
                    id=asg_id,
                    org_id=org_id,
                    course_id=crs_id,
                    title=title,
                    description=f"Description for {title}",
                    due_date=datetime.utcnow() + timedelta(days=7),
                    max_marks=100,
                )
                db.add(asg)
                db.commit()
            return asg

        asg_1a = get_or_create_asg("asg-idor-1a", course_1a.id, "org-idor-1", "Assignment 1A")
        asg_1b = get_or_create_asg("asg-idor-1b", course_1b.id, "org-idor-1", "Assignment 1B")

        # 7. Submissions
        def get_or_create_sub(sub_id, asg_id, stu_id, org_id):
            sub = db.query(Submission).filter(Submission.id == sub_id).first()
            if not sub:
                sub = Submission(
                    id=sub_id,
                    org_id=org_id,
                    assignment_id=asg_id,
                    student_id=stu_id,
                    file_url="https://edusphere.example.com/sub.pdf",
                    status=AssignmentStatus.SUBMITTED,
                )
                db.add(sub)
                db.commit()
            return sub

        sub_1a = get_or_create_sub("sub-idor-1a", asg_1a.id, student_1a.id, "org-idor-1")
        sub_1b = get_or_create_sub("sub-idor-1b", asg_1b.id, student_1b.id, "org-idor-1")

        # 8. Quizzes
        def get_or_create_quiz(qid, crs_id, org_id, title):
            quiz = db.query(Quiz).filter(Quiz.id == qid).first()
            if not quiz:
                quiz = Quiz(
                    id=qid,
                    org_id=org_id,
                    course_id=crs_id,
                    title=title,
                    is_active=True,
                    total_marks=50,
                )
                db.add(quiz)
                db.commit()
            return quiz

        quiz_1a = get_or_create_quiz("quiz-idor-1a", course_1a.id, "org-idor-1", "Quiz 1A")
        quiz_1b = get_or_create_quiz("quiz-idor-1b", course_1b.id, "org-idor-1", "Quiz 1B")

        # 9. Attendance Sessions
        def get_or_create_sess(sess_id, crs_id, fac_id, org_id):
            sess = db.query(AttendanceSession).filter(AttendanceSession.id == sess_id).first()
            if not sess:
                sess = AttendanceSession(
                    id=sess_id,
                    org_id=org_id,
                    course_id=crs_id,
                    faculty_id=fac_id,
                    session_date=date.today(),
                    status=SessionStatus.OPEN,
                )
                db.add(sess)
                db.commit()
            return sess

        sess_1a = get_or_create_sess("sess-idor-1a", course_1a.id, faculty_1a.id, "org-idor-1")
        sess_1b = get_or_create_sess("sess-idor-1b", course_1b.id, faculty_1b.id, "org-idor-1")

        # 10. Certificates
        def get_or_create_cert(cert_id, uid, crs_id, org_id, code):
            cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
            if not cert:
                cert = Certificate(
                    id=cert_id,
                    org_id=org_id,
                    user_id=uid,
                    course_id=crs_id,
                    certificate_code=code,
                    eligibility_status=CertificateStatus.ISSUED,
                    attendance_pct=95.0,
                    assessment_pct=90.0,
                    progress_pct=100.0,
                )
                db.add(cert)
                db.commit()
            return cert

        cert_1a = get_or_create_cert("cert-idor-1a", student_1a.id, course_1a.id, "org-idor-1", "CERT-IDOR-1A")
        cert_1b = get_or_create_cert("cert-idor-1b", student_1b.id, course_1b.id, "org-idor-1", "CERT-IDOR-1B")
        cert_2 = get_or_create_cert("cert-idor-2", student_2.id, course_2.id, "org-idor-2", "CERT-IDOR-2")

        # Token helper
        def tok(u):
            return create_access_token({"sub": u.id, "role": u.role.value, "org_id": u.org_id, "email": u.email})

        yield {
            "admin_1": {"user": admin_1, "headers": {"Authorization": f"Bearer {tok(admin_1)}"}},
            "admin_2": {"user": admin_2, "headers": {"Authorization": f"Bearer {tok(admin_2)}"}},
            "faculty_1a": {"user": faculty_1a, "headers": {"Authorization": f"Bearer {tok(faculty_1a)}"}},
            "faculty_1b": {"user": faculty_1b, "headers": {"Authorization": f"Bearer {tok(faculty_1b)}"}},
            "student_1a": {"user": student_1a, "headers": {"Authorization": f"Bearer {tok(student_1a)}"}},
            "student_1b": {"user": student_1b, "headers": {"Authorization": f"Bearer {tok(student_1b)}"}},
            "student_2": {"user": student_2, "headers": {"Authorization": f"Bearer {tok(student_2)}"}},
            "course_1a": course_1a,
            "course_1b": course_1b,
            "course_2": course_2,
            "asg_1a": asg_1a,
            "asg_1b": asg_1b,
            "sub_1a": sub_1a,
            "sub_1b": sub_1b,
            "quiz_1a": quiz_1a,
            "quiz_1b": quiz_1b,
            "sess_1a": sess_1a,
            "sess_1b": sess_1b,
            "cert_1a": cert_1a,
            "cert_1b": cert_1b,
            "cert_2": cert_2,
        }
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORY 1: Student A vs Student B (IDOR)
# ─────────────────────────────────────────────────────────────────────────────

def test_student_cannot_view_another_student_profile(idor_fixture):
    """Student 1A cannot view Student 1B profile."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]
    stu_1b_id = idor_fixture["student_1b"]["user"].id

    res = client.get(f"/api/users/{stu_1b_id}", headers=stu_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_update_another_student_profile(idor_fixture):
    """Student 1A cannot update Student 1B profile."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]
    stu_1b_id = idor_fixture["student_1b"]["user"].id

    res = client.put(f"/api/users/{stu_1b_id}", json={"name": "Hacked Student Name"}, headers=stu_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_view_another_student_attendance(idor_fixture):
    """Student 1A cannot view Student 1B attendance record."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]
    stu_1b_id = idor_fixture["student_1b"]["user"].id
    crs_1b_id = idor_fixture["course_1b"].id

    res = client.get(f"/api/attendance/course/{crs_1b_id}/student/{stu_1b_id}", headers=stu_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_submit_for_unenrolled_course_assignment(idor_fixture):
    """Student 1A cannot submit assignment for Course 1B (not enrolled)."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]
    asg_1b_id = idor_fixture["asg_1b"].id

    res = client.post(
        f"/api/assignments/{asg_1b_id}/submit",
        json={"file_url": "https://attacker.com/malicious.pdf"},
        headers=stu_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_view_another_student_certificate(idor_fixture):
    """Student 1A cannot view or download Student 1B certificate."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]
    cert_1b_id = idor_fixture["cert_1b"].id

    res = client.get(f"/api/certificates/{cert_1b_id}", headers=stu_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"

    res_dl = client.get(f"/api/certificates/{cert_1b_id}/download", headers=stu_1a_headers)
    assert res_dl.status_code == 403, f"Expected 403 Forbidden on download, got {res_dl.status_code}: {res_dl.text}"


def test_student_cannot_submit_quiz_for_unenrolled_course(idor_fixture):
    """Student 1A cannot submit quiz for Course 1B."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]
    quiz_1b_id = idor_fixture["quiz_1b"].id

    res = client.post(
        f"/api/exams/quizzes/{quiz_1b_id}/submit",
        json={"answers": {"q1": "A"}},
        headers=stu_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORY 2: Faculty X vs Faculty Y (Course Scoping in Same Org)
# ─────────────────────────────────────────────────────────────────────────────

def test_faculty_cannot_mark_attendance_for_other_faculty_course(idor_fixture):
    """Faculty 1A cannot mark attendance for Course 1B (taught by Faculty 1B)."""
    fac_1a_headers = idor_fixture["faculty_1a"]["headers"]
    crs_1b_id = idor_fixture["course_1b"].id
    stu_1b_id = idor_fixture["student_1b"]["user"].id

    res = client.post(
        "/api/attendance/mark",
        json={
            "course_id": crs_1b_id,
            "session_date": date.today().isoformat(),
            "period": "Period 1",
            "attendance": [{"student_id": stu_1b_id, "status": "PRESENT"}],
        },
        headers=fac_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_faculty_cannot_create_session_for_other_faculty_course(idor_fixture):
    """Faculty 1A cannot create session for Course 1B."""
    fac_1a_headers = idor_fixture["faculty_1a"]["headers"]
    crs_1b_id = idor_fixture["course_1b"].id

    res = client.post(
        "/api/attendance/sessions",
        json={
            "course_id": crs_1b_id,
            "session_date": date.today().isoformat(),
            "period": "10:00 - 11:00",
            "topic": "Unauthorized Lecture",
        },
        headers=fac_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_faculty_cannot_mark_session_in_other_faculty_course(idor_fixture):
    """Faculty 1A cannot mark attendance on session belonging to Course 1B."""
    fac_1a_headers = idor_fixture["faculty_1a"]["headers"]
    sess_1b_id = idor_fixture["sess_1b"].id
    stu_1b_id = idor_fixture["student_1b"]["user"].id

    res = client.post(
        f"/api/attendance/sessions/{sess_1b_id}/mark",
        json={"attendance": [{"student_id": stu_1b_id, "status": "PRESENT"}]},
        headers=fac_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_faculty_cannot_view_roster_of_other_faculty_course(idor_fixture):
    """Faculty 1A cannot view roster of Course 1B."""
    fac_1a_headers = idor_fixture["faculty_1a"]["headers"]
    crs_1b_id = idor_fixture["course_1b"].id

    res = client.get(f"/api/courses/{crs_1b_id}/students", headers=fac_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_faculty_cannot_grade_submission_in_other_faculty_course(idor_fixture):
    """Faculty 1A cannot grade submission in Course 1B."""
    fac_1a_headers = idor_fixture["faculty_1a"]["headers"]
    sub_1b_id = idor_fixture["sub_1b"].id

    res = client.post(
        f"/api/assignments/submissions/{sub_1b_id}/grade",
        json={"marks_obtained": 95, "feedback": "Tampered Grade"},
        headers=fac_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_faculty_cannot_create_assignment_for_other_faculty_course(idor_fixture):
    """Faculty 1A cannot create assignment in Course 1B."""
    fac_1a_headers = idor_fixture["faculty_1a"]["headers"]
    crs_1b_id = idor_fixture["course_1b"].id

    res = client.post(
        "/api/assignments",
        json={
            "course_id": crs_1b_id,
            "title": "Unauthorized Assignment",
            "description": "Exploit Test",
            "due_date": (datetime.utcnow() + timedelta(days=5)).isoformat(),
            "max_marks": 50,
        },
        headers=fac_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_faculty_cannot_create_quiz_for_other_faculty_course(idor_fixture):
    """Faculty 1A cannot create quiz in Course 1B."""
    fac_1a_headers = idor_fixture["faculty_1a"]["headers"]
    crs_1b_id = idor_fixture["course_1b"].id

    res = client.post(
        "/api/exams/quizzes",
        json={
            "course_id": crs_1b_id,
            "title": "Unauthorized Quiz",
            "time_limit_minutes": 20,
            "total_marks": 50,
        },
        headers=fac_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_faculty_cannot_view_quiz_attempts_for_other_faculty_course(idor_fixture):
    """Faculty 1A cannot view quiz attempts in Course 1B."""
    fac_1a_headers = idor_fixture["faculty_1a"]["headers"]
    quiz_1b_id = idor_fixture["quiz_1b"].id

    res = client.get(f"/api/exams/quizzes/{quiz_1b_id}/attempts", headers=fac_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_faculty_cannot_view_metrics_for_other_faculty_course(idor_fixture):
    """Faculty 1A cannot view faculty course metrics for Course 1B."""
    fac_1a_headers = idor_fixture["faculty_1a"]["headers"]
    crs_1b_id = idor_fixture["course_1b"].id

    res = client.get(f"/api/faculty/courses/{crs_1b_id}/metrics", headers=fac_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORY 3: Student Attempts Faculty and Admin Endpoints
# ─────────────────────────────────────────────────────────────────────────────

def test_student_cannot_list_all_users(idor_fixture):
    """Student 1A cannot list users via /api/users/."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]

    res = client.get("/api/users/", headers=stu_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_provision_student_account(idor_fixture):
    """Student 1A cannot call admin endpoint /api/users/student."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]

    res = client.post(
        "/api/users/student",
        json={
            "name": "Rogue Student",
            "email": "rogue@edusphere.edu",
            "register_no": "ROGUE-001",
            "department": "CSE",
            "year_semester": "4",
            "section": "A",
        },
        headers=stu_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_create_course(idor_fixture):
    """Student 1A cannot create course."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]

    res = client.post(
        "/api/courses/",
        json={"code": "ROGUE-101", "name": "Rogue Course", "credits": 3},
        headers=stu_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_delete_course(idor_fixture):
    """Student 1A cannot delete course."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]
    crs_1a_id = idor_fixture["course_1a"].id

    res = client.delete(f"/api/courses/{crs_1a_id}", headers=stu_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_mark_attendance(idor_fixture):
    """Student 1A cannot mark attendance."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]
    crs_1a_id = idor_fixture["course_1a"].id

    res = client.post(
        "/api/attendance/mark",
        json={
            "course_id": crs_1a_id,
            "session_date": date.today().isoformat(),
            "period": "Period 1",
            "attendance": [{"student_id": idor_fixture["student_1a"]["user"].id, "status": "PRESENT"}],
        },
        headers=stu_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_grade_submission(idor_fixture):
    """Student 1A cannot grade submission."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]
    sub_1a_id = idor_fixture["sub_1a"].id

    res = client.post(
        f"/api/assignments/submissions/{sub_1a_id}/grade",
        json={"marks_obtained": 100, "feedback": "Self-graded"},
        headers=stu_1a_headers,
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_access_admin_overview(idor_fixture):
    """Student 1A cannot access /api/admin/overview."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]

    res = client.get("/api/admin/overview", headers=stu_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_access_admin_dashboard(idor_fixture):
    """Student 1A cannot access /api/dashboard/admin."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]

    res = client.get("/api/dashboard/admin", headers=stu_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_student_cannot_revoke_certificate(idor_fixture):
    """Student 1A cannot revoke certificate."""
    stu_1a_headers = idor_fixture["student_1a"]["headers"]
    cert_1a_id = idor_fixture["cert_1a"].id

    res = client.post(f"/api/certificates/{cert_1a_id}/revoke", headers=stu_1a_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORY 4: Org 1 Admin vs Org 2 Tenant Isolation
# ─────────────────────────────────────────────────────────────────────────────

def test_admin1_cannot_view_org2_user(idor_fixture):
    """Admin 1 (Org 1) cannot view user in Org 2."""
    admin_1_headers = idor_fixture["admin_1"]["headers"]
    stu_2_id = idor_fixture["student_2"]["user"].id

    res = client.get(f"/api/users/{stu_2_id}", headers=admin_1_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_admin1_cannot_deactivate_org2_user(idor_fixture):
    """Admin 1 cannot change status of Org 2 user."""
    admin_1_headers = idor_fixture["admin_1"]["headers"]
    stu_2_id = idor_fixture["student_2"]["user"].id

    res = client.patch(f"/api/users/{stu_2_id}/status", json={"is_active": False}, headers=admin_1_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_admin1_cannot_reset_org2_user_password(idor_fixture):
    """Admin 1 cannot reset password of Org 2 user."""
    admin_1_headers = idor_fixture["admin_1"]["headers"]
    stu_2_id = idor_fixture["student_2"]["user"].id

    res = client.post(f"/api/users/{stu_2_id}/reset-password", headers=admin_1_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"


def test_admin1_cannot_access_or_modify_org2_course(idor_fixture):
    """Admin 1 cannot manage or view Org 2 course."""
    admin_1_headers = idor_fixture["admin_1"]["headers"]
    crs_2_id = idor_fixture["course_2"].id

    res_get = client.get(f"/api/courses/{crs_2_id}", headers=admin_1_headers)
    assert res_get.status_code in [403, 404], f"Expected 403/404, got {res_get.status_code}: {res_get.text}"

    res_del = client.delete(f"/api/courses/{crs_2_id}", headers=admin_1_headers)
    assert res_del.status_code in [403, 404], f"Expected 403/404, got {res_del.status_code}: {res_del.text}"


def test_admin1_cannot_access_or_revoke_org2_certificate(idor_fixture):
    """Admin 1 cannot view or revoke Org 2 certificate."""
    admin_1_headers = idor_fixture["admin_1"]["headers"]
    cert_2_id = idor_fixture["cert_2"].id

    res_get = client.get(f"/api/certificates/{cert_2_id}", headers=admin_1_headers)
    assert res_get.status_code in [403, 404], f"Expected 403/404, got {res_get.status_code}: {res_get.text}"

    res_rev = client.post(f"/api/certificates/{cert_2_id}/revoke", headers=admin_1_headers)
    assert res_rev.status_code in [403, 404], f"Expected 403/404, got {res_rev.status_code}: {res_rev.text}"
