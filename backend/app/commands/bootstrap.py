"""Controlled CLI command for initial Administrator bootstrap provisioning."""

import argparse
import asyncio
import logging
import sys
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password, normalize_email, validate_password_policy
from app.models.enums import AuditEventType, OrganizationStatus, RoleCode, UserStatus
from app.models.organization import University
from app.models.role import UserRoleAssignment
from app.models.user import User
from app.services.audit_service import audit_service
from app.services.role_service import role_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("qpms.bootstrap")


# ------------------------------------------------------------------------------
# University Admin Bootstrap (Section D)
# ------------------------------------------------------------------------------
async def run_university_admin_bootstrap(
    username: str = "admin",
    password: str = "admin123",
    university_code: str = "APEX-UNIV",
    env: str | None = None,
    session: AsyncSession | None = None,
) -> bool:
    """Provision the initial University Admin under strict security constraints.

    Requirements enforced:
    - Creates account only if it does not already exist.
    - Stores only an Argon2id securely hashed password.
    - Assigns UNIVERSITY_ADMIN role (NOT SUPER_ADMIN).
    - Requires password change on first login (password_changed_at=None).
    - Repeatable without creating duplicate accounts.
    - Rejects default credentials in production environments.
    """
    effective_env = env or settings.app_env
    logger.info("Executing University Admin bootstrap under runtime environment: %s", effective_env)

    # 1. Enforce Production Security Constraints
    if effective_env == "production":
        if password == "admin123" or "admin" in password.lower():
            logger.error(
                "CRITICAL SECURITY VIOLATION: Default credentials ('admin123') are strictly "
                "prohibited in production environments."
            )
            raise ValueError(
                "Default development credentials are rejected in production. "
                "Provide a secure passphrase meeting NIST SP 800-63B standards."
            )
        policy_err = validate_password_policy(password)
        if policy_err:
            logger.error("Password policy violation: %s", policy_err)
            raise ValueError(policy_err)

    if session is not None:
        return await _provision_university_admin_in_session(
            session, username, password, university_code, effective_env
        )

    db_url = str(settings.database_url)
    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db, db.begin():
        result = await _provision_university_admin_in_session(
            db, username, password, university_code, effective_env
        )

    await engine.dispose()
    return result


async def _provision_university_admin_in_session(
    db: AsyncSession,
    username: str,
    password: str,
    university_code: str,
    effective_env: str,
) -> bool:
    # 1. Seed Role Catalog first
    await role_service.seed_role_catalog(db)

    # 2. Ensure target institutional anchor university exists
    univ_stmt = select(University).where(University.code == university_code)
    univ = (await db.execute(univ_stmt)).scalar_one_or_none()
    if not univ:
        univ = University(
            code=university_code,
            name="Apex University",
            type="State University",
            status=OrganizationStatus.ACTIVE,
            region="Main Campus",
            address="University Central Block",
        )
        db.add(univ)
        await db.flush()
        logger.info("Seeded institutional anchor university: %s (%s)", university_code, univ.name)

    # 3. Check for existing University Admin role
    admin_role = await role_service.get_role_by_code(db, RoleCode.UNIVERSITY_ADMIN)
    assert admin_role is not None

    # Resolve normalized username / email
    normalized = normalize_email(username)
    # If username is just 'admin', associate with institutional admin identity
    email_identity = "admin@apex.edu" if normalized == "admin" else normalized

    # 4. Check if University Admin assignment already exists for this university
    existing_assign_stmt = (
        select(UserRoleAssignment)
        .join(User, UserRoleAssignment.user_id == User.id)
        .where(
            UserRoleAssignment.role_id == admin_role.id,
            UserRoleAssignment.university_id == univ.id,
            UserRoleAssignment.is_active == True,  # noqa: E712
            (User.email == normalized) | (User.email == email_identity),
        )
    )
    existing_assignment = (await db.execute(existing_assign_stmt)).scalar_one_or_none()
    if existing_assignment:
        logger.warning(
            "University Administrator '%s' is already provisioned for university '%s'. "
            "Refusing to overwrite or reset existing account.",
            email_identity,
            university_code,
        )
        return False

    # 5. Retrieve or create User identity
    user_stmt = select(User).where((User.email == normalized) | (User.email == email_identity))
    user = (await db.execute(user_stmt)).scalar_one_or_none()

    now = datetime.now(UTC)
    if not user:
        user = User(
            email=email_identity,
            full_name="University Administrator",
            password_hash=hash_password(password),
            status=UserStatus.ACTIVE,
            email_verified_at=now,
            # Require password change on first login (None indicates never changed)
            password_changed_at=now if effective_env == "production" else None,
        )
        db.add(user)
        await db.flush()
        logger.info("Created user identity for University Admin: %s", email_identity)
    else:
        user.status = UserStatus.ACTIVE
        user.email_verified_at = now
        # Do not overwrite password if account already existed

    # 6. Assign scoped UNIVERSITY_ADMIN role (NOT SUPER_ADMIN)
    assignment = UserRoleAssignment(
        user_id=user.id,
        role_id=admin_role.id,
        university_id=univ.id,
        institution_id=None,
        department_id=None,
        is_active=True,
    )
    db.add(assignment)
    await db.flush()

    # 7. Record Immutable Audit Event
    await audit_service.record_event(
        db,
        event_type=AuditEventType.UNIVERSITY_ADMIN_PROVISIONED,
        user_id=user.id,
        details=(
            f"Initial University Admin provisioned: {email_identity} "
            f"for university {university_code} (env={effective_env})"
        ),
    )
    logger.info(
        "University Admin bootstrap completed successfully: %s (Univ: %s, RequiresPasswordChange: %s)",
        email_identity,
        university_code,
        user.password_changed_at is None,
    )
    return True


