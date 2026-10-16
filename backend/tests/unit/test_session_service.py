"""Unit tests for PostgreSQL-backed opaque session management service."""

from datetime import UTC, datetime, timedelta

import pytest
from app.core.config import settings
from app.models.enums import UserStatus
from app.models.user import User
from app.services.session_service import session_service
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
async def sample_user(db_session: AsyncSession) -> User:
    """Fixture to insert an active test user."""
    user = User(
        email="session.test@maktabah.edu",
        password_hash="dummy_argon2_hash_value",
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def test_create_and_validate_session(db_session: AsyncSession, sample_user: User) -> None:
    session_record, raw_token = await session_service.create_session(
        db_session,
        user_id=sample_user.id,
        ip_address="127.0.0.1",
        user_agent="Pytest Agent",
    )
    assert session_record.id is not None
    assert session_record.user_id == sample_user.id
    assert raw_token is not None

    # Validate session
    validated = await session_service.validate_session(db_session, raw_token)
    assert validated is not None
    v_session, v_user = validated
    assert v_session.id == session_record.id
    assert v_user.id == sample_user.id


async def test_session_absolute_expiration(db_session: AsyncSession, sample_user: User) -> None:
    session_record, raw_token = await session_service.create_session(
        db_session,
        user_id=sample_user.id,
    )
    # Manually backdate expires_at into the past
    session_record.expires_at = datetime.now(UTC) - timedelta(seconds=10)
    await db_session.commit()

    validated = await session_service.validate_session(db_session, raw_token)
    assert validated is None


async def test_session_idle_inactivity_expiration(
    db_session: AsyncSession, sample_user: User
) -> None:
    session_record, raw_token = await session_service.create_session(
        db_session,
        user_id=sample_user.id,
    )
    # Manually backdate last_activity_at beyond idle timeout window
    session_record.last_activity_at = datetime.now(UTC) - timedelta(
        minutes=settings.auth_session_idle_timeout_minutes + 5
    )
    await db_session.commit()

    validated = await session_service.validate_session(db_session, raw_token)
    assert validated is None


async def test_session_revocation(db_session: AsyncSession, sample_user: User) -> None:
    _, raw_token = await session_service.create_session(
        db_session,
        user_id=sample_user.id,
    )
    # Revoke
    revoked = await session_service.revoke_session(db_session, raw_token)
    assert revoked is True

    # Validate should now fail
    validated = await session_service.validate_session(db_session, raw_token)
    assert validated is None


async def test_revoke_all_user_sessions(db_session: AsyncSession, sample_user: User) -> None:
    _, token1 = await session_service.create_session(db_session, user_id=sample_user.id)
    _, token2 = await session_service.create_session(db_session, user_id=sample_user.id)

    count = await session_service.revoke_all_user_sessions(db_session, sample_user.id)
    assert count == 2

    assert await session_service.validate_session(db_session, token1) is None
    assert await session_service.validate_session(db_session, token2) is None


async def test_session_rotation(db_session: AsyncSession, sample_user: User) -> None:
    _, old_token = await session_service.create_session(db_session, user_id=sample_user.id)

    rotation = await session_service.rotate_session(db_session, old_token)
    assert rotation is not None
    new_session, new_token = rotation

    assert new_token != old_token
    # Old token is revoked
    assert await session_service.validate_session(db_session, old_token) is None
    # New token is valid
    assert await session_service.validate_session(db_session, new_token) is not None


async def test_disabled_user_session_rejection(db_session: AsyncSession, sample_user: User) -> None:
    _, token = await session_service.create_session(db_session, user_id=sample_user.id)

    # Disable user account
    sample_user.status = UserStatus.DISABLED
    await db_session.commit()

    # Session validation must reject
    validated = await session_service.validate_session(db_session, token)
    assert validated is None
