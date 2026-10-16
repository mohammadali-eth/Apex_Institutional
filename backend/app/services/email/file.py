"""File development email delivery sink."""

import logging
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import settings
from app.services.email.base import BaseEmailProvider

logger = logging.getLogger("qpms.email.file")


class FileEmailProvider(BaseEmailProvider):
    """Local development sink recording outbound emails into a dedicated log file."""

    def __init__(self, file_path: str | None = None) -> None:
        self.file_path = Path(file_path or settings.email_delivery_file_path)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
    ) -> bool:
        if settings.is_production:
            logger.error("FileEmailProvider invoked in production! Real provider required.")
            return False

        try:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            entry = (
                f"[{datetime.now(UTC).isoformat()}] TO: {to_email} | SUBJECT: {subject}\n"
                f"{body_text}\n"
                f"{'-' * 40}\n"
            )
            with open(self.file_path, "a", encoding="utf-8") as f:
                f.write(entry)
            return True
        except Exception as exc:
            logger.exception("Failed to write email to development file sink: %s", exc)
            return False
