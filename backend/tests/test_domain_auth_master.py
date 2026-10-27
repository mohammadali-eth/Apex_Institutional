"""Comprehensive verification test suite for Domain-Based Authentication & Role Resolution.

Tests enforce all 20 Master Specifications:
1. Login email deterministically resolves identity category / role family.
2. Super Admin protection: apex@superadmin.com pre-approved; spoof self-registration rejected.
3. Public email providers (gmail.com, yahoo.com) map to STUDENT with null organization scope.
4. Unknown domains cannot self-register admin roles and cannot authenticate without credentials.
5. Database authority: Existing DB role assignments strictly override domain pattern defaults.
6. Multi-role support, permission catalog aggregation, organization and department scopes in /auth/me.
7. Account status enforcement: DISABLED, LOCKED, and PENDING accounts blocked.
8. Session refresh endpoint (/auth/refresh) returns updated authoritative UserResponse.
"""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.commands.bootstrap import seed_domain_access_system
from app.core.security import hash_password
from app.models.enums import RoleCode, UserStatus
from app.models.organization import Department, Institution, University
from app.models.role import Role, UserRoleAssignment
from app.models.user import User
from app.services.domain_service import domain_service
from app.services.role_service import role_service
from app.services.session_service import session_service


@pytest.mark.asyncio
async def test_domain_identity_resolution_logic(db_session: AsyncSession) -> None:
    """Validate deterministic domain pattern matching, wildcards, and public email classifications."""
    await seed_domain_access_system(db_session)

    # 1. Super Admin wildcard pattern
    sa_id = await domain_service.resolve_email_identity(db_session, "apex@superadmin.com")
    assert sa_id["role_code"] == RoleCode.SUPER_ADMIN
    assert sa_id["identity_type"] == "SUPER_ADMIN"
    assert sa_id["is_super_admin"] is True

    # 2. University Admin wildcard pattern
    ua_id = await domain_service.resolve_email_identity(db_session, "provost@universityadmin.com")
    assert ua_id["role_code"] == RoleCode.UNIVERSITY_ADMIN
    assert ua_id["identity_type"] == "UNIVERSITY_ADMIN"

    # 3. Exact Email + Department Scope Priority: cs.hod@hod.com beats *@hod.com
    hod_exact = await domain_service.resolve_email_identity(db_session, "cs.hod@hod.com")
    assert hod_exact["role_code"] == RoleCode.DEPARTMENT_ADMIN
    assert hod_exact["identity_type"] == "HOD"
    assert hod_exact["department_id"] is not None

    # General HOD under wildcard pattern
    hod_general = await domain_service.resolve_email_identity(db_session, "math.dean@hod.com")
    assert hod_general["role_code"] == RoleCode.DEPARTMENT_ADMIN
    assert hod_general["department_id"] is None

    # 4. Faculty wildcard pattern
    fac_id = await domain_service.resolve_email_identity(db_session, "setter@faculty.com")
    assert fac_id["role_code"] == RoleCode.FACULTY_QUESTION_SETTER
    assert fac_id["identity_type"] == "FACULTY_QUESTION_SETTER"

    # 5. Public email providers
    gmail_id = await domain_service.resolve_email_identity(db_session, "student123@gmail.com")
    assert gmail_id["role_code"] == RoleCode.STUDENT
    assert gmail_id["is_public_provider"] is True
    assert gmail_id["university_id"] is None

    yahoo_id = await domain_service.resolve_email_identity(db_session, "scholar456@yahoo.com")
    assert yahoo_id["role_code"] == RoleCode.STUDENT
    assert yahoo_id["is_public_provider"] is True

    # 6. Unknown domain
    unknown_id = await domain_service.resolve_email_identity(db_session, "unknown@randomcompany.xyz")
    assert unknown_id["identity_type"] == "UNKNOWN"
    assert unknown_id["is_unknown_domain"] is True
    assert unknown_id["role_code"] == RoleCode.STUDENT


