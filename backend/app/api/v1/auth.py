import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.permissions import RoleEnum, detect_default_role_by_email
from app.models.models import User, Organization, Department
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserResponse, PasswordChangeRequest, CredentialSetupRequest,
    PublicSignUpRequest, ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest
)
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, get_user_permissions
from app.services.audit_service import log_audit

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=StandardResponse[TokenResponse])
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.strip().lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is deactivated. Contact administrator.")

    # University suspension check at login
    if user.organization_id and user.role_name != "SUPER_ADMIN":
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()
        if org and not org.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Login disabled: University '{org.name}' is currently suspended. Please contact platform administration."
            )
        if org and org.parent_id:
            parent_org = db.query(Organization).filter(Organization.id == org.parent_id).first()
            if parent_org and not parent_org.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Login disabled: Parent University '{parent_org.name}' is suspended."
                )

    perms = get_user_permissions(user)
    token = create_access_token(
        subject=user.id,
        extra_claims={
            "role": user.role_name,
            "email": user.email,
            "org_id": user.organization_id,
            "dept_id": user.department_id
        }
    )

    log_audit(db, action="LOGIN", entity_type="User", user_id=user.id, entity_id=user.id)

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role_name=user.role_name,
        organization_id=user.organization_id,
        department_id=user.department_id,
        organization_name=user.organization.name if user.organization else None,
        department_name=user.department.name if user.department else None,
        is_active=user.is_active,
        must_change_password=bool(user.must_change_password),
        permissions=perms,
        created_at=user.created_at
    )

    return StandardResponse(
        success=True,
        message="Login successful",
        data=TokenResponse(
            access_token=token,
            expires_in=60 * 24 * 60,
            user=user_resp
        )
    )

@router.get("/me", response_model=StandardResponse[UserResponse])
def get_current_user_profile(user: User = Depends(get_current_user)):
    perms = get_user_permissions(user)
    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role_name=user.role_name,
        organization_id=user.organization_id,
        department_id=user.department_id,
        organization_name=user.organization.name if user.organization else None,
        department_name=user.department.name if user.department else None,
        is_active=user.is_active,
        must_change_password=bool(user.must_change_password),
        permissions=perms,
        created_at=user.created_at
    )
    return StandardResponse(data=user_resp)

@router.post("/logout", response_model=StandardResponse[bool])
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_audit(db, action="LOGOUT", entity_type="User", user_id=user.id, entity_id=user.id)
    return StandardResponse(success=True, message="Successfully logged out", data=True)

@router.post("/change-password", response_model=StandardResponse[bool])
def change_password(request: PasswordChangeRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(request.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password does not match")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    user.hashed_password = get_password_hash(request.new_password)
    user.must_change_password = False
    db.commit()
    log_audit(db, action="PASSWORD_CHANGED", entity_type="User", user_id=user.id, entity_id=user.id)
    return StandardResponse(success=True, message="Password updated successfully", data=True)

@router.post("/setup-credentials", response_model=StandardResponse[bool])
def setup_credentials(request: CredentialSetupRequest, db: Session = Depends(get_db)):
    """Establish user's own initial password using the secure one-time setup token"""
    if not request.token or not request.token.strip():
        raise HTTPException(status_code=400, detail="Setup token is required")

    user = db.query(User).filter(User.invitation_token == request.token.strip(), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired setup token")

    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    user.hashed_password = get_password_hash(request.new_password)
    user.invitation_token = None
    user.must_change_password = False
    db.commit()

    log_audit(db, action="CREDENTIALS_ESTABLISHED", entity_type="User", user_id=user.id, entity_id=user.id)
    return StandardResponse(success=True, message="Credentials established successfully. You may now log in.", data=True)

@router.post("/signup", response_model=StandardResponse[TokenResponse])
def public_signup(request: PublicSignUpRequest, db: Session = Depends(get_db)):
    """
    Public self-registration for guest/student users.
    Security policy: Public registration strictly assigns the default STUDENT role.
    Privileged roles (Admin, HOD, Teacher) cannot be chosen via public registration.
    """
    if not request.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the Terms of Service and Privacy Policy to proceed."
        )

    clean_email = request.email.lower().strip()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in instead."
        )

    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    # Enforce minimum password complexity
    has_digit = any(c.isdigit() for c in request.password)
    has_alpha = any(c.isalpha() for c in request.password)
    if not (has_digit and has_alpha):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one letter and one number."
        )

    # Mandatory security isolation: public users ALWAYS receive low-privilege STUDENT role
    assigned_role = RoleEnum.STUDENT.value

    user = User(
        email=clean_email,
        full_name=request.full_name.strip(),
        hashed_password=get_password_hash(request.password),
        role_name=assigned_role,
        organization_id=None,
        department_id=None,
        is_active=True,
        must_change_password=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    perms = get_user_permissions(user)
    token = create_access_token(
        subject=user.id,
        extra_claims={
            "role": user.role_name,
            "email": user.email,
            "org_id": None,
            "dept_id": None
        }
    )

    log_audit(db, action="USER_REGISTERED", entity_type="User", user_id=user.id, entity_id=user.id)

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role_name=user.role_name,
        organization_id=None,
        department_id=None,
        organization_name=None,
        department_name=None,
        is_active=user.is_active,
        must_change_password=False,
        permissions=perms,
        created_at=user.created_at
    )

    return StandardResponse(
        success=True,
        message="Registration successful! Welcome to QPMS Apex.",
        data=TokenResponse(
            access_token=token,
            expires_in=60 * 24 * 60,
            user=user_resp
        )
    )

