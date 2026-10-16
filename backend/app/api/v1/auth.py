"""Authentication and identity endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_user,
    get_current_user_and_session,
    require_csrf,
)
from app.core.cookies import (
    clear_session_cookie,
    get_session_token_from_request,
    set_csrf_cookie,
    set_session_cookie,
)
from app.core.csrf import generate_csrf_token
from app.core.rate_limiter import check_login_rate_limit, check_recovery_rate_limit
from app.db.session import get_db_session
from app.models.enums import AuditEventType
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    CsrfTokenResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.schemas.role import AcceptInvitationRequest, VerifyInvitationResponse
from app.services.audit_service import audit_service
from app.services.auth_service import auth_service
from app.services.role_service import role_service
from app.services.session_service import session_service

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])


@auth_router.get("/csrf", response_model=CsrfTokenResponse, summary="Obtain CSRF Token")
async def get_csrf_token(response: Response) -> CsrfTokenResponse:
    """Issue a fresh CSRF token and set the matching client cookie."""
    token = generate_csrf_token()
    set_csrf_cookie(response, token)
    return CsrfTokenResponse(csrf_token=token)


@auth_router.post("/login", response_model=UserResponse, summary="User Login")
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> UserResponse:
    """Authenticate credentials, establish opaque database session, and issue HttpOnly cookie."""
    check_login_rate_limit(request)

    user, error = await auth_service.authenticate_user(
        db=db,
        email=payload.email,
        password=payload.password,
        request=request,
    )
    if not user or error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error or "Invalid email or password.",
        )

    # Invalidate existing session on same connection if present (anti-fixation)
    existing_token = get_session_token_from_request(request)
    if existing_token:
        await session_service.revoke_session(db, existing_token)

    # Create new session
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    _, raw_token = await session_service.create_session(
        db=db,
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    # Set secure HttpOnly session cookie
    set_session_cookie(response, raw_token)

    # Set fresh CSRF cookie
    csrf_token = generate_csrf_token()
    set_csrf_cookie(response, csrf_token)

    assignments = await role_service.get_user_role_assignments(db, user.id, active_only=True)
    portal_route, primary_role = role_service.resolve_portal_routing(assignments)
    serialized_roles = role_service.serialize_role_assignments(assignments)

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        status=user.status,
        email_verified_at=user.email_verified_at,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        roles=serialized_roles,
        active_role=primary_role,
        portal_route=portal_route,
        must_change_password=user.password_changed_at is None,
    )


@auth_router.post(
    "/logout",
    response_model=MessageResponse,
    dependencies=[Depends(require_csrf)],
    summary="User Logout",
)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Revoke active session and delete session cookie."""
    raw_token = get_session_token_from_request(request)
    if raw_token:
        validation = await session_service.validate_session(db, raw_token)
        user_id = validation[1].id if validation else None
        await session_service.revoke_session(db, raw_token)
        await audit_service.record_event(
            db,
            event_type=AuditEventType.LOGOUT,
            user_id=user_id,
            request=request,
        )

    clear_session_cookie(response)
    return MessageResponse(message="Successfully logged out.")


@auth_router.post(
    "/logout-all",
    response_model=MessageResponse,
    dependencies=[Depends(require_csrf)],
    summary="Logout From All Devices",
)
async def logout_all(
    request: Request,
    response: Response,
    auth_context: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Revoke all sessions belonging to the current user."""
    user, _ = auth_context
    count = await session_service.revoke_all_user_sessions(db, user.id)
    await audit_service.record_event(
        db,
        event_type=AuditEventType.LOGOUT_ALL,
        user_id=user.id,
        request=request,
        details=f"Revoked {count} sessions",
    )
    clear_session_cookie(response)
    return MessageResponse(message="Successfully logged out of all active sessions.")


@auth_router.get("/me", response_model=UserResponse, summary="Current User Identity")
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> UserResponse:
    """Retrieve safe identity fields and resolved role context of the authenticated session."""
    assignments = await role_service.get_user_role_assignments(db, user.id, active_only=True)
    portal_route, primary_role = role_service.resolve_portal_routing(assignments)
    serialized_roles = role_service.serialize_role_assignments(assignments)

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        status=user.status,
        email_verified_at=user.email_verified_at,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        roles=serialized_roles,
        active_role=primary_role,
        portal_route=portal_route,
        must_change_password=user.password_changed_at is None,
    )


@auth_router.get(
    "/invitation/verify",
    response_model=VerifyInvitationResponse,
    summary="Verify Staff Invitation Token",
)
async def verify_invitation(
    token: str,
    db: AsyncSession = Depends(get_db_session),
) -> VerifyInvitationResponse:
    """Validate invitation token and return organization details for activation."""
    inv, error = await role_service.verify_invitation_token(db, token)
    if not inv or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Invalid or expired invitation token.",
        )
    return VerifyInvitationResponse(
        valid=True,
        email=inv.email,
        role_code=inv.role.code,
        role_name=inv.role.name,
        university_name=inv.university.name,
        expires_at=inv.expires_at,
    )


@auth_router.post(
    "/invitation/accept",
    response_model=MessageResponse,
    summary="Accept Invitation and Activate Account",
)
async def accept_invitation(
    payload: AcceptInvitationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Consume invitation token, establish password, and activate account."""
    user, error = await role_service.accept_staff_invitation(
        db=db,
        raw_token=payload.token,
        password=payload.password,
        full_name=payload.full_name,
        request=request,
    )
    if not user or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to activate invitation.",
        )
    return MessageResponse(message="Account successfully activated. You may now sign in.")


@auth_router.post(
    "/change-password",
    response_model=MessageResponse,
    dependencies=[Depends(require_csrf)],
    summary="Change Password",
)
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    response: Response,
    auth_context: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Update password, revoke existing sessions, and rotate current session."""
    user, _ = auth_context

    success, error = await auth_service.change_password(
        db=db,
        user=user,
        current_password=payload.current_password,
        new_password=payload.new_password,
        request=request,
    )
    if not success or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Password update failed.",
        )

    # Issue a new session for the current client so user stays authenticated
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    _, new_raw_token = await session_service.create_session(
        db=db,
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    set_session_cookie(response, new_raw_token)

    return MessageResponse(message="Password successfully updated.")


@auth_router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request Password Reset",
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Request password recovery instructions with account enumeration resistance."""
    check_recovery_rate_limit(request)
    await auth_service.request_password_reset(db, payload.email, request=request)
    return MessageResponse(
        message="If the email is registered, password recovery instructions have been sent."
    )


@auth_router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset Password with Recovery Token",
)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Consume single-use password recovery token and set new password."""
    check_recovery_rate_limit(request)
    success, error = await auth_service.reset_password_with_token(
        db=db,
        raw_token=payload.token,
        new_password=payload.new_password,
        request=request,
    )
    if not success or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Password reset failed.",
        )
    return MessageResponse(message="Password has been successfully reset. Please log in.")


@auth_router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Verify Email Address",
)
async def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Consume single-use verification token to verify account email."""
    success, error = await auth_service.verify_email_with_token(
        db=db,
        raw_token=payload.token,
        request=request,
    )
    if not success or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Email verification failed.",
        )
    return MessageResponse(message="Email address successfully verified.")


@auth_router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Resend Verification Email",
)
async def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Resend email verification instructions with enumeration resistance."""
    check_recovery_rate_limit(request)
    await auth_service.request_email_verification(db, payload.email, request=request)
    return MessageResponse(
        message="If the account exists and requires verification, a new link has been sent."
    )
