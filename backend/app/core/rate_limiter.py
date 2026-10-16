"""Abuse defense and sliding-window rate limiting."""

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.core.config import settings


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter for development and single-process deployments."""

    def __init__(self) -> None:
        # Maps key -> list of timestamp floats
        self._requests: dict[str, list[float]] = defaultdict(list)

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        """Check if request count for key exceeds max_requests within window_seconds.

        Returns:
            (is_limited, retry_after_seconds)
        """
        now = time.time()
        cutoff = now - window_seconds
        timestamps = self._requests[key]

        # Prune expired timestamps
        valid_timestamps = [ts for ts in timestamps if ts > cutoff]
        self._requests[key] = valid_timestamps

        if len(valid_timestamps) >= max_requests:
            oldest = valid_timestamps[0]
            retry_after = max(1, int(oldest + window_seconds - now))
            return True, retry_after

        self._requests[key].append(now)
        return False, 0

    def reset(self) -> None:
        """Clear all recorded hits (used for tests)."""
        self._requests.clear()


rate_limiter = InMemoryRateLimiter()


def check_rate_limit(
    request: Request,
    action: str,
    max_requests: int,
    window_seconds: int,
    identifier: str | None = None,
) -> None:
    """Check rate limit for an action and raise 429 Too Many Requests if exceeded."""
    client_ip = request.client.host if request.client else "unknown"
    key = f"{action}:{client_ip}"
    if identifier:
        key += f":{identifier}"

    is_limited, retry_after = rate_limiter.is_rate_limited(
        key=key,
        max_requests=max_requests,
        window_seconds=window_seconds,
    )
    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests for {action}. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )


def check_login_rate_limit(request: Request) -> None:
    """Enforce rate limits on login attempts."""
    check_rate_limit(
        request=request,
        action="login",
        max_requests=settings.auth_rate_limit_login_attempts,
        window_seconds=settings.auth_rate_limit_login_window_seconds,
    )


def check_recovery_rate_limit(request: Request) -> None:
    """Enforce rate limits on password recovery requests."""
    check_rate_limit(
        request=request,
        action="recovery",
        max_requests=3,
        window_seconds=900,  # 3 attempts per 15 minutes
    )
