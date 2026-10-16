"""Authentication security audit event model."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import AuditEventType


class AuthenticationAuditEvent(Base):
    """Immutable audit event for authentication lifecycle activities."""

    __tablename__ = "authentication_audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    event_type: Mapped[AuditEventType] = mapped_column(
        Enum(AuditEventType, native_enum=False, length=64),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
        index=True,
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )
    user_agent: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )
    request_id: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    details: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
    )

    __table_args__ = (
        Index("ix_auth_audit_events_user_time", user_id, timestamp),
    )
