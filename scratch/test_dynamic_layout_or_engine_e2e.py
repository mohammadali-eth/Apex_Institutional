import httpx
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def login(client, email, password):
    resp = client.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        print(f"FAILED LOGIN: {email} -> {resp.text}")
        sys.exit(1)
    return resp.json()["data"]["access_token"]

def main():
    print("=== STARTING DYNAMIC LAYOUT & OR ENGINE E2E VERIFICATION ===")
    
    with httpx.Client(timeout=60.0) as client:
        # 1. Login faculty & student
        teacher_token = login(client, "teacher@university.in", "Admin@12345")
        student_token = login(client, "student@gmail.com", "Admin@12345")
        teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
        student_headers = {"Authorization": f"Bearer {student_token}"}
        print("[PASS] 1. Authentication successful for faculty and student")

        # 2. Get subject
        sub_resp = client.get(f"{BASE_URL}/faculty/subjects", headers=teacher_headers)
        subjects = sub_resp.json().get("data", [])
        if not subjects:
            print("No faculty subjects found!")
            sys.exit(1)
        subject = subjects[0]
        subject_id = subject["id"]
        print(f"[PASS] 2. Subject retrieved: {subject['name']} ({subject.get('code')})")

        # 3. Grounded AI Generation with Dynamic Blueprint including OR pairs
        print("\n--- Testing Grounded Generation with Dynamic Blueprint & OR Alternatives ---")
        gen_payload = {
            "subject_id": subject_id,
            "title": "Automated End-Term Engineering Examination",
            "exam_name": "Autumn Semester Final 2026",
            "duration_minutes": 180,
            "total_marks": 50,
            "instructions": "Answer all compulsory questions. Choose one question from each internal choice pair.",
            "difficulty_distribution": {"EASY": 40, "MEDIUM": 40, "HARD": 20},
            "bloom_distribution": {"REMEMBER": 20, "UNDERSTAND": 40, "APPLY": 40},
            "source_ratio": {"bank_percentage": 50, "ai_percentage": 50},
            "distribution": [
                {
                    "section_name": "Part I - Conceptual Foundations",
                    "question_type": "MCQ",
                    "marks": 2,
                    "count": 5,
                    "has_or_alternative": False,
                    "selection_rule": "ALL"
                },
                {
                    "section_name": "Part II - Analytical & Core Problem Solving",
                    "question_type": "SHORT",
                    "marks": 5,
                    "count": 2,
                    "has_or_alternative": True,
                    "or_question_type": "SHORT",
                    "or_marks": 5,
                    "selection_rule": "OR_PAIR"
                },
                {
                    "section_name": "Part II - Analytical & Core Problem Solving",
                    "question_type": "SHORT",
                    "marks": 5,
                    "count": 2,
                    "has_or_alternative": False,
                    "selection_rule": "ALL"
                },
                {
                    "section_name": "Part III - Advanced Design Synthesis",
                    "question_type": "DESCRIPTIVE",
                    "marks": 10,
                    "count": 1,
                    "has_or_alternative": True,
                    "or_question_type": "DESCRIPTIVE",
                    "or_marks": 10,
                    "selection_rule": "OR_PAIR"
                },
                {
                    "section_name": "Part III - Advanced Design Synthesis",
                    "question_type": "DESCRIPTIVE",
                    "marks": 10,
                    "count": 1,
                    "has_or_alternative": False,
                    "selection_rule": "ALL"
                }
            ]
        }

        gen_resp = client.post(f"{BASE_URL}/question-papers/generate", headers=teacher_headers, json=gen_payload)
        if gen_resp.status_code != 200:
            print(f"FAILED PAPER GENERATION: {gen_resp.status_code} -> {gen_resp.text}")
            sys.exit(1)
        
        paper_data = gen_resp.json()["data"]
        paper_id = paper_data["id"]
        print(f"[PASS] 3. Paper generated successfully. ID: {paper_id}")
        print(f"       Target Marks: {paper_data['total_marks']} M")
        print(f"       Attempt Marks: {paper_data['current_marks']} M")
        print(f"       Displayed Marks: {paper_data['displayed_marks']} M")
        print(f"       Total Sections: {len(paper_data['sections'])}")

        # Verify attempt marks equals target marks 50M
        assert paper_data['current_marks'] == 50, f"Expected 50M attempt marks, got {paper_data['current_marks']}"
        # Verify displayed marks is greater than attempt marks because of OR alternatives (2*5M + 10M = 20M extra displayed)
        assert paper_data['displayed_marks'] > 50, f"Expected displayed marks > 50, got {paper_data['displayed_marks']}"
        print(f"[PASS] 4. Centralized Marks Verification passed: Attempt = 50M, Displayed = {paper_data['displayed_marks']}M")

        # 4. Verify OR pairs inside sections
        total_or_pairs = 0
        all_questions = []
        for sec in paper_data["sections"]:
            for q in sec["questions"]:
                all_questions.append(q)
                if q.get("group_type") == "OR_PAIR":
                    total_or_pairs += 1
        print(f"[PASS] 5. OR Alternative Questions synthesized/curated: {total_or_pairs} questions in OR groups")
        assert total_or_pairs >= 6, f"Expected at least 6 questions in OR groups (3 pairs), found {total_or_pairs}"

        # 5. Test Dynamic Sections Management: Create, Update, Delete
        print("\n--- Testing Dynamic Section Management ---")
        sec_create_payload = {
            "name": "Part IV - Optional Hands-on Case Evaluation",
            "instructions": "Answer any 1 question from this specialized section.",
            "order_index": len(paper_data["sections"]) + 1,
            "section_type": "CHOICE_SECTION",
            "total_marks": 10,
            "selection_rule": "ATTEMPT_ANY_N",
            "required_attempts": 1
        }
        create_sec_resp = client.post(f"{BASE_URL}/question-papers/{paper_id}/sections", headers=teacher_headers, json=sec_create_payload)
        assert create_sec_resp.status_code == 200, f"Failed to create section: {create_sec_resp.text}"
        updated_paper = create_sec_resp.json()["data"]
        new_sec = [s for s in updated_paper["sections"] if s["name"] == sec_create_payload["name"]][0]
        print(f"[PASS] 6. Created dynamic section: {new_sec['name']} (ID: {new_sec['id']})")

        # Update section
        update_sec_resp = client.put(
            f"{BASE_URL}/question-papers/{paper_id}/sections/{new_sec['id']}",
            headers=teacher_headers,
            json={"name": "Part IV - Applied Case Evaluation", "total_marks": 15}
        )
        assert update_sec_resp.status_code == 200, f"Failed to update section: {update_sec_resp.text}"
        print("[PASS] 7. Updated dynamic section successfully")

        # Delete section
        del_sec_resp = client.delete(f"{BASE_URL}/question-papers/{paper_id}/sections/{new_sec['id']}", headers=teacher_headers)
        assert del_sec_resp.status_code == 200, f"Failed to delete section: {del_sec_resp.text}"
        print("[PASS] 8. Deleted dynamic section successfully")

        # 6. Test OR Alternative Endpoint: Add Alternative & Validate Mark Parity
        print("\n--- Testing First-Class OR Alternative Question Addition & Mark Parity ---")
        target_q = [q for q in all_questions if q.get("group_type") != "OR_PAIR"][0]
        print(f"       Target Question ID: {target_q['id']}, Marks: {target_q['marks']}")

        # Negative test: try adding alternative with different marks
        mismatch_payload = {
            "question_text": "Mismatched mark alternative question",
            "marks": target_q['marks'] + 4, # Mismatch!
            "source_type": "AI_GENERATED"
        }
        mismatch_resp = client.post(
            f"{BASE_URL}/question-papers/{paper_id}/questions/{target_q['id']}/add-alternative",
            headers=teacher_headers,
            json=mismatch_payload
        )
        assert mismatch_resp.status_code == 400, f"Expected 400 for mark mismatch, got {mismatch_resp.status_code}"
        print(f"[PASS] 9. Mark Parity Enforced: API rejected alternative with {target_q['marks']+4}M vs {target_q['marks']}M with HTTP 400")

        # Positive test: add alternative with exact mark parity
        valid_alt_payload = {
            "question_text": f"Synthesized Alternative (b) for curriculum verification testing concept {target_q['marks']}M.",
            "question_type": "SHORT",
            "marks": target_q['marks'],
            "difficulty": "MEDIUM",
            "bloom_level": "APPLY",
            "expected_answer": "Complete demonstration of alternative theoretical principle.",
            "marking_scheme": f"{target_q['marks']} Marks awarded for rigorous methodology.",
            "source_type": "AI_GENERATED"
        }
        valid_alt_resp = client.post(
            f"{BASE_URL}/question-papers/{paper_id}/questions/{target_q['id']}/add-alternative",
            headers=teacher_headers,
            json=valid_alt_payload
        )
        assert valid_alt_resp.status_code == 200, f"Failed to add alternative: {valid_alt_resp.text}"
        paper_after_alt = valid_alt_resp.json()["data"]
        print(f"[PASS] 10. Added OR Alternative with exact {target_q['marks']} Marks parity.")
        print(f"        Attempt Marks remain: {paper_after_alt['current_marks']} M")
        print(f"        Displayed Marks updated: {paper_after_alt['displayed_marks']} M")

        # Find the newly added alternative question
        sec_of_target = [s for s in paper_after_alt["sections"] if any(q["id"] == target_q["id"] for q in s["questions"])][0]
        alt_q_item = [q for q in sec_of_target["questions"] if q.get("alternative_label") == "b" and q.get("group_marks") == target_q["marks"]][0]

        # Test Unlinking alternative
        unlink_resp = client.post(
            f"{BASE_URL}/question-papers/{paper_id}/questions/{target_q['id']}/unlink-alternative",
            headers=teacher_headers
        )
        assert unlink_resp.status_code == 200, f"Failed to unlink alternative: {unlink_resp.text}"
        print("[PASS] 11. Unlinked alternative successfully")

        # Remove the extra alternative question so the paper marks balance back to original 50M
        del_alt_resp = client.delete(
            f"{BASE_URL}/question-papers/{paper_id}/questions/{alt_q_item['id']}",
            headers=teacher_headers
        )
        assert del_alt_resp.status_code == 200, f"Failed to remove extra question: {del_alt_resp.text}"
        paper_restored = del_alt_resp.json()["data"]
        assert paper_restored["current_marks"] == 50, f"Expected 50M attempt marks after cleanup, got {paper_restored['current_marks']}"
        print("[PASS] 12. Extra alternative cleaned up, attempt marks restored to 50M")

        # 7. Test Deterministic Validation Engine
        print("\n--- Testing Paper Validation Engine ---")
        val_resp = client.get(f"{BASE_URL}/question-papers/{paper_id}/validate", headers=teacher_headers)
        assert val_resp.status_code == 200, f"Validation endpoint failed: {val_resp.text}"
        val_data = val_resp.json()["data"]
        print(f"[PASS] 13. Paper Validation Status: {'VALID' if val_data['is_valid'] else 'INVALID'}")
        print(f"        Errors: {val_data['errors']}")
        print(f"        Warnings: {val_data['warnings']}")
        assert len(val_data['errors']) == 0, f"Unexpected validation errors: {val_data['errors']}"

        # 8. Test Reusable Layout Templates
        print("\n--- Testing Layout Template System ---")
        save_tmpl_resp = client.post(
            f"{BASE_URL}/question-papers/{paper_id}/save-as-template?template_name=University+Engineering+Pattern+50M",
            headers=teacher_headers
        )
        assert save_tmpl_resp.status_code == 200, f"Failed to save as template: {save_tmpl_resp.text}"
        tmpl_data = save_tmpl_resp.json()["data"]
        print(f"[PASS] 14. Saved layout pattern as template: '{tmpl_data['name']}' (ID: {tmpl_data['id']})")
        assert tmpl_data.get("sections_config"), "Template missing sections_config"
        print(f"        Sections in template: {len(tmpl_data['sections_config'])}")

        list_tmpl_resp = client.get(f"{BASE_URL}/question-papers/templates", headers=teacher_headers)
        assert list_tmpl_resp.status_code == 200, f"Failed to list templates: {list_tmpl_resp.text}"
        templates_list = list_tmpl_resp.json()["data"]
        assert any(t["id"] == tmpl_data["id"] for t in templates_list), "Newly created template not returned in list"
        print(f"[PASS] 15. Listed {len(templates_list)} available templates including newly created template")

        # 9. Test PDF Generation (Paper, Answer Key, Marking Scheme)
        print("\n--- Testing PDF Generation & Integrity ---")
        pdf_resp = client.get(f"{BASE_URL}/question-papers/{paper_id}/pdf", headers=teacher_headers)
        assert pdf_resp.status_code == 200, f"Question paper PDF failed: {pdf_resp.status_code}"
        assert pdf_resp.headers.get("content-type") == "application/pdf", "Content type is not PDF"
        assert len(pdf_resp.content) > 1000, "PDF content is too small"
        print(f"[PASS] 16. Question Paper PDF generated successfully ({len(pdf_resp.content)} bytes)")

        ans_pdf_resp = client.get(f"{BASE_URL}/question-papers/{paper_id}/answer-key-pdf", headers=teacher_headers)
        assert ans_pdf_resp.status_code == 200, f"Answer Key PDF failed: {ans_pdf_resp.status_code}"
        assert len(ans_pdf_resp.content) > 1000, "Answer Key PDF content is too small"
        print(f"[PASS] 17. Confidential Answer Key PDF generated successfully ({len(ans_pdf_resp.content)} bytes)")

        rubric_pdf_resp = client.get(f"{BASE_URL}/question-papers/{paper_id}/marking-scheme-pdf", headers=teacher_headers)
        assert rubric_pdf_resp.status_code == 200, f"Marking Scheme PDF failed: {rubric_pdf_resp.status_code}"
        assert len(rubric_pdf_resp.content) > 1000, "Marking Scheme PDF content is too small"
        print(f"[PASS] 18. Evaluation Marking Scheme PDF generated successfully ({len(rubric_pdf_resp.content)} bytes)")

        # 10. Security Check: Student Confidentiality
        print("\n--- Testing Role Security & Student Confidentiality ---")
        student_ans_resp = client.get(f"{BASE_URL}/question-papers/{paper_id}/answer-key", headers=student_headers)
        assert student_ans_resp.status_code == 403, f"Expected 403 for student accessing answer key, got {student_ans_resp.status_code}"
        print("[PASS] 19. Security Enforced: Student blocked from accessing answer keys (HTTP 403)")

        student_pdf_ans_resp = client.get(f"{BASE_URL}/question-papers/{paper_id}/answer-key-pdf", headers=student_headers)
        assert student_pdf_ans_resp.status_code == 403, f"Expected 403 for student accessing answer key PDF, got {student_pdf_ans_resp.status_code}"
        print("[PASS] 20. Security Enforced: Student blocked from downloading answer key PDF (HTTP 403)")

        print("\n=======================================================")
        print("ALL 20 END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS!")
        print("=======================================================")

if __name__ == "__main__":
    main()
