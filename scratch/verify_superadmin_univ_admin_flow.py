import sys
import os

# Add backend directory to path
backend_dir = r"c:\Users\malid\Downloads\QPMS_Apex\backend"
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.models import User, Organization, UniversityTheme, Role, UserScope
from app.core.security import verify_password

def run_verification():
    client = TestClient(app)
    db = SessionLocal()
    print("=" * 70)
    print("QPMS Apex: End-to-End Super Admin -> University Creation -> Univ Admin Login Verification")
    print("=" * 70)

    # 1. Super Admin Authentication
    print("\n[Step 1] Logging in as Super Admin (apex@superadmin.com)...")
    res = client.post("/api/v1/auth/login", json={
        "email": "apex@superadmin.com",
        "password": "Admin@12345"
    })
    assert res.status_code == 200, f"Super Admin login failed: {res.text}"
    sa_token = res.json()["data"]["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}
    print("  -> Super Admin authenticated successfully. Access token acquired.")

    # 2. Super Admin creates University with Admin via with-admin endpoint
    test_code = "TESTUNIV01"
    test_admin_email = "testuniv.admin@institution.edu"
    test_admin_password = "SecureAdminPass@2026"

    # Clean up any existing records from prior test runs
    existing_user = db.query(User).filter(User.email == test_admin_email).first()
    if existing_user:
        db.delete(existing_user)
    existing_org = db.query(Organization).filter(Organization.code == test_code).first()
    if existing_org:
        db.delete(existing_org)
    db.commit()

    print("\n[Step 2] Super Admin creating university & initial admin via POST /universities/with-admin...")
    univ_payload = {
        "name": "Apex National Technical University",
        "code": test_code,
        "type": "STATE",
        "state": "Maharashtra",
        "country": "India",
        "website": "https://antu.edu.in",
        "phone": "+91-9876543210",
        "email": "contact@antu.edu.in",
        "admin_full_name": "Dr. Rajesh Sharma",
        "admin_email": test_admin_email,
        "admin_password": test_admin_password,
        "admin_phone": "+91-9876543211"
    }

    create_res = client.post("/api/v1/universities/with-admin", json=univ_payload, headers=sa_headers)
    assert create_res.status_code == 200, f"Creation failed: {create_res.text}"
    create_data = create_res.json()["data"]
    created_univ_id = create_data["id"]
    print(f"  -> University created: ID={created_univ_id}, Name='{create_data['name']}'")

    # 3. Database Integrity & Persistence Checks
    print("\n[Step 3] Verifying database records directly in PostgreSQL (qpms_db)...")
    univ_in_db = db.query(Organization).filter(Organization.id == created_univ_id).first()
    assert univ_in_db is not None, "University record missing in DB"
    assert univ_in_db.name == "Apex National Technical University"
    assert univ_in_db.code == test_code
    assert univ_in_db.address == "Maharashtra, India"
    assert univ_in_db.is_active is True
    print("  -> Organization record verified: Name, Code, Address, Active status confirmed.")

    theme_in_db = db.query(UniversityTheme).filter(UniversityTheme.university_id == created_univ_id).first()
    assert theme_in_db is not None, "Theme record missing in DB"
    assert theme_in_db.primary_color == "#82c341"
    print(f"  -> University theme verified: Primary Color={theme_in_db.primary_color}")

    admin_in_db = db.query(User).filter(User.email == test_admin_email).first()
    assert admin_in_db is not None, "University Admin user record missing in DB"
    assert admin_in_db.role_name == "UNIVERSITY_ADMIN"
    assert admin_in_db.organization_id == created_univ_id
    assert admin_in_db.is_active is True
    assert verify_password(test_admin_password, admin_in_db.hashed_password) is True, "Password hash verification failed"
    assert admin_in_db.hashed_password != test_admin_password, "Password is stored in plaintext!"
    print("  -> University Admin user verified in DB: Role=UNIVERSITY_ADMIN, Password securely hashed.")

    # Check role and scope associations
    roles = [r.name for r in admin_in_db.roles]
    assert "UNIVERSITY_ADMIN" in roles, f"Roles association missing: {roles}"
    print(f"  -> User roles association verified: {roles}")

    scopes = db.query(UserScope).filter(UserScope.user_id == admin_in_db.id).all()
    assert len(scopes) > 0, "UserScope missing in DB"
    assert scopes[0].scope_type == "UNIVERSITY"
    assert scopes[0].scope_entity_id == created_univ_id
    print(f"  -> User scope verified: scope_type='{scopes[0].scope_type}', scope_entity_id='{scopes[0].scope_entity_id}'")

    # 4. University Admin Authentication via /auth/login
    print("\n[Step 4] Authenticating as newly created University Admin on /auth/login...")
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_admin_email,
        "password": test_admin_password
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token_data = login_res.json()["data"]
    admin_token = token_data["access_token"]
    user_data = token_data["user"]

    assert user_data["email"] == test_admin_email
    assert user_data["role_name"] == "UNIVERSITY_ADMIN"
    assert user_data["organization_id"] == created_univ_id
    assert user_data["organization_name"] == "Apex National Technical University"
    assert user_data["is_active"] is True
    print(f"  -> Login SUCCESS! Role={user_data['role_name']}, Org='{user_data['organization_name']}'")

    # 5. University Admin Dashboard Stats Loading
    print("\n[Step 5] Accessing University Admin Dashboard stats (/dashboard/stats)...")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    stats_res = client.get("/api/v1/dashboard/stats", headers=admin_headers)
    assert stats_res.status_code == 200, f"Dashboard stats failed: {stats_res.text}"
    stats_data = stats_res.json()["data"]
    assert stats_data["role"] == "UNIVERSITY_ADMIN"
    assert stats_data["organization_name"] == "Apex National Technical University"
    assert stats_data["total_universities"] == 1
    print(f"  -> Dashboard stats loaded successfully! Org Context='{stats_data['organization_name']}', Role='{stats_data['role']}'")

    # 6. Negative Security Cases
    print("\n[Step 6] Verifying Negative Security Cases...")
    # 6a. Wrong password
    bad_pwd_res = client.post("/api/v1/auth/login", json={
        "email": test_admin_email,
        "password": "WrongPassword123!"
    })
    assert bad_pwd_res.status_code == 401
    print("  -> Case 6a PASS: Invalid password rejected with HTTP 401.")

    # 6b. Unknown email
    bad_email_res = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@institution.edu",
        "password": test_admin_password
    })
    assert bad_email_res.status_code == 401
    print("  -> Case 6b PASS: Unknown email rejected with HTTP 401.")

    # 6c. Duplicate account creation
    dup_res = client.post("/api/v1/universities/with-admin", json=univ_payload, headers=sa_headers)
    assert dup_res.status_code == 400
    print("  -> Case 6c PASS: Duplicate code/email creation rejected with HTTP 400.")

    # 6d. Account suspension
    admin_in_db.is_active = False
    db.commit()
    disabled_res = client.post("/api/v1/auth/login", json={
        "email": test_admin_email,
        "password": test_admin_password
    })
    assert disabled_res.status_code == 400
    assert "deactivated" in disabled_res.text.lower()
    print("  -> Case 6d PASS: Deactivated user account rejected with HTTP 400.")

    # Restore active user, suspend university
    admin_in_db.is_active = True
    univ_in_db.is_active = False
    db.commit()
    suspended_res = client.post("/api/v1/auth/login", json={
        "email": test_admin_email,
        "password": test_admin_password
    })
    assert suspended_res.status_code == 403
    assert "suspended" in suspended_res.text.lower()
    print("  -> Case 6e PASS: Suspended university locks out admin with HTTP 403.")

    # Restore active university
    univ_in_db.is_active = True
    db.commit()
    restored_res = client.post("/api/v1/auth/login", json={
        "email": test_admin_email,
        "password": test_admin_password
    })
    assert restored_res.status_code == 200
    print("  -> Case 6f PASS: Reactivated university restored login successfully.")

    # Clean up test records
    db.delete(admin_in_db)
    db.delete(univ_in_db)
    db.commit()
    db.close()

    print("\n" + "=" * 70)
    print("ALL VERIFICATION CHECKS PASSED: END-TO-END WORKFLOW IS FULLY OPERATIONAL!")
    print("=" * 70)

if __name__ == "__main__":
    run_verification()
