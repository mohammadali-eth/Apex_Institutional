import secrets
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func

from app.database.session import get_db
from app.models.models import (
    User, Subject, Unit, Topic, Syllabus, Question, QuestionOption, QuestionTag, QuestionApproval,
    QuestionPaper, QuestionPaperSection, QuestionPaperQuestion, FacultyAssignment, OnlineTest,
    Program, Semester, Department, AuditLog
)
from app.schemas.faculty import (
    FacultyDashboardStats, FacultySubjectItem, FacultySubjectDetail, FacultyUnitDetail, FacultyTopicDetail,
    FacultyFeedbackItem, FacultyExamItem, FacultyReportsData,
    FacultyQuestionCreateRequest, FacultyQuestionUpdateRequest,
    FacultyPaperCreateRequest, FacultyPaperUpdateRequest
)
from app.schemas.question import (
    QuestionResponse, QuestionOptionResponse, QuestionOptionCreate
)
from app.schemas.paper import (
    QuestionPaperResponse, PaperGenerationRequest, PaperManualQuestionAdd,
    PaperValidationResult
)
from app.schemas.common import StandardResponse, PaginatedResponse, PaginatedData, PaginationMeta
from app.api.deps import get_current_user, require_permission
from app.services.audit_service import log_audit
from app.services.paper_validator import validate_question_paper
from app.services.ai_generator import generate_question_paper_hybrid
from datetime import datetime, timezone
from app.api.v1.questions import question_to_response
from app.api.v1.question_papers import paper_to_response

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

router = APIRouter(prefix="/faculty", tags=["Faculty"])

def resolve_faculty_context(current_user: User, db: Session):
    """
    Resolves the faculty user's assigned subjects.
    Primary source: FacultyAssignment records for this user.
    Fallback: Department curriculum subjects if user has a department and no explicit assignments yet.
    """
    assignments = db.query(FacultyAssignment).filter(FacultyAssignment.user_id == current_user.id).all()
    assigned_subject_ids = [a.subject_id for a in assignments]

    # Fallback to department subjects if faculty belongs to department and hasn't been individually assigned yet
    if not assigned_subject_ids and current_user.department_id:
        prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id == current_user.department_id).all()]
        sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()]
        assigned_subject_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()]

    return assignments, assigned_subject_ids

