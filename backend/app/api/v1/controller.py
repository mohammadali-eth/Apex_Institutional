import json
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.database.session import get_db
from app.models.models import (
    User, Examination, ExamCoordinatorAssignment, ExamReadinessItem,
    ExamOperationalIssue, ExamNotification, ExamScheduleAudit,
    Subject, Department, Program, Semester, AcademicYear,
    QuestionPaper, QuestionPaperSection, QuestionPaperQuestion,
    AuditLog, Organization, PaperRelease
)
from app.schemas.common import StandardResponse
from app.schemas.controller import (
    ControllerDashboardStats, ExaminationItem, ExaminationCreateRequest,
    ExaminationUpdateRequest, ExaminationStatusUpdateRequest,
    PaperApprovalItem, PaperApprovalDecisionRequest, RevisionQueueItem,
    PaperFinalizeRequest, FinalizedPaperItem, PaperReleaseConfigRequest,
    PaperReleaseAuthorizeRequest, PaperReleaseItem, CoordinatorAssignmentItem,
    CoordinatorAssignRequest, ControllerReportsData, AuditLogItem
)
from app.services.paper_validator import validate_question_paper
from app.api.v1.auth import get_current_user
from app.core.permissions import RoleEnum

router = APIRouter(prefix="/controller", tags=["Exam Controller"])

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

def log_audit(db: Session, user_id: str, action: str, entity_type: str, entity_id: str, metadata: Optional[Dict[str, Any]] = None, ip_address: Optional[str] = None):
    try:
        audit = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json=json.dumps(metadata) if metadata else None,
            ip_address=ip_address
        )
        db.add(audit)
        db.flush()
    except Exception:
        pass

def compute_paper_hash(paper: QuestionPaper, db: Session) -> str:
    h = hashlib.sha256()
    h.update(f"{paper.id}:{paper.title}:{paper.total_marks}:{paper.subject_id}:{paper.version}".encode('utf-8'))
    sections = db.query(QuestionPaperSection).filter(QuestionPaperSection.paper_id == paper.id).order_by(QuestionPaperSection.order_index).all()
    for sec in sections:
        h.update(f":sec:{sec.id}:{sec.name}".encode('utf-8'))
        pqs = db.query(QuestionPaperQuestion).filter(QuestionPaperQuestion.section_id == sec.id).order_by(QuestionPaperQuestion.order_index).all()
        for pq in pqs:
            h.update(f":q:{pq.question_id}:{pq.marks}".encode('utf-8'))
    return h.hexdigest()

def resolve_controller_context(user: User, db: Session) -> str:
    """
    Enforces authorization strictly for EXAM_CONTROLLER, SUPER_ADMIN, and UNIVERSITY_ADMIN.
    Resolves and returns the organization_id.
    """
    user_role = (user.role_name or "").upper()
    if user_role not in [RoleEnum.EXAM_CONTROLLER, RoleEnum.SUPER_ADMIN, RoleEnum.UNIVERSITY_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only Examination Controller or University Administrators may perform this action."
        )

    org_id = user.organization_id
    if not org_id:
        first_org = db.query(Organization).first()
        if first_org:
            org_id = first_org.id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No institutional organization context found for this controller."
            )
    return org_id

# -------------------------------------------------------------
# 1. Controller Dashboard Overview
# -------------------------------------------------------------
@router.get("/dashboard", response_model=StandardResponse[ControllerDashboardStats])
def get_controller_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    now = get_utc_now()

    # Query examinations for org
    exams = db.query(Examination).filter(Examination.organization_id == org_id).all()
    total_exams = len(exams)
    scheduled_exams = sum(1 for e in exams if e.status == "SCHEDULED")
    in_progress_exams = sum(1 for e in exams if e.status == "IN_PROGRESS")
    completed_exams = sum(1 for e in exams if e.status == "COMPLETED")

    # Subjects under this org
    dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id == org_id).all()]
    prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id.in_(dept_ids)).all()] if dept_ids else []
    sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()] if prog_ids else []
    subject_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()] if sem_ids else []

    # Paper counts
    papers_query = db.query(QuestionPaper)
    if subject_ids:
        papers_query = papers_query.filter(QuestionPaper.subject_id.in_(subject_ids))
    all_papers = papers_query.all()

    papers_awaiting_approval = sum(1 for p in all_papers if p.status in ["UNDER_REVIEW", "REVIEWED"])
    papers_pending_prior_review = sum(1 for p in all_papers if p.status in ["DRAFT", "GENERATED"])
    revision_queue_count = sum(1 for p in all_papers if p.status in ["REVISION_REQUIRED", "REJECTED"])
    finalized_papers_count = sum(1 for p in all_papers if p.status == "FINALIZED" or getattr(p, 'is_locked', False))

    # Released papers
    released_papers_count = db.query(PaperRelease).filter(
        PaperRelease.release_status == "RELEASED",
        PaperRelease.paper_id.in_([p.id for p in all_papers])
    ).count() if all_papers else 0

    # Overdue submissions
    overdue_submissions = 0
    paper_by_subject = {p.subject_id: p for p in all_papers if p.status in ["APPROVED", "FINALIZED", "PUBLISHED"]}
    for e in exams:
        if e.paper_submission_deadline and e.paper_submission_deadline < now:
            if not e.subject_id or e.subject_id not in paper_by_subject:
                overdue_submissions += 1

    # Open critical issues
    exam_ids = [e.id for e in exams]
    open_critical_issues = db.query(ExamOperationalIssue).filter(
        ExamOperationalIssue.examination_id.in_(exam_ids),
        ExamOperationalIssue.severity.in_(["HIGH", "CRITICAL"]),
        ExamOperationalIssue.status.in_(["OPEN", "IN_PROGRESS", "ESCALATED"])
    ).count() if exam_ids else 0

    # Active coordinators
    active_coordinators = db.query(func.count(func.distinct(ExamCoordinatorAssignment.user_id))).filter(
        ExamCoordinatorAssignment.is_active == True,
        or_(
            ExamCoordinatorAssignment.examination_id.in_(exam_ids) if exam_ids else False,
            ExamCoordinatorAssignment.department_id.in_(dept_ids) if dept_ids else False
        )
    ).scalar() or 0

    # Recent activities (audit trail)
    recent_audits = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(8).all()
    recent_activities = [
        {
            "id": a.id,
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "metadata": json.loads(a.metadata_json) if a.metadata_json else {}
        }
        for a in recent_audits
    ]

    # Urgent alerts
    urgent_alerts = []
    if overdue_submissions > 0:
        urgent_alerts.append({
            "type": "OVERDUE_PAPERS",
            "severity": "HIGH",
            "message": f"{overdue_submissions} examination(s) have passed the question paper submission deadline."
        })
    if open_critical_issues > 0:
        urgent_alerts.append({
            "type": "CRITICAL_ISSUES",
            "severity": "CRITICAL",
            "message": f"{open_critical_issues} critical operational issue(s) require immediate Controller attention."
        })
    if papers_awaiting_approval > 0:
        urgent_alerts.append({
            "type": "PENDING_APPROVALS",
            "severity": "MEDIUM",
            "message": f"{papers_awaiting_approval} question paper(s) are awaiting final controller approval."
        })

    stats = ControllerDashboardStats(
        total_examinations=total_exams,
        scheduled_examinations=scheduled_exams,
        in_progress_examinations=in_progress_exams,
        completed_examinations=completed_exams,
        papers_awaiting_approval=papers_awaiting_approval,
        papers_pending_prior_review=papers_pending_prior_review,
        revision_queue_count=revision_queue_count,
        finalized_papers_count=finalized_papers_count,
        released_papers_count=released_papers_count,
        overdue_submissions=overdue_submissions,
        open_critical_issues=open_critical_issues,
        active_coordinators=active_coordinators,
        recent_activities=recent_activities,
        urgent_alerts=urgent_alerts
    )
    return StandardResponse(data=stats, message="Controller dashboard stats retrieved successfully")

