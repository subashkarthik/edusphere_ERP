import uuid
import random
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from models.content import Assignment, Submission, Module, Lesson, LessonProgress
from models.exam import Quiz, QuizAttempt
from models.certificate import CertificatePolicy, CertificateSetting
from utils.password import hash_password
from utils.jwt import create_access_token
from services.metrics import (
    attendance_for,
    attendance_overall,
    assessment_for,
    progress_for,
    certificate_eligibility,
)

client = TestClient(app)


def get_or_create_test_dept(db, org_id="org-edusphere"):
    dept = db.query(Department).filter(Department.org_id == org_id).first()
    if not dept:
        dept = Department(
            id=f"dept-test-{uuid.uuid4().hex[:6]}",
            org_id=org_id,
            name="Computer Science & Engineering",
            code="CSE",
        )
        db.add(dept)
        db.commit()
    return dept


def get_or_create_test_faculty(db, org_id="org-edusphere"):
    faculty = db.query(User).filter(User.org_id == org_id, User.role == UserRole.FACULTY).first()
    if not faculty:
        faculty = User(
            id=f"fac-test-{uuid.uuid4().hex[:6]}",
            org_id=org_id,
            email=f"fac_{uuid.uuid4().hex[:6]}@edusphere.edu.in",
            password_hash=hash_password("Password123!"),
            name="Prof. Consistency",
            role=UserRole.FACULTY,
        )
        db.add(faculty)
        db.commit()
    return faculty


def test_single_course_4_sessions_mark_3_of_4():
    """
    Test requirement:
    Create 1 course, 4 sessions, mark attendance 3/4
    → dashboard, attendance page, certificate checklist all show exactly 75.0%.
    """
    db = SessionLocal()
    try:
        org_id = "org-edusphere"
        dept = get_or_create_test_dept(db, org_id)

        student_id = f"st-test-4sess-{uuid.uuid4().hex[:8]}"
        student_email = f"{student_id}@edusphere.edu.in"
        student = User(
            id=student_id,
            org_id=org_id,
            email=student_email,
            password_hash=hash_password("Password123!"),
            name="Test Metric Student",
            role=UserRole.STUDENT,
            enrollment_no=f"REG-{uuid.uuid4().hex[:6].upper()}",
        )
        db.add(student)

        course_id = f"c-test-4sess-{uuid.uuid4().hex[:8]}"
        course = Course(
            id=course_id,
            org_id=org_id,
            code=f"CS-{uuid.uuid4().hex[:4].upper()}",
            name="Metric Test Course",
            credits=4,
            department_id=dept.id,
            is_active=True,
        )
        db.add(course)

        enr = Enrollment(
            id=str(uuid.uuid4()),
            org_id=org_id,
            student_id=student.id,
            course_id=course.id,
            status=EnrollmentStatus.ACTIVE,
        )
        db.add(enr)
        db.commit()

        # Create 4 sessions held up to today
        today = date.today()
        faculty = get_or_create_test_faculty(db, org_id)
        sessions = []
        for i in range(4):
            sess_date = today - timedelta(days=4 - i)
            sess = AttendanceSession(
                id=str(uuid.uuid4()),
                org_id=org_id,
                course_id=course.id,
                faculty_id=faculty.id,
                session_date=sess_date,
                status=SessionStatus.CLOSED,
            )
            db.add(sess)
            sessions.append(sess)
        db.commit()

        # Mark 3 present, 1 absent
        for i, sess in enumerate(sessions):
            st_status = AttendanceStatus.PRESENT if i < 3 else AttendanceStatus.ABSENT
            log = AttendanceLog(
                id=str(uuid.uuid4()),
                org_id=org_id,
                session_id=sess.id,
                student_id=student.id,
                status=st_status,
            )
            db.add(log)
        db.commit()

        # 1. Direct metrics service check
        m_course = attendance_for(db, org_id, student.id, course.id)
        assert m_course["held"] == 4
        assert m_course["attended"] == 3.0
        assert m_course["pct"] == 75.0

        m_overall = attendance_overall(db, org_id, student.id)
        assert m_overall["held"] == 4
        assert m_overall["attended"] == 3.0
        assert m_overall["pct"] == 75.0

        # Generate auth token for student
        token = create_access_token({"sub": student.id, "role": student.role.value, "org_id": org_id})
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Check /api/me/summary
        res_summary = client.get("/api/me/summary", headers=headers)
        assert res_summary.status_code == 200
        summary_data = res_summary.json()
        assert summary_data["overall_attendance"]["pct"] == 75.0
        c_item = next(c for c in summary_data["courses"] if c["course_id"] == course.id)
        assert c_item["attendance"]["pct"] == 75.0

        # 3. Check /api/me/courses/{id}/metrics
        res_course_metrics = client.get(f"/api/me/courses/{course.id}/metrics", headers=headers)
        assert res_course_metrics.status_code == 200
        course_metrics = res_course_metrics.json()
        assert course_metrics["attendance"]["pct"] == 75.0
        assert course_metrics["attendance"]["held"] == 4
        assert course_metrics["attendance"]["attended"] == 3.0

        # 4. Check /api/attendance/me
        res_att_me = client.get("/api/attendance/me", headers=headers)
        assert res_att_me.status_code == 200
        att_me_data = res_att_me.json()
        assert att_me_data["overall_percentage"] == 75.0
        att_course = next(c for c in att_me_data["summary"] if c["course_id"] == course.id)
        assert att_course["percentage"] == 75.0

        # 5. Check /api/dashboard/student
        res_dash = client.get("/api/dashboard/student", headers=headers)
        assert res_dash.status_code == 200
        dash_data = res_dash.json()
        assert dash_data["overall_attendance_pct"] == 75.0
        dash_course = next(c for c in dash_data["courses"] if c["id"] == course.id)
        assert dash_course["attendance_pct"] == 75.0

        # 6. Check /api/certificates/my-certificates
        res_cert = client.get("/api/certificates/my-certificates", headers=headers)
        assert res_cert.status_code == 200
        certs = res_cert.json()
        course_cert = next(c for c in certs if c["course_id"] == course.id)
        assert course_cert["attendance_pct"] == 75.0
        assert course_cert["attendance_met"] is True

    finally:
        db.close()


