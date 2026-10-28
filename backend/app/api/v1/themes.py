import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Organization, UniversityTheme, User
from app.schemas.academic import UniversityThemeUpdate, UniversityThemeResponse
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, get_optional_current_user, require_permission
from app.services.audit_service import log_audit

router = APIRouter(prefix="/themes", tags=["Themes"])

HEX_COLOR_REGEX = re.compile(r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")

DEFAULT_THEME_VALUES = {
    "primary_color": "#82c341",
    "secondary_color": "#45525b",
    "background_color": "#f3f3f3",
    "font_color": "#838383",
    "title_color": "#44535b",
    "paragraph_color": "#676767",
    "bg_text_color": "#dcdcdc",
    "bg_title_color": "#f6f6f7",
    "sidebar_style": "default",
    "is_dark_mode_supported": False,
    "logo_url": None,
    "favicon_url": None,
    "login_banner_text": None
}

def validate_theme_colors(theme_data: dict):
    for field, val in theme_data.items():
        if field.endswith("_color") and val:
            if not HEX_COLOR_REGEX.match(val):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid color format for '{field}': '{val}'. Must be a valid hex color code (e.g. #82c341)."
                )

@router.get("/current", response_model=StandardResponse[UniversityThemeResponse])
def get_current_theme(
    university_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    target_univ_id = university_id

    if not target_univ_id and current_user and current_user.organization_id:
        user_org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
        if user_org:
            if user_org.type == "UNIVERSITY":
                target_univ_id = user_org.id
            elif user_org.parent_id:
                target_univ_id = user_org.parent_id

    # If target university ID found, retrieve its theme
    if target_univ_id:
        theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == target_univ_id).first()
        if theme:
            return StandardResponse(data=UniversityThemeResponse.from_orm(theme))

    # Fallback to the first university in database
    first_univ = db.query(Organization).filter(Organization.type == "UNIVERSITY").first()
    if first_univ:
        theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == first_univ.id).first()
        if not theme:
            theme = UniversityTheme(university_id=first_univ.id, **DEFAULT_THEME_VALUES)
            db.add(theme)
            db.commit()
            db.refresh(theme)
        return StandardResponse(data=UniversityThemeResponse.from_orm(theme))

    # If no university in database at all, return synthetic default theme response
    fallback_response = UniversityThemeResponse(
        id="default-theme",
        university_id="default",
        **DEFAULT_THEME_VALUES
    )
    return StandardResponse(data=fallback_response)

@router.get("/{university_id}", response_model=StandardResponse[UniversityThemeResponse])
def get_theme_by_university(
    university_id: str,
    db: Session = Depends(get_db)
):
    univ = db.query(Organization).filter(Organization.id == university_id).first()
    if not univ:
        raise HTTPException(status_code=404, detail="University not found")

    theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == university_id).first()
    if not theme:
        theme = UniversityTheme(
            university_id=univ.id,
            logo_url=univ.logo_url,
            **DEFAULT_THEME_VALUES
        )
        db.add(theme)
        db.commit()
        db.refresh(theme)

    return StandardResponse(data=UniversityThemeResponse.from_orm(theme))

@router.put("/{university_id}", response_model=StandardResponse[UniversityThemeResponse])
def update_theme(
    university_id: str,
    data: UniversityThemeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("theme.update"))
):
    univ = db.query(Organization).filter(Organization.id == university_id).first()
    if not univ:
        raise HTTPException(status_code=404, detail="University not found")

    # University admin can only modify their own university theme
    if current_user.role_name == "UNIVERSITY_ADMIN" and current_user.organization_id != university_id:
        raise HTTPException(status_code=403, detail="Cannot modify theme for another university")

    theme_dict = data.dict(exclude_unset=True)
    validate_theme_colors(theme_dict)

    theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == university_id).first()
    if not theme:
        theme = UniversityTheme(university_id=university_id, **DEFAULT_THEME_VALUES)
        db.add(theme)
        db.flush()

    for k, v in theme_dict.items():
        setattr(theme, k, v)

    db.commit()
    db.refresh(theme)

    log_audit(db, action="THEME_UPDATED", entity_type="UniversityTheme", user_id=current_user.id, entity_id=theme.id)
    return StandardResponse(data=UniversityThemeResponse.from_orm(theme), message="University theme updated successfully")

@router.post("/{university_id}/reset", response_model=StandardResponse[UniversityThemeResponse])
def reset_theme_to_default(
    university_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("theme.update"))
):
    univ = db.query(Organization).filter(Organization.id == university_id).first()
    if not univ:
        raise HTTPException(status_code=404, detail="University not found")

    if current_user.role_name == "UNIVERSITY_ADMIN" and current_user.organization_id != university_id:
        raise HTTPException(status_code=403, detail="Cannot reset theme for another university")

    theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == university_id).first()
    if not theme:
        theme = UniversityTheme(university_id=university_id, **DEFAULT_THEME_VALUES)
        db.add(theme)
    else:
        for k, v in DEFAULT_THEME_VALUES.items():
            setattr(theme, k, v)

    db.commit()
    db.refresh(theme)

    log_audit(db, action="THEME_RESET_DEFAULT", entity_type="UniversityTheme", user_id=current_user.id, entity_id=theme.id)
    return StandardResponse(data=UniversityThemeResponse.from_orm(theme), message="University theme reset to default system colors")
