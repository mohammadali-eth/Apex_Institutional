from typing import Optional, List, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import decode_access_token
from app.core.permissions import RoleEnum, ROLE_PERMISSIONS, PermissionEnum
from app.models.models import User, Role, Organization

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_optional_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")
    
    # Enforce University suspension policy on every authenticated request
    if user.organization_id and user.role_name != RoleEnum.SUPER_ADMIN.value:
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()
        if org and not org.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: University '{org.name}' is currently suspended. Please contact platform administration."
            )
        if org and org.parent_id:
            parent_org = db.query(Organization).filter(Organization.id == org.parent_id).first()
            if parent_org and not parent_org.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Parent University '{parent_org.name}' is currently suspended."
                )

    return user

def get_optional_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_optional_scheme)
) -> Optional[User]:
    if not token:
        return None
    payload = decode_access_token(token)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id, User.is_active == True).first()

def get_user_permissions(user: User) -> List[str]:
    """Calculate merged effective permissions based on user's roles and database records"""
    perms = set()
    # 1. From user's primary role_name enum mapping
    try:
        r_enum = RoleEnum(user.role_name)
        if r_enum in ROLE_PERMISSIONS:
            for p in ROLE_PERMISSIONS[r_enum]:
                perms.add(p.value)
    except Exception:
        pass

    # 2. From user's linked database roles
    for role in user.roles:
        for perm in role.permissions:
            perms.add(perm.name)
            
    # Super admin has all permissions
    if user.role_name == RoleEnum.SUPER_ADMIN.value:
        for p in PermissionEnum:
            perms.add(p.value)
            
    return list(perms)

def require_permission(required_permission: str) -> Callable:
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_perms = get_user_permissions(current_user)
        if required_permission not in user_perms and current_user.role_name != RoleEnum.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required permission: '{required_permission}'"
            )
        return current_user
    return permission_checker

def require_roles(allowed_roles: List[str]) -> Callable:
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role_name == RoleEnum.SUPER_ADMIN.value:
            return current_user
        if current_user.role_name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: insufficient role privileges"
            )
        return current_user
    return role_checker

def check_organization_scope(user: User, organization_id: Optional[str], db: Optional[Session] = None) -> bool:
    """Enforces tenant isolation rule: A user can only access data within their organization or affiliated institutions"""
    if not organization_id:
        return True
    if user.role_name == RoleEnum.SUPER_ADMIN.value:
        return True
    if user.organization_id == organization_id:
        return True
    if db and user.role_name == RoleEnum.UNIVERSITY_ADMIN.value and user.organization_id:
        child = db.query(Organization).filter(
            Organization.id == organization_id,
            Organization.parent_id == user.organization_id
        ).first()
        if child:
            return True
    return False

def check_department_scope(user: User, department_id: Optional[str]) -> bool:
    """Enforces department isolation rule"""
    if not department_id:
        return True
    if user.role_name in [RoleEnum.SUPER_ADMIN.value, RoleEnum.UNIVERSITY_ADMIN.value]:
        return True
    return user.department_id == department_id
