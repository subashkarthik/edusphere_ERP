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
from middleware.scoping import (
    verify_certificate_access,
    verify_course_access,
    verify_user_access,
    verify_org_access,
)
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


class CertificateIssueRequest(BaseModel):
    course_id: str
    student_id: Optional[str] = None


class CertificateOverrideRequest(BaseModel):
    student_id: str
    course_id: str
    reason: str


@router.get("/verify/{code}")
def verify_certificate_public(code: str, db: Session = Depends(get_db)):
    """
    Public unauthenticated endpoint to verify authenticity of a certificate.
    Returns valid/revoked status, student name, course details, date, metrics snapshot, and audit info.
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

    audit_entry = None
    if getattr(cert, "is_override", False):
        overrider = db.query(User).filter(User.id == cert.override_by_id).first() if cert.override_by_id else None
        audit_entry = {
            "action": "CERTIFICATE_MANUAL_OVERRIDE",
            "reason": cert.override_reason,
            "overridden_by": overrider.name if overrider else "Academic Authority",
            "timestamp": cert.issued_date.isoformat() if cert.issued_date else None,
        }

    return {
        "valid": is_valid,
        "status": status_str,
        "is_revoked": is_revoked,
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
        "is_override": getattr(cert, "is_override", False),
        "override_reason": getattr(cert, "override_reason", None),
        "audit_log": audit_entry,
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
        if c.eligibility_status != CertificateStatus.REVOKED and not getattr(c, "is_override", False):
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
    of the authenticated student using the unified metrics service (server/services/metrics.py).
    Certificate list on student page = rows from DB only (no 'CERTIFIED' label unless a Certificate row exists).
    """
    from services.metrics import certificate_eligibility

    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED])
    ).all()

    results = []
    for enr in enrollments:
        course = db.query(Course).filter(Course.id == enr.course_id).first()
        if not course:
            continue

        elig = certificate_eligibility(db, current_user.org_id, current_user.id, course.id)

        # Look up existing Certificate row in database
        cert = db.query(Certificate).filter(
            Certificate.user_id == current_user.id,
            Certificate.course_id == course.id
        ).first()

        # If eligible (or override exists) and not revoked, issue or update certificate
        if (elig["eligible"] or (cert and cert.is_override)) and (cert is None or cert.eligibility_status != CertificateStatus.REVOKED):
            from services.certificate_service import evaluate_and_issue_certificate
            cert = evaluate_and_issue_certificate(
                db,
                current_user.id,
                course.id,
                current_user.org_id,
                override=bool(cert and cert.is_override),
                override_reason=cert.override_reason if cert else None,
                override_by_id=cert.override_by_id if cert else None
            )

        is_certified = bool(cert and cert.eligibility_status == CertificateStatus.ISSUED)
        has_cert_row = bool(cert is not None)
        status_val = cert.eligibility_status.value if cert else ("ELIGIBLE" if elig["eligible"] else "INELIGIBLE")

        audit_entry = None
        if cert and getattr(cert, "is_override", False):
            overrider = db.query(User).filter(User.id == cert.override_by_id).first() if cert.override_by_id else None
            audit_entry = {
                "action": "CERTIFICATE_MANUAL_OVERRIDE",
                "reason": cert.override_reason,
                "overridden_by": overrider.name if overrider else "Academic Authority",
                "timestamp": cert.issued_date.isoformat() if cert.issued_date else None,
            }

        results.append({
            "id": cert.id if cert else f"eval-{course.id}",
            "user_id": current_user.id,
            "student_name": current_user.name,
            "course_id": course.id,
            "course_name": course.name,
            "course_code": course.code,
            "has_certificate": is_certified,
            "is_certified": is_certified,
            "attendance_pct": cert.attendance_pct if cert else elig["attendance"]["pct"],
            "attendance_met": elig["attendance_ok"],
            "attendance_threshold": elig["policy"]["min_attendance_pct"],
            "assessment_pct": cert.assessment_pct if cert else elig["assessment"]["pct"],
            "assessment_met": elig["assessment_ok"],
            "assessment_threshold": elig["policy"]["min_assessment_pct"],
            "progress_pct": cert.progress_pct if cert else (elig["progress"]["pct"] if elig["progress"]["pct"] is not None else (100.0 if elig["progress"]["total"] == 0 else 0.0)),
            "progress_met": elig["progress_ok"],
            "is_eligible": elig["eligible"] and (cert is None or cert.eligibility_status != CertificateStatus.REVOKED),
            "certificate_code": cert.certificate_code if (cert and is_certified) else None,
            "certificate_url": cert.certificate_url if (cert and is_certified) else None,
            "eligibility_status": status_val,
            "is_override": getattr(cert, "is_override", False) if cert else False,
            "override_reason": getattr(cert, "override_reason", None) if cert else None,
            "audit_log": audit_entry,
            "reasons": elig["reasons"],
            "issued_date": cert.issued_date.strftime("%Y-%m-%d") if (cert and cert.issued_date and is_certified) else None
        })

    return results


