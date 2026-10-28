import re
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.models.models import (
    Organization, UniversityTheme, User, Department, Program, Subject, Question, QuestionPaper, AuditLog,
    Role, UserScope
)
from app.schemas.academic import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    UniversityThemeUpdate, UniversityThemeResponse,
    UniversityWithAdminCreate, UniversityDetailResponse, UniversityAdminSummary, UniversityStatusAction,
    UniversityAdminProvisionRequest
)
from app.schemas.auth import UserProvisionResponse, UserResponse
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, require_permission, get_user_permissions
from app.core.security import get_password_hash
from app.services.audit_service import log_audit

router = APIRouter(prefix="/universities", tags=["Universities"])

HEX_COLOR_REGEX = re.compile(r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")

DEFAULT_THEME = {
    "primary_color": "#82c341",
    "secondary_color": "#45525b",
    "background_color": "#f3f3f3",
    "font_color": "#838383",
    "title_color": "#44535b",
    "paragraph_color": "#676767",
    "bg_text_color": "#dcdcdc",
    "bg_title_color": "#f6f6f7",
    "sidebar_style": "default",
    "is_dark_mode_supported": False
}

def validate_theme_colors(theme_data: dict):
    for field, val in theme_data.items():
        if field.endswith("_color") and val:
            if not HEX_COLOR_REGEX.match(val):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid color format for '{field}': '{val}'. Must be a valid hex color code (e.g. #82c341)."
                )

@router.get("", response_model=StandardResponse[List[OrganizationResponse]])
def get_universities(
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Organization).filter(Organization.type == "UNIVERSITY")
    
    # Non-superadmin scope restriction
    if current_user.role_name not in ["SUPER_ADMIN"]:
        if current_user.organization_id:
            user_org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
            if user_org:
                target_univ_id = user_org.id if user_org.type == "UNIVERSITY" else user_org.parent_id
                query = query.filter(Organization.id == target_univ_id)
        else:
            return StandardResponse(data=[])

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(Organization.name.ilike(s), Organization.code.ilike(s)))

    if status_filter:
        if status_filter.lower() == "active":
            query = query.filter(Organization.is_active == True)
        elif status_filter.lower() in ["suspended", "inactive"]:
            query = query.filter(Organization.is_active == False)

    univs = query.order_by(Organization.name).all()
    results = []
    for u in univs:
        results.append(
            OrganizationResponse(
                id=u.id,
                name=u.name,
                code=u.code,
                type=u.type,
                parent_id=u.parent_id,
                address=u.address,
                website=u.website,
                logo_url=u.logo_url,
                is_active=u.is_active,
                created_at=u.created_at,
                departments_count=len(u.departments),
                institutions_count=len(u.institutions),
                theme=UniversityThemeResponse.model_validate(u.theme) if u.theme else None
            )
        )
    return StandardResponse(data=results)

@router.post("", response_model=StandardResponse[OrganizationResponse])
def create_university(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("university.create"))
):
    clean_code = data.code.strip().upper()
    existing = db.query(Organization).filter(Organization.code == clean_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"University with code '{clean_code}' already exists")

    univ_dict = data.dict()
    univ_dict["code"] = clean_code
    univ_dict["type"] = "UNIVERSITY"
    univ = Organization(**univ_dict)
    db.add(univ)
    db.flush()

    # Automatically initialize default theme record for new university
    theme = UniversityTheme(
        university_id=univ.id,
        logo_url=univ.logo_url,
        **DEFAULT_THEME
    )
    db.add(theme)
    db.commit()
    db.refresh(univ)

    log_audit(db, action="UNIVERSITY_CREATED", entity_type="University", user_id=current_user.id, entity_id=univ.id)
    return StandardResponse(
        data=OrganizationResponse(
            id=univ.id,
            name=univ.name,
            code=univ.code,
            type=univ.type,
            parent_id=univ.parent_id,
            address=univ.address,
            website=univ.website,
            logo_url=univ.logo_url,
            is_active=univ.is_active,
            created_at=univ.created_at,
            departments_count=0,
            institutions_count=0,
            theme=UniversityThemeResponse.model_validate(theme)
        ),
        message="University created successfully"
    )

