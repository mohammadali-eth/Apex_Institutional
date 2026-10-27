"""Super Administrator platform management endpoints."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, require_csrf, require_super_admin
from app.db.session import get_db_session
from app.models.audit import AuthenticationAuditEvent
from app.models.enums import AuditEventType, OrganizationStatus, RoleCode
from app.models.organization import Institution
from app.models.role import Role, UserRoleAssignment
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.domain_mapping import (
    DomainMappingCreate,
    DomainMappingResponse,
    DomainMappingUpdate,
)
from app.schemas.organization import (
    InstitutionCreate,
    InstitutionResponse,
    UniversityCreate,
    UniversityResponse,
    UniversityUpdate,
)
from app.schemas.role import (
    ProvisionUniversityAdminRequest,
    RoleResponse,
    StaffMemberResponse,
    UpdateAccountStatusRequest,
)
from app.services.domain_service import domain_service
from app.services.organization_service import organization_service
from app.services.role_service import role_service

super_admin_router = APIRouter(
    prefix="/super-admin",
    tags=["Super Admin"],
    dependencies=[Depends(require_super_admin)],
)


@super_admin_router.get("/stats", summary="Platform Operational Metrics")
async def get_stats(
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, int]:
    """Retrieve top-level platform statistics."""
    return await organization_service.get_platform_stats(db)


@super_admin_router.get(
    "/universities",
    response_model=list[UniversityResponse],
    summary="List Registered Universities",
)
async def list_universities(
    status_filter: OrganizationStatus | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db_session),
) -> list[UniversityResponse]:
    """List registered universities with active statistics."""
    return await organization_service.list_universities(db, status=status_filter)


@super_admin_router.post(
    "/universities",
    response_model=UniversityResponse,
    dependencies=[Depends(require_csrf)],
    status_code=status.HTTP_201_CREATED,
    summary="Register University",
)
async def create_university(
    payload: UniversityCreate,
    request: Request,
    super_admin: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> UniversityResponse:
    """Register a new university in the system."""
    univ, error = await organization_service.create_university(
        db=db,
        data=payload,
        actor_user_id=super_admin.id,
        request=request,
    )
    if not univ or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to register university.",
        )
    return UniversityResponse(
        id=univ.id,
        code=univ.code,
        name=univ.name,
        type=univ.type,
        status=univ.status,
        region=univ.region,
        address=univ.address,
        institutions_count=0,
        admins_count=0,
        created_at=univ.created_at,
        updated_at=univ.updated_at,
    )


@super_admin_router.get(
    "/universities/{university_id}",
    response_model=UniversityResponse,
    summary="Get University Details",
)
async def get_university(
    university_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
) -> UniversityResponse:
    """Retrieve full university profile."""
    univ = await organization_service.get_university_by_id(db, university_id)
    if not univ:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found.")

    inst_count = (
        await db.execute(
            select(func.count(Institution.id)).where(Institution.university_id == univ.id)
        )
    ).scalar() or 0
    admin_count = (
        await db.execute(
            select(func.count(UserRoleAssignment.id))
            .join(Role, UserRoleAssignment.role_id == Role.id)
            .where(
                UserRoleAssignment.university_id == univ.id,
                Role.code == RoleCode.UNIVERSITY_ADMIN,
                UserRoleAssignment.is_active == True,  # noqa: E712
            )
        )
    ).scalar() or 0

    return UniversityResponse(
        id=univ.id,
        code=univ.code,
        name=univ.name,
        type=univ.type,
        status=univ.status,
        region=univ.region,
        address=univ.address,
        institutions_count=inst_count,
        admins_count=admin_count,
        created_at=univ.created_at,
        updated_at=univ.updated_at,
    )


@super_admin_router.patch(
    "/universities/{university_id}",
    response_model=UniversityResponse,
    dependencies=[Depends(require_csrf)],
    summary="Update University Metadata / Status",
)
async def update_university(
    university_id: uuid.UUID,
    payload: UniversityUpdate,
    request: Request,
    super_admin: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> UniversityResponse:
    """Modify university profile or status (active, suspended, inactive)."""
    univ, error = await organization_service.update_university(
        db=db,
        university_id=university_id,
        data=payload,
        actor_user_id=super_admin.id,
        request=request,
    )
    if not univ or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to update university.",
        )
    return UniversityResponse.model_validate(univ)


@super_admin_router.get(
    "/universities/{university_id}/institutions",
    response_model=list[InstitutionResponse],
    summary="List University Institutions",
)
async def list_university_institutions(
    university_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
) -> list[InstitutionResponse]:
    """List affiliated colleges and institutions under a university."""
    return await organization_service.list_institutions(db, university_id)


@super_admin_router.post(
    "/universities/{university_id}/institutions",
    response_model=InstitutionResponse,
    dependencies=[Depends(require_csrf)],
    status_code=status.HTTP_201_CREATED,
    summary="Provision Institution Under University",
)
async def create_institution(
    university_id: uuid.UUID,
    payload: InstitutionCreate,
    request: Request,
    super_admin: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> InstitutionResponse:
    """Add a new institution or campus under a university."""
    inst, error = await organization_service.create_institution(
        db=db,
        university_id=university_id,
        data=payload,
        actor_user_id=super_admin.id,
        request=request,
    )
    if not inst or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to create institution.",
        )
    return InstitutionResponse.model_validate(inst)


@super_admin_router.get(
    "/admins",
    response_model=list[StaffMemberResponse],
    summary="List University Administrators",
)
async def list_university_admins(
    university_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db_session),
) -> list[StaffMemberResponse]:
    """List provisioned University Administrators."""
    stmt = (
        select(User)
        .join(UserRoleAssignment, User.id == UserRoleAssignment.user_id)
        .join(Role, UserRoleAssignment.role_id == Role.id)
        .where(
            Role.code == RoleCode.UNIVERSITY_ADMIN,
            UserRoleAssignment.is_active == True,  # noqa: E712
        )
    )
    if university_id:
        stmt = stmt.where(UserRoleAssignment.university_id == university_id)

    stmt = stmt.distinct().order_by(User.created_at.desc())
    result = await db.execute(stmt)
    users = result.scalars().all()

    admins: list[StaffMemberResponse] = []
    for u in users:
        assignments = await role_service.get_user_role_assignments(db, u.id, active_only=True)
        serialized = role_service.serialize_role_assignments(assignments)
        admins.append(
            StaffMemberResponse(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                status=u.status,
                created_at=u.created_at,
                last_login_at=u.last_login_at,
                roles=serialized,
            )
        )
    return admins


@super_admin_router.post(
    "/admins",
    response_model=StaffMemberResponse,
    dependencies=[Depends(require_csrf)],
    status_code=status.HTTP_201_CREATED,
    summary="Provision University Administrator",
)
async def provision_university_admin(
    payload: ProvisionUniversityAdminRequest,
    request: Request,
    super_admin: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> StaffMemberResponse:
    """Super Admin provisions a University Administrator account for an authorized university."""
    user, error = await role_service.provision_university_admin(
        db=db,
        email=payload.email,
        full_name=payload.full_name,
        university_id=payload.university_id,
        password=payload.password,
        actor_user_id=super_admin.id,
        request=request,
    )
    if not user or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to provision University Administrator.",
        )
    assignments = await role_service.get_user_role_assignments(db, user.id, active_only=True)
    serialized = role_service.serialize_role_assignments(assignments)
    return StaffMemberResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        status=user.status,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        roles=serialized,
    )


@super_admin_router.patch(
    "/admins/{user_id}/status",
    response_model=MessageResponse,
    dependencies=[Depends(require_csrf)],
    summary="Suspend or Reactivate University Admin",
)
async def update_admin_status(
    user_id: uuid.UUID,
    payload: UpdateAccountStatusRequest,
    request: Request,
    super_admin: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Suspend, reactivate, or disable University Admin credentials."""
    user, error = await role_service.update_account_status(
        db=db,
        actor_user=super_admin,
        target_user_id=user_id,
        new_status=payload.status,
        request=request,
    )
    if not user or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to update administrator status.",
        )
    return MessageResponse(message=f"Administrator account status updated to {payload.status}.")


