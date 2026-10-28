import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User, Role, Organization, Department
from app.schemas.auth import UserCreate, UserUpdate, UserResponse, RoleResponse, UserProvisionResponse
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, require_permission, get_user_permissions
from app.core.permissions import can_provision_role, HIERARCHICAL_CREATION_RULES
from app.core.security import get_password_hash
from app.services.audit_service import log_audit

router = APIRouter(prefix="/users", tags=["Users & Access Management"])

@router.get("", response_model=StandardResponse[List[UserResponse]])
def get_users(
    department_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.read"))
):
    query = db.query(User)
    if organization_id:
        query = query.filter(User.organization_id == organization_id)
    elif current_user.role_name != "SUPER_ADMIN" and current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)

    if department_id:
        query = query.filter(User.department_id == department_id)
    elif current_user.role_name in ["HOD", "DEPARTMENT_ADMIN"] and current_user.department_id:
        query = query.filter(User.department_id == current_user.department_id)

    users = query.order_by(User.full_name).all()
    results = []
    for u in users:
        results.append(UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role_name=u.role_name,
            organization_id=u.organization_id,
            department_id=u.department_id,
            organization_name=u.organization.name if u.organization else None,
            department_name=u.department.name if u.department else None,
            is_active=u.is_active,
            must_change_password=bool(u.must_change_password),
            permissions=get_user_permissions(u),
            created_at=u.created_at
        ))
    return StandardResponse(data=results)

@router.get("/creatable-roles", response_model=StandardResponse[List[str]])
def get_creatable_roles(current_user: User = Depends(get_current_user)):
    """Return the list of roles the authenticated user is authorized to provision"""
    allowed = HIERARCHICAL_CREATION_RULES.get(current_user.role_name.upper(), [])
    return StandardResponse(data=allowed)

@router.post("", response_model=StandardResponse[UserProvisionResponse])
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.create"))
):
    target_role = data.role_name.upper()

    # 1. Enforce Hierarchical Provisioning Authority
    if not can_provision_role(current_user.role_name, target_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Accounts with role '{current_user.role_name}' are not permitted to create users with role '{target_role}'"
        )

    # 2. Duplicate email check
    existing = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # 3. Scope validation (Organization & Department)
    final_org_id = current_user.organization_id
    final_dept_id = current_user.department_id

    if current_user.role_name == "SUPER_ADMIN":
        final_org_id = data.organization_id
        final_dept_id = data.department_id
    elif current_user.role_name in ["UNIVERSITY_ADMIN", "INSTITUTION_ADMIN"]:
        if data.organization_id and data.organization_id != current_user.organization_id:
            # Check if target org is a child institution of the current university
            child_org = db.query(Organization).filter(
                Organization.id == data.organization_id,
                Organization.parent_id == current_user.organization_id
            ).first()
            if not child_org:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot create users outside of your assigned university or its affiliated institutions"
                )
            final_org_id = data.organization_id
        else:
            final_org_id = current_user.organization_id
        final_dept_id = data.department_id
    elif current_user.role_name in ["HOD", "DEPARTMENT_ADMIN"]:
        # HOD can strictly provision within their own department and university
        final_org_id = current_user.organization_id
        final_dept_id = current_user.department_id
        if data.department_id and data.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Department Heads can only create user accounts within their own assigned department."
            )

    # Validate that department belongs to the organization if both are present
    if final_dept_id and final_org_id:
        dept = db.query(Department).filter(
            Department.id == final_dept_id,
            Department.organization_id == final_org_id
        ).first()
        if not dept:
            raise HTTPException(
                status_code=400,
                detail="Specified department does not belong to the selected organization/university"
            )

    # 4. Secure Credential Generation
    setup_token = None
    temporary_password = None
    must_change = bool(data.must_change_password)

    if data.password and data.password.strip():
        if len(data.password.strip()) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        hashed_pwd = get_password_hash(data.password.strip())
    else:
        # Generate random initial setup token and temporary password
        setup_token = secrets.token_urlsafe(32)
        temporary_password = f"QPMS@{secrets.token_hex(4)}!"
        hashed_pwd = get_password_hash(temporary_password)
        must_change = True

    u = User(
        email=data.email.lower().strip(),
        hashed_password=hashed_pwd,
        full_name=data.full_name.strip(),
        role_name=target_role,
        organization_id=final_org_id,
        department_id=final_dept_id,
        is_active=True,
        must_change_password=must_change,
        invitation_token=setup_token
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    # Audit log (no passwords or secret tokens logged)
    log_audit(
        db,
        action="USER_PROVISIONED",
        entity_type="User",
        user_id=current_user.id,
        entity_id=u.id,
        metadata={
            "creator_role": current_user.role_name,
            "target_role": u.role_name,
            "target_email": u.email,
            "organization_id": u.organization_id,
            "department_id": u.department_id,
            "has_temporary_password": bool(temporary_password)
        }
    )

    setup_url = f"/auth/setup?token={setup_token}" if setup_token else None

    return StandardResponse(
        data=UserProvisionResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role_name=u.role_name,
            organization_id=u.organization_id,
            department_id=u.department_id,
            organization_name=u.organization.name if u.organization else None,
            department_name=u.department.name if u.department else None,
            is_active=u.is_active,
            must_change_password=u.must_change_password,
            permissions=get_user_permissions(u),
            created_at=u.created_at,
            temporary_password=temporary_password,
            setup_token=setup_token,
            setup_url=setup_url
        ),
        message=f"Account for {u.full_name} ({u.role_name}) provisioned successfully"
    )