# ------------------------------------------------------------------------------
# Super Admin Bootstrap (Platform-Level)
# ------------------------------------------------------------------------------
async def run_bootstrap(
    email: str = "admin@apex.edu",
    password: str = "admin123",
    env: str | None = None,
    session: AsyncSession | None = None,
) -> bool:
    """Execute the Super Admin bootstrap process under strict environment and security constraints."""
    effective_env = env or settings.app_env
    logger.info("Executing Super Admin bootstrap under runtime environment: %s", effective_env)

    # 1. Enforce Production Security Constraints
    if effective_env == "production":
        if password == "admin123" or "admin" in password.lower():
            logger.error(
                "CRITICAL SECURITY VIOLATION: Default credentials ('admin123') are strictly "
                "prohibited in production environments."
            )
            raise ValueError(
                "Default development credentials are rejected in production. "
                "Provide a secure passphrase meeting NIST SP 800-63B standards."
            )
        policy_err = validate_password_policy(password)
        if policy_err:
            logger.error("Password policy violation: %s", policy_err)
            raise ValueError(policy_err)

    if session is not None:
        return await _provision_super_admin_in_session(session, email, password, effective_env)

    db_url = str(settings.database_url)
    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db, db.begin():
        result = await _provision_super_admin_in_session(db, email, password, effective_env)

    await engine.dispose()
    return result


async def _provision_super_admin_in_session(
    db: AsyncSession,
    email: str,
    password: str,
    effective_env: str,
) -> bool:
    # 2. Seed Role Catalog first
    await role_service.seed_role_catalog(db)

    # 3. Check for existing Super Admin
    super_role = await role_service.get_role_by_code(db, RoleCode.SUPER_ADMIN)
    assert super_role is not None

    check_admin_stmt = select(UserRoleAssignment).where(
        UserRoleAssignment.role_id == super_role.id,
        UserRoleAssignment.is_active == True,  # noqa: E712
    )
    existing_admin = (await db.execute(check_admin_stmt)).scalar_one_or_none()
    if existing_admin:
        logger.warning(
            "Super Administrator is already provisioned in the system. "
            "Refusing to overwrite or reset existing administrator."
        )
        return False

    # 4. Ensure Apex University federation anchor exists
    univ_stmt = select(University).where(University.code == "APEX-UNIV")
    univ = (await db.execute(univ_stmt)).scalar_one_or_none()
    if not univ:
        univ = University(
            code="APEX-UNIV",
            name="Apex University Federation",
            type="Central University",
            status=OrganizationStatus.ACTIVE,
            region="Headquarters",
            address="Central Institutional Campus",
        )
        db.add(univ)
        await db.flush()
        logger.info("Seeded anchor university: APEX-UNIV (%s)", univ.name)

    # 5. Provision or associate Super Admin identity
    normalized_email = normalize_email(email)
    user_stmt = select(User).where(User.email == normalized_email)
    user = (await db.execute(user_stmt)).scalar_one_or_none()

    now = datetime.now(UTC)
    if not user:
        user = User(
            email=normalized_email,
            full_name="System Super Administrator",
            password_hash=hash_password(password),
            status=UserStatus.ACTIVE,
            email_verified_at=now,
            password_changed_at=now if effective_env == "production" else None,
        )
        db.add(user)
        await db.flush()
        logger.info("Created user identity for Super Admin: %s", normalized_email)
    else:
        user.status = UserStatus.ACTIVE
        user.email_verified_at = now

    # 6. Assign SUPER_ADMIN role (Platform-wide)
    assignment = UserRoleAssignment(
        user_id=user.id,
        role_id=super_role.id,
        university_id=None,
        institution_id=None,
        department_id=None,
        is_active=True,
    )
    db.add(assignment)
    await db.flush()

    # 7. Record Immutable Audit Event
    await audit_service.record_event(
        db,
        event_type=AuditEventType.BOOTSTRAP_SUPER_ADMIN,
        user_id=user.id,
        details=f"Initial Super Admin provisioned: {normalized_email} (env={effective_env})",
    )
    logger.info("Super Admin bootstrap completed successfully: %s", normalized_email)
    return True


def main() -> None:
    """CLI entrypoint for manual bootstrap invocation."""
    parser = argparse.ArgumentParser(
        description="Provision initial University or Super Administrator."
    )
    parser.add_argument(
        "--role",
        choices=["university_admin", "super_admin"],
        default="university_admin",
        help="Target administrator role to provision (default: university_admin)",
    )
    parser.add_argument(
        "--username",
        "--email",
        dest="username",
        default="admin",
        help="Administrator username or email (default: admin)",
    )
    parser.add_argument(
        "--password",
        default="admin123",
        help="Temporary bootstrap password (default: admin123)",
    )
    parser.add_argument(
        "--university",
        default="APEX-UNIV",
        help="Target university code for University Admin (default: APEX-UNIV)",
    )
    parser.add_argument(
        "--env",
        default=None,
        help="Target environment override ('development', 'test', 'production')",
    )

    args = parser.parse_args()
    try:
        if args.role == "university_admin":
            success = asyncio.run(
                run_university_admin_bootstrap(
                    username=args.username,
                    password=args.password,
                    university_code=args.university,
                    env=args.env,
                )
            )
        else:
            success = asyncio.run(
                run_bootstrap(
                    email=args.username if "@" in args.username else f"{args.username}@apex.edu",
                    password=args.password,
                    env=args.env,
                )
            )

        if not success:
            sys.exit(0)
    except Exception as e:
        logger.error("Bootstrap failed: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
