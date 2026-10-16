"""Abstract email delivery provider boundary."""

from abc import ABC, abstractmethod


class BaseEmailProvider(ABC):
    """Interface for outbound email dispatchers."""

    @abstractmethod
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
    ) -> bool:
        """Deliver an email message. Returns True on success."""
        pass
