import random
from typing import List, Dict, Set, Optional
from sqlalchemy.orm import Session
from app.models.models import (
    QuestionPaper, QuestionPaperSection, QuestionPaperQuestion, Question, Subject
)
from app.schemas.paper import PaperGenerationRequest, PaperValidationResult
from app.services.paper_validator import validate_question_paper
from fastapi import HTTPException, status

def generate_question_paper_auto(
    db: Session,
    request: PaperGenerationRequest,
    user_id: Optional[str] = None
) -> QuestionPaper:
    # 1. Verify subject exists
    subject = db.query(Subject).filter(Subject.id == request.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # 2. Validate blueprint distribution
    if not request.distribution:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Blueprint configuration error: distribution cannot be empty."
        )

    blueprint_marks = sum(item.count * item.marks for item in request.distribution)
    if blueprint_marks <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Blueprint configuration error: sum of questions and marks must be greater than zero."
        )

    # Use exact blueprint marks so configured marks strictly equals question sum
    target_marks = blueprint_marks

    # 3. Query ONLY APPROVED questions for the subject - NEVER fall back to drafts or unapproved questions
    approved_questions_query = db.query(Question).filter(
        Question.subject_id == request.subject_id,
        Question.status == "APPROVED"
    )
    all_approved_questions: List[Question] = approved_questions_query.all()

    # 4. Up-front eligibility & availability validation for each distribution requirement
    deficits: List[str] = []
    
    # Initialize random number generator (deterministic if seed is provided)
    rng = random.Random(request.seed) if request.seed is not None else random.Random()

    for item in request.distribution:
        needed_count = item.count
        q_type = item.question_type.upper()
        marks = item.marks

        matching_approved = [
            q for q in all_approved_questions
            if q.marks == marks and (
                q.question_type.upper() == q_type or
                (q_type == "DESCRIPTIVE" and q.question_type.upper() not in ["MCQ", "TRUE_FALSE", "FILL_BLANK"])
            )
        ]

        if len(matching_approved) < needed_count:
            deficits.append(
                f"Requires {needed_count} APPROVED question(s) for '{q_type}' ({marks} Marks), "
                f"but only {len(matching_approved)} approved question(s) exist in Question Bank"
            )

    if deficits:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot generate question paper: {'; '.join(deficits)}. Please create or approve required questions first."
        )

    # 5. Create the QuestionPaper entity
    paper = QuestionPaper(
        subject_id=request.subject_id,
        academic_year_id=request.academic_year_id,
        semester_id=request.semester_id,
        title=request.title,
        exam_name=request.exam_name,
        duration_minutes=request.duration_minutes,
        total_marks=target_marks,
        instructions=request.instructions,
        status="GENERATED",
        created_by=user_id,
        version=1
    )
    db.add(paper)
    db.flush()

    # 6. Initialize standard paper sections
    section_map: Dict[str, QuestionPaperSection] = {}

    def get_or_create_section(sec_name: str, sec_instr: str, order_idx: int) -> QuestionPaperSection:
        if sec_name not in section_map:
            sec = QuestionPaperSection(
                paper_id=paper.id,
                name=sec_name,
                instructions=sec_instr,
                order_index=order_idx
            )
            db.add(sec)
            db.flush()
            section_map[sec_name] = sec
        return section_map[sec_name]

    sec_a = get_or_create_section("Section A", "Objective Type Questions. Answer all questions.", 1)
    sec_b = get_or_create_section("Section B", "Short Answer Questions. Answer all required questions.", 2)
    sec_c = get_or_create_section("Section C", "Long Answer / Descriptive Questions. Detailed answers required.", 3)

    q_order_tracker = {sec_a.id: 1, sec_b.id: 1, sec_c.id: 1}
    used_question_ids: Set[str] = set()

    # 7. Select questions matching distribution
    diff_target = request.difficulty

    for item in request.distribution:
        needed_count = item.count
        q_type = item.question_type.upper()
        marks = item.marks

        candidates = [
            q for q in all_approved_questions
            if q.id not in used_question_ids
            and q.marks == marks
            and (
                q.question_type.upper() == q_type or
                (q_type == "DESCRIPTIVE" and q.question_type.upper() not in ["MCQ", "TRUE_FALSE", "FILL_BLANK"])
            )
        ]

        # Shuffle candidates with reproducible RNG
        rng.shuffle(candidates)

        # Sort candidates to achieve curriculum unit spread and difficulty balance
        def difficulty_score(q: Question) -> int:
            if not diff_target:
                return 1
            diff = (q.difficulty or "MEDIUM").upper()
            if diff == "EASY":
                return diff_target.easy
            elif diff == "HARD":
                return diff_target.hard
            return diff_target.medium

        candidates.sort(key=lambda q: (q.unit_id or "", -difficulty_score(q)))

        selected_for_item = candidates[:needed_count]
        for q in selected_for_item:
            used_question_ids.add(q.id)

        # Route question to section based on mark weight
        if marks <= 2:
            target_sec = sec_a
        elif marks <= 5:
            target_sec = sec_b
        else:
            target_sec = sec_c

        for q in selected_for_item:
            order_idx = q_order_tracker[target_sec.id]
            q_order_tracker[target_sec.id] += 1

            paper_q = QuestionPaperQuestion(
                section_id=target_sec.id,
                question_id=q.id,
                order_index=order_idx,
                marks=q.marks,
                is_compulsory=True
            )
            db.add(paper_q)

    db.flush()

    # 8. Clean up unused sections
    for sec_name, target_sec in list(section_map.items()):
        cnt = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.section_id == target_sec.id).count()
        if cnt == 0:
            db.delete(target_sec)

    db.commit()
    db.refresh(paper)

    # 9. Perform post-generation validation check
    val = validate_question_paper(db, paper.id)
    if not val.is_valid:
        # If generated paper failed validation, rollback and raise
        db.delete(paper)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Generated paper failed validation: {'; '.join(val.errors)}"
        )

    return paper
