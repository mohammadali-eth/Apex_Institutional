with open('backend/app/api/v1/questions.py', 'r', encoding='utf-8') as f:
    c = f.read()

target = """    elif action == "APPROVE":
        if current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD", "MODERATOR", "REVIEWER"]:
            raise HTTPException(status_code=403, detail="Only authorized reviewers can approve questions")"""

replacement = """    elif action == "APPROVE":
        if q.created_by == current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anti-Self-Approval Violation: You cannot review or approve a question you authored yourself. A peer reviewer must evaluate it."
            )
        if current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD", "MODERATOR", "REVIEWER"]:
            raise HTTPException(status_code=403, detail="Only authorized reviewers can approve questions")"""

if target in c:
    c = c.replace(target, replacement)
    with open('backend/app/api/v1/questions.py', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated questions.py successfully!")
else:
    print("Target not found in questions.py")
