import os
import re
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from models.user import User, UserRole
from models.academic import Course, Enrollment, EnrollmentStatus
from models.certificate import Certificate, CertificateSetting, CertificateStatus
from middleware.auth import get_current_user, require_roles, get_current_user_from_token
from services.certificate_service import (
    get_or_create_settings,
    evaluate_and_issue_certificate,
    calculate_student_metrics,
    STORAGE_DIR
)


router = APIRouter(prefix="/api/certificates", tags=["Certificates"])


class ThresholdUpdateSchema(BaseModel):
    min_attendance_pct: float = Field(..., ge=0.0, le=100.0)
    min_assessment_pct: float = Field(..., ge=0.0, le=100.0)
    min_progress_pct: Optional[float] = Field(100.0, ge=0.0, le=100.0)


class EvaluateSchema(BaseModel):
    student_id: str
    course_id: str


@router.get("/verify/{code}")
def verify_certificate_public(code: str, db: Session = Depends(get_db)):
    """
    Public unauthenticated endpoint to verify authenticity of a certificate.
    Returns valid/revoked status, student name, course details, date, and metrics.
    """
    cert = db.query(Certificate).filter(
        (Certificate.certificate_code == code) | (Certificate.id == code)
    ).first()

    if not cert:
        raise HTTPException(status_code=404, detail="Certificate code not found or invalid.")

    student = db.query(User).filter(User.id == cert.user_id).first()
    course = db.query(Course).filter(Course.id == cert.course_id).first()

    is_revoked = cert.eligibility_status == CertificateStatus.REVOKED
    is_valid = cert.eligibility_status == CertificateStatus.ISSUED

    status_str = "REVOKED" if is_revoked else ("VALID" if is_valid else cert.eligibility_status.value)

    return {
        "valid": is_valid,
        "status": status_str,
        "certificate_code": cert.certificate_code,
        "student_name": student.name if student else "Enrolled Student",
        "student_email": student.email if student else "",
        "enrollment_no": student.enrollment_no if (student and student.enrollment_no) else "ENR-CONFIRMED",
        "course_name": course.name if course else "Course Program",
        "course_code": course.code if course else "COURSE-101",
        "issued_date": cert.issued_date.strftime("%B %d, %Y") if cert.issued_date else "N/A",
        "attendance_pct": cert.attendance_pct,
        "assessment_pct": cert.assessment_pct,
        "progress_pct": getattr(cert, "progress_pct", 100.0),
        "issuer": "EduSphere Universal LMS Senate"
    }


@router.get("/settings")
def get_threshold_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    setting = get_or_create_settings(db, current_user.org_id)
    return {
        "org_id": setting.org_id,
        "min_attendance_pct": setting.min_attendance_pct,
        "min_assessment_pct": setting.min_assessment_pct,
        "min_progress_pct": getattr(setting, "min_progress_pct", 100.0),
        "updated_at": setting.updated_at
    }


