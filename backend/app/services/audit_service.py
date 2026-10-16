"""Authentication security audit event persistence service."""

import logging
import uuid
from datetime import UTC, datetime

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuthenticationAuditEvent
from app.models.enums import AuditEventType

logger = logging.getLogger("qpms.audit")


class AuditService:
    """Records security audit events without persisting sensitive credentials."""

    async def record_event(
        self,
        db: AsyncSession,
        event_type: AuditEventType,
        user_id: uuid.UUID | None = None,
        request: Request | None = None,
        details: str | None = None,
    ) -> None:
        """Persist an audit event safely."""
        ip_address: str | None = None
        user_agent: str | None = None
        request_id: str | None = None

        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent", "")[:512]
            request_id = getattr(request.state, "request_id", None) or request.headers.get(
                "x-request-id"
            )

        now = datetime.now(UTC)
        event = AuthenticationAuditEvent(
            event_type=event_type,
            user_id=user_id,
            timestamp=now,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            details=details[:1024] if details else None,
        )

        try:
            db.add(event)
            await db.commit()
        except Exception as exc:
            logger.warning("Failed to persist security audit event %s: %s", event_type, exc)
            await db.rollback()


audit_service = AuditService()
