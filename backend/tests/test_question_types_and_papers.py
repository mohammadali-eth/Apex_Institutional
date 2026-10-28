import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(email: str = "apex@superadmin.com", password: str = "Admin@12345") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.json()["data"]["access_token"]

def test_question_types_authoring():
    token = get_auth_token("teacher@university.in")
    headers = {"Authorization": f"Bearer {token}"}

    # Retrieve subject
    subjs_res = client.get("/api/v1/academic/subjects", headers=headers)
    subj_id = subjs_res.json()["data"][0]["id"]

    # 1. MCQ
    mcq_res = client.post("/api/v1/questions", json={
        "subject_id": subj_id,
        "question_text": "Which normal form requires every determinant to be a candidate key?",
        "question_type": "MCQ",
        "marks": 1,
        "difficulty": "MEDIUM",
        "options": [
            {"option_key": "A", "option_text": "1NF", "is_correct": False},
            {"option_key": "B", "option_text": "2NF", "is_correct": False},
            {"option_key": "C", "option_text": "BCNF", "is_correct": True},
            {"option_key": "D", "option_text": "3NF", "is_correct": False}
        ]
    }, headers=headers)
    assert mcq_res.status_code == 200
    assert mcq_res.json()["data"]["question_type"] == "MCQ"

    # 2. TRUE_FALSE
    tf_res = client.post("/api/v1/questions", json={
        "subject_id": subj_id,
        "question_text": "A foreign key value can be NULL in relational tables.",
        "question_type": "TRUE_FALSE",
        "marks": 1,
        "difficulty": "EASY",
        "expected_answer": "True"
    }, headers=headers)
    assert tf_res.status_code == 200
    assert tf_res.json()["data"]["question_type"] == "TRUE_FALSE"

    # 3. FILL_BLANK
    fb_res = client.post("/api/v1/questions", json={
        "subject_id": subj_id,
        "question_text": "The protocol that ensures conflict serializability using growing and shrinking phases is _____.",
        "question_type": "FILL_BLANK",
        "marks": 1,
        "difficulty": "MEDIUM",
        "expected_answer": "Two-Phase Locking (2PL)"
    }, headers=headers)
    assert fb_res.status_code == 200
    assert fb_res.json()["data"]["question_type"] == "FILL_BLANK"

    # 4. DESCRIPTIVE
    desc_res = client.post("/api/v1/questions", json={
        "subject_id": subj_id,
        "question_text": "Explain conflict serializability and testing using precedence graphs with an example.",
        "question_type": "DESCRIPTIVE",
        "marks": 10,
        "difficulty": "HARD"
    }, headers=headers)
    assert desc_res.status_code == 200
    assert desc_res.json()["data"]["question_type"] == "DESCRIPTIVE"
    assert desc_res.json()["data"]["marks"] == 10

def test_paper_generation_validation_and_pdf():
    admin_token = get_auth_token("apex@superadmin.com")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch subject
    subjs_res = client.get("/api/v1/academic/subjects", headers=headers)
    subjects = subjs_res.json()["data"]
    dbms_subj = next(s for s in subjects if s["code"] == "BCA401")
    subj_id = dbms_subj["id"]

    # Generate a paper using the automatic deterministic engine
    gen_payload = {
        "subject_id": subj_id,
        "title": "Automated End-Semester Test Examination",
        "exam_name": "Autumn 2026 Examination",
        "duration_minutes": 180,
        "total_marks": 70,
        "instructions": "All questions are compulsory.",
        "distribution": [
            {"question_type": "MCQ", "marks": 1, "count": 4},
            {"question_type": "DESCRIPTIVE", "marks": 2, "count": 2},
            {"question_type": "DESCRIPTIVE", "marks": 5, "count": 2}
        ],
        "difficulty": {"easy": 40, "medium": 40, "hard": 20}
    }
    gen_res = client.post("/api/v1/question-papers/generate", json=gen_payload, headers=headers)
    assert gen_res.status_code == 200, f"Generation failed: {gen_res.text}"
    paper = gen_res.json()["data"]
    paper_id = paper["id"]
    assert len(paper["sections"]) > 0

    # Validate paper
    val_res = client.get(f"/api/v1/question-papers/{paper_id}/validate", headers=headers)
    assert val_res.status_code == 200
    val_data = val_res.json()["data"]
    assert "total_marks_actual" in val_data
    assert "difficulty_breakdown" in val_data

    # PDF Export test (ReportLab PDF binary stream)
    pdf_res = client.get(f"/api/v1/question-papers/{paper_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers.get("content-type") == "application/pdf"
    assert len(pdf_res.content) > 1000
    assert pdf_res.content.startswith(b"%PDF")
