import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(email: str = "apex@superadmin.com", password: str = "Admin@12345") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["data"]["access_token"]

def test_super_admin_search_and_filter_universities():
    sa_token = get_auth_token("apex@superadmin.com")
    headers = {"Authorization": f"Bearer {sa_token}"}

    # 1. Fetch all
    res = client.get("/api/v1/universities", headers=headers)
    assert res.status_code == 200
    all_univs = res.json()["data"]
    assert len(all_univs) >= 1

    # 2. Search query filter
    first_code = all_univs[0]["code"]
    res_search = client.get(f"/api/v1/universities?search={first_code}", headers=headers)
    assert res_search.status_code == 200
    matched = res_search.json()["data"]
    assert any(u["code"] == first_code for u in matched)

    # 3. Status filter
    res_active = client.get("/api/v1/universities?status=ACTIVE", headers=headers)
    assert res_active.status_code == 200
    for u in res_active.json()["data"]:
        assert u["is_active"] is True

def test_atomic_university_with_admin_creation_and_login():
    sa_token = get_auth_token("apex@superadmin.com")
    headers = {"Authorization": f"Bearer {sa_token}"}

    import uuid
    uid = uuid.uuid4().hex[:6]
    univ_code = f"TAU_{uid}".upper()
    admin_email = f"admin_{uid}@tau.edu"

    payload = {
        "name": f"Test Apex University {uid}",
        "code": univ_code,
        "type": "STATE",
        "state": "Karnataka",
        "country": "India",
        "website": f"https://tau-{uid}.edu",
        "email": f"contact@{univ_code.lower()}.edu",
        "phone": "+91 9876543210",
        "admin_full_name": f"Chancellor Admin {uid}",
        "admin_email": admin_email,
        "admin_password": "UnivAdminPass@2026",
        "admin_phone": "+91 9876543211",
    }

    res = client.post("/api/v1/universities/with-admin", json=payload, headers=headers)
    assert res.status_code == 200, f"Creation failed: {res.text}"
    created_univ = res.json()["data"]
    assert created_univ["code"] == univ_code
    univ_id = created_univ["id"]

    # Verify newly created university admin can log in
    admin_login_res = client.post("/api/v1/auth/login", json={
        "email": admin_email,
        "password": "UnivAdminPass@2026"
    })
    assert admin_login_res.status_code == 200
    admin_token = admin_login_res.json()["data"]["access_token"]
    assert admin_token is not None

    # Verify details endpoint
    details_res = client.get(f"/api/v1/universities/{univ_id}/details", headers=headers)
    assert details_res.status_code == 200
    details = details_res.json()["data"]
    assert details["code"] == univ_code
    assert len(details["admins"]) >= 1
    assert any(a["email"] == admin_email for a in details["admins"])

    # Test duplicate code rollback
    dup_res = client.post("/api/v1/universities/with-admin", json=payload, headers=headers)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["message"]

def test_provision_additional_university_admin():
    sa_token = get_auth_token("apex@superadmin.com")
    headers = {"Authorization": f"Bearer {sa_token}"}

    # Fetch first university
    res = client.get("/api/v1/universities", headers=headers)
    univ_id = res.json()["data"][0]["id"]

    import uuid
    uid = uuid.uuid4().hex[:6]
    new_admin_email = f"co_admin_{uid}@univ.edu"

    admin_payload = {
        "full_name": f"Vice Admin {uid}",
        "email": new_admin_email,
        "password": "CoAdminSecure@2026",
        "phone": "+91 9998887770"
    }

    prov_res = client.post(f"/api/v1/universities/{univ_id}/admins", json=admin_payload, headers=headers)
    assert prov_res.status_code == 200, f"Provisioning failed: {prov_res.text}"
    prov_data = prov_res.json()["data"]
    assert prov_data["email"] == new_admin_email

    # Verify login
    login_res = client.post("/api/v1/auth/login", json={
        "email": new_admin_email,
        "password": "CoAdminSecure@2026"
    })
    assert login_res.status_code == 200

