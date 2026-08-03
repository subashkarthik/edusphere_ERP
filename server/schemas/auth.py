from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    email: Optional[str] = None
    identifier: Optional[str] = None
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
    name: str
    role: str
    department: Optional[str] = None
    department_id: Optional[str] = None
    avatar: str
    enrollment_no: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