@router.get("/roles", response_model=StandardResponse[List[RoleResponse]])
def get_roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    roles = db.query(Role).all()
    res = [
        RoleResponse(
            id=r.id,
            name=r.name,
            display_name=r.display_name,
            description=r.description,
            permissions=[p.name for p in r.permissions]
        ) for r in roles
    ]
    return StandardResponse(data=res)

@router.put("/{user_id}", response_model=StandardResponse[UserResponse])
def update_user(
    user_id: str,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.update"))
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent lower roles from modifying users in other scopes
    if current_user.role_name != "SUPER_ADMIN":
        if u.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Cannot modify user from another organization")
        if current_user.role_name in ["HOD", "DEPARTMENT_ADMIN"] and u.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="HOD can only modify users in their own department")

    update_dict = data.dict(exclude_unset=True)
    if "role_name" in update_dict and update_dict["role_name"]:
        target_role = update_dict["role_name"].upper()
        if not can_provision_role(current_user.role_name, target_role):
            raise HTTPException(
                status_code=403,
                detail=f"Cannot assign role '{target_role}'. Exceeds your provisioning authority."
            )
        u.role_name = target_role

    if "full_name" in update_dict and update_dict["full_name"]:
        u.full_name = update_dict["full_name"].strip()
    if "is_active" in update_dict and update_dict["is_active"] is not None:
        u.is_active = update_dict["is_active"]

    if current_user.role_name == "SUPER_ADMIN":
        if "organization_id" in update_dict:
            u.organization_id = update_dict["organization_id"]
        if "department_id" in update_dict:
            u.department_id = update_dict["department_id"]

    db.commit()
    db.refresh(u)
    log_audit(db, action="USER_UPDATED", entity_type="User", user_id=current_user.id, entity_id=u.id)

    return StandardResponse(
        data=UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role_name=u.role_name,
            organization_id=u.organization_id,
            department_id=u.department_id,
            organization_name=u.organization.name if u.organization else None,
            department_name=u.department.name if u.department else None,
            is_active=u.is_active,
            must_change_password=bool(u.must_change_password),
            permissions=get_user_permissions(u),
            created_at=u.created_at
        ),
        message="User updated successfully"
    )
