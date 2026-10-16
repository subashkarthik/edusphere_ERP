from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from collections import defaultdict
import threading

from database import get_db
from models.user import User, UserRole
from schemas.auth import (
    LoginRequest, TokenResponse, RefreshRequest, UserResponse, ChangePasswordRequest
)
from utils.password import hash_password, verify_password
from utils.jwt import create_access_token, create_refresh_token, decode_token
from middleware.auth import get_current_user, require_roles
from utils.audit_logger import log_audit
from config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# ─── IN-MEMORY LOGIN RATE LIMITER & ACCOUNT LOCKER ───
# Tracks failed attempts: key -> list of datetime timestamps
# Window: 15 minutes, Threshold: 5 fails -> temporary lock
_failed_attempts: Dict[str, List[datetime]] = defaultdict(list)
_lock_mutex = threading.Lock()

COMMON_PASSWORDS = {
    "password", "password123", "password1234", "12345678", "123456789", "1234567890",
    "admin123", "admin1234", "student123", "faculty123", "welcome123", "qwerty123",
    "letmein123", "changeme123", "edusphere123", "university123", "college123"
}


def _get_rate_limit_key(identifier: str, client_ip: str) -> str:
    return f"{identifier.strip().lower()}::{client_ip.strip()}"


def _is_account_locked(key: str) -> bool:
    now = datetime.utcnow()
    window = now - timedelta(minutes=15)
    with _lock_mutex:
        attempts = [t for t in _failed_attempts[key] if t > window]
        _failed_attempts[key] = attempts
        return len(attempts) >= 5


def _record_failed_attempt(key: str):
    now = datetime.utcnow()
    with _lock_mutex:
        _failed_attempts[key].append(now)


def _clear_failed_attempts(key: str):
    with _lock_mutex:
        if key in _failed_attempts:
            del _failed_attempts[key]


def validate_password_policy(password: str, user: User) -> Tuple[bool, str]:
    if len(password) < 10:
        return False, "Password must be at least 10 characters long."

    pwd_lower = password.lower()

    if user.login_id and user.login_id.lower() in pwd_lower:
        return False, "Password cannot contain your login ID."
    if user.enrollment_no and user.enrollment_no.lower() in pwd_lower:
        return False, "Password cannot contain your register number."
    if user.email and user.email.split("@")[0].lower() in pwd_lower:
        return False, "Password cannot contain your email username."
    if user.name:
        for part in user.name.lower().split():
            if len(part) >= 3 and part in pwd_lower:
                return False, "Password cannot contain parts of your name."

    if pwd_lower in COMMON_PASSWORDS:
        return False, "Password is too common. Please select a stronger password."

    return True, ""