@router.post("/with-admin", response_model=StandardResponse[dict])
def create_university_with_admin(
    data: UniversityWithAdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("university.create"))
):
    """Transactional creation of a University along with its initial University Admin account"""
    clean_code = data.code.strip().upper()
    admin_email = data.admin_email.strip().lower()

    if db.query(Organization).filter(Organization.code == clean_code).first():
        raise HTTPException(status_code=400, detail=f"University code '{clean_code}' already exists")

    if db.query(User).filter(User.email == admin_email).first():
        raise HTTPException(status_code=400, detail=f"User with email '{admin_email}' already exists")

    try:
        # 1. Create University
        univ_address = data.address
        if not univ_address and (data.state or data.country):
            parts = [p for p in [data.state, data.country] if p]
            univ_address = ", ".join(parts)

        univ = Organization(
            name=data.name.strip(),
            code=clean_code,
            type="UNIVERSITY",
            address=univ_address,
            website=data.website,
            logo_url=data.logo_url,
            is_active=True
        )
        db.add(univ)
        db.flush()

        # 2. Create Theme
        theme = UniversityTheme(
            university_id=univ.id,
            logo_url=univ.logo_url,
            **DEFAULT_THEME
        )
        db.add(theme)
        db.flush()

        # 3. Provision initial University Admin
        setup_token = None
        temp_pwd = None
        must_change = True

        if data.admin_password and data.admin_password.strip():
            if len(data.admin_password.strip()) < 6:
                raise HTTPException(status_code=400, detail="Admin password must be at least 6 characters")
            hashed_pwd = get_password_hash(data.admin_password.strip())
        else:
            setup_token = secrets.token_urlsafe(32)
            temp_pwd = f"QPMS@{secrets.token_hex(4)}!"
            hashed_pwd = get_password_hash(temp_pwd)

        admin_user = User(
            email=admin_email,
            hashed_password=hashed_pwd,
            full_name=data.admin_full_name.strip(),
            role_name="UNIVERSITY_ADMIN",
            organization_id=univ.id,
            is_active=True,
            must_change_password=must_change,
            invitation_token=setup_token
        )
        db_role = db.query(Role).filter(Role.name == "UNIVERSITY_ADMIN").first()
        if db_role:
            admin_user.roles.append(db_role)
        db.add(admin_user)
        db.flush()

        user_scope = UserScope(
            user_id=admin_user.id,
            scope_type="UNIVERSITY",
            scope_entity_id=univ.id
        )
        db.add(user_scope)
        db.commit()
        db.refresh(univ)
        db.refresh(admin_user)

        log_audit(db, action="UNIVERSITY_CREATED", entity_type="University", user_id=current_user.id, entity_id=univ.id)
        log_audit(db, action="USER_PROVISIONED", entity_type="User", user_id=current_user.id, entity_id=admin_user.id,
                  metadata={"role": "UNIVERSITY_ADMIN", "organization_id": univ.id})

        return StandardResponse(
            data={
                "id": univ.id,
                "name": univ.name,
                "code": univ.code,
                "is_active": univ.is_active,
                "university": OrganizationResponse(
                    id=univ.id,
                    name=univ.name,
                    code=univ.code,
                    type=univ.type,
                    address=univ.address,
                    website=univ.website,
                    logo_url=univ.logo_url,
                    is_active=univ.is_active,
                    created_at=univ.created_at,
                    theme=UniversityThemeResponse.model_validate(theme)
                ).model_dump(),
                "admin": {
                    "id": admin_user.id,
                    "email": admin_user.email,
                    "full_name": admin_user.full_name,
                    "role_name": admin_user.role_name,
                    "temporary_password": temp_pwd,
                    "setup_token": setup_token,
                    "setup_url": f"/auth/setup?token={setup_token}" if setup_token else None
                }
            },
            message=f"University '{univ.name}' and initial University Admin provisioned successfully"
        )
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to create university and admin: {str(e)}")

