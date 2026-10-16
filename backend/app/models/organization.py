"""Organizational hierarchy models: University, Institution, Department."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import OrganizationStatus

if TYPE_CHECKING:
    from app.models.role import StaffInvitation, UserRoleAssignment


class University(Base, TimestampMixin):
    """Apex university / institutional federation entity."""

    __tablename__ = "universities"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    code: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(
        String(64),
        default="State University",
        nullable=False,
    )
    status: Mapped[OrganizationStatus] = mapped_column(
        Enum(OrganizationStatus, native_enum=False, length=32),
        default=OrganizationStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    region: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )
    address: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )

    # Relationships
    institutions: Mapped[list["Institution"]] = relationship(
        "Institution",
        back_populates="university",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    role_assignments: Mapped[list["UserRoleAssignment"]] = relationship(
        "UserRoleAssignment",
        back_populates="university",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    invitations: Mapped[list["StaffInvitation"]] = relationship(
        "StaffInvitation",
        back_populates="university",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Institution(Base, TimestampMixin):
    """Affiliated college or institutional campus under a university."""

    __tablename__ = "institutions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    university_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("universities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(
        String(64),
        default="College",
        nullable=False,
    )
    status: Mapped[OrganizationStatus] = mapped_column(
        Enum(OrganizationStatus, native_enum=False, length=32),
        default=OrganizationStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    address: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )
    contact_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Relationships
    university: Mapped["University"] = relationship(
        "University",
        back_populates="institutions",
    )
    departments: Mapped[list["Department"]] = relationship(
        "Department",
        back_populates="institution",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    role_assignments: Mapped[list["UserRoleAssignment"]] = relationship(
        "UserRoleAssignment",
        back_populates="institution",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Department(Base, TimestampMixin):
    """Academic department within an institution."""

    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(
        String(64),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    status: Mapped[OrganizationStatus] = mapped_column(
        Enum(OrganizationStatus, native_enum=False, length=32),
        default=OrganizationStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    # Relationships
    institution: Mapped["Institution"] = relationship(
        "Institution",
        back_populates="departments",
    )
    role_assignments: Mapped[list["UserRoleAssignment"]] = relationship(
        "UserRoleAssignment",
        back_populates="department",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (Index("ix_departments_inst_code", institution_id, code, unique=True),)
