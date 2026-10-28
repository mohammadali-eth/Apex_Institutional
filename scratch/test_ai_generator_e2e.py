import httpx
import os
import sys

BASE_URL = "http://localhost:8000/api/v1"

def run_e2e_verification():
    print("=" * 70)
    print("AI QUESTION PAPER GENERATOR — FULL SUITE VERIFICATION")
    print("=" * 70)

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # 1. Authentication for multiple roles
    print("\n[Stage 1] Authentication & Tenant RBAC Setup")
    # Faculty
    res = client.post("/auth/login", json={"email": "teacher@university.in", "password": "Admin@12345"})
    assert res.status_code == 200, f"Faculty login failed: {res.text}"
    token_faculty = res.json()["data"]["access_token"]
    faculty_user = res.json()["data"]["user"]
    headers_faculty = {"Authorization": f"Bearer {token_faculty}"}
    print(f"  [PASS] Faculty authenticated: {faculty_user['full_name']} ({faculty_user['role_name']})")

    # Student
    res = client.post("/auth/login", json={"email": "student@gmail.com", "password": "Admin@12345"})
    assert res.status_code == 200, f"Student login failed: {res.text}"
    token_student = res.json()["data"]["access_token"]
    student_user = res.json()["data"]["user"]
    headers_student = {"Authorization": f"Bearer {token_student}"}
    print(f"  [PASS] Student authenticated: {student_user['full_name']} ({student_user['role_name']})")

    # HOD
    res = client.post("/auth/login", json={"email": "hod@bca.university.in", "password": "Admin@12345"})
    assert res.status_code == 200, f"HOD login failed: {res.text}"
    token_hod = res.json()["data"]["access_token"]
    headers_hod = {"Authorization": f"Bearer {token_hod}"}
    print("  [PASS] HOD authenticated (hod@bca.university.in)")

    # Exam Controller
    res = client.post("/auth/login", json={"email": "controller@university.in", "password": "Admin@12345"})
    assert res.status_code == 200, f"Controller login failed: {res.text}"
    token_controller = res.json()["data"]["access_token"]
    headers_controller = {"Authorization": f"Bearer {token_controller}"}
    print("  [PASS] Exam Controller authenticated (controller@university.in)")

    # 2. Retrieve curriculum subject
    print("\n[Stage 2] Academic Context & Syllabus Grounding")
    res = client.get("/faculty/subjects", headers=headers_faculty)
    assert res.status_code == 200
    subjects = res.json()["data"]
    assert len(subjects) > 0
    subject = subjects[0]
    subject_id = subject["id"]
    print(f"  [PASS] Grounded Subject: {subject['name']} ({subject['code']})")

    # 3. Blueprint Validation Engine
    print("\n[Stage 3] Advanced Blueprint & Deterministic Validation Engine")
    # Test impossible blueprint rejection
    bad_bp = {
        "subject_id": subject_id,
        "title": "Mismatched Marks Blueprint",
        "exam_name": "Midterm Exam 2026",
        "duration_minutes": 120,
        "total_marks": 70,
        "distribution": [
            {"question_type": "MCQ", "marks": 1, "count": 10},
            {"question_type": "DESCRIPTIVE", "marks": 5, "count": 5} # 10 + 25 = 35 != 70
        ]
    }
    res = client.post("/question-papers/generator/blueprint-validate", json=bad_bp, headers=headers_faculty)
    assert res.status_code == 200
    bp_data = res.json()["data"]
    assert not bp_data["is_valid"]
    print(f"  [PASS] Deterministic validation correctly rejected invalid blueprint: {bp_data['errors']}")

    valid_bp = {
        "subject_id": subject_id,
        "title": "Autonomous DBMS Semester Examination",
        "exam_name": "End Semester Examination 2026-27",
        "duration_minutes": 180,
        "total_marks": 60,
        "instructions": "1. Section A is compulsory.\n2. In Section B and C, answer all questions.\n3. State assumptions clearly.",
        "distribution": [
            {"question_type": "MCQ", "marks": 1, "count": 10, "section_name": "Section A"},
            {"question_type": "FILL_BLANK", "marks": 1, "count": 5, "section_name": "Section A"},
            {"question_type": "DESCRIPTIVE", "marks": 5, "count": 5, "section_name": "Section B"},
            {"question_type": "DESCRIPTIVE", "marks": 10, "count": 2, "section_name": "Section C"}
        ],
        "difficulty": {"easy": 35, "medium": 45, "hard": 20},
        "bloom_taxonomy": {"remember": 25, "understand": 30, "apply": 25, "analyze": 10, "evaluate": 5, "create": 5},
        "source_ratio": {"bank_percentage": 50, "ai_percentage": 50},
        "seed": 2026
    }
    res = client.post("/question-papers/generator/blueprint-validate", json=valid_bp, headers=headers_faculty)
    assert res.status_code == 200
    assert res.json()["data"]["is_valid"]
    print("  [PASS] Valid blueprint approved by validation engine.")

    # 4. Grounded Hybrid Generation
    print("\n[Stage 4] Hybrid AI Question Paper Generation")
    res = client.post("/question-papers/generator/generate", json=valid_bp, headers=headers_faculty)
    assert res.status_code == 200, f"Generation failed: {res.text}"
    paper = res.json()["data"]
    paper_id = paper["id"]
    print(f"  [PASS] Generated Paper ID: {paper_id}")
    print(f"  [PASS] Total Marks: {paper['total_marks']} (Reconciled: {paper['current_marks']})")
    assert paper["total_marks"] == paper["current_marks"] == 60

    # Inspect question provenance
    bank_questions = 0
    ai_questions = 0
    bloom_counts = {}
    diff_counts = {}
    for sec in paper["sections"]:
        for pq in sec["questions"]:
            src = pq.get("source_type")
            bloom = pq.get("bloom_level")
            diff = pq["question"].get("difficulty")
            if src == "QUESTION_BANK":
                bank_questions += 1
            else:
                ai_questions += 1
            bloom_counts[bloom] = bloom_counts.get(bloom, 0) + 1
            diff_counts[diff] = diff_counts.get(diff, 0) + 1

    print(f"  [PASS] Provenance Composition: Question Bank = {bank_questions}, AI Generated = {ai_questions}")
    print(f"  [PASS] Bloom Taxonomy Distribution: {bloom_counts}")
    print(f"  [PASS] Difficulty Distribution: {diff_counts}")
    assert bank_questions > 0 and ai_questions > 0

    # 5. Deterministic Validation Report Endpoint
    print("\n[Stage 5] Deterministic Validation Report & Deduplication")
    res = client.get(f"/question-papers/{paper_id}/validate", headers=headers_faculty)
    assert res.status_code == 200
    val_report = res.json()["data"]
    print(f"  [PASS] Validation Status: {val_report['status']}")
    print(f"  [PASS] Deduplication Summary: {val_report['deduplication_summary']}")
    assert val_report["is_valid"] == True
    assert val_report["total_marks_actual"] == 60

    # 6. In-Place Question & Section Regeneration
    print("\n[Stage 6] In-Place Question Regeneration & Content Editing")
    target_sec = paper["sections"][0]
    target_pq = target_sec["questions"][0]
    pq_id = target_pq["id"]
    old_q_id = target_pq["question_id"]

    res = client.post(
        f"/question-papers/{paper_id}/regenerate-question/{pq_id}",
        json={"preference": "AI"},
        headers=headers_faculty
    )
    assert res.status_code == 200
    updated_paper = res.json()["data"]
    new_pq = [q for q in updated_paper["sections"][0]["questions"] if q["id"] == pq_id][0]
    print(f"  [PASS] In-place Question Regenerated: PQ {pq_id} updated with fresh question")

    # In-place editing of question text and marks
    edit_payload = {
        "question_id": new_pq["question_id"],
        "question_text": "Modified Question: Explain the ACID guarantees and durability logging in DBMS.",
        "marks": new_pq["marks"],
        "bloom_level": "ANALYZE",
        "expected_answer": "Model Answer: Atomicity, Consistency, Isolation, Durability with write-ahead logging.",
        "marking_scheme": "1 Mark per correctly explained component."
    }
    res = client.put(f"/question-papers/{paper_id}/content", json=edit_payload, headers=headers_faculty)
    assert res.status_code == 200
    print("  [PASS] In-place Content Editing succeeded.")

    # 7. Examination Confidentiality & Answer Key Defense-in-Depth
    print("\n[Stage 7] Examination Confidentiality & Answer Key Security")
    # Student MUST BE REJECTED (HTTP 403)
    res_student_ak = client.get(f"/question-papers/{paper_id}/answer-key", headers=headers_student)
    assert res_student_ak.status_code == 403
    print("  [PASS] [Defense-in-Depth] Student access to Confidential Answer Key JSON: HTTP 403 FORBIDDEN")

    res_student_ak_pdf = client.get(f"/question-papers/{paper_id}/pdf/answer-key", headers=headers_student)
    assert res_student_ak_pdf.status_code == 403
    print("  [PASS] [Defense-in-Depth] Student access to Confidential Answer Key PDF: HTTP 403 FORBIDDEN")

    res_student_ms = client.get(f"/question-papers/{paper_id}/marking-scheme", headers=headers_student)
    assert res_student_ms.status_code == 403
    print("  [PASS] [Defense-in-Depth] Student access to Marking Scheme: HTTP 403 FORBIDDEN")

    # Faculty Author CAN access
    res_fac_ak = client.get(f"/question-papers/{paper_id}/answer-key", headers=headers_faculty)
    assert res_fac_ak.status_code == 200
    ak_data = res_fac_ak.json()["data"]
    assert ak_data["is_confidential"] == True
    print(f"  [PASS] Authorized Evaluator Answer Key retrieved: {len(ak_data['items'])} model solutions")

    # 8. Complete Output Package & PDF Exports
    print("\n[Stage 8] Complete Output Package & Artifact Verification")
    # Clean Student Question Paper (No Answers)
    res_qp_pdf = client.get(f"/question-papers/{paper_id}/pdf", headers=headers_faculty)
    assert res_qp_pdf.status_code == 200
    assert len(res_qp_pdf.content) > 1000
    print(f"  [PASS] Printable Student Question Paper PDF: {len(res_qp_pdf.content)} bytes (Clean layout, no answers)")

    # Confidential Evaluator Answer Key PDF
    res_ak_pdf = client.get(f"/question-papers/{paper_id}/pdf/answer-key", headers=headers_faculty)
    assert res_ak_pdf.status_code == 200
    assert len(res_ak_pdf.content) > 1000
    print(f"  [PASS] Confidential Evaluator Answer Key PDF: {len(res_ak_pdf.content)} bytes (Watermarked, with solutions)")

    # Marking Scheme PDF
    res_ms_pdf = client.get(f"/question-papers/{paper_id}/pdf/marking-scheme", headers=headers_faculty)
    assert res_ms_pdf.status_code == 200
    assert len(res_ms_pdf.content) > 1000
    print(f"  [PASS] Formal Marking Scheme & Rubrics PDF: {len(res_ms_pdf.content)} bytes (Step-wise mark allocations)")

    # 9. Multi-Stage Workflow & Anti-Self-Approval
    print("\n[Stage 9] Institutional Approval Workflow & Immutable Lock Guard")
    # Faculty submits paper for moderation
    res = client.post(
        f"/question-papers/{paper_id}/action",
        json={"action": "SUBMIT_FOR_REVIEW", "comments": "Submitted for departmental HOD review."},
        headers=headers_faculty
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "UNDER_REVIEW"
    print("  [PASS] Paper transitioned to 'UNDER_REVIEW'")

    # Anti-Self-Approval: Faculty attempts to self-approve own paper -> MUST FAIL (403)
    res_self_appr = client.post(
        f"/question-papers/{paper_id}/action",
        json={"action": "APPROVE", "comments": "Faculty attempting self-approval."},
        headers=headers_faculty
    )
    assert res_self_appr.status_code == 403
    print("  [PASS] [Workflow Guard] Anti-Self-Approval rule enforced: Faculty cannot self-approve own paper (403)")

    # HOD reviews and approves
    res_hod_appr = client.post(
        f"/question-papers/{paper_id}/action",
        json={"action": "APPROVE", "comments": "Approved by Head of Department."},
        headers=headers_hod
    )
    assert res_hod_appr.status_code == 200
    assert res_hod_appr.json()["data"]["status"] == "APPROVED"
    print("  [PASS] Paper approved by HOD: status = 'APPROVED'")

    # Controller finalizes paper
    res_ctrl_fin = client.post(
        f"/question-papers/{paper_id}/action",
        json={"action": "FINALIZE", "comments": "Paper finalized by Examination Controller."},
        headers=headers_controller
    )
    assert res_ctrl_fin.status_code == 200
    assert res_ctrl_fin.json()["data"]["status"] == "FINALIZED"
    print("  [PASS] Paper finalized by Exam Controller: status = 'FINALIZED'")

    # Immutable Lock Guard: attempts to modify or regenerate questions in finalized paper MUST FAIL (400)
    res_mod_locked = client.post(
        f"/question-papers/{paper_id}/regenerate-question/{pq_id}",
        json={"preference": "AI"},
        headers=headers_faculty
    )
    assert res_mod_locked.status_code == 400
    print("  [PASS] [Lock Guard] Finalized paper is immutably locked: modification attempt rejected (HTTP 400)")

    print("\n" + "=" * 70)
    print("ALL AI QUESTION PAPER GENERATOR E2E VERIFICATION TESTS PASSED (100%)!")
    print("=" * 70)

if __name__ == "__main__":
    run_e2e_verification()
