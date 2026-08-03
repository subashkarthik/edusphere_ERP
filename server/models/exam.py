import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class ExamType(str, enum.Enum):
    INTERNAL_1 = "INTERNAL_1"
    INTERNAL_2 = "INTERNAL_2"
    SEMESTER = "SEMESTER"
    ASSIGNMENT = "ASSIGNMENT"
    LAB = "LAB"


class ExamSchedule(Base):
    __tablename__ = "exam_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), nullable=False)
    exam_type: Mapped[ExamType] = mapped_column(SAEnum(ExamType), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    exam_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    max_marks: Mapped[int] = mapped_column(Integer, default=100)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=180)
    venue: Mapped[str] = mapped_column(String(50), default="TBD")
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="exam_schedules")
    results = relationship("ExamResult", back_populates="exam", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ExamSchedule {self.title} ({self.exam_type.value})>"


class ExamResult(Base):
    __tablename__ = "exam_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(String(36), ForeignKey("exam_schedules.id"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    enrollment_id: Mapped[str] = mapped_column(String(36), ForeignKey("enrollments.id"), nullable=False)
    marks_obtained: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    grade: Mapped[str | None] = mapped_column(String(5), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    exam = relationship("ExamSchedule", back_populates="results")
    student = relationship("User", foreign_keys=[student_id])
    enrollment = relationship("Enrollment", back_populates="exam_results")

    def __repr__(self):
        return f"<ExamResult {self.student_id}: {self.marks_obtained}/{self.grade}>"


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=15)
    passing_percentage: Mapped[float] = mapped_column(Float, default=60.0)
    total_marks: Mapped[int] = mapped_column(Integer, default=100)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id: Mapped[str] = mapped_column(String(36), ForeignKey("quizzes.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(String(1000), nullable=False)
    option_a: Mapped[str] = mapped_column(String(255), nullable=False)
    option_b: Mapped[str] = mapped_column(String(255), nullable=False)
    option_c: Mapped[str] = mapped_column(String(255), nullable=False)
    option_d: Mapped[str] = mapped_column(String(255), nullable=False)
    correct_option: Mapped[str] = mapped_column(String(1), nullable=False) # 'A', 'B', 'C', or 'D'
    explanation: Mapped[str | None] = mapped_column(String(500), nullable=True)
    marks: Mapped[int] = mapped_column(Integer, default=10)
    order_num: Mapped[int] = mapped_column(Integer, default=1)

    quiz = relationship("Quiz", back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id: Mapped[str] = mapped_column(String(36), ForeignKey("quizzes.id"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    percentage: Mapped[float] = mapped_column(Float, default=0.0)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    correct_answers: Mapped[int] = mapped_column(Integer, default=0)
    tab_switch_violations: Mapped[int] = mapped_column(Integer, default=0)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    quiz = relationship("Quiz", back_populates="attempts")
    student = relationship("User", foreign_keys=[student_id])