@router.get("/{univ_id}", response_model=StandardResponse[OrganizationResponse])
def get_university(
    univ_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    univ = db.query(Organization).filter(Organization.id == univ_id, Organization.type == "UNIVERSITY").first()
    if not univ:
        raise HTTPException(status_code=404, detail="University not found")

    if current_user.role_name != "SUPER_ADMIN":
        user_univ_id = current_user.organization_id
        if current_user.organization and current_user.organization.parent_id:
            user_univ_id = current_user.organization.parent_id
        if user_univ_id != univ_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot access another university's records.")

    return StandardResponse(
        data=OrganizationResponse(
            id=univ.id,
            name=univ.name,
            code=univ.code,
            type=univ.type,
            parent_id=univ.parent_id,
            address=univ.address,
            website=univ.website,
            logo_url=univ.logo_url,
            is_active=univ.is_active,
            created_at=univ.created_at,
            departments_count=len(univ.departments),
            institutions_count=len(univ.institutions),
            theme=UniversityThemeResponse.model_validate(univ.theme) if univ.theme else None
        )
    )

@router.get("/{univ_id}/details", response_model=StandardResponse[UniversityDetailResponse])
def get_university_details(
    univ_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    univ = db.query(Organization).filter(Organization.id == univ_id, Organization.type == "UNIVERSITY").first()
    if not univ:
        raise HTTPException(status_code=404, detail="University not found")

    # Scope protection: non super-admins can only see their own university
    if current_user.role_name != "SUPER_ADMIN":
        if current_user.organization_id != univ_id:
            raise HTTPException(status_code=403, detail="Unauthorized access to university details")

    # Fetch Admins
    admin_users = db.query(User).filter(
        User.organization_id == univ_id,
        User.role_name == "UNIVERSITY_ADMIN"
    ).all()
    admins_summary = [
        UniversityAdminSummary(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            must_change_password=bool(u.must_change_password),
            created_at=u.created_at
        ) for u in admin_users
    ]

    dept_ids = [d.id for d in univ.departments]
    total_faculty = db.query(User).filter(
        User.organization_id == univ_id,
        User.role_name.in_(["FACULTY", "TEACHER", "HOD", "COORDINATOR"])
    ).count()

    total_students = db.query(User).filter(
        User.organization_id == univ_id,
        User.role_name == "STUDENT"
    ).count()

    total_progs = db.query(Program).filter(Program.department_id.in_(dept_ids)).count() if dept_ids else 0
    total_subjs = db.query(Subject).join(Program).filter(Program.department_id.in_(dept_ids)).count() if dept_ids else 0
    total_qs = db.query(Question).join(Subject).join(Program).filter(Program.department_id.in_(dept_ids)).count() if dept_ids else 0
    total_papers = db.query(QuestionPaper).join(Subject).join(Program).filter(Program.department_id.in_(dept_ids)).count() if dept_ids else 0

    return StandardResponse(
        data=UniversityDetailResponse(
            id=univ.id,
            name=univ.name,
            code=univ.code,
            type=univ.type,
            parent_id=univ.parent_id,
            address=univ.address,
            website=univ.website,
            logo_url=univ.logo_url,
            is_active=univ.is_active,
            created_at=univ.created_at,
            departments_count=len(univ.departments),
            institutions_count=len(univ.institutions),
            theme=UniversityThemeResponse.model_validate(univ.theme) if univ.theme else None,
            admins=admins_summary,
            total_faculty=total_faculty,
            total_students=total_students,
            total_programs=total_progs,
            total_subjects=total_subjs,
            total_questions=total_qs,
            total_papers=total_papers
        )
    )

@router.post("/{univ_id}/suspend", response_model=StandardResponse[OrganizationResponse])
def suspend_university(
    univ_id: str,
    action: Optional[UniversityStatusAction] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("university.update"))
):
    if current_user.role_name != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only Super Administrators can suspend universities")

    univ = db.query(Organization).filter(Organization.id == univ_id, Organization.type == "UNIVERSITY").first()
    if not univ:
        raise HTTPException(status_code=404, detail="University not found")

    univ.is_active = False
    db.commit()
    db.refresh(univ)

    log_audit(
        db,
        action="UNIVERSITY_SUSPENDED",
        entity_type="University",
        user_id=current_user.id,
        entity_id=univ.id,
        metadata={"reason": action.reason if action else "Administrative suspension"}
    )

    return StandardResponse(
        data=OrganizationResponse(
            id=univ.id,
            name=univ.name,
            code=univ.code,
            type=univ.type,
            is_active=univ.is_active,
            created_at=univ.created_at,
            departments_count=len(univ.departments),
            institutions_count=len(univ.institutions),
            theme=UniversityThemeResponse.model_validate(univ.theme) if univ.theme else None
        ),
        message=f"University '{univ.name}' has been suspended. All associated accounts are now locked."
    )

@router.post("/{univ_id}/activate", response_model=StandardResponse[OrganizationResponse])
def activate_university(
    univ_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("university.update"))
):
    if current_user.role_name != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only Super Administrators can activate universities")

    univ = db.query(Organization).filter(Organization.id == univ_id, Organization.type == "UNIVERSITY").first()
    if not univ:
        raise HTTPException(status_code=404, detail="University not found")

    univ.is_active = True
    db.commit()
    db.refresh(univ)

    log_audit(db, action="UNIVERSITY_ACTIVATED", entity_type="University", user_id=current_user.id, entity_id=univ.id)

    return StandardResponse(
        data=OrganizationResponse(
            id=univ.id,
            name=univ.name,
            code=univ.code,
            type=univ.type,
            is_active=univ.is_active,
            created_at=univ.created_at,
            departments_count=len(univ.departments),
            institutions_count=len(univ.institutions),
            theme=UniversityThemeResponse.model_validate(univ.theme) if univ.theme else None
        ),
        message=f"University '{univ.name}' is now active."
    )

