import uuid

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


async def require_super_admin(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    """Dependency enforcing that caller has an active platform-level Super Admin role."""
    from app.services.role_service import role_service

    is_super = await role_service.is_super_admin(db, user.id)
    if not is_super:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Super Administrator privileges required.",
        )
    return user


async def require_university_admin(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> tuple[User, uuid.UUID | None]:
    """Dependency enforcing caller is a University Admin or Super Admin.

    Returns:
        (user, authorized_university_id) - Note: university_id is None for platform Super Admins.
    """
    from app.services.role_service import role_service

    is_super = await role_service.is_super_admin(db, user.id)
    if is_super:
        return user, None

    authorized_univ = await role_service.get_authorized_university_id(db, user.id)
    if not authorized_univ:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. University Administrator privileges required.",
        )
    return user, authorized_univ


async def check_user_department_access(
    db: AsyncSession,
    user: User,
    department_id: uuid.UUID,
) -> bool:
    """Validate whether user has authorization for a specific department."""
    from sqlalchemy import select
    from app.models.organization import Department, Institution
    from app.services.role_service import role_service

    # 1. Super Admin has access across all departments
    if await role_service.is_super_admin(db, user.id):
        return True

    # 2. Check if user holds active assignment for this specific department
    user_assignments = await role_service.get_user_role_assignments(db, user.id, active_only=True)
    if any(a.department_id == department_id for a in user_assignments):
        return True

    # 3. University Admin has access to all departments in their assigned university
    univ_id = await role_service.get_authorized_university_id(db, user.id)
    if univ_id:
        dept_univ_stmt = (
            select(Institution.university_id)
            .join(Department, Department.institution_id == Institution.id)
            .where(Department.id == department_id)
        )
        dept_univ_id = (await db.execute(dept_univ_stmt)).scalar_one_or_none()
        if dept_univ_id == univ_id:
            return True

    return False
