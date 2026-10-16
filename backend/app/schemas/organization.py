"""Schemas for University, Institution, and Department organizational structures."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import OrganizationStatus


class UniversityCreate(BaseModel):
    """Payload to register a new university."""

    code: str = Field(min_length=2, max_length=64, description="Unique university machine code")
    name: str = Field(min_length=2, max_length=255, description="Full university name")
    type: str = Field(default="State University", max_length=64)
    region: str | None = Field(default=None, max_length=128)
    address: str | None = Field(default=None, max_length=512)


class UniversityUpdate(BaseModel):
    """Payload to update university profile and lifecycle status."""

    name: str | None = Field(default=None, min_length=2, max_length=255)
    type: str | None = Field(default=None, max_length=64)
    status: OrganizationStatus | None = None
    region: str | None = None
    address: str | None = None


class UniversityResponse(BaseModel):
    """Public details of a registered university."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    type: str
    status: OrganizationStatus
    region: str | None = None
    address: str | None = None
    institutions_count: int = 0
    admins_count: int = 0
    created_at: datetime
    updated_at: datetime


class InstitutionCreate(BaseModel):
    """Payload to register an institution / campus under a university."""

    code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=255)
    type: str = Field(default="College", max_length=64)
    address: str | None = None
    contact_email: str | None = None


class InstitutionResponse(BaseModel):
    """Public representation of an institution."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    university_id: uuid.UUID
    code: str
    name: str
    type: str
    status: OrganizationStatus
    address: str | None = None
    contact_email: str | None = None
    departments_count: int = 0
    created_at: datetime
    updated_at: datetime


class DepartmentCreate(BaseModel):
    """Payload to create an academic department within an institution."""

    institution_id: uuid.UUID
    code: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=255)


class DepartmentResponse(BaseModel):
    """Public representation of an academic department."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    institution_id: uuid.UUID
    code: str
    name: str
    status: OrganizationStatus
    created_at: datetime
    updated_at: datetime
