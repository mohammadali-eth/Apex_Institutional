"""Email delivery package."""

from app.services.email.base import BaseEmailProvider
from app.services.email.console import ConsoleEmailProvider
from app.services.email.disabled import DisabledEmailProvider
from app.services.email.file import FileEmailProvider
from app.services.email.service import EmailService, email_service
from app.services.email.smtp import SmtpEmailProvider

__all__ = [
    "BaseEmailProvider",
    "ConsoleEmailProvider",
    "DisabledEmailProvider",
    "FileEmailProvider",
    "SmtpEmailProvider",
    "EmailService",
    "email_service",
]
