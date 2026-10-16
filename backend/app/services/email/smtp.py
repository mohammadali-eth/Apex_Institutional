"""SMTP email delivery provider using standard library smtplib."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings
from app.services.email.base import BaseEmailProvider

logger = logging.getLogger("qpms.email.smtp")


class SmtpEmailProvider(BaseEmailProvider):
    """Outbound email provider using standard SMTP/ESMTP protocol."""

    def __init__(self) -> None:
        self.host = settings.smtp_host or "localhost"
        self.port = settings.smtp_port
        self.username = settings.smtp_username
        self.password = settings.smtp_password
        self.use_tls = settings.smtp_use_tls
        self.from_address = settings.email_from_address
        self.from_name = settings.email_from_name

    def _send_sync(self, to_email: str, subject: str, body_text: str) -> bool:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{self.from_name} <{self.from_address}>"
        msg["To"] = to_email
        msg.set_content(body_text)

        try:
            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.send_message(msg)
            logger.info("Successfully sent email via SMTP to: %s (Subject: %s)", to_email, subject)
            return True
        except Exception as exc:
            logger.error("Failed to deliver email via SMTP to %s: %s", to_email, exc)
            return False

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
    ) -> bool:
        return await asyncio.to_thread(self._send_sync, to_email, subject, body_text)
