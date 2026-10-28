from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.database.session import get_db
from app.models.models import Question, QuestionOption, QuestionTag, QuestionApproval, Subject, Unit, Topic, User
from app.schemas.question import (
    QuestionCreate, QuestionUpdate, QuestionResponse, QuestionOptionResponse,
    QuestionStatusAction, QuestionFilter
)
from app.schemas.common import StandardResponse, PaginatedResponse, PaginatedData, PaginationMeta
from app.api.deps import get_current_user, require_permission
from app.services.audit_service import log_audit

router = APIRouter(prefix="/questions", tags=["Question Bank"])

def question_to_response(q: Question) -> QuestionResponse:
    options_resp = [
        QuestionOptionResponse(
            id=opt.id,
            option_key=opt.option_key,
            option_text=opt.option_text,
            is_correct=opt.is_correct
        ) for opt in q.options
    ]
    tags_list = [t.tag for t in q.tags]
    
    return QuestionResponse(
        id=q.id,
        subject_id=q.subject_id,
        unit_id=q.unit_id,
        topic_id=q.topic_id,
        question_text=q.question_text,
        question_type=q.question_type,
        marks=q.marks,
        difficulty=q.difficulty,
        bloom_level=getattr(q, 'bloom_level', 'UNDERSTAND') or 'UNDERSTAND',
        source_type=getattr(q, 'source_type', 'QUESTION_BANK') or 'QUESTION_BANK',
        marking_rubric=getattr(q, 'marking_rubric', None),
        status=q.status,
        language=q.language,
        explanation=q.explanation,
        expected_answer=q.expected_answer,
        tags=tags_list,
        created_by=q.created_by,
        creator_name=q.creator.full_name if q.creator else None,
        reviewer_id=q.reviewer_id,
        review_feedback=q.review_feedback,
        subject_name=q.subject.name if q.subject else None,
        subject_code=q.subject.code if q.subject else None,
        unit_title=q.unit.title if q.unit else None,
        topic_title=q.topic.title if q.topic else None,
        options=options_resp,
        created_at=q.created_at,
        updated_at=q.updated_at
    )

@router.get("/meta/types", response_model=StandardResponse[dict])
def get_question_types_metadata():
    return StandardResponse(data={
        "question_types": [
            {"key": "MCQ", "label": "Multiple Choice (MCQ)", "description": "Single correct answer from choices"},
            {"key": "TRUE_FALSE", "label": "True / False", "description": "Binary truth assertion"},
            {"key": "FILL_BLANK", "label": "Fill in the Blank", "description": "Keyword / blank completion"},
            {"key": "DESCRIPTIVE", "label": "Short / Descriptive", "description": "Structured explanation / problem solving"}
        ],
        "marks_presets": [1, 2, 3, 4, 5, 8, 10, 15, 20],
        "difficulties": ["EASY", "MEDIUM", "HARD"],
        "statuses": ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]
    })

@router.get("", response_model=PaginatedResponse[QuestionResponse])
def get_questions(
    subject_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    question_type: Optional[str] = None,
    marks: Optional[int] = None,
    difficulty: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Question)

    # Scoping: Students only see APPROVED questions
    if current_user.role_name == "STUDENT":
        query = query.filter(Question.status == "APPROVED")
    elif current_user.role_name in ["FACULTY", "QUESTION_SETTER"] and not current_user.department_id:
        pass # Faculty can see all department or their own drafts

    # Apply filters
    if subject_id:
        query = query.filter(Question.subject_id == subject_id)
    if unit_id:
        query = query.filter(Question.unit_id == unit_id)
    if topic_id:
        query = query.filter(Question.topic_id == topic_id)
    if question_type:
        query = query.filter(Question.question_type == question_type.upper())
    if marks:
        query = query.filter(Question.marks == marks)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty.upper())
    if status_filter:
        query = query.filter(Question.status == status_filter.upper())
    if search:
        query = query.filter(
            or_(
                Question.question_text.ilike(f"%{search}%"),
                Question.explanation.ilike(f"%{search}%")
            )
        )

    # Sorting
    sort_col = getattr(Question, sort_by, Question.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    total = query.count()
    offset = (page - 1) * page_size
    questions = query.offset(offset).limit(page_size).all()

    items = [question_to_response(q) for q in questions]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedResponse(
        success=True,
        message="Questions retrieved successfully",
        data=PaginatedData(
            items=items,
            meta=PaginationMeta(
                total=total,
                page=page,
                page_size=page_size,
                total_pages=total_pages
            )
        )
    )

@router.post("", response_model=StandardResponse[QuestionResponse])
def create_question(
    data: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("question.create"))
):
    # Rule 3: Students cannot create or modify questions
    if current_user.role_name == "STUDENT":
        raise HTTPException(status_code=403, detail="Students are not authorized to create questions")

    # Validate MCQ requirement
    if data.question_type.upper() == "MCQ":
        if len(data.options) < 2:
            raise HTTPException(status_code=400, detail="MCQ questions require at least 2 options")
        if not any(opt.is_correct for opt in data.options):
            raise HTTPException(status_code=400, detail="At least one option must be marked as correct for MCQ")

    # Create Question
    q = Question(
        subject_id=data.subject_id,
        unit_id=data.unit_id,
        topic_id=data.topic_id,
        question_text=data.question_text,
        question_type=data.question_type.upper(),
        marks=data.marks,
        difficulty=data.difficulty.upper(),
        bloom_level=(data.bloom_level or "UNDERSTAND").upper(),
        source_type=(data.source_type or "QUESTION_BANK").upper(),
        marking_rubric=data.marking_rubric,
        status=data.status.upper() if data.status else "DRAFT",
        language=data.language,
        explanation=data.explanation,
        expected_answer=data.expected_answer,
        created_by=current_user.id
    )
    db.add(q)
    db.flush()

    # Create options if MCQ
    if data.question_type.upper() == "MCQ":
        for opt in data.options:
            q_opt = QuestionOption(
                question_id=q.id,
                option_key=opt.option_key.upper(),
                option_text=opt.option_text,
                is_correct=opt.is_correct
            )
            db.add(q_opt)

    # Create tags
    for tag_str in data.tags:
        clean_tag = tag_str.strip()
        if clean_tag:
            q_tag = QuestionTag(question_id=q.id, tag=clean_tag)
            db.add(q_tag)

    db.commit()
    db.refresh(q)

    log_audit(db, action="QUESTION_CREATED", entity_type="Question", user_id=current_user.id, entity_id=q.id)

    return StandardResponse(data=question_to_response(q), message="Question created successfully")

