import json
import urllib.request
import urllib.error
import urllib.parse
import sys

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_PORTAL = "http://localhost:3002"
USER_PORTAL = "http://localhost:3000"

def log(section, msg, status=True):
    icon = "PASS" if status else "FAIL"
    print(f"[{icon}] {section}: {msg}")

def do_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    
    encoded_data = None
    if data is not None:
        if isinstance(data, dict) and headers.get("Content-Type") == "application/x-www-form-urlencoded":
            encoded_data = urllib.parse.urlencode(data).encode("utf-8")
        elif isinstance(data, dict):
            encoded_data = json.dumps(data).encode("utf-8")
            if "Content-Type" not in headers:
                headers["Content-Type"] = "application/json"
        elif isinstance(data, (bytes, bytearray)):
            encoded_data = data

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            code = resp.getcode()
            body_bytes = resp.read()
            body_str = body_bytes.decode("utf-8")
            try:
                body_json = json.loads(body_str)
            except:
                body_json = body_str
            return code, body_json
    except urllib.error.HTTPError as e:
        err_bytes = e.read()
        err_str = err_bytes.decode("utf-8")
        try:
            err_json = json.loads(err_str)
        except:
            err_json = err_str
        return e.code, err_json
    except Exception as e:
        return 0, str(e)