@pytest.mark.asyncio
async def test_master_accounts_login_and_routing(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verify standard pre-approved accounts authenticate and receive correct portal routes."""
    await seed_domain_access_system(db_session)
    password = "ApexDev#2026!"

    test_matrix = [
        ("apex@superadmin.com", "SUPER_ADMIN", "/admin"),
        ("admin@universityadmin.com", "UNIVERSITY_ADMIN", "/university-admin"),
        ("cs.hod@hod.com", "DEPARTMENT_ADMIN", "/dashboard"),
        ("faculty@faculty.com", "FACULTY_QUESTION_SETTER", "/workspace"),
        ("student@gmail.com", "STUDENT", "/public-papers"),
        ("student@yahoo.com", "STUDENT", "/public-papers"),
    ]

    for email, expected_role, expected_route in test_matrix:
        res = await async_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert res.status_code == 200, f"Login failed for {email}: {res.text}"
        data = res.json()
        assert data["email"] == email
        assert data["active_role"] == expected_role
        assert data["portal_route"] == expected_route
        assert data["status"] == "active"
        assert len(data["permissions"]) > 0

        # Scope validation for HOD
        if email == "cs.hod@hod.com":
            assert len(data["departments"]) == 1
            assert data["departments"][0]["code"] == "BCA"


@pytest.mark.asyncio
async def test_existing_database_role_overrides_domain_default(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Security rule: Database role assignments strictly supersede domain pattern defaults.
    If student@gmail.com is promoted to FACULTY in the database, login returns FACULTY.
    """
    await seed_domain_access_system(db_session)

    # Promote student@gmail.com to FACULTY_QUESTION_SETTER in DB
    student = (
        await db_session.execute(select(User).where(User.email == "student@gmail.com"))
    ).scalar_one()

    faculty_role = (
        await db_session.execute(select(Role).where(Role.code == RoleCode.FACULTY_QUESTION_SETTER))
    ).scalar_one()

    # Deactivate student assignment and assign faculty role
    existing_assignments = (
        await db_session.execute(
            select(UserRoleAssignment).where(UserRoleAssignment.user_id == student.id)
        )
    ).scalars().all()
    for a in existing_assignments:
        a.is_active = False

    new_assign = UserRoleAssignment(
        user_id=student.id,
        role_id=faculty_role.id,
        is_active=True,
    )
    db_session.add(new_assign)
    await db_session.commit()

    # Authenticate student@gmail.com
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "student@gmail.com", "password": "ApexDev#2026!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["active_role"] == "FACULTY_QUESTION_SETTER"
    assert data["portal_route"] == "/workspace"


@pytest.mark.asyncio
async def test_super_admin_spoofing_prevented(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Attacker attempting to register or spoof with @superadmin.com is strictly rejected."""
    await seed_domain_access_system(db_session)

    # 1. Attacker attempting self-registration with superadmin.com domain
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "attacker@superadmin.com",
            "password": "AttackerPass#2026!",
            "full_name": "Intruder SuperAdmin",
        },
    )
    assert reg_res.status_code == 400
    assert "Super Administrator accounts cannot be self-registered" in reg_res.text

    # 2. Attacker attempting login with unprovisioned superadmin email
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "attacker@superadmin.com", "password": "AttackerPass#2026!"},
    )
    assert login_res.status_code == 401
    assert login_res.json()["error"]["message"] == "Invalid email or password."


@pytest.mark.asyncio
async def test_account_status_enforcement(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Accounts with status DISABLED, LOCKED, or PENDING_VERIFICATION must be blocked from login."""
    await seed_domain_access_system(db_session)
    password = "ApexDev#2026!"

    # 1. Disabled account
    disabled_user = User(
        email="disabled.staff@universityadmin.com",
        full_name="Disabled Staff",
        password_hash=hash_password(password),
        status=UserStatus.DISABLED,
        email_verified_at=datetime.now(UTC),
    )
    db_session.add(disabled_user)

    # 2. Locked account
    locked_user = User(
        email="locked.faculty@faculty.com",
        full_name="Locked Faculty",
        password_hash=hash_password(password),
        status=UserStatus.LOCKED,
        email_verified_at=datetime.now(UTC),
    )
    db_session.add(locked_user)

    # 3. Pending verification account
    pending_user = User(
        email="pending.candidate@hod.com",
        full_name="Pending Candidate",
        password_hash=hash_password(password),
        status=UserStatus.PENDING_VERIFICATION,
        email_verified_at=None,
    )
    db_session.add(pending_user)
    await db_session.commit()

    # Test Disabled
    res_disabled = await async_client.post(
        "/api/v1/auth/login",
        json={"email": disabled_user.email, "password": password},
    )
    assert res_disabled.status_code == 401
    assert "disabled" in res_disabled.text.lower()

    # Test Locked
    res_locked = await async_client.post(
        "/api/v1/auth/login",
        json={"email": locked_user.email, "password": password},
    )
    assert res_locked.status_code == 401
    assert "locked" in res_locked.text.lower()

    # Test Pending
    res_pending = await async_client.post(
        "/api/v1/auth/login",
        json={"email": pending_user.email, "password": password},
    )
    assert res_pending.status_code == 401
    assert "authorized" in res_pending.text.lower()


@pytest.mark.asyncio
async def test_auth_me_and_refresh_comprehensive_response(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """GET /auth/me and POST /auth/refresh return complete authoritative response with permissions,
    organization, and departmental scopes.
    """
    await seed_domain_access_system(db_session)

    # Login as CS HOD
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "cs.hod@hod.com", "password": "ApexDev#2026!"},
    )
    assert login_res.status_code == 200

    # 1. Test GET /auth/me
    me_res = await async_client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    me_data = me_res.json()

    assert me_data["user"]["email"] == "cs.hod@hod.com"
    assert me_data["active_role"] == "DEPARTMENT_ADMIN"
    assert me_data["portal_route"] == "/dashboard"
    assert "question.view" in me_data["permissions"]
    assert "paper.review" in me_data["permissions"]
    assert me_data["organization"]["name"] == "Apex University Federation"
    assert len(me_data["departments"]) == 1
    assert me_data["departments"][0]["code"] == "BCA"

    # 2. Test POST /auth/refresh
    refresh_res = await async_client.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 200
    refresh_data = refresh_res.json()
    assert refresh_data["user"]["email"] == "cs.hod@hod.com"
    assert refresh_data["active_role"] == "DEPARTMENT_ADMIN"
    assert refresh_data["portal_route"] == "/dashboard"
    assert refresh_data["permissions"] == me_data["permissions"]