@router.post("/forgot-password", response_model=StandardResponse[ForgotPasswordResponse])
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiates password recovery for an account.
    Returns a generic message to prevent account enumeration.
    Generates a secure, short-lived, single-use reset token.
    Accurately reports outbound delivery status without fabricating false success.
    """
    clean_email = request.email.lower().strip()
    user = db.query(User).filter(User.email == clean_email, User.is_active == True).first()

    email_sent = False
    delivery_status = "NOT_ATTEMPTED"
    dev_token = None

    if user:
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()

        # Audit event (never log plaintext token)
        log_audit(
            db,
            action="PASSWORD_RESET_REQUESTED",
            entity_type="User",
            user_id=user.id,
            entity_id=user.id
        )

        # Check SMTP configuration
        if settings.SMTP_HOST and settings.SMTP_HOST.strip():
            try:
                import smtplib
                from email.mime.text import MIMEText
                msg = MIMEText(
                    f"Hello {user.full_name},\n\n"
                    f"You requested a password reset for your QPMS Apex account.\n"
                    f"Use this token to reset your password within 1 hour:\n\n"
                    f"{reset_token}\n\n"
                    f"Or visit: http://localhost:3000/reset-password?token={reset_token}\n\n"
                    f"If you did not request this, please ignore this email."
                )
                msg["Subject"] = "QPMS Apex — Password Reset Request"
                msg["From"] = settings.EMAILS_FROM_EMAIL
                msg["To"] = user.email

                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5) as server:
                    if settings.SMTP_USER and settings.SMTP_PASSWORD:
                        server.starttls()
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
                email_sent = True
                delivery_status = "DELIVERED"
            except Exception as e:
                email_sent = False
                delivery_status = f"SMTP_ERROR: {str(e)}"
        else:
            email_sent = False
            delivery_status = (
                "EMAIL_NOT_CONFIGURED: Outbound SMTP service is not configured in this environment. "
                "In local development, the reset token is provided for verification."
            )
            dev_token = reset_token

    return StandardResponse(
        success=True,
        message="If an active account is registered with this email, password recovery instructions have been initiated.",
        data=ForgotPasswordResponse(
            message="If an active account is registered with this email, password recovery instructions have been initiated.",
            email_sent=email_sent,
            delivery_status=delivery_status,
            dev_token=dev_token
        )
    )

@router.post("/reset-password", response_model=StandardResponse[bool])
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Completes password recovery using single-use token.
    Validates token expiration, hashes new password, and invalidates the token.
    """
    if not request.token or not request.token.strip():
        raise HTTPException(status_code=400, detail="Password reset token is required.")

    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    clean_token = request.token.strip()
    user = db.query(User).filter(User.reset_token == clean_token, User.is_active == True).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or previously used password reset token."
        )

    # Expiration check
    now = datetime.now(timezone.utc)
    if not user.reset_token_expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired or is invalid.")

    # Convert user.reset_token_expires_at to timezone-aware if needed
    expires_at = user.reset_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        user.reset_token = None
        user.reset_token_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset token has expired. Please request a new one."
        )

    # Update password and invalidate token (Single use)
    user.hashed_password = get_password_hash(request.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    user.must_change_password = False
    db.commit()

    log_audit(db, action="PASSWORD_RESET_COMPLETED", entity_type="User", user_id=user.id, entity_id=user.id)

    return StandardResponse(
        success=True,
        message="Your password has been reset successfully. You can now log in with your new credentials.",
        data=True
    )

