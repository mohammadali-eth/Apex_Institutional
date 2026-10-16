"""Outbound email delivery service factory and dispatcher."""

import logging

from app.core.config import settings
from app.services.email.base import BaseEmailProvider
from app.services.email.console import ConsoleEmailProvider
from app.services.email.file import FileEmailProvider

logger = logging.getLogger("qpms.email.service")


class EmailService:
    """Dispatches verification and password recovery emails."""

    def __init__(self) -> None:
        self.provider: BaseEmailProvider
        if settings.email_delivery_provider == "file":
            self.provider = FileEmailProvider()
        elif settings.email_delivery_provider == "console":
            self.provider = ConsoleEmailProvider()
        else:
            self.provider = ConsoleEmailProvider()

    async def send_verification_email(self, to_email: str, raw_token: str) -> bool:
        """Send account email verification instructions."""
        subject = f"[{settings.app_name}] Verify your email address"
        body = (
            f"Hello,\n\n"
            f"Please verify your email address to complete your account setup on {settings.app_name}.\n\n"
            f"Verification Token: {raw_token}\n\n"
            f"This token will expire in {settings.auth_email_verification_token_expire_hours} hours.\n"
            f"If you did not request this, please disregard this email.\n"
        )
        return await self.provider.send_email(to_email, subject, body)

    async def send_password_reset_email(self, to_email: str, raw_token: str) -> bool:
        """Send password recovery instructions."""
        subject = f"[{settings.app_name}] Password Reset Request"
        body = (
            f"Hello,\n\n"
            f"We received a request to reset your password on {settings.app_name}.\n\n"
            f"Password Reset Token: {raw_token}\n\n"
            f"This token will expire in {settings.auth_password_reset_token_expire_minutes} minutes.\n"
            f"If you did not make this request, your account remains secure and no action is required.\n"
        )
        return await self.provider.send_email(to_email, subject, body)


email_service = EmailService()
