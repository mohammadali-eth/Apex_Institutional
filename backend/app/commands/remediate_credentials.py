"""Credential audit and safe remediation command.

Identifies user accounts with shared default credentials or insecure passwords,
updates them with cryptographically isolated Argon2id password hashes, requires
mandatory password rotation on first login, revokes all active sessions, and logs
security audit events without resetting or deleting the database.
"""

import argparse
import asyncio
import logging
import secrets
import sys
from datetime import UTC, datetime
from typing import Final

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password, normalize_email, verify_password
from app.models.enums import AuditEventType, UserStatus
from app.models.user import User
from app.services.audit_service import audit_service
from app.services.session_service import session_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("credential_remediation")

# Known shared/insecure passwords to detect during audit
KNOWN_INSECURE_PASSWORDS: Final[tuple[str, ...]] = (
    "Password@123",
    "admin123",
    "password",
    "12345678",
)

# Standard distinct passphrases for illustrative seed accounts
SEED_ACCOUNT_PASSPHRASES: Final[dict[str, str]] = {
    "admin@apex.edu": "ApexAdmin#Secure2026!",
    "ali@universityadmin.in": "UnivAdmin#Secure2026!",
    "ali@bca.hod.in": "BcaHod#Secure2026!",
    "ali@mca.hod.in": "McaHod#Secure2026!",
    "student@general.in": "Student#Secure2026!",
}


async def audit_and_remediate_credentials(
    db: AsyncSession,
    dry_run: bool = False,
) -> dict[str, int | list[str]]:
    """Audit all database accounts and safely remediate accounts with shared credentials."""
    logger.info("Beginning database credential audit...")

    stmt = select(User)
    result = await db.execute(stmt)
    users = result.scalars().all()

    total_audited = len(users)
    remediated_accounts: list[str] = []
    total_sessions_revoked = 0

    for user in users:
        is_compromised = False
        matched_weak_credential = False

        # 1. Test against known insecure/shared passwords
        for weak_pwd in KNOWN_INSECURE_PASSWORDS:
            if verify_password(weak_pwd, user.password_hash):
                is_compromised = True
                matched_weak_credential = True
                break

        if not is_compromised:
            continue

        normalized_email = normalize_email(user.email)
        logger.warning(
            "Account identified with weak/shared credentials: %s",
            normalized_email,
        )

        if dry_run:
            remediated_accounts.append(normalized_email)
            continue

        # 2. Determine new isolated unique password
        if normalized_email in SEED_ACCOUNT_PASSPHRASES:
            isolated_password = SEED_ACCOUNT_PASSPHRASES[normalized_email]
        else:
            isolated_password = f"Sec#{secrets.token_urlsafe(14)}!9A"

        # 3. Update with fresh Argon2id hash (with unique 16-byte random salt)
        user.password_hash = hash_password(isolated_password)
        # Require password rotation on initial login
        user.password_changed_at = None

        # 4. Revoke all active sessions for this compromised account
        revoked_count = await session_service.revoke_all_user_sessions(db, user.id)
        total_sessions_revoked += revoked_count

        # 5. Record immutable security audit log event
        await audit_service.record_event(
            db,
            event_type=AuditEventType.PASSWORD_CHANGE,
            user_id=user.id,
            details="Remediated shared password; forced password rotation and revoked sessions",
        )

        remediated_accounts.append(normalized_email)

    if not dry_run:
        await db.commit()
        logger.info(
            "Remediation committed: %d accounts updated, %d active sessions revoked.",
            len(remediated_accounts),
            total_sessions_revoked,
        )
    else:
        logger.info(
            "Dry run completed: %d accounts flagged for remediation.",
            len(remediated_accounts),
        )

    return {
        "total_audited": total_audited,
        "total_remediated": len(remediated_accounts),
        "total_sessions_revoked": total_sessions_revoked,
        "affected_accounts": remediated_accounts,
    }


async def run_remediation(dry_run: bool = False) -> bool:
    """Execute credential remediation CLI wrapper."""
    db_url = str(settings.database_url)
    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with session_factory() as db:
            summary = await audit_and_remediate_credentials(db, dry_run=dry_run)
            logger.info("Summary: %s", summary)
            return True
    finally:
        await engine.dispose()


def main() -> None:
    """CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="Audit and safely remediate database accounts sharing insecure credentials."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate the audit and report affected accounts without applying changes.",
    )
    args = parser.parse_args()

    success = asyncio.run(run_remediation(dry_run=args.dry_run))
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
