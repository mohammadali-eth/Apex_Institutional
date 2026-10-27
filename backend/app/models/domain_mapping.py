"""Domain-based access control and role mapping model."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Department, Institution, University
    from app.models.role import Role


class DomainRoleMapping(Base, TimestampMixin):
    """Configurable domain-to-role and institutional scope mapping."""

    __tablename__ = "domain_role_mappings"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    domain_pattern: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    identity_type: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    priority: Mapped[int] = mapped_column(
        default=100,
        nullable=False,
        index=True,
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    university_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("universities.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    institution_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Relationships
    role: Mapped["Role"] = relationship("Role")
    university: Mapped["University | None"] = relationship("University")
    institution: Mapped["Institution | None"] = relationship("Institution")
    department: Mapped["Department | None"] = relationship("Department")

    __table_args__ = (
        Index("ix_domain_pattern_active", domain_pattern, is_active),
    )
