import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"
    FINANCE = "FINANCE"
    REGISTRAR = "REGISTRAR"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False, default=UserRole.STUDENT)
    department_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("departments.id", use_alter=True, name="fk_user_dept_id"), nullable=True)
    avatar: Mapped[str] = mapped_column(String(500), default="https://ui-avatars.com/api/?name=User&background=1e3a8a&color=fff")
    enrollment_no: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="users")
    department = relationship("Department", back_populates="users", foreign_keys=[department_id])
    enrollments = relationship("Enrollment", back_populates="student", foreign_keys="Enrollment.student_id")
    taught_courses = relationship("Course", back_populates="faculty", foreign_keys="Course.faculty_id")
    attendance_logs = relationship("AttendanceLog", back_populates="student")
    fee_payments = relationship("FeePayment", back_populates="student")
    placement_applications = relationship("PlacementApplication", back_populates="student")
    announcements = relationship("Announcement", back_populates="author")
    audit_logs = relationship("AuditLog", back_populates="user")
    leave_requests = relationship("LeaveRequest", back_populates="user", foreign_keys="LeaveRequest.user_id")
    uploaded_materials = relationship("CourseMaterial", back_populates="uploaded_by")
    
    # Intelligence Layer Relationships
    learning_metrics = relationship("LearningMetric", back_populates="user", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="user", cascade="all, delete-orphan")
    user_notifications = relationship("UserNotification", back_populates="user", cascade="all, delete-orphan")
    study_tasks = relationship("StudyTask", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.name} ({self.role.value})>"


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    head_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", use_alter=True, name="fk_dept_head_id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="department", foreign_keys="User.department_id")
    courses = relationship("Course", back_populates="department")
    fee_structures = relationship("FeeStructure", back_populates="department")
    head = relationship("User", foreign_keys=[head_id])

    def __repr__(self):
        return f"<Department {self.code}: {self.name}>"
