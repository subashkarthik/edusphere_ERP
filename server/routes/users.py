import csv
import io
import re
import secrets
import string
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models.user import User, UserRole, Department, StudentProfile, FacultyProfile
from schemas.auth import (
    UserResponse, StudentProvisionRequest, FacultyProvisionRequest,
    AdminProvisionRequest, StatusUpdateRequest, ChangePasswordRequest
)
from middleware.auth import get_current_user, require_roles
from middleware.scoping import verify_user_access, verify_org_access
from utils.password import hash_password, verify_password
from utils.audit_logger import log_audit

router = APIRouter(prefix="/api/users", tags=["Users"])


def generate_temporary_password(length: int = 18) -> str:
    """Generate cryptographically secure temporary password (16+ chars)."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    pwd = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*"),
    ] + [secrets.choice(alphabet) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)


def mask_email(email: Optional[str]) -> Optional[str]:
    """Mask email for privacy protection (e.g. k***h@edusphere.edu.in)."""
    if not email or "@" not in email:
        return email
    user_part, domain = email.split("@", 1)
    if len(user_part) <= 2:
        masked_user = user_part[0] + "***"
    else:
        masked_user = user_part[0] + "***" + user_part[-1]
    return f"{masked_user}@{domain}"


def mask_phone(phone: Optional[str]) -> Optional[str]:
    """Mask phone number for privacy protection (e.g. ******3210)."""
    if not phone:
        return phone
    clean = str(phone).strip()
    if len(clean) <= 4:
        return "****"
    return "*" * (len(clean) - 4) + clean[-4:]


def _format_user_response(u: User, requester: Optional[User] = None) -> UserResponse:
    sem = None
    sec = None
    if u.student_profile:
        sem = u.student_profile.year_semester
        sec = u.student_profile.section

    email = u.email
    phone = u.phone

    # PII Minimisation: Mask email and phone in directory lists for non-admins unless viewing own record
    if requester and requester.role != UserRole.ADMIN and requester.id != u.id:
        email = mask_email(u.email)
        phone = mask_phone(u.phone)

    return UserResponse(
        id=u.id,
        email=email,
        login_id=u.login_id or u.enrollment_no or email,
        name=u.name,
        role=u.role.value,
        department=u.department.name if u.department else None,
        department_id=u.department_id,
        avatar=u.avatar,
        enrollment_no=u.enrollment_no,
        designation=u.designation,
        phone=phone,
        is_active=u.is_active,
        must_change_password=u.must_change_password,
        semester=sem,
        section=sec,
    )


# ─── LIST USERS ───
@router.get("")
@router.get("/")
def list_users(
    role: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    """List directory users. Filterable by role, department, and search query. Scoped to current_user.org_id."""
    query = db.query(User).filter(User.org_id == current_user.org_id)

    # Faculty can only view students enrolled in courses they teach, or themselves
    if current_user.role == UserRole.FACULTY:
        if role and role.upper() == "ADMIN":
            raise HTTPException(status_code=403, detail="Faculty cannot inspect administrative accounts.")
        from models.academic import Course, Enrollment
        taught_course_ids = [c.id for c in db.query(Course.id).filter(Course.faculty_id == current_user.id, Course.org_id == current_user.org_id).all()]
        enrolled_student_ids = [e.student_id for e in db.query(Enrollment.student_id).filter(Enrollment.course_id.in_(taught_course_ids)).all()]
        allowed_user_ids = set(enrolled_student_ids + [current_user.id])
        query = query.filter(User.id.in_(allowed_user_ids))

    if role:
        try:
            query = query.filter(User.role == UserRole(role.upper()))
        except ValueError:
            pass

    if department_id:
        query = query.filter(User.department_id == department_id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.name.ilike(s),
                User.email.ilike(s),
                User.enrollment_no.ilike(s),
                User.login_id.ilike(s),
            )
        )

    users = query.offset(offset).limit(limit).all()
    return [_format_user_response(u, requester=current_user) for u in users]


# ─── GET SINGLE USER ───
@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single user profile by ID with central scoping enforcement."""
    user = verify_user_access(user_id, current_user, db, action="read")
    return _format_user_response(user)


