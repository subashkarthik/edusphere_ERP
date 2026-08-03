"""
EduSphere LMS — Public Unauthenticated API Router
Provides public endpoints for:
1. Public Certificate Verification (/api/public/verify-certificate/{code})
2. Public Course & Syllabus Catalog (/api/public/courses)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.certificate import Certificate, CertificateStatus
from models.user import User
from models.academic import Course
from models.user import Department

router = APIRouter(prefix="/api/public", tags=["Public Portal"])


@router.get("/verify-certificate/{code}")
def verify_certificate_public(code: str, db: Session = Depends(get_db)):
    """Public certificate verification endpoint for employers & institutions."""
    cert = db.query(Certificate).filter(
        (Certificate.certificate_code == code) | (Certificate.id == code)
    ).first()

    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found or invalid verification code.")

    student = db.query(User).filter(User.id == cert.user_id).first()
    course = db.query(Course).filter(Course.id == cert.course_id).first()

    return {
        "status": "VERIFIED" if cert.eligibility_status == CertificateStatus.ISSUED else "INVALID",
        "certificate_code": cert.certificate_code,
        "issued_date": cert.issued_date.strftime("%Y-%m-%d") if cert.issued_date else "N/A",
        "student_name": student.name if student else "Institutional Graduate",
        "enrollment_no": student.enrollment_no if student else "N/A",
        "course_title": course.name if course else "University Degree Program",
        "course_code": course.code if course else "UNI-101",
        "attendance_percentage": cert.attendance_pct,
        "assessment_score": cert.assessment_pct,
        "issuer": "EduSphere Universal University Academic Senate",
        "verification_url": f"/verify-certificate/{cert.certificate_code}"
    }


@router.get("/courses")
def get_public_course_catalog(db: Session = Depends(get_db)):
    """Public course catalog for prospective students and visitors."""
    courses = db.query(Course).all()
    catalog = []
    for c in courses[:24]: # Top catalog sample
        dept = db.query(Department).filter(Department.id == c.department_id).first()
        faculty = db.query(User).filter(User.id == c.faculty_id).first()
        catalog.append({
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "description": c.description,
            "credits": c.credits,
            "semester": c.semester,
            "department": dept.name if dept else "General Engineering",
            "faculty_name": faculty.name if faculty else "Senior Professor"
        })
    return {"total": len(catalog), "courses": catalog}
