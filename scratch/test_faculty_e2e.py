import urllib.request
import json
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def api_call(path, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(f"{BASE_URL}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "application/pdf" in content_type:
                return resp.status, {"pdf_bytes": len(resp.read())}
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, {"error": err_body}

def login(email, password):
    st, res = api_call("/auth/login", method="POST", data={"email": email, "password": password})
    assert st == 200, f"Login failed for {email}: {res}"
    return res["data"]["access_token"], res["data"]["user"]

def main():
    print("=" * 70)
    print(" QPMS APEX — FACULTY ROLE FULL-STACK E2E VERIFICATION SUITE")
    print("=" * 70)

    # 1. Faculty Authentication
    print("\n[PHASE 1] Authenticating as Faculty Member (teacher@university.in)...")
    token, user = login("teacher@university.in", "Admin@12345")
    assert user["role_name"] in ["FACULTY", "TEACHER"], f"Expected FACULTY/TEACHER, got {user['role_name']}"
    print(f"  -> Logged in as: {user['full_name']} ({user['email']})")
    print(f"  -> Role: {user['role_name']} | Department: {user.get('department_name')}")

    # 2. Faculty Dashboard Stats
    print("\n[PHASE 2] Verifying Faculty Dashboard Overview (GET /faculty/dashboard)...")
    st, d = api_call("/faculty/dashboard", token=token)
    assert st == 200, f"Dashboard failed ({st}): {d}"
    stats = d["data"]
    print(f"  -> Faculty: {stats['faculty_name']} | Dept: {stats['department_name']}")
    print(f"  -> Assigned Subjects: {stats['assigned_subjects_count']}")
    print(f"  -> Questions Authored: {stats['total_questions_created']} (Draft: {stats['draft_questions_count']}, Pending: {stats['pending_review_questions_count']}, Approved: {stats['approved_questions_count']})")
    print(f"  -> Papers Authored: {stats['draft_papers_count'] + stats['pending_review_papers_count'] + stats['approved_papers_count']}")
    print(f"  -> Upcoming Deadlines: {stats['upcoming_deadlines_count']}")
    print(f"  -> Recent Feedback Items: {len(stats['recent_feedback'])}")
    print(f"  -> Activity Records: {len(stats['recent_activity'])}")

    # 3. Assigned Subjects & Syllabus
    print("\n[PHASE 3] Verifying Assigned Subjects & Syllabus (GET /faculty/subjects)...")
    st, s_list = api_call("/faculty/subjects", token=token)
    assert st == 200, f"Subjects failed ({st}): {s_list}"
    subjects = s_list["data"]
    assert len(subjects) > 0, "Faculty member must have assigned subjects"
    first_sub = subjects[0]
    print(f"  -> Retrieved {len(subjects)} assigned subject(s)")
    print(f"  -> Primary Subject: {first_sub['code']} — {first_sub['name']} (Credits: {first_sub['credits']}, Units: {first_sub['units_count']})")

    st, s_detail = api_call(f"/faculty/subjects/{first_sub['id']}", token=token)
    assert st == 200, f"Subject detail failed ({st}): {s_detail}"
    sd = s_detail["data"]
    print(f"  -> Subject syllabus verified: {len(sd['units'])} units loaded")
    first_unit_id = sd["units"][0]["id"] if sd["units"] else None

    # 4. Question Creation, Editing, Duplication, and Deletion
    print("\n[PHASE 4] Verifying Question Authoring & Lifecycle...")
    unique_suffix = secrets_hex = uuid.uuid4().hex[:6]
    q_payload = {
        "subject_id": first_sub["id"],
        "unit_id": first_unit_id,
        "question_text": f"Explain ACID properties in relational database management systems ({unique_suffix})",
        "question_type": "DESCRIPTIVE",
        "marks": 5,
        "difficulty": "MEDIUM",
        "language": "English",
        "explanation": "Atomicity, Consistency, Isolation, and Durability ensure reliable transaction processing.",
        "expected_answer": "Detailed breakdown of A, C, I, D principles with examples.",
        "tags": ["acid", "transactions", "database"],
        "is_submitted": False
    }

    # 4a. Create Draft
    st, new_q = api_call("/faculty/questions", method="POST", data=q_payload, token=token)
    assert st == 200, f"Question create failed ({st}): {new_q}"
    q_data = new_q["data"]
    q_id = q_data["id"]
    print(f"  -> Created draft question: {q_data['question_text'][:50]}... (ID: {q_id}, Status: {q_data['status']})")
    assert q_data["status"] == "DRAFT"

    # 4b. Update Draft
    st, upd_q = api_call(f"/faculty/questions/{q_id}", method="PUT", data={
        "marks": 8,
        "difficulty": "HARD"
    }, token=token)
    assert st == 200, f"Question update failed ({st}): {upd_q}"
    assert upd_q["data"]["marks"] == 8 and upd_q["data"]["difficulty"] == "HARD"
    print(f"  -> Updated draft question marks to 8 and difficulty to HARD")

    # 4c. Duplicate Draft
    st, dup_q = api_call(f"/faculty/questions/{q_id}/duplicate", method="POST", token=token)
    assert st == 200, f"Question duplicate failed ({st}): {dup_q}"
    dup_id = dup_q["data"]["id"]
    print(f"  -> Duplicated question into new draft: (ID: {dup_id})")

    # 4d. Delete Duplicate
    st, del_res = api_call(f"/faculty/questions/{dup_id}", method="DELETE", token=token)
    assert st == 200, f"Question delete failed ({st}): {del_res}"
    print(f"  -> Successfully deleted duplicated draft")

    # 4e. Submit Draft for Review
    st, sub_res = api_call(f"/faculty/questions/{q_id}/submit", method="POST", token=token)
    assert st == 200, f"Question submit failed ({st}): {sub_res}"
    assert sub_res["data"]["status"] == "SUBMITTED"
    print(f"  -> Submitted question for review: transitioned to {sub_res['data']['status']}")

    # 5. Question Bank Search & Reuse
    print("\n[PHASE 5] Verifying Approved Question Bank Search & Reuse...")
    st, qb_res = api_call("/faculty/question-bank", token=token)
    assert st == 200, f"Question bank search failed ({st}): {qb_res}"
    bank_meta = qb_res["data"]["meta"]
    print(f"  -> Approved questions pool available for faculty reuse: {bank_meta['total']} questions")

    # 6. Question Paper Creation, Auto-Generation, Validation, and PDF
    print("\n[PHASE 6] Verifying Question Paper Builder & Blueprint Workflow...")
    # 6a. Initialize Manual Draft
    paper_init = {
        "subject_id": first_sub["id"],
        "title": f"Midterm Assessment {unique_suffix}",
        "exam_name": "Mid Semester Examination 2026",
        "duration_minutes": 90,
        "total_marks": 50,
        "instructions": "Answer all sections."
    }
    st, p_draft = api_call("/faculty/papers", method="POST", data=paper_init, token=token)
    assert st == 200, f"Paper init failed ({st}): {p_draft}"
    paper = p_draft["data"]
    paper_id = paper["id"]
    sec_a_id = paper["sections"][0]["id"]
    print(f"  -> Initialized paper draft: {paper['title']} (ID: {paper_id}, Sections: {len(paper['sections'])})")

    # 6b. Add Approved Question to Section A
    if qb_res["data"]["items"]:
        appr_q = qb_res["data"]["items"][0]
        st, add_q = api_call(f"/faculty/papers/{paper_id}/questions", method="POST", data={
            "section_id": sec_a_id,
            "question_id": appr_q["id"]
        }, token=token)
        assert st == 200, f"Add question to paper failed ({st}): {add_q}"
        print(f"  -> Added approved question {appr_q['id'][:8]} to Section A")

    # 6c. Validate Paper
    st, val_res = api_call(f"/faculty/papers/{paper_id}/validate", token=token)
    assert st == 200, f"Validation failed ({st}): {val_res}"
    val = val_res["data"]
    print(f"  -> Blueprint Validation: Is Valid = {val['is_valid']}, Current Marks = {val['total_marks_actual']}/{val['total_marks_expected']}")

    # 6d. Export PDF
    st, pdf_res = api_call(f"/question-papers/{paper_id}/pdf", token=token)
    assert st == 200, f"PDF export failed ({st}): {pdf_res}"
    print(f"  -> Exported PDF proof successfully ({pdf_res.get('pdf_bytes', 0)} bytes)")

    # 7. Review Feedback Hub
    print("\n[PHASE 7] Verifying Moderation Feedback Hub (GET /faculty/feedback)...")
    st, fb_res = api_call("/faculty/feedback", token=token)
    assert st == 200, f"Feedback failed ({st}): {fb_res}"
    print(f"  -> Retrieved {len(fb_res['data'])} moderation feedback entries")

    # 8. Exam Schedule & Deadlines
    print("\n[PHASE 8] Verifying Examination Schedule (GET /faculty/schedule)...")
    st, sc_res = api_call("/faculty/schedule", token=token)
    assert st == 200, f"Schedule failed ({st}): {sc_res}"
    print(f"  -> Retrieved {len(sc_res['data'])} scheduled course examinations")

    # 9. Academic Reports & Analytics
    print("\n[PHASE 9] Verifying Faculty Academic Performance Report (GET /faculty/reports)...")
    st, rep_res = api_call("/faculty/reports", token=token)
    assert st == 200, f"Reports failed ({st}): {rep_res}"
    r = rep_res["data"]
    print(f"  -> Faculty: {r['faculty_name']} ({r['email']})")
    print(f"  -> Questions Authored: {r['total_questions']} (Approval Rate: {r['approval_rate_percent']}%)")
    print(f"  -> Papers Authored: {r['total_papers']}")
    print(f"  -> Subject Workload Rows: {len(r['subject_workload'])}")

    # 10. Security & RBAC Boundary Enforcement
    print("\n[PHASE 10] Verifying Security Boundaries & RBAC Isolation...")
    # 10a. Faculty cannot call Super Admin endpoint
    st, sa_block = api_call("/universities", method="POST", data={"name": "Illegal", "code": "ILLEGAL"}, token=token)
    print(f"  -> Faculty creating university: status {st} (Expected 403 Forbidden)")
    assert st == 403, f"Expected 403, got {st}"

    # 10b. Faculty cannot call University Admin endpoint
    st, ua_block = api_call("/university-admin/dashboard", token=token)
    print(f"  -> Faculty accessing University Admin dashboard: status {st} (Expected 403 Forbidden)")
    assert st == 403, f"Expected 403, got {st}"

    # 10c. Faculty cannot call HOD review queue
    st, hod_block = api_call("/hod/review-questions", token=token)
    print(f"  -> Faculty accessing HOD review queue: status {st} (Expected 403 Forbidden)")
    assert st == 403, f"Expected 403, got {st}"

    # 10d. Anti-Self-Approval on Questions
    st, self_q_block = api_call(f"/questions/{q_id}/action", method="POST", data={
        "action": "APPROVE",
        "comments": "Illegal self approval"
    }, token=token)
    print(f"  -> Faculty self-approving question: status {st} (Expected 403 Forbidden)")
    assert st == 403, f"Expected 403, got {st}"

    # 10e. Anti-Self-Approval on Papers
    st, self_p_block = api_call(f"/question-papers/{paper_id}/action", method="POST", data={
        "action": "APPROVE",
        "comments": "Illegal paper self approval"
    }, token=token)
    print(f"  -> Faculty self-approving question paper: status {st} (Expected 403 Forbidden)")
    assert st == 403, f"Expected 403, got {st}"

    # 11. System Non-Regression Across Other Roles
    print("\n[PHASE 11] Verifying System Non-Regression Across Other Roles...")
    # HOD
    hod_token, hod_user = login("hod@bca.university.in", "Admin@12345")
    st, hod_dash = api_call("/hod/dashboard", token=hod_token)
    assert st == 200, f"HOD regression failed ({st}): {hod_dash}"
    print(f"  -> HOD Dashboard verified OK: {hod_user['full_name']}")

    # University Admin
    ua_token, ua_user = login("john@universityadmin.in", "Admin@12345")
    st, ua_dash = api_call("/university-admin/dashboard", token=ua_token)
    assert st == 200, f"Univ Admin regression failed ({st}): {ua_dash}"
    print(f"  -> University Admin verified OK: {ua_user['full_name']}")

    # Student
    stu_token, stu_user = login("student@gmail.com", "Admin@12345")
    st, stu_dash = api_call("/student/dashboard", token=stu_token)
    assert st == 200, f"Student regression failed ({st}): {stu_dash}"
    print(f"  -> Student Dashboard verified OK: {stu_user['full_name']}")

    # Super Admin
    sa_token, sa_user = login("apex@superadmin.com", "Admin@12345")
    st, sa_univs = api_call("/universities", token=sa_token)
    assert st == 200, f"Super Admin regression failed ({st}): {sa_univs}"
    print(f"  -> Super Admin verified OK: {sa_user['full_name']}")

    print("\n" + "=" * 70)
    print(" ALL 11 VERIFICATION PHASES PASSED WITH ZERO ERRORS!")
    print("=" * 70)

if __name__ == "__main__":
    main()
