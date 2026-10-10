"""
EduSphere LMS — Demo Seeder
Run manually: python seed_demo.py or python -m seed_demo

Idempotent: checks for existing records before inserting.
Never truncates or drops existing production tables.

Demo Dataset:
- 1 Admin
- 2 Faculty
- 10 Students
- 3 Approved Courses with Modules & Lessons
- Course Enrollments across students
- Attendance sessions & logs over 4 weeks
- 2 Quizzes with MCQ questions and attempts
- 1 Assignment with graded submissions
- 2 Students fully certified (Alice & Bob) + ineligible students with clear criteria breakdown
"""

import os
import sys
from datetime import datetime, date, timedelta

# Ensure server path is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from utils.password import hash_password

# Import models
from models.organization import Organization
from models.user import User, Department, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from models.content import Module, Lesson, ContentType, Assignment, Submission, AssignmentStatus, LessonProgress
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from models.exam import Quiz, QuizQuestion, QuizAttempt
from models.certificate import Certificate, CertificateSetting, CertificateStatus

ORG_ID = "org-edusphere"
DEPT_ID = "dept-cse"

def get_or_create(db, model, filter_kwargs, create_kwargs=None):
    instance = db.query(model).filter_by(**filter_kwargs).first()
    if not instance:
        data = {**filter_kwargs, **(create_kwargs or {})}
        instance = model(**data)
        db.add(instance)
        db.flush()
    return instance

