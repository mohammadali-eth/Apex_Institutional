"""Tests for secure domain-based authentication, role assignment, and department isolation."""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.commands.bootstrap import seed_domain_access_system
from app.core.security import hash_password
from app.models.enums import RoleCode, UserStatus
from app.models.organization import Department
from app.models.role import UserRoleAssignment
from app.models.user import User
from app.services.role_service import role_service
from app.services.session_service import session_service


async def create_test_super_admin(db: AsyncSession) -> tuple[User, str]:
    """Helper to provision Super Admin user and active session token."""
    await role_service.seed_role_catalog(db)
    super_role = await role_service.get_role_by_code(db, RoleCode.SUPER_ADMIN)
    assert super_role is not None

    user = User(
        email="superadmin@apex.edu",
        full_name="Super Administrator",
        password_hash=hash_password("SuperSecurePassphrase2026!"),
        status=UserStatus.ACTIVE,
        email_verified_at=datetime.now(UTC),
    )
    db.add(user)
    await db.flush()

    assign = UserRoleAssignment(
        user_id=user.id,
        role_id=super_role.id,
        is_active=True,
    )
    db.add(assign)
    await db.flush()

    _, raw_token = await session_service.create_session(db, user_id=user.id)
    return user, raw_token


@pytest.mark.asyncio
async def test_super_admin_cannot_map_super_admin_role(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Security rule: Super Admin role can NEVER be assigned via domain mapping."""
    _, token = await create_test_super_admin(db_session)
    async_client.cookies.set("qpms_session", token)

    csrf_res = await async_client.get("/api/v1/auth/csrf")
    csrf_token = csrf_res.json()["csrf_token"]

    super_role = await role_service.get_role_by_code(db_session, RoleCode.SUPER_ADMIN)
    assert super_role is not None

    res = await async_client.post(
        "/api/v1/super-admin/domain-mappings",
        json={
            "domain_pattern": "hacker.com",
            "role_id": str(super_role.id),
        },
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res.status_code == 400
    assert "Super Administrator role cannot be assigned" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_domain_mapping_prevents_duplicate_patterns(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Duplicate domain patterns must be rejected to prevent mapping conflicts."""
    _, token = await create_test_super_admin(db_session)
    async_client.cookies.set("qpms_session", token)

    csrf_res = await async_client.get("/api/v1/auth/csrf")
    csrf_token = csrf_res.json()["csrf_token"]

    univ_role = await role_service.get_role_by_code(db_session, RoleCode.UNIVERSITY_ADMIN)
    assert univ_role is not None

    from app.models.enums import OrganizationStatus
    from app.models.organization import University

    univ = University(
        code="DUP-TEST-UNIV",
        name="Duplicate Test University",
        type="State University",
        status=OrganizationStatus.ACTIVE,
    )
    db_session.add(univ)
    await db_session.flush()

    # First creation
    res1 = await async_client.post(
        "/api/v1/super-admin/domain-mappings",
        json={
            "domain_pattern": "testuniv.edu",
            "role_id": str(univ_role.id),
            "university_id": str(univ.id),
        },
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res1.status_code == 201

    # Second creation with identical pattern
    res2 = await async_client.post(
        "/api/v1/super-admin/domain-mappings",
        json={
            "domain_pattern": "testuniv.edu",
            "role_id": str(univ_role.id),
            "university_id": str(univ.id),
        },
        headers={"X-CSRF-Token": csrf_token},
    )
    assert res2.status_code == 400
    assert "already" in res2.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_domain_based_login_and_role_scoping(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test login for:
    - ali@universityadmin.in -> UNIVERSITY_ADMIN
    - ali@bca.hod.in -> DEPARTMENT_ADMIN (BCA)
    - ali@mca.hod.in -> DEPARTMENT_ADMIN (MCA)
    - student@general.in -> STUDENT
    """
    await seed_domain_access_system(db_session)

    # 1. Login ali@universityadmin.in
    res_univ = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "ali@universityadmin.in", "password": "UnivAdmin#Pass2026!"},
    )
    assert res_univ.status_code == 200
    data_univ = res_univ.json()
    assert data_univ["active_role"] == "UNIVERSITY_ADMIN"
    assert data_univ["portal_route"] == "/university-admin"

    # 2. Login ali@bca.hod.in
    res_bca = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "ali@bca.hod.in", "password": "BcaHod#Pass2026!"},
    )
    assert res_bca.status_code == 200
    data_bca = res_bca.json()
    assert data_bca["active_role"] == "DEPARTMENT_ADMIN"
    assert data_bca["portal_route"] == "/dashboard"

    # 3. Login ali@mca.hod.in
    res_mca = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "ali@mca.hod.in", "password": "McaHod#Pass2026!"},
    )
    assert res_mca.status_code == 200
    data_mca = res_mca.json()
    assert data_mca["active_role"] == "DEPARTMENT_ADMIN"
    assert data_mca["portal_route"] == "/dashboard"

    # 4. Login student@general.in
    res_student = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "student@general.in", "password": "Student#Pass2026!"},
    )
    assert res_student.status_code == 200
    data_student = res_student.json()
    assert data_student["active_role"] == "STUDENT"
    assert data_student["portal_route"] == "/public-papers"


@pytest.mark.asyncio
async def test_department_isolation_between_bca_and_mca_hod(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Strict Department Isolation Verification:
    - BCA HOD can access BCA department papers, but gets 403 on MCA department papers.
    - MCA HOD can access MCA department papers, but gets 403 on BCA department papers.
    - University Admin can access both departments.
    """
    await seed_domain_access_system(db_session)

    # Retrieve BCA and MCA department UUIDs
    bca_dept = (
        await db_session.execute(select(Department).where(Department.code == "BCA"))
    ).scalar_one()
    mca_dept = (
        await db_session.execute(select(Department).where(Department.code == "MCA"))
    ).scalar_one()

    # --- Test BCA HOD ---
    res_login_bca = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "ali@bca.hod.in", "password": "BcaHod#Pass2026!"},
    )
    assert res_login_bca.status_code == 200

    # BCA HOD -> BCA papers (Allowed 200)
    res_bca_on_bca = await async_client.get(f"/api/v1/departments/{bca_dept.id}/papers")
    assert res_bca_on_bca.status_code == 200
    assert res_bca_on_bca.json()[0]["department_code"] == "BCA"

    # BCA HOD -> MCA papers (Forbidden 403)
    res_bca_on_mca = await async_client.get(f"/api/v1/departments/{mca_dept.id}/papers")
    assert res_bca_on_mca.status_code == 403
    assert "Access denied" in res_bca_on_mca.json()["error"]["message"]

    # BCA HOD -> Super Admin API (Forbidden 403)
    res_bca_on_admin = await async_client.get("/api/v1/super-admin/stats")
    assert res_bca_on_admin.status_code == 403

    # --- Test MCA HOD ---
    res_login_mca = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "ali@mca.hod.in", "password": "McaHod#Pass2026!"},
    )
    assert res_login_mca.status_code == 200

    # MCA HOD -> MCA papers (Allowed 200)
    res_mca_on_mca = await async_client.get(f"/api/v1/departments/{mca_dept.id}/papers")
    assert res_mca_on_mca.status_code == 200
    assert res_mca_on_mca.json()[0]["department_code"] == "MCA"

    # MCA HOD -> BCA papers (Forbidden 403)
    res_mca_on_bca = await async_client.get(f"/api/v1/departments/{bca_dept.id}/papers")
    assert res_mca_on_bca.status_code == 403
    assert "Access denied" in res_mca_on_bca.json()["error"]["message"]

    # --- Test University Admin ---
    res_login_univ = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "ali@universityadmin.in", "password": "UnivAdmin#Pass2026!"},
    )
    assert res_login_univ.status_code == 200

    # University Admin -> BCA papers (Allowed 200)
    res_univ_on_bca = await async_client.get(f"/api/v1/departments/{bca_dept.id}/papers")
    assert res_univ_on_bca.status_code == 200

    # University Admin -> MCA papers (Allowed 200)
    res_univ_on_mca = await async_client.get(f"/api/v1/departments/{mca_dept.id}/papers")
    assert res_univ_on_mca.status_code == 200

    # University Admin -> Super Admin API (Forbidden 403)
    res_univ_on_super = await async_client.get("/api/v1/super-admin/stats")
    assert res_univ_on_super.status_code == 403


