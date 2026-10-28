import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_contact_inquiry_persistence():
    unique_id = uuid.uuid4().hex[:8]
    payload = {
        "full_name": f"Dr. Sarah Connor {unique_id}",
        "email": f"sarah.connor.{unique_id}@cyberdyne.edu",
        "subject": "Curriculum Automation Evaluation",
        "message": "We would like to trial QPMS Apex for our Computer Science assessment board."
    }
    response = client.post("/api/v1/contact", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "id" in data["data"]
    assert data["data"]["email"] == f"sarah.connor.{unique_id}@cyberdyne.edu"
    assert data["data"]["is_resolved"] is False

def test_public_signup_enforces_student_role():
    unique_id = uuid.uuid4().hex[:8]
    email = f"student.{unique_id}@example.org"
    payload = {
        "full_name": "Random Applicant",
        "email": email,
        "password": "SecurePassword123!",
        "terms_accepted": True
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    # Mandatory security policy: role must be STUDENT
    assert data["data"]["user"]["role_name"] == "STUDENT"
    assert data["data"]["user"]["organization_id"] is None
    assert "access_token" in data["data"]

def test_public_signup_duplicate_rejection():
    unique_id = uuid.uuid4().hex[:8]
    email = f"duplicate.{unique_id}@example.org"
    payload = {
        "full_name": "Duplicate Student",
        "email": email,
        "password": "Password123!",
        "terms_accepted": True
    }
    r1 = client.post("/api/v1/auth/signup", json=payload)
    assert r1.status_code == 200

    r2 = client.post("/api/v1/auth/signup", json=payload)
    assert r2.status_code == 400
    assert "already exists" in r2.json()["message"].lower()

def test_forgot_and_reset_password_lifecycle():
    unique_id = uuid.uuid4().hex[:8]
    email = f"reset.user.{unique_id}@example.org"
    # Create user first
    signup_res = client.post("/api/v1/auth/signup", json={
        "full_name": "Reset Candidate",
        "email": email,
        "password": "InitialPass123!",
        "terms_accepted": True
    })
    assert signup_res.status_code == 200

    # 1. Forgot password
    forgot_res = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert forgot_res.status_code == 200
    data = forgot_res.json()["data"]
    assert "dev_token" in data
    reset_token = data["dev_token"]
    assert reset_token is not None

    # 2. Reset password
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": "NewUpdatedPassword123!"
    })
    assert reset_res.status_code == 200
    assert reset_res.json()["success"] is True

    # 3. Single-use token enforcement: Re-using the same token should fail
    reuse_res = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": "AnotherPassword123!"
    })
    assert reuse_res.status_code == 400
    assert "invalid" in reuse_res.json()["message"].lower() or "expired" in reuse_res.json()["message"].lower()

    # 4. Verify login with newly set password
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "NewUpdatedPassword123!"
    })
    assert login_res.status_code == 200
    assert login_res.json()["data"]["user"]["email"] == email
