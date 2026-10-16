"""Integration tests for staff invitation verification, acceptance, and role-aware login routing."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.test_university_admin import setup_university_and_admin


@pytest.mark.asyncio
async def test_invitation_verification_and_activation_flow(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Full lifecycle: Invite staff -> Verify token -> Accept -> Login -> /me portal routing."""
    # 1. Setup University and Admin
    univ, _, admin_token = await setup_university_and_admin(db_session)
    async_client.cookies.set("qpms_session", admin_token)

    csrf_res = await async_client.get("/api/v1/auth/csrf")
    headers = {"X-CSRF-Token": csrf_res.json()["csrf_token"]}

    # 2. Issue Invitation
    invite_res = await async_client.post(
        "/api/v1/university-admin/staff/invite",
        json={
            "email": "moderator@state.edu",
            "role_code": "QUESTION_PAPER_REVIEWER",
            "university_id": str(univ.id),
        },
        headers=headers,
    )
    assert invite_res.status_code == 201
    raw_token = invite_res.json()["raw_token"]
    assert raw_token is not None

    # Clear admin cookie so client is unauthenticated
    async_client.cookies.clear()

    # 3. Verify Invitation Token (public endpoint)
    verify_res = await async_client.get(f"/api/v1/auth/invitation/verify?token={raw_token}")
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["valid"] is True
    assert verify_data["email"] == "moderator@state.edu"
    assert verify_data["role_code"] == "QUESTION_PAPER_REVIEWER"
    assert verify_data["university_name"] == univ.name

    # 4. Attempt to accept with too-short password (fails policy)
    short_pass_res = await async_client.post(
        "/api/v1/auth/invitation/accept",
        json={
            "token": raw_token,
            "password": "short",
            "full_name": "Dr. Moderator",
        },
    )
    assert short_pass_res.status_code == 422  # Pydantic schema validation

    # 5. Accept invitation with valid password
    accept_res = await async_client.post(
        "/api/v1/auth/invitation/accept",
        json={
            "token": raw_token,
            "password": "ModeratorSecurePass2026!",
            "full_name": "Dr. Moderator",
        },
    )
    assert accept_res.status_code == 200
    assert "successfully activated" in accept_res.json()["message"]

    # 6. Verify single-use: second attempt fails
    second_accept = await async_client.post(
        "/api/v1/auth/invitation/accept",
        json={
            "token": raw_token,
            "password": "ModeratorSecurePass2026!",
            "full_name": "Dr. Moderator",
        },
    )
    assert second_accept.status_code == 400

    # 7. Authenticate as newly activated staff member
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": "moderator@state.edu",
            "password": "ModeratorSecurePass2026!",
        },
    )
    assert login_res.status_code == 200
    user_data = login_res.json()
    assert user_data["email"] == "moderator@state.edu"
    assert user_data["full_name"] == "Dr. Moderator"
    assert user_data["portal_route"] == "/workspace"
    assert user_data["active_role"] == "QUESTION_PAPER_REVIEWER"
    assert len(user_data["roles"]) == 1
    assert user_data["roles"][0]["role_code"] == "QUESTION_PAPER_REVIEWER"
    assert user_data["roles"][0]["university_name"] == univ.name

    # 8. Verify /me endpoint reflects identical safe authorization context
    me_res = await async_client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["portal_route"] == "/workspace"
    assert me_data["active_role"] == "QUESTION_PAPER_REVIEWER"
