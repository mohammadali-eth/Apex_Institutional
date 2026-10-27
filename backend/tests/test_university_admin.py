"""Integration and security tests for University Administrator portal endpoints."""

from datetime import UTC, datetime

import pytest
from app.core.security import hash_password
from app.models.domain_mapping import DomainRoleMapping
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


@pytest.mark.asyncio
async def test_university_admin_list_authorized_domains(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """University Admin can retrieve active authorized domain patterns for their university."""
    univ, admin_user, raw_token = await setup_university_and_admin(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    fqs_role = await role_service.get_role_by_code(db_session, RoleCode.FACULTY_QUESTION_SETTER)
    assert fqs_role is not None

    mapping1 = DomainRoleMapping(
        domain_pattern="state.edu",
        role_id=fqs_role.id,
        university_id=univ.id,
        is_active=True,
    )
    mapping2 = DomainRoleMapping(
        domain_pattern="cs.state.edu",
        role_id=fqs_role.id,
        university_id=univ.id,
        is_active=True,
    )
    db_session.add_all([mapping1, mapping2])
    await db_session.flush()

    res = await async_client.get("/api/v1/university-admin/domains")
    assert res.status_code == 200
    domains = res.json()
    assert "state.edu" in domains
    assert "cs.state.edu" in domains


@pytest.mark.asyncio
async def test_university_admin_provision_staff_success_and_login(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """University Admin provisions staff with custom email and password within authorized domain; user can log in."""
    univ, admin_user, raw_token = await setup_university_and_admin(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    # Configure domain mapping for state.edu
    fqs_role = await role_service.get_role_by_code(db_session, RoleCode.FACULTY_QUESTION_SETTER)
    assert fqs_role is not None
    mapping = DomainRoleMapping(
        domain_pattern="state.edu",
        role_id=fqs_role.id,
        university_id=univ.id,
        is_active=True,
    )
    db_session.add(mapping)
    await db_session.flush()

    csrf_res = await async_client.get("/api/v1/auth/csrf")
    headers = {"X-CSRF-Token": csrf_res.json()["csrf_token"]}

    # Custom email (arbitrary prefix) and custom password chosen by admin
    custom_email = "custom.prof.sharma@state.edu"
    custom_password = "Prof#SecurePassphrase2026!"

    prov_res = await async_client.post(
        "/api/v1/university-admin/staff",
        json={
            "email": custom_email,
            "password": custom_password,
            "full_name": "Prof Sharma",
            "role_code": "FACULTY_QUESTION_SETTER",
            "university_id": str(univ.id),
        },
        headers=headers,
    )
    assert prov_res.status_code == 201
    prov_data = prov_res.json()
    assert prov_data["email"] == custom_email
    assert prov_data["full_name"] == "Prof Sharma"
    assert any(r["role_code"] == "FACULTY_QUESTION_SETTER" for r in prov_data["roles"])

    # Now verify the newly provisioned staff member can immediately log in
    async_client.cookies.clear()
    login_csrf_res = await async_client.get("/api/v1/auth/csrf")
    login_headers = {"X-CSRF-Token": login_csrf_res.json()["csrf_token"]}

    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": custom_email,
            "password": custom_password,
        },
        headers=login_headers,
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["email"] == custom_email
    assert login_data["active_role"] == "FACULTY_QUESTION_SETTER"


@pytest.mark.asyncio
async def test_university_admin_provision_staff_unauthorized_domain_fails(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """University Admin cannot provision staff with an email from an unauthorized domain ('only fix domain')."""
    univ, admin_user, raw_token = await setup_university_and_admin(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    # Configure domain mapping only for state.edu
    fqs_role = await role_service.get_role_by_code(db_session, RoleCode.FACULTY_QUESTION_SETTER)
    assert fqs_role is not None
    mapping = DomainRoleMapping(
        domain_pattern="state.edu",
        role_id=fqs_role.id,
        university_id=univ.id,
        is_active=True,
    )
    db_session.add(mapping)
    await db_session.flush()

    csrf_res = await async_client.get("/api/v1/auth/csrf")
    headers = {"X-CSRF-Token": csrf_res.json()["csrf_token"]}

    # Try provisioning with unauthorized domain @gmail.com
    res = await async_client.post(
        "/api/v1/university-admin/staff",
        json={
            "email": "hacker@gmail.com",
            "password": "Valid#Password2026!",
            "full_name": "Unauthorized User",
            "role_code": "FACULTY_QUESTION_SETTER",
            "university_id": str(univ.id),
        },
        headers=headers,
    )
    assert res.status_code == 400
    assert "not authorized for this university" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_university_admin_provision_staff_weak_password_fails(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """University Admin cannot set passwords that violate NIST policy."""
    univ, admin_user, raw_token = await setup_university_and_admin(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    fqs_role = await role_service.get_role_by_code(db_session, RoleCode.FACULTY_QUESTION_SETTER)
    assert fqs_role is not None
    mapping = DomainRoleMapping(
        domain_pattern="state.edu",
        role_id=fqs_role.id,
        university_id=univ.id,
        is_active=True,
    )
    db_session.add(mapping)
    await db_session.flush()

    csrf_res = await async_client.get("/api/v1/auth/csrf")
    headers = {"X-CSRF-Token": csrf_res.json()["csrf_token"]}

    # 1. Pydantic schema validation rejects passwords < 8 chars
    res_short = await async_client.post(
        "/api/v1/university-admin/staff",
        json={
            "email": "teacher1@state.edu",
            "password": "short",
            "full_name": "Teacher One",
            "role_code": "FACULTY_QUESTION_SETTER",
            "university_id": str(univ.id),
        },
        headers=headers,
    )
    assert res_short.status_code == 422

    # 2. NIST SP 800-63B policy check rejects easily guessable passwords
    res_guessable = await async_client.post(
        "/api/v1/university-admin/staff",
        json={
            "email": "teacher2@state.edu",
            "password": "password123456",
            "full_name": "Teacher Two",
            "role_code": "FACULTY_QUESTION_SETTER",
            "university_id": str(univ.id),
        },
        headers=headers,
    )
    assert res_guessable.status_code == 400
    assert "too common or easily guessable" in res_guessable.json()["error"]["message"]


@pytest.mark.asyncio
async def test_university_admin_update_staff_success(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """University Admin can edit staff member name, role, status, and reset their password."""
    univ, admin_user, raw_token = await setup_university_and_admin(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    fqs_role = await role_service.get_role_by_code(db_session, RoleCode.FACULTY_QUESTION_SETTER)
    dept_role = await role_service.get_role_by_code(db_session, RoleCode.DEPARTMENT_ADMIN)
    assert fqs_role is not None and dept_role is not None

    mapping = DomainRoleMapping(
        domain_pattern="state.edu",
        role_id=fqs_role.id,
        university_id=univ.id,
        is_active=True,
    )
    db_session.add(mapping)
    await db_session.flush()

    csrf_res = await async_client.get("/api/v1/auth/csrf")
    headers = {"X-CSRF-Token": csrf_res.json()["csrf_token"]}

    # Provision initial staff
    initial_email = "staff.initial@state.edu"
    initial_pass = "Initial#Password2026!"
    prov_res = await async_client.post(
        "/api/v1/university-admin/staff",
        json={
            "email": initial_email,
            "password": initial_pass,
            "full_name": "Initial Name",
            "role_code": "FACULTY_QUESTION_SETTER",
            "university_id": str(univ.id),
        },
        headers=headers,
    )
    assert prov_res.status_code == 201
    target_user_id = prov_res.json()["id"]

    # Now edit staff: change name, status to disabled, and new password
    new_email = "staff.updated@state.edu"
    new_pass = "Updated#SecurePassword2026!"
    patch_res = await async_client.patch(
        f"/api/v1/university-admin/staff/{target_user_id}",
        json={
            "full_name": "Updated Name",
            "email": new_email,
            "role_code": "FACULTY_QUESTION_SETTER",
            "status": "disabled",
            "password": new_pass,
        },
        headers=headers,
    )
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["full_name"] == "Updated Name"
    assert patch_data["email"] == new_email
    assert patch_data["status"] == "disabled"

    # Reactivate the user
    reactivate_res = await async_client.patch(
        f"/api/v1/university-admin/staff/{target_user_id}",
        json={
            "status": "active",
        },
        headers=headers,
    )
    assert reactivate_res.status_code == 200
    assert reactivate_res.json()["status"] == "active"

    # Verify user can log in with new email and new password
    async_client.cookies.clear()
    login_csrf_res = await async_client.get("/api/v1/auth/csrf")
    login_headers = {"X-CSRF-Token": login_csrf_res.json()["csrf_token"]}

    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": new_email,
            "password": new_pass,
        },
        headers=login_headers,
    )
    assert login_res.status_code == 200
    assert login_res.json()["email"] == new_email


@pytest.mark.asyncio
async def test_university_admin_update_staff_domain_validation(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Updating email to an unauthorized domain fails with 400."""
    univ, admin_user, raw_token = await setup_university_and_admin(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    fqs_role = await role_service.get_role_by_code(db_session, RoleCode.FACULTY_QUESTION_SETTER)
    assert fqs_role is not None
    mapping = DomainRoleMapping(
        domain_pattern="state.edu",
        role_id=fqs_role.id,
        university_id=univ.id,
        is_active=True,
    )
    db_session.add(mapping)
    await db_session.flush()

    csrf_res = await async_client.get("/api/v1/auth/csrf")
    headers = {"X-CSRF-Token": csrf_res.json()["csrf_token"]}

    prov_res = await async_client.post(
        "/api/v1/university-admin/staff",
        json={
            "email": "teacher.domain@state.edu",
            "password": "Valid#Password2026!",
            "full_name": "Teacher Domain",
            "role_code": "FACULTY_QUESTION_SETTER",
            "university_id": str(univ.id),
        },
        headers=headers,
    )
    assert prov_res.status_code == 201
    target_user_id = prov_res.json()["id"]

    # Try changing email to unauthorized domain
    bad_res = await async_client.patch(
        f"/api/v1/university-admin/staff/{target_user_id}",
        json={
            "email": "teacher.domain@unauthorized.com",
        },
        headers=headers,
    )
    assert bad_res.status_code == 400
    assert "not authorized for this university" in bad_res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_university_admin_delete_staff_success_and_self_delete_guard(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """University admin can delete staff member; self-deletion is strictly blocked."""
    univ, admin_user, raw_token = await setup_university_and_admin(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    fqs_role = await role_service.get_role_by_code(db_session, RoleCode.FACULTY_QUESTION_SETTER)
    assert fqs_role is not None
    mapping = DomainRoleMapping(
        domain_pattern="state.edu",
        role_id=fqs_role.id,
        university_id=univ.id,
        is_active=True,
    )
    db_session.add(mapping)
    await db_session.flush()

    csrf_res = await async_client.get("/api/v1/auth/csrf")
    headers = {"X-CSRF-Token": csrf_res.json()["csrf_token"]}

    # 1. Provision target user
    prov_res = await async_client.post(
        "/api/v1/university-admin/staff",
        json={
            "email": "delete.me@state.edu",
            "password": "Valid#Password2026!",
            "full_name": "Delete Target",
            "role_code": "FACULTY_QUESTION_SETTER",
            "university_id": str(univ.id),
        },
        headers=headers,
    )
    assert prov_res.status_code == 201
    target_user_id = prov_res.json()["id"]

    # 2. Delete target user
    del_res = await async_client.delete(
        f"/api/v1/university-admin/staff/{target_user_id}",
        headers=headers,
    )
    assert del_res.status_code == 200
    assert "successfully removed" in del_res.json()["message"]

    # Confirm user is deleted from university staff list
    list_res = await async_client.get("/api/v1/university-admin/staff")
    assert list_res.status_code == 200
    staff_ids = [s["id"] for s in list_res.json()]
    assert target_user_id not in staff_ids

    # 3. Attempt self-deletion by University Admin -> must be rejected
    self_del_res = await async_client.delete(
        f"/api/v1/university-admin/staff/{admin_user.id}",
        headers=headers,
    )
    assert self_del_res.status_code == 400
    assert "You cannot delete your own administrative account" in self_del_res.json()["error"]["message"]



