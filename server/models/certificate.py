import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class CertificateStatus(str, enum.Enum):
    ELIGIBLE = "ELIGIBLE"
    ISSUED = "ISSUED"
    REVOKED = "REVOKED"
    INELIGIBLE = "INELIGIBLE"


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), nullable=False)
    issued_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    certificate_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    certificate_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    eligibility_status: Mapped[CertificateStatus] = mapped_column(SAEnum(CertificateStatus), default=CertificateStatus.ISSUED)
    attendance_pct: Mapped[float] = mapped_column(Float, default=0.0)
    assessment_pct: Mapped[float] = mapped_column(Float, default=0.0)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    course = relationship("Course", foreign_keys=[course_id])

    def __repr__(self):
        return f"<Certificate {self.certificate_code} ({self.eligibility_status.value})>"


class CertificateSetting(Base):
    __tablename__ = "certificate_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, default="org-edusphere")
    min_attendance_pct: Mapped[float] = mapped_column(Float, default=75.0)
    min_assessment_pct: Mapped[float] = mapped_column(Float, default=60.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<CertificateSetting Org:{self.org_id} Attn>={self.min_attendance_pct}% Exam>={self.min_assessment_pct}%>"
