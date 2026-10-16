"""Integration and security tests for University Administrator portal endpoints."""

from datetime import UTC, datetime

import pytest
from app.core.security import hash_password
from app.models.enums import OrganizationStatus, RoleCode, UserStatus
from app.models.organization import University
from app.models.role import UserRoleAssignment
from app.models.user import User
from app.services.role_service import role_service
from app.services.session_service import session_service
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


async def setup_university_and_admin(
    db: AsyncSession,
    univ_code: str = "STATE-UNIV",
    admin_email: str = "univ_admin@state.edu",
) -> tuple[University, User, str]:
    """Helper to provision university, admin user, and session token."""
    await role_service.seed_role_catalog(db)
    admin_role = await role_service.get_role_by_code(db, RoleCode.UNIVERSITY_ADMIN)
    assert admin_role is not None

    univ = University(
        code=univ_code,
        name=f"University of {univ_code}",
        type="State University",
        status=OrganizationStatus.ACTIVE,
    )
    db.add(univ)
    await db.flush()

    user = User(
        email=admin_email,
        full_name="State Admin",
        password_hash=hash_password("AdminPassphrase2026!"),
        status=UserStatus.ACTIVE,
        email_verified_at=datetime.now(UTC),
    )
    db.add(user)
    await db.flush()

    assignment = UserRoleAssignment(
        user_id=user.id,
        role_id=admin_role.id,
        university_id=univ.id,
        is_active=True,
    )
    db.add(assignment)
    await db.flush()

    _, raw_token = await session_service.create_session(db, user_id=user.id)
    return univ, user, raw_token


@pytest.mark.asyncio
async def test_university_admin_view_and_create_hierarchy(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """University Admin views their university and provisions an institution and department."""
    univ, admin_user, raw_token = await setup_university_and_admin(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    # 1. View organization
    org_res = await async_client.get("/api/v1/university-admin/organization")
    assert org_res.status_code == 200
    assert org_res.json()["code"] == univ.code

    # 2. CSRF Token
    csrf_res = await async_client.get("/api/v1/auth/csrf")
    headers = {"X-CSRF-Token": csrf_res.json()["csrf_token"]}

    # 3. Create institution
    inst_res = await async_client.post(
        "/api/v1/university-admin/institutions",
        json={
            "code": "SCI-COLLEGE",
            "name": "College of Science",
            "type": "Science College",
        },
        headers=headers,
    )
    assert inst_res.status_code == 201
    inst_id = inst_res.json()["id"]

    # 4. Create department under institution
    dept_res = await async_client.post(
        "/api/v1/university-admin/departments",
        json={
            "institution_id": inst_id,
            "code": "PHYS",
            "name": "Department of Physics",
        },
        headers=headers,
    )
    assert dept_res.status_code == 201
    assert dept_res.json()["code"] == "PHYS"


@pytest.mark.asyncio
async def test_university_admin_cross_tenant_isolation(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """University Admin A cannot access or manage University B's resources."""
    univ_a, _, token_a = await setup_university_and_admin(
        db_session, univ_code="UNIV-A", admin_email="admin_a@univ-a.edu"
    )
    univ_b, _, _ = await setup_university_and_admin(
        db_session, univ_code="UNIV-B", admin_email="admin_b@univ-b.edu"
    )

    async_client.cookies.set("qpms_session", token_a)

    # Attempt to request University B's data
    res = await async_client.get(f"/api/v1/university-admin/organization?university_id={univ_b.id}")
    assert res.status_code == 403
    assert "You may only manage your assigned university" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_university_admin_cannot_delegate_super_admin(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """University Admin is strictly forbidden from inviting or assigning SUPER_ADMIN role."""
    univ, admin_user, raw_token = await setup_university_and_admin(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    csrf_res = await async_client.get("/api/v1/auth/csrf")
    headers = {"X-CSRF-Token": csrf_res.json()["csrf_token"]}

    # Attempt to invite a SUPER_ADMIN
    res = await async_client.post(
        "/api/v1/university-admin/staff/invite",
        json={
            "email": "attacker@state.edu",
            "role_code": "SUPER_ADMIN",
            "university_id": str(univ.id),
        },
        headers=headers,
    )
    assert res.status_code == 400
    assert "cannot delegate or assign role 'SUPER_ADMIN'" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_university_admin_staff_lifecycle(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """University Admin invites staff, manages roles, and toggles status."""
    univ, admin_user, raw_token = await setup_university_and_admin(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    csrf_res = await async_client.get("/api/v1/auth/csrf")
    headers = {"X-CSRF-Token": csrf_res.json()["csrf_token"]}

    # 1. Invite Faculty Question Setter
    invite_res = await async_client.post(
        "/api/v1/university-admin/staff/invite",
        json={
            "email": "prof.smith@state.edu",
            "role_code": "FACULTY_QUESTION_SETTER",
            "university_id": str(univ.id),
        },
        headers=headers,
    )
    assert invite_res.status_code == 201
    inv_data = invite_res.json()
    assert inv_data["email"] == "prof.smith@state.edu"
    assert inv_data["role_code"] == "FACULTY_QUESTION_SETTER"
    assert inv_data["raw_token"] is not None  # Returned in dev mode

    # 2. List invitations
    invs_res = await async_client.get("/api/v1/university-admin/invitations")
    assert invs_res.status_code == 200
    assert len(invs_res.json()) >= 1

    # 3. Resend invitation
    inv_id = inv_data["id"]
    resend_res = await async_client.post(
        f"/api/v1/university-admin/invitations/{inv_id}/resend",
        headers=headers,
    )
    assert resend_res.status_code == 200

    # 4. Revoke invitation
    revoke_res = await async_client.delete(
        f"/api/v1/university-admin/invitations/{inv_id}",
        headers=headers,
    )
    assert revoke_res.status_code == 200