@pytest.mark.asyncio
async def test_unconfigured_domain_registration_and_paper_access(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Users registering with unconfigured domains:
    - Receive Student / General User role with public prep access.
    - Are blocked from administrative routes (403).
    - Can view published previous-year question papers (/public/papers).
    """
    await seed_domain_access_system(db_session)

    # 1. Register user from an unknown/unconfigured domain
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "newstudent@randomexternaldomain.com",
            "password": "Password@123",
            "full_name": "General Student",
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["active_role"] == "STUDENT"
    assert reg_data["portal_route"] == "/public-papers"

    # 2. Access published previous-year question papers (Allowed)
    pub_res = await async_client.get("/api/v1/public/papers")
    assert pub_res.status_code == 200
    papers = pub_res.json()
    assert len(papers) >= 2
    assert any("BCA" in p["department"] for p in papers)

    # 3. Access administrative and scoped department endpoints (Forbidden 403)
    bca_dept = (
        await db_session.execute(select(Department).where(Department.code == "BCA"))
    ).scalar_one()
    blocked_dept = await async_client.get(f"/api/v1/departments/{bca_dept.id}/papers")
    assert blocked_dept.status_code == 403

    blocked_super = await async_client.get("/api/v1/super-admin/universities")
    assert blocked_super.status_code == 403


@pytest.mark.asyncio
async def test_existing_account_role_comes_from_database(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """If an account is already registered, its role & scope strictly come from database,
    never from dynamic or unrestricted domain alteration.
    """
    await seed_domain_access_system(db_session)

    # Fetch pre-seeded student account
    student_user = (
        await db_session.execute(select(User).where(User.email == "student@general.in"))
    ).scalar_one()

    # Verify their DB role assignment is STUDENT
    role_student = await role_service.get_role_by_code(db_session, RoleCode.STUDENT)
    assign_stmt = select(UserRoleAssignment).where(
        UserRoleAssignment.user_id == student_user.id,
        UserRoleAssignment.is_active == True,  # noqa: E712
    )
    assign = (await db_session.execute(assign_stmt)).scalar_one()
    assert assign.role_id == role_student.id

    # Now login
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "student@general.in", "password": "Student#Pass2026!"},
    )
    assert res.status_code == 200
    # Role returned must be STUDENT from database
    assert res.json()["active_role"] == "STUDENT"


@pytest.mark.asyncio
async def test_cross_user_password_isolation(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Security verification:
    - User A can log in with User A's password.
    - User B can log in with User B's password.
    - User A CANNOT log in with User B's password.
    - User B CANNOT log in with User A's password.
    - Failed attempts return generic error and set NO session cookie.
    """
    await seed_domain_access_system(db_session)

    # 1. User A (University Admin) with correct password -> Success
    res_a_ok = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "ali@universityadmin.in", "password": "UnivAdmin#Pass2026!"},
    )
    assert res_a_ok.status_code == 200
    assert "qpms_session" in res_a_ok.cookies

    # Clear cookies
    async_client.cookies.clear()

    # 2. User B (BCA HOD) with correct password -> Success
    res_b_ok = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "ali@bca.hod.in", "password": "BcaHod#Pass2026!"},
    )
    assert res_b_ok.status_code == 200
    assert "qpms_session" in res_b_ok.cookies

    # Clear cookies
    async_client.cookies.clear()

    # 3. User A attempting User B's password -> Rejection (401)
    res_a_bad = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "ali@universityadmin.in", "password": "BcaHod#Pass2026!"},
    )
    assert res_a_bad.status_code == 401
    assert res_a_bad.json()["error"]["message"] == "Invalid email or password."
    assert "qpms_session" not in res_a_bad.cookies

    # 4. User B attempting User A's password -> Rejection (401)
    res_b_bad = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "ali@bca.hod.in", "password": "UnivAdmin#Pass2026!"},
    )
    assert res_b_bad.status_code == 401
    assert res_b_bad.json()["error"]["message"] == "Invalid email or password."
    assert "qpms_session" not in res_b_bad.cookies


