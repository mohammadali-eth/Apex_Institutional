"""Console development email delivery provider."""

import logging

from app.core.config import settings
from app.services.email.base import BaseEmailProvider

logger = logging.getLogger("qpms.email.console")


class ConsoleEmailProvider(BaseEmailProvider):
    """Local development sink logging emails without exposing tokens in production."""

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
    ) -> bool:
        if settings.is_production:
            logger.error(
                "ConsoleEmailProvider invoked in production! Production email delivery provider is unconfigured."
            )
            return False

        logger.info(
            "\n========== [DEV EMAIL SINK] ==========\nTo: %s\nSubject: %s\nBody:\n%s\n======================================\n",
            to_email,
            subject,
            body_text,
        )
        return True
