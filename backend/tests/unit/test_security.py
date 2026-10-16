"""Unit tests for Argon2id hashing, NIST password policy, and token security."""

from app.core.security import (
    generate_secure_token,
    hash_password,
    hash_token,
    normalize_email,
    validate_password_policy,
    verify_dummy_password,
    verify_password,
)


def test_argon2id_hash_and_verify_success() -> None:
    raw = "CorrectHorseBatteryStaple#2026"
    hashed = hash_password(raw)
    assert hashed.startswith("$argon2id$")
    assert verify_password(raw, hashed) is True


def test_argon2id_verify_failure() -> None:
    raw = "CorrectHorseBatteryStaple#2026"
    hashed = hash_password(raw)
    assert verify_password("WrongPassword123", hashed) is False


def test_verify_dummy_password_does_not_raise() -> None:
    # Must complete safely without raising an exception
    verify_dummy_password()


def test_password_policy_minimum_length() -> None:
    err = validate_password_policy("short")
    assert err is not None
    assert "at least 12 characters" in err


def test_password_policy_maximum_length() -> None:
    err = validate_password_policy("a" * 129)
    assert err is not None
    assert "must not exceed 128 characters" in err


def test_password_policy_rejects_common_passwords() -> None:
    err = validate_password_policy("password12345")
    assert err is not None
    assert "too common" in err


def test_password_policy_accepts_secure_passphrase() -> None:
    err = validate_password_policy("correct-horse-battery-staple-2026")
    assert err is None


def test_email_normalization() -> None:
    assert normalize_email("  User.Test@Maktabah.EDU  ") == "user.test@maktabah.edu"


def test_token_generation_and_hashing() -> None:
    token1 = generate_secure_token(32)
    token2 = generate_secure_token(32)
    assert token1 != token2
    assert len(token1) >= 40

    digest1 = hash_token(token1)
    digest2 = hash_token(token2)
    assert len(digest1) == 64  # SHA-256 hex string length
    assert digest1 != digest2
    assert digest1 == hash_token(token1)  # Deterministic
