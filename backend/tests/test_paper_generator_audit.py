import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(email: str, password: str = "Admin@12345") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["data"]["access_token"]

def get_seeded_subject_id(headers) -> str:
    subj_res = client.get("/api/v1/academic/subjects", headers=headers)
    assert subj_res.status_code == 200
    subjects = subj_res.json()["data"]
    dbms_subj = next((s for s in subjects if s.get("code") == "BCA401"), subjects[0])
    return dbms_subj["id"]

def test_paper_generator_validates_blueprint_distribution():
    faculty_token = get_auth_token("teacher@university.in")
    headers = {"Authorization": f"Bearer {faculty_token}"}

    subj_id = get_seeded_subject_id(headers)

    # Empty distribution fails with 400
    res = client.post(
        "/api/v1/question-papers/generate",
        headers=headers,
        json={
            "subject_id": subj_id,
            "title": "Empty Distribution Paper",
            "exam_name": "Mid Term 2026",
            "total_marks": 70,
            "duration_minutes": 180,
            "distribution": []
        }
    )
    assert res.status_code == 400
    err_text = res.json().get("detail") or res.json().get("message")
    assert "distribution cannot be empty" in err_text

def test_paper_generator_fails_actionably_on_insufficient_approved_questions():
    faculty_token = get_auth_token("teacher@university.in")
    headers = {"Authorization": f"Bearer {faculty_token}"}

    subj_id = get_seeded_subject_id(headers)

    # Request 99 questions of 5 marks that don't exist
    res = client.post(
        "/api/v1/question-papers/generate",
        headers=headers,
        json={
            "subject_id": subj_id,
            "title": "Impossible Paper",
            "exam_name": "Mid Term 2026",
            "total_marks": 495,
            "duration_minutes": 180,
            "distribution": [
                {"question_type": "DESCRIPTIVE", "marks": 5, "count": 99}
            ]
        }
    )
    assert res.status_code == 400
    detail = res.json().get("detail") or res.json().get("message")
    assert "Requires 99 APPROVED question(s)" in detail

def test_paper_generator_ignores_draft_and_unapproved_questions():
    sa_token = get_auth_token("apex@superadmin.com")
    headers = {"Authorization": f"Bearer {sa_token}"}

    subj_id = get_seeded_subject_id(headers)
    distinct_marks = 73 # Unique marks never seeded

    # Create a draft question with distinct mark value
    q_draft_res = client.post(
        "/api/v1/questions",
        headers=headers,
        json={
            "subject_id": subj_id,
            "question_text": f"Unapproved draft question {uuid.uuid4().hex[:6]}",
            "question_type": "DESCRIPTIVE",
            "marks": distinct_marks,
            "difficulty": "HARD"
        }
    )
    assert q_draft_res.status_code == 200
    q_id = q_draft_res.json()["data"]["id"]
    assert q_draft_res.json()["data"]["status"] == "DRAFT"

    try:
        # Attempt to generate paper requiring 1 question of distinct_marks
        gen_res = client.post(
            "/api/v1/question-papers/generate",
            headers=headers,
            json={
                "subject_id": subj_id,
                "title": "Strict Approved Test",
                "exam_name": "End Semester 2026",
                "total_marks": distinct_marks,
                "duration_minutes": 60,
                "distribution": [
                    {"question_type": "DESCRIPTIVE", "marks": distinct_marks, "count": 1}
                ]
            }
        )
        # MUST FAIL because the only question with distinct_marks is DRAFT, not APPROVED!
        assert gen_res.status_code == 400
        detail = gen_res.json().get("detail") or gen_res.json().get("message")
        assert "only 0 approved question(s) exist" in detail

        # Now approve this question via POST action endpoint
        appr_res = client.post(f"/api/v1/questions/{q_id}/action", headers=headers, json={"action": "APPROVE"})
        assert appr_res.status_code == 200
        assert appr_res.json()["data"]["status"] == "APPROVED"

        # Now generation MUST SUCCEED
        gen_success = client.post(
            "/api/v1/question-papers/generate",
            headers=headers,
            json={
                "subject_id": subj_id,
                "title": "Strict Approved Test Passed",
                "exam_name": "End Semester 2026",
                "total_marks": distinct_marks,
                "duration_minutes": 60,
                "distribution": [
                    {"question_type": "DESCRIPTIVE", "marks": distinct_marks, "count": 1}
                ]
            }
        )
        assert gen_success.status_code == 200
        paper_data = gen_success.json()["data"]
        assert paper_data["total_marks"] == distinct_marks
        assert paper_data["status"] == "GENERATED"
    finally:
        # Clean up test question so next run starts clean
        client.delete(f"/api/v1/questions/{q_id}", headers=headers)

