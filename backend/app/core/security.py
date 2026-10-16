"""Cryptographic and password security utilities using Argon2id."""

import contextlib
import hashlib
import secrets
from datetime import UTC, datetime
from typing import Final

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

# Common passwords list for NIST SP 800-63B compliance check
COMMONLY_COMPROMISED_PASSWORDS: Final[frozenset[str]] = frozenset(
    {
        "password12345",
        "password123456",
        "admin12345678",
        "qwerty123456",
        "123456789012",
        "1234567890123",
        "welcome123456",
        "letmein123456",
        "administrator123",
        "changeme123456",
        "iloveyou123456",
        "sunshine123456",
        "football123456",
        "monkey12345678",
        "dragon12345678",
        "master12345678",
    }
)

# NIST-aligned password boundaries
MIN_PASSWORD_LENGTH: Final[int] = 12
MAX_PASSWORD_LENGTH: Final[int] = 128


def get_password_hasher() -> PasswordHasher:
    """Instantiate Argon2id hasher using configured parameters."""
    return PasswordHasher(
        time_cost=settings.auth_argon2_time_cost,
        memory_cost=settings.auth_argon2_memory_cost,
        parallelism=settings.auth_argon2_parallelism,
        hash_len=32,
        salt_len=16,
    )


# Module-level hasher singleton
_hasher = get_password_hasher()

# Precomputed dummy hash for constant-time dummy verification on nonexistent users
_DUMMY_HASH: Final[str] = _hasher.hash("dummy_constant_time_reference_password_123456")


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return _hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against an Argon2id hash in constant time."""
    try:
        return _hasher.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def verify_dummy_password() -> None:
    """Execute constant-time dummy verify to mitigate timing attacks on nonexistent accounts."""
    with contextlib.suppress(Exception):
        _hasher.verify(_DUMMY_HASH, "incorrect_dummy_probe_password")


def validate_password_policy(password: str) -> str | None:
    """Validate password against NIST SP 800-63B guidance.

    Returns:
        Error message string if invalid, or None if valid.
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters long."
    if len(password) > MAX_PASSWORD_LENGTH:
        return f"Password must not exceed {MAX_PASSWORD_LENGTH} characters."
    if password.lower() in COMMONLY_COMPROMISED_PASSWORDS:
        return (
            "Password is too common or easily guessable. Please choose a more complex passphrase."
        )
    return None


def normalize_email(email: str) -> str:
    """Consistently trim and lowercase email address."""
    return email.strip().lower()


def generate_secure_token(nbytes: int = 32) -> str:
    """Generate a cryptographically secure random token string."""
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    """Compute the SHA-256 hexadecimal digest of a token for storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def ensure_utc(dt: datetime) -> datetime:
    """Ensure datetime has UTC tzinfo, attaching UTC if naive."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)
