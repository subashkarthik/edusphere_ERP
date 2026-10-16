"""
EduSphere Management CLI

Usage:
    python -m app.cli create-admin --email <email> --name <name>
    python -m app.cli seed-demo
"""

import os
import sys
import argparse
import getpass
import uuid
from urllib.parse import urlparse

# Ensure server root is in sys.path
SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

import dotenv
dotenv.load_dotenv(os.path.join(SERVER_DIR, ".env"))

from database import SessionLocal, engine, Base
from models.organization import Organization, OrgPlan
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment, EnrollmentStatus
from models.content import Module, Lesson, ContentType, Assignment, Submission, AssignmentStatus, LessonProgress
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus, SessionStatus
from models.exam import Quiz, QuizQuestion, QuizAttempt
from models.certificate import Certificate, CertificateSetting, CertificateStatus
from utils.password import hash_password
from datetime import datetime, date, timedelta


def _prompt_password(prompt_text: str) -> str:
    if sys.stdin.isatty():
        return getpass.getpass(prompt_text)
    else:
        sys.stdout.write(prompt_text)
        sys.stdout.flush()
        line = sys.stdin.readline()
        return line.strip("\r\n") if line else ""


def create_admin(email: str, name: str):
    """
    Bootstrap the initial admin account. Prompts securely for password (min 12 chars).
    No default passwords anywhere.
    """
    print("=" * 60)
    print(" EduSphere LMS — Bootstrap Administrator Account")
    print("=" * 60)

    # Prompt for password
    password = _prompt_password("Enter admin password (minimum 12 characters): ")
    if len(password) < 12:
        print("ERROR: Password must be at least 12 characters long.")
        sys.exit(1)

    confirm_password = _prompt_password("Confirm admin password: ")
    if password != confirm_password:
        print("ERROR: Passwords do not match.")
        sys.exit(1)

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Ensure root organization exists
        org = db.query(Organization).first()
        if not org:
            org = Organization(
                id="org-edusphere",
                name="EduSphere University",
                plan=OrgPlan.ENTERPRISE,
                domain="edusphere.edu.in"
            )
            db.add(org)
            db.flush()

        # Check existing user
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            if existing_user.role == UserRole.ADMIN:
                existing_user.name = name
                existing_user.password_hash = hash_password(password)
                existing_user.is_active = True
                db.commit()
                print(f"[OK] Existing administrator account updated: {email}")
                return
            else:
                print(f"ERROR: User with email '{email}' already exists with role '{existing_user.role.value}'.")
                sys.exit(1)

        admin = User(
            id=f"admin-{uuid.uuid4().hex[:8]}",
            org_id=org.id,
            email=email,
            name=name,
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"[OK] Admin account created successfully: {email}")
    except Exception as e:
        db.rollback()
        print(f"ERROR: Failed to create admin account: {e}")
        sys.exit(1)
    finally:
        db.close()


def _get_or_create(db, model, filter_kwargs, create_kwargs=None):
    instance = db.query(model).filter_by(**filter_kwargs).first()
    if not instance:
        data = {**filter_kwargs, **(create_kwargs or {})}
        instance = model(**data)
        db.add(instance)
        db.flush()
    return instance


