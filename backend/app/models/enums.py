"""Authentication and user identity enumeration types."""

import enum


class UserStatus(enum.StrEnum):
    """Lifecycle states for a user identity."""

    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    LOCKED = "locked"
    DISABLED = "disabled"


class AuditEventType(enum.StrEnum):
    """Security audit event classifications."""

    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    LOGOUT_ALL = "logout_all"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUESTED = "password_reset_requested"
    PASSWORD_RESET_COMPLETED = "password_reset_completed"
    EMAIL_VERIFICATION_SENT = "email_verification_sent"
    EMAIL_VERIFICATION_COMPLETED = "email_verification_completed"
    SESSION_REVOKED = "session_revoked"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_DISABLED = "account_disabled"