@super_admin_router.get(
    "/audit-events",
    summary="Platform Security Audit Log",
)
async def list_audit_events(
    event_type: AuditEventType | None = None,
    limit: int = Query(default=50, le=100),
    db: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    """Review immutable administrative and security audit events."""
    stmt = (
        select(AuthenticationAuditEvent)
        .order_by(desc(AuthenticationAuditEvent.timestamp))
        .limit(limit)
    )
    if event_type:
        stmt = stmt.where(AuthenticationAuditEvent.event_type == event_type)

    result = await db.execute(stmt)
    events = result.scalars().all()

    return [
        {
            "id": str(e.id),
            "event_type": e.event_type,
            "user_id": str(e.user_id) if e.user_id else None,
            "timestamp": e.timestamp.isoformat(),
            "ip_address": e.ip_address,
            "details": e.details,
        }
        for e in events
    ]


@super_admin_router.get(
    "/roles",
    response_model=list[RoleResponse],
    summary="List Roles Catalog",
)
async def list_roles(
    db: AsyncSession = Depends(get_db_session),
) -> list[RoleResponse]:
    """Retrieve catalog of all roles for platform governance and domain assignment."""
    return await role_service.get_all_roles(db)


@super_admin_router.get(
    "/domain-mappings",
    response_model=list[DomainMappingResponse],
    summary="List Configured Domain-to-Role Mappings",
)
async def list_domain_mappings(
    active_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db_session),
) -> list[DomainMappingResponse]:
    """Retrieve all configured domain mappings with resolved role and scope details."""
    mappings = await domain_service.list_domain_mappings(db, active_only=active_only)
    return [domain_service.serialize_domain_mapping(m) for m in mappings]


