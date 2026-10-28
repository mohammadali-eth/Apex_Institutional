import subprocess

code = """
from app.database.session import SessionLocal
from app.models.models import User, FacultyAssignment, Role, Subject, Question, QuestionPaper
from app.api.deps import get_user_permissions
db = SessionLocal()
u = db.query(User).filter(User.email == 'teacher@university.in').first()
if u:
    perms = get_user_permissions(u)
    print(f"User: {u.email}, Name: {u.full_name}, Role: {u.role_name}")
    print(f"Roles: {[r.name for r in u.roles]}")
    print(f"Permissions: {sorted(list(perms))}")
    assignments = db.query(FacultyAssignment).filter(FacultyAssignment.user_id == u.id).all()
    for a in assignments:
        s = db.query(Subject).filter(Subject.id == a.subject_id).first()
        print(f"  Assigned Subject: {s.code if s else ''} - {s.name if s else ''} (ID: {a.subject_id}), Role: {a.role_type}")
"""

res = subprocess.run(["docker", "exec", "qpms_backend", "python", "-c", code], capture_output=True, text=True)
print("STDOUT:\n", res.stdout)
if res.stderr:
    print("STDERR:\n", res.stderr)
