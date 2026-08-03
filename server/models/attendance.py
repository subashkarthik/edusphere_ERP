import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"


class SessionStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), nullable=False)
    faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    session_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    start_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(SAEnum(SessionStatus), default=SessionStatus.OPEN)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="attendance_sessions")
    faculty = relationship("User", foreign_keys=[faculty_id])
    logs = relationship("AttendanceLog", back_populates="session", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AttendanceSession {self.session_date} - {self.course_id}>"


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("attendance_sessions.id"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(SAEnum(AttendanceStatus), default=AttendanceStatus.PRESENT)
    marked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")

    # Relationships
    session = relationship("AttendanceSession", back_populates="logs")
    student = relationship("User", back_populates="attendance_logs")

    def __repr__(self):
        return f"<AttendanceLog {self.student_id}: {self.status.value}>"
