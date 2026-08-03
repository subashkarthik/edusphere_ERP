"""
EduSphere LMS Backend — Database Seeder
EduSphere LMS — populates the SQLite database with realistic demo data
that exactly matches the current frontend UI mock data for visual parity.

Run: python -m utils.seed
"""
import sys
import os
import uuid
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session

# Fix Windows console encoding for Unicode
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from database import engine, SessionLocal, Base
from models.organization import Organization, OrgPlan
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment, TimetableEntry, CourseMaterial, TimetableEntryType, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from models.exam import ExamSchedule, ExamResult, ExamType
from models.misc import Announcement, Priority, LibraryBook
from models.audit import AuditLog
from models.intelligence import LearningMetric, Recommendation, UserNotification
from models.content import Module, Lesson, Assignment, Submission, Discussion, ContentType, AssignmentStatus
from models.finance import FeeStructure, FeePayment, PaymentStatus, LedgerEntry
from models.placement import PlacementDrive, PlacementApplication, PlacementStats, DriveStatus, ApplicationStatus
from models.certificate import Certificate, CertificateSetting, CertificateStatus
from utils.password import hash_password



def seed_database():
    """Drop all tables, recreate, and seed with demo data."""
    print("🗄️  Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("🏗️  Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        _seed_all(db)
        db.commit()
        print(" ✅ Database seeded successfully!")
        print("=" * 50)
        print("🔑 Student Credentials:")
        print("   Email:    alex.j@edusphere.edu.in")
        print("   Key:      student123")
        print("🔑 Faculty Credentials:")
        print("   Email:    arun.kumar@edusphere.edu.in")
        print("   Key:      faculty123")
        print("🔑 Admin Credentials:")
        print("   Email:    admin@edusphere.edu.in")
        print("   Key:      admin123")
        print("=" * 50)
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()


def _seed_all(db: Session):
    # ... (existing seeding code)
    # I'll need to see where to append the content seeding.

    # ─── ORGANIZATION ───
    org_edusphere = Organization(id="org-edusphere", name="EduSphere University", domain="edusphere.edu.in", plan=OrgPlan.ENTERPRISE)
    db.add(org_edusphere)
    db.flush()
    print("   ✓ Organization created")

    # ─── DEPARTMENTS ───
    dept_cse = Department(id="dept-cse", org_id="org-edusphere", name="Computer Science", code="CSE")
    dept_mech = Department(id="dept-mech", org_id="org-edusphere", name="Mechanical Engineering", code="MECH")
    dept_eee = Department(id="dept-eee", org_id="org-edusphere", name="Electrical Engineering", code="EEE")
    db.add_all([dept_cse, dept_mech, dept_eee])
    db.flush()
    print("   ✓ Departments created")

    # ─── USERS ───
    admin = User(
        id="user-admin", org_id="org-edusphere", email="admin@edusphere.edu.in",
        password_hash=hash_password("admin123"), name="Institutional Admin",
        role=UserRole.ADMIN, department_id="dept-cse",
        avatar="https://picsum.photos/seed/admin/200/200",
    )
    faculty_arun = User(
        id="user-arun", org_id="org-edusphere", email="arun.kumar@edusphere.edu.in",
        password_hash=hash_password("faculty123"), name="Dr. Arun Kumar",
        role=UserRole.FACULTY, department_id="dept-cse", designation="HoD",
        avatar="https://picsum.photos/seed/arun/200/200",
    )
    faculty_devi = User(
        id="user-devi", org_id="org-edusphere", email="s.devi@edusphere.edu.in",
        password_hash=hash_password("faculty123"), name="Prof. S. Devi",
        role=UserRole.FACULTY, department_id="dept-cse", designation="Associate Professor",
        avatar="https://picsum.photos/seed/devi/200/200",
    )
    faculty_raj = User(
        id="user-raj", org_id="org-edusphere", email="p.raj@edusphere.edu.in",
        password_hash=hash_password("faculty123"), name="Dr. P. Raj",
        role=UserRole.FACULTY, department_id="dept-mech", designation="Professor",
        avatar="https://picsum.photos/seed/raj/200/200",
    )
    faculty_priya = User(
        id="user-priya", org_id="org-edusphere", email="k.priya@edusphere.edu.in",
        password_hash=hash_password("faculty123"), name="Mrs. K. Priya",
        role=UserRole.FACULTY, department_id="dept-cse", designation="Assistant Professor",
        avatar="https://picsum.photos/seed/priya/200/200",
    )
    student_alex = User(
        id="user-alex", org_id="org-edusphere", email="alex.j@edusphere.edu.in",
        password_hash=hash_password("student123"), name="Alex Johnson",
        role=UserRole.STUDENT, department_id="dept-cse",
        enrollment_no="UNI/2021/CS/042",
        avatar="https://ui-avatars.com/api/?name=Alex+Johnson&background=4f46e5&color=fff",
    )
    student_priya = User(
        id="user-priya-s", org_id="org-edusphere", email="priya.s@edusphere.edu.in",
        password_hash=hash_password("student123"), name="Priya Sharma",
        role=UserRole.STUDENT, department_id="dept-cse",
        enrollment_no="UNI/2021/CS/043",
        avatar="https://ui-avatars.com/api/?name=Priya+Sharma&background=ec4899&color=fff",
    )
    student_rahul = User(
        id="user-rahul", org_id="org-edusphere", email="rahul.v@edusphere.edu.in",
        password_hash=hash_password("student123"), name="Rahul Verma",
        role=UserRole.STUDENT, department_id="dept-eee",
        enrollment_no="UNI/2021/EE/044",
        avatar="https://ui-avatars.com/api/?name=Rahul+Verma&background=8b5cf6&color=fff",
    )
    student_ananya = User(
        id="user-ananya", org_id="org-edusphere", email="ananya.r@edusphere.edu.in",
        password_hash=hash_password("student123"), name="Ananya Ramachandran",
        role=UserRole.STUDENT, department_id="dept-cse",
        enrollment_no="UNI/2021/CS/045",
        avatar="https://ui-avatars.com/api/?name=Ananya+R&background=06b6d4&color=fff",
    )
    student_karthik = User(
        id="user-karthik", org_id="org-edusphere", email="karthik.m@edusphere.edu.in",
        password_hash=hash_password("student123"), name="Karthik Muthusamy",
        role=UserRole.STUDENT, department_id="dept-mech",
        enrollment_no="UNI/2021/ME/046",
        avatar="https://ui-avatars.com/api/?name=Karthik+M&background=f59e0b&color=fff",
    )
    student_sarah = User(
        id="user-sarah", org_id="org-edusphere", email="sarah.m@edusphere.edu.in",
        password_hash=hash_password("student123"), name="Sarah Miller",
        role=UserRole.STUDENT, department_id="dept-mech",
        enrollment_no="UNI/2021/ME/102",
        avatar="https://ui-avatars.com/api/?name=Sarah+Miller&background=10b981&color=fff",
    )
    student_kevin = User(
        id="user-kevin", org_id="org-edusphere", email="kevin.d@edusphere.edu.in",
        password_hash=hash_password("student123"), name="Kevin Durant",
        role=UserRole.STUDENT, department_id="dept-eee",
        enrollment_no="UNI/2021/EE/088",
        avatar="https://ui-avatars.com/api/?name=Kevin+Durant&background=3b82f6&color=fff",
    )
    student_bella = User(
        id="user-bella", org_id="org-edusphere", email="bella.t@edusphere.edu.in",
        password_hash=hash_password("student123"), name="Bella Thorne",
        role=UserRole.STUDENT, department_id="dept-cse",
        enrollment_no="UNI/2021/CS/047",
        avatar="https://ui-avatars.com/api/?name=Bella+Thorne&background=ef4444&color=fff",
    )
    student_charlie = User(
        id="user-charlie", org_id="org-edusphere", email="charlie.d@edusphere.edu.in",
        password_hash=hash_password("student123"), name="Charlie Dave",
        role=UserRole.STUDENT, department_id="dept-cse",
        enrollment_no="UNI/2021/CS/048",
        avatar="https://ui-avatars.com/api/?name=Charlie+Dave&background=64748b&color=fff",
    )
    student_diana = User(
        id="user-diana", org_id="org-edusphere", email="diana.p@edusphere.edu.in",
        password_hash=hash_password("student123"), name="Diana Prince",
        role=UserRole.STUDENT, department_id="dept-cse",
        enrollment_no="UNI/2021/CS/049",
        avatar="https://ui-avatars.com/api/?name=Diana+Prince&background=a855f7&color=fff",
    )

    bursar_admin = User(
        id="user-bursar", org_id="org-edusphere", email="bursar@edusphere.edu.in",
        password_hash=hash_password("admin123"), name="Bursar Finance Officer",
        role=UserRole.ADMIN, department_id="dept-cse", designation="Bursar Lead",
        avatar="https://ui-avatars.com/api/?name=Bursar+Officer&background=d97706&color=fff",
    )

    all_users = [admin, bursar_admin, faculty_arun, faculty_devi, faculty_raj, faculty_priya,
                 student_alex, student_priya, student_rahul, student_ananya, student_karthik,
                 student_sarah, student_kevin, student_bella, student_charlie, student_diana]
    db.add_all(all_users)
    db.flush()
    print("   ✓ Users created (4 faculty, 10 students, 2 admins)")

    # Set department heads
    dept_cse.head_id = "user-arun"

    # ─── COURSES (matching MOCK_ATTENDANCE + MOCK_TIMETABLE) ───
    courses_data = [
        ("crs-cc", "CYB101", "Ethical Hacking & AI", 4, "dept-cse", "user-arun", "Mon, Wed 09:00 AM"),
        ("crs-cs", "CYB102", "Network Security", 3, "dept-cse", "user-devi", "Tue, Thu 11:30 AM"),
        ("crs-mad", "PRG201", "Python Programming", 3, "dept-cse", "user-priya", "Wed, Fri 10:00 AM"),
        ("crs-ml", "PRG205", "SQL Database Engineering", 4, "dept-cse", "user-raj", "Mon, Thu 02:00 PM"),
        ("crs-ccl", "PRG202", "C++ Programming", 2, "dept-cse", "user-arun", "Fri 02:00 PM"),
        ("crs-aa", "PRG203", "Java Programming", 4, "dept-cse", "user-arun", "Mon 09:00 AM"),
        ("crs-cn", "SFT301", "Communication & Soft Skills", 3, "dept-cse", "user-devi", "Mon 10:15 AM"),
        ("crs-osl", "SFT302", "Critical Thinking & Problem Solving", 2, "dept-cse", "user-raj", "Tue 09:00 AM"),
        ("crs-we", "SFT303", "Teamwork & Collaboration", 3, "dept-cse", "user-priya", "Wed 11:30 AM"),
    ]

    courses = {}
    for cid, code, name, credits, dept, fac, sched in courses_data:
        c = Course(id=cid, org_id="org-edusphere", code=code, name=name, credits=credits, department_id=dept, faculty_id=fac, schedule=sched)
        courses[cid] = c
        db.add(c)
    db.flush()
    print("   ✓ Courses created (9 courses)")

    # ─── ENROLLMENTS ───
    cse_students = [student_alex, student_bella, student_charlie, student_diana]
    cse_course_ids = ["crs-cc", "crs-cs", "crs-mad", "crs-ml", "crs-ccl", "crs-aa", "crs-cn", "crs-osl", "crs-we"]

    enrollment_grades = {
        ("user-alex", "crs-cc"): ("A+", 9.0), ("user-alex", "crs-cs"): ("A", 8.0),
        ("user-alex", "crs-mad"): ("B+", 7.0), ("user-alex", "crs-ml"): ("S", 10.0),
    }

    for student in cse_students:
        for crs_id in cse_course_ids:
            key = (student.id, crs_id)
            grade, gpa = enrollment_grades.get(key, (None, None))
            e = Enrollment(
                org_id="org-edusphere",
                student_id=student.id, course_id=crs_id,
                grade=grade, gpa_points=gpa,
                status=EnrollmentStatus.ACTIVE,
            )
            db.add(e)
    db.flush()
    print("   ✓ Enrollments created")

    # ─── ATTENDANCE (matching MOCK_ATTENDANCE percentages) ───
    attendance_config = {
        "crs-cc": (45, {  # 45 sessions
            "user-alex": 42, "user-bella": 40, "user-charlie": 38, "user-diana": 43,
        }),
        "crs-cs": (40, {
            "user-alex": 34, "user-bella": 36, "user-charlie": 30, "user-diana": 38,
        }),
        "crs-mad": (38, {
            "user-alex": 30, "user-bella": 32, "user-charlie": 28, "user-diana": 35,
        }),
        "crs-ml": (42, {
            "user-alex": 40, "user-bella": 38, "user-charlie": 35, "user-diana": 41,
        }),
    }

    base_date = date(2024, 7, 15)
    for crs_id, (total_sessions, student_attendance) in attendance_config.items():
        course = courses[crs_id]
        for i in range(total_sessions):
            session_date = base_date + timedelta(days=i * 2)
            session = AttendanceSession(
                course_id=crs_id,
                faculty_id=course.faculty_id,
                session_date=session_date,
                start_time="09:00",
                end_time="10:00",
                status=SessionStatus.CLOSED,
            )
            db.add(session)
            db.flush()

            for student_id, attended_count in student_attendance.items():
                is_present = i < attended_count
                log = AttendanceLog(
                    session_id=session.id,
                    student_id=student_id,
                    status=AttendanceStatus.PRESENT if is_present else AttendanceStatus.ABSENT,
                    marked_at=datetime(session_date.year, session_date.month, session_date.day, 9, 5),
                )
                db.add(log)

    db.flush()
    print("   ✓ Attendance sessions + logs created (165 sessions, ~660 logs)")

    # ─── TIMETABLE (matching MOCK_TIMETABLE) ───
    timetable_data = [
        ("crs-aa", "user-arun", "Monday", "09:00", "10:00", "LH-302", TimetableEntryType.LECTURE),
        ("crs-cn", "user-devi", "Monday", "10:15", "11:15", "Lab-1", TimetableEntryType.LAB),
        ("crs-osl", "user-raj", "Tuesday", "09:00", "11:00", "Lab-4", TimetableEntryType.LAB),
        ("crs-we", "user-priya", "Wednesday", "11:30", "12:30", "LH-101", TimetableEntryType.LECTURE),
        ("crs-cc", "user-arun", "Monday", "14:00", "15:00", "LH-302", TimetableEntryType.LECTURE),
        ("crs-ml", "user-raj", "Thursday", "14:00", "15:30", "LH-201", TimetableEntryType.LECTURE),
        ("crs-cs", "user-devi", "Tuesday", "11:30", "12:30", "LH-102", TimetableEntryType.LECTURE),
        ("crs-ccl", "user-arun", "Friday", "14:00", "16:00", "Lab-3", TimetableEntryType.LAB),
    ]
    for crs_id, fac_id, day, start, end, venue, etype in timetable_data:
        db.add(TimetableEntry(org_id="org-edusphere", course_id=crs_id, faculty_id=fac_id, day_of_week=day, start_time=start, end_time=end, venue=venue, entry_type=etype))
    db.flush()
    print("   ✓ Timetable entries created")

    # ─── COURSE MATERIALS ───
    materials_data = [
        ("crs-cc", "user-arun", "Unit 1: Virtualization Essentials", "PDF", "2.4 MB"),
        ("crs-cc", "user-arun", "Cloud Service Models (PPT)", "PPT", "5.1 MB"),
        ("crs-cc", "user-arun", "Lab Manual - Week 4", "DOC", "1.2 MB"),
        ("crs-cc", "user-arun", "Unit 2: Resource Allocation", "PDF", "3.8 MB"),
        ("crs-ml", "user-raj", "Lecture 12: Neural Nets", "PDF", "2.4 MB"),
        ("crs-ml", "user-raj", "Lab Assignment 4", "DOC", "1.1 MB"),
    ]
    for crs_id, uploader, title, ftype, fsize in materials_data:
        db.add(CourseMaterial(org_id="org-edusphere", course_id=crs_id, uploaded_by_id=uploader, title=title, file_type=ftype, file_size=fsize))
    db.flush()
    print("   ✓ Course materials created")

    # ─── EXAM SCHEDULES + RESULTS ───
    exam1 = ExamSchedule(id="exam-1", course_id="crs-cc", exam_type=ExamType.INTERNAL_1, title="Internal Exam I", exam_date=datetime(2024, 9, 15, 14, 0), max_marks=50, venue="Hall-A")
    exam2 = ExamSchedule(id="exam-2", course_id="crs-cc", exam_type=ExamType.INTERNAL_2, title="Internal Exam II", exam_date=datetime(2024, 10, 24, 14, 0), max_marks=50, venue="Hall-A")
    exam3 = ExamSchedule(id="exam-3", course_id="crs-ml", exam_type=ExamType.INTERNAL_1, title="ML Internal I", exam_date=datetime(2024, 9, 20, 10, 0), max_marks=50, venue="Hall-B")
    db.add_all([exam1, exam2, exam3])
    db.flush()

    # Get enrollment IDs for results
    alex_cc = db.query(Enrollment).filter(Enrollment.student_id == "user-alex", Enrollment.course_id == "crs-cc").first()
    alex_ml = db.query(Enrollment).filter(Enrollment.student_id == "user-alex", Enrollment.course_id == "crs-ml").first()
    if alex_cc:
        db.add(ExamResult(exam_id="exam-1", student_id="user-alex", enrollment_id=alex_cc.id, marks_obtained=45, grade="S", is_published=True))
    if alex_ml:
        db.add(ExamResult(exam_id="exam-3", student_id="user-alex", enrollment_id=alex_ml.id, marks_obtained=47, grade="S", is_published=True))
    db.flush()
    print("   ✓ Exam schedules + results created")

    # ─── ANNOUNCEMENTS ───
    db.add(Announcement(org_id="org-edusphere", title="Welcome to EduSphere LMS", content="Welcome to your new institutional management portal! Access your courses and records here.", author_id="user-admin", priority=Priority.HIGH, is_pinned=True))
    db.add(Announcement(org_id="org-edusphere", title="Library New Arrivals", content="50 new reference books added to the Computer Science section. Check the library portal for availability.", author_id="user-arun", priority=Priority.MEDIUM))
    db.flush()
    print("   ✓ Announcements created")

    # ─── LIBRARY BOOKS ───
    books = [
        ("978-0132350884", "Clean Code", "Robert C. Martin", "Pearson", 5, 3, "Software Engineering"),
        ("978-0201633610", "Design Patterns", "GoF", "Addison-Wesley", 3, 2, "Software Engineering"),
        ("978-0596007126", "Head First Design Patterns", "Eric Freeman", "O'Reilly", 4, 4, "Software Engineering"),
        ("978-0131103627", "The C Programming Language", "Kernighan & Ritchie", "Prentice Hall", 6, 5, "Programming"),
    ]
    for isbn, title, author, pub, total, avail, cat in books:
        db.add(LibraryBook(org_id="org-edusphere", isbn=isbn, title=title, author=author, publisher=pub, total_copies=total, available_copies=avail, category=cat))
    db.flush()
    print("   ✓ Library books created")


    # ─── INTELLIGENCE LAYER ───
    # Seed metrics for Alex
    db.add(LearningMetric(
        id=str(uuid.uuid4()),
        org_id="org-edusphere",
        user_id="user-alex",
        overall_score=88.4,
        attendance_score=92.0,
        assessment_score=94.0,
        activity_score=85.0,
        risk_level="NORMAL",
        prediction_summary="Maintaining strong academic health. Predicted 8.5+ GPA if current trend continues."
    ))

    # Seed Recommendations for Alex
    db.add_all([
        Recommendation(
            org_id="org-edusphere",
            user_id="user-alex",
            type="EXPLORE",
            priority="MEDIUM",
            title="Advanced Cloud Architectures",
            message="Your Cloud Computing score is exceptional. Consider exploring the AWS Certified Solutions Architect path.",
            link="/journey"
        ),
        Recommendation(
            org_id="org-edusphere",
            user_id="user-alex",
            type="REVISE",
            priority="LOW",
            title="Network Security Refresher",
            message="Your last assessment in Cyber Security had minor gaps in RSA encryption. Revisiting Module 4 is recommended.",
            link="/academics"
        )
    ])

    # Seed Notifications for Alex
    db.add(UserNotification(
        org_id="org-edusphere",
        user_id="user-alex",
        title="Intelligence Sync Complete",
        message="Your Learning Health Score has been updated based on the latest internal assessment.",
        type="SUCCESS"
    ))

    db.flush()
    print("   ✓ Intelligence Layer metrics + recommendations created")

    # ─── PLATFORM CONTENT LAYER ───
    # Unit 1 Modules for Cloud Computing
    mod1 = Module(id="mod-cloud-1", org_id="org-edusphere", course_id="crs-cc", title="Unit 1: Cloud Fundamentals", order_index=1)
    mod2 = Module(id="mod-cloud-2", org_id="org-edusphere", course_id="crs-cc", title="Unit 2: Distributed Architectures", order_index=2)
    db.add_all([mod1, mod2])
    db.flush()

    # Lessons for Mod 1
    db.add_all([
        Lesson(org_id="org-edusphere", module_id="mod-cloud-1", title="Introduction to Cloud Computing", content_type=ContentType.VIDEO, content_url="https://www.youtube.com/embed/M988_fsOSWo", duration_minutes=15, order_index=1),
        Lesson(org_id="org-edusphere", module_id="mod-cloud-1", title="Service Models: IaaS, PaaS, SaaS", content_type=ContentType.VIDEO, content_url="https://www.youtube.com/embed/zL6vFzHIs18", duration_minutes=18, order_index=2),
        Lesson(org_id="org-edusphere", module_id="mod-cloud-1", title="Cloud Security Best Practices", content_type=ContentType.PDF, content_url="https://example.com/cloud-sec.pdf", order_index=3),
    ])

    # Assignments for Cloud Course
    assign1 = Assignment(
        id="assign-cloud-1", 
        org_id="org-edusphere",
        course_id="crs-cc", 
        title="Cloud Infrastructure Design", 
        description="Design a highly available VPC architecture with multiple subnets and auto-scaling.",
        due_date=datetime.utcnow() + timedelta(days=2),
        max_marks=100
    )
    db.add(assign1)
    db.flush()

    # Submissions (Graded) for Alex
    db.add(Submission(
        org_id="org-edusphere",
        assignment_id="assign-cloud-1",
        student_id="user-alex",
        file_url="https://example.com/alex-cloud-submission.pdf",
        marks_obtained=94,
        feedback="Excellent architecture design and security considerations.",
        status=AssignmentStatus.GRADED,
        graded_by_id="user-arun"
    ))

    # Discussions
    db.add(Discussion(
        org_id="org-edusphere",
        course_id="crs-cc",
        user_id="user-alex",
        content="Does anyone have tips for optimizing AWS Lambda cold starts?"
    ))

    db.flush()
    print("   ✓ Platform Content Layer (Modules, Lessons, Assignments) created")

    # ─── FINANCE LAYER ───
    fee1 = FeeStructure(org_id="org-edusphere", department_id="dept-cse", semester_label="Semester 7", label="Tuition Fee", amount=45000.0, due_date=date(2024, 12, 31))
    fee2 = FeeStructure(org_id="org-edusphere", department_id="dept-cse", semester_label="Semester 7", label="Lab Fee", amount=5000.0, due_date=date(2024, 12, 31))
    db.add_all([fee1, fee2])
    db.flush()
    
    # Alex paid one fee
    payment1 = FeePayment(org_id="org-edusphere", student_id="user-alex", fee_structure_id=fee1.id, amount_paid=45000.0, status=PaymentStatus.COMPLETED, transaction_id="TXN-INIT-CSE-1")
    db.add(payment1)
    db.flush()

    # Seed double-entry ledger entries for Alex
    debit1 = LedgerEntry(org_id="org-edusphere", student_id="user-alex", amount=45000.0, entry_type="DEBIT", label="Tuition Fee Semester 7 Charge", transaction_id="TXN-DEBIT-CSE-1")
    debit2 = LedgerEntry(org_id="org-edusphere", student_id="user-alex", amount=5000.0, entry_type="DEBIT", label="Lab Fee Semester 7 Charge", transaction_id="TXN-DEBIT-CSE-2")
    credit1 = LedgerEntry(org_id="org-edusphere", student_id="user-alex", amount=45000.0, entry_type="CREDIT", label="Tuition Fee Semester 7 Payment", transaction_id="TXN-INIT-CSE-1")
    db.add_all([debit1, debit2, credit1])
    db.flush()
    print("   ✓ Finance Layer & Ledger entries created")


    # ─── PLACEMENT LAYER ───
    drive1 = PlacementDrive(org_id="org-edusphere", company_name="Google", role_offered="SDE-1", package_lpa=32.5, drive_date=date(2024, 11, 15), last_date_apply=date(2024, 11, 10), status=DriveStatus.UPCOMING)
    drive2 = PlacementDrive(org_id="org-edusphere", company_name="Microsoft", role_offered="SDE-1", package_lpa=28.0, drive_date=date(2024, 11, 20), last_date_apply=date(2024, 11, 15), status=DriveStatus.UPCOMING)
    db.add_all([drive1, drive2])
    db.flush()

    db.add(PlacementApplication(org_id="org-edusphere", student_id="user-alex", drive_id=drive1.id, status=ApplicationStatus.APPLIED))
    
    db.add_all([
        PlacementStats(org_id="org-edusphere", year="2023", placed=145, total=150, avg_lpa=12.5),
        PlacementStats(org_id="org-edusphere", year="2022", placed=138, total=148, avg_lpa=11.2),
        PlacementStats(org_id="org-edusphere", year="2021", placed=120, total=140, avg_lpa=9.8),
    ])
    db.flush()
    print("   ✓ Placement Layer created")

    # ─── CERTIFICATION LAYER ───
    cert_setting = CertificateSetting(
        id=str(uuid.uuid4()),
        org_id="org-edusphere",
        min_attendance_pct=75.0,
        min_assessment_pct=60.0
    )
    db.add(cert_setting)

    from services.certificate_service import generate_certificate_pdf
    
    dt_now = datetime.utcnow()
    pdf1_url = generate_certificate_pdf("CERT-2026-CS8701-4290", "Alex Johnson", "Cloud Computing Architecture", dt_now, 94.0, 92.5)
    pdf2_url = generate_certificate_pdf("CERT-2026-CS8704-8812", "Alex Johnson", "Machine Learning & Deep Neural Nets", dt_now, 95.0, 89.0)

    cert1 = Certificate(
        id=str(uuid.uuid4()),
        user_id="user-alex",
        course_id="crs-cc",
        issued_date=dt_now - timedelta(days=12),
        certificate_code="CERT-2026-CS8701-4290",
        certificate_url=pdf1_url,
        eligibility_status=CertificateStatus.ISSUED,
        attendance_pct=94.0,
        assessment_pct=92.5,
        org_id="org-edusphere"
    )

    cert2 = Certificate(
        id=str(uuid.uuid4()),
        user_id="user-alex",
        course_id="crs-ml",
        issued_date=dt_now - timedelta(days=4),
        certificate_code="CERT-2026-CS8704-8812",
        certificate_url=pdf2_url,
        eligibility_status=CertificateStatus.ISSUED,
        attendance_pct=95.0,
        assessment_pct=89.0,
        org_id="org-edusphere"
    )


    db.add_all([cert1, cert2])
    db.flush()
    print("   ✓ Certification Layer & ReportLab PDF assets created")




if __name__ == "__main__":
    seed_database()
