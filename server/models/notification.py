import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, default="org-edusphere", index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    type: Mapped[str] = mapped_column(String(50), nullable=False) # ENROLLMENT, ATTENDANCE_WARNING, QUIZ_PUBLISHED, ASSIGNMENT_GRADED, CERTIFICATE_ISSUED, CERTIFICATE_REVOKED
    title: Mapped[str] = mapped_column(String(255), default="Notification")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    @property
    def is_read(self) -> bool:
        return self.read

    @is_read.setter
    def is_read(self, val: bool):
        self.read = val

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "org_id": self.org_id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "read": self.read,
            "is_read": self.read,
            "link": self.link,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
