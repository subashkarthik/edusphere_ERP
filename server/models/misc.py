import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Date, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Priority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class LeaveType(str, enum.Enum):
    CASUAL = "CASUAL"
    SICK = "SICK"
    ACADEMIC = "ACADEMIC"


class LeaveStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class BookIssueStatus(str, enum.Enum):
    ISSUED = "ISSUED"
    RETURNED = "RETURNED"
    OVERDUE = "OVERDUE"


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    target_roles: Mapped[str] = mapped_column(String(100), default="ADMIN,FACULTY,STUDENT")
    priority: Mapped[Priority] = mapped_column(SAEnum(Priority), default=Priority.MEDIUM)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    author = relationship("User", back_populates="announcements")

    def __repr__(self):
        return f"<Announcement {self.title}>"


# AuditLog consolidated to models/audit.py


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    leave_type: Mapped[LeaveType] = mapped_column(SAEnum(LeaveType), nullable=False)
    start_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[LeaveStatus] = mapped_column(SAEnum(LeaveStatus), default=LeaveStatus.PENDING)
    approved_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="leave_requests", foreign_keys=[user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])

    def __repr__(self):
        return f"<LeaveRequest {self.user_id}: {self.leave_type.value} ({self.status.value})>"


class LibraryBook(Base):
    __tablename__ = "library_books"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    isbn: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    publisher: Mapped[str] = mapped_column(String(255), default="")
    total_copies: Mapped[int] = mapped_column(Integer, default=1)
    available_copies: Mapped[int] = mapped_column(Integer, default=1)
    category: Mapped[str] = mapped_column(String(50), default="General")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    issues = relationship("BookIssue", back_populates="book")

    def __repr__(self):
        return f"<LibraryBook {self.title}>"


class BookIssue(Base):
    __tablename__ = "book_issues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    book_id: Mapped[str] = mapped_column(String(36), ForeignKey("library_books.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    issue_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    due_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    return_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    status: Mapped[BookIssueStatus] = mapped_column(SAEnum(BookIssueStatus), default=BookIssueStatus.ISSUED)
    fine_amount: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    book = relationship("LibraryBook", back_populates="issues")
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<BookIssue {self.book_id} -> {self.user_id}>"