@router.post("/{univ_id}/admins", response_model=StandardResponse[UserProvisionResponse])
def provision_university_admin(
    univ_id: str,
    data: Optional[UniversityAdminProvisionRequest] = None,
    admin_name: Optional[str] = Query(None),
    admin_email: Optional[str] = Query(None),
    password: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user.create"))
):
    if current_user.role_name != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only Super Administrators can provision University Admins")

    name = data.full_name if data else admin_name
    email = data.email if data else admin_email
    pwd = data.password if data else password

    if not name or not email:
        raise HTTPException(status_code=422, detail="Both administrator name and email are required")

    univ = db.query(Organization).filter(Organization.id == univ_id, Organization.type == "UNIVERSITY").first()
    if not univ:
        raise HTTPException(status_code=404, detail="University not found")

    clean_email = email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    setup_token = None
    temp_pwd = None
    must_change = True

    if pwd and pwd.strip():
        if len(pwd.strip()) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        hashed_pwd = get_password_hash(pwd.strip())
    else:
        setup_token = secrets.token_urlsafe(32)
        temp_pwd = f"QPMS@{secrets.token_hex(4)}!"
        hashed_pwd = get_password_hash(temp_pwd)

    u = User(
        email=clean_email,
        hashed_password=hashed_pwd,
        full_name=name.strip(),
        role_name="UNIVERSITY_ADMIN",
        organization_id=univ.id,
        is_active=True,
        must_change_password=must_change,
        invitation_token=setup_token
    )
    db_role = db.query(Role).filter(Role.name == "UNIVERSITY_ADMIN").first()
    if db_role:
        u.roles.append(db_role)
    db.add(u)
    db.flush()

    user_scope = UserScope(
        user_id=u.id,
        scope_type="UNIVERSITY",
        scope_entity_id=univ.id
    )
    db.add(user_scope)
    db.commit()
    db.refresh(u)

    log_audit(db, action="USER_PROVISIONED", entity_type="User", user_id=current_user.id, entity_id=u.id,
              metadata={"role": "UNIVERSITY_ADMIN", "organization_id": univ.id})

    return StandardResponse(
        data=UserProvisionResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role_name=u.role_name,
            organization_id=u.organization_id,
            department_id=u.department_id,
            organization_name=univ.name,
            is_active=u.is_active,
            must_change_password=u.must_change_password,
            permissions=get_user_permissions(u),
            created_at=u.created_at,
            temporary_password=temp_pwd,
            setup_token=setup_token,
            setup_url=f"/auth/setup?token={setup_token}" if setup_token else None
        ),
        message=f"University Admin account for {u.full_name} provisioned successfully"
    )

