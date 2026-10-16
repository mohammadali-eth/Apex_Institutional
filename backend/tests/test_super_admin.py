"""Integration and security tests for Super Administrator portal endpoints."""

from datetime import UTC, datetime

import pytest
from app.core.security import hash_password
from app.models.enums import RoleCode, UserStatus
from app.models.role import UserRoleAssignment
from app.models.user import User
from app.services.role_service import role_service
from app.services.session_service import session_service
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


async def create_test_super_admin(db: AsyncSession) -> tuple[User, str]:
    """Helper to provision a Super Admin user and active session token."""
    await role_service.seed_role_catalog(db)
    super_role = await role_service.get_role_by_code(db, RoleCode.SUPER_ADMIN)
    assert super_role is not None

    user = User(
        email="superadmin@apex.edu",
        full_name="Super Admin",
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


async def create_regular_user(db: AsyncSession) -> tuple[User, str]:
    """Helper to create a standard non-admin user and active session."""
    user = User(
        email="regular@apex.edu",
        full_name="Regular Staff",
        password_hash=hash_password("StandardPassword2026!"),
        status=UserStatus.ACTIVE,
        email_verified_at=datetime.now(UTC),
    )
    db.add(user)
    await db.flush()

    _, raw_token = await session_service.create_session(db, user_id=user.id)
    return user, raw_token


@pytest.mark.asyncio
async def test_super_admin_requires_authentication(async_client: AsyncClient) -> None:
    """Unauthenticated calls to /super-admin must be rejected with 401."""
    res = await async_client.get("/api/v1/super-admin/universities")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_super_admin_denies_regular_user(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Non-super admin user receives 403 Forbidden."""
    _, raw_token = await create_regular_user(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    res = await async_client.get("/api/v1/super-admin/universities")
    assert res.status_code == 403
    assert "Super Administrator privileges required" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_super_admin_manage_universities_and_admins(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Super Admin can create a university, an institution, and provision a University Admin."""
    _, raw_token = await create_test_super_admin(db_session)
    async_client.cookies.set("qpms_session", raw_token)

    # 1. Obtain CSRF Token
    csrf_res = await async_client.get("/api/v1/auth/csrf")
    csrf_token = csrf_res.json()["csrf_token"]
    headers = {"X-CSRF-Token": csrf_token}

    # 2. Register University
    create_univ_res = await async_client.post(
        "/api/v1/super-admin/universities",
        json={
            "code": "TECH-UNIV",
            "name": "Institute of Technology University",
            "type": "State University",
            "region": "Northern Region",
            "address": "42 Campus Avenue",
        },
        headers=headers,
    )
    assert create_univ_res.status_code == 201
    univ_data = create_univ_res.json()
    univ_id = univ_data["id"]
    assert univ_data["code"] == "TECH-UNIV"

    # 3. List universities
    list_univ_res = await async_client.get("/api/v1/super-admin/universities")
    assert list_univ_res.status_code == 200
    assert any(u["code"] == "TECH-UNIV" for u in list_univ_res.json())

    # 4. Create Institution under university
    inst_res = await async_client.post(
        f"/api/v1/super-admin/universities/{univ_id}/institutions",
        json={
            "code": "ENG-COLLEGE",
            "name": "College of Engineering",
            "type": "Engineering College",
            "contact_email": "dean@eng.tech.edu",
        },
        headers=headers,
    )
    assert inst_res.status_code == 201
    assert inst_res.json()["code"] == "ENG-COLLEGE"

    # 5. Provision University Admin
    admin_res = await async_client.post(
        "/api/v1/super-admin/admins",
        json={
            "email": "univ_admin@tech.edu",
            "full_name": "Dean Admin",
            "university_id": univ_id,
            "password": "SecureUnivAdminPass2026!",
        },
        headers=headers,
    )
    assert admin_res.status_code == 201
    admin_data = admin_res.json()
    assert admin_data["email"] == "univ_admin@tech.edu"
    assert any(
        r["role_code"] == "UNIVERSITY_ADMIN" and r["university_id"] == univ_id
        for r in admin_data["roles"]
    )

    # 6. Suspend University Admin
    admin_user_id = admin_data["id"]
    status_res = await async_client.patch(
        f"/api/v1/super-admin/admins/{admin_user_id}/status",
        json={"status": "disabled"},
        headers=headers,
    )
    assert status_res.status_code == 200

    # 7. Operational stats
    stats_res = await async_client.get("/api/v1/super-admin/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_universities"] >= 1
    assert stats["total_institutions"] >= 1
