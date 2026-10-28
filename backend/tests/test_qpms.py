import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database.session import Base, get_db
from app.database.seed_data import seed_database
from app.core.security import create_access_token

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_login_super_admin():
    res = client.post("/api/v1/auth/login", json={
        "email": "apex@superadmin.com",
        "password": "Admin@12345"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["role_name"] == "SUPER_ADMIN"

def test_login_invalid_password():
    res = client.post("/api/v1/auth/login", json={
        "email": "apex@superadmin.com",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401
    assert res.json()["success"] is False

def test_get_organizations():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "apex@superadmin.com",
        "password": "Admin@12345"
    })
    token = login_res.json()["data"]["access_token"]
    res = client.get("/api/v1/organizations", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    orgs = res.json()["data"]
    assert len(orgs) >= 1
    assert any(o["code"] == "APEX_UNIV" for o in orgs)

def test_create_and_validate_question():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "apex@superadmin.com",
        "password": "Admin@12345"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get subjects
    subj_res = client.get("/api/v1/academic/subjects", headers=headers)
    assert subj_res.status_code == 200
    subjects = subj_res.json()["data"]
    assert len(subjects) > 0
    subject_id = subjects[0]["id"]

    # 1. Test MCQ creation with valid options
    mcq_payload = {
        "subject_id": subject_id,
        "question_text": "What is the primary characteristic of an entity in DBMS?",
        "question_type": "MCQ",
        "marks": 1,
        "difficulty": "EASY",
        "language": "English",
        "explanation": "An entity is a real-world object distinguishable from other objects.",
        "tags": ["dbms", "entities"],
        "options": [
            {"option_key": "A", "option_text": "Distinguishable real-world object", "is_correct": True},
            {"option_key": "B", "option_text": "Only a number", "is_correct": False},
            {"option_key": "C", "option_text": "A SQL statement", "is_correct": False},
            {"option_key": "D", "option_text": "None of the above", "is_correct": False}
        ]
    }
    q_res = client.post("/api/v1/questions", json=mcq_payload, headers=headers)
    assert q_res.status_code == 200
    q_data = q_res.json()["data"]
    assert q_data["question_type"] == "MCQ"
    assert len(q_data["options"]) == 4

    # 2. Test MCQ rejection when no correct option is provided
    bad_mcq = {
        "subject_id": subject_id,
        "question_text": "Invalid question with no correct answer?",
        "question_type": "MCQ",
        "marks": 1,
        "difficulty": "EASY",
        "options": [
            {"option_key": "A", "option_text": "Option 1", "is_correct": False},
            {"option_key": "B", "option_text": "Option 2", "is_correct": False}
        ]
    }
    bad_res = client.post("/api/v1/questions", json=bad_mcq, headers=headers)
    assert bad_res.status_code == 400

def test_paper_generator_and_pdf():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "apex@superadmin.com",
        "password": "Admin@12345"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get DBMS subject
    subj_res = client.get("/api/v1/academic/subjects", headers=headers)
    subjects = subj_res.json()["data"]
    dbms_subj = next(s for s in subjects if s["code"] == "BCA401")

    # Generate Paper
    gen_req = {
        "subject_id": dbms_subj["id"],
        "title": "Semester Final Exam",
        "exam_name": "End Semester Examination 2026-27",
        "duration_minutes": 180,
        "total_marks": 70,
        "instructions": "All sections are compulsory.",
        "distribution": [
            {"question_type": "MCQ", "marks": 1, "count": 5},
            {"question_type": "DESCRIPTIVE", "marks": 2, "count": 2},
            {"question_type": "DESCRIPTIVE", "marks": 5, "count": 2}
        ],
        "difficulty": {"easy": 40, "medium": 40, "hard": 20}
    }
    gen_res = client.post("/api/v1/question-papers/generate", json=gen_req, headers=headers)
    assert gen_res.status_code == 200
    paper_data = gen_res.json()["data"]
    paper_id = paper_data["id"]
    assert len(paper_data["sections"]) > 0

    # Validate paper
    val_res = client.get(f"/api/v1/question-papers/{paper_id}/validate", headers=headers)
    assert val_res.status_code == 200
    val_data = val_res.json()["data"]
    assert val_data["total_questions"] > 0
    assert val_data["duplicate_count"] == 0

    # Export PDF
    pdf_res = client.get(f"/api/v1/question-papers/{paper_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000 # Valid PDF bytes
