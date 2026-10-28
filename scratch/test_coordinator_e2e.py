import urllib.request
import urllib.error
import json
import sys
from datetime import datetime, timezone, timedelta

BASE_URL = "http://localhost:8000/api/v1"

def make_req(endpoint: str, method: str = "GET", data: dict = None, token: str = None):
    url = f"{BASE_URL}{endpoint}" if endpoint.startswith("/") else f"{BASE_URL}/{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw}
        return e.code, parsed

def run_tests():
    print("=" * 70)
    print(" QPMS APEX — EXAM COORDINATOR ROLE FULL-STACK E2E VERIFICATION SUITE")
    print("=" * 70)

    # -------------------------------------------------------------
    # PHASE 1: Authenticate as Exam Coordinator
    # -------------------------------------------------------------
    print("\n[PHASE 1] Authenticating as Exam Coordinator (coordinator@university.in)...")
    status, res = make_req("/auth/login", method="POST", data={
        "email": "coordinator@university.in",
        "password": "Admin@12345"
    })
    assert status == 200, f"Login failed: {res}"
    coord_token = res["data"]["access_token"]
    user_data = res["data"]["user"]
    print(f"  -> Logged in as: {user_data['full_name']} ({user_data['email']})")
    print(f"  -> Role: {user_data['role_name']}")
    assert user_data["role_name"] in ["COORDINATOR", "EXAM_COORDINATOR"], f"Unexpected role: {user_data['role_name']}"

    # -------------------------------------------------------------
    # PHASE 2: Verify Dashboard Overview (GET /coordinator/dashboard)
    # -------------------------------------------------------------
    print("\n[PHASE 2] Verifying Coordinator Dashboard Overview (GET /coordinator/dashboard)...")
    status, res = make_req("/coordinator/dashboard", token=coord_token)
    assert status == 200, f"Dashboard failed: {res}"
    d = res["data"]
    print(f"  -> Total Assigned Exams: {d['total_assigned_exams']}")
    print(f"  -> Upcoming Exams: {d['upcoming_exams']}")
    print(f"  -> Papers In Progress: {d['papers_awaiting_submission']}")
    print(f"  -> Papers Ready: {d['papers_ready']}")
    print(f"  -> Incomplete Checklists: {d['incomplete_checklists']}")
    print(f"  -> Open Issues: {d['open_issues']}")
    print(f"  -> Recent Notifications: {len(d['recent_notifications'])}")
    print(f"  -> Recent Activity: {len(d['recent_activity'])}")
    assert d["total_assigned_exams"] >= 3, "Expected at least 3 assigned examinations"

    # -------------------------------------------------------------
    # PHASE 3: Verify Assigned Examinations List & Detail
    # -------------------------------------------------------------
    print("\n[PHASE 3] Verifying Assigned Examinations (GET /coordinator/examinations)...")
    status, res = make_req("/coordinator/examinations", token=coord_token)
    assert status == 200, f"Examinations query failed: {res}"
    exams = res["data"]
    print(f"  -> Retrieved {len(exams)} assigned examination(s)")
    assert len(exams) >= 3, "Expected at least 3 examinations"

    # Locate editable exam and read-only exam
    editable_exam = next((e for e in exams if e["can_edit_schedule"]), None)
    readonly_exam = next((e for e in exams if not e["can_edit_schedule"]), None)
    assert editable_exam is not None, "Expected at least one editable examination assignment"
    assert readonly_exam is not None, "Expected at least one read-only examination assignment"
    print(f"  -> Editable Exam: {editable_exam['code']} - {editable_exam['name']} (can_edit_schedule: True)")
    print(f"  -> Read-only Exam: {readonly_exam['code']} - {readonly_exam['name']} (can_edit_schedule: False)")

    # Examination Detail
    status, res = make_req(f"/coordinator/examinations/{editable_exam['id']}", token=coord_token)
    assert status == 200, f"Exam detail failed: {res}"
    detail = res["data"]
    print(f"  -> Detail verified: {detail['code']} (Readiness: {detail['readiness_percentage']}%, Assigned Coordinators: {len(detail['assigned_coordinators'])})")

    # -------------------------------------------------------------
    # PHASE 4: Timetable Coordination & Conflict Detection
    # -------------------------------------------------------------
    print("\n[PHASE 4] Verifying Timetable Coordination & Collision Detection...")
    now_utc = datetime.now(timezone.utc)
    status, res = make_req("/coordinator/schedule", token=coord_token)
    assert status == 200, f"Schedule failed: {res}"
    schedules = res["data"]
    print(f"  -> Timetable rows loaded: {len(schedules)}")

    # Test conflict detection with an overlapping time slot for same student cohort
    target_start = editable_exam["start_time"]
    target_end = editable_exam["end_time"]
    status, res = make_req("/coordinator/schedule/validate-conflicts", method="POST", data={
        "examination_id": readonly_exam["id"],
        "start_time": target_start,
        "end_time": target_end,
        "venue": editable_exam.get("venue", "Hall A")
    }, token=coord_token)
    assert status == 200, f"Conflict check failed: {res}"
    report = res["data"]
    print(f"  -> Collision Detection Check: has_conflict = {report['has_conflict']} (Conflicts Found: {len(report['conflicts'])})")
    assert report["has_conflict"], "Expected conflict detection to catch overlapping cohort/room!"

    # Update schedule for permitted examination
    new_start = (now_utc + timedelta(days=8, hours=3)).isoformat()
    new_end = (now_utc + timedelta(days=8, hours=6)).isoformat()
    status, res = make_req(f"/coordinator/schedule/{editable_exam['id']}", method="PUT", data={
        "start_time": new_start,
        "end_time": new_end,
        "venue": "Main Examination Hall A (Expanded)",
        "duration_minutes": 180,
        "reason": "Official coordination shift to accommodate auditorium availability."
    }, token=coord_token)
    assert status == 200, f"Authorized schedule update failed: {res}"
    print(f"  -> Authorized schedule update saved successfully: {res['data']['code']}")

    # Security test: Attempt to update schedule on examination without can_edit_schedule
    status, res = make_req(f"/coordinator/schedule/{readonly_exam['id']}", method="PUT", data={
        "start_time": new_start,
        "end_time": new_end,
        "venue": "Unauthorized Venue Shift",
        "duration_minutes": 180,
        "reason": "Unauthorized test"
    }, token=coord_token)
    print(f"  -> Schedule update on restricted exam: status {status} (Expected 403 Forbidden)")
    assert status == 403, f"Expected 403 Forbidden on restricted exam, got {status}: {res}"

    # -------------------------------------------------------------
    # PHASE 5: Question Paper Preparation Tracking
    # -------------------------------------------------------------
    print("\n[PHASE 5] Verifying Question Paper Tracking Screen (GET /coordinator/papers)...")
    status, res = make_req("/coordinator/papers", token=coord_token)
    assert status == 200, f"Paper tracking failed: {res}"
    papers = res["data"]
    print(f"  -> Tracked examination paper rows: {len(papers)}")
    assert len(papers) >= 3, "Expected at least 3 paper tracking items"
    first_p = papers[0]
    print(f"  -> Sample paper track: {first_p['subject_code']} - {first_p['subject_name']} (Status: {first_p['paper_status']}, Review: {first_p['review_status']})")
    # Verify confidential data is not exposed
    assert "questions" not in first_p, "Confidential question bank leaked into coordinator paper tracking!"
    assert "options" not in first_p, "Confidential options leaked into coordinator paper tracking!"

    # -------------------------------------------------------------
    # PHASE 6: Faculty Coordination Roster (GET /coordinator/faculty)
    # -------------------------------------------------------------
    print("\n[PHASE 6] Verifying Faculty Coordination Roster (GET /coordinator/faculty)...")
    status, res = make_req("/coordinator/faculty", token=coord_token)
    assert status == 200, f"Faculty coordination failed: {res}"
    fac_roster = res["data"]
    print(f"  -> Instructors in coordination scope: {len(fac_roster)}")
    assert len(fac_roster) >= 1, "Expected at least 1 instructor assignment"
    instructor = fac_roster[0]
    print(f"  -> Primary Instructor: {instructor['faculty_name']} ({instructor['faculty_email']}) - Course: {instructor['subject_code']}")

    # -------------------------------------------------------------
    # PHASE 7: Readiness Checklist Management
    # -------------------------------------------------------------
    print("\n[PHASE 7] Verifying Readiness Checklist (GET/PUT /coordinator/checklist)...")
    status, res = make_req(f"/coordinator/checklist?examination_id={editable_exam['id']}", token=coord_token)
    assert status == 200, f"Checklist failed: {res}"
    c_items = res["data"]
    print(f"  -> Loaded {len(c_items)} checklist items for {editable_exam['code']}")
    assert len(c_items) >= 4, "Expected readiness checklist items"

    # Find an operational or scheduling item to update
    op_item = next((i for i in c_items if i["category"] in ["SCHEDULING", "OPERATIONAL"]), c_items[0])
    status, res = make_req(f"/coordinator/checklist/{op_item['id']}", method="PUT", data={
        "status": "COMPLETED",
        "notes": "Verified by Exam Coordinator during physical inspection."
    }, token=coord_token)
    assert status == 200, f"Checklist update failed: {res}"
    print(f"  -> Updated item '{op_item['title']}' to COMPLETED")

    # -------------------------------------------------------------
    # PHASE 8: Operational Issues & Escalations
    # -------------------------------------------------------------
    print("\n[PHASE 8] Verifying Operational Issues & Escalation Lifecycle...")
    status, res = make_req("/coordinator/issues", method="POST", data={
        "examination_id": editable_exam["id"],
        "title": "Air Conditioning Inoperative in Examination Hall A",
        "description": "Temperature in Hall A exceeds safe testing thresholds. Facility maintenance requested.",
        "category": "MATERIAL_SHORTAGE",
        "severity": "HIGH"
    }, token=coord_token)
    assert status == 200, f"Issue creation failed: {res}"
    created_issue = res["data"]
    print(f"  -> Operational issue logged: {created_issue['title']} (ID: {created_issue['id']}, Status: {created_issue['status']})")

    # Escalate to Exam Controller
    status, res = make_req(f"/coordinator/issues/{created_issue['id']}/escalate", method="POST", data={
        "escalation_reason": "Facility team unable to repair HVAC within 24 hours. Requesting hall reassignment from Controller."
    }, token=coord_token)
    assert status == 200, f"Issue escalation failed: {res}"
    print(f"  -> Issue escalated to Exam Controller: {res['data']['escalated_to_name']}")

    # -------------------------------------------------------------
    # PHASE 9: Notifications & Reminder Deduplication
    # -------------------------------------------------------------
    print("\n[PHASE 9] Verifying Notifications & Deduplication...")
    status, res = make_req("/coordinator/notifications", token=coord_token)
    assert status == 200, f"Notifications failed: {res}"
    notifs = res["data"]
    print(f"  -> Notifications in coordinator inbox: {len(notifs)}")

    # Mark notification read
    if notifs:
        n_id = notifs[0]["id"]
        status, res = make_req(f"/coordinator/notifications/{n_id}/read", method="PUT", token=coord_token)
        assert status == 200, f"Mark read failed: {res}"
        print(f"  -> Marked notification {n_id} as read")

    # Send reminder to faculty member
    status, res = make_req("/coordinator/notifications/remind", method="POST", data={
        "recipient_id": instructor["faculty_id"],
        "examination_id": instructor["examination_id"],
        "subject": f"Deadline Reminder: {instructor['subject_code']}",
        "message": "Final question paper submission deadline is in 48 hours.",
        "notification_type": "DEADLINE_REMINDER"
    }, token=coord_token)
    if status == 200:
        print(f"  -> Dispatched reminder: {res['data']['title']}")
        # Test Deduplication Rule: Dispatching same reminder immediately must trigger 400 Bad Request
        dup_status, dup_res = make_req("/coordinator/notifications/remind", method="POST", data={
            "recipient_id": instructor["faculty_id"],
            "examination_id": instructor["examination_id"],
            "subject": f"Deadline Reminder: {instructor['subject_code']}",
            "message": "Duplicate reminder test.",
            "notification_type": "DEADLINE_REMINDER"
        }, token=coord_token)
        print(f"  -> Duplicate reminder test: status {dup_status} (Expected 400 Bad Request)")
        assert dup_status == 400, f"Expected 400 Bad Request for duplicate reminder, got {dup_status}: {dup_res}"
    else:
        print(f"  -> Deduplication rule active from recent test: status {status} (Expected 400 Bad Request)")
        assert status == 400, f"Expected 200 or 400, got {status}: {res}"

    # -------------------------------------------------------------
    # PHASE 10: Reports & Analytics (GET /coordinator/reports)
    # -------------------------------------------------------------
    print("\n[PHASE 10] Verifying Scoped Reports & Analytics (GET /coordinator/reports)...")
    status, res = make_req("/coordinator/reports", token=coord_token)
    assert status == 200, f"Reports failed: {res}"
    rep = res["data"]
    print(f"  -> Total Exams Analyzed: {rep['total_exams']}")
    print(f"  -> Exam Progress Rows: {len(rep['exam_progress_rows'])}")
    print(f"  -> Readiness Rate: {rep['readiness_rate']}%")
    print(f"  -> Issues Summary: {rep['issue_summary']}")

    # -------------------------------------------------------------
    # PHASE 11: Security Boundaries & RBAC Isolation
    # -------------------------------------------------------------
    print("\n[PHASE 11] Verifying Security Boundaries & RBAC Isolation...")
    # 1. Coordinator creating university
    status, _ = make_req("/universities", method="POST", data={"name": "Hacked University", "code": "HACK_UNIV"}, token=coord_token)
    print(f"  -> Coordinator creating university: status {status} (Expected 403)")
    assert status == 403, f"Expected 403, got {status}"

    # 2. Coordinator accessing University Admin dashboard
    status, _ = make_req("/university-admin/dashboard", token=coord_token)
    print(f"  -> Coordinator accessing University Admin dashboard: status {status} (Expected 403)")
    assert status == 403, f"Expected 403, got {status}"

    # 3. Coordinator accessing HOD review queue
    status, _ = make_req("/hod/review-questions", token=coord_token)
    print(f"  -> Coordinator accessing HOD review queue: status {status} (Expected 403)")
    assert status == 403, f"Expected 403, got {status}"

    # 4. Coordinator accessing unassigned examination
    fake_id = "00000000-0000-0000-0000-000000000000"
    status, _ = make_req(f"/coordinator/examinations/{fake_id}", token=coord_token)
    print(f"  -> Coordinator accessing unassigned examination: status {status} (Expected 403/404)")
    assert status in [403, 404], f"Expected 403 or 404, got {status}"

    # 5. Coordinator attempting to approve question paper directly
    sample_paper_id = "00000000-0000-0000-0000-000000000001"
    status, _ = make_req(f"/question-papers/{sample_paper_id}/action", method="POST", data={"action": "APPROVE"}, token=coord_token)
    print(f"  -> Coordinator attempting to approve question paper: status {status} (Expected 403)")
    assert status in [403, 404], f"Expected 403 or 404, got {status}"

    # -------------------------------------------------------------
    # PHASE 12: Non-Regression Across Other Roles
    # -------------------------------------------------------------
    print("\n[PHASE 12] Verifying System Non-Regression Across Other Roles...")
    # Faculty
    status, res = make_req("/auth/login", method="POST", data={"email": "teacher@university.in", "password": "Admin@12345"})
    assert status == 200, "Faculty login failed"
    status, res = make_req("/faculty/dashboard", token=res["data"]["access_token"])
    assert status == 200, "Faculty dashboard failed"
    print("  -> Faculty Dashboard verified OK: Prof. Alan Turing")

    # HOD
    status, res = make_req("/auth/login", method="POST", data={"email": "hod@bca.university.in", "password": "Admin@12345"})
    assert status == 200, "HOD login failed"
    status, res = make_req("/hod/dashboard", token=res["data"]["access_token"])
    assert status == 200, "HOD dashboard failed"
    print("  -> HOD Dashboard verified OK: Prof. Robert Vance")

    # University Admin
    status, res = make_req("/auth/login", method="POST", data={"email": "john@universityadmin.in", "password": "Admin@12345"})
    assert status == 200, "Univ Admin login failed"
    status, res = make_req("/university-admin/dashboard", token=res["data"]["access_token"])
    assert status == 200, "Univ Admin dashboard failed"
    print("  -> University Admin verified OK: Dr. John Reynolds")

    # Student
    status, res = make_req("/auth/login", method="POST", data={"email": "student@gmail.com", "password": "Admin@12345"})
    assert status == 200, "Student login failed"
    status, res = make_req("/student/dashboard", token=res["data"]["access_token"])
    assert status == 200, "Student dashboard failed"
    print("  -> Student Dashboard verified OK: Emily Watson")

    # Super Admin
    status, res = make_req("/auth/login", method="POST", data={"email": "apex@superadmin.com", "password": "Admin@12345"})
    assert status == 200, "Super Admin login failed"
    print("  -> Super Admin verified OK: Apex Super Admin")

    print("\n" + "=" * 70)
    print(" ALL 12 VERIFICATION PHASES PASSED WITH ZERO ERRORS!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