@pytest.mark.asyncio
async def test_unknown_email_cannot_authenticate_with_default_password(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Security verification:
    - An unknown email address cannot authenticate using a default password.
    - Login must NEVER auto-provision accounts on unauthenticated login attempts.
    """
    await seed_domain_access_system(db_session)

    unknown_email = "nonexistent_intruder@randomdomain.com"

    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": unknown_email, "password": "Password@123"},
    )
    assert res.status_code == 401
    assert res.json()["error"]["message"] == "Invalid email or password."
    assert "qpms_session" not in res.cookies

    # Verify that the account was NOT created in the database
    check_stmt = select(User).where(User.email == unknown_email)
    created_user = (await db_session.execute(check_stmt)).scalar_one_or_none()
    assert created_user is None


@pytest.mark.asyncio
async def test_password_hashes_never_exposed_in_api(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Security verification:
    - Password hashes or plaintext passwords must NEVER be present in login, registration, or profile APIs.
    """
    await seed_domain_access_system(db_session)

    # 1. Login API response inspection
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "ali@universityadmin.in", "password": "UnivAdmin#Pass2026!"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "password" not in login_data
    assert "password_hash" not in login_data

    # 2. Me API response inspection
    me_res = await async_client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert "password" not in me_data
    assert "password_hash" not in me_data

    # 3. Registration API response inspection
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "freshstudent@testapex.org",
            "password": "FreshSecureStudent2026!",
            "full_name": "Fresh Student",
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "password" not in reg_data
    assert "password_hash" not in reg_data

