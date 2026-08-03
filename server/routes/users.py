from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from models.user import User, UserRole, Department
from models.academic import Course, Enrollment
from schemas.auth import UserResponse
from middleware.auth import get_current_user, require_roles
from models.synced_legacy import SyncedFaculty
from pydantic import BaseModel
from utils.password import hash_password, verify_password
from utils.audit_logger import log_audit

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/")
def list_users(
    role: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FACULTY])),
):
    """
    List users. For FACULTY role, reads from SyncedFaculty table.
    For other roles, uses standard User table.
    """
    # If requesting faculty list, try SyncedFaculty first
    if role and role.upper() == "FACULTY":
        try:
            synced_faculty = db.query(SyncedFaculty).all()
            if synced_faculty:
                results = []
                for f in synced_faculty:
                    name = f.name
                    fid = f.id

                    # Apply search filter
                    if search:
                        search_lower = search.lower()
                        if search_lower not in name.lower() and search_lower not in (f.department or "").lower():
                            continue

                    # Apply department filter
                    if department_id and (f.department or "").upper() != department_id.upper():
                        continue

                    results.append({
                        "id": str(fid),
                        "email": f"{name.lower().replace(' ', '.').replace('_', '')}@edusphere.edu.in",
                        "name": name,
                        "role": "FACULTY",
                        "department": f.department,
                        "department_id": f.department,
                        "avatar": f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=1e3a8a&color=fff",
                        "enrollment_no": None,
                        "designation": "Faculty",
                        "phone": None,
                        "is_active": True,
                        "type": "Regular",
                    })
                return results[offset:offset + limit]
        except Exception as e:
            print(f"[PostgreSQL] Synced Faculty listing fallback to SQLite: {e}")


    # SQLite fallback / other roles
    query = db.query(User).filter(User.is_active == True)

    if role:
        try:
            query = query.filter(User.role == UserRole(role))
        except ValueError:
            pass

    if department_id:
        query = query.filter(User.department_id == department_id)

    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.enrollment_no.ilike(f"%{search}%"))
        )

    users = query.offset(offset).limit(limit).all()

    return [
        UserResponse(
            id=u.id, email=u.email, name=u.name, role=u.role.value,
            department=u.department.name if u.department else None,
            department_id=u.department_id, avatar=u.avatar,
            enrollment_no=u.enrollment_no, designation=u.designation,
            phone=u.phone, is_active=u.is_active,
        )
        for u in users
    ]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user profile by ID. Self or Admin."""
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return UserResponse(
        id=user.id, email=user.email, name=user.name, role=user.role.value,
        department=user.department.name if user.department else None,
        department_id=user.department_id, avatar=user.avatar,
        enrollment_no=user.enrollment_no, designation=user.designation,
        phone=user.phone, is_active=user.is_active,
    )


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    avatar: Optional[str] = None
    department: Optional[str] = None

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    request_data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user profile. Self or Admin. Writes to SQLite."""
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if request_data.name is not None:
        user.name = request_data.name
    if request_data.phone is not None:
        user.phone = request_data.phone
    if request_data.designation is not None:
        user.designation = request_data.designation
    if request_data.avatar is not None:
        user.avatar = request_data.avatar
        
    if request_data.department is not None:
        # Search for department by name or code
        dept = db.query(Department).filter(
            (Department.name.ilike(request_data.department)) |
            (Department.code.ilike(request_data.department)),
            Department.org_id == current_user.org_id
        ).first()
        if dept:
            user.department_id = dept.id

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id, email=user.email, name=user.name, role=user.role.value,
        department=user.department.name if user.department else None,
        department_id=user.department_id, avatar=user.avatar,
        enrollment_no=user.enrollment_no, designation=user.designation,
        phone=user.phone, is_active=user.is_active,
    )


@router.delete("/{user_id}")
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Deactivate a user account. Admin only. SQLite."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user.is_active = False
    db.commit()
    return {"message": f"User {user.name} deactivated"}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password", response_model=dict)
async def change_password(
    request_data: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change current user's password."""
    # Verify current password
    if not verify_password(request_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    # Update to new password
    current_user.password_hash = hash_password(request_data.new_password)
    db.commit()
    
    await log_audit(
        db=db,
        user_id=current_user.id,
        org_id=current_user.org_id,
        action="PASSWORD_CHANGED",
        resource_type="USER",
        resource_id=current_user.id,
        metadata={"email": current_user.email},
        request=request
    )
    
    return {"message": "Password changed successfully"}

