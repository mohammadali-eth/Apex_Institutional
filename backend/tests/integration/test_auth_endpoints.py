"""Integration tests for authentication API endpoints, sessions, CSRF, and cookies."""

import pytest
from app.core.config import settings
from app.core.security import hash_password
from app.models.enums import UserStatus
from app.models.token import EmailVerificationToken, PasswordResetToken
from app.models.user import User
from app.services.auth_service import auth_service
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
async def seeded_user(db_session: AsyncSession) -> User:
    """Create a verified test user."""
    user = User(
        email="faculty.test@maktabah.edu",
        password_hash=hash_password("SuperSecret#2026Password"),
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def disabled_user(db_session: AsyncSession) -> User:
    """Create a disabled test user."""
    user = User(
        email="disabled.test@maktabah.edu",
        password_hash=hash_password("SuperSecret#2026Password"),
        status=UserStatus.DISABLED,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def locked_user(db_session: AsyncSession) -> User:
    """Create a locked test user."""
    user = User(
        email="locked.test@maktabah.edu",
        password_hash=hash_password("SuperSecret#2026Password"),
        status=UserStatus.LOCKED,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def test_get_csrf_token(async_client: AsyncClient) -> None:
    res = await async_client.get("/api/v1/auth/csrf")
    assert res.status_code == 200
    data = res.json()
    assert "csrf_token" in data
    assert settings.auth_csrf_cookie_name in res.cookies


async def test_login_success_and_cookies(
    async_client: AsyncClient, seeded_user: User
) -> None:
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user.email, "password": "SuperSecret#2026Password"},
    )
    assert res.status_code == 200
    user_data = res.json()
    assert user_data["email"] == seeded_user.email
    assert user_data["status"] == UserStatus.ACTIVE
    # Must NOT leak password hash or internal secrets
    assert "password_hash" not in user_data
    assert "password" not in user_data

    # Check cookies
    session_cookie_name = settings.resolved_session_cookie_name
    assert session_cookie_name in res.cookies
    assert settings.auth_csrf_cookie_name in res.cookies


async def test_login_invalid_password(
    async_client: AsyncClient, seeded_user: User
) -> None:
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user.email, "password": "WrongPassword1234"},
    )
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["error"]["message"]


async def test_login_disabled_account_rejected(
    async_client: AsyncClient, disabled_user: User
) -> None:
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": disabled_user.email, "password": "SuperSecret#2026Password"},
    )
    assert res.status_code == 401
    assert "disabled" in res.json()["error"]["message"].lower()


async def test_get_me_authenticated(
    async_client: AsyncClient, seeded_user: User
) -> None:
    # 1. Login
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user.email, "password": "SuperSecret#2026Password"},
    )
    assert login_res.status_code == 200

    # 2. Query /me
    me_res = await async_client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == seeded_user.email


async def test_get_me_unauthenticated(async_client: AsyncClient) -> None:
    res = await async_client.get("/api/v1/auth/me")
    assert res.status_code == 401


async def test_csrf_protection_on_state_changing_request(
    async_client: AsyncClient, seeded_user: User
) -> None:
    # 1. Login
    await async_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user.email, "password": "SuperSecret#2026Password"},
    )

    # 2. Attempt change-password without X-CSRF-Token header -> must be 403 Forbidden
    res = await async_client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "SuperSecret#2026Password",
            "new_password": "BrandNewSecurePassword#2026",
        },
    )
    assert res.status_code == 403
    assert "CSRF" in res.json()["error"]["message"]


async def test_change_password_with_valid_csrf(
    async_client: AsyncClient, seeded_user: User
) -> None:
    # 1. Login
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user.email, "password": "SuperSecret#2026Password"},
    )
    csrf_token = login_res.cookies[settings.auth_csrf_cookie_name]

    # 2. Change password supplying X-CSRF-Token header
    change_res = await async_client.post(
        "/api/v1/auth/change-password",
        headers={settings.auth_csrf_header_name: csrf_token},
        json={
            "current_password": "SuperSecret#2026Password",
            "new_password": "BrandNewSecurePassword#2026",
        },
    )
    assert change_res.status_code == 200

    # 3. Old password should fail
    fail_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user.email, "password": "SuperSecret#2026Password"},
    )
    assert fail_res.status_code == 401

    # 4. New password should succeed
    succ_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user.email, "password": "BrandNewSecurePassword#2026"},
    )
    assert succ_res.status_code == 200


async def test_logout_revokes_session(
    async_client: AsyncClient, seeded_user: User
) -> None:
    # 1. Login
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user.email, "password": "SuperSecret#2026Password"},
    )
    csrf_token = login_res.cookies[settings.auth_csrf_cookie_name]

    # 2. Logout with CSRF
    logout_res = await async_client.post(
        "/api/v1/auth/logout",
        headers={settings.auth_csrf_header_name: csrf_token},
    )
    assert logout_res.status_code == 200

    # 3. Subsequent /me call should fail
    me_res = await async_client.get("/api/v1/auth/me")
    assert me_res.status_code == 401


async def test_forgot_password_enumeration_resistance(
    async_client: AsyncClient,
) -> None:
    # Nonexistent account must return generic 200 message
    res = await async_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nonexistent.account@maktabah.edu"},
    )
    assert res.status_code == 200
    assert "instructions have been sent" in res.json()["message"]


