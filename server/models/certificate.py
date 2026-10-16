import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class CertificateStatus(str, enum.Enum):
    ELIGIBLE = "ELIGIBLE"
    ISSUED = "ISSUED"
    REVOKED = "REVOKED"
    INELIGIBLE = "INELIGIBLE"


class Certificate(Base):
    __tablename__ = "certificates"
    __table_args__ = (
        UniqueConstraint('certificate_code', name='uq_certificates_code'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, index=True, default="org-edusphere")
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), nullable=False, index=True)
    issued_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    certificate_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    certificate_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    eligibility_status: Mapped[CertificateStatus] = mapped_column(SAEnum(CertificateStatus), default=CertificateStatus.ISSUED)
    attendance_pct: Mapped[float] = mapped_column(Float, default=0.0)
    assessment_pct: Mapped[float] = mapped_column(Float, default=0.0)
    progress_pct: Mapped[float] = mapped_column(Float, default=0.0)

    # Manual Faculty/Admin Override
    is_override: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    override_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    course = relationship("Course", foreign_keys=[course_id])
    overrider = relationship("User", foreign_keys=[override_by_id])

    # Semantic properties
    @property
    def student_id(self):
        return self.user_id

    @property
    def issued_at(self):
        return self.issued_date

    def __repr__(self):
        return f"<Certificate {self.certificate_code} ({self.eligibility_status.value})>"


class CertificatePolicy(Base):
    __tablename__ = "certificate_policies"
    __table_args__ = (
        UniqueConstraint('course_id', name='uq_certificate_policies_course_id'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, index=True, default="org-edusphere")
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), unique=True, nullable=False, index=True)
    min_attendance_pct: Mapped[float] = mapped_column(Float, default=75.0)
    min_assessment_pct: Mapped[float] = mapped_column(Float, default=50.0)
    min_progress_pct: Mapped[float] = mapped_column(Float, default=100.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="certificate_policy")

    def __repr__(self):
        return f"<CertificatePolicy Course:{self.course_id} Attn>={self.min_attendance_pct}% Exam>={self.min_assessment_pct}% Prog>={self.min_progress_pct}%>"


class CertificateSetting(Base):
    __tablename__ = "certificate_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, unique=True, default="org-edusphere")
    min_attendance_pct: Mapped[float] = mapped_column(Float, default=75.0)
    min_assessment_pct: Mapped[float] = mapped_column(Float, default=50.0)
    min_progress_pct: Mapped[float] = mapped_column(Float, default=100.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<CertificateSetting Org:{self.org_id} Attn>={self.min_attendance_pct}% Exam>={self.min_assessment_pct}%>"