@router.post("/issue")
def issue_certificate_endpoint(
    payload: CertificateIssueRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Issue certificate for an eligible course.
    Issued ONLY when certificate_eligibility is true (or manual override).
    Stores a snapshot (attendance %, assessment %, progress %) in the Certificate row at issue time.
    """
    from services.metrics import certificate_eligibility

    target_student_id = payload.student_id or current_user.id
    if current_user.role == UserRole.STUDENT and target_student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only issue your own certificate")

    course = verify_course_access(payload.course_id, current_user, db, action="read")

    elig = certificate_eligibility(db, current_user.org_id, target_student_id, course.id)
    if not elig["eligible"]:
        reason_msg = elig["reasons"][0] if elig["reasons"] else "Not eligible: academic criteria not met"
        raise HTTPException(status_code=400, detail=reason_msg)

    cert = evaluate_and_issue_certificate(db, target_student_id, course.id, current_user.org_id)
    return {
        "message": "Certificate issued successfully",
        "id": cert.id,
        "certificate_code": cert.certificate_code,
        "certificate_url": cert.certificate_url,
        "attendance_pct": cert.attendance_pct,
        "assessment_pct": cert.assessment_pct,
        "progress_pct": cert.progress_pct,
        "status": cert.eligibility_status.value
    }


@router.post("/override")
def override_certificate_endpoint(
    payload: CertificateOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FACULTY, UserRole.ADMIN]))
):
    """
    Manual faculty/admin override to issue certificate even if normal eligibility thresholds fail.
    Allowed ONLY with a written reason and creates an AuditLog entry shown on the certificate record.
    """
    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="A valid written reason (minimum 5 characters) is required for manual override.")

    course = verify_course_access(payload.course_id, current_user, db, action="manage")
    student = db.query(User).filter(User.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Issue certificate with override flag
    cert = evaluate_and_issue_certificate(
        db,
        student_id=payload.student_id,
        course_id=course.id,
        org_id=current_user.org_id,
        override=True,
        override_reason=payload.reason.strip(),
        override_by_id=current_user.id
    )

    # Record AuditLog
    from models.audit import AuditLog
    audit_log = AuditLog(
        org_id=current_user.org_id,
        user_id=payload.student_id,
        actor_id=current_user.id,
        action="CERTIFICATE_MANUAL_OVERRIDE",
        entity="CERTIFICATE",
        entity_id=cert.id,
        resource_type="CERTIFICATE",
        resource_id=cert.id,
        metadata_json={
            "reason": payload.reason.strip(),
            "actor_name": current_user.name,
            "student_id": payload.student_id,
            "course_id": payload.course_id,
            "snapshot": {
                "attendance_pct": cert.attendance_pct,
                "assessment_pct": cert.assessment_pct,
                "progress_pct": cert.progress_pct,
            }
        }
    )
    db.add(audit_log)
    db.commit()

    return {
        "message": "Certificate manual override recorded and issued successfully.",
        "id": cert.id,
        "certificate_code": cert.certificate_code,
        "certificate_url": cert.certificate_url,
        "attendance_pct": cert.attendance_pct,
        "assessment_pct": cert.assessment_pct,
        "progress_pct": cert.progress_pct,
        "is_override": True,
        "override_reason": cert.override_reason,
        "status": cert.eligibility_status.value
    }


@router.get("/all")
def get_all_certificates(
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY]))
):
    """
    Roster of evaluated/issued certificates scoped to current_user.org_id with pagination.
    Faculty can only see certificates for courses where faculty_id == current_user.id.
    """
    query = db.query(Certificate).filter(Certificate.org_id == current_user.org_id)
    if current_user.role == UserRole.FACULTY:
        query = query.join(Course).filter(Course.faculty_id == current_user.id)

    certs = query.order_by(Certificate.issued_date.desc()).offset(offset).limit(limit).all()
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
    # Verify course scope
    course = verify_course_access(
        payload.course_id,
        current_user,
        db,
        action="manage" if current_user.role != UserRole.STUDENT else "read"
    )
    # If student, can only evaluate their own certificate
    if current_user.role == UserRole.STUDENT and payload.student_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Students may only evaluate their own certificates"
        )
    # If faculty, target student must be enrolled in their course
    if current_user.role == UserRole.FACULTY:
        verify_user_access(payload.student_id, current_user, db, action="read")

    try:
        cert = evaluate_and_issue_certificate(db, payload.student_id, payload.course_id, current_user.org_id)
        if cert.eligibility_status == CertificateStatus.ISSUED:
            try:
                from services.notification_service import notify_certificate_issued
                if course:
                    notify_certificate_issued(db, payload.student_id, course, cert)
            except Exception:
                pass

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


@router.post("/{certificate_id}/revoke")
@router.post("/revoke/{certificate_id}")
def revoke_certificate(
    certificate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY]))
):
    cert = verify_certificate_access(certificate_id, current_user, db, action="revoke")

    cert.eligibility_status = CertificateStatus.REVOKED
    cert.revoked_at = datetime.utcnow()
    db.commit()

    # Record AuditLog for revocation
    from models.audit import AuditLog
    audit_entry = AuditLog(
        org_id=current_user.org_id,
        user_id=cert.user_id,
        actor_id=current_user.id,
        action="CERTIFICATE_REVOKED",
        entity="CERTIFICATE",
        entity_id=cert.id,
        resource_type="CERTIFICATE",
        resource_id=cert.id,
        metadata_json={
            "certificate_code": cert.certificate_code,
            "actor_name": current_user.name,
            "student_id": cert.user_id,
            "course_id": cert.course_id,
        }
    )
    db.add(audit_entry)
    db.commit()

    try:
        from services.notification_service import notify_certificate_revoked
        course = db.query(Course).filter(Course.id == cert.course_id).first()
        if course:
            notify_certificate_revoked(db, cert.user_id, course, cert)
    except Exception:
        pass

    return {"message": "Certificate revoked successfully", "id": cert.id, "status": "REVOKED"}


@router.get("/{id_or_code}")
def get_single_certificate(
    id_or_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single certificate with central scoping check."""
    cert = verify_certificate_access(id_or_code, current_user, db, action="read")
    student = db.query(User).filter(User.id == cert.user_id).first()
    course = db.query(Course).filter(Course.id == cert.course_id).first()
    return {
        "id": cert.id,
        "certificate_code": cert.certificate_code,
        "user_id": cert.user_id,
        "student_name": student.name if student else "Student",
        "course_id": cert.course_id,
        "course_name": course.name if course else "Course",
        "course_code": course.code if course else "",
        "eligibility_status": cert.eligibility_status.value,
        "attendance_pct": cert.attendance_pct,
        "assessment_pct": cert.assessment_pct,
        "progress_pct": getattr(cert, "progress_pct", 100.0),
        "is_override": getattr(cert, "is_override", False),
        "override_reason": getattr(cert, "override_reason", None),
        "issued_date": cert.issued_date.strftime("%Y-%m-%d") if cert.issued_date else "",
        "certificate_url": cert.certificate_url,
    }


@router.get("/{id_or_code}/download")
def download_single_certificate_endpoint(
    id_or_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download single certificate with central scoping check."""
    cert = verify_certificate_access(id_or_code, current_user, db, action="read")
    if cert.eligibility_status == CertificateStatus.REVOKED:
        raise HTTPException(status_code=403, detail="Forbidden: Certificate has been revoked and cannot be downloaded.")
    return {"message": "Download authorized", "certificate_code": cert.certificate_code, "certificate_url": cert.certificate_url}


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
    cert = verify_certificate_access(code, current_user, db, action="download")
    if cert.eligibility_status == CertificateStatus.REVOKED:
        raise HTTPException(status_code=403, detail="Forbidden: Certificate has been revoked and cannot be downloaded.")

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
