import urllib.request
import json

BASE_URL = "http://localhost:8000/api/v1"

def api_call(path, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(f"{BASE_URL}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, {"error": err_body}

def main():
    print("=" * 60)
    print(" TESTING FACULTY BACKEND ENDPOINTS")
    print("=" * 60)

    # 1. Login
    print("\n1. Logging in as faculty (teacher@university.in)...")
    st, res = api_call("/auth/login", method="POST", data={"email": "teacher@university.in", "password": "Admin@12345"})
    assert st == 200, f"Login failed: {res}"
    token = res["data"]["access_token"]
    user = res["data"]["user"]
    print(f"Logged in as: {user['full_name']} (Role: {user['role_name']})")

    # 2. Dashboard Stats
    print("\n2. Fetching Faculty Dashboard Stats (/faculty/dashboard)...")
    st, d = api_call("/faculty/dashboard", token=token)
    assert st == 200, f"Dashboard failed: {d}"
    stats = d["data"]
    print(f"Faculty: {stats['faculty_name']} | Dept: {stats['department_name']}")
    print(f"Assigned Subjects: {stats['assigned_subjects_count']}")
    print(f"Questions Created: {stats['total_questions_created']} (Drafts: {stats['draft_questions_count']}, Pending: {stats['pending_review_questions_count']}, Approved: {stats['approved_questions_count']})")
    print(f"Papers Created: {stats['draft_papers_count'] + stats['pending_review_papers_count'] + stats['approved_papers_count']}")
    print(f"Upcoming Exams: {len(stats['upcoming_exams'])}")
    print(f"Recent Feedback Items: {len(stats['recent_feedback'])}")

    # 3. Assigned Subjects
    print("\n3. Fetching Assigned Subjects (/faculty/subjects)...")
    st, s_res = api_call("/faculty/subjects", token=token)
    assert st == 200, f"Subjects failed: {s_res}"
    subjects = s_res["data"]
    print(f"Found {len(subjects)} assigned subjects.")
    assert len(subjects) > 0, "Faculty should have assigned subjects"
    first_sub = subjects[0]
    print(f"First subject: {first_sub['code']} - {first_sub['name']} (Credits: {first_sub['credits']}, Units: {first_sub['units_count']})")

    # 4. Subject Detail
    print(f"\n4. Fetching Subject Detail (/faculty/subjects/{first_sub['id']})...")
    st, sd_res = api_call(f"/faculty/subjects/{first_sub['id']}", token=token)
    assert st == 200, f"Subject detail failed: {sd_res}"
    s_detail = sd_res["data"]
    print(f"Subject units count: {len(s_detail['units'])}")
    first_unit_id = s_detail["units"][0]["id"] if s_detail["units"] else None

    # 5. My Questions
    print("\n5. Listing Faculty Questions (/faculty/questions)...")
    st, q_list = api_call("/faculty/questions", token=token)
    assert st == 200, f"Questions list failed: {q_list}"
    items = q_list["data"]["items"]
    meta = q_list["data"]["meta"]
    print(f"Faculty authored questions total: {meta['total']}")

    # 6. Create Question (Draft)
    print("\n6. Creating a new Question draft (/faculty/questions)...")
    q_data = {
        "subject_id": first_sub["id"],
        "unit_id": first_unit_id,
        "question_text": "What is the primary benefit of indexing database columns?",
        "question_type": "MCQ",
        "marks": 2,
        "difficulty": "EASY",
        "explanation": "Indexing reduces disk I/O and accelerates query lookup speed.",
        "options": [
            {"option_key": "A", "option_text": "Faster query search retrieval", "is_correct": True},
            {"option_key": "B", "option_text": "Reduces disk space usage", "is_correct": False},
            {"option_key": "C", "option_text": "Encrypts sensitive data", "is_correct": False},
            {"option_key": "D", "option_text": "Prevents table fragmentation", "is_correct": False}
        ],
        "tags": ["indexing", "performance"],
        "is_submitted": False
    }
    st, new_q = api_call("/faculty/questions", method="POST", data=q_data, token=token)
    assert st == 200, f"Question create failed: {new_q}"
    created_q = new_q["data"]
    print(f"Created question ID: {created_q['id']} (Status: {created_q['status']})")
    assert created_q["status"] == "DRAFT"

    # 7. Submit Question for Review
    print("\n7. Submitting question for review (/faculty/questions/{id}/submit)...")
    st, sub_q = api_call(f"/faculty/questions/{created_q['id']}/submit", method="POST", token=token)
    assert st == 200, f"Question submit failed: {sub_q}"
    print(f"Question status after submit: {sub_q['data']['status']}")
    assert sub_q["data"]["status"] == "SUBMITTED"

    # 8. Anti-Self-Approval Check on Faculty
    print("\n8. Testing Anti-Self-Approval Enforcement...")
    st, self_appr = api_call(f"/questions/{created_q['id']}/action", method="POST", data={
        "action": "APPROVE",
        "comments": "Self approval attempt"
    }, token=token)
    print(f"Self-approval attempt response: status {st} (Expected 403 Forbidden)")
    assert st == 403, f"Expected 403 Forbidden on self-approval, got {st}"

    # 9. Question Bank (Approved Questions)
    print("\n9. Searching approved Question Bank (/faculty/question-bank)...")
    st, qb_res = api_call("/faculty/question-bank", token=token)
    assert st == 200, f"Question bank search failed: {qb_res}"
    print(f"Available approved questions for reuse: {qb_res['data']['meta']['total']}")

    # 10. Question Paper Draft
    print("\n10. Initializing a new question paper draft (/faculty/papers)...")
    paper_payload = {
        "subject_id": first_sub["id"],
        "title": "Database Systems Midterm Examination 2026",
        "exam_name": "Midterm Examination 2026-27",
        "duration_minutes": 120,
        "total_marks": 50,
        "instructions": "Answer all questions in Section A and B."
    }
    st, paper_res = api_call("/faculty/papers", method="POST", data=paper_payload, token=token)
    assert st == 200, f"Paper creation failed: {paper_res}"
    p_data = paper_res["data"]
    print(f"Initialized paper: {p_data['title']} (ID: {p_data['id']}, Sections: {len(p_data['sections'])})")

    # 11. Review Feedback Hub
    print("\n11. Testing Review Feedback Hub (/faculty/feedback)...")
    st, fb_res = api_call("/faculty/feedback", token=token)
    assert st == 200, f"Feedback failed: {fb_res}"
    print(f"Review feedback items count: {len(fb_res['data'])}")

    # 12. Exam Schedule
    print("\n12. Testing Exam Schedule (/faculty/schedule)...")
    st, sc_res = api_call("/faculty/schedule", token=token)
    assert st == 200, f"Schedule failed: {sc_res}"
    print(f"Scheduled examinations count: {len(sc_res['data'])}")

    # 13. Academic Reports
    print("\n13. Testing Academic Reports (/faculty/reports)...")
    st, rep_res = api_call("/faculty/reports", token=token)
    assert st == 200, f"Reports failed: {rep_res}"
    r_data = rep_res["data"]
    print(f"Faculty report for: {r_data['faculty_name']}")
    print(f"Total questions authored: {r_data['total_questions']}")
    print(f"Questions by status: {r_data['questions_by_status']}")
    print(f"Questions by difficulty: {r_data['questions_by_difficulty']}")
    print(f"Approval rate: {r_data['approval_rate_percent']}%")
    print(f"Subject workload entries: {len(r_data['subject_workload'])}")

    print("\n" + "=" * 60)
    print(" ALL FACULTY BACKEND ENDPOINTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