@router.get("/{question_id}", response_model=StandardResponse[QuestionResponse])
def get_question(question_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return StandardResponse(data=question_to_response(q))

@router.put("/{question_id}", response_model=StandardResponse[QuestionResponse])
def update_question(
    question_id: str,
    data: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("question.update"))
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    # If already approved, only reviewer/moderator/admin can modify
    if q.status == "APPROVED" and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD", "MODERATOR"]:
        raise HTTPException(status_code=403, detail="Approved questions can only be edited by authorized reviewers")

    # Update basic fields
    fields_to_update = ["subject_id", "unit_id", "topic_id", "question_text", "question_type", "marks", "difficulty", "bloom_level", "source_type", "marking_rubric", "language", "explanation", "expected_answer", "status"]
    for f in fields_to_update:
        val = getattr(data, f, None)
        if val is not None:
            if f in ["question_type", "difficulty", "status"]:
                val = val.upper()
            setattr(q, f, val)

    q.updated_by = current_user.id

    # Update options if provided
    if data.options is not None:
        db.query(QuestionOption).filter(QuestionOption.question_id == q.id).delete()
        for opt in data.options:
            q_opt = QuestionOption(
                question_id=q.id,
                option_key=opt.option_key.upper(),
                option_text=opt.option_text,
                is_correct=opt.is_correct
            )
            db.add(q_opt)

    # Update tags if provided
    if data.tags is not None:
        db.query(QuestionTag).filter(QuestionTag.question_id == q.id).delete()
        for tag_str in data.tags:
            clean_tag = tag_str.strip()
            if clean_tag:
                q_tag = QuestionTag(question_id=q.id, tag=clean_tag)
                db.add(q_tag)

    db.commit()
    db.refresh(q)

    log_audit(db, action="QUESTION_UPDATED", entity_type="Question", user_id=current_user.id, entity_id=q.id)

    return StandardResponse(data=question_to_response(q), message="Question updated successfully")

@router.delete("/{question_id}", response_model=StandardResponse[bool])
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("question.delete"))
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db.delete(q)
    db.commit()

    log_audit(db, action="QUESTION_DELETED", entity_type="Question", user_id=current_user.id, entity_id=question_id)
    return StandardResponse(success=True, message="Question deleted successfully", data=True)

@router.post("/{question_id}/action", response_model=StandardResponse[QuestionResponse])
def question_lifecycle_action(
    question_id: str,
    action_data: QuestionStatusAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    action = action_data.action.upper()
    prev_status = q.status

    if action == "SUBMIT":
        q.status = "SUBMITTED"
    elif action == "APPROVE":
        if q.created_by == current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anti-Self-Approval Violation: You cannot review or approve a question you authored yourself. A peer reviewer must evaluate it."
            )
        if current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD", "MODERATOR", "REVIEWER"]:
            raise HTTPException(status_code=403, detail="Only authorized reviewers can approve questions")
        q.status = "APPROVED"
        q.reviewer_id = current_user.id
        q.review_feedback = action_data.comments
    elif action == "REJECT":
        if current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD", "MODERATOR", "REVIEWER"]:
            raise HTTPException(status_code=403, detail="Only authorized reviewers can reject questions")
        q.status = "REJECTED"
        q.reviewer_id = current_user.id
        q.review_feedback = action_data.comments
    elif action == "ARCHIVE":
        q.status = "ARCHIVED"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action '{action}'")

    # Record approval track
    appr = QuestionApproval(
        question_id=q.id,
        reviewer_id=current_user.id,
        previous_status=prev_status,
        new_status=q.status,
        comments=action_data.comments
    )
    db.add(appr)

    db.commit()
    db.refresh(q)

    log_audit(
        db,
        action=f"QUESTION_{action}",
        entity_type="Question",
        user_id=current_user.id,
        entity_id=q.id,
        metadata={"previous": prev_status, "new": q.status, "comments": action_data.comments}
    )

    return StandardResponse(data=question_to_response(q), message=f"Question transitioned to {q.status}")