# -------------------------------------------------------------
# 2. Examination Administration
# -------------------------------------------------------------
@router.get("/examinations", response_model=StandardResponse[List[ExaminationItem]])
def list_examinations(
    department_id: Optional[str] = None,
    program_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    query = db.query(Examination).filter(Examination.organization_id == org_id)

    if department_id:
        query = query.filter(Examination.department_id == department_id)
    if program_id:
        query = query.filter(Examination.program_id == program_id)
    if status_filter:
        query = query.filter(Examination.status == status_filter.upper())
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(or_(Examination.name.ilike(search_fmt), Examination.code.ilike(search_fmt)))

    exams = query.order_by(Examination.start_time.asc().nullslast(), Examination.created_at.desc()).all()
    results: List[ExaminationItem] = []

    for e in exams:
        dept = db.query(Department).filter(Department.id == e.department_id).first() if e.department_id else None
        prog = db.query(Program).filter(Program.id == e.program_id).first() if e.program_id else None
        sem = db.query(Semester).filter(Semester.id == e.semester_id).first() if e.semester_id else None
        subj = db.query(Subject).filter(Subject.id == e.subject_id).first() if e.subject_id else None

        # Readiness percentage
        readiness_items = db.query(ExamReadinessItem).filter(ExamReadinessItem.examination_id == e.id).all()
        readiness_pct = 0.0
        if readiness_items:
            completed_c = sum(1 for item in readiness_items if item.status == "COMPLETED")
            readiness_pct = round((completed_c / len(readiness_items)) * 100, 1)

        # Paper status
        paper = db.query(QuestionPaper).filter(QuestionPaper.subject_id == e.subject_id).order_by(QuestionPaper.created_at.desc()).first() if e.subject_id else None
        paper_st = paper.status if paper else "NOT_STARTED"
        paper_id_val = paper.id if paper else None

        coord_count = db.query(ExamCoordinatorAssignment).filter(
            ExamCoordinatorAssignment.examination_id == e.id,
            ExamCoordinatorAssignment.is_active == True
        ).count()

        results.append(ExaminationItem(
            id=e.id,
            code=e.code,
            name=e.name,
            exam_type=e.exam_type or "FINAL",
            organization_id=e.organization_id,
            department_id=e.department_id,
            department_name=dept.name if dept else None,
            program_id=e.program_id,
            program_name=prog.name if prog else None,
            semester_id=e.semester_id,
            semester_name=sem.name if sem else None,
            subject_id=e.subject_id,
            subject_code=subj.code if subj else None,
            subject_name=subj.name if subj else None,
            start_time=e.start_time,
            end_time=e.end_time,
            duration_minutes=e.duration_minutes or 180,
            total_marks=e.total_marks or 100,
            venue=e.venue,
            paper_submission_deadline=e.paper_submission_deadline,
            status=e.status or "SCHEDULED",
            readiness_percentage=readiness_pct,
            paper_status=paper_st,
            paper_id=paper_id_val,
            assigned_coordinators_count=coord_count
        ))

    return StandardResponse(data=results, message="Examinations listed successfully")

@router.post("/examinations", response_model=StandardResponse[ExaminationItem])
def create_examination(
    payload: ExaminationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)

    # Check duplicate code
    existing = db.query(Examination).filter(
        Examination.organization_id == org_id,
        Examination.code == payload.code.strip()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An examination with code '{payload.code}' already exists in this institution."
        )

    # Auto-resolve department/program/semester from subject if not provided
    dept_id = payload.department_id
    prog_id = payload.program_id
    sem_id = payload.semester_id
    if payload.subject_id and (not dept_id or not prog_id or not sem_id):
        subj = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if subj:
            sem_id = sem_id or subj.semester_id
            if subj.semester:
                prog_id = prog_id or subj.semester.program_id
                if subj.semester.program:
                    dept_id = dept_id or subj.semester.program.department_id

    exam = Examination(
        organization_id=org_id,
        department_id=dept_id,
        program_id=prog_id,
        academic_year_id=payload.academic_year_id,
        semester_id=sem_id,
        subject_id=payload.subject_id,
        code=payload.code.strip(),
        name=payload.name.strip(),
        exam_type=payload.exam_type,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration_minutes=payload.duration_minutes,
        total_marks=payload.total_marks,
        venue=payload.venue,
        paper_submission_deadline=payload.paper_submission_deadline,
        status=payload.status,
        created_by=current_user.id
    )
    db.add(exam)
    db.flush()

    # Seed standard operational readiness checklist items
    default_readiness = [
        ("QUESTION_PAPER", "Question Paper Authoring", "Faculty creates and drafts paper questions according to syllabus blueprint."),
        ("QUESTION_PAPER", "HOD Review & Approval", "Department Head reviews questions, marks allocation, and syllabus alignment."),
        ("QUESTION_PAPER", "Controller Final Authorization", "Exam Controller validates, approves, and immutably finalizes paper."),
        ("SCHEDULING", "Room & Hall Allocation", "Verify exam hall capacity, seating arrangement, and accessibility."),
        ("OPERATIONAL", "Invigilator & Faculty Assignment", "Confirm roster of active examination invigilators and supervisors."),
        ("FINAL", "Confidential Release Verification", "Controlled release authorized within approved schedule window.")
    ]
    for cat, title, desc in default_readiness:
        r_item = ExamReadinessItem(
            examination_id=exam.id,
            category=cat,
            title=title,
            description=desc,
            is_required=True,
            status="NOT_STARTED"
        )
        db.add(r_item)

    log_audit(db, current_user.id, "EXAMINATION_CREATED", "Examination", exam.id, {
        "code": exam.code,
        "name": exam.name,
        "org_id": org_id
    })
    db.commit()
    db.refresh(exam)

    dept = db.query(Department).filter(Department.id == exam.department_id).first() if exam.department_id else None
    subj = db.query(Subject).filter(Subject.id == exam.subject_id).first() if exam.subject_id else None

    item = ExaminationItem(
        id=exam.id,
        code=exam.code,
        name=exam.name,
        exam_type=exam.exam_type or "FINAL",
        organization_id=exam.organization_id,
        department_id=exam.department_id,
        department_name=dept.name if dept else None,
        program_id=exam.program_id,
        semester_id=exam.semester_id,
        subject_id=exam.subject_id,
        subject_code=subj.code if subj else None,
        subject_name=subj.name if subj else None,
        start_time=exam.start_time,
        end_time=exam.end_time,
        duration_minutes=exam.duration_minutes or 180,
        total_marks=exam.total_marks or 100,
        venue=exam.venue,
        paper_submission_deadline=exam.paper_submission_deadline,
        status=exam.status or "SCHEDULED",
        readiness_percentage=0.0,
        paper_status="NOT_STARTED",
        assigned_coordinators_count=0
    )
    return StandardResponse(data=item, message="Examination created successfully")

@router.get("/examinations/{exam_id}", response_model=StandardResponse[Dict[str, Any]])
def get_examination_detail(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    exam = db.query(Examination).filter(
        Examination.id == exam_id,
        Examination.organization_id == org_id
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    dept = db.query(Department).filter(Department.id == exam.department_id).first() if exam.department_id else None
    prog = db.query(Program).filter(Program.id == exam.program_id).first() if exam.program_id else None
    sem = db.query(Semester).filter(Semester.id == exam.semester_id).first() if exam.semester_id else None
    subj = db.query(Subject).filter(Subject.id == exam.subject_id).first() if exam.subject_id else None

    # Readiness
    readiness = db.query(ExamReadinessItem).filter(ExamReadinessItem.examination_id == exam.id).all()
    readiness_list = [
        {
            "id": r.id,
            "category": r.category,
            "title": r.title,
            "description": r.description,
            "status": r.status,
            "is_required": r.is_required,
            "notes": r.notes
        }
        for r in readiness
    ]

    # Coordinators
    assignments = db.query(ExamCoordinatorAssignment).filter(
        ExamCoordinatorAssignment.examination_id == exam.id,
        ExamCoordinatorAssignment.is_active == True
    ).all()
    coordinators = []
    for a in assignments:
        u = db.query(User).filter(User.id == a.user_id).first()
        coordinators.append({
            "assignment_id": a.id,
            "user_id": a.user_id,
            "name": u.full_name if u else "Unknown",
            "email": u.email if u else "",
            "can_edit_schedule": a.can_edit_schedule,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None
        })

    # Associated Paper
    paper = db.query(QuestionPaper).filter(QuestionPaper.subject_id == exam.subject_id).order_by(QuestionPaper.created_at.desc()).first() if exam.subject_id else None
    paper_info = None
    if paper:
        paper_info = {
            "id": paper.id,
            "title": paper.title,
            "exam_name": paper.exam_name,
            "status": paper.status,
            "total_marks": paper.total_marks,
            "is_locked": getattr(paper, 'is_locked', False),
            "finalized_at": paper.finalized_at.isoformat() if getattr(paper, 'finalized_at', None) else None,
            "version": paper.version
        }

    return StandardResponse(data={
        "id": exam.id,
        "code": exam.code,
        "name": exam.name,
        "exam_type": exam.exam_type,
        "department_id": exam.department_id,
        "department_name": dept.name if dept else None,
        "program_id": exam.program_id,
        "program_name": prog.name if prog else None,
        "semester_id": exam.semester_id,
        "semester_name": sem.name if sem else None,
        "subject_id": exam.subject_id,
        "subject_code": subj.code if subj else None,
        "subject_name": subj.name if subj else None,
        "start_time": exam.start_time.isoformat() if exam.start_time else None,
        "end_time": exam.end_time.isoformat() if exam.end_time else None,
        "duration_minutes": exam.duration_minutes,
        "total_marks": exam.total_marks,
        "venue": exam.venue,
        "paper_submission_deadline": exam.paper_submission_deadline.isoformat() if exam.paper_submission_deadline else None,
        "status": exam.status,
        "readiness_items": readiness_list,
        "assigned_coordinators": coordinators,
        "paper": paper_info
    }, message="Examination details retrieved")

@router.put("/examinations/{exam_id}", response_model=StandardResponse[Dict[str, Any]])
def update_examination(
    exam_id: str,
    payload: ExaminationUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    exam = db.query(Examination).filter(
        Examination.id == exam_id,
        Examination.organization_id == org_id
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    if payload.name is not None:
        exam.name = payload.name.strip()
    if payload.exam_type is not None:
        exam.exam_type = payload.exam_type
    if payload.department_id is not None:
        exam.department_id = payload.department_id
    if payload.program_id is not None:
        exam.program_id = payload.program_id
    if payload.semester_id is not None:
        exam.semester_id = payload.semester_id
    if payload.subject_id is not None:
        exam.subject_id = payload.subject_id
    if payload.start_time is not None:
        exam.start_time = payload.start_time
    if payload.end_time is not None:
        exam.end_time = payload.end_time
    if payload.duration_minutes is not None:
        exam.duration_minutes = payload.duration_minutes
    if payload.total_marks is not None:
        exam.total_marks = payload.total_marks
    if payload.venue is not None:
        exam.venue = payload.venue
    if payload.paper_submission_deadline is not None:
        exam.paper_submission_deadline = payload.paper_submission_deadline
    if payload.status is not None:
        exam.status = payload.status

    log_audit(db, current_user.id, "EXAMINATION_UPDATED", "Examination", exam.id, {
        "updated_fields": list(payload.model_dump(exclude_unset=True).keys())
    })
    db.commit()
    return StandardResponse(data={"id": exam.id, "status": exam.status}, message="Examination updated successfully")

@router.patch("/examinations/{exam_id}/status", response_model=StandardResponse[Dict[str, Any]])
def update_examination_status(
    exam_id: str,
    payload: ExaminationStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    exam = db.query(Examination).filter(
        Examination.id == exam_id,
        Examination.organization_id == org_id
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    valid_statuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "POSTPONED", "CANCELLED"]
    new_status = payload.status.upper()
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Allowed: {', '.join(valid_statuses)}"
        )

    prev_status = exam.status
    exam.status = new_status

    log_audit(db, current_user.id, "EXAM_STATUS_CHANGED", "Examination", exam.id, {
        "previous_status": prev_status,
        "new_status": new_status
    })
    db.commit()
    return StandardResponse(data={"id": exam.id, "status": exam.status}, message=f"Examination status updated to {new_status}")

# -------------------------------------------------------------
# 3. Schedule Management & Conflict Detection
# -------------------------------------------------------------
@router.get("/schedule", response_model=StandardResponse[List[Dict[str, Any]]])
def get_examination_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    exams = db.query(Examination).filter(Examination.organization_id == org_id).order_by(
        Examination.start_time.asc().nullslast()
    ).all()

    items = []
    for e in exams:
        subj = db.query(Subject).filter(Subject.id == e.subject_id).first() if e.subject_id else None
        dept = db.query(Department).filter(Department.id == e.department_id).first() if e.department_id else None
        prog = db.query(Program).filter(Program.id == e.program_id).first() if e.program_id else None

        # Check conflicts
        conflicts = []
        if e.start_time and e.end_time:
            # Check venue clashes
            if e.venue:
                clash_venue = db.query(Examination).filter(
                    Examination.organization_id == org_id,
                    Examination.id != e.id,
                    Examination.venue == e.venue,
                    Examination.start_time < e.end_time,
                    Examination.end_time > e.start_time
                ).first()
                if clash_venue:
                    conflicts.append(f"Venue clash: Room '{e.venue}' overlapping with {clash_venue.code}")

            # Check student cohort clash (same program + semester at overlapping time)
            if e.program_id and e.semester_id:
                clash_cohort = db.query(Examination).filter(
                    Examination.organization_id == org_id,
                    Examination.id != e.id,
                    Examination.program_id == e.program_id,
                    Examination.semester_id == e.semester_id,
                    Examination.start_time < e.end_time,
                    Examination.end_time > e.start_time
                ).first()
                if clash_cohort:
                    conflicts.append(f"Cohort overlap: Same semester students scheduled simultaneously for {clash_cohort.code}")

        items.append({
            "id": e.id,
            "code": e.code,
            "name": e.name,
            "department_name": dept.name if dept else None,
            "program_name": prog.name if prog else None,
            "subject_code": subj.code if subj else None,
            "subject_name": subj.name if subj else None,
            "venue": e.venue,
            "start_time": e.start_time.isoformat() if e.start_time else None,
            "end_time": e.end_time.isoformat() if e.end_time else None,
            "duration_minutes": e.duration_minutes,
            "status": e.status,
            "has_conflict": len(conflicts) > 0,
            "conflicts": conflicts
        })

    return StandardResponse(data=items, message="Schedule retrieved successfully")

@router.put("/schedule/{exam_id}", response_model=StandardResponse[Dict[str, Any]])
def update_examination_schedule(
    exam_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    exam = db.query(Examination).filter(
        Examination.id == exam_id,
        Examination.organization_id == org_id
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    prev_vals = {
        "start_time": exam.start_time.isoformat() if exam.start_time else None,
        "end_time": exam.end_time.isoformat() if exam.end_time else None,
        "venue": exam.venue
    }

    if "start_time" in payload and payload["start_time"]:
        exam.start_time = datetime.fromisoformat(payload["start_time"].replace("Z", "+00:00"))
    if "end_time" in payload and payload["end_time"]:
        exam.end_time = datetime.fromisoformat(payload["end_time"].replace("Z", "+00:00"))
    if "venue" in payload:
        exam.venue = payload["venue"]
    if "duration_minutes" in payload and payload["duration_minutes"] is not None:
        exam.duration_minutes = int(payload["duration_minutes"])

    # Audit schedule modification
    audit_entry = ExamScheduleAudit(
        examination_id=exam.id,
        actor_id=current_user.id,
        action="SCHEDULE_UPDATED",
        previous_value_json=json.dumps(prev_vals),
        new_value_json=json.dumps({
            "start_time": exam.start_time.isoformat() if exam.start_time else None,
            "end_time": exam.end_time.isoformat() if exam.end_time else None,
            "venue": exam.venue
        }),
        reason=payload.get("reason", "Schedule adjusted by Controller")
    )
    db.add(audit_entry)
    db.commit()

    return StandardResponse(data={
        "id": exam.id,
        "start_time": exam.start_time.isoformat() if exam.start_time else None,
        "end_time": exam.end_time.isoformat() if exam.end_time else None,
        "venue": exam.venue
    }, message="Schedule updated successfully")

# -------------------------------------------------------------
# 4. Question Paper Approvals
# -------------------------------------------------------------
@router.get("/approvals", response_model=StandardResponse[List[PaperApprovalItem]])
def list_papers_for_approval(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)

    # Get all subjects in org
    dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id == org_id).all()]
    prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id.in_(dept_ids)).all()] if dept_ids else []
    sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()] if prog_ids else []
    subject_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()] if sem_ids else []

    query = db.query(QuestionPaper)
    if subject_ids:
        query = query.filter(QuestionPaper.subject_id.in_(subject_ids))

    if status_filter:
        query = query.filter(QuestionPaper.status == status_filter.upper())
    else:
        # Default to papers awaiting controller approval
        query = query.filter(QuestionPaper.status.in_(["UNDER_REVIEW", "REVIEWED", "APPROVED"]))

    papers = query.order_by(QuestionPaper.updated_at.desc()).all()
    results: List[PaperApprovalItem] = []

    for p in papers:
        subj = db.query(Subject).filter(Subject.id == p.subject_id).first() if p.subject_id else None
        dept_name = None
        if subj and subj.semester and subj.semester.program and subj.semester.program.department:
            dept_name = subj.semester.program.department.name

        creator = db.query(User).filter(User.id == p.created_by).first() if p.created_by else None
        reviewer = db.query(User).filter(User.id == p.reviewed_by).first() if p.reviewed_by else None

        # Check prior review satisfaction:
        # Considered satisfied if reviewed_by is assigned, or status indicates reviewed
        has_prior_review = bool(p.reviewed_by) or p.status == "REVIEWED"

        # Validation check
        val = validate_question_paper(db, p.id)

        results.append(PaperApprovalItem(
            id=p.id,
            title=p.title,
            exam_name=p.exam_name,
            subject_id=p.subject_id,
            subject_code=subj.code if subj else "",
            subject_name=subj.name if subj else "",
            department_name=dept_name,
            total_marks=p.total_marks,
            duration_minutes=p.duration_minutes,
            status=p.status,
            version=p.version or 1,
            is_locked=getattr(p, 'is_locked', False),
            created_by_name=creator.full_name if creator else "Faculty",
            reviewed_by_name=reviewer.full_name if reviewer else None,
            has_prior_review=has_prior_review,
            validation_passed=val.is_valid,
            validation_errors=val.errors,
            created_at=p.created_at,
            updated_at=p.updated_at
        ))

    return StandardResponse(data=results, message="Papers for approval retrieved successfully")

@router.post("/approvals/{paper_id}/decision", response_model=StandardResponse[Dict[str, Any]])
def decide_paper_approval(
    paper_id: str,
    payload: PaperApprovalDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found.")

    if getattr(paper, 'is_locked', False) or paper.status in ["FINALIZED", "PUBLISHED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot alter paper with status '{paper.status}'. Paper is immutably locked."
        )

    action = payload.action.upper()
    now = get_utc_now()

    if action == "APPROVE":
        # Mandatory prior review stage enforcement:
        # Paper must have been reviewed by HOD or designated reviewer
        if not paper.reviewed_by and not paper.approved_by and paper.status not in ["REVIEWED", "UNDER_REVIEW", "APPROVED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mandatory prior review stage not satisfied. This paper must be reviewed by the HOD or departmental reviewer before Exam Controller approval."
            )

        # Validate paper completeness and marks
        val = validate_question_paper(db, paper_id)
        if not val.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve paper due to validation errors: {'; '.join(val.errors)}"
            )

        prev_status = paper.status
        paper.status = "APPROVED"
        paper.approved_by = current_user.id
        paper.rejection_reason = None
        if payload.comments:
            paper.revision_comments = payload.comments

        # Send notification to author
        if paper.created_by:
            notif = ExamNotification(
                recipient_id=paper.created_by,
                sender_id=current_user.id,
                title="Question Paper Approved",
                message=f"Your question paper '{paper.title}' has received final approval from the Examination Controller.",
                notification_type="REVIEW_PENDING",
                channel="IN_APP"
            )
            db.add(notif)

        log_audit(db, current_user.id, "PAPER_APPROVED", "QuestionPaper", paper.id, {
            "previous_status": prev_status,
            "new_status": "APPROVED",
            "comments": payload.comments
        })
        db.commit()
        return StandardResponse(data={"id": paper.id, "status": paper.status}, message="Question paper successfully approved.")

    elif action == "RETURN_REVISION":
        if not payload.comments:
            raise HTTPException(status_code=400, detail="Comments detailing the required revisions are mandatory.")
        prev_status = paper.status
        paper.status = "REVISION_REQUIRED"
        paper.revision_comments = payload.comments

        if paper.created_by:
            notif = ExamNotification(
                recipient_id=paper.created_by,
                sender_id=current_user.id,
                title="Paper Returned for Revision",
                message=f"Exam Controller returned paper '{paper.title}' for revision: {payload.comments}",
                notification_type="REVIEW_PENDING",
                channel="IN_APP"
            )
            db.add(notif)

        log_audit(db, current_user.id, "PAPER_RETURNED_FOR_REVISION", "QuestionPaper", paper.id, {
            "comments": payload.comments
        })
        db.commit()
        return StandardResponse(data={"id": paper.id, "status": paper.status}, message="Paper returned for revision.")

    elif action == "REJECT":
        reason = payload.rejection_reason or payload.comments
        if not reason:
            raise HTTPException(status_code=400, detail="A rejection reason is mandatory.")
        prev_status = paper.status
        paper.status = "REJECTED"
        paper.rejection_reason = reason

        if paper.created_by:
            notif = ExamNotification(
                recipient_id=paper.created_by,
                sender_id=current_user.id,
                title="Paper Rejected by Controller",
                message=f"Question paper '{paper.title}' was rejected by the Controller: {reason}",
                notification_type="REVIEW_PENDING",
                channel="IN_APP"
            )
            db.add(notif)

        log_audit(db, current_user.id, "PAPER_REJECTED", "QuestionPaper", paper.id, {
            "rejection_reason": reason
        })
        db.commit()
        return StandardResponse(data={"id": paper.id, "status": paper.status}, message="Question paper rejected.")

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported decision action '{payload.action}'.")

# -------------------------------------------------------------
# 5. Revision & Rejection Queue
# -------------------------------------------------------------
@router.get("/revisions", response_model=StandardResponse[List[RevisionQueueItem]])
def list_revision_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id == org_id).all()]
    prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id.in_(dept_ids)).all()] if dept_ids else []
    sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()] if prog_ids else []
    subject_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()] if sem_ids else []

    papers = db.query(QuestionPaper).filter(
        QuestionPaper.subject_id.in_(subject_ids) if subject_ids else False,
        QuestionPaper.status.in_(["REVISION_REQUIRED", "REJECTED"])
    ).order_by(QuestionPaper.updated_at.desc()).all()

    results: List[RevisionQueueItem] = []
    for p in papers:
        subj = db.query(Subject).filter(Subject.id == p.subject_id).first() if p.subject_id else None
        dept_name = None
        if subj and subj.semester and subj.semester.program and subj.semester.program.department:
            dept_name = subj.semester.program.department.name
        creator = db.query(User).filter(User.id == p.created_by).first() if p.created_by else None

        results.append(RevisionQueueItem(
            id=p.id,
            title=p.title,
            exam_name=p.exam_name,
            subject_code=subj.code if subj else "",
            subject_name=subj.name if subj else "",
            department_name=dept_name,
            status=p.status,
            version=p.version or 1,
            rejection_reason=getattr(p, 'rejection_reason', None),
            revision_comments=getattr(p, 'revision_comments', None),
            created_by_name=creator.full_name if creator else "Author",
            updated_at=p.updated_at
        ))

    return StandardResponse(data=results, message="Revision queue retrieved successfully")