def seed_demo():
    """
    Seed realistic demonstration data.
    Guarded: Refuses to run unless ENV=demo AND database name ends with '_demo'.
    """
    env_val = (os.getenv("ENV") or os.getenv("ENVIRONMENT") or "").strip().lower()
    if env_val != "demo":
        print(f"ERROR: Refusing to seed demo data. ENV must be 'demo' (currently: '{env_val or 'unset'}').")
        sys.exit(1)

    from config import settings
    db_url = (os.getenv("DATABASE_URL") or settings.DATABASE_URL or "").strip()

    db_name = ""
    if db_url.startswith("sqlite"):
        path_part = db_url.split("?")[0]
        raw_path = path_part.replace("sqlite:///", "").replace("sqlite://", "")
        base_filename = os.path.basename(raw_path)
        db_name = os.path.splitext(base_filename)[0]
    else:
        parsed = urlparse(db_url)
        db_name = parsed.path.lstrip("/").split("?")[0]

    if not db_name.endswith("_demo"):
        print(f"ERROR: Refusing to seed demo data. Database name must end with '_demo' (currently: '{db_name}').")
        sys.exit(1)

    print("=" * 60)
    print(" EduSphere LMS — Seeding Demo Dataset (ENV=demo)")
    print("=" * 60)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    ORG_ID = "org-edusphere"
    DEPT_ID = "dept-cse"

    try:
        # Organization & Department
        org = _get_or_create(db, Organization, {"id": ORG_ID}, {
            "name": "EduSphere University",
            "plan": OrgPlan.ENTERPRISE,
            "domain": "edusphere.edu.in"
        })

        dept = _get_or_create(db, Department, {"id": DEPT_ID}, {
            "org_id": ORG_ID,
            "code": "CSE",
            "name": "Computer Science & Engineering",
            "is_active": True
        })

        # Faculty
        pass_faculty = hash_password("Faculty@Demo123")
        faculty_1 = _get_or_create(db, User, {"email": "faculty1@edusphere.edu.in"}, {
            "org_id": ORG_ID,
            "name": "Dr. Alan Turing",
            "password_hash": pass_faculty,
            "role": UserRole.FACULTY,
            "department_id": DEPT_ID,
            "designation": "Professor of Computing",
            "phone": "+91 9876543210",
            "is_active": True
        })

        faculty_2 = _get_or_create(db, User, {"email": "faculty2@edusphere.edu.in"}, {
            "org_id": ORG_ID,
            "name": "Dr. Ada Lovelace",
            "password_hash": pass_faculty,
            "role": UserRole.FACULTY,
            "department_id": DEPT_ID,
            "designation": "Associate Professor",
            "phone": "+91 9876543211",
            "is_active": True
        })

        # Students
        pass_student = hash_password("Student@Demo123")
        student_data = [
            ("student1@edusphere.edu.in", "Alice Smith", "UNI/2026/CS/101"),
            ("student2@edusphere.edu.in", "Bob Davis", "UNI/2026/CS/102"),
            ("student3@edusphere.edu.in", "Charlie Brown", "UNI/2026/CS/103"),
            ("student4@edusphere.edu.in", "Diana Prince", "UNI/2026/CS/104"),
            ("student5@edusphere.edu.in", "Evan Wright", "UNI/2026/CS/105"),
        ]

        students = []
        for semail, sname, sreg in student_data:
            suser = _get_or_create(db, User, {"email": semail}, {
                "org_id": ORG_ID,
                "name": sname,
                "password_hash": pass_student,
                "role": UserRole.STUDENT,
                "department_id": DEPT_ID,
                "enrollment_no": sreg,
                "phone": "+91 9876543212",
                "is_active": True
            })
            students.append(suser)

        # Courses
        c1 = _get_or_create(db, Course, {"id": "course-cs101"}, {
            "org_id": ORG_ID,
            "code": "CS101",
            "name": "Cloud Computing & Distributed Systems",
            "department_id": DEPT_ID,
            "semester": 7,
            "credits": 4,
            "faculty_id": faculty_1.id,
            "description": "Enterprise cloud infrastructure, container orchestration, and serverless compute models."
        })

        c2 = _get_or_create(db, Course, {"id": "course-cs201"}, {
            "org_id": ORG_ID,
            "code": "CS201",
            "name": "Data Structures & Algorithm Design",
            "department_id": DEPT_ID,
            "semester": 3,
            "credits": 4,
            "faculty_id": faculty_2.id,
            "description": "Comprehensive analysis of tree, graph, sorting, dynamic programming, and memory algorithms."
        })

        # Enrollments
        for s in students:
            _get_or_create(db, Enrollment, {"user_id": s.id, "course_id": c1.id}, {
                "status": EnrollmentStatus.ENROLLED
            })
            _get_or_create(db, Enrollment, {"user_id": s.id, "course_id": c2.id}, {
                "status": EnrollmentStatus.ENROLLED
            })

        # Certificate Settings
        _get_or_create(db, CertificateSetting, {"org_id": ORG_ID, "course_id": c1.id}, {
            "min_attendance_pct": 75.0,
            "min_assessment_score": 50.0,
            "require_all_lessons": True,
            "is_enabled": True
        })

        db.commit()
        print("[OK] Demo dataset seeded successfully!")
        print("     • Faculty credentials: faculty1@edusphere.edu.in / Faculty@Demo123")
        print("     • Student credentials: student1@edusphere.edu.in / Student@Demo123")
        print("     • Note: Admin account must be created via 'python -m app.cli create-admin'")
    except Exception as e:
        db.rollback()
        print(f"ERROR: Failed to seed demo data: {e}")
        sys.exit(1)
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="EduSphere Management CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # create-admin
    admin_parser = subparsers.add_parser("create-admin", help="Bootstrap initial administrator account")
    admin_parser.add_argument("--email", required=True, help="Administrator email address")
    admin_parser.add_argument("--name", required=True, help="Administrator full name")

    # seed-demo
    subparsers.add_parser("seed-demo", help="Seed demo dataset (Requires ENV=demo and db ending with _demo)")

    args = parser.parse_args()

    if args.command == "create-admin":
        create_admin(email=args.email, name=args.name)
    elif args.command == "seed-demo":
        seed_demo()


if __name__ == "__main__":
    main()
