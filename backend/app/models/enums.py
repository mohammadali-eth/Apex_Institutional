"""Authentication and user identity enumeration types."""

import enum


class UserStatus(enum.StrEnum):
    """Lifecycle states for a user identity."""

    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    LOCKED = "locked"
    DISABLED = "disabled"


class RoleCode(enum.StrEnum):
    """Controlled role catalog identifiers."""

    SUPER_ADMIN = "SUPER_ADMIN"
    UNIVERSITY_ADMIN = "UNIVERSITY_ADMIN"
    INSTITUTION_ADMIN = "INSTITUTION_ADMIN"
    DEPARTMENT_ADMIN = "DEPARTMENT_ADMIN"
    FACULTY_QUESTION_SETTER = "FACULTY_QUESTION_SETTER"
    QUESTION_PAPER_REVIEWER = "QUESTION_PAPER_REVIEWER"
    EXAM_CONTROLLER = "EXAM_CONTROLLER"
    EXAM_COORDINATOR = "EXAM_COORDINATOR"
    QUESTION_BANK_MANAGER = "QUESTION_BANK_MANAGER"
    QUALITY_CONTROLLER = "QUALITY_CONTROLLER"
    STUDENT = "STUDENT"
    GENERAL_USER = "GENERAL_USER"


class OrganizationStatus(enum.StrEnum):
    """Lifecycle states for universities, institutions, and departments."""

    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class InvitationStatus(enum.StrEnum):
    """Staff account invitation and activation states."""

    INVITED = "INVITED"
    PENDING_ACTIVATION = "PENDING_ACTIVATION"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


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
    BOOTSTRAP_SUPER_ADMIN = "bootstrap_super_admin"
    UNIVERSITY_CREATED = "university_created"
    UNIVERSITY_UPDATED = "university_updated"
    INSTITUTION_CREATED = "institution_created"
    INSTITUTION_UPDATED = "institution_updated"
    DEPARTMENT_CREATED = "department_created"
    UNIVERSITY_ADMIN_PROVISIONED = "university_admin_provisioned"
    STAFF_INVITED = "staff_invited"
    STAFF_INVITATION_RESENT = "staff_invitation_resent"
    STAFF_INVITATION_REVOKED = "staff_invitation_revoked"
    STAFF_ACTIVATED = "staff_activated"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REVOKED = "role_revoked"
    ORGANIZATIONAL_SCOPE_UPDATED = "organizational_scope_updated"
    ADMIN_ACCESS_DENIED = "admin_access_denied"
    DOMAIN_MAPPING_CREATED = "domain_mapping_created"
    DOMAIN_MAPPING_UPDATED = "domain_mapping_updated"
    DOMAIN_MAPPING_DELETED = "domain_mapping_deleted"
    USER_REGISTERED = "user_registered"
