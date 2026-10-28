import urllib.request
import json

ROLES = [
    ("apex@superadmin.com", "Admin@12345", "SUPER_ADMIN"),
    ("john@universityadmin.in", "Admin@12345", "UNIVERSITY_ADMIN"),
    ("principal@acet.edu.in", "Admin@12345", "INSTITUTION_ADMIN"),
    ("hod@bca.university.in", "Admin@12345", "HOD"),
    ("teacher@university.in", "Admin@12345", "FACULTY"),
    ("student@gmail.com", "Admin@12345", "STUDENT"),
]

for email, password, expected_role in ROLES:
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/auth/login",
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        assert response.status == 200, f"Login failed for {email}"
        res_data = json.loads(response.read().decode("utf-8"))["data"]
        role = res_data["user"]["role_name"]
        token = res_data["access_token"]
        assert role == expected_role, f"Expected role {expected_role} got {role}"

    dash_req = urllib.request.Request(
        "http://localhost:8000/api/v1/dashboard/stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(dash_req) as dash_res:
        assert dash_res.status == 200, f"Dashboard failed for {email}"
        stats = json.loads(dash_res.read().decode("utf-8"))["data"]
        print(f"[OK] {expected_role:<20} ({email}): role={stats['role']} | org={stats.get('organization_name')} | depts={stats.get('total_departments')} | questions={stats.get('total_questions')} | papers={stats.get('total_papers')}")

print("\n>>> ALL 6 ROLES VERIFIED SUCCESSFULLY AGAINST LIVE DATABASE! <<<")
