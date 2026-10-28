import re

with open('backend/app/api/v1/hod.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the inserted block pattern wherever it appears
pattern = r'@router\.post\(\"/users\", response_model=StandardResponse\[dict\]\).*?message=\"Temporary password generated successfully\. Provide securely to the user\.\"\s*\)\s*'
cleaned = re.sub(pattern, '', text, flags=re.DOTALL)

matches = [m.start() for m in re.finditer(r'def create_department_user', cleaned)]
print('Remaining occurrences after removal:', len(matches))

target = 'def list_department_users(\n    role: Optional[str] = None,\n    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),\n    db: Session = Depends(get_db)\n):\n    dept, _, _ = resolve_hod_context(current_user, db)\n    query = db.query(User).filter(User.department_id == dept.id)\n\n    if role:\n        query = query.filter(User.role_name == role.upper())\n\n    users = query.order_by(User.full_name).all()\n    results = [\n        {\n            "id": u.id,\n            "full_name": u.full_name,\n            "email": u.email,\n            "role_name": u.role_name,\n            "phone": None,\n            "is_active": u.is_active,\n            "created_at": u.created_at.isoformat()\n        }\n        for u in users\n    ]\n    return StandardResponse(data=results)'

block_to_add = '''

@router.post("/users", response_model=StandardResponse[dict])
def create_department_user(
    req: HODFacultyCreateRequest,
    current_user: User = Depends(require_permission("user.create")),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)
    clean_email = req.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    init_pass = req.password or "Admin@12345"
    user = User(
        email=clean_email,
        full_name=req.full_name.strip(),
        hashed_password=get_password_hash(init_pass),
        role_name="FACULTY",
        organization_id=dept.organization_id,
        department_id=dept.id,
        is_active=req.is_active,
        must_change_password=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(db, action="HOD_CREATED_USER", entity_type="User", user_id=current_user.id, entity_id=user.id)
    return StandardResponse(
        data={"id": user.id, "email": user.email, "full_name": user.full_name, "role_name": user.role_name},
        message="User provisioned successfully in department"
    )

@router.put("/users/{user_id}/status", response_model=StandardResponse[dict])
def toggle_department_user_status(
    user_id: str,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)
    user = db.query(User).filter(User.id == user_id, User.department_id == dept.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in your department")

    user.is_active = not user.is_active
    db.commit()

    log_audit(db, action="USER_STATUS_TOGGLED", entity_type="User", user_id=current_user.id, entity_id=user.id)
    msg_str = "activated" if user.is_active else "deactivated"
    return StandardResponse(
        data={"user_id": user.id, "is_active": user.is_active},
        message=f"User {msg_str} successfully"
    )

@router.post("/users/{user_id}/reset-password", response_model=StandardResponse[dict])
def reset_department_user_password(
    user_id: str,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)
    user = db.query(User).filter(User.id == user_id, User.department_id == dept.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in your department")

    temp_password = f"QPMS@{secrets.token_hex(4)}!"
    user.hashed_password = get_password_hash(temp_password)
    user.must_change_password = True
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    db.commit()

    log_audit(db, action="USER_PASSWORD_RESET", entity_type="User", user_id=current_user.id, entity_id=user.id)
    return StandardResponse(
        data={
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "temporary_password": temp_password,
            "setup_token": token
        },
        message="Temporary password generated successfully. Provide securely to the user."
    )
'''

if target in cleaned:
    cleaned = cleaned.replace(target, target + block_to_add)
    with open('backend/app/api/v1/hod.py', 'w', encoding='utf-8') as f:
        f.write(cleaned)
    print('SUCCESS: Cleaned and single block added!')
else:
    print('Target not found in cleaned')
