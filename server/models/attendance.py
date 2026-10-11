import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Date, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    OD = "OD"


class SessionStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, index=True, default="org-edusphere")
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), nullable=False, index=True)
    faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    session_date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    period: Mapped[str | None] = mapped_column(String(50), nullable=True) # e.g. "09:00 - 10:00" or "Period 1"
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    start_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(SAEnum(SessionStatus), default=SessionStatus.OPEN)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="attendance_sessions")
    faculty = relationship("User", foreign_keys=[faculty_id])
    creator = relationship("User", foreign_keys=[created_by])
    logs = relationship("AttendanceLog", back_populates="session", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AttendanceSession {self.session_date} - {self.course_id} ({self.topic or 'General'})>"


# ClassSession alias for semantic clarity
ClassSession = AttendanceSession


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    __table_args__ = (
        UniqueConstraint('session_id', 'student_id', name='uq_attendance_session_student'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, index=True, default="org-edusphere")
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("attendance_sessions.id"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[AttendanceStatus] = mapped_column(SAEnum(AttendanceStatus), default=AttendanceStatus.PRESENT)
    marked_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    marked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("AttendanceSession", back_populates="logs")
    student = relationship("User", back_populates="attendance_logs", foreign_keys=[student_id])
    marker = relationship("User", foreign_keys=[marked_by])

    def __repr__(self):
        return f"<AttendanceLog {self.student_id}: {self.status.value}>"


# Attendance alias for semantic clarity
Attendance = AttendanceLog
