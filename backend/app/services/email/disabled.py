"""Disabled no-op email delivery provider."""

import logging

from app.services.email.base import BaseEmailProvider

logger = logging.getLogger("qpms.email.disabled")


class DisabledEmailProvider(BaseEmailProvider):
    """Silent email provider that logs suppression without dispatching external network calls."""

    async def send_email(
        self,
        to_email: str,
        subject: str,
        _body_text: str,
    ) -> bool:
        logger.debug(
            "Outbound email suppressed (EMAIL_DELIVERY_PROVIDER=disabled) -> To: %s | Subject: %s",
            to_email,
            subject,
        )
        return True
