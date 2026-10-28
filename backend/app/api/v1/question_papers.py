import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import (
    QuestionPaper, QuestionPaperSection, QuestionPaperQuestion, Question,
    QuestionOption, Subject, User, PaperValidationReport, QuestionPaperTemplate,
    Organization
)
from app.schemas.paper import (
    QuestionPaperResponse, QuestionPaperSectionDetail, QuestionPaperQuestionDetail,
    PaperGenerationRequest, PaperManualQuestionAdd, PaperReorderRequest,
    PaperValidationResult, PaperStatusAction, PaperManualCreate,
    BlueprintValidationResponse, QuestionRegenerateRequest, SectionRegenerateRequest,
    QuestionPaperContentUpdate, AnswerKeyResponse, AnswerKeyItem,
    MarkingSchemeResponse, MarkingSchemeItem,
    PaperSectionCreate, PaperSectionUpdate, PaperSectionReorderRequest,
    PaperAddAlternativeRequest, PaperCreateOrGroupRequest,
    TemplateCreate, TemplateUpdate, TemplateResponse
)
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, require_permission
from app.services.ai_generator import (
    generate_question_paper_hybrid, regenerate_single_question, regenerate_section_questions
)
from app.services.paper_validator import (
    validate_question_paper, validate_blueprint_request
)
from app.services.pdf_generator import (
    generate_question_paper_pdf, generate_confidential_answer_key_pdf, generate_marking_scheme_pdf
)
from app.services.marks_engine import calculate_paper_marks, calculate_blueprint_marks
from app.services.audit_service import log_audit
from app.api.v1.questions import question_to_response
from app.services.ai_provider_service import ai_provider_service
from app.services.syllabus_service import check_syllabus_readiness

router = APIRouter(prefix="/question-papers", tags=["Question Papers"])

def paper_to_response(paper: QuestionPaper, db: Session) -> QuestionPaperResponse:
    marks_summary = calculate_paper_marks(db, paper.id, update_db=False)
    sections_detail: List[QuestionPaperSectionDetail] = []

    sections = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.paper_id == paper.id
    ).order_by(QuestionPaperSection.order_index).all()

    sec_summary_map = {s.section_id: s for s in marks_summary.sections}

    for sec in sections:
        questions_detail: List[QuestionPaperQuestionDetail] = []
        pq_list = db.query(QuestionPaperQuestion).filter(
            QuestionPaperQuestion.section_id == sec.id
        ).order_by(QuestionPaperQuestion.order_index).all()

        for pq in pq_list:
            q = db.query(Question).filter(Question.id == pq.question_id).first()
            if q:
                q_resp = question_to_response(q)
                gid = pq.group_id or pq.or_group_id
                g_type = pq.group_type or ("OR_PAIR" if gid else "SINGLE")
                s_rule = pq.selection_rule or ("OR_PAIR" if gid else "SINGLE")
                questions_detail.append(QuestionPaperQuestionDetail(
                    id=pq.id,
                    question_id=pq.question_id,
                    order_index=pq.order_index,
                    marks=pq.marks,
                    is_compulsory=pq.is_compulsory,
                    or_group_id=gid,
                    group_id=gid,
                    group_type=g_type,
                    selection_rule=s_rule,
                    required_attempts=pq.required_attempts or 1,
                    alternative_label=pq.alternative_label,
                    group_marks=pq.group_marks or pq.marks,
                    source_type=getattr(pq, 'source_type', 'QUESTION_BANK') or 'QUESTION_BANK',
                    bloom_level=getattr(pq, 'bloom_level', 'UNDERSTAND') or 'UNDERSTAND',
                    marking_scheme=getattr(pq, 'marking_scheme', None) or getattr(q, 'marking_rubric', None),
                    expected_answer=getattr(pq, 'expected_answer', None) or q.expected_answer,
                    syllabus_provenance=getattr(pq, 'syllabus_provenance', None),
                    question=q_resp
                ))

        sec_sum = sec_summary_map.get(sec.id)
        sec_attempt_marks = sec_sum.candidate_attempt_marks if sec_sum else (sec.total_marks or 0)
        sec_displayed_marks = sec_sum.displayed_marks if sec_sum else sum(pq.marks for pq in pq_list)

        sections_detail.append(QuestionPaperSectionDetail(
            id=sec.id,
            name=sec.name,
            instructions=sec.instructions,
            order_index=sec.order_index,
            section_type=getattr(sec, 'section_type', 'STANDARD') or 'STANDARD',
            total_marks=sec_attempt_marks,
            displayed_marks=sec_displayed_marks,
            required_attempts=sec.required_attempts,
            selection_rule=sec.selection_rule or 'ALL',
            questions=questions_detail
        ))

    univ_name = None
    dept_name = None
    prog_name = None
    if paper.subject and paper.subject.semester and paper.subject.semester.program:
        prog = paper.subject.semester.program
        prog_name = prog.name
        if prog.department:
            dept_name = prog.department.name
            if prog.department.organization:
                univ_name = prog.department.organization.name

    val_status = None
    if hasattr(paper, 'validation_reports') and paper.validation_reports:
        val_status = paper.validation_reports[0].status
    else:
        latest_rep = db.query(PaperValidationReport).filter(
            PaperValidationReport.paper_id == paper.id
        ).order_by(PaperValidationReport.created_at.desc()).first()
        if latest_rep:
            val_status = latest_rep.status

    source_ratio_val = None
    if hasattr(paper, 'blueprint') and paper.blueprint:
        source_ratio_val = paper.blueprint.source_ratio

    return QuestionPaperResponse(
        id=paper.id,
        subject_id=paper.subject_id,
        subject_name=paper.subject.name if paper.subject else None,
        subject_code=paper.subject.code if paper.subject else None,
        academic_year_name=paper.exam_name,
        semester_name=paper.subject.semester.name if (paper.subject and paper.subject.semester) else None,
        department_name=dept_name,
        university_name=univ_name,
        program_name=prog_name,
        title=paper.title,
        exam_name=paper.exam_name,
        duration_minutes=paper.duration_minutes,
        total_marks=paper.total_marks,
        current_marks=marks_summary.total_candidate_attempt_marks,
        displayed_marks=marks_summary.total_displayed_marks,
        status=paper.status,
        instructions=paper.instructions,
        version=paper.version,
        created_by=paper.created_by,
        creator_name=paper.creator.full_name if paper.creator else None,
        source_ratio=source_ratio_val,
        validation_status=val_status,
        is_syllabus_grounded=getattr(paper, 'is_syllabus_grounded', True) if getattr(paper, 'is_syllabus_grounded', None) is not None else True,
        syllabus_version=getattr(paper, 'syllabus_version', 1) or 1,
        generation_mode=getattr(paper, 'generation_mode', 'SYLLABUS_GROUNDED') or 'SYLLABUS_GROUNDED',
        sections=sections_detail,
        created_at=paper.created_at,
        updated_at=paper.updated_at
    )

