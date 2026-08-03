from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
from models.user import User, UserRole
from models.finance import FeeStructure, FeePayment, PaymentStatus, LedgerEntry
from schemas.schemas import FeeResponse, PaymentCreate, FinanceReportResponse
from middleware.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/finance", tags=["Finance"])


@router.get("/ledger")
def get_ledger(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full transactional financial ledger for student or administrative overview."""
    if current_user.role == UserRole.STUDENT:
        entries = db.query(LedgerEntry).filter(LedgerEntry.student_id == current_user.id).order_by(LedgerEntry.created_at.desc()).all()
    else:
        entries = db.query(LedgerEntry).order_by(LedgerEntry.created_at.desc()).limit(200).all()
        
    return [
        {
            "id": e.id,
            "student_name": e.student.name if e.student else "Unknown",
            "amount": e.amount,
            "entry_type": e.entry_type,
            "label": e.label,
            "transaction_id": e.transaction_id,
            "created_at": str(e.created_at)
        }
        for e in entries
    ]



@router.get("/fees", response_model=List[FeeResponse])
def get_fees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get fee structures with payment status for the current student, or all fees for admin."""
    if current_user.role == UserRole.STUDENT:
        fee_structures = db.query(FeeStructure).filter(
            FeeStructure.department_id == current_user.department_id
        ).order_by(FeeStructure.due_date.desc()).all()
    else:
        fee_structures = db.query(FeeStructure).order_by(FeeStructure.due_date.desc()).all()

    results = []
    for fs in fee_structures:
        # Check if this student has paid this fee
        payment = None
        if current_user.role == UserRole.STUDENT:
            payment = db.query(FeePayment).filter(
                FeePayment.student_id == current_user.id,
                FeePayment.fee_structure_id == fs.id,
                FeePayment.status == PaymentStatus.COMPLETED,
            ).first()

        results.append(FeeResponse(
            id=fs.id,
            label=fs.label,
            amount=fs.amount,
            due_date=str(fs.due_date),
            status="Paid" if payment else "Pending",
            payment_date=str(payment.payment_date) if payment else None,
            semester_label=fs.semester_label,
        ))
    return results


@router.post("/payments")
def make_payment(
    request: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a fee payment for the current student."""
    fs = db.query(FeeStructure).filter(FeeStructure.id == request.fee_structure_id).first()
    if not fs:
        raise HTTPException(status_code=404, detail="Fee structure not found")

    # Check if already paid
    existing = db.query(FeePayment).filter(
        FeePayment.student_id == current_user.id,
        FeePayment.fee_structure_id == request.fee_structure_id,
        FeePayment.status == PaymentStatus.COMPLETED,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Fee already paid")

    payment = FeePayment(
        student_id=current_user.id,
        fee_structure_id=request.fee_structure_id,
        amount_paid=request.amount_paid,
        payment_method=request.payment_method,
        transaction_id=request.transaction_id or f"TXN-{current_user.id[:8]}",
    )
    db.add(payment)
    db.flush()

    # Log double-entry ledger credit (reduces student's debt)
    ledger_entry = LedgerEntry(
        org_id=current_user.org_id or "org-edusphere",
        student_id=current_user.id,
        amount=request.amount_paid,
        entry_type="CREDIT",
        label=f"Fee Payment: {fs.label}",
        transaction_id=payment.transaction_id
    )
    db.add(ledger_entry)
    db.commit()

    return {"message": f"Payment of ₹{request.amount_paid} recorded and logged to ledger for {fs.label}"}



@router.get("/payments/history")
def payment_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get payment history for current student or all payments for admin."""
    if current_user.role == UserRole.STUDENT:
        payments = db.query(FeePayment).filter(FeePayment.student_id == current_user.id).order_by(FeePayment.payment_date.desc()).all()
    else:
        payments = db.query(FeePayment).order_by(FeePayment.payment_date.desc()).limit(100).all()

    return [
        {
            "id": p.id,
            "student_name": p.student.name if p.student else None,
            "fee_label": p.fee_structure.label if p.fee_structure else None,
            "amount_paid": p.amount_paid,
            "payment_date": str(p.payment_date),
            "payment_method": p.payment_method,
            "transaction_id": p.transaction_id,
            "status": p.status.value,
        }
        for p in payments
    ]


@router.get("/outstanding")
def get_outstanding(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate total outstanding dues for the current student."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="Outstanding is for students only")

    fee_structures = db.query(FeeStructure).filter(
        FeeStructure.department_id == current_user.department_id
    ).all()

    total_due = 0
    total_paid = 0
    for fs in fee_structures:
        total_due += fs.amount
        payment = db.query(FeePayment).filter(
            FeePayment.student_id == current_user.id,
            FeePayment.fee_structure_id == fs.id,
            FeePayment.status == PaymentStatus.COMPLETED,
        ).first()
        if payment:
            total_paid += payment.amount_paid

    return {
        "total_due": total_due,
        "total_paid": total_paid,
        "outstanding": total_due - total_paid,
    }


@router.get("/reports", response_model=FinanceReportResponse)
def finance_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FINANCE])),
):
    """Get institutional finance reports. Admin/Finance only."""
    total_revenue = db.query(func.sum(FeePayment.amount_paid)).filter(
        FeePayment.status == PaymentStatus.COMPLETED
    ).scalar() or 0

    total_fees = db.query(func.sum(FeeStructure.amount)).scalar() or 0
    total_students = db.query(User).filter(User.role == UserRole.STUDENT, User.is_active == True).count()
    total_possible = total_fees * total_students if total_students > 0 else 1

    return FinanceReportResponse(
        total_revenue=total_revenue,
        total_outstanding=max(0, total_possible - total_revenue),
        total_students=total_students,
        collection_rate=round((total_revenue / total_possible * 100), 1) if total_possible > 0 else 0,
    )
