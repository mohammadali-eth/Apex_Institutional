import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SIX_ROLES = [
    ("apex@superadmin.com", "Admin@12345", "SUPER_ADMIN"),
    ("john@universityadmin.in", "Admin@12345", "UNIVERSITY_ADMIN"),
    ("principal@acet.edu.in", "Admin@12345", "INSTITUTION_ADMIN"),
    ("hod@bca.university.in", "Admin@12345", "HOD"),
    ("teacher@university.in", "Admin@12345", "FACULTY"),
    ("student@gmail.com", "Admin@12345", "STUDENT"),
]

def get_auth_token(email: str, password: str = "Admin@12345") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["data"]["access_token"]

def test_all_six_roles_can_login():
    for email, pwd, expected_role in SIX_ROLES:
        res = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["user"]["role_name"] == expected_role
        assert "access_token" in data

def test_super_admin_has_platform_privileges():
    token = get_auth_token("apex@superadmin.com")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Can access audit logs at /api/v1/audit
    audit_res = client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 200
    
    # Can list all universities
    univ_res = client.get("/api/v1/universities", headers=headers)
    assert univ_res.status_code == 200
    assert len(univ_res.json()["data"]) >= 2

def test_student_forbidden_from_admin_and_authoring():
    token = get_auth_token("student@gmail.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Student cannot access audit logs
    audit_res = client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 403

    # Student cannot create questions
    bad_q_res = client.post(
        "/api/v1/questions",
        json={
            "subject_id": "dummy",
            "question_text": "Illegal student question",
            "question_type": "MCQ",
            "marks": 1
        },
        headers=headers
    )
    assert bad_q_res.status_code == 403

def test_faculty_can_author_questions():
    token = get_auth_token("teacher@university.in")
    headers = {"Authorization": f"Bearer {token}"}

    # Get subjects
    subj_res = client.get("/api/v1/academic/subjects", headers=headers)
    assert subj_res.status_code == 200
    subjs = subj_res.json()["data"]
    assert len(subjs) > 0
    subj_id = subjs[0]["id"]

    # Faculty can post question
    q_payload = {
        "subject_id": subj_id,
        "question_text": "Explain ACID properties in relational database management systems.",
        "question_type": "DESCRIPTIVE",
        "marks": 5,
        "difficulty": "MEDIUM",
        "language": "English",
        "tags": ["acid", "transactions"]
    }
    create_res = client.post("/api/v1/questions", json=q_payload, headers=headers)
    assert create_res.status_code == 200
    data = create_res.json()["data"]
    assert data["question_type"] == "DESCRIPTIVE"
    assert data["marks"] == 5

def test_role_scoped_dashboards():
    for email, _, expected_role in SIX_ROLES:
        token = get_auth_token(email)
        res = client.get("/api/v1/dashboard/stats", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        stats = res.json()["data"]
        assert stats["role"] == expected_role
        assert "recent_activity" in stats
