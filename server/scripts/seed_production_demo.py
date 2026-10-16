"""
EduSphere Production Demo Seed Script
Creates realistic demo data: 1 Admin, 5 Faculty, 10 Students, Courses, Attendance, Quizzes
Runs against the MAIN production PostgreSQL database.
"""
import os
import sys
import uuid
import random
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Use the MAIN production database if not already set
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = "postgresql://postgres:1407@localhost:5432/edusphere"

import models  # pre-import all models
from database import engine, Base, SessionLocal
from models.organization import Organization, OrgPlan
from models.user import User, UserRole, Department, StudentProfile, FacultyProfile
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from models.exam import Quiz, QuizQuestion, QuizAttempt
from utils.password import hash_password

def seed():
    print("=" * 70)
    print("EduSphere Production Demo — Full Database Reset & Seed")
    print("=" * 70)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    org_id = "org-edusphere"

    try:
        # ── Organization ──
        org = Organization(id=org_id, name="EduSphere University", domain="eslms.online", plan=OrgPlan.ENTERPRISE)
        db.add(org)
        db.commit()

        # ── Departments ──
        depts = [
            ("dept-cse", "Computer Science & Engineering", "CSE"),
            ("dept-ece", "Electronics & Communication", "ECE"),
            ("dept-mech", "Mechanical Engineering", "MECH"),
        ]
        dept_objs = {}
        for did, dname, dcode in depts:
            d = Department(id=did, org_id=org_id, name=dname, code=dcode)
            db.add(d)
            dept_objs[dcode] = d
        db.commit()

        # ── 1 Admin ──
        admin = User(
            id="usr-admin-01", org_id=org_id,
            email="admin@eslms.online", login_id="ADMIN",
            password_hash=hash_password("Admin@2026!"),
            name="Dr. Rajesh Kumar", role=UserRole.ADMIN,
            is_active=True, must_change_password=False,
        )
        db.add(admin)
        db.commit()

        # ── 5 Faculty ──
        faculty_data = [
            ("usr-fac-01", "priya.sharma@eslms.online",   "FAC001", "Dr. Priya Sharma",      "CSE",  "Associate Professor"),
            ("usr-fac-02", "mohan.krishnan@eslms.online",  "FAC002", "Prof. Mohan Krishnan",   "CSE",  "Professor & HOD"),
            ("usr-fac-03", "ananya.iyer@eslms.online",     "FAC003", "Dr. Ananya Iyer",        "ECE",  "Assistant Professor"),
            ("usr-fac-04", "suresh.reddy@eslms.online",    "FAC004", "Dr. Suresh Reddy",       "ECE",  "Associate Professor"),
            ("usr-fac-05", "kavitha.nair@eslms.online",    "FAC005", "Prof. Kavitha Nair",     "MECH", "Professor & HOD"),
        ]
        fac_objs = {}
        for fid, femail, flogin, fname, fdept, fdesig in faculty_data:
            f = User(
                id=fid, org_id=org_id, email=femail, login_id=flogin,
                password_hash=hash_password("Faculty@2026!"),
                name=fname, role=UserRole.FACULTY,
                department_id=dept_objs[fdept].id, designation=fdesig,
                is_active=True, must_change_password=False,
            )
            db.add(f)
            fac_objs[fid] = f

            fp = FacultyProfile(
                id=f"prof-{fid}", org_id=org_id, user_id=fid,
                employee_id=flogin, department=dept_objs[fdept].name, designation=fdesig,
            )
            db.add(fp)
        db.commit()

        # ── 10 Students ──
        student_data = [
            ("usr-stu-01", "aarav.kumar@eslms.online",     "STU001", "Aarav Kumar",        "CSE",  "21CSE001"),
            ("usr-stu-02", "bhavya.sharma@eslms.online",   "STU002", "Bhavya Sharma",      "CSE",  "21CSE002"),
            ("usr-stu-03", "chirag.patel@eslms.online",    "STU003", "Chirag Patel",       "CSE",  "21CSE003"),
            ("usr-stu-04", "diya.menon@eslms.online",      "STU004", "Diya Menon",         "CSE",  "21CSE004"),
            ("usr-stu-05", "eshan.gupta@eslms.online",     "STU005", "Eshan Gupta",        "CSE",  "21CSE005"),
            ("usr-stu-06", "fatima.sheikh@eslms.online",   "STU006", "Fatima Sheikh",      "ECE",  "21ECE001"),
            ("usr-stu-07", "gopal.rajan@eslms.online",     "STU007", "Gopal Rajan",        "ECE",  "21ECE002"),
            ("usr-stu-08", "harini.das@eslms.online",      "STU008", "Harini Das",         "ECE",  "21ECE003"),
            ("usr-stu-09", "ishaan.mehta@eslms.online",    "STU009", "Ishaan Mehta",       "MECH", "21MECH001"),
            ("usr-stu-10", "jaya.lakshmi@eslms.online",    "STU010", "Jaya Lakshmi",       "MECH", "21MECH002"),
        ]
        stu_objs = {}
        for sid, semail, slogin, sname, sdept, sreg in student_data:
            s = User(
                id=sid, org_id=org_id, email=semail, login_id=slogin,
                password_hash=hash_password("Student@2026!"),
                name=sname, role=UserRole.STUDENT,
                department_id=dept_objs[sdept].id, enrollment_no=sreg,
                is_active=True, must_change_password=False,
            )
            db.add(s)
            stu_objs[sid] = s

            sp = StudentProfile(
                id=f"prof-{sid}", org_id=org_id, user_id=sid,
                register_no=sreg, department=dept_objs[sdept].name,
                year_semester="3", section="A",
            )
            db.add(sp)
        db.commit()

        # ── 5 Courses ──
        course_data = [
            ("crs-01", "CS301",   "Data Structures & Algorithms",     "CSE",  "usr-fac-01", 4),
            ("crs-02", "CS302",   "Database Management Systems",      "CSE",  "usr-fac-02", 3),
            ("crs-03", "EC301",   "Digital Signal Processing",        "ECE",  "usr-fac-03", 4),
            ("crs-04", "EC302",   "VLSI Design",                      "ECE",  "usr-fac-04", 3),
            ("crs-05", "ME301",   "Thermodynamics & Heat Transfer",   "MECH", "usr-fac-05", 4),
        ]
        crs_objs = {}
        for cid, ccode, cname, cdept, cfac, ccred in course_data:
            c = Course(
                id=cid, org_id=org_id, code=ccode, name=cname, title=cname,
                credits=ccred, department_id=dept_objs[cdept].id,
                faculty_id=cfac, semester=5, approval_status="ACTIVE", is_active=True,
            )
            db.add(c)
            crs_objs[cid] = c
        db.commit()

        # ── Enrollments ──
        # CSE students → CS301, CS302 | ECE students → EC301, EC302 | MECH → ME301
        enroll_map = {
            "crs-01": ["usr-stu-01","usr-stu-02","usr-stu-03","usr-stu-04","usr-stu-05"],
            "crs-02": ["usr-stu-01","usr-stu-02","usr-stu-03","usr-stu-04","usr-stu-05"],
            "crs-03": ["usr-stu-06","usr-stu-07","usr-stu-08"],
            "crs-04": ["usr-stu-06","usr-stu-07","usr-stu-08"],
            "crs-05": ["usr-stu-09","usr-stu-10"],
        }
        for cid, sids in enroll_map.items():
            for sid in sids:
                enr = Enrollment(
                    id=f"enr-{cid}-{sid}", org_id=org_id,
                    student_id=sid, course_id=cid,
                    status=EnrollmentStatus.ACTIVE, semester_label="Semester 5",
                )
                db.add(enr)
        db.commit()

        # ── Attendance Sessions (8 sessions per course, last 2 weeks) ──
        today = date.today()
        all_sessions = {}
        for cid, crs in crs_objs.items():
            sessions = []
            for i in range(8):
                sd = today - timedelta(days=14 - i * 2)
                sess = AttendanceSession(
                    id=f"sess-{cid}-{i+1}", org_id=org_id,
                    course_id=cid, faculty_id=crs.faculty_id,
                    session_date=sd, topic=f"Unit {i//2 + 1} - Lecture {i%2 + 1}",
                    status=SessionStatus.CLOSED,
                )
                db.add(sess)
                sessions.append(sess)
            all_sessions[cid] = sessions
        db.commit()

        # ── Attendance Logs (varied attendance patterns) ──
        # Percentage targets per student (approximate)
        attn_targets = {
            "usr-stu-01": 1.00,  # 100%  — perfect
            "usr-stu-02": 0.88,  # 88%
            "usr-stu-03": 0.75,  # 75%   — borderline
            "usr-stu-04": 0.63,  # 63%   — at risk
            "usr-stu-05": 0.50,  # 50%   — critical
            "usr-stu-06": 0.88,
            "usr-stu-07": 0.75,
            "usr-stu-08": 1.00,
            "usr-stu-09": 0.88,
            "usr-stu-10": 0.63,
        }
        random.seed(42)
        for cid, sids in enroll_map.items():
            sessions = all_sessions[cid]
            for sid in sids:
                target = attn_targets[sid]
                for i, sess in enumerate(sessions):
                    # First N sessions present based on target
                    if i < int(target * len(sessions)):
                        status = AttendanceStatus.PRESENT
                    else:
                        status = AttendanceStatus.ABSENT
                    log = AttendanceLog(
                        id=f"log-{cid}-{sid}-{i+1}", org_id=org_id,
                        session_id=sess.id, student_id=sid, status=status,
                    )
                    db.add(log)
        db.commit()

        # ── 1 Quiz per course (5 questions, 50 marks each) ──
        for cid, crs in crs_objs.items():
            quiz = Quiz(
                id=f"quiz-{cid}", org_id=org_id, course_id=cid,
                title=f"{crs.name} - Mid Semester Quiz",
                description=f"Mid-semester evaluation for {crs.code}",
                time_limit_minutes=20, passing_percentage=50.0,
                total_marks=50, is_active=True, is_results_published=True,
                created_by=crs.faculty_id,
            )
            db.add(quiz)
            db.commit()

            for q in range(5):
                qq = QuizQuestion(
                    id=f"qq-{cid}-{q+1}", quiz_id=quiz.id,
                    question_text=f"Q{q+1}: Conceptual question on {crs.name} Unit {q+1}",
                    option_a="Option A — Correct answer",
                    option_b="Option B — Distractor",
                    option_c="Option C — Distractor",
                    option_d="Option D — Distractor",
                    correct_option="A", marks=10, order_num=q+1,
                )
                db.add(qq)
            db.commit()

            # Quiz attempts for enrolled students
            score_map = {
                "usr-stu-01": (45, 90.0, True, 5, 5),   # excellent
                "usr-stu-02": (40, 80.0, True, 5, 4),
                "usr-stu-03": (35, 70.0, True, 5, 4),
                "usr-stu-04": (25, 50.0, True, 5, 3),
                "usr-stu-05": (20, 40.0, False, 5, 2),   # failed
                "usr-stu-06": (42, 84.0, True, 5, 4),
                "usr-stu-07": (30, 60.0, True, 5, 3),
                "usr-stu-08": (48, 96.0, True, 5, 5),
                "usr-stu-09": (38, 76.0, True, 5, 4),
                "usr-stu-10": (22, 44.0, False, 5, 2),
            }
            for sid in enroll_map[cid]:
                sc, pct, passed, tq, cq = score_map[sid]
                att = QuizAttempt(
                    id=f"att-{cid}-{sid}", org_id=org_id,
                    quiz_id=quiz.id, student_id=sid,
                    score=float(sc), percentage=pct,
                    passed=passed, total_questions=tq, correct_answers=cq,
                    completed_at=datetime.utcnow() - timedelta(days=3),
                )
                db.add(att)
            db.commit()

        print("\n" + "=" * 70)
        print("PRODUCTION DEMO DATA SEEDED SUCCESSFULLY!")
        print("=" * 70)
        print()
        print("╔══════════════════════════════════════════════════════════════════╗")
        print("║                    LOGIN CREDENTIALS                            ║")
        print("╠══════════════════════════════════════════════════════════════════╣")
        print("║  ADMIN                                                          ║")
        print("║    Login ID: ADMIN        Password: Admin@2026!                 ║")
        print("╠══════════════════════════════════════════════════════════════════╣")
        print("║  FACULTY (all use Password: Faculty@2026!)                      ║")
        print("║    FAC001 — Dr. Priya Sharma       (CSE)                        ║")
        print("║    FAC002 — Prof. Mohan Krishnan   (CSE)                        ║")
        print("║    FAC003 — Dr. Ananya Iyer        (ECE)                        ║")
        print("║    FAC004 — Dr. Suresh Reddy       (ECE)                        ║")
        print("║    FAC005 — Prof. Kavitha Nair      (MECH)                      ║")
        print("╠══════════════════════════════════════════════════════════════════╣")
        print("║  STUDENTS (all use Password: Student@2026!)                     ║")
        print("║    STU001 — Aarav Kumar     (CSE)  100% Attn                    ║")
        print("║    STU002 — Bhavya Sharma   (CSE)  88% Attn                     ║")
        print("║    STU003 — Chirag Patel    (CSE)  75% Attn                     ║")
        print("║    STU004 — Diya Menon      (CSE)  63% At Risk                  ║")
        print("║    STU005 — Eshan Gupta     (CSE)  50% Critical                 ║")
        print("║    STU006 — Fatima Sheikh   (ECE)  88% Attn                     ║")
        print("║    STU007 — Gopal Rajan     (ECE)  75% Attn                     ║")
        print("║    STU008 — Harini Das      (ECE)  100% Attn                    ║")
        print("║    STU009 — Ishaan Mehta    (MECH) 88% Attn                     ║")
        print("║    STU010 — Jaya Lakshmi    (MECH) 63% At Risk                  ║")
        print("╚══════════════════════════════════════════════════════════════════╝")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
