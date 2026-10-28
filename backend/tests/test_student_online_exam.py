import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_student_auth():
    # Login as student
    res = client.post("/api/v1/auth/login", json={"email": "student@gmail.com", "password": "Admin@12345"})
    assert res.status_code == 200, res.text
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_student_dashboard_and_classes():
    headers = get_student_auth()

    # 1. Student Dashboard
    dash_res = client.get("/api/v1/student/dashboard", headers=headers)
    assert dash_res.status_code == 200, dash_res.text
    dash_data = dash_res.json()["data"]
    assert "enrolled_classes" in dash_data
    assert "upcoming_tests" in dash_data
    assert "recent_results" in dash_data
    assert len(dash_data["enrolled_classes"]) > 0

    first_class = dash_data["enrolled_classes"][0]
    subject_id = first_class["subject_id"]
    assert first_class["subject_code"] == "BCA401"
    assert first_class["teacher_name"] != ""

    # 2. Student Classes List
    classes_res = client.get("/api/v1/student/classes", headers=headers)
    assert classes_res.status_code == 200, classes_res.text
    classes = classes_res.json()["data"]
    assert len(classes) >= 1

    # 3. Class Detail with units
    detail_res = client.get(f"/api/v1/student/classes/{subject_id}", headers=headers)
    assert detail_res.status_code == 200, detail_res.text
    detail = detail_res.json()["data"]
    assert detail["subject_id"] == subject_id
    assert len(detail["units"]) > 0

def test_student_syllabus_and_progress_tracking():
    headers = get_student_auth()

    # 1. Get syllabus
    syl_res = client.get("/api/v1/student/syllabus", headers=headers)
    assert syl_res.status_code == 200, syl_res.text
    syllabi = syl_res.json()["data"]
    assert len(syllabi) > 0

    first_sub = syllabi[0]
    assert len(first_sub["units"]) > 0
    first_unit = first_sub["units"][0]
    assert len(first_unit["topics"]) > 0
    topic = first_unit["topics"][0]
    topic_id = topic["topic_id"]

    # 2. Toggle topic completion
    prog_res = client.post("/api/v1/student/syllabus/progress", headers=headers, json={
        "topic_id": topic_id,
        "is_completed": True
    })
    assert prog_res.status_code == 200, prog_res.text
    prog_data = prog_res.json()["data"]
    assert prog_data["is_completed"] is True

    # 3. Toggle back to False
    prog_res2 = client.post("/api/v1/student/syllabus/progress", headers=headers, json={
        "topic_id": topic_id,
        "is_completed": False
    })
    assert prog_res2.status_code == 200
    assert prog_res2.json()["data"]["is_completed"] is False

def test_student_online_exam_lifecycle():
    headers = get_student_auth()

    # 1. Fetch available tests
    tests_res = client.get("/api/v1/student/tests", headers=headers)
    assert tests_res.status_code == 200, tests_res.text
    tests = tests_res.json()["data"]
    assert len(tests) > 0

    # 2. Generate a Practice Test
    classes_res = client.get("/api/v1/student/classes", headers=headers)
    subject_id = classes_res.json()["data"][0]["subject_id"]

    practice_res = client.post("/api/v1/student/tests/practice", headers=headers, json={
        "subject_id": subject_id,
        "question_count": 5,
        "duration_minutes": 10,
        "difficulty": "MIXED"
    })
    assert practice_res.status_code == 200, practice_res.text
    practice_test_id = practice_res.json()["data"]["test_id"]
    assert practice_test_id is not None

    # 3. Start Test Attempt
    start_res = client.post(f"/api/v1/student/tests/{practice_test_id}/start", headers=headers)
    assert start_res.status_code == 200, start_res.text
    attempt_id = start_res.json()["data"]["attempt_id"]

    # 4. Fetch attempt details
    attempt_res = client.get(f"/api/v1/student/attempts/{attempt_id}", headers=headers)
    assert attempt_res.status_code == 200, attempt_res.text
    attempt_data = attempt_res.json()["data"]
    assert attempt_data["status"] == "IN_PROGRESS"
    assert len(attempt_data["questions"]) > 0

    # Verify SECURITY: correct answer key must NOT be present in student attempt
    for q in attempt_data["questions"]:
        assert "correct_answer_key" not in q
        assert "explanation" not in q

    # 5. Answer questions via autosave endpoint
    for q in attempt_data["questions"]:
        snapshot_id = q["snapshot_id"]
        # Save dummy answer
        ans_res = client.put(
            f"/api/v1/student/attempts/{attempt_id}/answers/{snapshot_id}",
            headers=headers,
            json={"answer_text": "A", "is_marked_for_review": False}
        )
        assert ans_res.status_code == 200, ans_res.text

    # 6. Log proctored event (e.g. tab switch)
    event_res = client.post(
        f"/api/v1/student/attempts/{attempt_id}/event",
        headers=headers,
        json={"event_type": "TAB_SWITCH", "details": {"test": True}}
    )
    assert event_res.status_code == 200

    # 7. Submit Exam
    submit_res = client.post(f"/api/v1/student/attempts/{attempt_id}/submit", headers=headers)
    assert submit_res.status_code == 200, submit_res.text
    scorecard = submit_res.json()["data"]
    assert scorecard["status"] in ["SUBMITTED", "AUTO_SUBMITTED"]
    assert "obtained_marks" in scorecard
    assert "percentage" in scorecard

    # 8. View Results & Explanations
    result_res = client.get(f"/api/v1/student/results/{attempt_id}", headers=headers)
    assert result_res.status_code == 200, result_res.text
    res_data = result_res.json()["data"]
    assert res_data["attempt_id"] == attempt_id
    assert len(res_data["questions"]) > 0
    # After submission, correct answers and explanations ARE provided
    first_review = res_data["questions"][0]
    assert "correct_answer_key" in first_review