# ---------------------------------------------------------
# Screen 1: Faculty Dashboard Stats
# ---------------------------------------------------------
@router.get("/dashboard", response_model=StandardResponse[FacultyDashboardStats])
def get_faculty_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _, assigned_subject_ids = resolve_faculty_context(current_user, db)

    # Question statistics for questions authored by this faculty member
    q_query = db.query(Question).filter(Question.created_by == current_user.id)
    total_q = q_query.count()
    draft_q = q_query.filter(Question.status == "DRAFT").count()
    pending_q = q_query.filter(Question.status.in_(["SUBMITTED", "UNDER_REVIEW"])).count()
    approved_q = q_query.filter(Question.status == "APPROVED").count()
    rejected_q = q_query.filter(Question.status == "REJECTED").count()
    revision_q = q_query.filter(Question.status == "REVISION_REQUIRED").count()

    # Question paper statistics authored by this faculty member
    p_query = db.query(QuestionPaper).filter(QuestionPaper.created_by == current_user.id)
    total_p = p_query.count()
    draft_p = p_query.filter(QuestionPaper.status == "DRAFT").count()
    pending_p = p_query.filter(QuestionPaper.status.in_(["UNDER_REVIEW", "GENERATED"])).count()
    approved_p = p_query.filter(QuestionPaper.status == "APPROVED").count()
    rejected_p = p_query.filter(QuestionPaper.status == "REJECTED").count()
    revision_p = p_query.filter(QuestionPaper.status == "REVISION_REQUIRED").count()
    published_p = p_query.filter(QuestionPaper.status == "PUBLISHED").count()

    # Upcoming examinations for assigned subjects
    upcoming_exams_list: List[FacultyExamItem] = []
    if assigned_subject_ids:
        tests = db.query(OnlineTest).filter(
            OnlineTest.subject_id.in_(assigned_subject_ids)
        ).order_by(OnlineTest.created_at.desc()).limit(5).all()

        for t in tests:
            upcoming_exams_list.append(FacultyExamItem(
                id=t.id,
                subject_id=t.subject_id,
                subject_code=t.subject.code if t.subject else "",
                subject_name=t.subject.name if t.subject else "",
                title=t.title,
                description=t.description,
                test_type=t.test_type,
                duration_minutes=t.duration_minutes,
                total_marks=t.total_marks,
                passing_marks=t.passing_marks,
                is_published=t.is_published,
                created_at=t.created_at,
                deadline_display=t.created_at.strftime("%b %d, %Y") if t.created_at else None,
                status="PUBLISHED" if t.is_published else "DRAFT"
            ))

    # Recent feedback on questions and papers
    feedback_items: List[FacultyFeedbackItem] = []
    
    # 1. Questions with reviewer feedback
    feedback_q = db.query(Question).filter(
        Question.created_by == current_user.id,
        Question.review_feedback.isnot(None),
        Question.review_feedback != ""
    ).order_by(Question.updated_at.desc()).limit(4).all()

    for fq in feedback_q:
        rev_name = fq.reviewer.full_name if fq.reviewer else "Academic Reviewer"
        snippet = fq.question_text[:80] + "..." if len(fq.question_text) > 80 else fq.question_text
        feedback_items.append(FacultyFeedbackItem(
            id=fq.id,
            entity_type="QUESTION",
            title=snippet,
            subject_code=fq.subject.code if fq.subject else None,
            subject_name=fq.subject.name if fq.subject else None,
            status=fq.status,
            reviewer_name=rev_name,
            feedback_comments=fq.review_feedback,
            updated_at=fq.updated_at
        ))

    # 2. Papers with review audit comments
    feedback_p = db.query(QuestionPaper).filter(
        QuestionPaper.created_by == current_user.id,
        QuestionPaper.status.in_(["REVISION_REQUIRED", "REJECTED", "APPROVED"])
    ).order_by(QuestionPaper.updated_at.desc()).limit(4).all()

    for fp in feedback_p:
        rev_user = fp.approver or fp.reviewer
        rev_name = rev_user.full_name if rev_user else "HOD / Exam Authority"
        feedback_items.append(FacultyFeedbackItem(
            id=fp.id,
            entity_type="PAPER",
            title=fp.title,
            subject_code=fp.subject.code if fp.subject else None,
            subject_name=fp.subject.name if fp.subject else None,
            status=fp.status,
            reviewer_name=rev_name,
            feedback_comments=f"Paper status transitioned to {fp.status}",
            updated_at=fp.updated_at
        ))

    # Sort feedback by date descending and keep top 5
    feedback_items.sort(key=lambda x: x.updated_at or get_utc_now(), reverse=True)
    feedback_items = feedback_items[:5]

    # Recent activity logs for this faculty member
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(desc(AuditLog.created_at)).limit(6).all()

    recent_activity_data = [
        {
            "id": l.id,
            "action": l.action,
            "entity_type": l.entity_type,
            "user_email": current_user.email,
            "created_at": l.created_at.isoformat() if l.created_at else get_utc_now().isoformat()
        } for l in logs
    ]

    dept_name = current_user.department.name if current_user.department else (
        current_user.organization.name if current_user.organization else "Academic Department"
    )

    return StandardResponse(
        data=FacultyDashboardStats(
            faculty_name=current_user.full_name,
            department_name=dept_name,
            assigned_subjects_count=len(assigned_subject_ids),
            total_questions_created=total_q,
            draft_questions_count=draft_q,
            pending_review_questions_count=pending_q,
            approved_questions_count=approved_q,
            rejected_questions_count=rejected_q,
            revision_required_questions_count=revision_q,
            draft_papers_count=draft_p,
            pending_review_papers_count=pending_p,
            approved_papers_count=approved_p,
            rejected_papers_count=rejected_p,
            revision_required_papers_count=revision_p,
            published_papers_count=published_p,
            upcoming_deadlines_count=len(upcoming_exams_list),
            upcoming_exams=upcoming_exams_list,
            recent_feedback=feedback_items,
            recent_activity=recent_activity_data
        ),
        message="Faculty dashboard data loaded successfully"
    )