# ─── PROVISION STUDENT ───
@router.post("/student")
async def provision_student(
    data: StudentProvisionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """
    Admin: Add a student account with (name, register no, email, department, semester, section).
    Generates unique login_id and random temporary password (16+ chars, shown ONCE).
    """
    # Duplicate email check
    if db.query(User).filter(User.email.ilike(data.email.strip())).first():
        raise HTTPException(status_code=400, detail=f"Email '{data.email}' is already registered.")

    # Duplicate register number check
    reg_clean = data.register_no.strip()
    if db.query(User).filter(or_(User.enrollment_no == reg_clean, User.login_id == reg_clean)).first():
        raise HTTPException(status_code=400, detail=f"Register No '{reg_clean}' is already registered.")

    # Department check
    dept_identifier = data.department_id or data.department or "dept-cse"
    dept = db.query(Department).filter(
        or_(Department.id == dept_identifier, Department.code.ilike(dept_identifier), Department.name.ilike(f"%{dept_identifier}%"))
    ).first()
    dept_id = dept.id if dept else None
    dept_name = dept.name if dept else (data.department or dept_identifier)

    # Temporary password (18 chars, cryptographically secure)
    temp_password = generate_temporary_password(18)
    password_hash = hash_password(temp_password)

    new_user = User(
        id=f"user-student-{uuid.uuid4().hex[:8]}",
        org_id=current_user.org_id,
        email=data.email.strip(),
        login_id=reg_clean,
        enrollment_no=reg_clean,
        name=data.name.strip(),
        password_hash=password_hash,
        role=UserRole.STUDENT,
        department_id=dept_id,
        must_change_password=True,
        is_active=True,
        created_by=current_user.id,
        avatar=f"https://ui-avatars.com/api/?name={data.name.replace(' ', '+')}&background=1e3a8a&color=fff",
    )
    db.add(new_user)
    db.flush()

    # Create StudentProfile
    profile = StudentProfile(
        id=f"sp-{uuid.uuid4().hex[:8]}",
        org_id=current_user.org_id,
        user_id=new_user.id,
        register_no=reg_clean,
        department=dept_name,
        year_semester=f"Semester {data.semester}",
        section=data.section or "A",
    )
    db.add(profile)
    db.commit()
    db.refresh(new_user)

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="STUDENT_PROVISIONED",
        resource_type="USER",
        resource_id=new_user.id,
        metadata={"email": new_user.email, "register_no": reg_clean, "name": new_user.name},
        request=request,
    )

    return {
        "user": _format_user_response(new_user),
        "login_id": reg_clean,
        "temp_password": temp_password,
        "message": "Student account provisioned successfully. Share temporary credentials securely.",
    }


# ─── PROVISION FACULTY ───
@router.post("/faculty")
async def provision_faculty(
    data: FacultyProvisionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """
    Admin: Add a faculty account.
    Faculty can be created ONLY by ADMIN.
    Generates unique login_id and random temporary password (16+ chars, shown ONCE).
    """
    if db.query(User).filter(User.email.ilike(data.email.strip())).first():
        raise HTTPException(status_code=400, detail=f"Email '{data.email}' is already registered.")

    dept_identifier = data.department_id or data.department or "dept-cse"
    dept = db.query(Department).filter(
        or_(Department.id == dept_identifier, Department.code.ilike(dept_identifier), Department.name.ilike(f"%{dept_identifier}%"))
    ).first()
    dept_id = dept.id if dept else None
    dept_code = dept.code if dept else "FAC"
    dept_name = dept.name if dept else (data.department or dept_identifier)

    # Unique login ID for faculty
    login_id = f"FAC/{dept_code}/{datetime.utcnow().year}/{secrets.randbelow(8999) + 1000}"
    temp_password = generate_temporary_password(18)

    new_user = User(
        id=f"user-faculty-{uuid.uuid4().hex[:8]}",
        org_id=current_user.org_id,
        email=data.email.strip(),
        login_id=login_id,
        enrollment_no=login_id,
        name=data.name.strip(),
        password_hash=hash_password(temp_password),
        role=UserRole.FACULTY,
        department_id=dept_id,
        designation=data.designation or "Assistant Professor",
        phone=data.phone,
        must_change_password=True,
        is_active=True,
        created_by=current_user.id,
        avatar=f"https://ui-avatars.com/api/?name={data.name.replace(' ', '+')}&background=047857&color=fff",
    )
    db.add(new_user)
    db.flush()

    profile = FacultyProfile(
        id=f"fp-{uuid.uuid4().hex[:8]}",
        org_id=current_user.org_id,
        user_id=new_user.id,
        employee_id=login_id,
        department=dept_name,
        designation=data.designation or "Assistant Professor",
    )
    db.add(profile)
    db.commit()
    db.refresh(new_user)

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="FACULTY_PROVISIONED",
        resource_type="USER",
        resource_id=new_user.id,
        metadata={"email": new_user.email, "login_id": login_id, "name": new_user.name},
        request=request,
    )

    return {
        "user": _format_user_response(new_user),
        "login_id": login_id,
        "temp_password": temp_password,
        "message": "Faculty account provisioned successfully. Share temporary credentials securely.",
    }


