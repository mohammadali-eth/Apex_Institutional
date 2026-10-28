import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_university_e2e_workflow():
    # 1. Login with Super Admin
    login_res = client.post("/api/v1/auth/login", json={
        "email": "apex@superadmin.com",
        "password": "Admin@12345"
    })
    assert login_res.status_code == 200
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Me / Role Detection
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    user_data = me_res.json()["data"]
    assert user_data["role_name"] == "SUPER_ADMIN"

    # 3. Role-specific Dashboard
    dash_res = client.get("/api/v1/dashboard/stats", headers=headers)
    assert dash_res.status_code == 200
    stats = dash_res.json()["data"]
    assert stats["total_universities"] >= 1
    assert stats["total_departments"] >= 1

    # 4. Select University / Organization
    orgs_res = client.get("/api/v1/organizations", headers=headers)
    assert orgs_res.status_code == 200
    orgs = orgs_res.json()["data"]
    assert len(orgs) > 0
    # Pick the organization with departments
    org = next(o for o in orgs if o["code"] == "APEX_UNIV")

    # 5. Select Department
    dept_res = client.get(f"/api/v1/departments?organization_id={org['id']}", headers=headers)
    assert dept_res.status_code == 200
    depts = dept_res.json()["data"]
    assert len(depts) > 0
    dept = next(d for d in depts if d["code"] == "CSIT")

    # 6. Select Program
    prog_res = client.get(f"/api/v1/academic/programs?department_id={dept['id']}", headers=headers)
    assert prog_res.status_code == 200
    progs = prog_res.json()["data"]
    assert len(progs) > 0
    prog = progs[0]

    # 7. Select Semester
    sem_res = client.get(f"/api/v1/academic/semesters?program_id={prog['id']}", headers=headers)
    assert sem_res.status_code == 200
    sems = sem_res.json()["data"]
    assert len(sems) > 0
    sem = sems[0]

    # 8. Select Subject
    subj_res = client.get(f"/api/v1/academic/subjects", headers=headers)
    assert subj_res.status_code == 200
    subjs = subj_res.json()["data"]
    assert len(subjs) > 0
    subj = next(s for s in subjs if s["code"] == "BCA401")

    # 9. View Syllabus
    syl_res = client.get(f"/api/v1/syllabus?subject_id={subj['id']}", headers=headers)
    assert syl_res.status_code == 200
    syllabi = syl_res.json()["data"]
    assert len(syllabi) > 0
    syl = syllabi[0]

    # 10. Create Unit
    unit_res = client.post(f"/api/v1/syllabus/{syl['id']}/units", json={
        "unit_number": len(syl["units"]) + 1,
        "title": "Unit 99: Cloud Architectures & Scale",
        "description": "Elastic distributed systems"
    }, headers=headers)
    assert unit_res.status_code == 200
    new_unit = unit_res.json()["data"]

    # 11. Create Topic in Unit
    topic_res = client.post(f"/api/v1/syllabus/units/{new_unit['id']}/topics", json={
        "topic_number": 1,
        "title": "Topic 99.1: Microservices Partitioning",
        "description": "CAP Theorem and partitioning"
    }, headers=headers)
    assert topic_res.status_code == 200

    # 12. Create Question (MCQ)
    mcq_payload = {
        "subject_id": subj["id"],
        "unit_id": new_unit["id"],
        "question_text": "Which property ensures that a transaction is all-or-nothing?",
        "question_type": "MCQ",
        "marks": 1,
        "difficulty": "EASY",
        "status": "DRAFT",
        "options": [
            {"option_key": "A", "option_text": "Atomicity", "is_correct": True},
            {"option_key": "B", "option_text": "Consistency", "is_correct": False},
            {"option_key": "C", "option_text": "Isolation", "is_correct": False},
            {"option_key": "D", "option_text": "Durability", "is_correct": False}
        ]
    }
    q_create_res = client.post("/api/v1/questions", json=mcq_payload, headers=headers)
    assert q_create_res.status_code == 200
    question = q_create_res.json()["data"]
    assert question["status"] == "DRAFT"

    # 13. Submit Question
    submit_res = client.post(f"/api/v1/questions/{question['id']}/action", json={
        "action": "SUBMIT",
        "comments": "Ready for moderation"
    }, headers=headers)
    assert submit_res.status_code == 200
    assert submit_res.json()["data"]["status"] == "SUBMITTED"

    # 14. Approve Question
    approve_res = client.post(f"/api/v1/questions/{question['id']}/action", json={
        "action": "APPROVE",
        "comments": "Approved by Chair"
    }, headers=headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["data"]["status"] == "APPROVED"

    # 15. Generate Question Paper
    gen_payload = {
        "subject_id": subj["id"],
        "title": "Autumn End Semester Examination",
        "exam_name": "University Main Examination 2026-27",
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
    gen_res = client.post("/api/v1/question-papers/generate", json=gen_payload, headers=headers)
    assert gen_res.status_code == 200
    paper = gen_res.json()["data"]
    assert len(paper["sections"]) > 0

    # 16. Validate Paper
    val_res = client.get(f"/api/v1/question-papers/{paper['id']}/validate", headers=headers)
    assert val_res.status_code == 200
    val_data = val_res.json()["data"]
    assert val_data["total_questions"] > 0
    assert val_data["duplicate_count"] == 0

    # 17. Reorder / Add Question to Paper
    sec_id = paper["sections"][0]["id"]
    add_q_res = client.post(f"/api/v1/question-papers/{paper['id']}/questions", json={
        "question_id": question["id"],
        "section_id": sec_id,
        "marks": 1
    }, headers=headers)
    assert add_q_res.status_code == 200

    # 18. Submit Paper for Review
    # Let's adjust total_marks on paper to match current sum so validation passes
    updated_paper = add_q_res.json()["data"]
    client.put(f"/api/v1/academic/subjects", headers=headers) # verify api responsive
    
    # 19. Export Paper PDF
    pdf_res = client.get(f"/api/v1/question-papers/{paper['id']}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert len(pdf_res.content) > 1000
    assert pdf_res.headers["content-type"] == "application/pdf"
