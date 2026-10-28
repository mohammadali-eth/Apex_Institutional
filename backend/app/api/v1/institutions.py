from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Organization, User
from app.schemas.academic import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse
)
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, require_permission
from app.services.audit_service import log_audit

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("", response_model=StandardResponse[List[OrganizationResponse]])
def get_institutions(
    university_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Organization).filter(Organization.type.in_(["COLLEGE", "INSTITUTE"]))

    if university_id:
        query = query.filter(Organization.parent_id == university_id)
    elif current_user.role_name not in ["SUPER_ADMIN"]:
        if current_user.organization_id:
            user_org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
            if user_org:
                if user_org.type == "UNIVERSITY":
                    query = query.filter(Organization.parent_id == user_org.id)
                else:
                    query = query.filter(Organization.id == user_org.id)
        else:
            return StandardResponse(data=[])

    insts = query.order_by(Organization.name).all()
    results = []
    for inst in insts:
        parent_org = db.query(Organization).filter(Organization.id == inst.parent_id).first() if inst.parent_id else None
        results.append(
            OrganizationResponse(
                id=inst.id,
                name=inst.name,
                code=inst.code,
                type=inst.type,
                parent_id=inst.parent_id,
                parent_name=parent_org.name if parent_org else None,
                address=inst.address,
                website=inst.website,
                logo_url=inst.logo_url,
                is_active=inst.is_active,
                created_at=inst.created_at,
                departments_count=len(inst.departments)
            )
        )
    return StandardResponse(data=results)

@router.post("", response_model=StandardResponse[OrganizationResponse])
def create_institution(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("institution.create"))
):
    existing = db.query(Organization).filter(Organization.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Institution code already exists")

    # Verify parent university exists
    if not data.parent_id:
        # Default to user's university if user is university admin
        if current_user.organization_id:
            data.parent_id = current_user.organization_id
        else:
            raise HTTPException(status_code=400, detail="parent_id (University) is required for creating an institution")

    parent = db.query(Organization).filter(Organization.id == data.parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent University not found")

    inst_dict = data.dict()
    if inst_dict.get("type") == "UNIVERSITY":
        inst_dict["type"] = "COLLEGE"

    inst = Organization(**inst_dict)
    db.add(inst)
    db.commit()
    db.refresh(inst)

    log_audit(db, action="INSTITUTION_CREATED", entity_type="Institution", user_id=current_user.id, entity_id=inst.id)
    return StandardResponse(
        data=OrganizationResponse(
            id=inst.id,
            name=inst.name,
            code=inst.code,
            type=inst.type,
            parent_id=inst.parent_id,
            parent_name=parent.name,
            address=inst.address,
            website=inst.website,
            logo_url=inst.logo_url,
            is_active=inst.is_active,
            created_at=inst.created_at,
            departments_count=0
        ),
        message="Institution created successfully"
    )

@router.get("/{inst_id}", response_model=StandardResponse[OrganizationResponse])
def get_institution(
    inst_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(Organization).filter(Organization.id == inst_id, Organization.type.in_(["COLLEGE", "INSTITUTE"])).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    parent = db.query(Organization).filter(Organization.id == inst.parent_id).first() if inst.parent_id else None

    return StandardResponse(
        data=OrganizationResponse(
            id=inst.id,
            name=inst.name,
            code=inst.code,
            type=inst.type,
            parent_id=inst.parent_id,
            parent_name=parent.name if parent else None,
            address=inst.address,
            website=inst.website,
            logo_url=inst.logo_url,
            is_active=inst.is_active,
            created_at=inst.created_at,
            departments_count=len(inst.departments)
        )
    )

@router.put("/{inst_id}", response_model=StandardResponse[OrganizationResponse])
@router.patch("/{inst_id}", response_model=StandardResponse[OrganizationResponse])
def update_institution(
    inst_id: str,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("institution.update"))
):
    inst = db.query(Organization).filter(Organization.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    for k, v in data.dict(exclude_unset=True).items():
        setattr(inst, k, v)
    db.commit()
    db.refresh(inst)

    parent = db.query(Organization).filter(Organization.id == inst.parent_id).first() if inst.parent_id else None
    log_audit(db, action="INSTITUTION_UPDATED", entity_type="Institution", user_id=current_user.id, entity_id=inst.id)
    return StandardResponse(
        data=OrganizationResponse(
            id=inst.id,
            name=inst.name,
            code=inst.code,
            type=inst.type,
            parent_id=inst.parent_id,
            parent_name=parent.name if parent else None,
            address=inst.address,
            website=inst.website,
            logo_url=inst.logo_url,
            is_active=inst.is_active,
            created_at=inst.created_at,
            departments_count=len(inst.departments)
        ),
        message="Institution updated successfully"
    )

@router.delete("/{inst_id}", response_model=StandardResponse[bool])
def delete_institution(
    inst_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("institution.delete"))
):
    inst = db.query(Organization).filter(Organization.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    if len(inst.departments) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete institution with active departments")

    db.delete(inst)
    db.commit()
    log_audit(db, action="INSTITUTION_DELETED", entity_type="Institution", user_id=current_user.id, entity_id=inst_id)
    return StandardResponse(data=True, message="Institution deleted successfully")