def test_zero_sessions_returns_null_pct():
    """
    Test requirement:
    When a student has no sessions yet: pct = null → UI shows 'No classes held yet', not 0% and not 100%.
    """
    db = SessionLocal()
    try:
        org_id = "org-edusphere"
        dept = get_or_create_test_dept(db, org_id)
        student_id = f"st-test-nosess-{uuid.uuid4().hex[:8]}"
        student = User(
            id=student_id,
            org_id=org_id,
            email=f"{student_id}@edusphere.edu.in",
            password_hash=hash_password("Password123!"),
            name="Zero Session Student",
            role=UserRole.STUDENT,
            enrollment_no=f"REG-{uuid.uuid4().hex[:6].upper()}",
        )
        db.add(student)

        course = Course(
            id=f"c-nosess-{uuid.uuid4().hex[:8]}",
            org_id=org_id,
            code=f"CS-{uuid.uuid4().hex[:4].upper()}",
            name="Course With No Sessions",
            credits=3,
            department_id=dept.id,
            is_active=True,
        )
        db.add(course)

        enr = Enrollment(
            id=str(uuid.uuid4()),
            org_id=org_id,
            student_id=student.id,
            course_id=course.id,
            status=EnrollmentStatus.ACTIVE,
        )
        db.add(enr)
        db.commit()

        # Metrics service directly
        m_course = attendance_for(db, org_id, student.id, course.id)
        assert m_course["held"] == 0
        assert m_course["attended"] == 0
        assert m_course["pct"] is None

        m_overall = attendance_overall(db, org_id, student.id)
        assert m_overall["held"] == 0
        assert m_overall["attended"] == 0
        assert m_overall["pct"] is None

        token = create_access_token({"sub": student.id, "role": student.role.value, "org_id": org_id})
        headers = {"Authorization": f"Bearer {token}"}

        # /api/me/summary
        res_summary = client.get("/api/me/summary", headers=headers)
        assert res_summary.status_code == 200
        summary_data = res_summary.json()
        assert summary_data["overall_attendance"]["pct"] is None

        # /api/attendance/me
        res_att_me = client.get("/api/attendance/me", headers=headers)
        assert res_att_me.status_code == 200
        att_me_data = res_att_me.json()
        assert att_me_data["overall_percentage"] is None
        assert att_me_data["summary"][0]["percentage"] is None

        # /api/dashboard/student
        res_dash = client.get("/api/dashboard/student", headers=headers)
        assert res_dash.status_code == 200
        dash_data = res_dash.json()
        assert dash_data["overall_attendance_pct"] is None
        assert dash_data["courses"][0]["attendance_pct"] is None

    finally:
        db.close()