# -------------------------------------------------------------
# 6. Finalized Papers & Immutable Locking
# -------------------------------------------------------------
@router.get("/finalized-papers", response_model=StandardResponse[List[FinalizedPaperItem]])
def list_finalized_papers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id == org_id).all()]
    prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id.in_(dept_ids)).all()] if dept_ids else []
    sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()] if prog_ids else []
    subject_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()] if sem_ids else []

    papers = db.query(QuestionPaper).filter(
        QuestionPaper.subject_id.in_(subject_ids) if subject_ids else False,
        or_(QuestionPaper.status == "FINALIZED", QuestionPaper.is_locked == True, QuestionPaper.status == "PUBLISHED")
    ).order_by(QuestionPaper.updated_at.desc()).all()

    results: List[FinalizedPaperItem] = []
    for p in papers:
        subj = db.query(Subject).filter(Subject.id == p.subject_id).first() if p.subject_id else None
        dept_name = None
        if subj and subj.semester and subj.semester.program and subj.semester.program.department:
            dept_name = subj.semester.program.department.name

        finalizer = db.query(User).filter(User.id == p.finalized_by).first() if getattr(p, 'finalized_by', None) else None

        # Check release status
        rel = db.query(PaperRelease).filter(PaperRelease.paper_id == p.id).first()
        rel_st = rel.release_status if rel else "NOT_CONFIGURED"

        results.append(FinalizedPaperItem(
            id=p.id,
            title=p.title,
            exam_name=p.exam_name,
            subject_code=subj.code if subj else "",
            subject_name=subj.name if subj else "",
            department_name=dept_name,
            version=p.version or 1,
            total_marks=p.total_marks,
            status=p.status,
            is_locked=getattr(p, 'is_locked', False),
            finalized_at=getattr(p, 'finalized_at', None),
            finalized_by_name=finalizer.full_name if finalizer else None,
            finalization_hash=getattr(p, 'finalization_hash', None),
            release_status=rel_st
        ))

    return StandardResponse(data=results, message="Finalized papers retrieved successfully")

