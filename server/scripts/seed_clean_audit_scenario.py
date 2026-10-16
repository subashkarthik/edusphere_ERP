import os
import sys
import uuid
from datetime import date, datetime, timedelta

# Ensure server directory is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set DB to isolated audit database in PostgreSQL
os.environ["DATABASE_URL"] = "postgresql://postgres:1407@localhost:5432/edusphere_audit"

# Pre-import all models so Base metadata is completely populated
import models
from database import engine, Base, SessionLocal
from models.organization import Organization, OrgPlan
from models.user import User, UserRole, Department, StudentProfile, FacultyProfile
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from models.exam import Quiz, QuizQuestion, QuizAttempt
from utils.password import hash_password

def seed_clean_audit():
    print("Dropping and re-creating pristine database schema from scratch...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    org_id = "org-edusphere"

    try:
        # 0. Organization
        org = Organization(
            id=org_id,
            name="EduSphere University",
            domain="edusphere.edu.in",
            plan=OrgPlan.ENTERPRISE,
        )
        db.add(org)
        db.commit()

        # 1. Organization Department
        dept = Department(
            id="dept-audit-01",
            org_id=org_id,
            name="Computer Science & Engineering",
            code="CSE",
        )
        db.add(dept)
        db.commit()

        # 2. Exactly 1 Admin
        admin = User(
            id="usr-admin-01",
            org_id=org_id,
            email="admin@edusphere.edu.in",
            login_id="AUDITADMIN",
            password_hash=hash_password("AuditAdminPass2026!"),
            name="Auditor Administrator",
            role=UserRole.ADMIN,
            is_active=True,
            must_change_password=False,
        )
        db.add(admin)

        # 3. Exactly 1 Faculty
        faculty = User(
            id="usr-faculty-01",
            org_id=org_id,
            email="faculty@edusphere.edu.in",
            login_id="AUDITFAC",
            password_hash=hash_password("AuditFacultyPass2026!"),
            name="Dr. Audit Professor",
            role=UserRole.FACULTY,
            department_id=dept.id,
            designation="Professor & Academic Chair",
            is_active=True,
            must_change_password=False,
        )
        db.add(faculty)
        db.commit()

        fac_prof = FacultyProfile(
            id=f"prof-{faculty.id}",
            org_id=org_id,
            user_id=faculty.id,
            employee_id="EMP-AUD-001",
            department="Computer Science & Engineering",
            designation="Professor & Academic Chair",
        )
        db.add(fac_prof)
        db.commit()

        # 4. Exactly 3 Students
        students_info = [
            ("usr-student-01", "student_a@edusphere.edu.in", "STUDENT_A", "Student Alpha", "REG-AUD-001"),
            ("usr-student-02", "student_b@edusphere.edu.in", "STUDENT_B", "Student Beta", "REG-AUD-002"),
            ("usr-student-03", "student_c@edusphere.edu.in", "STUDENT_C", "Student Gamma", "REG-AUD-003"),
        ]
        students = []
        for sid, semail, slogin, sname, sreg in students_info:
            st = User(
                id=sid,
                org_id=org_id,
                email=semail,
                login_id=slogin,
                password_hash=hash_password("StudentPass2026!"),
                name=sname,
                role=UserRole.STUDENT,
                department_id=dept.id,
                enrollment_no=sreg,
                is_active=True,
                must_change_password=False,
            )
            db.add(st)
            students.append(st)

            prof = StudentProfile(
                id=f"prof-{sid}",
                org_id=org_id,
                user_id=sid,
                register_no=sreg,
                department="Computer Science",
                year_semester="1",
                section="A",
            )
            db.add(prof)
        db.commit()

        # 5. Exactly 1 Course
        course = Course(
            id="course-audit-101",
            org_id=org_id,
            code="CS-AUDIT-101",
            name="Production Software Auditing",
            title="Production Software Auditing",
            credits=4,
            department_id=dept.id,
            faculty_id=faculty.id,
            semester=1,
            approval_status="ACTIVE",
            is_active=True,
        )
        db.add(course)
        db.commit()

        # Enroll all 3 students in this course
        for st in students:
            enr = Enrollment(
                id=f"enr-{st.id}",
                org_id=org_id,
                student_id=st.id,
                course_id=course.id,
                status=EnrollmentStatus.ACTIVE,
                semester_label="Semester 1",
            )
            db.add(enr)
        db.commit()

        # 6. Exactly 4 Sessions
        today = date.today()
        sessions = []
        for i in range(4):
            sess_date = today - timedelta(days=4 - i)
            sess = AttendanceSession(
                id=f"sess-audit-0{i+1}",
                org_id=org_id,
                course_id=course.id,
                faculty_id=faculty.id,
                session_date=sess_date,
                topic=f"Audit Unit {i+1}: Systems Architecture",
                status=SessionStatus.CLOSED,
            )
            db.add(sess)
            sessions.append(sess)
        db.commit()

        # 7. Attendance Records:
        # Student 1: 4/4 Present = 100.0%
        # Student 2: 3/4 Present, 1/4 Absent = 75.0%
        # Student 3: 2/4 Present, 2/4 Absent = 50.0% (At Risk)
        attendance_plan = {
            "usr-student-01": [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
            "usr-student-02": [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT],
            "usr-student-03": [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
        }

        for st_id, status_list in attendance_plan.items():
            for i, status in enumerate(status_list):
                log = AttendanceLog(
                    id=f"log-{st_id}-{i+1}",
                    org_id=org_id,
                    session_id=sessions[i].id,
                    student_id=st_id,
                    status=status,
                )
                db.add(log)
        db.commit()

        # 8. Exactly 1 Quiz
        quiz = Quiz(
            id="quiz-audit-01",
            org_id=org_id,
            course_id=course.id,
            title="Audit Certification Assessment",
            description="Comprehensive exam on data isolation, security headers, and PII protection.",
            time_limit_minutes=30,
            passing_percentage=60.0,
            total_marks=100,
            is_active=True,
            is_results_published=True,
            created_by=faculty.id,
        )
        db.add(quiz)
        db.commit()

        # 10 Questions (10 marks each = 100 marks)
        for q_idx in range(10):
            question = QuizQuestion(
                id=f"q-audit-{q_idx+1}",
                quiz_id=quiz.id,
                question_text=f"Question {q_idx+1}: What is the primary purpose of multi-tenant org_id scoping in enterprise architectures?",
                option_a="Ensure strict data isolation across tenant boundaries.",
                option_b="Speed up client-side JavaScript bundling.",
                option_c="Allow public access to all records.",
                option_d="Disable database transactions.",
                correct_option="A",
                marks=10,
                order_num=q_idx + 1,
            )
            db.add(question)
        db.commit()

        # Quiz attempts:
        # Student 1: 10/10 correct = 100/100 (100.0%)
        # Student 2: 7/10 correct = 70/100 (70.0%)
        # Student 3: 4/10 correct = 40/100 (40.0%)
        attempts_plan = [
            ("usr-student-01", 100.0, 100.0, True, 10, 10),
            ("usr-student-02", 70.0, 70.0, True, 10, 7),
            ("usr-student-03", 40.0, 40.0, False, 10, 4),
        ]
        for st_id, score, pct, passed, tot_q, corr_q in attempts_plan:
            att = QuizAttempt(
                id=f"att-{st_id}",
                org_id=org_id,
                quiz_id=quiz.id,
                student_id=st_id,
                score=score,
                percentage=pct,
                passed=passed,
                total_questions=tot_q,
                correct_answers=corr_q,
                completed_at=datetime.utcnow() - timedelta(hours=2),
            )
            db.add(att)
        db.commit()

        print("\n==============================================================")
        print("PRISTINE AUDIT SCENARIO CREATED SUCCESSFULLY IN audit_clean.db:")
        print("  - Admin:   admin@edusphere.edu.in   / AuditAdminPass2026!")
        print("  - Faculty: faculty@edusphere.edu.in / AuditFacultyPass2026!")
        print("  - Student A (100% Attn, 100% Quiz): student_a@edusphere.edu.in / StudentPass2026!")
        print("  - Student B ( 75% Attn,  70% Quiz): student_b@edusphere.edu.in / StudentPass2026!")
        print("  - Student C ( 50% Attn,  40% Quiz): student_c@edusphere.edu.in / StudentPass2026! [AT RISK]")
        print("  - Course:  CS-AUDIT-101 (Production Software Auditing)")
        print("  - 4 Sessions, 1 Quiz (10 Questions)")
        print("==============================================================")

    finally:
        db.close()

if __name__ == "__main__":
    seed_clean_audit()
