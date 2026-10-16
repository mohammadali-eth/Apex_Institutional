"""Core authentication, password management, and token consumption service."""

from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    ensure_utc,
    generate_secure_token,
    hash_password,
    hash_token,
    normalize_email,
    validate_password_policy,
    verify_dummy_password,
    verify_password,
)
from app.models.enums import AuditEventType, UserStatus
from app.models.token import EmailVerificationToken, PasswordResetToken
from app.models.user import User
from app.services.audit_service import audit_service
from app.services.email.service import email_service
from app.services.session_service import session_service


class AuthService:
    """Orchestrates credential verification, token lifecycles, and identity events."""

    async def get_user_by_email(self, db: AsyncSession, email: str) -> User | None:
        """Query user identity by normalized email."""
        normalized = normalize_email(email)
        stmt = select(User).where(User.email == normalized)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def authenticate_user(
        self,
        db: AsyncSession,
        email: str,
        password: str,
        request: Request | None = None,
    ) -> tuple[User | None, str | None]:
        """Authenticate user by email and password using constant-time mitigations.

        Returns:
            (user, error_message)
        """
        user = await self.get_user_by_email(db, email)

        if not user:
            verify_dummy_password()
            await audit_service.record_event(
                db,
                event_type=AuditEventType.LOGIN_FAILURE,
                request=request,
                details="Invalid credentials",
            )
            return None, "Invalid email or password."

        # Check account status boundaries
        if user.status == UserStatus.DISABLED:
            verify_dummy_password()
            await audit_service.record_event(
                db,
                event_type=AuditEventType.LOGIN_FAILURE,
                user_id=user.id,
                request=request,
                details="Attempted login on disabled account",
            )
            return None, "Account is disabled. Please contact your administrator."

        if user.status == UserStatus.LOCKED:
            verify_dummy_password()
            await audit_service.record_event(
                db,
                event_type=AuditEventType.LOGIN_FAILURE,
                user_id=user.id,
                request=request,
                details="Attempted login on locked account",
            )
            return None, "Account is locked. Please contact your administrator."

        # Verify password with Argon2id
        if not verify_password(password, user.password_hash):
            await audit_service.record_event(
                db,
                event_type=AuditEventType.LOGIN_FAILURE,
                user_id=user.id,
                request=request,
                details="Password verification failed",
            )
            return None, "Invalid email or password."

        # Successful authentication
        user.last_login_at = datetime.now(UTC)
        await audit_service.record_event(
            db,
            event_type=AuditEventType.LOGIN_SUCCESS,
            user_id=user.id,
            request=request,
        )
        await db.commit()
        await db.refresh(user)
        return user, None

    async def change_password(
        self,
        db: AsyncSession,
        user: User,
        current_password: str,
        new_password: str,
        request: Request | None = None,
    ) -> tuple[bool, str | None]:
        """Change user password, validate policy, and invalidate all existing sessions."""
        if not verify_password(current_password, user.password_hash):
            return False, "Current password verification failed."

        policy_err = validate_password_policy(new_password)
        if policy_err:
            return False, policy_err

        now = datetime.now(UTC)
        user.password_hash = hash_password(new_password)
        user.password_changed_at = now

        # Invalidate all existing sessions
        await session_service.revoke_all_user_sessions(db, user.id)

        await audit_service.record_event(
            db,
            event_type=AuditEventType.PASSWORD_CHANGE,
            user_id=user.id,
            request=request,
            details="Password changed; all active sessions revoked",
        )
        await db.commit()
        return True, None

    async def request_password_reset(
        self,
        db: AsyncSession,
        email: str,
        request: Request | None = None,
    ) -> bool:
        """Generate and dispatch password reset token with enumeration resistance."""
        user = await self.get_user_by_email(db, email)
        if not user or user.status == UserStatus.DISABLED:
            # Resilient to email enumeration: return True without leaking
            verify_dummy_password()
            return True

        now = datetime.now(UTC)
        # Invalidate prior active reset tokens
        await db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.user_id == user.id, PasswordResetToken.consumed_at.is_(None))
            .values(consumed_at=now)
        )

        raw_token = generate_secure_token(32)
        token_hash = hash_token(raw_token)
        expires_at = now + timedelta(minutes=settings.auth_password_reset_token_expire_minutes)

        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            created_at=now,
            expires_at=expires_at,
            consumed_at=None,
        )
        db.add(reset_token)
        await db.commit()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.PASSWORD_RESET_REQUESTED,
            user_id=user.id,
            request=request,
        )

        # Dispatch reset email
        await email_service.send_password_reset_email(user.email, raw_token)
        return True

    async def reset_password_with_token(
        self,
        db: AsyncSession,
        raw_token: str,
        new_password: str,
        request: Request | None = None,
    ) -> tuple[bool, str | None]:
        """Atomically validate reset token, update password, and revoke sessions."""
        policy_err = validate_password_policy(new_password)
        if policy_err:
            return False, policy_err

        token_hash = hash_token(raw_token)
        now = datetime.now(UTC)

        stmt = select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.consumed_at.is_(None),
        )
        result = await db.execute(stmt)
        token_record = result.scalar_one_or_none()

        if not token_record or ensure_utc(token_record.expires_at) <= now:
            return False, "Invalid or expired password reset token."

        # Atomically consume token
        token_record.consumed_at = now

        # Update user
        stmt_user = select(User).where(User.id == token_record.user_id)
        res_user = await db.execute(stmt_user)
        user = res_user.scalar_one_or_none()

        if not user or user.status == UserStatus.DISABLED:
            return False, "Account unavailable or disabled."

        user.password_hash = hash_password(new_password)
        user.password_changed_at = now

        # Revoke all sessions
        await session_service.revoke_all_user_sessions(db, user.id)

        await audit_service.record_event(
            db,
            event_type=AuditEventType.PASSWORD_RESET_COMPLETED,
            user_id=user.id,
            request=request,
            details="Password successfully reset via recovery token; all sessions revoked",
        )
        await db.commit()
        return True, None

    async def request_email_verification(
        self,
        db: AsyncSession,
        email: str,
        request: Request | None = None,
    ) -> bool:
        """Generate and dispatch email verification token."""
        user = await self.get_user_by_email(db, email)
        if not user or user.email_verified_at is not None or user.status == UserStatus.DISABLED:
            return True

        now = datetime.now(UTC)
        await db.execute(
            update(EmailVerificationToken)
            .where(
                EmailVerificationToken.user_id == user.id,
                EmailVerificationToken.consumed_at.is_(None),
            )
            .values(consumed_at=now)
        )

        raw_token = generate_secure_token(32)
        token_hash = hash_token(raw_token)
        expires_at = now + timedelta(hours=settings.auth_email_verification_token_expire_hours)

        token_record = EmailVerificationToken(
            user_id=user.id,
            token_hash=token_hash,
            created_at=now,
            expires_at=expires_at,
            consumed_at=None,
        )
        db.add(token_record)
        await db.commit()

        await audit_service.record_event(
            db,
            event_type=AuditEventType.EMAIL_VERIFICATION_SENT,
            user_id=user.id,
            request=request,
        )
        await email_service.send_verification_email(user.email, raw_token)
        return True

    async def verify_email_with_token(
        self,
        db: AsyncSession,
        raw_token: str,
        request: Request | None = None,
    ) -> tuple[bool, str | None]:
        """Atomically consume email verification token and update account status."""
        token_hash = hash_token(raw_token)
        now = datetime.now(UTC)

        stmt = select(EmailVerificationToken).where(
            EmailVerificationToken.token_hash == token_hash,
            EmailVerificationToken.consumed_at.is_(None),
        )
        result = await db.execute(stmt)
        token_record = result.scalar_one_or_none()

        if not token_record or ensure_utc(token_record.expires_at) <= now:
            return False, "Invalid or expired email verification token."

        token_record.consumed_at = now

        stmt_user = select(User).where(User.id == token_record.user_id)
        res_user = await db.execute(stmt_user)
        user = res_user.scalar_one_or_none()

        if not user or user.status == UserStatus.DISABLED:
            return False, "Account unavailable or disabled."

        user.email_verified_at = now
        if user.status == UserStatus.PENDING_VERIFICATION:
            user.status = UserStatus.ACTIVE

        await audit_service.record_event(
            db,
            event_type=AuditEventType.EMAIL_VERIFICATION_COMPLETED,
            user_id=user.id,
            request=request,
            details="Email verified successfully",
        )
        await db.commit()
        return True, None

    async def provision_user(
        self,
        db: AsyncSession,
        email: str,
        password: str,
        status: UserStatus = UserStatus.ACTIVE,
    ) -> User:
        """Provision a new user identity (for administrative setup and testing)."""
        normalized = normalize_email(email)
        existing = await self.get_user_by_email(db, normalized)
        if existing:
            raise ValueError(f"User with email {normalized} already exists.")

        policy_err = validate_password_policy(password)
        if policy_err:
            raise ValueError(policy_err)

        user = User(
            email=normalized,
            password_hash=hash_password(password),
            status=status,
            email_verified_at=datetime.now(UTC) if status == UserStatus.ACTIVE else None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user


auth_service = AuthService()
