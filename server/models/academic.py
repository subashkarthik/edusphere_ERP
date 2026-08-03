import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Enum as SAEnum, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class EnrollmentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"


class TimetableEntryType(str, enum.Enum):
    LECTURE = "LECTURE"
    LAB = "LAB"
    TUTORIAL = "TUTORIAL"


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id"), nullable=False)
    faculty_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    semester: Mapped[int] = mapped_column(Integer, default=7)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    schedule: Mapped[str | None] = mapped_column(String(100), nullable=True)
    max_students: Mapped[int] = mapped_column(Integer, default=120)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Curriculum approval workflow state
    approval_status: Mapped[str] = mapped_column(String(30), default="DRAFT") # DRAFT, DEPT_PENDING, DEAN_PENDING, ACTIVE, REJECTED
    submitted_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    approved_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    review_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)


    # Relationships
    organization = relationship("Organization", back_populates="courses")
    department = relationship("Department", back_populates="courses")
    faculty = relationship("User", back_populates="taught_courses", foreign_keys=[faculty_id])
    enrollments = relationship("Enrollment", back_populates="course")
    attendance_sessions = relationship("AttendanceSession", back_populates="course")
    exam_schedules = relationship("ExamSchedule", back_populates="course")
    timetable_entries = relationship("TimetableEntry", back_populates="course")
    materials = relationship("CourseMaterial", back_populates="course")
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="course", cascade="all, delete-orphan")
    discussions = relationship("Discussion", back_populates="course", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Course {self.code}: {self.name}>"


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), nullable=False)
    semester_label: Mapped[str] = mapped_column(String(20), default="Semester 7")
    grade: Mapped[str | None] = mapped_column(String(5), nullable=True)
    gpa_points: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[EnrollmentStatus] = mapped_column(SAEnum(EnrollmentStatus), default=EnrollmentStatus.ACTIVE)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="enrollments", foreign_keys=[student_id])
    course = relationship("Course", back_populates="enrollments")
    exam_results = relationship("ExamResult", back_populates="enrollment")

    def __repr__(self):
        return f"<Enrollment {self.student_id} -> {self.course_id}>"


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), nullable=False)
    faculty_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    day_of_week: Mapped[str] = mapped_column(String(10), nullable=False)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)
    venue: Mapped[str] = mapped_column(String(50), nullable=False)
    entry_type: Mapped[TimetableEntryType] = mapped_column(SAEnum(TimetableEntryType), default=TimetableEntryType.LECTURE)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="timetable_entries")
    faculty = relationship("User", foreign_keys=[faculty_id])

    def __repr__(self):
        return f"<Timetable {self.day_of_week} {self.start_time}-{self.end_time}: {self.course_id}>"


class CourseMaterial(Base):
    __tablename__ = "course_materials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), nullable=False)
    uploaded_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), default="PDF")
    file_url: Mapped[str] = mapped_column(String(500), default="")
    file_size: Mapped[str] = mapped_column(String(20), default="0 KB")
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="materials")
    uploaded_by = relationship("User", back_populates="uploaded_materials", foreign_keys=[uploaded_by_id])

    def __repr__(self):
        return f"<Material {self.title} ({self.file_type})>"
