import sys
import os

# Ensure the server directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
from models.organization import Organization
from models.user import User, Department
from models.academic import Course, Enrollment, TimetableEntry, CourseMaterial
from models.content import Module, Lesson, Assignment, Submission, Discussion
from models.intelligence import LearningMetric, Recommendation, UserNotification, StudyTask
from models.audit import AuditLog

def init_db():
    print("[INIT] Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] All enterprise tables initialized successfully.")
    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}")

if __name__ == "__main__":
    init_db()
