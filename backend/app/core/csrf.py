"""Cross-Site Request Forgery (CSRF) defense foundation."""

import secrets
from urllib.parse import urlparse

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.cookies import get_session_token_from_request


def generate_csrf_token() -> str:
    """Generate a cryptographically secure random CSRF token."""
    return secrets.token_urlsafe(32)


def is_origin_allowed(origin_or_referer: str | None) -> bool:
    """Verify that an Origin or Referer header matches allowed frontend origins."""
    if not origin_or_referer:
        return False

    parsed = urlparse(origin_or_referer)
    normalized = f"{parsed.scheme}://{parsed.netloc}"
    return normalized in settings.cors_origins


def verify_csrf(request: Request) -> None:
    """Validate CSRF protection for state-changing requests.

    Enforces Origin/Referer verification and Double-Submit Cookie validation
    using constant-time string comparison.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    # Check origin/referer header
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    if origin and not is_origin_allowed(origin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF origin check rejected: untrusted origin.",
        )
    elif not origin and referer and not is_origin_allowed(referer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF referer check rejected: untrusted referer.",
        )

    # If the request contains an active session cookie, CSRF token is mandatory
    session_token = get_session_token_from_request(request)
    csrf_cookie = request.cookies.get(settings.auth_csrf_cookie_name)
    csrf_header = request.headers.get(settings.auth_csrf_header_name)

    # For authenticated sessions or requests submitting CSRF tokens:
    if session_token or csrf_cookie or csrf_header:
        if not csrf_cookie or not csrf_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF verification failed: Missing CSRF cookie or X-CSRF-Token header.",
            )

        if not secrets.compare_digest(csrf_header, csrf_cookie):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF verification failed: Token mismatch.",
            )