@super_admin_router.post(
    "/domain-mappings",
    response_model=DomainMappingResponse,
    dependencies=[Depends(require_csrf)],
    status_code=status.HTTP_201_CREATED,
    summary="Configure Domain-to-Role Mapping",
)
async def create_domain_mapping(
    payload: DomainMappingCreate,
    request: Request,
    super_admin: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> DomainMappingResponse:
    """Create a new domain mapping, preventing conflicting mappings and unauthorized privilege escalation."""
    mapping, error = await domain_service.create_domain_mapping(
        db=db,
        data=payload,
        actor_user_id=super_admin.id,
        request=request,
    )
    if not mapping or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to configure domain mapping.",
        )
    return domain_service.serialize_domain_mapping(mapping)


@super_admin_router.get(
    "/domain-mappings/{mapping_id}",
    response_model=DomainMappingResponse,
    summary="Get Domain Mapping Details",
)
async def get_domain_mapping(
    mapping_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
) -> DomainMappingResponse:
    """Retrieve single domain mapping details."""
    mapping = await domain_service.get_domain_mapping_by_id(db, mapping_id)
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Domain mapping not found.",
        )
    return domain_service.serialize_domain_mapping(mapping)


@super_admin_router.put(
    "/domain-mappings/{mapping_id}",
    response_model=DomainMappingResponse,
    dependencies=[Depends(require_csrf)],
    summary="Update Domain Mapping",
)
async def update_domain_mapping(
    mapping_id: uuid.UUID,
    payload: DomainMappingUpdate,
    request: Request,
    super_admin: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> DomainMappingResponse:
    """Update domain mapping attributes, active status, or organizational scope."""
    mapping, error = await domain_service.update_domain_mapping(
        db=db,
        mapping_id=mapping_id,
        data=payload,
        actor_user_id=super_admin.id,
        request=request,
    )
    if not mapping or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to update domain mapping.",
        )
    return domain_service.serialize_domain_mapping(mapping)


@super_admin_router.delete(
    "/domain-mappings/{mapping_id}",
    response_model=MessageResponse,
    dependencies=[Depends(require_csrf)],
    summary="Delete Domain Mapping",
)
async def delete_domain_mapping(
    mapping_id: uuid.UUID,
    request: Request,
    super_admin: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Delete a domain mapping configuration."""
    success, error = await domain_service.delete_domain_mapping(
        db=db,
        mapping_id=mapping_id,
        actor_user_id=super_admin.id,
        request=request,
    )
    if not success or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to delete domain mapping.",
        )
    return MessageResponse(message="Domain mapping successfully removed.")
