from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Department, Organization, User
from app.schemas.academic import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, require_permission, check_organization_scope, check_department_scope
from app.services.audit_service import log_audit

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("", response_model=StandardResponse[List[DepartmentResponse]])
def get_departments(
    organization_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Department)
    if organization_id:
        query = query.filter(Department.organization_id == organization_id)
    elif current_user.role_name != "SUPER_ADMIN" and current_user.organization_id:
        query = query.filter(Department.organization_id == current_user.organization_id)
        
    if current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN"] and current_user.department_id:
        query = query.filter(Department.id == current_user.department_id)

    depts = query.order_by(Department.name).all()
    results = []
    for dept in depts:
        results.append(DepartmentResponse(
            id=dept.id,
            organization_id=dept.organization_id,
            organization_name=dept.organization.name if dept.organization else None,
            name=dept.name,
            code=dept.code,
            description=dept.description,
            is_active=dept.is_active,
            programs_count=len(dept.programs),
            created_at=dept.created_at
        ))
    return StandardResponse(data=results)

@router.post("", response_model=StandardResponse[DepartmentResponse])
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("department.create"))
):
    if not check_organization_scope(current_user, data.organization_id, db):
        raise HTTPException(status_code=403, detail="Forbidden to add department to this organization")

    dept = Department(**data.dict())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    
    log_audit(db, action="DEPARTMENT_CREATED", entity_type="Department", user_id=current_user.id, entity_id=dept.id)
    return StandardResponse(
        data=DepartmentResponse(
            id=dept.id,
            organization_id=dept.organization_id,
            organization_name=dept.organization.name if dept.organization else None,
            name=dept.name,
            code=dept.code,
            description=dept.description,
            is_active=dept.is_active,
            programs_count=0,
            created_at=dept.created_at
        ),
        message="Department created successfully"
    )

@router.get("/{dept_id}", response_model=StandardResponse[DepartmentResponse])
def get_department(
    dept_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    if not check_organization_scope(current_user, dept.organization_id, db):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify a department of another organization")
        
    if not check_organization_scope(current_user, dept.organization_id, db) or not check_department_scope(current_user, dept.id):
        raise HTTPException(status_code=403, detail="Access forbidden to department")

    return StandardResponse(
        data=DepartmentResponse(
            id=dept.id,
            organization_id=dept.organization_id,
            organization_name=dept.organization.name if dept.organization else None,
            name=dept.name,
            code=dept.code,
            description=dept.description,
            is_active=dept.is_active,
            programs_count=len(dept.programs),
            created_at=dept.created_at
        )
    )

@router.put("/{dept_id}", response_model=StandardResponse[DepartmentResponse])
def update_department(
    dept_id: str,
    data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("department.update"))
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    if not check_organization_scope(current_user, dept.organization_id, db):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify a department of another organization")
        
    for k, v in data.dict(exclude_unset=True).items():
        setattr(dept, k, v)
        
    db.commit()
    db.refresh(dept)
    log_audit(db, action="DEPARTMENT_UPDATED", entity_type="Department", user_id=current_user.id, entity_id=dept.id)
    return StandardResponse(
        data=DepartmentResponse(
            id=dept.id,
            organization_id=dept.organization_id,
            organization_name=dept.organization.name if dept.organization else None,
            name=dept.name,
            code=dept.code,
            description=dept.description,
            is_active=dept.is_active,
            programs_count=len(dept.programs),
            created_at=dept.created_at
        ),
        message="Department updated successfully"
    )