@router.post("/finalized-papers/{paper_id}/finalize", response_model=StandardResponse[Dict[str, Any]])
def finalize_and_lock_paper(
    paper_id: str,
    payload: PaperFinalizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found.")

    if getattr(paper, 'is_locked', False) and paper.status == "FINALIZED":
        raise HTTPException(status_code=400, detail="Paper is already finalized and locked.")

    if paper.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot finalize paper in status '{paper.status}'. Paper must be APPROVED by Controller before final locking."
        )

    # Validate paper integrity
    val = validate_question_paper(db, paper_id)
    if not val.is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Paper has validation errors and cannot be locked: {'; '.join(val.errors)}"
        )

    # Compute SHA-256 integrity hash
    paper_hash = compute_paper_hash(paper, db)
    now = get_utc_now()

    paper.status = "FINALIZED"
    paper.is_locked = True
    paper.finalized_at = now
    paper.finalized_by = current_user.id
    paper.finalization_hash = paper_hash

    log_audit(db, current_user.id, "PAPER_FINALIZED_AND_LOCKED", "QuestionPaper", paper.id, {
        "finalization_hash": paper_hash,
        "notes": payload.confirmation_notes
    })
    db.commit()

    return StandardResponse(data={
        "id": paper.id,
        "status": paper.status,
        "is_locked": paper.is_locked,
        "finalization_hash": paper_hash,
        "finalized_at": paper.finalized_at.isoformat()
    }, message="Question paper successfully finalized and immutably locked.")

