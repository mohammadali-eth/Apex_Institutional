"""University Administrator institutional and staff identity management endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_csrf, require_university_admin
from app.core.config import settings
from app.db.session import get_db_session
from app.models.organization import Institution
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.organization import (
    DepartmentCreate,
    DepartmentResponse,
    InstitutionCreate,
    InstitutionResponse,
    UniversityResponse,
)
from app.schemas.role import (
    RoleAssignRequest,
    RoleResponse,
    StaffInvitationResponse,
    StaffInviteRequest,
    StaffMemberResponse,
    UpdateAccountStatusRequest,
    UserRoleAssignmentResponse,
)
from app.services.organization_service import organization_service
from app.services.role_service import UNIVERSITY_ADMIN_DELEGABLE_ROLES, role_service

university_admin_router = APIRouter(prefix="/university-admin", tags=["University Admin"])


def _resolve_target_university(
    admin_context: tuple[User, uuid.UUID | None],
    requested_university_id: uuid.UUID | None = None,
) -> uuid.UUID:
    """Resolve target university ID, strictly enforcing scope boundaries for University Admins."""
    user, authorized_univ_id = admin_context
    if authorized_univ_id is not None:
        # Non-super admin caller is locked to their authorized university
        if requested_university_id and requested_university_id != authorized_univ_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You may only manage your assigned university.",
            )
        return authorized_univ_id

    # Platform super admin caller
    if not requested_university_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="university_id query parameter is required for platform administrators.",
        )
    return requested_university_id


@university_admin_router.get(
    "/organization",
    response_model=UniversityResponse,
    summary="Get Assigned University Details",
)
async def get_assigned_organization(
    university_id: uuid.UUID | None = Query(default=None),
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> UniversityResponse:
    """Retrieve details of the university authorized for the calling administrator."""
    target_univ_id = _resolve_target_university(admin_context, university_id)
    univ = await organization_service.get_university_by_id(db, target_univ_id)
    if not univ:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found.")
    return UniversityResponse.model_validate(univ)


@university_admin_router.get(
    "/institutions",
    response_model=list[InstitutionResponse],
    summary="List University Institutions",
)
async def list_institutions(
    university_id: uuid.UUID | None = Query(default=None),
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> list[InstitutionResponse]:
    """List colleges and campus institutions under the authorized university."""
    target_univ_id = _resolve_target_university(admin_context, university_id)
    return await organization_service.list_institutions(db, target_univ_id)


@university_admin_router.post(
    "/institutions",
    response_model=InstitutionResponse,
    dependencies=[Depends(require_csrf)],
    status_code=status.HTTP_201_CREATED,
    summary="Create Campus Institution",
)
async def create_institution(
    payload: InstitutionCreate,
    request: Request,
    university_id: uuid.UUID | None = Query(default=None),
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> InstitutionResponse:
    """Create a new institution or affiliated college under the authorized university."""
    user, _ = admin_context
    target_univ_id = _resolve_target_university(admin_context, university_id)

    inst, error = await organization_service.create_institution(
        db=db,
        university_id=target_univ_id,
        data=payload,
        actor_user_id=user.id,
        request=request,
    )
    if not inst or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to create institution.",
        )
    return InstitutionResponse.model_validate(inst)


@university_admin_router.get(
    "/institutions/{institution_id}/departments",
    response_model=list[DepartmentResponse],
    summary="List Institution Departments",
)
async def list_departments(
    institution_id: uuid.UUID,
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> list[DepartmentResponse]:
    """List departments within an institution, verifying university ownership."""
    user, authorized_univ_id = admin_context
    if authorized_univ_id is not None:
        inst = (
            await db.execute(
                select(Institution).where(
                    Institution.id == institution_id,
                    Institution.university_id == authorized_univ_id,
                )
            )
        ).scalar_one_or_none()
        if not inst:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Institution not found or not authorized for your university.",
            )
    return await organization_service.list_departments(db, institution_id)


@university_admin_router.post(
    "/departments",
    response_model=DepartmentResponse,
    dependencies=[Depends(require_csrf)],
    status_code=status.HTTP_201_CREATED,
    summary="Create Academic Department",
)
async def create_department(
    payload: DepartmentCreate,
    request: Request,
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> DepartmentResponse:
    """Create an academic department within an institution under caller scope."""
    user, authorized_univ_id = admin_context
    if authorized_univ_id is not None:
        inst = (
            await db.execute(
                select(Institution).where(
                    Institution.id == payload.institution_id,
                    Institution.university_id == authorized_univ_id,
                )
            )
        ).scalar_one_or_none()
        if not inst:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Target institution does not belong to your authorized university.",
            )

    dept, error = await organization_service.create_department(
        db=db,
        institution_id=payload.institution_id,
        data=payload,
        actor_user_id=user.id,
        request=request,
    )
    if not dept or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to create department.",
        )
    return DepartmentResponse.model_validate(dept)


@university_admin_router.get(
    "/roles",
    response_model=list[RoleResponse],
    summary="List Delegable Roles",
)
async def list_delegable_roles(
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> list[RoleResponse]:
    """List roles that a University Administrator is permitted to delegate and assign."""
    all_roles = await role_service.get_all_roles(db)
    user, authorized_univ_id = admin_context
    if authorized_univ_id is not None:
        return [r for r in all_roles if r.code in UNIVERSITY_ADMIN_DELEGABLE_ROLES]
    return all_roles


@university_admin_router.get(
    "/staff",
    response_model=list[StaffMemberResponse],
    summary="List University Staff",
)
async def list_staff(
    university_id: uuid.UUID | None = Query(default=None),
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> list[StaffMemberResponse]:
    """List staff members and active role assignments in the university."""
    target_univ_id = _resolve_target_university(admin_context, university_id)
    return await role_service.list_staff_members(db, target_univ_id)


@university_admin_router.post(
    "/staff/invite",
    response_model=StaffInvitationResponse,
    dependencies=[Depends(require_csrf)],
    status_code=status.HTTP_201_CREATED,
    summary="Invite Staff Member",
)
async def invite_staff(
    payload: StaffInviteRequest,
    request: Request,
    university_id: uuid.UUID | None = Query(default=None),
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> StaffInvitationResponse:
    """Issue a staff activation invitation with approved role and organizational scope."""
    user, _ = admin_context
    target_univ_id = _resolve_target_university(
        admin_context, payload.university_id or university_id
    )

    inv, raw_token, error = await role_service.create_staff_invitation(
        db=db,
        actor_user=user,
        email=payload.email,
        role_code=payload.role_code,
        university_id=target_univ_id,
        institution_id=payload.institution_id,
        department_id=payload.department_id,
        request=request,
    )
    if not inv or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to dispatch staff invitation.",
        )

    # In development, return raw_token for quick test/verification
    token_preview = raw_token if settings.app_env != "production" else None

    return StaffInvitationResponse(
        id=inv.id,
        email=inv.email,
        role_id=inv.role_id,
        role_code=inv.role.code,
        role_name=inv.role.name,
        university_id=inv.university_id,
        university_name=inv.university.name,
        institution_id=inv.institution_id,
        department_id=inv.department_id,
        status=inv.status,
        expires_at=inv.expires_at,
        created_at=inv.created_at,
        raw_token=token_preview,
    )


@university_admin_router.get(
    "/invitations",
    response_model=list[StaffInvitationResponse],
    summary="List University Invitations",
)
async def list_invitations(
    university_id: uuid.UUID | None = Query(default=None),
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> list[StaffInvitationResponse]:
    """List pending and historical staff invitations for this university."""
    target_univ_id = _resolve_target_university(admin_context, university_id)
    return await role_service.list_staff_invitations(db, target_univ_id)


@university_admin_router.post(
    "/invitations/{invitation_id}/resend",
    response_model=MessageResponse,
    dependencies=[Depends(require_csrf)],
    summary="Resend Staff Invitation",
)
async def resend_invitation(
    invitation_id: uuid.UUID,
    request: Request,
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Regenerate token, extend expiry, and resend invitation email."""
    user, _ = admin_context
    raw_token, error = await role_service.resend_staff_invitation(
        db=db,
        actor_user=user,
        invitation_id=invitation_id,
        request=request,
    )
    if not raw_token or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to resend invitation.",
        )
    return MessageResponse(message="Invitation successfully resent.")


