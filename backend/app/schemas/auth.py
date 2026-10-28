from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"

class RoleResponse(BaseModel):
    id: str
    name: str
    display_name: str
    description: Optional[str] = None
    permissions: List[str] = []

    model_config = ConfigDict(from_attributes=True)

class UserCreate(BaseModel):
    email: EmailStr
    password: Optional[str] = None # If None, system generates a secure initial setup token & temp password
    full_name: str
    role_name: str = "TEACHER"
    organization_id: Optional[str] = None
    department_id: Optional[str] = None
    must_change_password: Optional[bool] = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role_name: Optional[str] = None
    organization_id: Optional[str] = None
    department_id: Optional[str] = None
    is_active: Optional[bool] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class CredentialSetupRequest(BaseModel):
    token: str
    new_password: str

class PublicSignUpRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: Optional[str] = None
    terms_accepted: bool

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str
    email_sent: bool
    delivery_status: str
    dev_token: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role_name: str
    organization_id: Optional[str] = None
    department_id: Optional[str] = None
    organization_name: Optional[str] = None
    department_name: Optional[str] = None
    is_active: bool
    must_change_password: bool = False
    permissions: List[str] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserProvisionResponse(UserResponse):
    temporary_password: Optional[str] = None
    setup_token: Optional[str] = None
    setup_url: Optional[str] = None

TokenResponse.model_rebuild()
