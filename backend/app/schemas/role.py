"""Pydantic schemas for role catalog, delegation, invitations, and staff management."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.enums import InvitationStatus, RoleCode, UserStatus


class RoleResponse(BaseModel):
    """Specification of a role in the role catalog."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: RoleCode
    name: str
    description: str | None = None
    is_system: bool
    is_active: bool


class UserRoleAssignmentResponse(BaseModel):
    """Active role assignment with organizational scope."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role_id: uuid.UUID
    role_code: RoleCode
    role_name: str
    university_id: uuid.UUID | None = None
    university_name: str | None = None
    institution_id: uuid.UUID | None = None
    institution_name: str | None = None
    department_id: uuid.UUID | None = None
    department_name: str | None = None
    is_active: bool
    created_at: datetime


class ProvisionUniversityAdminRequest(BaseModel):
    """Super Admin payload to provision a University Administrator."""

    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    university_id: uuid.UUID
    password: str = Field(min_length=8, max_length=128)


class CreateStaffUserRequest(BaseModel):
    """University Admin payload to directly provision a staff member account with credentials and role."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    role_code: RoleCode
    university_id: uuid.UUID | None = None
    institution_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None


class StaffInviteRequest(BaseModel):
    """University Admin payload to invite a new staff member."""

    email: EmailStr
    full_name: str | None = Field(default=None, max_length=255)
    role_code: RoleCode
    university_id: uuid.UUID | None = None
    institution_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None


class StaffInvitationResponse(BaseModel):
    """Details of a issued staff invitation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role_id: uuid.UUID
    role_code: RoleCode
    role_name: str
    university_id: uuid.UUID
    university_name: str | None = None
    institution_id: uuid.UUID | None = None
    institution_name: str | None = None
    department_id: uuid.UUID | None = None
    department_name: str | None = None
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime
    raw_token: str | None = None


class VerifyInvitationResponse(BaseModel):
    """Public token validation preview."""

    valid: bool
    email: str
    role_code: RoleCode
    role_name: str
    university_name: str
    institution_name: str | None = None
    department_name: str | None = None
    expires_at: datetime


class AcceptInvitationRequest(BaseModel):
    """Activation payload to establish credentials and consume invitation."""

    token: str = Field(min_length=16, max_length=256)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)


class RoleAssignRequest(BaseModel):
    """Payload to assign an approved role within organizational scope."""

    role_code: RoleCode
    university_id: uuid.UUID | None = None
    institution_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None


class StaffMemberResponse(BaseModel):
    """Staff member profile and authorized active roles."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str | None = None
    status: UserStatus
    created_at: datetime
    last_login_at: datetime | None = None
    roles: list[UserRoleAssignmentResponse] = []


class UpdateStaffUserRequest(BaseModel):
    """Payload to update an existing staff user's identity, role, scope, or credentials."""

    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    role_code: RoleCode | None = None
    institution_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None
    status: UserStatus | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UpdateAccountStatusRequest(BaseModel):
    """Administrative payload to toggle user account status."""

    status: UserStatus | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_status_or_active(self) -> "UpdateAccountStatusRequest":
        if self.status is None and self.is_active is not None:
            self.status = UserStatus.ACTIVE if self.is_active else UserStatus.DISABLED
        elif self.status is None and self.is_active is None:
            raise ValueError("Either 'status' or 'is_active' must be provided.")
        return self