@router.post("/settings")
def update_threshold_settings(
    payload: ThresholdUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    setting = get_or_create_settings(db, current_user.org_id)
    setting.min_attendance_pct = payload.min_attendance_pct
    setting.min_assessment_pct = payload.min_assessment_pct
    if payload.min_progress_pct is not None:
        setting.min_progress_pct = payload.min_progress_pct
    db.commit()
    db.refresh(setting)

    # Re-evaluate existing certificates for org against new thresholds
    certs = db.query(Certificate).filter(Certificate.org_id == current_user.org_id).all()
    for c in certs:
        if c.eligibility_status != CertificateStatus.REVOKED:
            is_eligible = (
                c.attendance_pct >= setting.min_attendance_pct and
                c.assessment_pct >= setting.min_assessment_pct and
                getattr(c, "progress_pct", 100.0) >= getattr(setting, "min_progress_pct", 100.0)
            )
            c.eligibility_status = CertificateStatus.ISSUED if is_eligible else CertificateStatus.INELIGIBLE
    db.commit()

    return {
        "message": "Thresholds updated successfully",
        "min_attendance_pct": setting.min_attendance_pct,
        "min_assessment_pct": setting.min_assessment_pct,
        "min_progress_pct": getattr(setting, "min_progress_pct", 100.0)
    }


@router.get("/my-certificates")
def get_my_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates real attendance, assessment scores, and progress for all enrolled courses
    of the authenticated student and returns dynamic eligibility checklists + certificates.
    """
    settings_obj = get_or_create_settings(db, current_user.org_id)
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED])
    ).all()

    results = []
    for enr in enrollments:
        course = db.query(Course).filter(Course.id == enr.course_id).first()
        if not course:
            continue

        attendance_pct, assessment_pct, progress_pct = calculate_student_metrics(
            db, current_user.id, course.id
        )

        attendance_met = attendance_pct >= settings_obj.min_attendance_pct
        assessment_met = assessment_pct >= settings_obj.min_assessment_pct
        progress_met = progress_pct >= getattr(settings_obj, "min_progress_pct", 100.0)

        is_eligible = attendance_met and assessment_met and progress_met

        # Check existing certificate or issue if eligible
        cert = db.query(Certificate).filter(
            Certificate.user_id == current_user.id,
            Certificate.course_id == course.id
        ).first()

        if is_eligible:
            try:
                cert = evaluate_and_issue_certificate(
                    db, current_user.id, course.id, current_user.org_id
                )
            except Exception as e:
                print(f"[EVALUATE CERT ERROR] {e}")

        status_val = cert.eligibility_status.value if cert else ("ELIGIBLE" if is_eligible else "INELIGIBLE")

        results.append({
            "id": cert.id if cert else f"eval-{course.id}",
            "user_id": current_user.id,
            "student_name": current_user.name,
            "course_id": course.id,
            "course_name": course.name,
            "course_code": course.code,
            "attendance_pct": attendance_pct,
            "attendance_met": attendance_met,
            "attendance_threshold": settings_obj.min_attendance_pct,
            "assessment_pct": assessment_pct,
            "assessment_met": assessment_met,
            "assessment_threshold": settings_obj.min_assessment_pct,
            "progress_pct": progress_pct,
            "progress_met": progress_met,
            "is_eligible": is_eligible and (cert is None or cert.eligibility_status != CertificateStatus.REVOKED),
            "certificate_code": cert.certificate_code if cert else None,
            "certificate_url": cert.certificate_url if (cert and cert.eligibility_status == CertificateStatus.ISSUED) else None,
            "eligibility_status": status_val,
            "issued_date": cert.issued_date.strftime("%Y-%m-%d") if (cert and cert.issued_date) else ("Completed" if is_eligible else "In Progress")
        })

    return results


@router.get("/all")
def get_all_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY]))
):
    """
    Roster of all evaluated/issued certificates for admin and faculty view.
    """
    certs = db.query(Certificate).order_by(Certificate.issued_date.desc()).all()
    result = []
    for c in certs:
        student = db.query(User).filter(User.id == c.user_id).first()
        course = db.query(Course).filter(Course.id == c.course_id).first()
        result.append({
            "id": c.id,
            "user_id": c.user_id,
            "student_name": student.name if student else "Student",
            "student_email": student.email if student else "",
            "course_id": c.course_id,
            "course_name": course.name if course else "Course",
            "course_code": course.code if course else "CODE",
            "issued_date": c.issued_date.strftime("%Y-%m-%d") if c.issued_date else "",
            "certificate_code": c.certificate_code,
            "certificate_url": c.certificate_url,
            "eligibility_status": c.eligibility_status.value,
            "attendance_pct": c.attendance_pct,
            "assessment_pct": c.assessment_pct,
            "progress_pct": getattr(c, "progress_pct", 100.0)
        })
    return result


@router.post("/evaluate")
def evaluate_certificate(
    payload: EvaluateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        cert = evaluate_and_issue_certificate(db, payload.student_id, payload.course_id, current_user.org_id)
        return {
            "message": "Certificate evaluated successfully",
            "id": cert.id,
            "eligibility_status": cert.eligibility_status.value,
            "attendance_pct": cert.attendance_pct,
            "assessment_pct": cert.assessment_pct,
            "progress_pct": getattr(cert, "progress_pct", 100.0),
            "certificate_code": cert.certificate_code,
            "certificate_url": cert.certificate_url
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/revoke/{certificate_id}")
def revoke_certificate(
    certificate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY]))
):
    cert = db.query(Certificate).filter(
        (Certificate.id == certificate_id) | (Certificate.certificate_code == certificate_id)
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert.eligibility_status = CertificateStatus.REVOKED
    db.commit()
    return {"message": "Certificate revoked successfully", "id": cert.id, "status": "REVOKED"}


@router.get("/download-pdf/{filename}")
def download_certificate_pdf(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '', filename)
    file_path = os.path.join(STORAGE_DIR, safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF certificate file not found")

    code = safe_filename.replace(".pdf", "")

    # Role & Ownership check
    if current_user.role not in [UserRole.ADMIN, UserRole.FACULTY]:
        cert = db.query(Certificate).filter(Certificate.certificate_code == code).first()
        if cert and cert.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to download this certificate")

    # Dispatch multi-channel notification if enabled (using real student name)
    from config import settings
    if settings.ENABLE_SECURITY_ALERTS:
        try:
            from services.notification_dispatcher import dispatch_certificate_alert
            cert = db.query(Certificate).filter(Certificate.certificate_code == code).first()
            course_name = "Institutional Certification"
            if cert:
                c_obj = db.query(Course).filter(Course.id == cert.course_id).first()
                if c_obj:
                    course_name = c_obj.name
            dispatch_certificate_alert(
                current_user.name,
                current_user.phone or "",
                current_user.email,
                code,
                course_name
            )
        except Exception as ne:
            print(f"[NOTIFICATION TRIGGER ERROR] {ne}")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=safe_filename
    )