def test_consistency_across_20_random_students():
    """
    Consistency test: for 20 random students, the number on /me/summary equals
    the sum of per-course numbers equals what the Attendance page endpoint returns.
    (This catches the '87% vs 96.3%' bug.)
    """
    db = SessionLocal()
    try:
        org_id = "org-edusphere"
        dept = get_or_create_test_dept(db, org_id)
        today = date.today()

        # Create 3 courses with different session counts
        courses = []
        for i in range(3):
            c = Course(
                id=f"c-rand-{i}-{uuid.uuid4().hex[:6]}",
                org_id=org_id,
                code=f"RAND-{i}-{uuid.uuid4().hex[:4].upper()}",
                name=f"Random Test Course {i}",
                credits=3,
                department_id=dept.id,
                is_active=True,
            )
            db.add(c)
            courses.append(c)
        db.commit()

        # Create sessions: course 0 has 10 sessions, course 1 has 6 sessions, course 2 has 4 sessions
        faculty = get_or_create_test_faculty(db, org_id)
        course_sessions = {}
        for idx, c in enumerate(courses):
            count = [10, 6, 4][idx]
            c_sess_list = []
            for s_idx in range(count):
                sess = AttendanceSession(
                    id=str(uuid.uuid4()),
                    org_id=org_id,
                    course_id=c.id,
                    faculty_id=faculty.id,
                    session_date=today - timedelta(days=count - s_idx),
                    status=SessionStatus.CLOSED,
                )
                db.add(sess)
                c_sess_list.append(sess)
            course_sessions[c.id] = c_sess_list
        db.commit()

        # Create 20 random students and enroll them in the courses
        students = []
        for i in range(20):
            st = User(
                id=f"st-rnd-consist-{i}-{uuid.uuid4().hex[:6]}",
                org_id=org_id,
                email=f"rnd_student_{i}_{uuid.uuid4().hex[:6]}@edusphere.edu.in",
                password_hash=hash_password("Password123!"),
                name=f"Random Student {i}",
                role=UserRole.STUDENT,
                enrollment_no=f"REG-RND-{uuid.uuid4().hex[:6].upper()}-{i:03d}",
            )
            db.add(st)
            students.append(st)

            # Enroll in each course and randomly mark attendance
            for c in courses:
                enr = Enrollment(
                    id=str(uuid.uuid4()),
                    org_id=org_id,
                    student_id=st.id,
                    course_id=c.id,
                    status=EnrollmentStatus.ACTIVE,
                )
                db.add(enr)

                for sess in course_sessions[c.id]:
                    # Randomize attendance: 70% present, 10% od, 10% late, 10% absent
                    r = random.random()
                    if r < 0.70:
                        status = AttendanceStatus.PRESENT
                    elif r < 0.80:
                        status = AttendanceStatus.OD
                    elif r < 0.90:
                        status = AttendanceStatus.LATE
                    else:
                        status = AttendanceStatus.ABSENT

                    log = AttendanceLog(
                        id=str(uuid.uuid4()),
                        org_id=org_id,
                        session_id=sess.id,
                        student_id=st.id,
                        status=status,
                    )
                    db.add(log)
        db.commit()

        # Now test consistency for all 20 students
        for st in students:
            token = create_access_token({"sub": st.id, "role": st.role.value, "org_id": org_id})
            headers = {"Authorization": f"Bearer {token}"}

            res_summary = client.get("/api/me/summary", headers=headers)
            assert res_summary.status_code == 200
            summary_json = res_summary.json()

            res_att = client.get("/api/attendance/me", headers=headers)
            assert res_att.status_code == 200
            att_json = res_att.json()

            # 1. Summary overall percentage must equal Attendance endpoint overall percentage
            summary_overall_pct = summary_json["overall_attendance"]["pct"]
            att_overall_pct = att_json["overall_percentage"]
            assert summary_overall_pct == att_overall_pct, (
                f"Mismatch for student {st.id}: /me/summary has {summary_overall_pct}% "
                f"but /attendance/me has {att_overall_pct}%"
            )

            # 2. Check mathematical weighted sum:
            # overall pct == (sum(attended_c) / sum(held_c)) * 100
            total_attended = sum(c["attendance"]["attended"] for c in summary_json["courses"])
            total_held = sum(c["attendance"]["held"] for c in summary_json["courses"])
            expected_weighted_pct = round((total_attended / total_held) * 100.0, 1)

            assert summary_overall_pct == expected_weighted_pct, (
                f"Mathematical mismatch for student {st.id}: "
                f"got {summary_overall_pct}%, expected {expected_weighted_pct}%"
            )

            # 3. Check per-course equality across both endpoints
            for c_sum in summary_json["courses"]:
                c_att = next(x for x in att_json["summary"] if x["course_id"] == c_sum["course_id"])
                assert c_sum["attendance"]["pct"] == c_att["percentage"], (
                    f"Course {c_sum['course_id']} mismatch: "
                    f"summary={c_sum['attendance']['pct']}% vs attendance_me={c_att['percentage']}%"
                )
                assert c_sum["attendance"]["held"] == c_att["classes_held"]
                assert c_sum["attendance"]["attended"] == c_att["classes_attended"]

    finally:
        db.close()
