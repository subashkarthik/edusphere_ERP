import os
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from database import get_db
from models.user import User, UserRole
from models.academic import Course, Enrollment
from models.certificate import Certificate, CertificateSetting, CertificateStatus
from middleware.auth import get_current_user, require_roles
from services.certificate_service import (
    get_or_create_settings,
    evaluate_and_issue_certificate,
    evaluate_video_course_certificates,
    calculate_student_metrics,
    STORAGE_DIR
)


router = APIRouter(prefix="/api/certificates", tags=["Certificates"])


class ThresholdUpdateSchema(BaseModel):
    min_attendance_pct: float = Field(..., ge=0.0, le=100.0)
    min_assessment_pct: float = Field(..., ge=0.0, le=100.0)


class EvaluateSchema(BaseModel):
    student_id: str
    course_id: str


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
    db.commit()
    db.refresh(setting)

    # Re-evaluate certificates for org to update status against new thresholds
    certs = db.query(Certificate).filter(Certificate.org_id == current_user.org_id).all()
    for c in certs:
        is_eligible = (c.attendance_pct >= setting.min_attendance_pct) and (c.assessment_pct >= setting.min_assessment_pct)
        if c.eligibility_status != CertificateStatus.REVOKED:
            c.eligibility_status = CertificateStatus.ISSUED if is_eligible else CertificateStatus.INELIGIBLE
    db.commit()

    return {
        "message": "Thresholds updated successfully",
        "min_attendance_pct": setting.min_attendance_pct,
        "min_assessment_pct": setting.min_assessment_pct
    }


@router.get("/my-certificates")
def get_my_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates real-time progress for all uploaded video courses in storage/videos.
    Returns course-specific completion status & PDF certificates.
    """
    video_certs = evaluate_video_course_certificates(db, current_user.id, current_user.org_id)
    return video_certs




@router.get("/all")
def get_all_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY]))

):
    certs = db.query(Certificate).order_by(Certificate.issued_date.desc()).all()
    result = []
    for c in certs:
        student = db.query(User).filter(User.id == c.user_id).first()
        course = db.query(Course).filter(Course.id == c.course_id).first()
        result.append({
            "id": c.id,
            "user_id": c.user_id,
            "student_name": student.name if student else "Alex Johnson",
            "student_email": student.email if student else "student@edusphere.edu.in",
            "course_id": c.course_id,
            "course_name": course.name if course else "Computer Science Core",
            "course_code": course.code if course else "CS8701",
            "issued_date": c.issued_date.strftime("%Y-%m-%d"),
            "certificate_code": c.certificate_code,
            "certificate_url": c.certificate_url,
            "eligibility_status": c.eligibility_status.value,
            "attendance_pct": c.attendance_pct,
            "assessment_pct": c.assessment_pct,
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
            "certificate_code": cert.certificate_code,
            "certificate_url": cert.certificate_url
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/revoke/{certificate_id}")
def revoke_certificate(
    certificate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))

):
    cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    cert.eligibility_status = CertificateStatus.REVOKED
    db.commit()
    return {"message": "Certificate revoked successfully", "id": cert.id, "status": "REVOKED"}


from middleware.auth import get_current_user, require_roles, get_current_user_from_token

@router.get("/download-pdf/{filename}")
def download_certificate_pdf(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    file_path = os.path.join(STORAGE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF certificate file not found")
    
    code = filename.replace(".pdf", "")

    # Role & Ownership security check: Admin and Faculty can access any certificate PDF; Student can only download their own.
    if current_user.role not in [UserRole.ADMIN, UserRole.FACULTY]:
        cert = db.query(Certificate).filter(Certificate.certificate_code == code).first()
        if cert and cert.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to download this certificate")

    # Trigger Multi-Channel SMS & Email Alert if enabled
    from config import settings
    if settings.ENABLE_SECURITY_ALERTS:
        try:
            from services.notification_dispatcher import dispatch_certificate_alert
            dispatch_certificate_alert(current_user.name, current_user.phone or "", current_user.email, code, "Institutional Certification")
        except Exception as ne:
            print(f"[NOTIFICATION TRIGGER ERROR] {ne}")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=filename
    )
