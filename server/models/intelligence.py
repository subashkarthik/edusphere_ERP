import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class LearningMetric(Base):
    """Unified Learning Health Score and Risk Prediction."""
    __tablename__ = "learning_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Computed scores
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0-100
    attendance_score: Mapped[float] = mapped_column(Float, default=0.0)
    assessment_score: Mapped[float] = mapped_column(Float, default=0.0)
    activity_score: Mapped[float] = mapped_column(Float, default=0.0)
    
    # New Fields
    gpa_proxy: Mapped[float] = mapped_column(Float, default=0.0)
    velocity_json: Mapped[str | None] = mapped_column(Text, nullable=True) # Week-wise scores
    
    # Risk assessment
    risk_level: Mapped[str] = mapped_column(String(20), default="NORMAL")  # NORMAL, WARNING, CRITICAL
    prediction_summary: Mapped[str | None] = mapped_column(Text, nullable=True)  # e.g., "At risk of attendance shortage"
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="learning_metrics")

class Recommendation(Base):
    """Smart suggestions based on learning gaps."""
    __tablename__ = "recommendations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    
    type: Mapped[str] = mapped_column(String(50))  # REVISE, PRACTICE, ATTEND, EXPLORE
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="recommendations")

class UserNotification(Base):
    """Real-time intelligence alerts."""
    __tablename__ = "user_notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50))  # ALERT, INFO, SUCCESS, WARNING
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="user_notifications")

class StudyTask(Base):
    """AI Generated Study Tasks for the planner."""
    __tablename__ = "study_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    
    title: Mapped[str] = mapped_column(String(255))
    duration: Mapped[str] = mapped_column(String(50))
    priority: Mapped[str] = mapped_column(String(20)) # HIGH, URGENT, MEDIUM, LOW
    type: Mapped[str] = mapped_column(String(50)) # REVISION, PROJECT, VIDEO, ASSIGNMENT
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="study_tasks")