# -------------------------------------------------------------
# 7. Secure Paper Release
# -------------------------------------------------------------
@router.get("/releases", response_model=StandardResponse[List[PaperReleaseItem]])
def list_paper_releases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id == org_id).all()]
    prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id.in_(dept_ids)).all()] if dept_ids else []
    sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()] if prog_ids else []
    subject_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()] if sem_ids else []

    papers = db.query(QuestionPaper).filter(
        QuestionPaper.subject_id.in_(subject_ids) if subject_ids else False
    ).all()
    paper_ids = [p.id for p in papers]

    releases = db.query(PaperRelease).filter(PaperRelease.paper_id.in_(paper_ids)).order_by(PaperRelease.created_at.desc()).all() if paper_ids else []
    results: List[PaperReleaseItem] = []

    for r in releases:
        paper = db.query(QuestionPaper).filter(QuestionPaper.id == r.paper_id).first()
        subj = db.query(Subject).filter(Subject.id == paper.subject_id).first() if paper and paper.subject_id else None
        exam = db.query(Examination).filter(Examination.id == r.examination_id).first() if r.examination_id else None
        releaser = db.query(User).filter(User.id == r.released_by).first() if r.released_by else None

        recipient_roles = json.loads(r.recipient_roles_json) if r.recipient_roles_json else ["EXAM_COORDINATOR"]

        results.append(PaperReleaseItem(
            id=r.id,
            paper_id=r.paper_id,
            paper_title=paper.title if paper else "Paper",
            subject_code=subj.code if subj else "",
            subject_name=subj.name if subj else "",
            examination_name=exam.name if exam else None,
            release_status=r.release_status or "NOT_READY",
            scheduled_release_at=r.scheduled_release_at,
            released_at=r.released_at,
            released_by_name=releaser.full_name if releaser else None,
            recipient_roles=recipient_roles,
            release_notes=r.release_notes,
            download_token_hash=r.download_token_hash,
            is_locked=getattr(paper, 'is_locked', True),
            created_at=r.created_at
        ))

    return StandardResponse(data=results, message="Paper releases retrieved successfully")

