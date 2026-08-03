import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class AuditLog(Base):
    """Enterprise-grade audit logging for all critical system actions."""
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    
    action: Mapped[str] = mapped_column(String(100), nullable=False) # e.g., COURSE_CREATED, USER_LOGIN, GRADE_UPDATED
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g., COURSE, USER, ENROLLMENT
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    
    # Detailed metadata in JSON format
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True) 
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog {self.action} by {self.user_id} at {self.timestamp}>"
