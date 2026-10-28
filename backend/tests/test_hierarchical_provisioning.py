import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(email: str, password: str = "Admin@12345") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["data"]["access_token"]

def test_creatable_roles_endpoint():
    # 1. Super Admin creatable roles
    sa_token = get_auth_token("apex@superadmin.com")
    res = client.get("/api/v1/users/creatable-roles", headers={"Authorization": f"Bearer {sa_token}"})
    assert res.status_code == 200
    roles = res.json()["data"]
    assert "UNIVERSITY_ADMIN" in roles
    assert "HOD" in roles
    assert "TEACHER" in roles

    # 2. HOD creatable roles
    hod_token = get_auth_token("hod@bca.university.in")
    res = client.get("/api/v1/users/creatable-roles", headers={"Authorization": f"Bearer {hod_token}"})
    assert res.status_code == 200
    hod_roles = res.json()["data"]
    assert "TEACHER" in hod_roles
    assert "COORDINATOR" in hod_roles
    assert "STUDENT" in hod_roles
    assert "UNIVERSITY_ADMIN" not in hod_roles
    assert "HOD" not in hod_roles

def test_super_admin_can_provision_university_admin():
    sa_token = get_auth_token("apex@superadmin.com")
    email = f"new_univ_admin_{pytest.importorskip('uuid').uuid4().hex[:6]}@apexuniv.edu"

    # Fetch an organization
    orgs_res = client.get("/api/v1/organizations", headers={"Authorization": f"Bearer {sa_token}"})
    org_id = orgs_res.json()["data"][0]["id"]

    res = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {sa_token}"},
        json={
            "email": email,
            "full_name": "Dr. Sarah Provost",
            "role_name": "UNIVERSITY_ADMIN",
            "organization_id": org_id,
            "password": "Password@12345"
        }
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["email"] == email
    assert data["role_name"] == "UNIVERSITY_ADMIN"

def test_university_admin_hierarchical_provisioning():
    ua_token = get_auth_token("john@universityadmin.in")
    headers = {"Authorization": f"Bearer {ua_token}"}

    # Fetch profile to get current org
    me_res = client.get("/api/v1/auth/me", headers=headers)
    org_id = me_res.json()["data"]["organization_id"]

    # 1. Allowed: UA creates an Exam Controller
    controller_email = f"controller_{pytest.importorskip('uuid').uuid4().hex[:6]}@univ.edu"
    res = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": controller_email,
            "full_name": "Prof. Alan Exam Controller",
            "role_name": "EXAM_CONTROLLER",
            "organization_id": org_id,
            "password": "Controller@123"
        }
    )
    assert res.status_code == 200
    assert res.json()["data"]["role_name"] == "EXAM_CONTROLLER"

    # 2. Forbidden: UA cannot create SUPER_ADMIN
    illegal_res = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": f"escalation_{pytest.importorskip('uuid').uuid4().hex[:6]}@test.com",
            "full_name": "Escalated User",
            "role_name": "SUPER_ADMIN",
            "password": "TestPassword@123"
        }
    )
    assert illegal_res.status_code == 403
    err_msg = illegal_res.json().get("detail") or illegal_res.json().get("message")
    assert "not permitted to create users with role 'SUPER_ADMIN'" in err_msg

    # 3. Forbidden: UA cannot provision for a completely unrelated organization
    foreign_org_res = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": f"foreign_{pytest.importorskip('uuid').uuid4().hex[:6]}@test.com",
            "full_name": "Foreign User",
            "role_name": "HOD",
            "organization_id": "00000000-0000-0000-0000-000000000000",
            "password": "TestPassword@123"
        }
    )
    assert foreign_org_res.status_code in [400, 403]

def test_hod_hierarchical_provisioning_and_credential_setup():
    hod_token = get_auth_token("hod@bca.university.in")
    headers = {"Authorization": f"Bearer {hod_token}"}

    # Fetch profile to get HOD's department & organization
    me_res = client.get("/api/v1/auth/me", headers=headers)
    me = me_res.json()["data"]
    dept_id = me["department_id"]
    org_id = me["organization_id"]

    # 1. Allowed: HOD creates a TEACHER with NO password (one-time setup token flow)
    teacher_email = f"new_teacher_{pytest.importorskip('uuid').uuid4().hex[:6]}@dept.edu"
    res = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": teacher_email,
            "full_name": "Dr. Grace Hopper",
            "role_name": "TEACHER"
        }
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["email"] == teacher_email
    assert data["role_name"] == "TEACHER"
    assert data["setup_token"] is not None
    assert data["temporary_password"] is not None
    assert data["must_change_password"] is True
    setup_token = data["setup_token"]

    # 2. Complete Credential Setup using the token
    new_user_password = "MyEstablishedPassword@2026"
    setup_res = client.post("/api/v1/auth/setup-credentials", json={
        "token": setup_token,
        "new_password": new_user_password
    })
    assert setup_res.status_code == 200
    assert setup_res.json()["success"] is True

    # 3. Newly created teacher logs in with established password
    login_res = client.post("/api/v1/auth/login", json={
        "email": teacher_email,
        "password": new_user_password
    })
    assert login_res.status_code == 200
    assert login_res.json()["data"]["user"]["must_change_password"] is False

    # 4. Forbidden: HOD cannot provision an EXAM_CONTROLLER or UNIVERSITY_ADMIN
    unauth_role_res = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": f"illegal_{pytest.importorskip('uuid').uuid4().hex[:6]}@dept.edu",
            "full_name": "Illegal Role",
            "role_name": "EXAM_CONTROLLER"
        }
    )
    assert unauth_role_res.status_code == 403

def test_teacher_and_student_forbidden_from_provisioning():
    # 1. Teacher cannot create users
    teacher_token = get_auth_token("teacher@university.in")
    res1 = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "email": "should_fail@test.com",
            "full_name": "Should Fail",
            "role_name": "STUDENT"
        }
    )
    assert res1.status_code == 403

    # 2. Student cannot create users
    student_token = get_auth_token("student@gmail.com")
    res2 = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "email": "should_fail2@test.com",
            "full_name": "Should Fail 2",
            "role_name": "STUDENT"
        }
    )
    assert res2.status_code == 403
