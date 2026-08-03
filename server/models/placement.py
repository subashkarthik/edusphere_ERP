import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Date, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class DriveStatus(str, enum.Enum):
    UPCOMING = "UPCOMING"
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"


class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    SHORTLISTED = "SHORTLISTED"
    INTERVIEW = "INTERVIEW"
    SELECTED = "SELECTED"
    REJECTED = "REJECTED"


class PlacementDrive(Base):
    __tablename__ = "placement_drives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role_offered: Mapped[str] = mapped_column(String(255), nullable=False)
    package_lpa: Mapped[float] = mapped_column(Float, nullable=False)
    drive_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    last_date_apply: Mapped[datetime] = mapped_column(Date, nullable=False)
    eligibility_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[DriveStatus] = mapped_column(SAEnum(DriveStatus), default=DriveStatus.UPCOMING)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    applications = relationship("PlacementApplication", back_populates="drive", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PlacementDrive {self.company_name}: {self.role_offered}>"


class PlacementApplication(Base):
    __tablename__ = "placement_applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    drive_id: Mapped[str] = mapped_column(String(36), ForeignKey("placement_drives.id"), nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(SAEnum(ApplicationStatus), default=ApplicationStatus.APPLIED)
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="placement_applications")
    drive = relationship("PlacementDrive", back_populates="applications")

    def __repr__(self):
        return f"<PlacementApp {self.student_id} -> {self.drive_id}: {self.status.value}>"


class PlacementStats(Base):
    """Historical placement statistics by year — pre-aggregated for dashboard charts."""
    __tablename__ = "placement_stats"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    year: Mapped[str] = mapped_column(String(4), nullable=False)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")
    placed: Mapped[int] = mapped_column(Integer, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    avg_lpa: Mapped[float] = mapped_column(Float, nullable=False)

    def __repr__(self):
        return f"<PlacementStats {self.year}: {self.placed}/{self.total}>"