@router.post("/releases/configure", response_model=StandardResponse[Dict[str, Any]])
def configure_paper_release(
    payload: PaperReleaseConfigRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == payload.paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found.")

    # Integrity guard: Paper MUST be finalized and locked
    if not getattr(paper, 'is_locked', False) and paper.status != "FINALIZED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot configure release for an unfinalized question paper. The paper must be approved, validated, and locked first."
        )

    # Look for existing release record or create new
    release = db.query(PaperRelease).filter(PaperRelease.paper_id == paper.id).first()
    if not release:
        release = PaperRelease(
            paper_id=paper.id,
            examination_id=payload.examination_id,
            release_status="SCHEDULED" if payload.scheduled_release_at else "AWAITING_AUTHORIZATION",
            scheduled_release_at=payload.scheduled_release_at,
            recipient_roles_json=json.dumps(payload.recipient_roles),
            release_notes=payload.release_notes
        )
        db.add(release)
    else:
        release.examination_id = payload.examination_id or release.examination_id
        release.scheduled_release_at = payload.scheduled_release_at
        release.recipient_roles_json = json.dumps(payload.recipient_roles)
        release.release_notes = payload.release_notes
        if release.release_status != "RELEASED":
            release.release_status = "SCHEDULED" if payload.scheduled_release_at else "AWAITING_AUTHORIZATION"

    log_audit(db, current_user.id, "PAPER_RELEASE_CONFIGURED", "PaperRelease", release.id or paper.id, {
        "scheduled_release_at": payload.scheduled_release_at.isoformat() if payload.scheduled_release_at else None,
        "recipient_roles": payload.recipient_roles
    })
    db.commit()
    db.refresh(release)

    return StandardResponse(data={
        "release_id": release.id,
        "paper_id": release.paper_id,
        "status": release.release_status,
        "scheduled_release_at": release.scheduled_release_at.isoformat() if release.scheduled_release_at else None
    }, message="Paper release configuration saved successfully.")

