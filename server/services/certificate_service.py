import os
import re
import uuid
import secrets
import tempfile
from datetime import datetime
from typing import Tuple, List, Optional
from sqlalchemy.orm import Session

from config import settings
from models.user import User
from models.academic import Course, Enrollment, EnrollmentStatus
from models.attendance import AttendanceSession, AttendanceLog, AttendanceStatus
from models.exam import ExamSchedule, ExamResult, Quiz, QuizAttempt
from models.content import Assignment, Submission, Module, Lesson, LessonProgress
from models.certificate import Certificate, CertificateSetting, CertificateStatus

# Storage path for generated PDF files
STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "certificates")
os.makedirs(STORAGE_DIR, exist_ok=True)


def get_or_create_settings(db: Session, org_id: str = "org-edusphere") -> CertificateSetting:
    setting = db.query(CertificateSetting).filter(CertificateSetting.org_id == org_id).first()
    if not setting:
        setting = CertificateSetting(
            id=str(uuid.uuid4()),
            org_id=org_id,
            min_attendance_pct=75.0,
            min_assessment_pct=50.0,
            min_progress_pct=100.0
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


def calculate_student_metrics(db: Session, student_id: str, course_id: str, org_id: str = "org-edusphere") -> Tuple[float, float, float]:
    """
    Delegate academic metrics calculation to the unified metrics service (server/services/metrics.py).
    Returns (attendance_pct, assessment_pct, progress_pct).
    """
    from services.metrics import attendance_for, assessment_for, progress_for

    attn = attendance_for(db, org_id, student_id, course_id)
    assess = assessment_for(db, org_id, student_id, course_id)
    prog = progress_for(db, org_id, student_id, course_id)

    # Convert None (e.g. no sessions held or no assessments) to 0.0 or 100.0 for legacy certificate threshold comparisons
    attn_pct = attn["pct"] if attn["pct"] is not None else 0.0
    assess_pct = assess["pct"] if assess["pct"] is not None else (100.0 if assess["total_items"] == 0 else 0.0)
    prog_pct = prog["pct"] if prog["pct"] is not None else (100.0 if prog["total"] == 0 else 0.0)

    return attn_pct, assess_pct, prog_pct


def generate_certificate_pdf(
    certificate_code: str,
    student_name: str,
    course_name: str,
    issued_date: datetime,
    attendance_pct: float,
    assessment_pct: float,
    progress_pct: float = 100.0
) -> str:
    """
    Generate an enterprise PDF certificate with a real QR code pointing to <FRONTEND_URL>/verify/<code>.
    Sanitizes filename and stores in storage/certificates.
    """
    safe_code = re.sub(r'[^a-zA-Z0-9_\-]', '', certificate_code)
    filename = f"{safe_code}.pdf"
    file_path = os.path.join(STORAGE_DIR, filename)
    relative_url = f"/api/certificates/download-pdf/{filename}"

    frontend_base = settings.FRONTEND_URL.rstrip("/")
    verify_url = f"{frontend_base}/verify/{certificate_code}"

    # Generate QR Code image file
    temp_qr_path = None
    try:
        import qrcode
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=5,
            border=1,
        )
        qr.add_data(verify_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="#0f172a", back_color="white")
        
        temp_qr_fd, temp_qr_path = tempfile.mkstemp(suffix=".png")
        os.close(temp_qr_fd)
        qr_img.save(temp_qr_path)
    except Exception as qre:
        print(f"[QR CODE GENERATION ERROR] {qre}")
        temp_qr_path = None

    try:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.pdfgen import canvas
        from reportlab.lib import colors

        c = canvas.Canvas(file_path, pagesize=landscape(A4))
        width, height = landscape(A4)

        # Background & Outer Dark Slate Border
        c.setFillColor(colors.HexColor("#0f172a"))
        c.rect(0, 0, width, height, fill=1, stroke=0)

        c.setFillColor(colors.HexColor("#ffffff"))
        c.roundRect(20, 20, width - 40, height - 40, 12, fill=1, stroke=0)

        # Decorative Inner Borders (Indigo & Gold)
        c.setStrokeColor(colors.HexColor("#4f46e5"))
        c.setLineWidth(3)
        c.rect(32, 32, width - 64, height - 64)

        c.setStrokeColor(colors.HexColor("#d97706"))
        c.setLineWidth(1.5)
        c.rect(38, 38, width - 76, height - 76)

        # Header Title
        c.setFillColor(colors.HexColor("#1e1b4b"))
        c.setFont("Helvetica-Bold", 26)
        c.drawCentredString(width / 2, height - 90, "EDUSPHERE UNIVERSAL LMS")

        c.setFillColor(colors.HexColor("#4f46e5"))
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(width / 2, height - 115, "OFFICIAL INSTITUTIONAL CERTIFICATE OF COMPLETION")

        # Line Separator
        c.setStrokeColor(colors.HexColor("#cbd5e1"))
        c.setLineWidth(1)
        c.line(width / 2 - 180, height - 130, width / 2 + 180, height - 130)

        # Certificate Text
        c.setFillColor(colors.HexColor("#475569"))
        c.setFont("Helvetica", 11)
        c.drawCentredString(width / 2, height - 160, "This is proudly presented and certified to")

        # Student Name
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 22)
        c.drawCentredString(width / 2, height - 195, student_name.upper())

        c.setFillColor(colors.HexColor("#475569"))
        c.setFont("Helvetica", 11)
        c.drawCentredString(width / 2, height - 225, "for successfully fulfilling all academic requirements & standards in")

        # Course Name
        c.setFillColor(colors.HexColor("#4f46e5"))
        c.setFont("Helvetica-Bold", 17)
        c.drawCentredString(width / 2, height - 255, course_name)

        # Metrics Pill Summary with Exact Snapshot Numbers
        c.setFillColor(colors.HexColor("#f8fafc"))
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.roundRect(width / 2 - 210, height - 310, 420, 40, 8, fill=1, stroke=1)

        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(width / 2 - 190, height - 293, f"Attendance: {attendance_pct}%")
        c.drawString(width / 2 - 30, height - 293, f"Assessment: {assessment_pct}%")
        c.drawString(width / 2 + 110, height - 293, f"Progress: {progress_pct}%")

        # Footer Details (Date, QR Code, Verification Link, Signature)
        date_str = issued_date.strftime("%B %d, %Y")
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#64748b"))

        # Left: Date & Code
        c.drawString(60, 95, f"Issued Date: {date_str}")
        c.drawString(60, 80, f"Certificate ID: {certificate_code}")
        c.drawString(60, 65, f"Verify: {verify_url}")

        # Center: Real QR Code
        if temp_qr_path and os.path.exists(temp_qr_path):
            c.drawImage(temp_qr_path, width / 2 - 35, 45, width=70, height=70)
            c.setFont("Helvetica", 7)
            c.drawCentredString(width / 2, 38, "Scan to Verify")

        # Right: Digital Seal & Signature
        c.drawRightString(width - 60, 95, "Academic Controller & Registrar")
        c.drawRightString(width - 60, 80, "EduSphere Governing Senate")
        c.setStrokeColor(colors.HexColor("#64748b"))
        c.line(width - 240, 110, width - 60, 110)

        c.save()
    except Exception as e:
        print(f"[CERTIFICATE PDF GENERATION ERROR] {e}")
        with open(file_path, "wb") as f:
            pdf_content = (
                f"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
                f"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
                f"3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>endobj\n"
                f"trailer<</Root 1 0 R>>\n%%EOF"
            ).encode("utf-8")
            f.write(pdf_content)
    finally:
        if temp_qr_path and os.path.exists(temp_qr_path):
            try:
                os.remove(temp_qr_path)
            except Exception:
                pass

    return relative_url