# ─── PROVISION ADMIN ───
@router.post("/admin")
async def provision_admin(
    data: AdminProvisionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Admin accounts can be created ONLY by another ADMIN."""
    if db.query(User).filter(User.email.ilike(data.email.strip())).first():
        raise HTTPException(status_code=400, detail=f"Email '{data.email}' is already registered.")

    login_id = f"ADM/{datetime.utcnow().year}/{secrets.randbelow(899) + 100}"
    temp_password = generate_temporary_password(18)

    new_user = User(
        id=f"user-admin-{uuid.uuid4().hex[:8]}",
        org_id=current_user.org_id,
        email=data.email.strip(),
        login_id=login_id,
        name=data.name.strip(),
        password_hash=hash_password(temp_password),
        role=UserRole.ADMIN,
        phone=data.phone,
        must_change_password=True,
        is_active=True,
        created_by=current_user.id,
        avatar=f"https://ui-avatars.com/api/?name={data.name.replace(' ', '+')}&background=be123c&color=fff",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="ADMIN_PROVISIONED",
        resource_type="USER",
        resource_id=new_user.id,
        metadata={"email": new_user.email, "login_id": login_id},
        request=request,
    )

    return {
        "user": _format_user_response(new_user),
        "login_id": login_id,
        "temp_password": temp_password,
        "message": "Administrator account provisioned successfully.",
    }


# ─── BULK IMPORT: PREVIEW ───
@router.post("/bulk-preview")
async def bulk_preview(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """
    Parse uploaded CSV and validate row by row.
    Returns preview table with row-level validation errors (duplicate email/register no, missing fields).
    """
    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or malformed.")

    # Normalize header names (lowercased and stripped)
    clean_fieldnames = {f: f.strip().lower().replace(" ", "_") for f in reader.fieldnames}

    rows_preview = []
    seen_emails = set()
    seen_regnos = set()

    row_index = 0
    valid_count = 0
    error_count = 0

    for raw_row in reader:
        row_index += 1
        row = {clean_fieldnames.get(k, k): v.strip() for k, v in raw_row.items() if k}
        errors = []

        name = row.get("name") or row.get("full_name") or ""
        email = row.get("email") or ""
        reg_no = row.get("register_no") or row.get("reg_no") or row.get("roll_no") or row.get("enrollment_no") or ""
        dept = row.get("department") or row.get("department_id") or "dept-cse"
        sem_str = row.get("semester") or "1"
        sec = row.get("section") or "A"

        # Validations
        if not name:
            errors.append("Missing student name.")
        if not reg_no:
            errors.append("Missing register number.")
        if not email:
            errors.append("Missing email.")
        elif not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            errors.append("Invalid email format.")

        try:
            sem_int = int(sem_str)
            if sem_int < 1 or sem_int > 8:
                errors.append("Semester must be between 1 and 8.")
        except ValueError:
            errors.append("Semester must be an integer (1-8).")

        # Duplicate check in file
        if email:
            if email.lower() in seen_emails:
                errors.append(f"Duplicate email '{email}' within file.")
            else:
                seen_emails.add(email.lower())

        if reg_no:
            if reg_no in seen_regnos:
                errors.append(f"Duplicate register no '{reg_no}' within file.")
            else:
                seen_regnos.add(reg_no)

        # Duplicate check against database
        if email and db.query(User).filter(User.email.ilike(email)).first():
            errors.append(f"Email '{email}' already exists in database.")
        if reg_no and db.query(User).filter(or_(User.enrollment_no == reg_no, User.login_id == reg_no)).first():
            errors.append(f"Register No '{reg_no}' already exists in database.")

        is_valid = len(errors) == 0
        if is_valid:
            valid_count += 1
        else:
            error_count += 1

        rows_preview.append({
            "row_num": row_index,
            "name": name,
            "register_no": reg_no,
            "email": email,
            "department": dept,
            "semester": sem_str,
            "section": sec,
            "is_valid": is_valid,
            "errors": errors,
        })

    return {
        "filename": file.filename,
        "total_rows": row_index,
        "valid_count": valid_count,
        "error_count": error_count,
        "invalid_count": error_count,
        "rows": rows_preview,
        "preview": rows_preview,
    }


# ─── BULK IMPORT: COMMIT & DOWNLOAD CREDENTIALS SHEET ───
@router.post("/bulk-import")
async def bulk_import(
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """
    Commit bulk accounts and generate in-memory credentials sheet (CSV: name, login_id, temp password).
    Credentials sheet is generated in memory, NEVER stored on the server, NEVER logged.
    """
    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV is empty.")

    clean_fieldnames = {f: f.strip().lower().replace(" ", "_") for f in reader.fieldnames}

    created_accounts = []
    credentials_csv_output = io.StringIO()
    csv_writer = csv.writer(credentials_csv_output)
    # Header row for credentials sheet
    csv_writer.writerow(["name", "login_id", "temp_password", "email", "department", "semester", "section"])

    for raw_row in reader:
        row = {clean_fieldnames.get(k, k): v.strip() for k, v in raw_row.items() if k}
        name = row.get("name") or row.get("full_name") or ""
        email = row.get("email") or ""
        reg_no = row.get("register_no") or row.get("reg_no") or row.get("roll_no") or row.get("enrollment_no") or ""
        dept_val = row.get("department") or row.get("department_id") or "dept-cse"
        sem_val = row.get("semester") or "1"
        sec_val = row.get("section") or "A"

        if not name or not email or not reg_no:
            continue

        # Skip if already exists
        if db.query(User).filter(or_(User.email.ilike(email), User.enrollment_no == reg_no)).first():
            continue

        dept = db.query(Department).filter(
            or_(Department.id == dept_val, Department.code.ilike(dept_val), Department.name.ilike(f"%{dept_val}%"))
        ).first()
        dept_id = dept.id if dept else None
        dept_name = dept.name if dept else dept_val

        temp_password = generate_temporary_password(18)
        new_user = User(
            id=f"user-student-{uuid.uuid4().hex[:8]}",
            org_id=current_user.org_id,
            email=email,
            login_id=reg_no,
            enrollment_no=reg_no,
            name=name,
            password_hash=hash_password(temp_password),
            role=UserRole.STUDENT,
            department_id=dept_id,
            must_change_password=True,
            is_active=True,
            created_by=current_user.id,
            avatar=f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=1e3a8a&color=fff",
        )
        db.add(new_user)
        db.flush()

        profile = StudentProfile(
            id=f"sp-{uuid.uuid4().hex[:8]}",
            org_id=current_user.org_id,
            user_id=new_user.id,
            register_no=reg_no,
            department=dept_name,
            year_semester=f"Semester {sem_val}",
            section=sec_val,
        )
        db.add(profile)

        # Write to in-memory credential sheet
        csv_writer.writerow([name, reg_no, email, temp_password, dept_name, f"Semester {sem_val}", sec_val])
        created_accounts.append(name)

    db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="BULK_STUDENT_PROVISIONED",
        resource_type="USER",
        metadata={"count": len(created_accounts)},
        request=request,
    )

    credentials_csv_output.seek(0)
    return StreamingResponse(
        credentials_csv_output,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=credentials_sheet_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv",
            "X-Imported-Count": str(len(created_accounts)),
        },
    )


# ─── ADMIN ACTIONS: DEACTIVATE / REACTIVATE USER ───
@router.patch("/{user_id}/status")
async def update_user_status(
    user_id: str,
    data: StatusUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """
    Deactivate or reactivate user account.
    If deactivated, session is invalidated immediately and any existing token stops working.
    """
    user = verify_user_access(user_id, current_user, db, action="status")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change status of your own account.")

    user.is_active = data.is_active
    if not data.is_active:
        user.refresh_token = None  # Invalidate session immediately

    db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="USER_DEACTIVATED" if not data.is_active else "USER_REACTIVATED",
        resource_type="USER",
        resource_id=user.id,
        metadata={"is_active": data.is_active, "email": user.email},
        request=request,
    )

    return {
        "message": f"User {user.name} successfully {'activated' if data.is_active else 'deactivated'}.",
        "is_active": user.is_active,
    }


# ─── ADMIN ACTIONS: RESET PASSWORD ───
@router.post("/{user_id}/reset-password")
async def admin_reset_password(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """
    Reset user password. Generates a new temporary password (16+ chars, forces change on first login).
    Admin cannot see user's real password, only generates a new temporary one.
    """
    user = verify_user_access(user_id, current_user, db, action="reset_password")

    temp_password = generate_temporary_password(18)
    user.password_hash = hash_password(temp_password)
    user.must_change_password = True
    user.refresh_token = None  # Force re-login with temporary password
    db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="ADMIN_PASSWORD_RESET",
        resource_type="USER",
        resource_id=user.id,
        metadata={"email": user.email},
        request=request,
    )

    return {
        "message": f"Password reset for {user.name}. Share new temporary credentials securely.",
        "login_id": user.login_id or user.enrollment_no or user.email,
        "temp_password": temp_password,
    }


# ─── ADMIN ACTIONS: UPDATE USER DETAILS ───
class UserAdminUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department_id: Optional[str] = None
    semester: Optional[int] = None
    section: Optional[str] = None


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserAdminUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user details (Admin or Self for personal contact info)."""
    user = verify_user_access(user_id, current_user, db, action="modify")

    is_admin = current_user.role == UserRole.ADMIN

    if data.name is not None and is_admin:
        user.name = data.name.strip()
    if data.email is not None and is_admin:
        user.email = data.email.strip()
    if data.phone is not None:
        user.phone = data.phone.strip()
    if data.designation is not None and is_admin:
        user.designation = data.designation.strip()

    if data.department_id is not None and is_admin:
        dept = db.query(Department).filter(
            or_(Department.id == data.department_id, Department.code == data.department_id)
        ).first()
        if dept:
            user.department_id = dept.id
            if user.student_profile:
                user.student_profile.department = dept.name
            if user.faculty_profile:
                user.faculty_profile.department = dept.name

    if user.student_profile and is_admin:
        if data.semester is not None:
            user.student_profile.year_semester = f"Semester {data.semester}"
        if data.section is not None:
            user.student_profile.section = data.section.strip()

    db.commit()
    db.refresh(user)

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="USER_UPDATED",
        resource_type="USER",
        resource_id=user.id,
        request=request,
    )

    return _format_user_response(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Deactivate user account (alias for DELETE)."""
    return await update_user_status(user_id, StatusUpdateRequest(is_active=False), request, db, current_user)


# ─── GDPR / DPDP DATA PORTABILITY & ERASURE ───

@router.get("/{user_id}/export-data")
async def export_student_data(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Data Portability Export (DPDP / GDPR Compliance).
    Allows Admin or Student themselves to export complete academic and personal records in JSON format.
    Audit logged for regulatory compliance.
    """
    user = verify_user_access(user_id, current_user, db, action="read")
    if current_user.role != UserRole.ADMIN and current_user.id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only export your own personal data.")

    from models.academic import Enrollment
    from models.attendance import AttendanceLog
    from models.exam import QuizAttempt
    from models.content import Submission
    from models.certificate import Certificate

    # 1. Profile
    profile_data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "login_id": user.login_id,
        "role": user.role.value,
        "department": user.department.name if user.department else None,
        "enrollment_no": user.enrollment_no,
        "phone": user.phone,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }

    # 2. Enrollments
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == user.id).all()
    enrollment_list = []
    for enr in enrollments:
        c = enr.course
        enrollment_list.append({
            "course_code": c.code if c else "UNKNOWN",
            "course_name": c.name if c else "Unknown Course",
            "status": enr.status.value if hasattr(enr.status, "value") else str(enr.status),
            "enrolled_at": enr.enrolled_at.isoformat() if enr.enrolled_at else None,
        })

    # 3. Attendance Logs
    att_logs = db.query(AttendanceLog).filter(AttendanceLog.student_id == user.id).all()
    attendance_records = [
        {
            "session_id": al.session_id,
            "status": al.status.value if hasattr(al.status, "value") else str(al.status),
            "timestamp": al.timestamp.isoformat() if hasattr(al, "timestamp") and al.timestamp else None,
        }
        for al in att_logs
    ]

    # 4. Quiz Attempts
    quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == user.id).all()
    quiz_records = [
        {
            "quiz_id": qa.quiz_id,
            "score": qa.score,
            "percentage": qa.percentage,
            "passed": qa.passed,
            "completed_at": qa.completed_at.isoformat() if qa.completed_at else None,
        }
        for qa in quiz_attempts
    ]

    # 5. Assignment Submissions
    submissions = db.query(Submission).filter(Submission.student_id == user.id).all()
    submission_records = [
        {
            "assignment_id": s.assignment_id,
            "marks_obtained": s.marks_obtained,
            "feedback": s.feedback,
            "status": s.status.value if hasattr(s.status, "value") else str(s.status),
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        }
        for s in submissions
    ]

    # 6. Certificates
    certs = db.query(Certificate).filter(Certificate.user_id == user.id).all()
    cert_records = [
        {
            "certificate_code": cert.certificate_code,
            "course_id": cert.course_id,
            "status": cert.eligibility_status.value if hasattr(cert.eligibility_status, "value") else str(cert.eligibility_status),
            "issued_date": cert.issued_date.isoformat() if cert.issued_date else None,
            "attendance_pct": cert.attendance_pct,
            "assessment_pct": cert.assessment_pct,
            "progress_pct": cert.progress_pct,
        }
        for cert in certs
    ]

    export_payload = {
        "metadata": {
            "data_controller": "EduSphere University LMS",
            "export_timestamp": datetime.utcnow().isoformat(),
            "exported_by": current_user.email,
            "user_id": user.id,
            "compliance": "Right to Data Portability (Section 12 DPDP Act / Article 20 GDPR)",
        },
        "profile": profile_data,
        "enrollments": enrollment_list,
        "attendance": attendance_records,
        "quiz_attempts": quiz_records,
        "submissions": submission_records,
        "certificates": cert_records,
    }

    # Record regulatory AuditLog
    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="STUDENT_DATA_EXPORTED",
        resource_type="USER",
        resource_id=user.id,
        metadata={"target_user_id": user.id, "exported_by": current_user.email},
        request=request,
    )

    return export_payload