def test_university_suspension_immediate_lockout_and_restoration():
    sa_token = get_auth_token("apex@superadmin.com")
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    import uuid
    uid = uuid.uuid4().hex[:6]
    univ_code = f"SUSP_{uid}".upper()
    admin_email = f"susp_admin_{uid}@susp.edu"
    admin_pass = "SuspPass@12345"

    # 1. Create a dedicated university and admin
    univ_payload = {
        "name": f"Suspension Test University {uid}",
        "code": univ_code,
        "type": "STATE",
        "admin_full_name": f"Dean {uid}",
        "admin_email": admin_email,
        "admin_password": admin_pass,
    }
    create_res = client.post("/api/v1/universities/with-admin", json=univ_payload, headers=sa_headers)
    assert create_res.status_code == 200
    univ_id = create_res.json()["data"]["id"]

    # 2. Login to get a valid token while university is ACTIVE
    login_res = client.post("/api/v1/auth/login", json={"email": admin_email, "password": admin_pass})
    assert login_res.status_code == 200
    active_token = login_res.json()["data"]["access_token"]
    user_headers = {"Authorization": f"Bearer {active_token}"}

    # Verify user token can access protected endpoint
    me_res = client.get("/api/v1/auth/me", headers=user_headers)
    assert me_res.status_code == 200

    # 3. Super Admin SUSPENDS the university
    susp_res = client.post(f"/api/v1/universities/{univ_id}/suspend", json={"reason": "Audit suspension"}, headers=sa_headers)
    assert susp_res.status_code == 200
    assert susp_res.json()["data"]["is_active"] is False

    # 4. Immediate Token Lockout: The previously valid token MUST be rejected with HTTP 403 Forbidden
    blocked_res = client.get("/api/v1/auth/me", headers=user_headers)
    assert blocked_res.status_code == 403
    assert "suspended" in blocked_res.json()["message"].lower()

    # 5. Immediate Login Lockout: Login attempts MUST also be rejected with HTTP 403 Forbidden
    blocked_login_res = client.post("/api/v1/auth/login", json={"email": admin_email, "password": admin_pass})
    assert blocked_login_res.status_code == 403
    assert "suspended" in blocked_login_res.json()["message"].lower()

    # 6. Super Admin REACTIVATES the university
    act_res = client.post(f"/api/v1/universities/{univ_id}/activate", json={"reason": "Suspension lifted"}, headers=sa_headers)
    assert act_res.status_code == 200
    assert act_res.json()["data"]["is_active"] is True

    # 7. Restoration: Login now succeeds
    restore_login = client.post("/api/v1/auth/login", json={"email": admin_email, "password": admin_pass})
    assert restore_login.status_code == 200
    new_token = restore_login.json()["data"]["access_token"]
    restore_headers = {"Authorization": f"Bearer {new_token}"}

    # API access restored
    restored_me = client.get("/api/v1/auth/me", headers=restore_headers)
    assert restored_me.status_code == 200
    assert restored_me.json()["data"]["email"] == admin_email

def test_unauthorized_roles_cannot_call_super_admin_endpoints():
    # University Admin token
    ua_token = get_auth_token("john@universityadmin.in", "Admin@12345")
    ua_headers = {"Authorization": f"Bearer {ua_token}"}

    # University Admin cannot create university with admin
    res1 = client.post("/api/v1/universities/with-admin", json={
        "name": "Unauthorized Univ", "code": "UNAUTH", "admin_email": "x@x.com", "admin_full_name": "X"
    }, headers=ua_headers)
    assert res1.status_code in [401, 403]

    # University Admin cannot suspend a university
    res2 = client.post("/api/v1/universities/dummy-id/suspend", json={}, headers=ua_headers)
    assert res2.status_code in [401, 403]

    # Teacher token
    t_token = get_auth_token("teacher@university.in", "Admin@12345")
    t_headers = {"Authorization": f"Bearer {t_token}"}

    res3 = client.post("/api/v1/universities/dummy-id/activate", json={}, headers=t_headers)
    assert res3.status_code in [401, 403]