def evaluate_and_issue_certificate(
    db: Session,
    student_id: str,
    course_id: str,
    org_id: str = "org-edusphere",
    override: bool = False,
    override_reason: Optional[str] = None,
    override_by_id: Optional[str] = None
) -> Certificate:
    """
    Evaluates rule criteria via unified metrics service (services.metrics.certificate_eligibility)
    and issues or updates the student's certificate with a unique secrets-based code (EDU-2026-XXXXXXXX).
    Stores a snapshot (attendance %, assessment %, progress %) in the Certificate row at issue time.
    """
    from services.metrics import certificate_eligibility

    student = db.query(User).filter(User.id == student_id).first()
    course = db.query(Course).filter(Course.id == course_id).first()

    if not student or not course:
        raise ValueError("Student or Course not found")

    elig = certificate_eligibility(db, org_id, student_id, course_id)
    is_eligible = elig["eligible"] or override

    attendance_pct, assessment_pct, progress_pct = calculate_student_metrics(db, student_id, course_id, org_id)

    cert = db.query(Certificate).filter(
        Certificate.user_id == student_id,
        Certificate.course_id == course_id
    ).first()

    if not cert:
        cert_code = f"EDU-2026-{secrets.token_hex(4).upper()}"
        status = CertificateStatus.ISSUED if is_eligible else CertificateStatus.INELIGIBLE
        issued_dt = datetime.utcnow()

        pdf_url = generate_certificate_pdf(
            cert_code,
            student.name,
            course.name,
            issued_dt,
            attendance_pct,
            assessment_pct,
            progress_pct
        ) if is_eligible else None

        cert = Certificate(
            id=str(uuid.uuid4()),
            user_id=student_id,
            course_id=course_id,
            issued_date=issued_dt,
            certificate_code=cert_code,
            certificate_url=pdf_url,
            eligibility_status=status,
            attendance_pct=attendance_pct,
            assessment_pct=assessment_pct,
            progress_pct=progress_pct,
            is_override=override,
            override_reason=override_reason,
            override_by_id=override_by_id,
            org_id=org_id
        )
        db.add(cert)
    else:
        cert.attendance_pct = attendance_pct
        cert.assessment_pct = assessment_pct
        cert.progress_pct = progress_pct
        if override:
            cert.is_override = True
            cert.override_reason = override_reason
            cert.override_by_id = override_by_id

        if cert.eligibility_status != CertificateStatus.REVOKED:
            if is_eligible:
                cert.eligibility_status = CertificateStatus.ISSUED
                cert.certificate_url = generate_certificate_pdf(
                    cert.certificate_code,
                    student.name,
                    course.name,
                    cert.issued_date or datetime.utcnow(),
                    attendance_pct,
                    assessment_pct,
                    progress_pct
                )
            else:
                cert.eligibility_status = CertificateStatus.INELIGIBLE

    db.commit()
    db.refresh(cert)
    return cert