def test_paper_lifecycle_anti_self_approval_and_finalization():
    faculty_token = get_auth_token("teacher@university.in")
    fac_headers = {"Authorization": f"Bearer {faculty_token}"}

    subj_id = get_seeded_subject_id(fac_headers)

    # 1. Faculty generates paper
    gen_res = client.post(
        "/api/v1/question-papers/generate",
        headers=fac_headers,
        json={
            "subject_id": subj_id,
            "title": "Software Engineering End Sem Exam",
            "exam_name": "End Semester Examination 2026-27",
            "total_marks": 12,
            "duration_minutes": 120,
            "distribution": [
                {"question_type": "MCQ", "marks": 1, "count": 2},
                {"question_type": "DESCRIPTIVE", "marks": 5, "count": 2}
            ],
            "seed": 1234
        }
    )
    assert gen_res.status_code == 200, f"Generate failed: {gen_res.text}"
    paper = gen_res.json()["data"]
    paper_id = paper["id"]
    assert paper["status"] == "GENERATED"

    # 2. Faculty submits for review
    sub_res = client.post(f"/api/v1/question-papers/{paper_id}/action", headers=fac_headers, json={"action": "SUBMIT_FOR_REVIEW"})
    assert sub_res.status_code == 200
    assert sub_res.json()["data"]["status"] == "UNDER_REVIEW"

    # 3. Faculty tries to self-approve -> Forbidden (Anti-Self-Approval Rule)
    self_appr_res = client.post(f"/api/v1/question-papers/{paper_id}/action", headers=fac_headers, json={"action": "APPROVE"})
    assert self_appr_res.status_code == 403
    err_text = self_appr_res.json().get("detail") or self_appr_res.json().get("message")
    assert "cannot self-approve" in err_text

    # 4. HOD approves the paper
    hod_token = get_auth_token("hod@bca.university.in")
    hod_headers = {"Authorization": f"Bearer {hod_token}"}
    hod_appr_res = client.post(f"/api/v1/question-papers/{paper_id}/action", headers=hod_headers, json={"action": "APPROVE"})
    assert hod_appr_res.status_code == 200
    assert hod_appr_res.json()["data"]["status"] == "APPROVED"

    # 5. HOD cannot finalize (only Controller or Admin can)
    hod_fin_res = client.post(f"/api/v1/question-papers/{paper_id}/action", headers=hod_headers, json={"action": "FINALIZE"})
    assert hod_fin_res.status_code == 403

    # 6. Admin finalizes the paper
    admin_token = get_auth_token("apex@superadmin.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    fin_res = client.post(f"/api/v1/question-papers/{paper_id}/action", headers=admin_headers, json={"action": "FINALIZE"})
    assert fin_res.status_code == 200
    assert fin_res.json()["data"]["status"] == "FINALIZED"

    # 7. Modifications blocked when paper is FINALIZED
    del_res = client.delete(f"/api/v1/question-papers/{paper_id}/questions/fake-id", headers=admin_headers)
    assert del_res.status_code == 400
    err_del = del_res.json().get("detail") or del_res.json().get("message")
    assert "Paper is locked" in err_del

    # 8. Publish the paper
    pub_res = client.post(f"/api/v1/question-papers/{paper_id}/action", headers=admin_headers, json={"action": "PUBLISH"})
    assert pub_res.status_code == 200
    assert pub_res.json()["data"]["status"] == "PUBLISHED"

    # 9. Student can download PDF of PUBLISHED paper
    student_token = get_auth_token("student@gmail.com")
    pdf_res = client.get(f"/api/v1/question-papers/{paper_id}/pdf", headers={"Authorization": f"Bearer {student_token}"})
    assert pdf_res.status_code == 200
    assert pdf_res.content.startswith(b"%PDF-")