def run_tests():
    all_passed = True

    # 1. Login as University Admin
    print("\n--- 1. University Admin Authentication ---")
    code, res = do_req(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"email": "john@universityadmin.in", "password": "Admin@12345"}
    )
    if code != 200:
        log("Auth", f"Login failed ({code}): {res}", False)
        return False
    
    token = res.get("data", {}).get("access_token") or res.get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    log("Auth", "University Admin login successful (200 OK)")

    # 2. Executive Dashboard Stats
    print("\n--- 2. Executive Dashboard Stats ---")
    code, raw = do_req(f"{BASE_URL}/university-admin/dashboard", headers=headers)
    if code == 200:
        data = raw.get("data", raw)
        univ_name = data.get("university_name")
        dept_cnt = data.get("total_departments", 0)
        hod_cnt = data.get("active_hods", 0)
        teacher_cnt = data.get("active_teachers", 0)
        exam_cnt = data.get("active_exam_controllers", 0)
        programs_cnt = data.get("total_programs", 0)
        courses_cnt = data.get("total_subjects", 0)
        q_total = data.get("total_questions", 0)
        q_approved = data.get("approved_questions", 0)
        paper_total = data.get("total_papers", 0)
        recent_accs = len(data.get("recent_accounts", []))
        audit_events = len(data.get("recent_audit_events", []))
        log("Dashboard", f"University: {univ_name}")
        log("Dashboard", f"Stats -> Depts: {dept_cnt}, HODs: {hod_cnt}, Teachers: {teacher_cnt}, Controllers: {exam_cnt}, Programs: {programs_cnt}, Subjects: {courses_cnt}")
        log("Dashboard", f"Questions -> Total: {q_total}, Approved: {q_approved}")
        log("Dashboard", f"Paper Pipeline -> Total Papers: {paper_total}")
        log("Dashboard", f"Recent Activity -> Accounts: {recent_accs}, Audit Events: {audit_events}")
    else:
        log("Dashboard", f"Dashboard stats request failed ({code}): {raw}", False)
        all_passed = False

    # 3. University Profile View & Update
    print("\n--- 3. University Profile ---")
    code, prof_raw = do_req(f"{BASE_URL}/university-admin/profile", headers=headers)
    if code == 200:
        prof = prof_raw.get("data", prof_raw)
        log("Profile", f"Fetched profile for '{prof.get('name')}'")
        
        # Update profile
        update_payload = {
            "display_name": "Apex Central University (Main Campus)",
            "website": "https://apex-central.edu.in",
            "address": "100 Academic Boulevard, Metro City, India"
        }
        code, up_prof_raw = do_req(f"{BASE_URL}/university-admin/profile", method="PUT", headers=headers, data=update_payload)
        if code == 200:
            up_prof = up_prof_raw.get("data", up_prof_raw)
            log("Profile", f"Updated profile successfully: {up_prof.get('name')} | {up_prof.get('website')}")
        else:
            log("Profile", f"Profile update failed ({code}): {up_prof_raw}", False)
            all_passed = False
    else:
        log("Profile", f"Profile fetch failed ({code}): {prof_raw}", False)
        all_passed = False

    # 4. Strict Multi-Tenant Isolation & Forgery Protection
    print("\n--- 4. Multi-Tenant Isolation & Security Checks ---")
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    code, res = do_req(f"{BASE_URL}/university-admin/dashboard?target_univ_id={fake_uuid}", headers=headers)
    if code in [403, 404]:
        log("Security", f"Tampering target_univ_id correctly blocked: Status {code}")
    else:
        log("Security", f"Cross-tenant request was not blocked! Status: {code}", False)
        all_passed = False

    code, res = do_req(f"{BASE_URL}/universities/{fake_uuid}", method="PUT", headers=headers, data={"name": "Hacked Univ"})
    if code in [403, 404]:
        log("Security", f"Forged organization update correctly blocked: Status {code}")
    else:
        log("Security", f"Forged organization update was not blocked! Status: {code}", False)
        all_passed = False

    # Attempting role escalation: create SUPER_ADMIN
    esc_user = {
        "email": "malicious_admin@apex.com",
        "username": "malicious_admin",
        "full_name": "Malicious Admin",
        "password": "Password@123",
        "role_name": "SUPER_ADMIN"
    }
    code, res = do_req(f"{BASE_URL}/users", method="POST", headers=headers, data=esc_user)
    if code in [403, 400]:
        log("Security", f"Role escalation (SUPER_ADMIN creation) correctly blocked with HTTP {code}")
    else:
        log("Security", f"Role escalation test failed! Status: {code}", False)
        all_passed = False

    # 5. Department Management
    print("\n--- 5. Department Management ---")
    dept_code = "ROBO-AI-101"
    code, d_raw = do_req(f"{BASE_URL}/university-admin/departments", method="POST", headers=headers, data={
        "name": "Department of Robotics & AI",
        "code": dept_code,
        "description": "Robotics, Automation and Artificial Intelligence Engineering"
    })
    created_dept_id = None
    if code == 200:
        d_data = d_raw.get("data", d_raw)
        created_dept_id = d_data.get("id")
        log("Departments", f"Created department '{d_data.get('name')}' with ID: {created_dept_id}")
    elif code == 400 and "already exists" in str(d_raw):
        code, depts_raw = do_req(f"{BASE_URL}/university-admin/departments", headers=headers)
        depts_list = depts_raw.get("data", depts_raw)
        for d in depts_list:
            if d.get("code") == dept_code:
                created_dept_id = d.get("id")
                break
        log("Departments", f"Department already exists with ID: {created_dept_id}")
    else:
        log("Departments", f"Department creation failed ({code}): {d_raw}", False)
        all_passed = False

    # 6. HOD Management & Assignment
    print("\n--- 6. HOD Management ---")
    hod_email = "hod.robotics@universityadmin.in"
    code, hod_raw = do_req(f"{BASE_URL}/university-admin/hods", method="POST", headers=headers, data={
        "name": "Dr. Sarah Conner",
        "email": hod_email,
        "phone": "+91 9876543210",
        "department_id": created_dept_id
    })
    hod_id = None
    if code == 200:
        hod_data = hod_raw.get("data", hod_raw)
        hod_id = hod_data.get("id")
        log("HOD", f"Created HOD '{hod_data.get('full_name')}' with ID: {hod_id}")
    elif code == 400 and ("already registered" in str(hod_raw) or "already exists" in str(hod_raw)):
        code, hods_raw = do_req(f"{BASE_URL}/university-admin/hods", headers=headers)
        hods_list = hods_raw.get("data", hods_raw)
        for h in hods_list:
            if h.get("email") == hod_email:
                hod_id = h.get("id")
                break
        log("HOD", f"HOD exists with ID: {hod_id}")
    else:
        log("HOD", f"HOD creation failed ({code}): {hod_raw}", False)
        all_passed = False

    # Reset HOD credentials
    if hod_id:
        code, res_raw = do_req(f"{BASE_URL}/university-admin/hods/{hod_id}/reset-credentials", method="POST", headers=headers)
        if code == 200:
            res_data = res_raw.get("data", res_raw)
            log("HOD", f"Reset credentials successful. Temp password generated: {res_data.get('temporary_password')}")
        else:
            log("HOD", f"Reset credentials failed ({code}): {res_raw}", False)
            all_passed = False

    # 7. Teacher / Faculty Management
    print("\n--- 7. Teacher / Faculty Management ---")
    teacher_email = "prof.turing@universityadmin.in"
    code, t_raw = do_req(f"{BASE_URL}/university-admin/teachers", method="POST", headers=headers, data={
        "name": "Prof. Alan Turing",
        "email": teacher_email,
        "phone": "+91 9876543211",
        "department_id": created_dept_id,
        "employee_code": "FAC-ROBO-01"
    })
    teacher_id = None
    if code == 200:
        t_data = t_raw.get("data", t_raw)
        teacher_id = t_data.get("id")
        log("Teachers", f"Created Teacher '{t_data.get('full_name')}' with ID: {teacher_id}")
    elif code == 400 and ("already registered" in str(t_raw) or "already exists" in str(t_raw)):
        code, t_list_raw = do_req(f"{BASE_URL}/university-admin/teachers", headers=headers)
        t_list = t_list_raw.get("data", t_list_raw)
        for t in t_list:
            if t.get("email") == teacher_email:
                teacher_id = t.get("id")
                break
        log("Teachers", f"Teacher exists with ID: {teacher_id}")
    else:
        log("Teachers", f"Teacher creation failed ({code}): {t_raw}", False)
        all_passed = False

    # Reset Teacher credentials
    if teacher_id:
        code, t_reset_raw = do_req(f"{BASE_URL}/university-admin/teachers/{teacher_id}/reset-credentials", method="POST", headers=headers)
        if code == 200:
            t_res = t_reset_raw.get("data", t_reset_raw)
            log("Teachers", f"Reset teacher credentials successful: {t_res.get('temporary_password')}")
        else:
            log("Teachers", f"Reset teacher credentials failed ({code}): {t_reset_raw}", False)
            all_passed = False

    # 8. Exam Controller Management
    print("\n--- 8. Exam Controller Management ---")
    ec_email = "controller.exam@universityadmin.in"
    code, ec_raw = do_req(f"{BASE_URL}/university-admin/exam-controllers", method="POST", headers=headers, data={
        "name": "Dr. Marcus Brody",
        "email": ec_email,
        "phone": "+91 9876543212",
        "office_location": "Academic Block A, Room 204"
    })
    ec_id = None
    if code == 200:
        ec_data = ec_raw.get("data", ec_raw)
        ec_id = ec_data.get("id")
        log("ExamControllers", f"Created Controller '{ec_data.get('full_name')}' with ID: {ec_id}")
    elif code == 400 and ("already registered" in str(ec_raw) or "already exists" in str(ec_raw)):
        code, ec_list_raw = do_req(f"{BASE_URL}/university-admin/exam-controllers", headers=headers)
        ec_list = ec_list_raw.get("data", ec_list_raw)
        for ec in ec_list:
            if ec.get("email") == ec_email:
                ec_id = ec.get("id")
                break
        log("ExamControllers", f"Exam Controller exists with ID: {ec_id}")
    else:
        log("ExamControllers", f"Exam Controller creation failed ({code}): {ec_raw}", False)
        all_passed = False

    # Reset Controller credentials
    if ec_id:
        code, ec_reset_raw = do_req(f"{BASE_URL}/university-admin/exam-controllers/{ec_id}/reset-credentials", method="POST", headers=headers)
        if code == 200:
            ec_res = ec_reset_raw.get("data", ec_reset_raw)
            log("ExamControllers", f"Reset exam controller credentials successful: {ec_res.get('temporary_password')}")
        else:
            log("ExamControllers", f"Reset exam controller credentials failed ({code}): {ec_reset_raw}", False)
            all_passed = False

    # 9. Branding Management
    print("\n--- 9. Branding Management ---")
    code, b_raw = do_req(f"{BASE_URL}/university-admin/branding", headers=headers)
    if code == 200:
        b_data = b_raw.get("data", b_raw)
        log("Branding", f"Current Primary Color: {b_data.get('primary_color')}")
        
        # Update theme palette
        new_theme = {
            "primary_color": "#82c341",
            "secondary_color": "#45525b",
            "background_color": "#f3f3f3"
        }
        code, put_brand = do_req(f"{BASE_URL}/university-admin/branding", method="PUT", headers=headers, data=new_theme)
        if code == 200:
            log("Branding", "Updated university branding palette successfully")
        else:
            log("Branding", f"Failed to update branding ({code}): {put_brand}", False)
            all_passed = False

        # Reset theme to default
        code, reset_brand = do_req(f"{BASE_URL}/university-admin/branding/reset", method="POST", headers=headers, data={})
        if code == 200:
            log("Branding", "Theme reset to default QPMS palette successfully")
        else:
            log("Branding", f"Failed to reset branding ({code}): {reset_brand}", False)
            all_passed = False
    else:
        log("Branding", f"Branding fetch failed ({code}): {b_raw}", False)
        all_passed = False

    # 10. Audit Logs
    print("\n--- 10. Audit Logs ---")
    code, audit_raw = do_req(f"{BASE_URL}/university-admin/audit?limit=10", headers=headers)
    if code == 200:
        items = audit_raw.get("data", audit_raw)
        log("Audit", f"Fetched {len(items)} audit events scoped to Apex Central University")
        if len(items) > 0:
            log("Audit", f"Latest Action: {items[0].get('action')} on {items[0].get('entity_type')}")
    else:
        log("Audit", f"Audit logs fetch failed ({code}): {audit_raw}", False)
        all_passed = False

    # 11. Student Regression Check
    print("\n--- 11. Student Regression Check ---")
    code, student_login = do_req(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"email": "student@gmail.com", "password": "Admin@12345"}
    )
    if code == 200:
        st_token = student_login.get("data", {}).get("access_token") or student_login.get("access_token")
        st_headers = {"Authorization": f"Bearer {st_token}"}
        c1, st_dash = do_req(f"{BASE_URL}/student/dashboard", headers=st_headers)
        c2, st_tests = do_req(f"{BASE_URL}/student/tests", headers=st_headers)
        if c1 == 200 and c2 == 200:
            log("Student", "Student dashboard and available tests active and operational (200 OK)")
        else:
            log("Student", f"Student endpoints failed: dash={c1}, tests={c2}", False)
            all_passed = False
    else:
        log("Student", f"Student login failed ({code}): {student_login}", False)
        all_passed = False

    # 12. Web Portals Connectivity Check
    print("\n--- 12. Web Portals Connectivity Check ---")
    c_user, _ = do_req(USER_PORTAL)
    if c_user == 200:
        log("Portals", f"Main User Portal (Port 3000): 200 OK")
    else:
        log("Portals", f"Main User Portal returned {c_user}", False)
        all_passed = False

    c_admin, _ = do_req(ADMIN_PORTAL)
    if c_admin == 200:
        log("Portals", f"Super Admin Portal (Port 3002): 200 OK")
    else:
        log("Portals", f"Super Admin Portal returned {c_admin}", False)
        all_passed = False

    print("\n" + "="*50)
    if all_passed:
        print("ALL VERIFICATION CHECKS PASSED PERFECTLY!")
    else:
        print("SOME CHECKS FAILED - REVIEW ABOVE LOGS")
    print("="*50)
    return all_passed

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
