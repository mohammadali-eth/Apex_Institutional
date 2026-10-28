"""
QPMS Apex - Comprehensive HOD (Head of Department) End-to-End Verification Test
Tests all 14 HOD APIs, RBAC, anti-self-approval, tenant scoping, and regression.
"""

import sys
import json
import time
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000/api/v1"

def api_call(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            return resp.status, json.loads(content.decode("utf-8")) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read()
        err_json = {}
        try:
            err_json = json.loads(content.decode("utf-8"))
        except:
            err_json = {"raw": content.decode("utf-8")}
        return e.code, err_json

def login(email, password):
    status, res = api_call("/auth/login", method="POST", data={"email": email, "password": password})
    if status != 200:
        raise RuntimeError(f"Login failed for {email}: {res}")
    return res["data"]["access_token"], res["data"]["user"]

def main():
    print("=" * 70)
    print(" QPMS APEX — HOD DASHBOARD & END-TO-END VERIFICATION SUITE")
    print("=" * 70)

    # 1. HOD Authentication
    print("\n[STEP 1] Authenticating as HOD (hod@bca.university.in)...")
    hod_token, hod_user = login("hod@bca.university.in", "Admin@12345")
    print(f"  -> Logged in as: {hod_user['full_name']} ({hod_user['role_name']})")
    print(f"  -> Department: {hod_user.get('department_name')} (ID: {hod_user.get('department_id')})")
    print(f"  -> Organization: {hod_user.get('organization_name')} (ID: {hod_user.get('organization_id')})")
    assert hod_user["role_name"] == "HOD", f"Expected HOD role, got {hod_user['role_name']}"

    # 2. HOD Dashboard Stats
    print("\n[STEP 2] Testing HOD Dashboard Stats (GET /hod/dashboard)...")
    st, res = api_call("/hod/dashboard", token=hod_token)
    assert st == 200, f"Dashboard failed ({st}): {res}"
    d = res["data"]
    print(f"  -> Department: {d['department_name']} ({d['department_code']})")
    print(f"  -> Faculty Stats: {d['faculty_stats']['total_faculty']} total, {d['faculty_stats']['active_faculty']} active")
    print(f"  -> Curriculum Stats: {d['curriculum_stats']['total_programs']} programs, {d['curriculum_stats']['total_subjects']} subjects, {d['curriculum_stats']['total_syllabus_units']} units")
    print(f"  -> Question Stats: {d['question_stats']['total_questions']} total, {d['question_stats']['pending_review']} pending, {d['question_stats']['approved_questions']} approved")
    print(f"  -> Paper Stats: {d['paper_stats']['total_papers']} total, {d['paper_stats']['pending_approval']} pending, {d['paper_stats']['approved_papers']} approved")
    print(f"  -> Exam Stats: {d['exam_stats']['total_exams']} total, {d['exam_stats']['upcoming_exams']} active")
    print(f"  -> Recent Activity count: {len(d['recent_activity'])}")

    # 3. Faculty Management
    print("\n[STEP 3] Testing Faculty Roster & Provisioning...")
    st, f_list = api_call("/hod/faculty", token=hod_token)
    assert st == 200, f"Faculty list failed ({st}): {f_list}"
    initial_faculty_count = len(f_list["data"])
    print(f"  -> Current faculty in department: {initial_faculty_count}")

    test_faculty_email = f"test.faculty.{int(time.time())}@bca.university.in"
    st, new_f = api_call("/hod/faculty", method="POST", data={
        "full_name": "Dr. Automated Test Faculty",
        "email": test_faculty_email,
        "employee_code": f"AUTOFAC-{int(time.time()) % 10000}",
        "password": "Password@12345",
        "is_active": True
    }, token=hod_token)
    print(f"  -> Faculty creation status: {st}")
    assert st in (200, 201), f"Faculty creation failed: {new_f}"
    created_faculty_id = new_f["data"]["id"]
    print(f"  -> Created Faculty ID: {created_faculty_id}")

    # Profile Update
    st, up_f = api_call(f"/hod/faculty/{created_faculty_id}", method="PUT", data={
        "full_name": "Dr. Automated Test Faculty Ph.D.",
        "employee_code": f"AUTOFAC-{int(time.time()) % 10000}-REV"
    }, token=hod_token)
    assert st == 200, f"Faculty update failed: {up_f}"
    print(f"  -> Updated faculty profile: {up_f['data']['full_name']}")

    # Credential Reset
    st, reset_res = api_call(f"/hod/users/{created_faculty_id}/reset-password", method="POST", token=hod_token)
    assert st == 200, f"Credential reset failed: {reset_res}"
    print(f"  -> Temporary password generated: {reset_res['data']['temporary_password']}")

    # 4. Degree Programs Management
    print("\n[STEP 4] Testing Academic Programs Management...")
    st, p_list = api_call("/hod/programs", token=hod_token)
    assert st == 200, f"Program list failed: {p_list}"
    print(f"  -> Current programs in department: {len(p_list['data'])}")

    prog_code = f"MSAI{int(time.time()) % 1000}"
    st, new_prog = api_call("/hod/programs", method="POST", data={
        "name": f"M.Sc. Artificial Intelligence {prog_code}",
        "code": prog_code,
        "degree_level": "PG",
        "total_semesters": 4,
        "is_active": True
    }, token=hod_token)
    assert st in (200, 201), f"Program creation failed: {new_prog}"
    prog_id = new_prog["data"]["id"]
    print(f"  -> Created program: {new_prog['data']['name']} (ID: {prog_id})")

    # 5. Course Subjects Management & Assignment
    print("\n[STEP 5] Testing Course Subjects Management...")
    sub_code = f"MS{int(time.time()) % 1000}"
    st, new_sub = api_call("/hod/subjects", method="POST", data={
        "program_id": prog_id,
        "semester_number": 1,
        "name": "Machine Learning Foundations",
        "code": sub_code,
        "credits": 4,
        "description": "Supervised and unsupervised learning techniques",
        "is_active": True
    }, token=hod_token)
    assert st in (200, 201), f"Subject creation failed: {new_sub}"
    sub_id = new_sub["data"]["id"]
    print(f"  -> Created course subject: {new_sub['data']['code']} — {new_sub['data']['name']}")

    # Assign Faculty to Subject
    st, asgn_res = api_call(f"/hod/faculty/{created_faculty_id}/assign-subjects", method="POST", data={
        "subject_ids": [sub_id]
    }, token=hod_token)
    assert st == 200, f"Faculty assignment failed: {asgn_res}"
    print(f"  -> Assigned subject {sub_id} to faculty {created_faculty_id}")

    # 6. Syllabus, Units, Topics & Safe Deletion Guard
    print("\n[STEP 6] Testing Syllabus, Units & Safe Deletion...")
    st, syl_detail = api_call(f"/hod/syllabus/{sub_id}", token=hod_token)
    assert st == 200, f"Syllabus fetch failed: {syl_detail}"
    print(f"  -> Subject syllabus initialized: version {syl_detail['data']['version']}")

    # Add Unit
    st, new_unit = api_call(f"/hod/syllabus/{sub_id}/units", method="POST", data={
        "unit_number": 1,
        "title": "Supervised Learning Algorithms",
        "description": "Linear regression, decision trees, logistic classification",
        "hours": 12
    }, token=hod_token)
    assert st in (200, 201), f"Unit creation failed: {new_unit}"
    unit_id = new_unit["data"]["id"]
    print(f"  -> Added Unit 1: {new_unit['data']['title']}")

    # Add Topic
    st, new_topic = api_call(f"/hod/syllabus/units/{unit_id}/topics", method="POST", data={
        "title": "Gradient Descent Optimization",
        "order_index": 1
    }, token=hod_token)
    assert st in (200, 201), f"Topic creation failed: {new_topic}"
    print(f"  -> Added Topic: {new_topic['data']['title']}")

    # Add temporary unit for testing safe delete guard
    st, temp_unit = api_call(f"/hod/syllabus/{sub_id}/units", method="POST", data={
        "unit_number": 2,
        "title": "Temporary Unit to Delete",
        "description": "Will be deleted",
        "hours": 6
    }, token=hod_token)
    temp_unit_id = temp_unit["data"]["id"]
    st, del_res = api_call(f"/hod/syllabus/units/{temp_unit_id}", method="DELETE", token=hod_token)
    assert st == 200, f"Safe unit delete failed: {del_res}"
    print(f"  -> Safe delete successfully removed unit {temp_unit_id}")

    # 7. Question Bank Oversight & Question Review Queue
    print("\n[STEP 7] Testing Question Bank, Moderation Queue & Anti-Self-Approval...")
    st, q_bank = api_call("/hod/questions", token=hod_token)
    assert st == 200, f"Question bank fetch failed: {q_bank}"
    print(f"  -> Total questions in department question bank: {q_bank['data']['meta']['total']}")

    # Login as created faculty to create a question
    fac_token, _ = login(test_faculty_email, reset_res["data"]["temporary_password"])
    st, new_q = api_call("/questions", method="POST", data={
        "subject_id": sub_id,
        "unit_id": unit_id,
        "question_text": "Explain the convex convergence properties of Batch Gradient Descent with constant learning rates.",
        "question_type": "DESCRIPTIVE",
        "marks": 5,
        "difficulty": "MEDIUM",
        "language": "EN",
        "tags": ["ml", "optimization", "gradient-descent"],
        "status": "SUBMITTED"
    }, token=fac_token)
    assert st in (200, 201), f"Faculty question submission failed: {new_q}"
    q_id = new_q["data"]["id"]
    print(f"  -> Faculty submitted Question ID: {q_id}")

    # Verify question appears in HOD Review Queue
    st, r_queue = api_call("/hod/review-questions", token=hod_token)
    assert st == 200, f"Review queue fetch failed: {r_queue}"
    assert any(q["id"] == q_id for q in r_queue["data"]), "Submitted question not found in review queue"
    print(f"  -> Question {q_id} verified in HOD Review Queue")

    # Test Anti-Self-Approval: Faculty tries to review their own question via HOD review endpoint
    st, self_rev = api_call(f"/hod/review-questions/{q_id}/review", method="POST", data={
        "action": "APPROVE",
        "comments": "Self approval attempt"
    }, token=fac_token)
    print(f"  -> Faculty self-approval attempt response: {st} (Expected 403 Forbidden)")
    assert st == 403, f"Expected 403 Forbidden for faculty calling HOD endpoint, got {st}"

    # Anti-Self-Approval: HOD creates a question and attempts to self-approve
    st, hod_q = api_call("/questions", method="POST", data={
        "subject_id": sub_id,
        "unit_id": unit_id,
        "question_text": "What is the computational complexity of QuickSort average-case?",
        "question_type": "DESCRIPTIVE",
        "marks": 5,
        "difficulty": "EASY",
        "language": "EN",
        "tags": ["dsa", "quicksort"],
        "status": "SUBMITTED"
    }, token=hod_token)
    assert st in (200, 201), f"HOD question creation failed: {hod_q}"
    hod_q_id = hod_q["data"]["id"]

    st, hod_self_rev = api_call(f"/hod/review-questions/{hod_q_id}/review", method="POST", data={
        "action": "APPROVE",
        "comments": "Self approval attempt by HOD"
    }, token=hod_token)
    print(f"  -> HOD self-approval attempt response: {st} (Expected 403 Forbidden)")
    assert st == 403, f"Expected 403 Forbidden for HOD self-approval, got {st}: {hod_self_rev}"
    print(f"  -> Anti-self-approval rule verified: {hod_self_rev.get('detail')}")

    # HOD reviews and approves the faculty submission
    st, app_res = api_call(f"/hod/review-questions/{q_id}/review", method="POST", data={
        "action": "APPROVE",
        "comments": "Syllabus aligned and question format verified"
    }, token=hod_token)
    assert st == 200, f"HOD question approval failed: {app_res}"
    print(f"  -> HOD successfully approved question {q_id}")

    # Now verify safe delete guard: Unit 1 now has questions linked to it!
    st, block_del = api_call(f"/hod/syllabus/units/{unit_id}", method="DELETE", token=hod_token)
    print(f"  -> Attempt to delete Unit with linked questions response: {st} (Expected 400 Bad Request)")
    assert st == 400, f"Expected 400 Bad Request, got {st}: {block_del}"
    print(f"  -> Safe delete guard verified: {block_del.get('detail')}")

    # 8. Question Papers Monitoring & Approval Queue
    print("\n[STEP 8] Testing Question Papers & Approval Queue...")
    st, p_list = api_call("/hod/papers", token=hod_token)
    assert st == 200, f"Papers list failed: {p_list}"
    print(f"  -> Total papers in department: {len(p_list['data']) if isinstance(p_list['data'], list) else p_list['data'].get('meta', {}).get('total', 0)}")

    st, p_app_list = api_call("/hod/approve-papers", token=hod_token)
    assert st == 200, f"Approve papers queue failed: {p_app_list}"
    print(f"  -> Papers awaiting HOD approval: {len(p_app_list['data'])}")

    # 9. Reviewer Delegation
    print("\n[STEP 9] Testing Peer Reviewer Delegation...")
    st, rev_list = api_call("/hod/eligible-reviewers", token=hod_token)
    assert st == 200, f"Eligible reviewers failed: {rev_list}"
    print(f"  -> Eligible department reviewers count: {len(rev_list['data'])}")

    # Verify Conflict of Interest guard: Creator cannot review own question
    st, conflict_rev = api_call("/hod/assign-reviewers", method="POST", data={
        "entity_type": "QUESTION",
        "entity_id": q_id,
        "reviewer_id": created_faculty_id
    }, token=hod_token)
    print(f"  -> Attempt to assign author as reviewer response: {st} (Expected 400 Bad Request)")
    assert st == 400, f"Expected 400 Conflict of Interest, got {st}: {conflict_rev}"
    print(f"  -> Conflict of interest guard verified: {conflict_rev.get('detail')}")

    # Select an eligible reviewer who is NOT the author
    other_reviewer = next((r for r in rev_list["data"] if r["id"] != created_faculty_id), None)
    assert other_reviewer is not None, "No other eligible reviewer found in department"
    selected_rev_id = other_reviewer["id"]

    st, asgn_rev = api_call("/hod/assign-reviewers", method="POST", data={
        "entity_type": "QUESTION",
        "entity_id": q_id,
        "reviewer_id": selected_rev_id
    }, token=hod_token)
    assert st == 200, f"Assign reviewer failed: {asgn_rev}"
    print(f"  -> Delegated question {q_id} to reviewer {other_reviewer['full_name']} ({selected_rev_id})")

    # 10. Department Online Exams
    print("\n[STEP 10] Testing Department Examinations Management...")
    st, new_exam = api_call("/hod/exams", method="POST", data={
        "subject_id": sub_id,
        "title": "M.Sc. AI Midterm Examination 2026",
        "description": "Comprehensive midterm covering Unit 1",
        "test_type": "INTERNAL_ASSESSMENT",
        "difficulty": "MEDIUM",
        "duration_minutes": 90,
        "total_marks": 50,
        "passing_marks": 20,
        "is_published": False,
        "attempt_limit": 1
    }, token=hod_token)
    assert st in (200, 201), f"Exam creation failed: {new_exam}"
    exam_id = new_exam["data"]["id"]
    print(f"  -> Created Department Exam: {new_exam['data']['title']} (ID: {exam_id})")

    # Toggle publish status
    st, pub_exam = api_call(f"/hod/exams/{exam_id}", method="PUT", data={
        "is_published": True
    }, token=hod_token)
    assert st == 200, f"Exam publish failed: {pub_exam}"
    print(f"  -> Exam published status updated: {pub_exam['data']['is_published']}")

    # 11. Department Reports
    print("\n[STEP 11] Testing Department Reports & Analytics...")
    st, rep_data = api_call("/hod/reports", token=hod_token)
    assert st == 200, f"Reports failed: {rep_data}"
    r = rep_data["data"]
    print(f"  -> Department: {r['department_name']}")
    print(f"  -> Faculty Workload entries: {len(r['faculty_workload'])}")
    print(f"  -> Question Health entries: {len(r['question_health'])}")
    print(f"  -> Paper Readiness entries: {len(r['paper_readiness'])}")

    # 12. Department Users & Audit Logs
    print("\n[STEP 12] Testing Department Users & Audit Trail...")
    st, u_list = api_call("/hod/users", token=hod_token)
    assert st == 200, f"Department users list failed: {u_list}"
    print(f"  -> Department users count: {len(u_list['data'])}")

    st, a_list = api_call("/hod/audit", token=hod_token)
    assert st == 200, f"Audit logs failed: {a_list}"
    print(f"  -> Department audit events count: {len(a_list['data'])}")
    if a_list["data"]:
        print(f"  -> Latest event: {a_list['data'][0]['action']} by {a_list['data'][0]['user_email']}")

    # 13. Security, RBAC & Isolation Checks
    print("\n[STEP 13] Verifying Multi-Tenant & RBAC Isolation Enforcement...")
    # Attempt cross-university or elevated administrative call: HOD calls Super Admin endpoint (POST /universities)
    st, super_block = api_call("/universities", method="POST", data={"name": "Illegal Uni", "code": "ILLEGAL"}, token=hod_token)
    print(f"  -> HOD attempting to create University (POST /universities): status {st} (Expected 403 Forbidden)")
    assert st == 403, f"Expected 403 Forbidden for HOD calling POST /universities, got {st}"

    # Attempt cross-university call: HOD calls University Admin endpoint
    st, univ_block = api_call("/university-admin/dashboard", token=hod_token)
    print(f"  -> HOD accessing University Admin endpoint (/university-admin/dashboard): status {st} (Expected 403 Forbidden)")
    assert st == 403, f"Expected 403 Forbidden for HOD calling /university-admin/dashboard, got {st}"

    # 14. Non-Regression: Student & Super Admin Checks
    print("\n[STEP 14] Verifying System Non-Regression (Student & Super Admin)...")
    stu_token, stu_user = login("student@gmail.com", "Admin@12345")
    st, stu_dash = api_call("/student/dashboard", token=stu_token)
    assert st == 200, f"Student dashboard regression failed ({st}): {stu_dash}"
    print(f"  -> Student dashboard verified OK: {stu_user['full_name']}")

    sa_token, sa_user = login("apex@superadmin.com", "Admin@12345")
    st, sa_univs = api_call("/universities", token=sa_token)
    assert st == 200, f"Super Admin regression failed ({st}): {sa_univs}"
    print(f"  -> Super Admin verified OK: {sa_user['full_name']} ({len(sa_univs.get('data', []))} universities)")

    print("\n" + "=" * 70)
    print(" ALL 14 VERIFICATION PHASES PASSED WITH ZERO ERRORS!")
    print("=" * 70)

if __name__ == "__main__":
    main()
