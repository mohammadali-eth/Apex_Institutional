"""Centralized HTTP cookie configuration and lifecycle management."""

from fastapi import Request, Response

from app.core.config import settings


def set_session_cookie(response: Response, raw_token: str) -> None:
    """Set the authenticated session cookie with strict security flags."""
    max_age_seconds = settings.auth_session_absolute_timeout_hours * 3600
    cookie_name = settings.resolved_session_cookie_name

    response.set_cookie(
        key=cookie_name,
        value=raw_token,
        max_age=max_age_seconds,
        expires=max_age_seconds,
        path="/",
        httponly=True,
        secure=settings.resolved_cookie_secure,
        samesite=settings.auth_session_cookie_samesite,
    )


def clear_session_cookie(response: Response) -> None:
    """Clear session cookies across both production prefixed and standard names."""
    cookie_names = {settings.resolved_session_cookie_name, settings.auth_session_cookie_name}
    for name in cookie_names:
        response.delete_cookie(
            key=name,
            path="/",
            httponly=True,
            secure=settings.resolved_cookie_secure,
            samesite=settings.auth_session_cookie_samesite,
        )


def set_csrf_cookie(response: Response, csrf_token: str) -> None:
    """Set non-HttpOnly CSRF cookie readable by frontend JavaScript for double-submit."""
    response.set_cookie(
        key=settings.auth_csrf_cookie_name,
        value=csrf_token,
        max_age=settings.auth_session_absolute_timeout_hours * 3600,
        path="/",
        httponly=False,  # Frontend must read this to set X-CSRF-Token header
        secure=settings.resolved_cookie_secure,
        samesite=settings.auth_session_cookie_samesite,
    )


def get_session_token_from_request(request: Request) -> str | None:
    """Extract raw session token from cookies supporting standard and prefixed names."""
    # Check resolved name first (__Host- in prod)
    token = request.cookies.get(settings.resolved_session_cookie_name)
    if not token and settings.auth_session_cookie_name != settings.resolved_session_cookie_name:
        token = request.cookies.get(settings.auth_session_cookie_name)
    return token
