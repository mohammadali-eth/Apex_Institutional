"""Models package exporting all authentication and identity entities."""

from app.models.audit import AuthenticationAuditEvent
from app.models.enums import (
    AuditEventType,
    InvitationStatus,
    OrganizationStatus,
    RoleCode,
    UserStatus,
)
from app.models.domain_mapping import DomainRoleMapping
from app.models.organization import Department, Institution, University
from app.models.role import Role, StaffInvitation, UserRoleAssignment
from app.models.session import UserSession
from app.models.token import EmailVerificationToken, PasswordResetToken
from app.models.user import User

__all__ = [
    "User",
    "UserSession",
    "EmailVerificationToken",
    "PasswordResetToken",
    "AuthenticationAuditEvent",
    "University",
    "Institution",
    "Department",
    "Role",
    "UserRoleAssignment",
    "StaffInvitation",
    "DomainRoleMapping",
    "UserStatus",
    "RoleCode",
    "OrganizationStatus",
    "InvitationStatus",
    "AuditEventType",
]