@router.put("/{univ_id}", response_model=StandardResponse[OrganizationResponse])
@router.patch("/{univ_id}", response_model=StandardResponse[OrganizationResponse])
def update_university(
    univ_id: str,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("university.update"))
):
    univ = db.query(Organization).filter(Organization.id == univ_id, Organization.type == "UNIVERSITY").first()
    if not univ:
        raise HTTPException(status_code=404, detail="University not found")

    if current_user.role_name != "SUPER_ADMIN":
        if current_user.organization_id != univ_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot modify another university's profile.")

    for k, v in data.dict(exclude_unset=True).items():
        setattr(univ, k, v)
    db.commit()
    db.refresh(univ)

    log_audit(db, action="UNIVERSITY_UPDATED", entity_type="University", user_id=current_user.id, entity_id=univ.id)
    return StandardResponse(
        data=OrganizationResponse(
            id=univ.id,
            name=univ.name,
            code=univ.code,
            type=univ.type,
            parent_id=univ.parent_id,
            address=univ.address,
            website=univ.website,
            logo_url=univ.logo_url,
            is_active=univ.is_active,
            created_at=univ.created_at,
            departments_count=len(univ.departments),
            institutions_count=len(univ.institutions),
            theme=UniversityThemeResponse.model_validate(univ.theme) if univ.theme else None
        ),
        message="University updated successfully"
    )

@router.delete("/{univ_id}", response_model=StandardResponse[bool])
def delete_university(
    univ_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("university.delete"))
):
    univ = db.query(Organization).filter(Organization.id == univ_id, Organization.type == "UNIVERSITY").first()
    if not univ:
        raise HTTPException(status_code=404, detail="University not found")

    if len(univ.institutions) > 0 or len(univ.departments) > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete university with associated institutions or departments. Remove or reassign them first."
        )

    db.delete(univ)
    db.commit()
    log_audit(db, action="UNIVERSITY_DELETED", entity_type="University", user_id=current_user.id, entity_id=univ_id)
    return StandardResponse(data=True, message="University deleted successfully")

# University Theme Sub-endpoints
@router.get("/{univ_id}/theme", response_model=StandardResponse[UniversityThemeResponse])
def get_university_theme(
    univ_id: str,
    db: Session = Depends(get_db)
):
    theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == univ_id).first()
    if not theme:
        theme = UniversityTheme(university_id=univ_id, **DEFAULT_THEME)
        db.add(theme)
        db.commit()
        db.refresh(theme)

    return StandardResponse(data=UniversityThemeResponse.model_validate(theme))

@router.put("/{univ_id}/theme", response_model=StandardResponse[UniversityThemeResponse])
def update_university_theme(
    univ_id: str,
    data: UniversityThemeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("theme.update"))
):
    univ = db.query(Organization).filter(Organization.id == univ_id).first()
    if not univ:
        raise HTTPException(status_code=404, detail="University not found")

    theme_dict = data.dict(exclude_unset=True)
    validate_theme_colors(theme_dict)

    theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == univ_id).first()
    if not theme:
        theme = UniversityTheme(university_id=univ_id, **DEFAULT_THEME)
        db.add(theme)
        db.flush()

    for k, v in theme_dict.items():
        setattr(theme, k, v)

    db.commit()
    db.refresh(theme)

    log_audit(db, action="THEME_UPDATED", entity_type="UniversityTheme", user_id=current_user.id, entity_id=theme.id)
    return StandardResponse(data=UniversityThemeResponse.model_validate(theme), message="University theme updated successfully")
