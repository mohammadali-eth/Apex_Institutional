"""FastAPI dependencies for authentication, sessions, and request validation."""

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cookies import get_session_token_from_request
from app.core.csrf import verify_csrf
from app.db.session import get_db_session
from app.models.enums import UserStatus
from app.models.session import UserSession
from app.models.user import User
from app.services.session_service import session_service


def get_current_session_token(request: Request) -> str:
    """Extract session token from request cookies or raise 401."""
    token = get_session_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. No active session cookie found.",
        )
    return token


async def get_current_user_and_session(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> tuple[User, UserSession]:
    """Resolve and validate active user and session from request cookies."""
    token = get_current_session_token(request)
    result = await session_service.validate_session(db, token)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or been revoked. Please authenticate again.",
        )
    user_session, user = result
    return user, user_session


async def get_current_user(
    auth_context: tuple[User, UserSession] = Depends(get_current_user_and_session),
) -> User:
    """Dependency returning authenticated User."""
    user, _ = auth_context
    return user


async def get_current_active_user(
    user: User = Depends(get_current_user),
) -> User:
    """Dependency verifying that authenticated user identity is active."""
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active.",
        )
    return user


def require_csrf(request: Request) -> None:
    """Dependency enforcing CSRF protection on state-changing requests."""
    verify_csrf(request)
