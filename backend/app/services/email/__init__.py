"""Email delivery package."""

from app.services.email.base import BaseEmailProvider
from app.services.email.console import ConsoleEmailProvider
from app.services.email.file import FileEmailProvider
from app.services.email.service import EmailService, email_service

__all__ = [
    "BaseEmailProvider",
    "ConsoleEmailProvider",
    "FileEmailProvider",
    "EmailService",
    "email_service",
]
