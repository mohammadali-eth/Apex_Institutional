"""Unit and security tests for initial Super Administrator bootstrap provisioning."""

import pytest
from app.commands.bootstrap import run_bootstrap
from app.models.audit import AuthenticationAuditEvent
from app.models.enums import AuditEventType, RoleCode
from app.models.role import Role, UserRoleAssignment
from app.models.user import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_bootstrap_super_admin_success(db_session: AsyncSession) -> None:
    """Initial provisioning succeeds in dev/test environment and creates active Super Admin."""
    result = await run_bootstrap(
        email="admin@apex.edu", password="admin123", env="development", session=db_session
    )
    assert result is True

    # Verify user exists
    user = (
        await db_session.execute(select(User).where(User.email == "admin@apex.edu"))
    ).scalar_one_or_none()
    assert user is not None
    assert user.status == "active"

    # Verify role assignment
    assignment = (
        await db_session.execute(
            select(UserRoleAssignment)
            .join(Role, UserRoleAssignment.role_id == Role.id)
            .where(UserRoleAssignment.user_id == user.id, Role.code == RoleCode.SUPER_ADMIN)
        )
    ).scalar_one_or_none()
    assert assignment is not None
    assert assignment.is_active is True

    # Verify audit event
    audit = (
        await db_session.execute(
            select(AuthenticationAuditEvent).where(
                AuthenticationAuditEvent.event_type == AuditEventType.BOOTSTRAP_SUPER_ADMIN
            )
        )
    ).scalar_one_or_none()
    assert audit is not None


@pytest.mark.asyncio
async def test_bootstrap_super_admin_refuses_overwrite(db_session: AsyncSession) -> None:
    """Repeated bootstrap command must refuse to overwrite an existing administrator."""
    first = await run_bootstrap(
        email="admin@apex.edu", password="admin123", env="development", session=db_session
    )
    assert first is True

    # Second execution must return False and refuse overwrite
    second = await run_bootstrap(
        email="other_admin@apex.edu",
        password="otherPassword123!",
        env="development",
        session=db_session,
    )
    assert second is False

    # Original user remains sole admin
    admins = (
        (
            await db_session.execute(
                select(UserRoleAssignment)
                .join(Role, UserRoleAssignment.role_id == Role.id)
                .where(Role.code == RoleCode.SUPER_ADMIN, UserRoleAssignment.is_active == True)  # noqa: E712
            )
        )
        .scalars()
        .all()
    )
    assert len(admins) == 1


@pytest.mark.asyncio
async def test_bootstrap_production_refuses_default_password() -> None:
    """Production runtime environment must strictly reject default/insecure bootstrap passwords."""
    with pytest.raises(
        ValueError, match="Default development credentials are rejected in production"
    ):
        await run_bootstrap(email="admin@apex.edu", password="admin123", env="production")


@pytest.mark.asyncio
async def test_bootstrap_production_success_with_strong_password(db_session: AsyncSession) -> None:
    """Production succeeds when provided with a strong NIST-compliant passphrase."""
    result = await run_bootstrap(
        email="prod_admin@apex.edu",
        password="A_Very_Strong_Passphrase_2026_NIST!",
        env="production",
        session=db_session,
    )
    assert result is True

    user = (
        await db_session.execute(select(User).where(User.email == "prod_admin@apex.edu"))
    ).scalar_one_or_none()
    assert user is not None
    assert user.password_changed_at is not None


@pytest.mark.asyncio
async def test_bootstrap_university_admin_flow(db_session: AsyncSession) -> None:
    """University Admin bootstrap provisions 'admin' with 'admin123' requiring password change."""
    from app.commands.bootstrap import run_university_admin_bootstrap

    result = await run_university_admin_bootstrap(
        username="admin",
        password="admin123",
        university_code="APEX-UNIV",
        env="development",
        session=db_session,
    )
    assert result is True

    # User identity exists with required first-login password change
    user = (
        await db_session.execute(
            select(User).where((User.email == "admin") | (User.email == "admin@apex.edu"))
        )
    ).scalar_one_or_none()
    assert user is not None
    assert user.status == "active"
    assert user.password_changed_at is None  # Must change password on first login!

    # Role assigned is UNIVERSITY_ADMIN, NOT SUPER_ADMIN
    assignment = (
        await db_session.execute(
            select(UserRoleAssignment)
            .join(Role, UserRoleAssignment.role_id == Role.id)
            .where(UserRoleAssignment.user_id == user.id, Role.code == RoleCode.UNIVERSITY_ADMIN)
        )
    ).scalar_one_or_none()
    assert assignment is not None
    assert assignment.university_id is not None

    super_assign = (
        await db_session.execute(
            select(UserRoleAssignment)
            .join(Role, UserRoleAssignment.role_id == Role.id)
            .where(UserRoleAssignment.user_id == user.id, Role.code == RoleCode.SUPER_ADMIN)
        )
    ).scalar_one_or_none()
    assert super_assign is None

    # Repeat invocation refuses overwrite
    second = await run_university_admin_bootstrap(
        username="admin",
        password="newPassword123!",
        university_code="APEX-UNIV",
        env="development",
        session=db_session,
    )
    assert second is False