# ---------------------------------------------------------
# Screen 2: My Subjects & Syllabus
# ---------------------------------------------------------
@router.get("/subjects", response_model=StandardResponse[List[FacultySubjectItem]])
def get_faculty_assigned_subjects(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignments, assigned_subject_ids = resolve_faculty_context(current_user, db)
    if not assigned_subject_ids:
        return StandardResponse(data=[], message="No subjects currently assigned to faculty.")

    query = db.query(Subject).filter(Subject.id.in_(assigned_subject_ids))
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(Subject.name.ilike(s), Subject.code.ilike(s)))

    subjects = query.order_by(Subject.code).all()

    # Map assignment role types
    role_map = {a.subject_id: a.role_type for a in assignments}
    assigned_at_map = {a.subject_id: a.created_at for a in assignments}

    results: List[FacultySubjectItem] = []
    for s in subjects:
        # Units and topics counts
        syl = db.query(Syllabus).filter(Syllabus.subject_id == s.id).order_by(Syllabus.version.desc()).first()
        u_count = 0
        t_count = 0
        syl_version = 1
        syl_url = None
        if syl:
            syl_version = syl.version
            syl_url = syl.file_url
            units = db.query(Unit).filter(Unit.syllabus_id == syl.id).all()
            u_count = len(units)
            u_ids = [u.id for u in units]
            if u_ids:
                t_count = db.query(Topic).filter(Topic.unit_id.in_(u_ids)).count()

        q_count = db.query(Question).filter(Question.subject_id == s.id).count()

        prog = s.semester.program if (s.semester and s.semester.program) else None
        dept = prog.department if prog else None

        results.append(FacultySubjectItem(
            id=s.id,
            code=s.code,
            name=s.name,
            credits=s.credits or 3,
            program_id=prog.id if prog else None,
            program_name=prog.name if prog else None,
            semester_id=s.semester_id,
            semester_name=s.semester.name if s.semester else None,
            department_id=dept.id if dept else None,
            department_name=dept.name if dept else None,
            syllabus_version=syl_version,
            syllabus_file_url=syl_url,
            units_count=u_count,
            topics_count=t_count,
            questions_count=q_count,
            role_type=role_map.get(s.id, "TEACHER"),
            assigned_at=assigned_at_map.get(s.id, s.created_at)
        ))

    return StandardResponse(data=results, message="Assigned subjects retrieved")

@router.get("/subjects/{subject_id}", response_model=StandardResponse[FacultySubjectDetail])
def get_faculty_subject_detail(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _, assigned_subject_ids = resolve_faculty_context(current_user, db)
    if subject_id not in assigned_subject_ids and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subject is not in your assigned curriculum."
        )

    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")

    prog = s.semester.program if (s.semester and s.semester.program) else None
    dept = prog.department if prog else None

    # Fetch syllabus, units, and topics
    syl = db.query(Syllabus).filter(Syllabus.subject_id == s.id).order_by(Syllabus.version.desc()).first()
    units_detail: List[FacultyUnitDetail] = []
    u_count = 0
    t_count = 0
    syl_version = 1
    syl_url = None

    if syl:
        syl_version = syl.version
        syl_url = syl.file_url
        units = db.query(Unit).filter(Unit.syllabus_id == syl.id).order_by(Unit.unit_number).all()
        u_count = len(units)

        for u in units:
            topics = db.query(Topic).filter(Topic.unit_id == u.id).order_by(Topic.topic_number).all()
            t_count += len(topics)
            q_cnt = db.query(Question).filter(Question.unit_id == u.id).count()

            units_detail.append(FacultyUnitDetail(
                id=u.id,
                unit_number=u.unit_number,
                title=u.title,
                description=u.description,
                topics=[
                    FacultyTopicDetail(
                        id=t.id,
                        topic_number=t.topic_number,
                        title=t.title,
                        description=t.description,
                        created_at=t.created_at
                    ) for t in topics
                ],
                questions_count=q_cnt
            ))

    q_count = db.query(Question).filter(Question.subject_id == s.id).count()

    assignment = db.query(FacultyAssignment).filter(
        FacultyAssignment.user_id == current_user.id,
        FacultyAssignment.subject_id == s.id
    ).first()

    return StandardResponse(
        data=FacultySubjectDetail(
            id=s.id,
            code=s.code,
            name=s.name,
            credits=s.credits or 3,
            program_id=prog.id if prog else None,
            program_name=prog.name if prog else None,
            semester_id=s.semester_id,
            semester_name=s.semester.name if s.semester else None,
            department_id=dept.id if dept else None,
            department_name=dept.name if dept else None,
            syllabus_version=syl_version,
            syllabus_file_url=syl_url,
            units_count=u_count,
            topics_count=t_count,
            questions_count=q_count,
            role_type=assignment.role_type if assignment else "TEACHER",
            assigned_at=assignment.created_at if assignment else s.created_at,
            units=units_detail
        )
    )