def seed():
    print("[1/8] Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("[2/8] Seeding Organization and Department...")
        org = get_or_create(db, Organization, {"id": ORG_ID}, {
            "name": "EduSphere University",
            "code": "EDUSPHERE",
            "domain": "edusphere.edu.in",
            "is_active": True
        })

        dept = get_or_create(db, Department, {"id": DEPT_ID}, {
            "org_id": ORG_ID,
            "code": "CSE",
            "name": "Computer Science & Engineering",
            "is_active": True
        })

        print("[3/8] Seeding Users (1 Admin, 2 Faculty, 10 Students)...")
        # 1 Admin
        admin = get_or_create(db, User, {"email": "admin@edusphere.edu.in"}, {
            "org_id": ORG_ID,
            "name": "System Administrator",
            "password_hash": hash_password("Admin@123"),
            "role": UserRole.ADMIN,
            "department_id": DEPT_ID,
            "designation": "Chief System Administrator",
            "is_active": True
        })

        # 2 Faculty
        faculty_turing = get_or_create(db, User, {"email": "faculty1@edusphere.edu.in"}, {
            "org_id": ORG_ID,
            "name": "Dr. Alan Turing",
            "password_hash": hash_password("Faculty@123"),
            "role": UserRole.FACULTY,
            "department_id": DEPT_ID,
            "designation": "Professor of Computing",
            "phone": "+91 9876543210",
            "is_active": True
        })

        faculty_lovelace = get_or_create(db, User, {"email": "faculty2@edusphere.edu.in"}, {
            "org_id": ORG_ID,
            "name": "Dr. Ada Lovelace",
            "password_hash": hash_password("Faculty@123"),
            "role": UserRole.FACULTY,
            "department_id": DEPT_ID,
            "designation": "Associate Professor",
            "phone": "+91 9876543211",
            "is_active": True
        })

        # 10 Students
        student_data = [
            ("student1@edusphere.edu.in", "Alice Smith", "UNI/2026/CS/101"),
            ("student2@edusphere.edu.in", "Bob Johnson", "UNI/2026/CS/102"),
            ("student3@edusphere.edu.in", "Charlie Brown", "UNI/2026/CS/103"),
            ("student4@edusphere.edu.in", "Diana Prince", "UNI/2026/CS/104"),
            ("student5@edusphere.edu.in", "Evan Wright", "UNI/2026/CS/105"),
            ("student6@edusphere.edu.in", "Fiona Gallagher", "UNI/2026/CS/106"),
            ("student7@edusphere.edu.in", "George Clark", "UNI/2026/CS/107"),
            ("student8@edusphere.edu.in", "Hannah Abbott", "UNI/2026/CS/108"),
            ("student9@edusphere.edu.in", "Ian Malcolm", "UNI/2026/CS/109"),
            ("student10@edusphere.edu.in", "Julia Roberts", "UNI/2026/CS/110"),
        ]

        students = []
        for email, name, roll in student_data:
            s = get_or_create(db, User, {"email": email}, {
                "org_id": ORG_ID,
                "name": name,
                "password_hash": hash_password("Student@123"),
                "role": UserRole.STUDENT,
                "department_id": DEPT_ID,
                "enrollment_no": roll,
                "is_active": True
            })
            students.append(s)

        print("[4/8] Seeding 3 Courses with Modules and Lessons...")
        # Course 1
        course1 = get_or_create(db, Course, {"code": "CS101", "org_id": ORG_ID}, {
            "name": "Cloud Computing & Distributed Systems",
            "credits": 4,
            "department_id": DEPT_ID,
            "faculty_id": faculty_turing.id,
            "semester": 6,
            "description": "Enterprise cloud architecture, virtualization, microservices, and distributed consensus.",
            "schedule": "Mon/Wed 10:00 AM",
            "max_students": 60,
            "is_active": True,
            "approval_status": "APPROVED",
            "submitted_by_id": faculty_turing.id,
            "approved_by_id": admin.id
        })

        # Course 2
        course2 = get_or_create(db, Course, {"code": "CS201", "org_id": ORG_ID}, {
            "name": "Data Structures & Algorithms",
            "credits": 4,
            "department_id": DEPT_ID,
            "faculty_id": faculty_lovelace.id,
            "semester": 4,
            "description": "Advanced tree structures, graph algorithms, dynamic programming, and complexity analysis.",
            "schedule": "Tue/Thu 02:00 PM",
            "max_students": 60,
            "is_active": True,
            "approval_status": "APPROVED",
            "submitted_by_id": faculty_lovelace.id,
            "approved_by_id": admin.id
        })

        # Course 3
        course3 = get_or_create(db, Course, {"code": "CS301", "org_id": ORG_ID}, {
            "name": "Machine Learning & Neural Foundations",
            "credits": 4,
            "department_id": DEPT_ID,
            "faculty_id": faculty_turing.id,
            "semester": 8,
            "description": "Supervised & unsupervised models, deep neural networks, and model deployment pipelines.",
            "schedule": "Fri 09:00 AM",
            "max_students": 60,
            "is_active": True,
            "approval_status": "APPROVED",
            "submitted_by_id": faculty_turing.id,
            "approved_by_id": admin.id
        })

        # Modules and Lessons for CS101
        m1 = get_or_create(db, Module, {"course_id": course1.id, "title": "Module 1: Cloud Architecture Fundamentals"}, {
            "org_id": ORG_ID,
            "description": "Foundational virtualization and cloud computing deployment models.",
            "order_index": 1
        })
        l1 = get_or_create(db, Lesson, {"module_id": m1.id, "title": "Lesson 1: Introduction to Distributed Cloud"}, {
            "org_id": ORG_ID,
            "content_type": ContentType.VIDEO,
            "content_url": "https://www.w3schools.com/html/mov_bbb.mp4",
            "duration_minutes": 25,
            "order_index": 1
        })
        l2 = get_or_create(db, Lesson, {"module_id": m1.id, "title": "Lesson 2: Virtualization & Hypervisors"}, {
            "org_id": ORG_ID,
            "content_type": ContentType.VIDEO,
            "content_url": "https://www.w3schools.com/html/mov_bbb.mp4",
            "duration_minutes": 30,
            "order_index": 2
        })

        m2 = get_or_create(db, Module, {"course_id": course1.id, "title": "Module 2: Microservices & Containerization"}, {
            "org_id": ORG_ID,
            "description": "Container runtimes, Kubernetes orchestration, and service meshes.",
            "order_index": 2
        })
        l3 = get_or_create(db, Lesson, {"module_id": m2.id, "title": "Lesson 3: Docker Engine & Container Orchestration"}, {
            "org_id": ORG_ID,
            "content_type": ContentType.VIDEO,
            "content_url": "https://www.w3schools.com/html/mov_bbb.mp4",
            "duration_minutes": 35,
            "order_index": 1
        })
        l4 = get_or_create(db, Lesson, {"module_id": m2.id, "title": "Lesson 4: Cloud Reliability & Fault Tolerance"}, {
            "org_id": ORG_ID,
            "content_type": ContentType.VIDEO,
            "content_url": "https://www.w3schools.com/html/mov_bbb.mp4",
            "duration_minutes": 40,
            "order_index": 2
        })

        cs101_lesson_ids = [l1.id, l2.id, l3.id, l4.id]

        print("[5/8] Seeding Enrollments and Lesson Progress...")
        # Enroll all students in CS101 and CS201; top students also in CS301
        for idx, student in enumerate(students):
            get_or_create(db, Enrollment, {"student_id": student.id, "course_id": course1.id}, {
                "org_id": ORG_ID,
                "status": EnrollmentStatus.ACTIVE
            })
            get_or_create(db, Enrollment, {"student_id": student.id, "course_id": course2.id}, {
                "org_id": ORG_ID,
                "status": EnrollmentStatus.ACTIVE
            })
            if idx < 3:
                get_or_create(db, Enrollment, {"student_id": student.id, "course_id": course3.id}, {
                    "org_id": ORG_ID,
                    "status": EnrollmentStatus.ACTIVE
                })

        # Student progress:
        # Students 1, 2, 3, 4 completed 100% of CS101 lessons
        for s_idx in [0, 1, 2, 3]:
            for lid in cs101_lesson_ids:
                get_or_create(db, LessonProgress, {"user_id": students[s_idx].id, "lesson_id": lid}, {
                    "completed": True,
                    "org_id": ORG_ID
                })

        # Student 5 (Evan) completed only 1 lesson (25% progress)
        get_or_create(db, LessonProgress, {"user_id": students[4].id, "lesson_id": cs101_lesson_ids[0]}, {
            "completed": True,
            "org_id": ORG_ID
        })

        print("[6/8] Seeding 4 Weeks of Attendance Sessions & Student Logs...")
        # Generate 8 sessions across the past 4 weeks (2 sessions per week)
        today = date.today()
        session_dates = [today - timedelta(days=28 - (i * 3.5)) for i in range(8)]

        for s_date in session_dates:
            session = get_or_create(db, AttendanceSession, {
                "course_id": course1.id,
                "session_date": s_date
            }, {
                "faculty_id": faculty_turing.id,
                "status": SessionStatus.CLOSED,
                "start_time": "10:00 AM",
                "end_time": "11:30 AM",
                "org_id": ORG_ID
            })

            # Mark logs per student
            for idx, student in enumerate(students):
                # Student 1 (Alice): 100% Present (8/8)
                # Student 2 (Bob): 7 Present, 1 Late (87.5% Present >= 75%)
                # Student 3 (Charlie): 4 Present, 4 Absent (50% Present < 75% -> Ineligible)
                # Student 4 (Diana): 7 Present, 1 Absent (87.5% Present >= 75%)
                # Student 5 (Evan): 7 Present, 1 Absent (87.5% Present >= 75%)
                # Others: 6-8 Present
                if idx == 0:
                    status = AttendanceStatus.PRESENT
                elif idx == 1:
                    status = AttendanceStatus.LATE if s_date == session_dates[0] else AttendanceStatus.PRESENT
                elif idx == 2:
                    status = AttendanceStatus.ABSENT if s_date in session_dates[:4] else AttendanceStatus.PRESENT
                elif idx in [3, 4]:
                    status = AttendanceStatus.ABSENT if s_date == session_dates[0] else AttendanceStatus.PRESENT
                else:
                    status = AttendanceStatus.PRESENT if (idx + session_dates.index(s_date)) % 4 != 0 else AttendanceStatus.ABSENT

                get_or_create(db, AttendanceLog, {
                    "session_id": session.id,
                    "student_id": student.id
                }, {
                    "status": status,
                    "org_id": ORG_ID
                })

        print("[7/8] Seeding Quizzes and Assignments with Graded Results...")
        # Quiz 1 in CS101
        quiz1 = get_or_create(db, Quiz, {"course_id": course1.id, "title": "Cloud Architecture & Scalability Quiz"}, {
            "description": "Comprehensive quiz on distributed consensus, virtualization, and scalability.",
            "time_limit_minutes": 15,
            "passing_percentage": 50.0,
            "total_marks": 30,
            "is_active": True,
            "created_by": faculty_turing.id,
            "org_id": ORG_ID
        })

        q1 = get_or_create(db, QuizQuestion, {"quiz_id": quiz1.id, "order_num": 1}, {
            "question_text": "Which principle guarantees consistency and partition tolerance in distributed storage systems?",
            "option_a": "CAP Theorem (CP mode)",
            "option_b": "ACID Isolations",
            "option_c": "Eventual Inconsistency",
            "option_d": "Round-Robin Scheduling",
            "correct_option": "A",
            "explanation": "According to the CAP theorem, a system cannot simultaneously guarantee Consistency, Availability, and Partition tolerance. In CP mode, consistency is preserved during network partitions.",
            "marks": 10
        })

        q2 = get_or_create(db, QuizQuestion, {"quiz_id": quiz1.id, "order_num": 2}, {
            "question_text": "What type of hypervisor runs directly on the bare metal hardware without an underlying OS?",
            "option_a": "Type 2 Hosted Hypervisor",
            "option_b": "Type 1 Bare-Metal Hypervisor",
            "option_c": "Application Container",
            "option_d": "Process Sandbox",
            "correct_option": "B",
            "explanation": "Type 1 hypervisors (e.g. VMware ESXi, KVM) run directly on host hardware.",
            "marks": 10
        })

        q3 = get_or_create(db, QuizQuestion, {"quiz_id": quiz1.id, "order_num": 3}, {
            "question_text": "In Kubernetes, what is the smallest deployable computing unit that can be created and managed?",
            "option_a": "Pod",
            "option_b": "Cluster",
            "option_c": "ReplicaSet",
            "option_d": "Ingress Controller",
            "correct_option": "A",
            "explanation": "A Pod encapsulates one or more containers, storage resources, and network configurations.",
            "marks": 10
        })

        # Quiz 2 in CS201
        quiz2 = get_or_create(db, Quiz, {"course_id": course2.id, "title": "Data Structures Mastery Quiz"}, {
            "description": "Algorithm efficiency, dynamic programming, and binary search tree mechanics.",
            "time_limit_minutes": 20,
            "passing_percentage": 50.0,
            "total_marks": 30,
            "is_active": True,
            "created_by": faculty_lovelace.id,
            "org_id": ORG_ID
        })

        get_or_create(db, QuizQuestion, {"quiz_id": quiz2.id, "order_num": 1}, {
            "question_text": "What is the worst-case time complexity of searching in an unbalanced Binary Search Tree?",
            "option_a": "O(1)",
            "option_b": "O(log n)",
            "option_c": "O(n)",
            "option_d": "O(n log n)",
            "correct_option": "C",
            "explanation": "An unbalanced BST degenerates into a linked list in the worst case, yielding O(n) search time.",
            "marks": 10
        })

        # Quiz Attempts
        # Student 1 (Alice): 30/30 (100%)
        get_or_create(db, QuizAttempt, {"quiz_id": quiz1.id, "student_id": students[0].id}, {
            "score": 30.0,
            "percentage": 100.0,
            "passed": True,
            "total_questions": 3,
            "correct_answers": 3,
            "org_id": ORG_ID
        })

        # Student 2 (Bob): 25/30 (83.3%)
        get_or_create(db, QuizAttempt, {"quiz_id": quiz1.id, "student_id": students[1].id}, {
            "score": 25.0,
            "percentage": 83.3,
            "passed": True,
            "total_questions": 3,
            "correct_answers": 2,
            "org_id": ORG_ID
        })

        # Student 3 (Charlie): 25/30 (83.3%)
        get_or_create(db, QuizAttempt, {"quiz_id": quiz1.id, "student_id": students[2].id}, {
            "score": 25.0,
            "percentage": 83.3,
            "passed": True,
            "total_questions": 3,
            "correct_answers": 2,
            "org_id": ORG_ID
        })

        # Student 4 (Diana): 10/30 (33.3% -> Failed quiz)
        get_or_create(db, QuizAttempt, {"quiz_id": quiz1.id, "student_id": students[3].id}, {
            "score": 10.0,
            "percentage": 33.3,
            "passed": False,
            "total_questions": 3,
            "correct_answers": 1,
            "org_id": ORG_ID
        })

        # 1 Assignment in CS101
        assignment1 = get_or_create(db, Assignment, {"course_id": course1.id, "title": "Cloud Migration Architecture Blueprint"}, {
            "org_id": ORG_ID,
            "description": "Design a high-availability migration strategy for an e-commerce platform migrating to multi-region cloud architecture.",
            "due_date": datetime.utcnow() + timedelta(days=14),
            "max_marks": 100
        })

        # Submissions
        # Student 1 (Alice): Graded 95/100
        get_or_create(db, Submission, {"assignment_id": assignment1.id, "student_id": students[0].id}, {
            "org_id": ORG_ID,
            "file_url": "https://storage.googleapis.com/edusphere/blueprints/alice_cloud_migration.pdf",
            "marks_obtained": 95.0,
            "feedback": "Outstanding design with robust failover and auto-scaling tiers.",
            "graded_by_id": faculty_turing.id,
            "status": AssignmentStatus.GRADED
        })

        # Student 2 (Bob): Graded 88/100
        get_or_create(db, Submission, {"assignment_id": assignment1.id, "student_id": students[1].id}, {
            "org_id": ORG_ID,
            "file_url": "https://storage.googleapis.com/edusphere/blueprints/bob_cloud_migration.pdf",
            "marks_obtained": 88.0,
            "feedback": "Well documented Kubernetes pods and VPC subnet configurations.",
            "graded_by_id": faculty_turing.id,
            "status": AssignmentStatus.GRADED
        })

        # Student 3 (Charlie): Graded 40/100
        get_or_create(db, Submission, {"assignment_id": assignment1.id, "student_id": students[2].id}, {
            "org_id": ORG_ID,
            "file_url": "https://storage.googleapis.com/edusphere/blueprints/charlie_cloud_migration.pdf",
            "marks_obtained": 40.0,
            "feedback": "Missing automated backup policies and database replication setup.",
            "graded_by_id": faculty_turing.id,
            "status": AssignmentStatus.GRADED
        })

        # Student 4 (Diana): Graded 45/100
        get_or_create(db, Submission, {"assignment_id": assignment1.id, "student_id": students[3].id}, {
            "org_id": ORG_ID,
            "file_url": "https://storage.googleapis.com/edusphere/blueprints/diana_cloud_migration.pdf",
            "marks_obtained": 45.0,
            "feedback": "Security compliance and IAM role least-privilege policies are incomplete.",
            "graded_by_id": faculty_turing.id,
            "status": AssignmentStatus.GRADED
        })

        print("[8/8] Seeding Certificate Settings and Verified Issued Certificates...")
        cert_setting = get_or_create(db, CertificateSetting, {"org_id": ORG_ID}, {
            "min_attendance_pct": 75.0,
            "min_assessment_pct": 50.0,
            "min_progress_pct": 100.0
        })

        # Issue certificates for Alice (Student 1) and Bob (Student 2) who meet all criteria:
        # Alice: Attendance 100% >= 75%, Assessment avg = (100% + 95%)/2 = 97.5% >= 50%, Progress 100%
        cert1 = get_or_create(db, Certificate, {"user_id": students[0].id, "course_id": course1.id}, {
            "org_id": ORG_ID,
            "certificate_code": "EDU-2026-ALICE101",
            "eligibility_status": CertificateStatus.ISSUED,
            "attendance_pct": 100.0,
            "assessment_pct": 97.5,
            "progress_pct": 100.0,
            "certificate_url": f"/api/certificates/download/EDU-2026-ALICE101"
        })

        # Bob: Attendance 87.5% >= 75%, Assessment avg = (83.3% + 88.0%)/2 = 85.65% >= 50%, Progress 100%
        cert2 = get_or_create(db, Certificate, {"user_id": students[1].id, "course_id": course1.id}, {
            "org_id": ORG_ID,
            "certificate_code": "EDU-2026-BOB101",
            "eligibility_status": CertificateStatus.ISSUED,
            "attendance_pct": 87.5,
            "assessment_pct": 85.65,
            "progress_pct": 100.0,
            "certificate_url": f"/api/certificates/download/EDU-2026-BOB101"
        })

        db.commit()
        print("\n" + "=" * 60)
        print(" Demo Data Successfully Seeded! (Idempotent)")
        print("=" * 60)
        print("\nDemo Accounts:")
        print("  • Admin:   admin@edusphere.edu.in       / Admin@123")
        print("  • Faculty: faculty1@edusphere.edu.in    / Faculty@123 (Dr. Alan Turing)")
        print("  • Faculty: faculty2@edusphere.edu.in    / Faculty@123 (Dr. Ada Lovelace)")
        print("  • Student: student1@edusphere.edu.in    / Student@123 (Alice Smith - 100% Certified)")
        print("  • Student: student2@edusphere.edu.in    / Student@123 (Bob Johnson - Certified)")
        print("  • Student: student3@edusphere.edu.in    / Student@123 (Charlie - Ineligible: 50% Attn)")
        print("  • Student: student4@edusphere.edu.in    / Student@123 (Diana - Ineligible: 39% Score)")
        print("  • Student: student5@edusphere.edu.in    / Student@123 (Evan - Ineligible: 25% Progress)")
        print("  • Students 6-10: student6..student10    / Student@123")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
