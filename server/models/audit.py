import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class AuditLog(Base):
    """Enterprise-grade audit logging for all critical system actions."""
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    # Explicit actor, entity, state tracking
    actor_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True) # e.g., COURSE_CREATED, USER_LOGIN, GRADE_UPDATED
    entity: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True) # e.g., COURSE, USER, ATTENDANCE, CERTIFICATE
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=True) # legacy compat
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True) # legacy compat
    
    # State tracking
    before_state: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after_state: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True) 

    # Request context
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_id])

    def __repr__(self):
        return f"<AuditLog {self.action} by {self.actor_id or self.user_id} on {self.entity or self.resource_type}:{self.entity_id or self.resource_id}>"