# ---------------------------------------------------------
# Screen 3: My Questions (Authored by Faculty)
# ---------------------------------------------------------
@router.get("/questions", response_model=PaginatedResponse[QuestionResponse])
def get_faculty_questions(
    subject_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    question_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Question).filter(Question.created_by == current_user.id)

    if subject_id:
        query = query.filter(Question.subject_id == subject_id)
    if unit_id:
        query = query.filter(Question.unit_id == unit_id)
    if question_type:
        query = query.filter(Question.question_type == question_type.upper())
    if difficulty:
        query = query.filter(Question.difficulty == difficulty.upper())
    if status_filter:
        query = query.filter(Question.status == status_filter.upper())
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(
            Question.question_text.ilike(s),
            Question.explanation.ilike(s),
            Question.expected_answer.ilike(s)
        ))

    sort_col = getattr(Question, sort_by, Question.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    total = query.count()
    offset = (page - 1) * page_size
    items = [question_to_response(q) for q in query.offset(offset).limit(page_size).all()]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedResponse(
        success=True,
        message="Faculty questions retrieved",
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

@router.post("/questions", response_model=StandardResponse[QuestionResponse])
def create_faculty_question(
    data: FacultyQuestionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Rule: Verify subject is in faculty's assigned curriculum
    _, assigned_subject_ids = resolve_faculty_context(current_user, db)
    if data.subject_id not in assigned_subject_ids and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create question for an unassigned subject. Contact your HOD."
        )

    # Validate marks
    if data.marks <= 0:
        raise HTTPException(status_code=400, detail="Question marks must be a positive integer greater than zero.")

    # Validate MCQ requirements
    q_type = data.question_type.upper()
    if q_type == "MCQ":
        if len(data.options) < 2:
            raise HTTPException(status_code=400, detail="MCQ questions require at least two option choices.")
        if not any(opt.is_correct for opt in data.options):
            raise HTTPException(status_code=400, detail="At least one option must be marked as correct for MCQ.")

    # Validate unit belongs to subject's syllabus if unit_id is provided
    if data.unit_id:
        unit = db.query(Unit).join(Syllabus, Unit.syllabus_id == Syllabus.id).filter(
            Unit.id == data.unit_id,
            Syllabus.subject_id == data.subject_id
        ).first()
        if not unit:
            raise HTTPException(status_code=400, detail="Selected Unit does not belong to this subject's syllabus.")

    init_status = "SUBMITTED" if data.is_submitted else "DRAFT"

    q = Question(
        subject_id=data.subject_id,
        unit_id=data.unit_id,
        topic_id=data.topic_id,
        question_text=data.question_text.strip(),
        question_type=q_type,
        marks=data.marks,
        difficulty=data.difficulty.upper(),
        status=init_status,
        language=data.language or "English",
        explanation=data.explanation,
        expected_answer=data.expected_answer,
        created_by=current_user.id
    )
    db.add(q)
    db.flush()

    if q_type == "MCQ":
        for opt in data.options:
            q_opt = QuestionOption(
                question_id=q.id,
                option_key=opt.option_key.upper(),
                option_text=opt.option_text,
                is_correct=opt.is_correct
            )
            db.add(q_opt)

    for tag_str in data.tags:
        clean_tag = tag_str.strip()
        if clean_tag:
            db.add(QuestionTag(question_id=q.id, tag=clean_tag))

    db.commit()
    db.refresh(q)

    log_audit(
        db,
        action=f"QUESTION_{init_status}",
        entity_type="Question",
        user_id=current_user.id,
        entity_id=q.id,
        metadata={"subject_id": q.subject_id, "type": q.question_type, "marks": q.marks}
    )

    msg = "Question created and submitted for review" if data.is_submitted else "Question saved as draft"
    return StandardResponse(data=question_to_response(q), message=msg)

@router.get("/questions/{question_id}", response_model=StandardResponse[QuestionResponse])
def get_faculty_question_detail(
    question_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    # Access control: can view if authored by user, or in assigned subject, or elevated role
    _, assigned_subject_ids = resolve_faculty_context(current_user, db)
    if q.created_by != current_user.id and q.subject_id not in assigned_subject_ids and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this question")

    return StandardResponse(data=question_to_response(q))

@router.put("/questions/{question_id}", response_model=StandardResponse[QuestionResponse])
def update_faculty_question(
    question_id: str,
    data: FacultyQuestionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    # Creator ownership check
    if q.created_by != current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="You can only edit questions authored by yourself.")

    # Status lock check: Approved or Submitted questions cannot be altered without revision request
    if q.status == "APPROVED" and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="Approved questions are locked from direct editing. Request a revision from HOD.")

    if data.subject_id is not None:
        _, assigned_subject_ids = resolve_faculty_context(current_user, db)
        if data.subject_id not in assigned_subject_ids and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
            raise HTTPException(status_code=403, detail="Cannot assign question to an unassigned subject.")
        q.subject_id = data.subject_id

    if data.unit_id is not None:
        q.unit_id = data.unit_id
    if data.topic_id is not None:
        q.topic_id = data.topic_id
    if data.question_text is not None:
        q.question_text = data.question_text.strip()
    if data.question_type is not None:
        q.question_type = data.question_type.upper()
    if data.marks is not None:
        if data.marks <= 0:
            raise HTTPException(status_code=400, detail="Marks must be greater than zero.")
        q.marks = data.marks
    if data.difficulty is not None:
        q.difficulty = data.difficulty.upper()
    if data.language is not None:
        q.language = data.language
    if data.explanation is not None:
        q.explanation = data.explanation
    if data.expected_answer is not None:
        q.expected_answer = data.expected_answer

    # Update options if provided
    if data.options is not None:
        db.query(QuestionOption).filter(QuestionOption.question_id == q.id).delete()
        for opt in data.options:
            db.add(QuestionOption(
                question_id=q.id,
                option_key=opt.option_key.upper(),
                option_text=opt.option_text,
                is_correct=opt.is_correct
            ))

    # Update tags if provided
    if data.tags is not None:
        db.query(QuestionTag).filter(QuestionTag.question_id == q.id).delete()
        for tag_str in data.tags:
            clean_tag = tag_str.strip()
            if clean_tag:
                db.add(QuestionTag(question_id=q.id, tag=clean_tag))

    # Handle submission action
    if data.is_submitted:
        prev_status = q.status
        q.status = "SUBMITTED"
        db.add(QuestionApproval(
            question_id=q.id,
            reviewer_id=None,
            previous_status=prev_status,
            new_status="SUBMITTED",
            comments="Resubmitted by faculty author after revision"
        ))

    q.updated_at = get_utc_now()
    db.commit()
    db.refresh(q)

    log_audit(db, action="QUESTION_UPDATED", entity_type="Question", user_id=current_user.id, entity_id=q.id)
    return StandardResponse(data=question_to_response(q), message="Question updated successfully")

@router.delete("/questions/{question_id}", response_model=StandardResponse[bool])
def delete_faculty_question(
    question_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if q.created_by != current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="You can only delete questions you authored.")

    if q.status == "APPROVED" and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="Approved questions cannot be deleted.")

    # Guard: check if linked to any question papers
    linked_count = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.question_id == q.id).count()
    if linked_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete question: linked to {linked_count} examination paper(s)."
        )

    db.delete(q)
    db.commit()

    log_audit(db, action="QUESTION_DELETED", entity_type="Question", user_id=current_user.id, entity_id=question_id)
    return StandardResponse(data=True, message="Draft question deleted successfully")