# ─── LOGIN ───
@router.post("/login", response_model=TokenResponse)
async def login(request_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate user with Login ID / Email / Register No + password.
    Security: 5 fails / 15 min per account + IP -> temporary lock.
    Generic error message on failure: 'Invalid ID or password'.
    """
    ident = (request_data.identifier or request_data.email or request_data.login_id or "").strip()
    client_ip = request.client.host if request.client else "127.0.0.1"
    rate_key = _get_rate_limit_key(ident, client_ip)

    if not ident or not request_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID or password",
        )

    # Check lock
    if _is_account_locked(rate_key):
        await log_audit(
            db=db,
            user_id="anonymous",
            org_id="org-edusphere",
            action="ACCOUNT_LOCKED",
            resource_type="USER",
            metadata={"identifier": ident, "client_ip": client_ip, "reason": "Rate limit exceeded (5 fails/15min)"},
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked due to multiple failed login attempts. Try again after 15 minutes.",
        )

    from sqlalchemy import or_
    user = db.query(User).filter(
        or_(
            User.email.ilike(ident),
            User.login_id == ident,
            User.enrollment_no == ident,
            User.phone == ident,
        )
    ).first()

    # Reject if user doesn't exist, is deactivated, or wrong password
    if not user or not user.is_active or not verify_password(request_data.password, user.password_hash):
        _record_failed_attempt(rate_key)
        await log_audit(
            db=db,
            user_id=user.id if user else "anonymous",
            org_id=user.org_id if user else "org-edusphere",
            action="LOGIN_FAILED",
            resource_type="USER",
            metadata={"identifier": ident, "client_ip": client_ip},
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ID or password",
        )

    # Success: clear failed attempts
    _clear_failed_attempts(rate_key)

    # Short expiry access token (30 min) + refresh token
    token_data = {"sub": user.id, "role": user.role.value, "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user.refresh_token = refresh_token
    user.last_login_at = datetime.utcnow()
    db.commit()

    await log_audit(
        db=db,
        user_id=user.id,
        org_id=user.org_id,
        action="LOGIN_SUCCESS",
        resource_type="USER",
        resource_id=user.id,
        metadata={"email": user.email, "role": user.role.value},
        request=request,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "login_id": user.login_id or user.enrollment_no or user.email,
            "role": user.role.value,
            "department": user.department.name if user.department else None,
            "avatar": user.avatar,
            "enrollment_no": user.enrollment_no,
            "designation": user.designation,
            "phone": user.phone,
            "must_change_password": user.must_change_password,
        },
    )


# ─── REMOVED PUBLIC REGISTRATION ───
@router.post("/register-public")
def register_public():
    """Public registration is permanently disabled. Management provisions all accounts."""
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Public registration is disabled. All accounts must be provisioned by an administrator.",
    )


@router.post("/register")
def register():
    """Public self-registration endpoint removed."""
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Direct user registration is disabled. Use administrative account provisioning.",
    )


# ─── PROFILE ───
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get currently authenticated user's profile."""
    semester_val = None
    section_val = None
    if current_user.student_profile:
        semester_val = current_user.student_profile.year_semester
        section_val = current_user.student_profile.section

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        login_id=current_user.login_id or current_user.enrollment_no or current_user.email,
        name=current_user.name,
        role=current_user.role.value,
        department=current_user.department.name if current_user.department else None,
        department_id=current_user.department_id,
        avatar=current_user.avatar,
        enrollment_no=current_user.enrollment_no,
        designation=current_user.designation,
        phone=current_user.phone,
        is_active=current_user.is_active,
        must_change_password=current_user.must_change_password,
        semester=semester_val,
        section=section_val,
    )


# ─── REFRESH TOKEN ROTATION ───
@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request_data: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    """
    Refresh an expired access token using the refresh token.
    Rotates refresh token and invalidates the previous one.
    """
    payload = decode_token(request_data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()

    if not user or user.refresh_token != request_data.refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token revoked or user not found")

    token_data = {"sub": user.id, "role": user.role.value, "email": user.email}
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    # Token rotation: save new refresh token in DB
    user.refresh_token = new_refresh
    db.commit()

    await log_audit(
        db=db,
        user_id=user.id,
        org_id=user.org_id,
        action="TOKEN_ROTATED",
        resource_type="USER",
        resource_id=user.id,
        request=request,
    )

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "login_id": user.login_id or user.enrollment_no or user.email,
            "role": user.role.value,
            "department": user.department.name if user.department else None,
            "avatar": user.avatar,
            "enrollment_no": user.enrollment_no,
            "designation": user.designation,
            "must_change_password": user.must_change_password,
        },
    )


# ─── LOGOUT ───
@router.post("/logout")
async def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Invalidate current user's refresh token and terminate active session."""
    current_user.refresh_token = None
    db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="LOGOUT",
        resource_type="USER",
        resource_id=current_user.id,
        request=request,
    )

    return {"message": "Logged out successfully"}


# ─── FORCE / CHANGE PASSWORD ───
@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Set new password. Required on first login when must_change_password=True.
    Validates password policy: min 10 chars, not equal to login_id/name/email, not common.
    """
    # If must_change_password is False, require current_password
    if not current_user.must_change_password:
        if not data.current_password or not verify_password(data.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")

    # Validate confirmation if provided
    if data.confirm_password and data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # Validate against password policy
    is_valid, err_msg = validate_password_policy(data.new_password, current_user)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    current_user.password_hash = hash_password(data.new_password)
    current_user.must_change_password = False
    current_user.refresh_token = None  # Force re-authentication / rotation
    db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="PASSWORD_CHANGED",
        resource_type="USER",
        resource_id=current_user.id,
        metadata={"forced_reset": current_user.must_change_password},
        request=request,
    )

    return {"message": "Password changed successfully. Please log in with your new password."}


@router.post("/seed-demo")
async def seed_production_demo_endpoint():
    """Seed demo accounts (1 Admin, 5 Faculty, 10 Students) into the active database."""
    try:
        from scripts.seed_production_demo import seed
        seed()
        return {
            "status": "success",
            "message": "EduSphere demo database seeded successfully with 1 Admin, 5 Faculty, 10 Students, Courses, Attendance & Quizzes"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