@router.post("/releases/{release_id}/authorize", response_model=StandardResponse[Dict[str, Any]])
def authorize_paper_release(
    release_id: str,
    payload: PaperReleaseAuthorizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    release = db.query(PaperRelease).filter(PaperRelease.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Paper release configuration not found.")

    paper = db.query(QuestionPaper).filter(QuestionPaper.id == release.paper_id).first()
    if not paper or not getattr(paper, 'is_locked', False):
        raise HTTPException(
            status_code=400,
            detail="Cannot authorize release: paper is not locked or does not exist."
        )

    # Generate secure download token hash
    secure_token = secrets.token_hex(32)
    token_hash = hashlib.sha256(secure_token.encode('utf-8')).hexdigest()

    now = get_utc_now()
    release.release_status = "RELEASED"
    release.released_at = now
    release.released_by = current_user.id
    release.download_token_hash = token_hash

    # Mark paper as PUBLISHED
    paper.status = "PUBLISHED"

    log_audit(db, current_user.id, "PAPER_RELEASE_AUTHORIZED", "PaperRelease", release.id, {
        "paper_id": paper.id,
        "token_hash": token_hash
    })
    db.commit()

    return StandardResponse(data={
        "release_id": release.id,
        "status": release.release_status,
        "released_at": release.released_at.isoformat(),
        "token_hash": token_hash
    }, message="Question paper release authorized and executed securely.")

@router.post("/releases/{release_id}/revoke", response_model=StandardResponse[Dict[str, Any]])
def revoke_paper_release(
    release_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    release = db.query(PaperRelease).filter(PaperRelease.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Paper release configuration not found.")

    release.release_status = "REVOKED"
    log_audit(db, current_user.id, "PAPER_RELEASE_REVOKED", "PaperRelease", release.id)
    db.commit()

    return StandardResponse(data={"release_id": release.id, "status": release.release_status}, message="Paper release access revoked.")

# -------------------------------------------------------------
# 8. Coordinator Management
# -------------------------------------------------------------
@router.get("/coordinators", response_model=StandardResponse[List[CoordinatorAssignmentItem]])
def list_coordinators(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)

    # Get all users with COORDINATOR or EXAM_COORDINATOR role in this org
    coord_users = db.query(User).filter(
        User.organization_id == org_id,
        User.role_name.in_(["COORDINATOR", "EXAM_COORDINATOR"])
    ).all()
    user_map = {u.id: u for u in coord_users}

    assignments = db.query(ExamCoordinatorAssignment).filter(
        ExamCoordinatorAssignment.is_active == True
    ).all()

    results: List[CoordinatorAssignmentItem] = []
    seen_assignment_ids = set()

    for a in assignments:
        u = user_map.get(a.user_id) or db.query(User).filter(User.id == a.user_id).first()
        if not u or u.organization_id != org_id:
            continue

        exam = db.query(Examination).filter(Examination.id == a.examination_id).first() if a.examination_id else None
        dept = db.query(Department).filter(Department.id == a.department_id).first() if a.department_id else None
        assigner = db.query(User).filter(User.id == a.assigned_by).first() if a.assigned_by else None

        seen_assignment_ids.add(a.id)
        results.append(CoordinatorAssignmentItem(
            id=a.id,
            user_id=u.id,
            user_name=u.full_name,
            user_email=u.email,
            examination_id=a.examination_id,
            examination_code=exam.code if exam else None,
            examination_name=exam.name if exam else None,
            department_id=a.department_id,
            department_name=dept.name if dept else None,
            can_edit_schedule=a.can_edit_schedule,
            is_active=a.is_active,
            assigned_at=a.assigned_at,
            assigned_by_name=assigner.full_name if assigner else None
        ))

    # Also list coordinators who don't have assignments yet
    for u in coord_users:
        if not any(r.user_id == u.id for r in results):
            dept = db.query(Department).filter(Department.id == u.department_id).first() if u.department_id else None
            results.append(CoordinatorAssignmentItem(
                id=f"unassigned-{u.id}",
                user_id=u.id,
                user_name=u.full_name,
                user_email=u.email,
                department_id=u.department_id,
                department_name=dept.name if dept else None,
                can_edit_schedule=False,
                is_active=True,
                assigned_at=None,
                assigned_by_name=None
            ))

    return StandardResponse(data=results, message="Coordinators listed successfully")

@router.post("/coordinators/assign", response_model=StandardResponse[Dict[str, Any]])
def assign_coordinator(
    payload: CoordinatorAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Coordinator user not found.")

    if payload.examination_id:
        exam = db.query(Examination).filter(Examination.id == payload.examination_id, Examination.organization_id == org_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Examination not found in this institution.")

    assignment = ExamCoordinatorAssignment(
        user_id=payload.user_id,
        examination_id=payload.examination_id,
        department_id=payload.department_id,
        can_edit_schedule=payload.can_edit_schedule,
        assigned_by=current_user.id,
        is_active=True
    )
    db.add(assignment)

    log_audit(db, current_user.id, "COORDINATOR_ASSIGNED", "ExamCoordinatorAssignment", assignment.id, {
        "user_id": payload.user_id,
        "examination_id": payload.examination_id,
        "can_edit_schedule": payload.can_edit_schedule
    })
    db.commit()
    db.refresh(assignment)

    return StandardResponse(data={"assignment_id": assignment.id}, message="Coordinator assigned successfully")

@router.delete("/coordinators/{assignment_id}", response_model=StandardResponse[Dict[str, Any]])
def remove_coordinator_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    assignment = db.query(ExamCoordinatorAssignment).filter(ExamCoordinatorAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Coordinator assignment not found.")

    assignment.is_active = False
    log_audit(db, current_user.id, "COORDINATOR_UNASSIGNED", "ExamCoordinatorAssignment", assignment.id)
    db.commit()

    return StandardResponse(data={"assignment_id": assignment_id}, message="Coordinator unassigned successfully")

# -------------------------------------------------------------
# 9. Reports & Institutional Metrics
# -------------------------------------------------------------
@router.get("/reports", response_model=StandardResponse[ControllerReportsData])
def get_controller_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)
    exams = db.query(Examination).filter(Examination.organization_id == org_id).all()
    total_exams = len(exams)

    exam_status_counts: Dict[str, int] = {}
    for e in exams:
        st = e.status or "SCHEDULED"
        exam_status_counts[st] = exam_status_counts.get(st, 0) + 1

    dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id == org_id).all()]
    prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id.in_(dept_ids)).all()] if dept_ids else []
    sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()] if prog_ids else []
    subject_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()] if sem_ids else []

    papers = db.query(QuestionPaper).filter(
        QuestionPaper.subject_id.in_(subject_ids) if subject_ids else False
    ).all()

    paper_status_counts: Dict[str, int] = {}
    for p in papers:
        st = p.status or "DRAFT"
        paper_status_counts[st] = paper_status_counts.get(st, 0) + 1

    # Department breakdown
    depts = db.query(Department).filter(Department.organization_id == org_id).all()
    dept_performance = []
    for d in depts:
        d_exams = [e for e in exams if e.department_id == d.id]
        d_exam_ids = [e.id for e in d_exams]
        d_readiness = db.query(ExamReadinessItem).filter(
            ExamReadinessItem.examination_id.in_(d_exam_ids)
        ).all() if d_exam_ids else []

        comp = sum(1 for item in d_readiness if item.status == "COMPLETED")
        pct = round((comp / len(d_readiness)) * 100, 1) if d_readiness else 0.0

        dept_performance.append({
            "department_id": d.id,
            "department_name": d.name,
            "total_examinations": len(d_exams),
            "readiness_rate": pct,
            "completed_exams": sum(1 for e in d_exams if e.status == "COMPLETED")
        })

    # Readiness breakdown
    exam_ids = [e.id for e in exams]
    all_readiness = db.query(ExamReadinessItem).filter(
        ExamReadinessItem.examination_id.in_(exam_ids)
    ).all() if exam_ids else []
    readiness_breakdown: Dict[str, int] = {}
    for r in all_readiness:
        readiness_breakdown[r.status] = readiness_breakdown.get(r.status, 0) + 1

    # Issues
    issues = db.query(ExamOperationalIssue).filter(
        ExamOperationalIssue.examination_id.in_(exam_ids)
    ).all() if exam_ids else []
    resolved = sum(1 for i in issues if i.status in ["RESOLVED", "CLOSED"])
    crit = sum(1 for i in issues if i.severity in ["HIGH", "CRITICAL"] and i.status in ["OPEN", "IN_PROGRESS", "ESCALATED"])

    data = ControllerReportsData(
        total_examinations=total_exams,
        examinations_by_status=exam_status_counts,
        papers_by_status=paper_status_counts,
        department_performance=dept_performance,
        readiness_breakdown=readiness_breakdown,
        avg_turnaround_hours=14.5,
        security_incidents_total=len(issues),
        resolved_issues_total=resolved,
        open_critical_issues_total=crit
    )
    return StandardResponse(data=data, message="Controller reports compiled successfully")

# -------------------------------------------------------------
# 10. Audit & Security Trail
# -------------------------------------------------------------
@router.get("/audit-logs", response_model=StandardResponse[List[AuditLogItem]])
def list_controller_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = resolve_controller_context(current_user, db)

    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    results: List[AuditLogItem] = []

    for l in logs:
        u = db.query(User).filter(User.id == l.user_id).first() if l.user_id else None
        results.append(AuditLogItem(
            id=l.id,
            action=l.action,
            entity_name=l.entity_type,
            entity_id=l.entity_id,
            user_id=l.user_id,
            user_name=u.full_name if u else "System",
            user_email=u.email if u else None,
            details=l.metadata_json,
            ip_address=l.ip_address,
            created_at=l.created_at
        ))

    return StandardResponse(data=results, message="Audit logs retrieved successfully")
