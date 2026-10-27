"""Domain mapping validation schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import RoleCode


class DomainMappingCreate(BaseModel):
    """Schema for registering a new domain-to-role mapping."""

    model_config = ConfigDict(str_strip_whitespace=True)

    domain_pattern: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Domain pattern (e.g., universityadmin.in, bca.hod.in, mca.hod.in)",
    )
    identity_type: str | None = Field(
        default=None,
        description="Initial identity classification (e.g. SUPER_ADMIN, UNIVERSITY_ADMIN, HOD, FACULTY, STUDENT)",
    )
    priority: int = Field(
        default=100,
        ge=0,
        le=1000,
        description="Resolution priority (higher value wins)",
    )
    role_code: RoleCode | None = Field(
        default=None,
        description="Assigned role catalog code",
    )
    role_id: uuid.UUID | None = Field(
        default=None,
        description="Assigned role catalog UUID identifier",
    )
    university_id: uuid.UUID | None = Field(
        default=None,
        description="Assigned university anchor ID",
    )
    institution_id: uuid.UUID | None = Field(
        default=None,
        description="Assigned institution / campus ID",
    )
    department_id: uuid.UUID | None = Field(
        default=None,
        description="Assigned department scope ID",
    )
    is_active: bool = Field(
        default=True,
        description="Active/inactive operational status",
    )
    description: str | None = Field(
        default=None,
        max_length=255,
        description="Optional human-readable notes",
    )

    @field_validator("domain_pattern")
    @classmethod
    def normalize_pattern(cls, v: str) -> str:
        pattern = v.strip().lower()
        if pattern.startswith("@") and not pattern.startswith("@*"):
            pattern = pattern[1:]
        if not pattern or ("." not in pattern and "*" not in pattern):
            raise ValueError("Domain pattern must be a valid domain, email, or wildcard pattern (e.g. universityadmin.in, *@hod.com, cs.hod@hod.com)")
        return pattern


class DomainMappingUpdate(BaseModel):
    """Schema for updating an existing domain-to-role mapping."""

    model_config = ConfigDict(str_strip_whitespace=True)

    identity_type: str | None = None
    priority: int | None = None
    role_code: RoleCode | None = None
    role_id: uuid.UUID | None = None
    university_id: uuid.UUID | None = None
    institution_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None
    is_active: bool | None = None
    description: str | None = None


class DomainMappingResponse(BaseModel):
    """Public details of a configured domain mapping."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    domain_pattern: str
    identity_type: str | None = None
    priority: int = 100
    role_id: uuid.UUID
    role_code: str
    role_name: str
    university_id: uuid.UUID | None = None
    university_name: str | None = None
    institution_id: uuid.UUID | None = None
    institution_name: str | None = None
    department_id: uuid.UUID | None = None
    department_name: str | None = None
    is_active: bool
    description: str | None = None
    created_at: datetime
    updated_at: datetime