@university_admin_router.delete(
    "/invitations/{invitation_id}",
    response_model=MessageResponse,
    dependencies=[Depends(require_csrf)],
    summary="Revoke Staff Invitation",
)
async def revoke_invitation(
    invitation_id: uuid.UUID,
    request: Request,
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Revoke a pending staff invitation so it can no longer activate an account."""
    user, _ = admin_context
    success, error = await role_service.revoke_staff_invitation(
        db=db,
        actor_user=user,
        invitation_id=invitation_id,
        request=request,
    )
    if not success or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to revoke invitation.",
        )
    return MessageResponse(message="Invitation successfully revoked.")


@university_admin_router.post(
    "/staff/{user_id}/roles",
    response_model=UserRoleAssignmentResponse,
    dependencies=[Depends(require_csrf)],
    status_code=status.HTTP_201_CREATED,
    summary="Assign Role to Staff Member",
)
async def assign_staff_role(
    user_id: uuid.UUID,
    payload: RoleAssignRequest,
    request: Request,
    university_id: uuid.UUID | None = Query(default=None),
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> UserRoleAssignmentResponse:
    """Assign an approved role and scope to a staff member within caller's university."""
    user, _ = admin_context
    target_univ_id = _resolve_target_university(
        admin_context, payload.university_id or university_id
    )

    assignment, error = await role_service.assign_role(
        db=db,
        actor_user=user,
        target_user_id=user_id,
        role_code=payload.role_code,
        university_id=target_univ_id,
        institution_id=payload.institution_id,
        department_id=payload.department_id,
        request=request,
    )
    if not assignment or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to assign role.",
        )
    serialized = role_service.serialize_role_assignments([assignment])
    return serialized[0]


@university_admin_router.delete(
    "/staff/roles/{assignment_id}",
    response_model=MessageResponse,
    dependencies=[Depends(require_csrf)],
    summary="Revoke Staff Role Assignment",
)
async def revoke_staff_role(
    assignment_id: uuid.UUID,
    request: Request,
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Revoke a role assignment from a staff member."""
    user, _ = admin_context
    success, error = await role_service.revoke_role_assignment(
        db=db,
        actor_user=user,
        assignment_id=assignment_id,
        request=request,
    )
    if not success or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to revoke role assignment.",
        )
    return MessageResponse(message="Role assignment successfully revoked.")


@university_admin_router.patch(
    "/staff/{user_id}/status",
    response_model=MessageResponse,
    dependencies=[Depends(require_csrf)],
    summary="Update Staff Account Status",
)
async def update_staff_status(
    user_id: uuid.UUID,
    payload: UpdateAccountStatusRequest,
    request: Request,
    admin_context: tuple[User, uuid.UUID | None] = Depends(require_university_admin),
    db: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    """Suspend, reactivate, or disable staff account credentials."""
    user, _ = admin_context
    updated_user, error = await role_service.update_account_status(
        db=db,
        actor_user=user,
        target_user_id=user_id,
        new_status=payload.status,
        request=request,
    )
    if not updated_user or error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to update staff account status.",
        )
    return MessageResponse(message=f"Staff account status updated to {payload.status}.")
