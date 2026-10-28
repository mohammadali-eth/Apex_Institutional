with open('backend/app/api/v1/hod.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    return StandardResponse(
        data={"exam_id": exam.id, "is_published": exam.is_published},
        message=f"Exam '{exam.title}' {'published for students' if exam.is_published else 'unpublished'}."
    )'''

addition = '''

@router.put("/exams/{test_id}", response_model=StandardResponse[HODExamItem])
@router.patch("/exams/{test_id}", response_model=StandardResponse[HODExamItem])
def update_department_exam(
    test_id: str,
    req: HODExamUpdateRequest,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    exam = db.query(OnlineTest).filter(OnlineTest.id == test_id).first()
    if not exam or exam.subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Department exam not found")

    if req.title is not None:
        exam.title = req.title.strip()
    if req.description is not None:
        exam.description = req.description
    if req.difficulty is not None:
        exam.difficulty = req.difficulty
    if req.duration_minutes is not None:
        exam.duration_minutes = req.duration_minutes
    if req.total_marks is not None:
        exam.total_marks = req.total_marks
    if req.passing_marks is not None:
        exam.passing_marks = req.passing_marks
    if req.instructions is not None:
        exam.instructions = req.instructions
    if req.is_published is not None:
        exam.is_published = req.is_published
    if req.attempt_limit is not None:
        exam.attempt_limit = req.attempt_limit

    exam.updated_at = get_utc_now()
    db.commit()
    db.refresh(exam)

    log_audit(db, action="EXAM_UPDATED", entity_type="OnlineTest", user_id=current_user.id, entity_id=exam.id)

    q_count = len(exam.questions) if hasattr(exam, "questions") else 0
    return StandardResponse(
        data=HODExamItem(
            id=exam.id,
            subject_id=exam.subject_id,
            subject_code=exam.subject.code if exam.subject else "",
            subject_name=exam.subject.name if exam.subject else "",
            title=exam.title,
            description=exam.description,
            test_type=exam.test_type,
            difficulty=exam.difficulty,
            duration_minutes=exam.duration_minutes,
            total_marks=exam.total_marks,
            passing_marks=exam.passing_marks,
            instructions=exam.instructions,
            is_published=exam.is_published,
            attempt_limit=exam.attempt_limit,
            questions_count=q_count,
            created_by=exam.creator.full_name if exam.creator else None,
            created_at=exam.created_at
        ),
        message="Exam updated successfully"
    )'''

if target in text:
    text = text.replace(target, target + addition)
    print("Added update_department_exam!")
else:
    print("target not found!")

with open('backend/app/api/v1/hod.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("Saved!")
