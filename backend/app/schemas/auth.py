"""Pydantic schemas for authentication and identity operations."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserStatus
from app.schemas.role import UserRoleAssignmentResponse


class LoginRequest(BaseModel):
    """User credential login payload."""

    email: str = Field(
        min_length=3, max_length=255, description="Email address or administrative username"
    )
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    """Safe public representation of user identity with active roles and portal routing."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str | None = None
    status: UserStatus
    email_verified_at: datetime | None = None
    created_at: datetime
    last_login_at: datetime | None = None
    roles: list[UserRoleAssignmentResponse] = []
    active_role: str | None = None
    portal_route: str = "/workspace"
    must_change_password: bool = False


class ChangePasswordRequest(BaseModel):
    """Authenticated password modification request."""

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class ForgotPasswordRequest(BaseModel):
    """Account recovery request payload."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Password reset token consumption payload."""

    token: str = Field(min_length=16, max_length=256)
    new_password: str = Field(min_length=12, max_length=128)


class VerifyEmailRequest(BaseModel):
    """Email verification token consumption payload."""

    token: str = Field(min_length=16, max_length=256)


class ResendVerificationRequest(BaseModel):
    """Request to resend verification email."""

    email: EmailStr


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str


class CsrfTokenResponse(BaseModel):
    """CSRF token issuance response."""

    csrf_token: str
