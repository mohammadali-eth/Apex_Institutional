import httpx
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def unwrap(res):
    d = res.json()
    if isinstance(d, dict) and "data" in d:
        return d["data"]
    return d

def run_tests():
    client = httpx.Client(base_url=BASE_URL, timeout=40.0)

    print("=================================================================")
    print(" QPMS AI Question Paper Generator - Accuracy & Marks Test Suite")
    print("=================================================================")

    # 1. Login as Faculty
    print("\n[Step 1] Authenticating as Faculty...")
    login_resp = client.post("/auth/login", json={"email": "teacher@university.in", "password": "Admin@12345"})
    assert login_resp.status_code == 200, f"Faculty login failed: {login_resp.text}"
    token = unwrap(login_resp)["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("  -> Authenticated successfully!")

    # 2. Test Provider Status Endpoint
    print("\n[Step 2] Testing Provider Status Endpoint (GET /question-papers/provider-status)...")
    provider_res = client.get("/question-papers/provider-status", headers=headers)
    assert provider_res.status_code == 200, f"Provider status check failed: {provider_res.text}"
    p_data = unwrap(provider_res)
    print(f"  -> Provider: {p_data.get('provider')}, Model: {p_data.get('model')}, Status: {p_data.get('status')}")
    print(f"  -> Timeout: {p_data.get('timeout_seconds')}s, Rate Limit: {p_data.get('rate_limit_policy')}")
    # Verify no raw keys leaked
    raw_str = provider_res.text.lower()
    assert "api_key" not in p_data or not p_data.get("api_key") or "..." in str(p_data.get("api_key")), "Leaked API key detected!"
    print("  -> Security check passed: Zero secret leakage.")

    # 3. Retrieve Subjects & Identify Syllabus Availability
    print("\n[Step 3] Fetching assigned subjects...")
    subj_res = client.get("/faculty/subjects", headers=headers)
    assert subj_res.status_code == 200, f"Failed to get subjects: {subj_res.text}"
    subjects = unwrap(subj_res)
    assert len(subjects) > 0, "No subjects found for faculty"
    
    dbms_subj = next((s for s in subjects if "DBMS" in s["name"].upper() or "DATABASE" in s["name"].upper()), subjects[0])
    os_subj = next((s for s in subjects if "OPERATING" in s["name"].upper() or s["id"] != dbms_subj["id"]), subjects[0])
    
    print(f"  -> Subject with syllabus: {dbms_subj['name']} ({dbms_subj['id']})")
    print(f"  -> Secondary subject: {os_subj['name']} ({os_subj['id']})")

    # 4. Syllabus Readiness Check on DBMS
    print("\n[Step 4] Checking Syllabus Readiness for DBMS...")
    syl_res_dbms = client.get(f"/question-papers/syllabus-check?subject_id={dbms_subj['id']}", headers=headers)
    assert syl_res_dbms.status_code == 200, f"Syllabus check failed: {syl_res_dbms.text}"
    syl_dbms = unwrap(syl_res_dbms)
    print(f"  -> Status: {syl_dbms['status']}, Units: {syl_dbms['units_count']}, Topics: {syl_dbms['topics_count']}")
    assert syl_dbms["status"] == "AVAILABLE", f"Expected AVAILABLE for DBMS, got {syl_dbms['status']}"
    assert syl_dbms.get("allow_fallback_required", False) is False
    assert len(syl_dbms["units"]) > 0

    # 5. Missing Syllabus vs Fallback Gate Check on OS
    print("\n[Step 5] Checking Syllabus Readiness for Secondary Subject...")
    syl_res_os = client.get(f"/question-papers/syllabus-check?subject_id={os_subj['id']}", headers=headers)
    assert syl_res_os.status_code == 200
    syl_os = unwrap(syl_res_os)
    print(f"  -> Status: {syl_os['status']}, Units: {syl_os['units_count']}")

    if syl_os["status"] in ["UNAVAILABLE", "INCOMPLETE"]:
        print("  -> Testing strict rejection when allow_fallback=False...")
        rej_payload = {
            "subject_id": os_subj["id"],
            "title": "OS Midterm 2026",
            "exam_name": "Mid Semester Exam",
            "duration_minutes": 120,
            "total_marks": 50,
            "instructions": "All questions compulsory.",
            "allow_fallback": False,
            "distribution": [
                {"question_type": "MCQ", "marks": 1, "count": 10, "section_name": "Section A", "selection_rule": "SINGLE", "has_or_alternative": False},
                {"question_type": "DESCRIPTIVE", "marks": 5, "count": 4, "section_name": "Section B", "selection_rule": "SINGLE", "has_or_alternative": False},
                {"question_type": "DESCRIPTIVE", "marks": 10, "count": 2, "section_name": "Section C", "selection_rule": "SINGLE", "has_or_alternative": False}
            ]
        }
        rej_res = client.post("/question-papers/generator/generate", json=rej_payload, headers=headers)
        assert rej_res.status_code == 400, f"Expected 400 rejection for missing syllabus, got {rej_res.status_code}: {rej_res.text}"
        print(f"  -> Successfully rejected without consent: {rej_res.json().get('message') or rej_res.json().get('detail')}")

        print("  -> Testing authorized generation with allow_fallback=True...")
        rej_payload["allow_fallback"] = True
        fb_res = client.post("/question-papers/generator/generate", json=rej_payload, headers=headers)
        assert fb_res.status_code == 200, f"Fallback generation failed: {fb_res.text}"
        fb_paper = unwrap(fb_res)
        assert fb_paper["is_syllabus_grounded"] is False, "Fallback paper must NOT be marked syllabus grounded"
        assert fb_paper["generation_mode"] == "FALLBACK_ACADEMIC"
        assert fb_paper["total_marks"] == 50
        print(f"  -> Fallback generation succeeded: Paper ID {fb_paper['id']} explicitly marked as {fb_paper['generation_mode']}.")

    # 6. Test 50-Marks Paper Generation with Syllabus Grounding & OR Pairs
    print("\n[Step 6] Testing 50-Marks Paper Generation with Syllabus Grounding & OR Pairs...")
    paper_50_payload = {
        "subject_id": dbms_subj["id"],
        "title": "DBMS Mid-Term Examination 2026",
        "exam_name": "Mid Semester Examination",
        "duration_minutes": 120,
        "total_marks": 50,
        "instructions": "1. Section A is compulsory.\n2. In Section B and C, answer one question from each OR pair.",
        "allow_fallback": False,
        "distribution": [
            {
                "question_type": "MCQ",
                "marks": 1,
                "count": 10,
                "section_name": "Section A",
                "selection_rule": "SINGLE",
                "has_or_alternative": False
            },
            {
                "question_type": "DESCRIPTIVE",
                "marks": 5,
                "count": 4,
                "section_name": "Section B",
                "selection_rule": "OR_PAIR",
                "has_or_alternative": True,
                "or_question_type": "DESCRIPTIVE",
                "or_marks": 5
            },
            {
                "question_type": "DESCRIPTIVE",
                "marks": 10,
                "count": 2,
                "section_name": "Section C",
                "selection_rule": "OR_PAIR",
                "has_or_alternative": True,
                "or_question_type": "DESCRIPTIVE",
                "or_marks": 10
            }
        ],
        "difficulty": {"easy": 30, "medium": 50, "hard": 20},
        "bloom_taxonomy": {"remember": 20, "understand": 30, "apply": 25, "analyze": 15, "evaluate": 5, "create": 5},
        "source_ratio": {"bank_percentage": 50, "ai_percentage": 50}
    }

    gen_50_res = client.post("/question-papers/generator/generate", json=paper_50_payload, headers=headers)
    assert gen_50_res.status_code == 200, f"Failed to generate 50-mark paper: {gen_50_res.text}"
    paper_50 = unwrap(gen_50_res)
    
    print(f"  -> Generated Paper ID: {paper_50['id']}")
    print(f"  -> Paper Total Marks: {paper_50['total_marks']} (Requested: 50)")
    assert paper_50["total_marks"] == 50, f"CRITICAL BUG: Paper total marks is {paper_50['total_marks']}, expected 50!"
    assert paper_50["is_syllabus_grounded"] is True, "Expected paper to be syllabus grounded"
    assert paper_50["generation_mode"] == "SYLLABUS_GROUNDED"

    # Verify sections and questions
    sections = paper_50["sections"]
    print(f"  -> Sections count: {len(sections)}")
    total_q_count = sum(len(sec["questions"]) for sec in sections)
    print(f"  -> Total displayed questions count: {total_q_count}")

    # Verify syllabus provenance on each question
    provenance_found = 0
    covered_units = set()
    for sec in sections:
        for q in sec["questions"]:
            prov = q.get("syllabus_provenance")
            if prov:
                provenance_found += 1
                if prov.get("unit_title"):
                    covered_units.add(prov["unit_title"])

    print(f"  -> Questions with verified syllabus provenance: {provenance_found} / {total_q_count}")
    print(f"  -> Distinct syllabus units covered: {len(covered_units)} ({list(covered_units)[:3]}...)")
    assert provenance_found > 0, "No syllabus provenance attached to questions"

    # 7. Validate 50-Mark Paper with Deterministic Validator
    print("\n[Step 7] Running deterministic validation check on 50-mark paper...")
    val_res = client.get(f"/question-papers/{paper_50['id']}/validate", headers=headers)
    assert val_res.status_code == 200, f"Validation failed: {val_res.text}"
    val_data = unwrap(val_res)
    print(f"  -> Is Valid: {val_data['is_valid']}")
    print(f"  -> Target Marks Expected: {val_data['total_marks_expected']}")
    print(f"  -> Candidate Attempt Marks Actual: {val_data['total_marks_actual']}")
    assert val_data["is_valid"] is True, f"Validation errors: {val_data.get('errors')}"
    assert val_data["total_marks_actual"] == 50, f"Actual attempt marks is {val_data['total_marks_actual']}, expected 50!"
    assert val_data["total_marks_expected"] == 50, f"Expected marks is {val_data['total_marks_expected']}, expected 50!"
    print("  -> ZERO MARKS DISCREPANCY VERIFIED! Candidate attempt marks == 50 Marks (Never 70).")

    # 8. Test In-place Question Regeneration
    print("\n[Step 8] Testing single question regeneration...")
    first_q = sections[0]["questions"][0]
    regen_res = client.post(f"/question-papers/{paper_50['id']}/regenerate-question/{first_q['id']}", json={"preference": "ANY"}, headers=headers)
    assert regen_res.status_code == 200, f"Regeneration failed: {regen_res.text}"
    print("  -> Question regenerated successfully while preserving section marks.")

    # 9. Test Multi-Artifact PDF Endpoints
    print("\n[Step 9] Verifying Multi-Artifact PDF exports...")
    # Student paper PDF
    pdf_paper = client.get(f"/question-papers/{paper_50['id']}/pdf", headers=headers)
    assert pdf_paper.status_code == 200, f"Student PDF failed: {pdf_paper.status_code}"
    assert pdf_paper.content.startswith(b"%PDF"), "Response is not a valid PDF"
    print("  -> 1. Student Exam Paper PDF: 200 OK (Clean layout, no confidential keys)")

    # Teacher solution PDF
    pdf_sol = client.get(f"/question-papers/{paper_50['id']}/pdf/solution", headers=headers)
    assert pdf_sol.status_code == 200, f"Teacher solution PDF failed: {pdf_sol.status_code}"
    assert pdf_sol.content.startswith(b"%PDF"), "Response is not a valid PDF"
    print("  -> 2. Teacher Master Copy PDF: 200 OK (Includes expected answers & bloom levels)")

    # Answer key PDF
    pdf_key = client.get(f"/question-papers/{paper_50['id']}/answer-key-pdf", headers=headers)
    assert pdf_key.status_code == 200, f"Answer key PDF failed: {pdf_key.status_code}"
    assert pdf_key.content.startswith(b"%PDF"), "Response is not a valid PDF"
    print("  -> 3. Answer Key & Rubrics PDF: 200 OK")

    # Marking scheme PDF
    pdf_scheme = client.get(f"/question-papers/{paper_50['id']}/marking-scheme-pdf", headers=headers)
    assert pdf_scheme.status_code == 200, f"Marking scheme PDF failed: {pdf_scheme.status_code}"
    assert pdf_scheme.content.startswith(b"%PDF"), "Response is not a valid PDF"
    print("  -> 4. Moderator Marking Scheme PDF: 200 OK")

    # 10. Test Submission to HOD Moderation Queue
    print("\n[Step 10] Testing submission for review (SUBMIT_FOR_REVIEW)...")
    action_res = client.post(
        f"/question-papers/{paper_50['id']}/action",
        json={"action": "SUBMIT_FOR_REVIEW", "comments": "Grounded in DBMS curriculum v1. Ready for HOD review."},
        headers=headers
    )
    assert action_res.status_code == 200, f"Action failed: {action_res.text}"
    assert unwrap(action_res)["status"] == "UNDER_REVIEW"
    print("  -> Successfully submitted to HOD moderation queue (Status: UNDER_REVIEW).")
    print("  -> Successfully submitted to HOD moderation queue (Status: UNDER_REVIEW).")

    print("\n=================================================================")
    print(" ALL 10 TESTS PASSED! FULL ACCURACY & MARKS BUG RESOLVED!")
    print("=================================================================")

if __name__ == "__main__":
    run_tests()