class PurgeStudentRequest(BaseModel):
    reason: str
    confirm: bool = True


@router.post("/{user_id}/purge-data")
async def purge_student_data(
    user_id: str,
    payload: PurgeStudentRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """
    Right to Erasure / Student Anonymization (DPDP / GDPR Compliance).
    Admin only. Irreversibly anonymizes student's PII, strips contact information,
    and records an immutable AuditLog entry for compliance proof.
    """
    if not payload.confirm or not payload.reason.strip():
        raise HTTPException(status_code=400, detail="Confirmation flag and written legal reason are required to purge student data.")

    user = verify_user_access(user_id, current_user, db, action="modify")

    old_email = user.email
    old_name = user.name
    import hashlib

    # Irreversible PII Sanitization
    user.name = f"Anonymized Student ({user.id[:8]})"
    user.email = f"purged_{uuid.uuid4().hex[:10]}@anonymized.local"
    user.phone = None
    user.avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    user.is_active = False

    if user.student_profile:
        user.student_profile.guardian_name = None
        user.student_profile.guardian_phone = None
        user.student_profile.address = None

    db.commit()

    # Record regulatory AuditLog
    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="STUDENT_DATA_PURGED",
        resource_type="USER",
        resource_id=user.id,
        metadata={
            "target_user_id": user.id,
            "purged_by": current_user.email,
            "reason": payload.reason.strip(),
            "previous_identifiers_hash": hashlib.sha256(f"{old_email}:{old_name}".encode()).hexdigest(),
        },
        request=request,
    )

    return {
        "message": "Student data has been successfully anonymized and purged in compliance with privacy regulations.",
        "user_id": user.id,
        "status": "PURGED",
    }
