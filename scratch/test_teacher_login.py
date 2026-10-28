import urllib.request
import json

req = urllib.request.Request(
    "http://localhost:8000/api/v1/auth/login",
    data=json.dumps({"email": "teacher@university.in", "password": "Admin@12345"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print("Login Success!")
        print("User:", res["data"]["user"])
except Exception as e:
    print("Login error:", e)
