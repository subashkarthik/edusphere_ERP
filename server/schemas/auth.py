from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any


class LoginRequest(BaseModel):
    email: Optional[str] = None
    identifier: Optional[str] = None
    login_id: Optional[str] = None
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "STUDENT"
    department_id: Optional[str] = None
    enrollment_no: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    faculty_key: Optional[str] = None


class StudentProvisionRequest(BaseModel):
    name: str
    register_no: str
    email: str
    department_id: Optional[str] = None
    department: Optional[str] = None
    semester: int = 1
    section: Optional[str] = "A"


class FacultyProvisionRequest(BaseModel):
    name: str
    email: str
    department_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = "Assistant Professor"
    phone: Optional[str] = None


class AdminProvisionRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str
    confirm_password: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    login_id: Optional[str] = None
    name: str
    role: str
    department: Optional[str] = None
    department_id: Optional[str] = None
    avatar: str
    enrollment_no: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    must_change_password: bool = False
    semester: Optional[str] = None
    section: Optional[str] = None

    class Config:
        from_attributes = True