@router.get("", response_model=StandardResponse[List[QuestionPaperResponse]])
def get_question_papers(
    subject_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(QuestionPaper)

    # Students can only view PUBLISHED papers
    if current_user.role_name == "STUDENT":
        query = query.filter(QuestionPaper.status == "PUBLISHED")
    elif status_filter:
        query = query.filter(QuestionPaper.status == status_filter.upper())

    if subject_id:
        query = query.filter(QuestionPaper.subject_id == subject_id)

    papers = query.order_by(QuestionPaper.created_at.desc()).all()
    results = [paper_to_response(p, db) for p in papers]
    return StandardResponse(data=results)

@router.post("/generator/blueprint-validate", response_model=StandardResponse[BlueprintValidationResponse])
def validate_blueprint_endpoint(
    req: PaperGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = validate_blueprint_request(db, req)
    return StandardResponse(data=res)

@router.post("/generator/generate", response_model=StandardResponse[QuestionPaperResponse])
@router.post("/generate", response_model=StandardResponse[QuestionPaperResponse])
def generate_paper_auto(
    req: PaperGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.generate"))
):
    paper = generate_question_paper_hybrid(db, req, user_id=current_user.id)
    log_audit(db, action="PAPER_GENERATED", entity_type="QuestionPaper", user_id=current_user.id, entity_id=paper.id)
    return StandardResponse(data=paper_to_response(paper, db), message="Question paper generated successfully via Grounded Hybrid AI Engine")

@router.post("", response_model=StandardResponse[QuestionPaperResponse])
def create_paper_manual(
    data: PaperManualCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.create"))
):
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    paper = QuestionPaper(
        subject_id=data.subject_id,
        title=data.title,
        exam_name=data.exam_name,
        total_marks=data.total_marks,
        duration_minutes=data.duration_minutes,
        instructions=data.instructions,
        status="DRAFT",
        version=1,
        created_by=current_user.id
    )
    db.add(paper)
    db.flush()

    for idx, (s_name, s_inst) in enumerate([
        ("Section A", "Objective Questions"),
        ("Section B", "Short Answer Questions"),
        ("Section C", "Long Answer Questions")
    ], start=1):
        sec = QuestionPaperSection(
            paper_id=paper.id,
            name=s_name,
            instructions=s_inst,
            order_index=idx
        )
        db.add(sec)

    db.commit()
    db.refresh(paper)

    log_audit(db, action="PAPER_CREATED", entity_type="QuestionPaper", user_id=current_user.id, entity_id=paper.id)
    return StandardResponse(data=paper_to_response(paper, db), message="Draft paper initialized")

# --- AI Provider & Syllabus Readiness Checks ---
@router.get("/provider-status", response_model=StandardResponse[Dict[str, Any]])
def get_ai_provider_status(
    current_user: User = Depends(get_current_user)
):
    """Returns AI Provider configuration, model, and operational readiness without exposing credentials."""
    status_info = ai_provider_service.get_status()
    return StandardResponse(data=status_info, message="AI Provider status retrieved")

@router.get("/syllabus-check", response_model=StandardResponse[Dict[str, Any]])
def check_course_syllabus_readiness(
    subject_id: str = Query(..., description="Subject / Course ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates whether an active, valid university syllabus exists for the specified course.
    Returns status (AVAILABLE, INCOMPLETE, PROCESSING, UNAVAILABLE), verified units, and fallback requirements.
    """
    res = check_syllabus_readiness(db, subject_id)
    return StandardResponse(data=res, message="Syllabus readiness evaluated successfully")

# --- Layout Templates Endpoints ---
@router.get("/templates", response_model=StandardResponse[List[TemplateResponse]])
def get_layout_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(QuestionPaperTemplate).filter(QuestionPaperTemplate.is_active == True)
    if current_user.organization_id:
        query = query.filter(
            (QuestionPaperTemplate.organization_id == current_user.organization_id) |
            (QuestionPaperTemplate.is_default == True)
        )
    templates = query.order_by(QuestionPaperTemplate.is_default.desc(), QuestionPaperTemplate.name.asc()).all()
    return StandardResponse(data=[TemplateResponse.model_validate(t) for t in templates])

@router.post("/templates", response_model=StandardResponse[TemplateResponse])
def create_layout_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.create"))
):
    org_id = current_user.organization_id
    if not org_id:
        first_org = db.query(Organization).first()
        org_id = first_org.id if first_org else "default"

    template = QuestionPaperTemplate(
        organization_id=org_id,
        name=data.name,
        description=data.description,
        max_marks=data.max_marks,
        duration_minutes=data.duration_minutes,
        header_html=data.header_html,
        footer_html=data.footer_html,
        instructions_template=data.instructions_template,
        sections_config=data.sections_config,
        is_default=data.is_default,
        created_by=current_user.id
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return StandardResponse(data=TemplateResponse.model_validate(template), message="Layout template created successfully")

@router.get("/templates/{template_id}", response_model=StandardResponse[TemplateResponse])
def get_layout_template_detail(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = db.query(QuestionPaperTemplate).filter(QuestionPaperTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Layout template not found")
    return StandardResponse(data=TemplateResponse.model_validate(template))

@router.put("/templates/{template_id}", response_model=StandardResponse[TemplateResponse])
def update_layout_template(
    template_id: str,
    data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    template = db.query(QuestionPaperTemplate).filter(QuestionPaperTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Layout template not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(template, k, v)
    db.commit()
    db.refresh(template)
    return StandardResponse(data=TemplateResponse.model_validate(template), message="Layout template updated successfully")

@router.delete("/templates/{template_id}", response_model=StandardResponse[Dict[str, Any]])
def delete_layout_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.delete"))
):
    template = db.query(QuestionPaperTemplate).filter(QuestionPaperTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Layout template not found")
    template.is_active = False
    db.commit()
    return StandardResponse(data={"deleted": True, "id": template_id}, message="Layout template deleted successfully")

@router.get("/{paper_id}", response_model=StandardResponse[QuestionPaperResponse])
def get_question_paper(paper_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if current_user.role_name == "STUDENT" and paper.status != "PUBLISHED":
        raise HTTPException(status_code=403, detail="Students can only access published question papers")

    return StandardResponse(data=paper_to_response(paper, db))

@router.post("/{paper_id}/regenerate-question/{pq_id}", response_model=StandardResponse[QuestionPaperResponse])
def regenerate_paper_question_endpoint(
    paper_id: str,
    pq_id: str,
    req: QuestionRegenerateRequest = QuestionRegenerateRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = regenerate_single_question(db, paper_id, pq_id, preference=req.preference or "ANY", user_id=current_user.id)
    log_audit(db, action="QUESTION_REGENERATED", entity_type="QuestionPaper", user_id=current_user.id, entity_id=paper.id)
    return StandardResponse(data=paper_to_response(paper, db), message="Question regenerated successfully")

@router.post("/{paper_id}/regenerate-section/{sec_id}", response_model=StandardResponse[QuestionPaperResponse])
def regenerate_paper_section_endpoint(
    paper_id: str,
    sec_id: str,
    req: SectionRegenerateRequest = SectionRegenerateRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = regenerate_section_questions(db, paper_id, sec_id, preference=req.preference or "ANY", user_id=current_user.id)
    log_audit(db, action="SECTION_REGENERATED", entity_type="QuestionPaper", user_id=current_user.id, entity_id=paper.id)
    return StandardResponse(data=paper_to_response(paper, db), message="Section questions regenerated successfully")

@router.put("/{paper_id}/content", response_model=StandardResponse[QuestionPaperResponse])
def update_paper_question_content(
    paper_id: str,
    data: QuestionPaperContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot modify question paper with status '{paper.status}'. Paper is locked.")

    q = db.query(Question).filter(Question.id == data.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    pq = db.query(QuestionPaperQuestion).filter(
        QuestionPaperQuestion.question_id == data.question_id,
        QuestionPaperQuestion.section.has(paper_id=paper_id)
    ).first()
    if not pq:
        raise HTTPException(status_code=404, detail="Question does not belong to this paper")

    if data.question_text is not None:
        q.question_text = data.question_text
    if data.marks is not None:
        q.marks = data.marks
        pq.marks = data.marks
    if data.difficulty is not None:
        q.difficulty = data.difficulty.upper()
    if data.bloom_level is not None:
        q.bloom_level = data.bloom_level.upper()
        pq.bloom_level = data.bloom_level.upper()
    if data.expected_answer is not None:
        q.expected_answer = data.expected_answer
        pq.expected_answer = data.expected_answer
    if data.marking_scheme is not None:
        q.marking_rubric = data.marking_scheme
        pq.marking_scheme = data.marking_scheme

    # Update options if provided
    if data.options is not None and q.question_type == "MCQ":
        db.query(QuestionOption).filter(QuestionOption.question_id == q.id).delete()
        for opt in data.options:
            db.add(QuestionOption(
                question_id=q.id,
                option_key=opt.get("option_key", "A"),
                option_text=opt.get("option_text", ""),
                is_correct=opt.get("is_correct", False)
            ))

    paper.version += 1
    db.commit()
    db.refresh(paper)

    validate_question_paper(db, paper.id)
    log_audit(db, action="PAPER_CONTENT_EDITED", entity_type="QuestionPaper", user_id=current_user.id, entity_id=paper.id)
    return StandardResponse(data=paper_to_response(paper, db), message="Question content updated successfully")

@router.post("/{paper_id}/questions", response_model=StandardResponse[QuestionPaperResponse])
def add_question_to_paper(
    paper_id: str,
    data: PaperManualQuestionAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify question paper with status '{paper.status}'. Paper is locked."
        )

    q = db.query(Question).filter(Question.id == data.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if q.status != "APPROVED":
        raise HTTPException(
            status_code=400,
            detail=f"Question '{q.id[:8]}' has status '{q.status}'. Only APPROVED questions can be added to question papers."
        )

    marks_val = data.marks if data.marks is not None else q.marks
    max_idx = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.section_id == data.section_id).count()
    order_idx = data.order_index if data.order_index is not None else (max_idx + 1)

    pq = QuestionPaperQuestion(
        section_id=data.section_id,
        question_id=data.question_id,
        order_index=order_idx,
        marks=marks_val,
        is_compulsory=True,
        source_type=getattr(q, 'source_type', 'QUESTION_BANK') or 'QUESTION_BANK',
        bloom_level=getattr(q, 'bloom_level', 'UNDERSTAND') or 'UNDERSTAND',
        marking_scheme=getattr(q, 'marking_rubric', None) or f"{marks_val} Marks upon correct evaluation.",
        expected_answer=q.expected_answer
    )
    db.add(pq)
    db.commit()

    validate_question_paper(db, paper_id)
    return StandardResponse(data=paper_to_response(paper, db), message="Question added to section")

@router.delete("/{paper_id}/questions/{pq_id}", response_model=StandardResponse[QuestionPaperResponse])
def remove_question_from_paper(
    paper_id: str,
    pq_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify question paper with status '{paper.status}'. Paper is locked."
        )

    pq = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.id == pq_id).first()
    if not pq:
        raise HTTPException(status_code=404, detail="Paper question item not found")

    gid = pq.group_id or pq.or_group_id
    db.delete(pq)
    db.flush()
    if gid:
        remaining = db.query(QuestionPaperQuestion).filter(
            (QuestionPaperQuestion.group_id == gid) | (QuestionPaperQuestion.or_group_id == gid)
        ).all()
        if len(remaining) == 1:
            rem = remaining[0]
            rem.group_id = None
            rem.or_group_id = None
            rem.group_type = "SINGLE"
            rem.selection_rule = "SINGLE"
            rem.alternative_label = None
    db.commit()

    calculate_paper_marks(db, paper_id, update_db=True)
    validate_question_paper(db, paper_id)
    return StandardResponse(data=paper_to_response(paper, db), message="Question removed from paper")

@router.post("/{paper_id}/reorder", response_model=StandardResponse[QuestionPaperResponse])
def reorder_paper_questions(
    paper_id: str,
    data: PaperReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify question paper with status '{paper.status}'. Paper is locked."
        )

    for item in data.reordered_questions:
        pq = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.id == item.question_paper_question_id).first()
        if pq:
            if item.new_section_id:
                pq.section_id = item.new_section_id
            pq.order_index = item.new_order_index

    db.commit()
    return StandardResponse(data=paper_to_response(paper, db), message="Questions reordered successfully")

# --- Dynamic Sections & OR Group Management Endpoints ---

@router.post("/{paper_id}/sections", response_model=StandardResponse[QuestionPaperResponse])
def create_paper_section(
    paper_id: str,
    data: PaperSectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")
    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot modify paper with status '{paper.status}'. Paper is locked.")

    max_order = db.query(QuestionPaperSection).filter(QuestionPaperSection.paper_id == paper_id).count()
    order_idx = data.order_index if data.order_index > 0 else (max_order + 1)

    new_sec = QuestionPaperSection(
        paper_id=paper_id,
        name=data.name,
        instructions=data.instructions,
        order_index=order_idx,
        section_type=data.section_type,
        total_marks=data.total_marks,
        required_attempts=data.required_attempts,
        selection_rule=data.selection_rule
    )
    db.add(new_sec)
    db.commit()

    calculate_paper_marks(db, paper_id, update_db=True)
    validate_question_paper(db, paper_id)
    return StandardResponse(data=paper_to_response(paper, db), message=f"Section '{data.name}' created successfully")

@router.put("/{paper_id}/sections/{section_id}", response_model=StandardResponse[QuestionPaperResponse])
def update_paper_section(
    paper_id: str,
    section_id: str,
    data: PaperSectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")
    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot modify paper with status '{paper.status}'. Paper is locked.")

    sec = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.id == section_id,
        QuestionPaperSection.paper_id == paper_id
    ).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found in this paper")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sec, k, v)
    db.commit()

    calculate_paper_marks(db, paper_id, update_db=True)
    validate_question_paper(db, paper_id)
    return StandardResponse(data=paper_to_response(paper, db), message=f"Section '{sec.name}' updated successfully")

@router.delete("/{paper_id}/sections/{section_id}", response_model=StandardResponse[QuestionPaperResponse])
def delete_paper_section(
    paper_id: str,
    section_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")
    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot modify paper with status '{paper.status}'. Paper is locked.")

    sec = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.id == section_id,
        QuestionPaperSection.paper_id == paper_id
    ).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found in this paper")

    db.delete(sec)
    db.commit()

    calculate_paper_marks(db, paper_id, update_db=True)
    validate_question_paper(db, paper_id)
    return StandardResponse(data=paper_to_response(paper, db), message="Section deleted successfully")

@router.post("/{paper_id}/sections/reorder", response_model=StandardResponse[QuestionPaperResponse])
def reorder_paper_sections(
    paper_id: str,
    data: PaperSectionReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")
    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot modify paper with status '{paper.status}'. Paper is locked.")

    for item in data.sections:
        sec = db.query(QuestionPaperSection).filter(
            QuestionPaperSection.id == item.section_id,
            QuestionPaperSection.paper_id == paper_id
        ).first()
        if sec:
            sec.order_index = item.new_order_index
    db.commit()
    return StandardResponse(data=paper_to_response(paper, db), message="Sections reordered successfully")

@router.post("/{paper_id}/questions/{pq_id}/add-alternative", response_model=StandardResponse[QuestionPaperResponse])
def add_alternative_to_question(
    paper_id: str,
    pq_id: str,
    data: PaperAddAlternativeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")
    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot modify paper with status '{paper.status}'. Paper is locked.")

    primary_pq = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.id == pq_id).first()
    if not primary_pq:
        raise HTTPException(status_code=404, detail="Target question item not found")

    # If primary question doesn't have group_id yet, establish new OR group
    group_id = primary_pq.group_id or primary_pq.or_group_id or str(uuid.uuid4())
    primary_pq.group_id = group_id
    primary_pq.or_group_id = group_id
    primary_pq.group_type = "OR_PAIR"
    primary_pq.selection_rule = "OR_PAIR"
    primary_pq.required_attempts = 1
    primary_pq.group_marks = primary_pq.marks
    if not primary_pq.alternative_label:
        primary_pq.alternative_label = "a"
    db.flush()

    existing_in_group = db.query(QuestionPaperQuestion).filter(
        QuestionPaperQuestion.section_id == primary_pq.section_id,
        QuestionPaperQuestion.group_id == group_id
    ).all()
    alt_label = chr(97 + len(existing_in_group)) # 'b', 'c', etc.

    alt_marks = data.marks if data.marks is not None else primary_pq.marks
    if alt_marks != primary_pq.marks:
        raise HTTPException(
            status_code=400,
            detail=f"Mark mismatch: Question A has {primary_pq.marks} Marks, but Alternative was requested with {alt_marks} Marks. Alternatives in an OR group must carry identical mark values."
        )

    if data.question_id:
        q_alt = db.query(Question).filter(Question.id == data.question_id).first()
        if not q_alt:
            raise HTTPException(status_code=404, detail="Specified alternative question not found")
        q_id = q_alt.id
        src_type = "QUESTION_BANK"
        bloom = getattr(q_alt, 'bloom_level', 'UNDERSTAND') or 'UNDERSTAND'
        rubric = getattr(q_alt, 'marking_rubric', None)
        exp_ans = q_alt.expected_answer
    else:
        subject_id = paper.subject_id
        q_text = data.question_text or f"Alternative choice question testing curriculum concepts for {alt_label.upper()}."
        new_q = Question(
            subject_id=subject_id,
            question_text=q_text,
            question_type=data.question_type or "SHORT",
            marks=alt_marks,
            difficulty=data.difficulty or "MEDIUM",
            bloom_level=data.bloom_level or "UNDERSTAND",
            source_type=data.source_type or "AI_GENERATED",
            status="APPROVED",
            expected_answer=data.expected_answer or "Comprehensive solution demonstrating concept mastery.",
            marking_rubric=data.marking_scheme or f"{alt_marks} Marks awarded for correct and complete answer.",
            created_by=current_user.id
        )
        db.add(new_q)
        db.flush()

        if data.options:
            for opt in data.options:
                db.add(QuestionOption(
                    question_id=new_q.id,
                    option_key=opt.get("option_key", "A"),
                    option_text=opt.get("option_text", ""),
                    is_correct=opt.get("is_correct", False)
                ))

        q_id = new_q.id
        src_type = data.source_type or "AI_GENERATED"
        bloom = data.bloom_level or "UNDERSTAND"
        rubric = data.marking_scheme
        exp_ans = data.expected_answer

    alt_pq = QuestionPaperQuestion(
        section_id=primary_pq.section_id,
        question_id=q_id,
        order_index=primary_pq.order_index + 1,
        marks=alt_marks,
        is_compulsory=False,
        group_id=group_id,
        or_group_id=group_id,
        group_type="OR_PAIR",
        selection_rule="OR_PAIR",
        required_attempts=1,
        alternative_label=alt_label,
        group_marks=primary_pq.marks,
        source_type=src_type,
        bloom_level=bloom,
        marking_scheme=rubric,
        expected_answer=exp_ans
    )
    db.add(alt_pq)
    db.commit()

    calculate_paper_marks(db, paper_id, update_db=True)
    validate_question_paper(db, paper_id)
    return StandardResponse(data=paper_to_response(paper, db), message=f"Alternative ({alt_label}) added to question group successfully")

@router.post("/{paper_id}/questions/{pq_id}/unlink-alternative", response_model=StandardResponse[QuestionPaperResponse])
def unlink_question_alternative(
    paper_id: str,
    pq_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")
    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot modify paper with status '{paper.status}'. Paper is locked.")

    target_pq = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.id == pq_id).first()
    if not target_pq:
        raise HTTPException(status_code=404, detail="Question item not found")

    gid = target_pq.group_id or target_pq.or_group_id
    target_pq.group_id = None
    target_pq.or_group_id = None
    target_pq.group_type = "SINGLE"
    target_pq.selection_rule = "SINGLE"
    target_pq.alternative_label = None
    db.flush()

    if gid:
        remaining = db.query(QuestionPaperQuestion).filter(
            (QuestionPaperQuestion.group_id == gid) | (QuestionPaperQuestion.or_group_id == gid)
        ).all()
        if len(remaining) == 1:
            rem = remaining[0]
            rem.group_id = None
            rem.or_group_id = None
            rem.group_type = "SINGLE"
            rem.selection_rule = "SINGLE"
            rem.alternative_label = None
    db.commit()

    calculate_paper_marks(db, paper_id, update_db=True)
    validate_question_paper(db, paper_id)
    return StandardResponse(data=paper_to_response(paper, db), message="Question unlinked from alternative group")

@router.post("/{paper_id}/or-group", response_model=StandardResponse[QuestionPaperResponse])
def create_or_group_endpoint(
    paper_id: str,
    data: PaperCreateOrGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.update"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")
    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail=f"Cannot modify paper with status '{paper.status}'. Paper is locked.")

    pqs = db.query(QuestionPaperQuestion).filter(
        QuestionPaperQuestion.id.in_(data.question_ids),
        QuestionPaperQuestion.section_id == data.section_id
    ).order_by(QuestionPaperQuestion.order_index).all()

    if len(pqs) < 2:
        raise HTTPException(status_code=400, detail="An OR group requires at least 2 questions.")

    group_id = str(uuid.uuid4())
    for idx, pq in enumerate(pqs):
        pq.group_id = group_id
        pq.or_group_id = group_id
        pq.group_type = data.selection_rule
        pq.selection_rule = data.selection_rule
        pq.required_attempts = data.required_attempts
        pq.alternative_label = chr(97 + idx) # 'a', 'b', etc.
        pq.marks = data.marks
        pq.group_marks = data.marks
        pq.is_compulsory = False

    db.commit()
    calculate_paper_marks(db, paper_id, update_db=True)
    validate_question_paper(db, paper_id)
    return StandardResponse(data=paper_to_response(paper, db), message="OR group created successfully")

@router.post("/{paper_id}/save-as-template", response_model=StandardResponse[TemplateResponse])
def save_paper_as_template(
    paper_id: str,
    template_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("paper.create"))
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    sections = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.paper_id == paper_id
    ).order_by(QuestionPaperSection.order_index).all()

    sections_cfg = []
    for s in sections:
        sections_cfg.append({
            "name": s.name,
            "instructions": s.instructions,
            "order_index": s.order_index,
            "section_type": s.section_type,
            "total_marks": s.total_marks,
            "required_attempts": s.required_attempts,
            "selection_rule": s.selection_rule
        })

    org_id = current_user.organization_id
    if not org_id:
        first_org = db.query(Organization).first()
        org_id = first_org.id if first_org else "default"

    name_str = template_name or f"Layout Template - {paper.title} ({paper.total_marks}M)"
    template = QuestionPaperTemplate(
        organization_id=org_id,
        name=name_str,
        description=f"Generated layout pattern from {paper.exam_name} with {len(sections)} sections.",
        max_marks=paper.total_marks,
        duration_minutes=paper.duration_minutes,
        instructions_template=paper.instructions,
        sections_config=sections_cfg,
        is_default=False,
        created_by=current_user.id
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return StandardResponse(data=TemplateResponse.model_validate(template), message="Saved paper layout as reusable template")

@router.get("/{paper_id}/validate", response_model=StandardResponse[PaperValidationResult])
def validate_paper_endpoint(paper_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = validate_question_paper(db, paper_id)
    return StandardResponse(data=res)

@router.get("/{paper_id}/validation-report", response_model=StandardResponse[PaperValidationResult])
def get_paper_validation_report_endpoint(paper_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = validate_question_paper(db, paper_id)
    return StandardResponse(data=res)

@router.get("/{paper_id}/answer-key", response_model=StandardResponse[AnswerKeyResponse])
def get_confidential_answer_key(
    paper_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Rule: Students CAN NEVER access answer keys
    if current_user.role_name == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are not authorized to view examination answer keys or solutions."
        )

    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    # If paper is unapproved draft, only creator, HOD, Exam Controller, Admin can view
    if paper.status in ["DRAFT", "GENERATED", "UNDER_REVIEW"] and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD", "EXAM_CONTROLLER"]:
        if paper.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized to view answer key for unapproved draft paper.")

    items: List[AnswerKeyItem] = []
    global_num = 1
    seen_group_numbers: Dict[str, int] = {}

    sections = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.paper_id == paper.id
    ).order_by(QuestionPaperSection.order_index).all()

    for sec in sections:
        pqs = db.query(QuestionPaperQuestion).filter(
            QuestionPaperQuestion.section_id == sec.id
        ).order_by(QuestionPaperQuestion.order_index).all()

        for pq in pqs:
            q = db.query(Question).filter(Question.id == pq.question_id).first()
            if not q:
                continue

            gid = pq.group_id or pq.or_group_id
            if gid:
                if gid not in seen_group_numbers:
                    seen_group_numbers[gid] = global_num
                    q_num = global_num
                    global_num += 1
                else:
                    q_num = seen_group_numbers[gid]
            else:
                q_num = global_num
                global_num += 1

            correct_opt = None
            if q.question_type == "MCQ" and q.options:
                c_opts = [opt.option_key for opt in q.options if opt.is_correct]
                correct_opt = ", ".join(c_opts) if c_opts else None

            alt_prefix = f"({pq.alternative_label}) " if pq.alternative_label else ""

            items.append(AnswerKeyItem(
                question_id=q.id,
                section_name=sec.name,
                question_number=q_num,
                question_text=f"{alt_prefix}{q.question_text}",
                question_type=q.question_type,
                marks=pq.marks,
                difficulty=q.difficulty or "MEDIUM",
                bloom_level=getattr(pq, 'bloom_level', 'UNDERSTAND') or 'UNDERSTAND',
                source_type=getattr(pq, 'source_type', 'QUESTION_BANK') or 'QUESTION_BANK',
                correct_option=correct_opt,
                expected_answer=pq.expected_answer or q.expected_answer,
                solution_explanation=q.explanation
            ))

    ans_resp = AnswerKeyResponse(
        paper_id=paper.id,
        paper_title=paper.title,
        exam_name=paper.exam_name,
        subject_code=paper.subject.code if paper.subject else "",
        subject_name=paper.subject.name if paper.subject else "",
        total_marks=paper.total_marks,
        is_confidential=True,
        items=items
    )

    log_audit(db, action="ANSWER_KEY_VIEWED", entity_type="QuestionPaper", user_id=current_user.id, entity_id=paper.id)
    return StandardResponse(data=ans_resp)

@router.get("/{paper_id}/pdf/solution")
@router.get("/{paper_id}/pdf/answer-key")
@router.get("/{paper_id}/answer-key-pdf")
def export_confidential_answer_key_pdf(
    paper_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role_name == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are not authorized to download examination answer keys."
        )

    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    pdf_buffer = generate_confidential_answer_key_pdf(db, paper_id)
    clean_title = (paper.title or "Answer_Key").replace(" ", "_")
    filename = f"CONFIDENTIAL_AnswerKey_{clean_title}_{paper.id[:6]}.pdf"

    log_audit(db, action="ANSWER_KEY_EXPORTED_PDF", entity_type="QuestionPaper", user_id=current_user.id, entity_id=paper.id)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{paper_id}/marking-scheme", response_model=StandardResponse[MarkingSchemeResponse])
def get_paper_marking_scheme(
    paper_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role_name == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are not authorized to view examination marking schemes."
        )

    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    items: List[MarkingSchemeItem] = []
    global_num = 1
    seen_group_numbers: Dict[str, int] = {}

    sections = db.query(QuestionPaperSection).filter(
        QuestionPaperSection.paper_id == paper.id
    ).order_by(QuestionPaperSection.order_index).all()

    for sec in sections:
        pqs = db.query(QuestionPaperQuestion).filter(
            QuestionPaperQuestion.section_id == sec.id
        ).order_by(QuestionPaperQuestion.order_index).all()

        for pq in pqs:
            q = db.query(Question).filter(Question.id == pq.question_id).first()
            if not q:
                continue

            gid = pq.group_id or pq.or_group_id
            if gid:
                if gid not in seen_group_numbers:
                    seen_group_numbers[gid] = global_num
                    q_num = global_num
                    global_num += 1
                else:
                    q_num = seen_group_numbers[gid]
            else:
                q_num = global_num
                global_num += 1

            rubric = pq.marking_scheme or q.marking_rubric or f"{pq.marks} Marks upon correct evaluation."
            expected = pq.expected_answer or q.expected_answer
            alt_prefix = f"Option ({pq.alternative_label}): " if pq.alternative_label else ""

            items.append(MarkingSchemeItem(
                question_id=q.id,
                section_name=sec.name,
                question_number=q_num,
                marks=pq.marks,
                rubric_criteria=rubric,
                expected_answer_points=f"{alt_prefix}{expected}" if expected else None,
                step_marks=f"Step marks allocated up to {pq.marks}M",
                examiner_notes="Award full credit for logically valid equivalent formulations."
            ))

    ms_resp = MarkingSchemeResponse(
        paper_id=paper.id,
        paper_title=paper.title,
        exam_name=paper.exam_name,
        subject_code=paper.subject.code if paper.subject else "",
        subject_name=paper.subject.name if paper.subject else "",
        total_marks=paper.total_marks,
        items=items
    )
    return StandardResponse(data=ms_resp)

@router.get("/{paper_id}/pdf/marking-scheme")
@router.get("/{paper_id}/marking-scheme-pdf")
def export_marking_scheme_pdf(
    paper_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role_name == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are not authorized to download examination marking schemes."
        )

    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    pdf_buffer = generate_marking_scheme_pdf(db, paper_id)
    clean_title = (paper.title or "Marking_Scheme").replace(" ", "_")
    filename = f"MarkingScheme_{clean_title}_{paper.id[:6]}.pdf"

    log_audit(db, action="MARKING_SCHEME_EXPORTED_PDF", entity_type="QuestionPaper", user_id=current_user.id, entity_id=paper.id)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/{paper_id}/action", response_model=StandardResponse[QuestionPaperResponse])
def paper_status_action(
    paper_id: str,
    data: PaperStatusAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED", "ARCHIVED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot alter question paper with status '{paper.status}'. Paper is immutably locked."
        )

    action = data.action.upper()
    prev_status = paper.status

    if action == "SUBMIT_FOR_REVIEW":
        val = validate_question_paper(db, paper_id)
        if not val.is_valid:
            raise HTTPException(status_code=400, detail=f"Cannot submit invalid paper: {'; '.join(val.errors)}")
        paper.status = "UNDER_REVIEW"

    elif action == "REQUEST_REVISION":
        if current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD", "EXAM_CONTROLLER", "REVIEWER", "MODERATOR"]:
            raise HTTPException(status_code=403, detail="Insufficient privileges to request revision on question paper")
        paper.status = "REVISION_REQUIRED"

    elif action == "APPROVE":
        # Guard: Anti-Self-Approval rule for teachers/faculty/setters
        if paper.created_by == current_user.id and current_user.role_name in ["FACULTY", "TEACHER", "COORDINATOR", "QUESTION_SETTER"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Faculty and Question Setters cannot self-approve their own question papers. Paper must be reviewed and approved by HOD or Exam Controller."
            )

        if current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD", "EXAM_CONTROLLER", "MODERATOR"]:
            raise HTTPException(status_code=403, detail="Only authorized HOD, Exam Controllers, or Admins can approve question papers")
        
        val = validate_question_paper(db, paper_id)
        if not val.is_valid:
            raise HTTPException(status_code=400, detail=f"Cannot approve paper with validation errors: {'; '.join(val.errors)}")
        
        paper.status = "APPROVED"
        paper.approved_by = current_user.id
        if not paper.reviewed_by:
            paper.reviewed_by = current_user.id

    elif action == "FINALIZE":
        if current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "EXAM_CONTROLLER"]:
            raise HTTPException(status_code=403, detail="Only Examination Controller or University Administrator can finalize question papers")
        if paper.status != "APPROVED":
            raise HTTPException(status_code=400, detail=f"Cannot finalize paper in status '{paper.status}'. Paper must be APPROVED first.")
        paper.status = "FINALIZED"

    elif action == "PUBLISH":
        if current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "EXAM_CONTROLLER", "HOD"]:
            raise HTTPException(status_code=403, detail="Insufficient privileges to publish question paper")
        if paper.status not in ["APPROVED", "FINALIZED"]:
            raise HTTPException(status_code=400, detail=f"Cannot publish paper in status '{paper.status}'. Paper must be APPROVED or FINALIZED first.")
        paper.status = "PUBLISHED"

    elif action == "REJECT":
        if current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD", "EXAM_CONTROLLER", "MODERATOR"]:
            raise HTTPException(status_code=403, detail="Insufficient privileges to reject question paper")
        paper.status = "REJECTED"

    elif action == "ARCHIVE":
        if current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "EXAM_CONTROLLER", "HOD"]:
            raise HTTPException(status_code=403, detail="Insufficient privileges to archive question paper")
        paper.status = "ARCHIVED"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown paper action '{action}'")

    db.commit()
    db.refresh(paper)

    log_audit(
        db,
        action=f"PAPER_{action}",
        entity_type="QuestionPaper",
        user_id=current_user.id,
        entity_id=paper.id,
        metadata={"previous": prev_status, "new": paper.status, "comments": data.comments}
    )

    return StandardResponse(data=paper_to_response(paper, db), message=f"Question paper status updated to {paper.status}")

@router.get("/{paper_id}/pdf")
def export_paper_pdf(paper_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_permission("paper.export"))):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if current_user.role_name == "STUDENT" and paper.status != "PUBLISHED":
        raise HTTPException(status_code=403, detail="Students can only download published question papers")

    pdf_buffer = generate_question_paper_pdf(db, paper_id)
    clean_title = (paper.title or "Question_Paper").replace(" ", "_")
    filename = f"{clean_title}_{paper.id[:6]}.pdf"

    log_audit(db, action="PAPER_EXPORTED_PDF", entity_type="QuestionPaper", user_id=current_user.id, entity_id=paper.id)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