@router.post("/questions/{question_id}/submit", response_model=StandardResponse[QuestionResponse])
def submit_question_for_review(
    question_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if q.created_by != current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="You can only submit your own questions for review.")

    if q.status not in ["DRAFT", "REVISION_REQUIRED", "REJECTED"]:
        raise HTTPException(status_code=400, detail=f"Question is already in '{q.status}' status.")

    prev_status = q.status
    q.status = "SUBMITTED"
    q.updated_at = get_utc_now()

    db.add(QuestionApproval(
        question_id=q.id,
        reviewer_id=None,
        previous_status=prev_status,
        new_status="SUBMITTED",
        comments="Submitted by faculty for HOD / peer moderation"
    ))

    db.commit()
    db.refresh(q)

    log_audit(db, action="QUESTION_SUBMITTED", entity_type="Question", user_id=current_user.id, entity_id=q.id)
    return StandardResponse(data=question_to_response(q), message="Question submitted for moderation review")

@router.post("/questions/{question_id}/duplicate", response_model=StandardResponse[QuestionResponse])
def duplicate_faculty_question(
    question_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    src = db.query(Question).filter(Question.id == question_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Question not found")

    clone = Question(
        subject_id=src.subject_id,
        unit_id=src.unit_id,
        topic_id=src.topic_id,
        question_text=f"{src.question_text} (Copy)",
        question_type=src.question_type,
        marks=src.marks,
        difficulty=src.difficulty,
        status="DRAFT",
        language=src.language,
        explanation=src.explanation,
        expected_answer=src.expected_answer,
        created_by=current_user.id
    )
    db.add(clone)
    db.flush()

    for opt in src.options:
        db.add(QuestionOption(
            question_id=clone.id,
            option_key=opt.option_key,
            option_text=opt.option_text,
            is_correct=opt.is_correct
        ))

    for tag in src.tags:
        db.add(QuestionTag(question_id=clone.id, tag=tag.tag))

    db.commit()
    db.refresh(clone)

    log_audit(db, action="QUESTION_DUPLICATED", entity_type="Question", user_id=current_user.id, entity_id=clone.id)
    return StandardResponse(data=question_to_response(clone), message="Question duplicated into new draft")

# ---------------------------------------------------------
# Screen 4: Question Bank (Authorized & Approved Reuse)
# ---------------------------------------------------------
@router.get("/question-bank", response_model=PaginatedResponse[QuestionResponse])
def get_faculty_question_bank(
    subject_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    question_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    marks: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _, assigned_subject_ids = resolve_faculty_context(current_user, db)

    # Faculty can only browse APPROVED questions in their assigned subjects / department
    query = db.query(Question).filter(
        Question.status == "APPROVED"
    )

    if subject_id:
        if subject_id not in assigned_subject_ids and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
            raise HTTPException(status_code=403, detail="Subject is outside your assigned curriculum.")
        query = query.filter(Question.subject_id == subject_id)
    else:
        if assigned_subject_ids:
            query = query.filter(Question.subject_id.in_(assigned_subject_ids))

    if unit_id:
        query = query.filter(Question.unit_id == unit_id)
    if question_type:
        query = query.filter(Question.question_type == question_type.upper())
    if difficulty:
        query = query.filter(Question.difficulty == difficulty.upper())
    if marks:
        query = query.filter(Question.marks == marks)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(
            Question.question_text.ilike(s),
            Question.explanation.ilike(s)
        ))

    total = query.count()
    offset = (page - 1) * page_size
    items = [question_to_response(q) for q in query.order_by(Question.created_at.desc()).offset(offset).limit(page_size).all()]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedResponse(
        success=True,
        message="Approved questions retrieved from question bank",
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

# ---------------------------------------------------------
# Screen 5 & 6: Question Paper Builder & Management
# ---------------------------------------------------------
@router.get("/papers", response_model=StandardResponse[List[QuestionPaperResponse]])
def get_faculty_papers(
    subject_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(QuestionPaper).filter(QuestionPaper.created_by == current_user.id)

    if subject_id:
        query = query.filter(QuestionPaper.subject_id == subject_id)
    if status_filter:
        query = query.filter(QuestionPaper.status == status_filter.upper())

    papers = query.order_by(QuestionPaper.created_at.desc()).all()
    return StandardResponse(data=[paper_to_response(p, db) for p in papers])

@router.post("/papers", response_model=StandardResponse[QuestionPaperResponse])
def create_faculty_paper_manual(
    data: FacultyPaperCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _, assigned_subject_ids = resolve_faculty_context(current_user, db)
    if data.subject_id not in assigned_subject_ids and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="Subject is outside your assigned curriculum.")

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

    # Standard sections
    for idx, (s_name, s_inst) in enumerate([
        ("Section A", "Objective & Short Answer Questions"),
        ("Section B", "Descriptive & Analytical Questions"),
        ("Section C", "Comprehensive & Long Answer Questions")
    ], start=1):
        db.add(QuestionPaperSection(
            paper_id=paper.id,
            name=s_name,
            instructions=s_inst,
            order_index=idx
        ))

    db.commit()
    db.refresh(paper)

    log_audit(db, action="PAPER_DRAFT_CREATED", entity_type="QuestionPaper", user_id=current_user.id, entity_id=paper.id)
    return StandardResponse(data=paper_to_response(paper, db), message="Draft question paper initialized")

@router.post("/papers/generate", response_model=StandardResponse[QuestionPaperResponse])
def generate_faculty_paper_auto(
    req: PaperGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _, assigned_subject_ids = resolve_faculty_context(current_user, db)
    if req.subject_id not in assigned_subject_ids and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="Subject is outside your assigned curriculum.")

    paper = generate_question_paper_hybrid(db, req, user_id=current_user.id)
    log_audit(db, action="PAPER_GENERATED", entity_type="QuestionPaper", user_id=current_user.id, entity_id=paper.id)
    return StandardResponse(data=paper_to_response(paper, db), message="Question paper successfully generated via Grounded Hybrid AI Engine")

@router.get("/papers/{paper_id}", response_model=StandardResponse[QuestionPaperResponse])
def get_faculty_paper_detail(
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if paper.created_by != current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this question paper.")

    return StandardResponse(data=paper_to_response(paper, db))

@router.put("/papers/{paper_id}", response_model=StandardResponse[QuestionPaperResponse])
def update_faculty_paper_metadata(
    paper_id: str,
    data: FacultyPaperUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if paper.created_by != current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="You can only edit papers you created.")

    if paper.status in ["APPROVED", "FINALIZED", "PUBLISHED"]:
        raise HTTPException(status_code=403, detail=f"Cannot edit paper with status '{paper.status}'. Paper is locked.")

    if data.title is not None:
        paper.title = data.title.strip()
    if data.exam_name is not None:
        paper.exam_name = data.exam_name.strip()
    if data.duration_minutes is not None:
        paper.duration_minutes = data.duration_minutes
    if data.total_marks is not None:
        paper.total_marks = data.total_marks
    if data.instructions is not None:
        paper.instructions = data.instructions

    paper.updated_at = get_utc_now()
    db.commit()
    db.refresh(paper)

    return StandardResponse(data=paper_to_response(paper, db), message="Paper metadata updated")

@router.post("/papers/{paper_id}/questions", response_model=StandardResponse[QuestionPaperResponse])
def add_question_to_faculty_paper(
    paper_id: str,
    data: PaperManualQuestionAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if paper.created_by != current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="You can only modify papers you created.")

    if paper.status in ["APPROVED", "FINALIZED", "PUBLISHED"]:
        raise HTTPException(status_code=403, detail="Cannot add questions to an approved or locked paper.")

    q = db.query(Question).filter(Question.id == data.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if q.status != "APPROVED":
        raise HTTPException(
            status_code=400,
            detail=f"Question '{q.id[:8]}' has status '{q.status}'. Only APPROVED questions can be added to question papers."
        )

    max_idx = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.section_id == data.section_id).count()
    pq = QuestionPaperQuestion(
        section_id=data.section_id,
        question_id=data.question_id,
        order_index=data.order_index if data.order_index is not None else (max_idx + 1),
        marks=data.marks if data.marks is not None else q.marks,
        is_compulsory=True
    )
    db.add(pq)
    db.commit()

    return StandardResponse(data=paper_to_response(paper, db), message="Question added to section")

@router.delete("/papers/{paper_id}/questions/{pq_id}", response_model=StandardResponse[QuestionPaperResponse])
def remove_question_from_faculty_paper(
    paper_id: str,
    pq_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if paper.created_by != current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="You can only modify papers you created.")

    if paper.status in ["APPROVED", "FINALIZED", "PUBLISHED"]:
        raise HTTPException(status_code=403, detail="Cannot remove questions from an approved or locked paper.")

    pq = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.id == pq_id).first()
    if not pq:
        raise HTTPException(status_code=404, detail="Question not found in paper section")

    db.delete(pq)
    db.commit()

    return StandardResponse(data=paper_to_response(paper, db), message="Question removed from paper section")

@router.get("/papers/{paper_id}/validate", response_model=StandardResponse[PaperValidationResult])
def validate_faculty_paper(
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    res = validate_question_paper(db, paper_id)
    return StandardResponse(data=res)

@router.post("/papers/{paper_id}/submit", response_model=StandardResponse[QuestionPaperResponse])
def submit_paper_for_review(
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if paper.created_by != current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD"]:
        raise HTTPException(status_code=403, detail="You can only submit papers you created.")

    if paper.status not in ["DRAFT", "GENERATED", "REVISION_REQUIRED"]:
        raise HTTPException(status_code=400, detail=f"Paper is already in '{paper.status}' status.")

    # Structural blueprint validation
    val = validate_question_paper(db, paper_id)
    if not val.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit invalid question paper: {'; '.join(val.errors)}"
        )

    prev_status = paper.status
    paper.status = "UNDER_REVIEW"
    paper.updated_at = get_utc_now()
    db.commit()
    db.refresh(paper)

    log_audit(
        db,
        action="PAPER_SUBMITTED_FOR_REVIEW",
        entity_type="QuestionPaper",
        user_id=current_user.id,
        entity_id=paper.id,
        metadata={"previous": prev_status, "new": "UNDER_REVIEW"}
    )

    return StandardResponse(data=paper_to_response(paper, db), message="Question paper submitted for HOD review")

# ---------------------------------------------------------
# Screen 7: Review Feedback Hub
# ---------------------------------------------------------
@router.get("/feedback", response_model=StandardResponse[List[FacultyFeedbackItem]])
def get_faculty_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    feedback_items: List[FacultyFeedbackItem] = []

    # 1. Questions with reviewer comments or marked for revision/rejection/approval
    questions = db.query(Question).filter(
        Question.created_by == current_user.id,
        or_(
            Question.review_feedback.isnot(None),
            Question.status.in_(["REVISION_REQUIRED", "REJECTED", "APPROVED"])
        )
    ).order_by(Question.updated_at.desc()).limit(20).all()

    for q in questions:
        rev_name = q.reviewer.full_name if q.reviewer else "Department Reviewer"
        snippet = q.question_text[:100] + "..." if len(q.question_text) > 100 else q.question_text
        feedback_items.append(FacultyFeedbackItem(
            id=q.id,
            entity_type="QUESTION",
            title=snippet,
            subject_code=q.subject.code if q.subject else None,
            subject_name=q.subject.name if q.subject else None,
            status=q.status,
            reviewer_name=rev_name,
            feedback_comments=q.review_feedback or f"Question transitioned to {q.status}",
            updated_at=q.updated_at
        ))

    # 2. Papers with decisions
    papers = db.query(QuestionPaper).filter(
        QuestionPaper.created_by == current_user.id,
        QuestionPaper.status.in_(["REVISION_REQUIRED", "REJECTED", "APPROVED", "PUBLISHED"])
    ).order_by(QuestionPaper.updated_at.desc()).limit(20).all()

    for p in papers:
        rev_user = p.approver or p.reviewer
        rev_name = rev_user.full_name if rev_user else "HOD / Exam Controller"
        feedback_items.append(FacultyFeedbackItem(
            id=p.id,
            entity_type="PAPER",
            title=p.title,
            subject_code=p.subject.code if p.subject else None,
            subject_name=p.subject.name if p.subject else None,
            status=p.status,
            reviewer_name=rev_name,
            feedback_comments=f"Paper decision: {p.status}. Approved by {rev_name}." if p.status == "APPROVED" else f"Status: {p.status}",
            updated_at=p.updated_at
        ))

    feedback_items.sort(key=lambda x: x.updated_at or get_utc_now(), reverse=True)
    return StandardResponse(data=feedback_items, message="Review feedback retrieved")

# ---------------------------------------------------------
# Screen 8: Exam Schedule & Deadlines
# ---------------------------------------------------------
@router.get("/schedule", response_model=StandardResponse[List[FacultyExamItem]])
def get_faculty_exam_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _, assigned_subject_ids = resolve_faculty_context(current_user, db)
    if not assigned_subject_ids:
        return StandardResponse(data=[], message="No exams scheduled for assigned subjects.")

    tests = db.query(OnlineTest).filter(
        OnlineTest.subject_id.in_(assigned_subject_ids)
    ).order_by(OnlineTest.created_at.desc()).all()

    results: List[FacultyExamItem] = []
    for t in tests:
        results.append(FacultyExamItem(
            id=t.id,
            subject_id=t.subject_id,
            subject_code=t.subject.code if t.subject else "",
            subject_name=t.subject.name if t.subject else "",
            title=t.title,
            description=t.description,
            test_type=t.test_type,
            duration_minutes=t.duration_minutes,
            total_marks=t.total_marks,
            passing_marks=t.passing_marks,
            is_published=t.is_published,
            created_at=t.created_at,
            deadline_display=t.created_at.strftime("%b %d, %Y") if t.created_at else None,
            status="PUBLISHED" if t.is_published else "DRAFT"
        ))

    return StandardResponse(data=results, message="Exam schedule retrieved")

# ---------------------------------------------------------
# Screen 9: Academic Reports & Analytics
# ---------------------------------------------------------
@router.get("/reports", response_model=StandardResponse[FacultyReportsData])
def get_faculty_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignments, assigned_subject_ids = resolve_faculty_context(current_user, db)

    # Question statistics
    q_query = db.query(Question).filter(Question.created_by == current_user.id)
    total_q = q_query.count()

    q_statuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REVISION_REQUIRED", "REJECTED"]
    q_by_status = {st: q_query.filter(Question.status == st).count() for st in q_statuses}

    q_types = ["MCQ", "TRUE_FALSE", "FILL_BLANK", "DESCRIPTIVE"]
    q_by_type = {tp: q_query.filter(Question.question_type == tp).count() for tp in q_types}

    q_diffs = ["EASY", "MEDIUM", "HARD"]
    q_by_diff = {df: q_query.filter(Question.difficulty == df).count() for df in q_diffs}

    # Paper statistics
    p_query = db.query(QuestionPaper).filter(QuestionPaper.created_by == current_user.id)
    total_p = p_query.count()

    p_statuses = ["DRAFT", "UNDER_REVIEW", "APPROVED", "REVISION_REQUIRED", "REJECTED", "PUBLISHED"]
    p_by_status = {st: p_query.filter(QuestionPaper.status == st).count() for st in p_statuses}

    # Subject workload breakdown
    workload_list = []
    if assigned_subject_ids:
        subjects = db.query(Subject).filter(Subject.id.in_(assigned_subject_ids)).all()
        for s in subjects:
            s_q_count = q_query.filter(Question.subject_id == s.id).count()
            s_p_count = p_query.filter(QuestionPaper.subject_id == s.id).count()
            workload_list.append({
                "subject_id": s.id,
                "subject_code": s.code,
                "subject_name": s.name,
                "questions_authored": s_q_count,
                "papers_authored": s_p_count
            })

    approved_cnt = q_by_status.get("APPROVED", 0)
    approval_rate = round((approved_cnt / total_q * 100), 1) if total_q > 0 else 0.0

    dept_name = current_user.department.name if current_user.department else (
        current_user.organization.name if current_user.organization else "Academic Department"
    )

    return StandardResponse(
        data=FacultyReportsData(
            faculty_name=current_user.full_name,
            email=current_user.email,
            department_name=dept_name,
            total_questions=total_q,
            questions_by_status=q_by_status,
            questions_by_type=q_by_type,
            questions_by_difficulty=q_by_diff,
            total_papers=total_p,
            papers_by_status=p_by_status,
            subject_workload=workload_list,
            approval_rate_percent=approval_rate
        ),
        message="Faculty academic analytics report generated"
    )
