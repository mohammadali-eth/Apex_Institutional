import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(email: str = "apex@superadmin.com", password: str = "Admin@12345") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.json()["data"]["access_token"]

def test_get_current_theme_anonymous():
    res = client.get("/api/v1/themes/current")
    assert res.status_code == 200
    theme = res.json()["data"]
    assert "primary_color" in theme
    assert "secondary_color" in theme
    assert theme["primary_color"].startswith("#")

def test_get_and_update_university_theme():
    token = get_auth_token("apex@superadmin.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch universities
    univs_res = client.get("/api/v1/universities", headers=headers)
    assert univs_res.status_code == 200
    univs = univs_res.json()["data"]
    assert len(univs) >= 1
    univ_id = univs[0]["id"]

    # 2. Get university theme
    theme_res = client.get(f"/api/v1/themes/{univ_id}")
    assert theme_res.status_code == 200
    original_theme = theme_res.json()["data"]
    assert original_theme["primary_color"] is not None

    # 3. Update theme with valid custom colors
    update_payload = {
        "primary_color": "#16a34a",
        "secondary_color": "#334155",
        "login_banner_text": "Updated Automated Test Portal"
    }
    put_res = client.put(f"/api/v1/themes/{univ_id}", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    updated_theme = put_res.json()["data"]
    assert updated_theme["primary_color"] == "#16a34a"
    assert updated_theme["secondary_color"] == "#334155"
    assert updated_theme["login_banner_text"] == "Updated Automated Test Portal"

    # 4. Reject invalid hex color (e.g. non-hex code)
    bad_color_payload = {
        "primary_color": "not-a-color-value"
    }
    bad_res = client.put(f"/api/v1/themes/{univ_id}", json=bad_color_payload, headers=headers)
    assert bad_res.status_code == 400

    # 5. Reset theme to default system colors
    reset_res = client.post(f"/api/v1/themes/{univ_id}/reset", json={}, headers=headers)
    assert reset_res.status_code == 200
    reset_theme = reset_res.json()["data"]
    assert reset_theme["primary_color"] == "#82c341"
    assert reset_theme["secondary_color"] == "#45525b"

def test_institutions_hierarchy():
    token = get_auth_token("apex@superadmin.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch institutions
    inst_res = client.get("/api/v1/institutions", headers=headers)
    assert inst_res.status_code == 200
    insts = inst_res.json()["data"]
    assert len(insts) >= 1
    # Verify child institution has parent university linked
    assert any(i["parent_id"] is not None for i in insts)
