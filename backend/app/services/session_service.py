"""PostgreSQL-backed opaque session management service."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import ensure_utc, generate_secure_token, hash_token
from app.models.enums import UserStatus
from app.models.session import UserSession
from app.models.user import User


class SessionService:
    """Manages secure database-backed session lifecycles."""

    async def create_session(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[UserSession, str]:
        """Create a new opaque session record and return its raw token."""
        raw_token = generate_secure_token(32)
        token_hash = hash_token(raw_token)
        now = datetime.now(UTC)
        expires_at = now + timedelta(hours=settings.auth_session_absolute_timeout_hours)

        db_session = UserSession(
            user_id=user_id,
            token_hash=token_hash,
            created_at=now,
            expires_at=expires_at,
            last_activity_at=now,
            revoked_at=None,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(db_session)
        await db.commit()
        await db.refresh(db_session)
        return db_session, raw_token

    async def validate_session(
        self,
        db: AsyncSession,
        raw_token: str,
    ) -> tuple[UserSession, User] | None:
        """Validate an active session and associated user identity."""
        if not raw_token:
            return None

        token_hash = hash_token(raw_token)
        now = datetime.now(UTC)

        stmt = (
            select(UserSession)
            .options(selectinload(UserSession.user))
            .where(
                UserSession.token_hash == token_hash,
                UserSession.revoked_at.is_(None),
            )
        )
        result = await db.execute(stmt)
        user_session = result.scalar_one_or_none()

        if not user_session:
            return None

        # Check absolute expiration
        if ensure_utc(user_session.expires_at) <= now:
            user_session.revoked_at = now
            await db.commit()
            return None

        # Check idle inactivity expiration
        idle_limit = timedelta(minutes=settings.auth_session_idle_timeout_minutes)
        if ensure_utc(user_session.last_activity_at) + idle_limit < now:
            user_session.revoked_at = now
            await db.commit()
            return None

        # Check account status
        user = user_session.user
        if not user or user.status in (UserStatus.DISABLED, UserStatus.LOCKED):
            user_session.revoked_at = now
            await db.commit()
            return None

        # Touch last activity timestamp
        user_session.last_activity_at = now
        await db.commit()
        return user_session, user

    async def revoke_session(
        self,
        db: AsyncSession,
        raw_token: str,
    ) -> bool:
        """Revoke a single active session by its raw token."""
        if not raw_token:
            return False

        token_hash = hash_token(raw_token)
        now = datetime.now(UTC)

        stmt = (
            update(UserSession)
            .where(
                UserSession.token_hash == token_hash,
                UserSession.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )
        result = await db.execute(stmt)
        await db.commit()
        rowcount = int(getattr(result, "rowcount", 0))
        return rowcount > 0

    async def revoke_all_user_sessions(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> int:
        """Revoke all active sessions belonging to a specific user."""
        now = datetime.now(UTC)
        stmt = (
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )
        result = await db.execute(stmt)
        await db.commit()
        return int(getattr(result, "rowcount", 0))

    async def rotate_session(
        self,
        db: AsyncSession,
        old_raw_token: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[UserSession, str] | None:
        """Rotate session token atomically upon privilege change or re-auth."""
        validation = await self.validate_session(db, old_raw_token)
        if not validation:
            return None

        old_session, user = validation
        old_session.revoked_at = datetime.now(UTC)

        new_session, new_raw_token = await self.create_session(
            db, user.id, ip_address=ip_address, user_agent=user_agent
        )
        return new_session, new_raw_token


session_service = SessionService()
