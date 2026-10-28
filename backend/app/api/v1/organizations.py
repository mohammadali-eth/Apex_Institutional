from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Organization, Department, User
from app.schemas.academic import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    DepartmentCreate, DepartmentUpdate, DepartmentResponse
)
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, require_permission, check_organization_scope
from app.services.audit_service import log_audit

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.get("", response_model=StandardResponse[List[OrganizationResponse]])
def get_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Organization)
    if current_user.role_name != "SUPER_ADMIN" and current_user.organization_id:
        query = query.filter(Organization.id == current_user.organization_id)
    
    orgs = query.order_by(Organization.name).all()
    results = []
    for org in orgs:
        resp = OrganizationResponse(
            id=org.id,
            name=org.name,
            code=org.code,
            type=org.type,
            address=org.address,
            website=org.website,
            logo_url=org.logo_url,
            is_active=org.is_active,
            created_at=org.created_at,
            departments_count=len(org.departments)
        )
        results.append(resp)
    return StandardResponse(data=results)

@router.post("", response_model=StandardResponse[OrganizationResponse])
def create_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("university.create"))
):
    existing = db.query(Organization).filter(Organization.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Organization code already exists")
    
    org = Organization(**data.dict())
    db.add(org)
    db.commit()
    db.refresh(org)
    
    log_audit(db, action="ORGANIZATION_CREATED", entity_type="Organization", user_id=current_user.id, entity_id=org.id)
    return StandardResponse(data=OrganizationResponse.from_orm(org), message="Organization created successfully")

@router.get("/{org_id}", response_model=StandardResponse[OrganizationResponse])
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not check_organization_scope(current_user, org_id):
        raise HTTPException(status_code=403, detail="Forbidden access to organization")
    
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    resp = OrganizationResponse(
        id=org.id,
        name=org.name,
        code=org.code,
        type=org.type,
        address=org.address,
        website=org.website,
        logo_url=org.logo_url,
        is_active=org.is_active,
        created_at=org.created_at,
        departments_count=len(org.departments)
    )
    return StandardResponse(data=resp)

@router.put("/{org_id}", response_model=StandardResponse[OrganizationResponse])
def update_organization(
    org_id: str,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("university.update"))
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    for k, v in data.dict(exclude_unset=True).items():
        setattr(org, k, v)
        
    db.commit()
    db.refresh(org)
    log_audit(db, action="ORGANIZATION_UPDATED", entity_type="Organization", user_id=current_user.id, entity_id=org.id)
    return StandardResponse(data=OrganizationResponse.from_orm(org), message="Organization updated successfully")