async def test_password_recovery_and_reset_flow(
    async_client: AsyncClient, db_session: AsyncSession, seeded_user: User
) -> None:
    # 1. Request reset
    await async_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": seeded_user.email},
    )

    # 2. In test DB, retrieve raw token created
    raw_token = "pytest_generated_reset_token_12345"
    from datetime import UTC, datetime, timedelta

    from app.core.security import hash_token

    token_record = PasswordResetToken(
        user_id=seeded_user.id,
        token_hash=hash_token(raw_token),
        created_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(minutes=30),
    )
    db_session.add(token_record)
    await db_session.commit()

    # 3. Reset password with token
    reset_res = await async_client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": raw_token,
            "new_password": "NewResetPassword#2026",
        },
    )
    assert reset_res.status_code == 200

    # 4. Token replay must fail
    replay_res = await async_client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": raw_token,
            "new_password": "AnotherNewPassword#2026",
        },
    )
    assert replay_res.status_code == 400


async def test_email_verification_flow(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    # Create unverified user
    unverified = await auth_service.provision_user(
        db_session,
        email="unverified@maktabah.edu",
        password="TempPassword#2026",
        status=UserStatus.PENDING_VERIFICATION,
    )
    assert unverified.email_verified_at is None

    # Create verification token
    raw_token = "pytest_verify_token_54321"
    from datetime import UTC, datetime, timedelta

    from app.core.security import hash_token

    token_record = EmailVerificationToken(
        user_id=unverified.id,
        token_hash=hash_token(raw_token),
        created_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(hours=24),
    )
    db_session.add(token_record)
    await db_session.commit()

    # Verify email
    res = await async_client.post(
        "/api/v1/auth/verify-email",
        json={"token": raw_token},
    )
    assert res.status_code == 200

    await db_session.refresh(unverified)
    assert unverified.status == UserStatus.ACTIVE
    assert unverified.email_verified_at is not None


async def test_login_rate_limiting(
    async_client: AsyncClient, seeded_user: User
) -> None:
    # Settings configure auth_rate_limit_login_attempts = 5
    for _ in range(settings.auth_rate_limit_login_attempts):
        await async_client.post(
            "/api/v1/auth/login",
            json={"email": seeded_user.email, "password": "WrongPasswordAttempt"},
        )

    # 6th attempt should be rate limited (HTTP 429)
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user.email, "password": "WrongPasswordAttempt"},
    )
    assert res.status_code == 429
    assert "Retry-After" in res.headers


async def test_login_locked_account_rejected(
    async_client: AsyncClient, locked_user: User
) -> None:
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": locked_user.email, "password": "SuperSecret#2026Password"},
    )
    assert res.status_code == 401
    assert "locked" in res.json()["error"]["message"].lower()


async def test_logout_all_endpoint(
    async_client: AsyncClient, seeded_user: User
) -> None:
    # 1. Login session 1
    res1 = await async_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user.email, "password": "SuperSecret#2026Password"},
    )
    assert res1.status_code == 200
    csrf_token = res1.cookies[settings.auth_csrf_cookie_name]

    # 2. Call logout-all
    logout_res = await async_client.post(
        "/api/v1/auth/logout-all",
        headers={settings.auth_csrf_header_name: csrf_token},
    )
    assert logout_res.status_code == 200
    assert "active sessions" in logout_res.json()["message"]

    # 3. Subsequent /me call must be rejected
    me_res = await async_client.get("/api/v1/auth/me")
    assert me_res.status_code == 401


async def test_resend_verification_endpoint(
    async_client: AsyncClient, seeded_user: User
) -> None:
    # Existent user
    res1 = await async_client.post(
        "/api/v1/auth/resend-verification",
        json={"email": seeded_user.email},
    )
    assert res1.status_code == 200
    assert "link has been sent" in res1.json()["message"]

    # Nonexistent user (enumeration resistant)
    res2 = await async_client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "nonexistent@maktabah.edu"},
    )
    assert res2.status_code == 200
    assert "link has been sent" in res2.json()["message"]


async def test_absence_of_secrets_in_responses(
    async_client: AsyncClient, seeded_user: User
) -> None:
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user.email, "password": "SuperSecret#2026Password"},
    )
    assert res.status_code == 200
    body = res.text
    assert "password_hash" not in body
    assert "$argon2id$" not in body
    assert "token_hash" not in body


async def test_cors_preflight_and_headers(
    async_client: AsyncClient,
) -> None:
    res = await async_client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert res.headers.get("access-control-allow-credentials") == "true"


async def test_user_email_uniqueness_db_constraint(
    db_session: AsyncSession, seeded_user: User
) -> None:
    import pytest
    from sqlalchemy.exc import IntegrityError

    duplicate = User(
        email=seeded_user.email,
        password_hash=hash_password("AnotherPassword#123"),
        status=UserStatus.ACTIVE,
    )
    db_session.add(duplicate)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


async def test_user_foreign_key_cascades(
    db_session: AsyncSession, seeded_user: User
) -> None:
    from app.services.session_service import session_service
    from sqlalchemy import select

    # Create session for seeded_user
    session_rec, _ = await session_service.create_session(
        db_session, user_id=seeded_user.id
    )

    # Delete user
    await db_session.delete(seeded_user)
    await db_session.commit()
    db_session.expunge_all()

    # Session record must cascade delete
    from app.models.session import UserSession
    stmt = select(UserSession).where(UserSession.id == session_rec.id)
    res = await db_session.execute(stmt)
    assert res.scalar_one_or_none() is None


def test_production_security_validation() -> None:
    import pytest
    from app.core.config import Settings

    # Insecure key in production must raise ValueError
    insecure_settings = Settings(
        app_env="production",
        secret_key="dev-insecure-short",
    )
    with pytest.raises(ValueError, match="Production configuration violation"):
        insecure_settings.validate_production_security()

