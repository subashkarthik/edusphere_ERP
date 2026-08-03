import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Float, DateTime, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class PaymentStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    PENDING = "PENDING"
    FAILED = "FAILED"


class FeeStructure(Base):
    __tablename__ = "fee_structures"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id"), nullable=False)
    semester_label: Mapped[str] = mapped_column(String(20), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    due_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), default="2024-25")
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="fee_structures")
    payments = relationship("FeePayment", back_populates="fee_structure")

    def __repr__(self):
        return f"<FeeStructure {self.label}: ₹{self.amount}>"


class FeePayment(Base):
    __tablename__ = "fee_payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    fee_structure_id: Mapped[str] = mapped_column(String(36), ForeignKey("fee_structures.id"), nullable=False)
    amount_paid: Mapped[float] = mapped_column(Float, nullable=False)
    payment_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    payment_method: Mapped[str] = mapped_column(String(50), default="Online")
    transaction_id: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[PaymentStatus] = mapped_column(SAEnum(PaymentStatus), default=PaymentStatus.COMPLETED)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="fee_payments")
    fee_structure = relationship("FeeStructure", back_populates="payments")

    def __repr__(self):
        return f"<FeePayment ₹{self.amount_paid} ({self.status.value})>"


class LedgerEntry(Base):
    __tablename__ = "finance_ledger"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="org-edusphere")
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False) # DEBIT or CREDIT
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    transaction_id: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", foreign_keys=[student_id])

    def __repr__(self):
        return f"<LedgerEntry {self.entry_type}: ₹{self.amount} for {self.student_id}>"

