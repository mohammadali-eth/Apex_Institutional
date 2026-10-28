import json
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
    QuestionPaper, FacultyAssignment, AuditLog, Organization
)
from app.schemas.common import StandardResponse
from app.schemas.coordinator import (
    CoordinatorDashboardStats, ExaminationItem, ExaminationDetail,
    ScheduleItem, ScheduleUpdateRequest, ScheduleConflictCheckRequest, ConflictReport,
    PaperTrackingItem, FacultyCoordinationItem, ReadinessItemSchema, ReadinessItemUpdateRequest,
    IssueItem, IssueCreateRequest, IssueEscalateRequest, IssueUpdateRequest,
    NotificationItem, ReminderSendRequest, CoordinatorReportsData
)
from app.api.v1.auth import get_current_user
from app.core.permissions import RoleEnum

router = APIRouter(prefix="/coordinator", tags=["Exam Coordinator"])

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

def resolve_coordinator_context(user: User, db: Session):
    """
    Derives authorized examination scope strictly from persisted assignments and user scope.
    An Exam Coordinator only accesses examinations explicitly assigned to them,
    or belonging to departments explicitly assigned to them.
    Super Admins, University Admins, and Exam Controllers have elevated scope.
    """
    user_role = (user.role_name or "").upper()
    is_admin = user_role in [RoleEnum.SUPER_ADMIN, RoleEnum.UNIVERSITY_ADMIN, RoleEnum.EXAM_CONTROLLER]

    # Query active coordinator assignments
    assignments = db.query(ExamCoordinatorAssignment).filter(
        ExamCoordinatorAssignment.user_id == user.id,
        ExamCoordinatorAssignment.is_active == True
    ).all()

    assigned_exam_ids = set()
    assigned_dept_ids = set()

    for a in assignments:
        if a.examination_id:
            assigned_exam_ids.add(a.examination_id)
        if a.department_id:
            assigned_dept_ids.add(a.department_id)

    # If user has department_id on profile and role is coordinator, also include it
    if user.department_id and (user_role in ["COORDINATOR", "EXAM_COORDINATOR"]):
        assigned_dept_ids.add(user.department_id)

    # If coordinator has department-level assignments, fetch all exams in those departments
    if assigned_dept_ids:
        dept_exams = db.query(Examination.id).filter(
            Examination.department_id.in_(list(assigned_dept_ids))
        ).all()
        for de in dept_exams:
            assigned_exam_ids.add(de[0])

    # If user is elevated admin/controller, allow access to all exams in their organization
    if is_admin:
        if user.organization_id:
            all_org_exams = db.query(Examination.id).filter(
                Examination.organization_id == user.organization_id
            ).all()
            assigned_exam_ids = {e[0] for e in all_org_exams}
        else:
            all_exams = db.query(Examination.id).all()
            assigned_exam_ids = {e[0] for e in all_exams}

    return assignments, list(assigned_exam_ids)

# ---------------------------------------------------------
# Screen 1: Exam Coordinator Dashboard Overview
# ---------------------------------------------------------
@router.get("/dashboard", response_model=StandardResponse[CoordinatorDashboardStats])
def get_coordinator_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignments, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    now = get_utc_now()

    if not assigned_exam_ids:
        return StandardResponse(
            data=CoordinatorDashboardStats(),
            message="No examinations assigned to this coordinator yet."
        )

    # 1. Examination KPIs
    exams = db.query(Examination).filter(Examination.id.in_(assigned_exam_ids)).all()
    total_exams = len(exams)

    upcoming_exams = sum(1 for e in exams if e.start_time and e.start_time > now and e.status != "CANCELLED")
    in_progress_exams = sum(1 for e in exams if (e.status == "IN_PROGRESS") or (e.start_time and e.end_time and e.start_time <= now <= e.end_time))
    completed_exams = sum(1 for e in exams if e.status == "COMPLETED" or (e.end_time and e.end_time < now))

    # 2. Paper Tracking KPIs for subjects linked to assigned exams
    subject_ids = [e.subject_id for e in exams if e.subject_id]
    papers = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(subject_ids)).all() if subject_ids else []

    papers_awaiting_sub = 0
    papers_pending_rev = 0
    papers_awaiting_app = 0
    papers_ready = 0
    overdue_subs = 0

    # Map paper by subject_id
    paper_map: Dict[str, QuestionPaper] = {}
    for p in papers:
        # Keep latest or approved
        if p.subject_id not in paper_map or p.status in ["APPROVED", "PUBLISHED"]:
            paper_map[p.subject_id] = p

    for e in exams:
        p = paper_map.get(e.subject_id)
        if not p or p.status in ["DRAFT", "NOT_STARTED"]:
            papers_awaiting_sub += 1
        elif p.status in ["SUBMITTED", "UNDER_REVIEW", "IN_REVIEW"]:
            papers_pending_rev += 1
        elif p.status in ["REVIEWED"]:
            papers_awaiting_app += 1
        elif p.status in ["APPROVED", "PUBLISHED"]:
            papers_ready += 1

        # Check overdue
        if e.paper_submission_deadline and e.paper_submission_deadline < now:
            if not p or p.status not in ["APPROVED", "PUBLISHED"]:
                overdue_subs += 1

    # 3. Readiness and Issues KPIs
    checklist_items = db.query(ExamReadinessItem).filter(
        ExamReadinessItem.examination_id.in_(assigned_exam_ids)
    ).all()
    incomplete_checklists = sum(1 for item in checklist_items if item.is_required and item.status not in ["COMPLETED", "NOT_APPLICABLE"])

    issues = db.query(ExamOperationalIssue).filter(
        ExamOperationalIssue.examination_id.in_(assigned_exam_ids)
    ).all()
    open_issues = sum(1 for i in issues if i.status in ["OPEN", "IN_PROGRESS", "ESCALATED"])
    critical_escalations = sum(1 for i in issues if i.severity == "CRITICAL" or i.status == "ESCALATED")

    # 4. Recent Notifications
    notifs = db.query(ExamNotification).filter(
        ExamNotification.recipient_id == current_user.id
    ).order_by(ExamNotification.created_at.desc()).limit(5).all()

    recent_notifications_data = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.notification_type,
            "channel": n.channel,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None
        }
        for n in notifs
    ]

    # 5. Recent Activity
    recent_activity_data = [
        {
            "id": i.id,
            "title": i.title,
            "type": f"Issue ({i.category})",
            "status": i.status,
            "severity": i.severity,
            "created_at": i.created_at.isoformat() if i.created_at else None
        }
        for i in issues[:5]
    ]

    stats = CoordinatorDashboardStats(
        total_assigned_exams=total_exams,
        upcoming_exams=upcoming_exams,
        in_progress_exams=in_progress_exams,
        completed_exams=completed_exams,
        papers_awaiting_submission=papers_awaiting_sub,
        papers_pending_review=papers_pending_rev,
        papers_awaiting_approval=papers_awaiting_app,
        papers_ready=papers_ready,
        overdue_submissions=overdue_subs,
        incomplete_checklists=incomplete_checklists,
        open_issues=open_issues,
        critical_escalations=critical_escalations,
        recent_activity=recent_activity_data,
        recent_notifications=recent_notifications_data
    )

    return StandardResponse(data=stats, message="Coordinator dashboard statistics retrieved")

# ---------------------------------------------------------
# Screen 2: Assigned Examinations List & Detail
# ---------------------------------------------------------
@router.get("/examinations", response_model=StandardResponse[List[ExaminationItem]])
def get_assigned_examinations(
    department_id: Optional[str] = Query(None),
    program_id: Optional[str] = Query(None),
    semester_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignments, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    if not assigned_exam_ids:
        return StandardResponse(data=[], message="No examinations assigned.")

    query = db.query(Examination).filter(Examination.id.in_(assigned_exam_ids))

    if department_id:
        query = query.filter(Examination.department_id == department_id)
    if program_id:
        query = query.filter(Examination.program_id == program_id)
    if semester_id:
        query = query.filter(Examination.semester_id == semester_id)
    if status_filter:
        query = query.filter(Examination.status == status_filter)
    if search:
        s = f"%{search}%"
        query = query.filter(or_(Examination.name.ilike(s), Examination.code.ilike(s)))

    exams = query.order_by(Examination.start_time.asc().nullslast()).all()
    now = get_utc_now()

    # Pre-fetch can_edit map
    can_edit_map = {a.examination_id: a.can_edit_schedule for a in assignments if a.examination_id}
    # Pre-fetch readiness
    readiness_map: Dict[str, Dict[str, Any]] = {}
    readiness_items = db.query(ExamReadinessItem).filter(
        ExamReadinessItem.examination_id.in_(assigned_exam_ids)
    ).all()
    for item in readiness_items:
        if item.examination_id not in readiness_map:
            readiness_map[item.examination_id] = {"total_req": 0, "completed_req": 0, "has_blocked": False}
        if item.is_required:
            readiness_map[item.examination_id]["total_req"] += 1
            if item.status == "COMPLETED":
                readiness_map[item.examination_id]["completed_req"] += 1
            elif item.status == "BLOCKED":
                readiness_map[item.examination_id]["has_blocked"] = True

    # Pre-fetch papers
    subject_ids = [e.subject_id for e in exams if e.subject_id]
    papers = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(subject_ids)).all() if subject_ids else []
    paper_by_subject: Dict[str, QuestionPaper] = {}
    for p in papers:
        paper_by_subject[p.subject_id] = p

    results: List[ExaminationItem] = []
    for e in exams:
        can_edit = can_edit_map.get(e.id, False) or (current_user.role_name in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "EXAM_CONTROLLER"])
        
        # Calculate readiness
        r_info = readiness_map.get(e.id, {"total_req": 0, "completed_req": 0, "has_blocked": False})
        pct = (r_info["completed_req"] / r_info["total_req"] * 100) if r_info["total_req"] > 0 else 0.0
        r_status = "READY" if (pct == 100.0 and not r_info["has_blocked"]) else ("BLOCKED" if r_info["has_blocked"] else "PENDING")

        # Linked paper
        p = paper_by_subject.get(e.subject_id)
        p_status = p.status if p else "NOT_STARTED"
        p_id = p.id if p else None

        days_rem = (e.start_time - now).days if e.start_time and e.start_time > now else (0 if e.start_time else None)

        results.append(ExaminationItem(
            id=e.id,
            code=e.code,
            name=e.name,
            exam_type=e.exam_type,
            organization_id=e.organization_id,
            department_id=e.department_id,
            department_name=e.department.name if e.department else None,
            program_id=e.program_id,
            program_name=e.program.name if e.program else None,
            semester_id=e.semester_id,
            semester_name=e.semester.name if e.semester else None,
            subject_id=e.subject_id,
            subject_code=e.subject.code if e.subject else None,
            subject_name=e.subject.name if e.subject else None,
            start_time=e.start_time,
            end_time=e.end_time,
            duration_minutes=e.duration_minutes,
            total_marks=e.total_marks,
            venue=e.venue,
            paper_submission_deadline=e.paper_submission_deadline,
            status=e.status,
            can_edit_schedule=can_edit,
            readiness_percentage=round(pct, 1),
            readiness_status=r_status,
            paper_status=p_status,
            paper_id=p_id,
            faculty_name=p.creator.full_name if (p and p.creator) else None,
            days_remaining=days_rem
        ))

    return StandardResponse(data=results, message="Assigned examinations retrieved")

@router.get("/examinations/{exam_id}", response_model=StandardResponse[ExaminationDetail])
def get_examination_detail(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignments, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    if exam_id not in assigned_exam_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You are not assigned to this examination."
        )

    e = db.query(Examination).filter(Examination.id == exam_id).first()
    if not e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Examination not found.")

    now = get_utc_now()
    can_edit = any(a.can_edit_schedule for a in assignments if a.examination_id == e.id) or (
        current_user.role_name in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "EXAM_CONTROLLER"]
    )

    r_items = db.query(ExamReadinessItem).filter(ExamReadinessItem.examination_id == e.id).all()
    req_items = [i for i in r_items if i.is_required]
    completed_req = [i for i in req_items if i.status == "COMPLETED"]
    pct = (len(completed_req) / len(req_items) * 100) if req_items else 0.0
    has_blocked = any(i.status == "BLOCKED" for i in req_items)
    r_status = "READY" if (pct == 100.0 and not has_blocked) else ("BLOCKED" if has_blocked else "PENDING")

    p = db.query(QuestionPaper).filter(QuestionPaper.subject_id == e.subject_id).order_by(QuestionPaper.created_at.desc()).first() if e.subject_id else None
    days_rem = (e.start_time - now).days if e.start_time and e.start_time > now else None

    # Coordinators assigned
    coord_assigns = db.query(ExamCoordinatorAssignment).filter(
        ExamCoordinatorAssignment.examination_id == e.id
    ).all()
    coord_list = [
        {"user_id": ca.user_id, "name": ca.user.full_name if ca.user else "", "can_edit": ca.can_edit_schedule}
        for ca in coord_assigns
    ]

    detail = ExaminationDetail(
        id=e.id,
        code=e.code,
        name=e.name,
        exam_type=e.exam_type,
        organization_id=e.organization_id,
        department_id=e.department_id,
        department_name=e.department.name if e.department else None,
        program_id=e.program_id,
        program_name=e.program.name if e.program else None,
        semester_id=e.semester_id,
        semester_name=e.semester.name if e.semester else None,
        subject_id=e.subject_id,
        subject_code=e.subject.code if e.subject else None,
        subject_name=e.subject.name if e.subject else None,
        start_time=e.start_time,
        end_time=e.end_time,
        duration_minutes=e.duration_minutes,
        total_marks=e.total_marks,
        venue=e.venue,
        paper_submission_deadline=e.paper_submission_deadline,
        status=e.status,
        can_edit_schedule=can_edit,
        readiness_percentage=round(pct, 1),
        readiness_status=r_status,
        paper_status=p.status if p else "NOT_STARTED",
        paper_id=p.id if p else None,
        faculty_name=p.creator.full_name if (p and p.creator) else None,
        days_remaining=days_rem,
        academic_year_name=e.academic_year.name if e.academic_year else None,
        assigned_coordinators=coord_list,
        readiness_summary={
            "total_items": len(r_items),
            "completed": len([i for i in r_items if i.status == "COMPLETED"]),
            "blocked": len([i for i in r_items if i.status == "BLOCKED"]),
            "pending": len([i for i in r_items if i.status in ["NOT_STARTED", "IN_PROGRESS"]])
        }
    )

    return StandardResponse(data=detail, message="Examination detail retrieved")

# ---------------------------------------------------------
# Screen 3: Exam Schedule & Timetable Coordination
# ---------------------------------------------------------
@router.get("/schedule", response_model=StandardResponse[List[ScheduleItem]])
def get_coordinator_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignments, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    if not assigned_exam_ids:
        return StandardResponse(data=[], message="No scheduled examinations assigned.")

    exams = db.query(Examination).filter(
        Examination.id.in_(assigned_exam_ids)
    ).order_by(Examination.start_time.asc().nullslast()).all()

    can_edit_map = {a.examination_id: a.can_edit_schedule for a in assignments if a.examination_id}
    is_elevated = current_user.role_name in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "EXAM_CONTROLLER"]

    results: List[ScheduleItem] = []
    for e in exams:
        can_edit = can_edit_map.get(e.id, False) or is_elevated
        results.append(ScheduleItem(
            id=e.id,
            examination_id=e.id,
            code=e.code,
            name=e.name,
            subject_code=e.subject.code if e.subject else "",
            subject_name=e.subject.name if e.subject else "",
            program_name=e.program.name if e.program else "",
            semester_name=e.semester.name if e.semester else "",
            start_time=e.start_time,
            end_time=e.end_time,
            duration_minutes=e.duration_minutes,
            venue=e.venue,
            paper_deadline=e.paper_submission_deadline,
            status=e.status,
            can_edit=can_edit
        ))

    return StandardResponse(data=results, message="Examination schedule retrieved")

@router.post("/schedule/validate-conflicts", response_model=StandardResponse[ConflictReport])
def validate_schedule_conflicts(
    payload: ScheduleConflictCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Conflict detection engine checking:
    1. Overlapping examinations for the same student cohort (same program + semester)
    2. Double-booking of the same examination room/venue
    3. Duplicate subject scheduled on same calendar day
    """
    _, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    exam = db.query(Examination).filter(Examination.id == payload.examination_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    conflicts: List[Dict[str, Any]] = []

    # 1. Cohort Overlap (Same program and semester)
    if exam.program_id and exam.semester_id:
        cohort_overlaps = db.query(Examination).filter(
            Examination.id != payload.examination_id,
            Examination.program_id == exam.program_id,
            Examination.semester_id == exam.semester_id,
            Examination.status != "CANCELLED",
            Examination.start_time < payload.end_time,
            Examination.end_time > payload.start_time
        ).all()
        for o in cohort_overlaps:
            conflicts.append({
                "type": "COHORT_OVERLAP",
                "severity": "CRITICAL",
                "conflicting_exam_id": o.id,
                "conflicting_exam_name": o.name,
                "message": f"Student cohort collision: '{o.name}' is already scheduled between {o.start_time.strftime('%H:%M')} and {o.end_time.strftime('%H:%M')}."
            })

    # 2. Room / Venue Double Booking
    if payload.venue and payload.venue.strip():
        room_overlaps = db.query(Examination).filter(
            Examination.id != payload.examination_id,
            Examination.venue == payload.venue.strip(),
            Examination.status != "CANCELLED",
            Examination.start_time < payload.end_time,
            Examination.end_time > payload.start_time
        ).all()
        for r in room_overlaps:
            conflicts.append({
                "type": "ROOM_DOUBLE_BOOKED",
                "severity": "HIGH",
                "conflicting_exam_id": r.id,
                "conflicting_exam_name": r.name,
                "message": f"Venue collision: Room '{payload.venue}' is already booked for '{r.name}'."
            })

    return StandardResponse(
        data=ConflictReport(has_conflict=len(conflicts) > 0, conflicts=conflicts),
        message="Schedule conflict check completed"
    )

@router.put("/schedule/{exam_id}", response_model=StandardResponse[ScheduleItem])
def update_examination_schedule(
    exam_id: str,
    payload: ScheduleUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignments, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    if exam_id not in assigned_exam_ids:
        raise HTTPException(status_code=403, detail="Access forbidden: You are not assigned to this examination.")

    # Explicit permission check
    can_edit = any(a.can_edit_schedule for a in assignments if a.examination_id == exam_id) or (
        current_user.role_name in ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "EXAM_CONTROLLER"]
    )
    if not can_edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You do not have timetable edit permissions for this examination. Please request a change from the Exam Controller."
        )

    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=400, detail="Examination start time must precede end time.")

    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    # Record previous value for audit
    prev_val = {
        "start_time": exam.start_time.isoformat() if exam.start_time else None,
        "end_time": exam.end_time.isoformat() if exam.end_time else None,
        "venue": exam.venue,
        "duration_minutes": exam.duration_minutes
    }

    # Perform update
    exam.start_time = payload.start_time
    exam.end_time = payload.end_time
    if payload.venue is not None:
        exam.venue = payload.venue
    if payload.duration_minutes is not None:
        exam.duration_minutes = payload.duration_minutes
    exam.updated_at = get_utc_now()

    new_val = {
        "start_time": exam.start_time.isoformat(),
        "end_time": exam.end_time.isoformat(),
        "venue": exam.venue,
        "duration_minutes": exam.duration_minutes
    }

    # Create audit record
    audit_entry = ExamScheduleAudit(
        examination_id=exam.id,
        actor_id=current_user.id,
        action="SCHEDULE_UPDATED",
        previous_value_json=json.dumps(prev_val),
        new_value_json=json.dumps(new_val),
        reason=payload.reason
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(exam)

    return StandardResponse(
        data=ScheduleItem(
            id=exam.id,
            examination_id=exam.id,
            code=exam.code,
            name=exam.name,
            subject_code=exam.subject.code if exam.subject else "",
            subject_name=exam.subject.name if exam.subject else "",
            program_name=exam.program.name if exam.program else "",
            semester_name=exam.semester.name if exam.semester else "",
            start_time=exam.start_time,
            end_time=exam.end_time,
            duration_minutes=exam.duration_minutes,
            venue=exam.venue,
            paper_deadline=exam.paper_submission_deadline,
            status=exam.status,
            can_edit=True
        ),
        message="Examination timetable updated successfully."
    )

# ---------------------------------------------------------
# Screen 4: Question Paper Tracking
# ---------------------------------------------------------
@router.get("/papers", response_model=StandardResponse[List[PaperTrackingItem]])
def track_examination_papers(
    status_filter: Optional[str] = Query(None, alias="status"),
    overdue_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Monitors question paper preparation, review, and final readiness.
    Strictly safeguards confidential question content (does not expose questions/answers).
    """
    _, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    if not assigned_exam_ids:
        return StandardResponse(data=[], message="No examinations assigned.")

    exams = db.query(Examination).filter(Examination.id.in_(assigned_exam_ids)).all()
    subject_ids = [e.subject_id for e in exams if e.subject_id]

    papers = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(subject_ids)).all() if subject_ids else []
    paper_map: Dict[str, QuestionPaper] = {p.subject_id: p for p in papers}

    now = get_utc_now()
    results: List[PaperTrackingItem] = []

    for e in exams:
        p = paper_map.get(e.subject_id)
        p_status = p.status if p else "NOT_STARTED"
        review_st = "APPROVED" if (p and p.status in ["APPROVED", "PUBLISHED"]) else ("UNDER_REVIEW" if (p and p.status == "UNDER_REVIEW") else "PENDING")
        approval_st = "APPROVED" if (p and p.status in ["APPROVED", "PUBLISHED"]) else "PENDING"

        deadline = e.paper_submission_deadline
        is_overdue = bool(deadline and deadline < now and p_status not in ["APPROVED", "PUBLISHED"])
        days_rem = (deadline - now).days if deadline and deadline > now else (0 if deadline else None)

        if overdue_only and not is_overdue:
            continue
        if status_filter and p_status != status_filter:
            continue

        results.append(PaperTrackingItem(
            id=p.id if p else None,
            examination_id=e.id,
            exam_name=e.name,
            exam_code=e.code,
            subject_id=e.subject_id or "",
            subject_code=e.subject.code if e.subject else "",
            subject_name=e.subject.name if e.subject else "",
            program_name=e.program.name if e.program else "",
            semester_name=e.semester.name if e.semester else "",
            faculty_id=p.creator.id if (p and p.creator) else None,
            faculty_name=p.creator.full_name if (p and p.creator) else "Unassigned",
            reviewer_name=p.reviewer.full_name if (p and p.reviewer) else None,
            submission_deadline=deadline,
            last_updated=p.updated_at if p else None,
            paper_status=p_status,
            review_status=review_st,
            approval_status=approval_st,
            is_overdue=is_overdue,
            days_remaining=days_rem,
            total_marks=p.total_marks if p else e.total_marks,
            version=p.version if p else 1
        ))

    return StandardResponse(data=results, message="Paper tracking data retrieved")

# ---------------------------------------------------------
# Screen 5: Faculty and Department Coordination
# ---------------------------------------------------------
@router.get("/faculty", response_model=StandardResponse[List[FacultyCoordinationItem]])
def get_faculty_coordination(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Displays Faculty members associated with the coordinator's assigned examinations.
    Does not expose unrelated Faculty data or allow unauthorized reassignments.
    """
    _, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    if not assigned_exam_ids:
        return StandardResponse(data=[], message="No examinations assigned.")

    exams = db.query(Examination).filter(Examination.id.in_(assigned_exam_ids)).all()
    subject_ids = [e.subject_id for e in exams if e.subject_id]

    if not subject_ids:
        return StandardResponse(data=[], message="No subjects associated with assigned exams.")

    # Faculty assigned to these subjects
    fa_records = db.query(FacultyAssignment).filter(
        FacultyAssignment.subject_id.in_(subject_ids)
    ).all()

    # Pre-fetch papers
    papers = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(subject_ids)).all()
    paper_map: Dict[str, QuestionPaper] = {p.subject_id: p for p in papers}

    results: List[FacultyCoordinationItem] = []
    seen = set()

    for fa in fa_records:
        user = fa.user
        subj = fa.subject
        if not user or not subj:
            continue

        # Link to matching exam
        matching_exam = next((e for e in exams if e.subject_id == subj.id), None)
        if not matching_exam:
            continue

        key = (user.id, matching_exam.id)
        if key in seen:
            continue
        seen.add(key)

        p = paper_map.get(subj.id)
        p_status = p.status if p else "NOT_STARTED"

        outstanding = []
        if p_status in ["NOT_STARTED", "DRAFT"]:
            outstanding.append("Draft question paper submission required")
        if p_status == "REVISION_REQUIRED":
            outstanding.append("Moderation feedback revisions required")

        results.append(FacultyCoordinationItem(
            faculty_id=user.id,
            faculty_name=user.full_name,
            faculty_email=user.email,
            department_name=user.department.name if user.department else (subj.department.name if subj.department else "General"),
            subject_id=subj.id,
            subject_code=subj.code,
            subject_name=subj.name,
            examination_id=matching_exam.id,
            exam_name=matching_exam.name,
            paper_deadline=matching_exam.paper_submission_deadline,
            paper_status=p_status,
            last_follow_up_date=None,
            outstanding_tasks=outstanding,
            notes=f"Assigned as primary instructor for {subj.code}."
        ))

    return StandardResponse(data=results, message="Faculty coordination roster retrieved")

# ---------------------------------------------------------
# Screen 6: Examination Readiness Checklist
# ---------------------------------------------------------
@router.get("/checklist", response_model=StandardResponse[List[ReadinessItemSchema]])
def get_readiness_checklist(
    examination_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    if not assigned_exam_ids:
        return StandardResponse(data=[], message="No examinations assigned.")

    query = db.query(ExamReadinessItem).filter(
        ExamReadinessItem.examination_id.in_(assigned_exam_ids)
    )

    if examination_id:
        if examination_id not in assigned_exam_ids:
            raise HTTPException(status_code=403, detail="Access forbidden: You are not assigned to this examination.")
        query = query.filter(ExamReadinessItem.examination_id == examination_id)

    if category:
        query = query.filter(ExamReadinessItem.category == category)

    items = query.order_by(ExamReadinessItem.category.asc(), ExamReadinessItem.title.asc()).all()

    results: List[ReadinessItemSchema] = []
    for it in items:
        results.append(ReadinessItemSchema(
            id=it.id,
            examination_id=it.examination_id,
            category=it.category,
            title=it.title,
            description=it.description,
            is_required=it.is_required,
            status=it.status,
            notes=it.notes,
            updated_by_name=it.updater.full_name if it.updater else None,
            updated_at=it.updated_at
        ))

    return StandardResponse(data=results, message="Readiness checklist items retrieved")

@router.put("/checklist/{item_id}", response_model=StandardResponse[ReadinessItemSchema])
def update_readiness_item(
    item_id: str,
    payload: ReadinessItemUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    item = db.query(ExamReadinessItem).filter(ExamReadinessItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found.")

    if item.examination_id not in assigned_exam_ids:
        raise HTTPException(status_code=403, detail="Access forbidden: You are not assigned to this examination.")

    allowed_statuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "BLOCKED", "NOT_APPLICABLE"]
    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {allowed_statuses}")

    # Validation: Prevent required question paper approval item from being marked complete if paper not approved in DB
    if payload.status == "COMPLETED" and "approval" in item.title.lower():
        exam = item.examination
        if exam and exam.subject_id:
            paper = db.query(QuestionPaper).filter(
                QuestionPaper.subject_id == exam.subject_id,
                QuestionPaper.status.in_(["APPROVED", "PUBLISHED"])
            ).first()
            if not paper:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot complete item: Official question paper has not yet been approved by the Exam Controller."
                )

    item.status = payload.status
    if payload.notes is not None:
        item.notes = payload.notes
    item.updated_by = current_user.id
    item.updated_at = get_utc_now()
    db.commit()
    db.refresh(item)

    return StandardResponse(
        data=ReadinessItemSchema(
            id=item.id,
            examination_id=item.examination_id,
            category=item.category,
            title=item.title,
            description=item.description,
            is_required=item.is_required,
            status=item.status,
            notes=item.notes,
            updated_by_name=current_user.full_name,
            updated_at=item.updated_at
        ),
        message="Readiness checklist item updated."
    )

# ---------------------------------------------------------
# Screen 7: Issues and Escalations
# ---------------------------------------------------------
@router.get("/issues", response_model=StandardResponse[List[IssueItem]])
def get_operational_issues(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity_filter: Optional[str] = Query(None, alias="severity"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    if not assigned_exam_ids:
        return StandardResponse(data=[], message="No examinations assigned.")

    query = db.query(ExamOperationalIssue).filter(
        ExamOperationalIssue.examination_id.in_(assigned_exam_ids)
    )

    if status_filter:
        query = query.filter(ExamOperationalIssue.status == status_filter)
    if severity_filter:
        query = query.filter(ExamOperationalIssue.severity == severity_filter)

    issues = query.order_by(ExamOperationalIssue.created_at.desc()).all()

    results: List[IssueItem] = []
    for i in issues:
        results.append(IssueItem(
            id=i.id,
            examination_id=i.examination_id,
            exam_name=i.examination.name if i.examination else "",
            subject_name=i.subject.name if i.subject else None,
            title=i.title,
            description=i.description,
            category=i.category,
            severity=i.severity,
            status=i.status,
            reported_by_name=i.reporter.full_name if i.reporter else None,
            assigned_to_name=i.assignee.full_name if i.assignee else None,
            is_escalated=i.is_escalated,
            escalated_to_name=i.escalated_user.full_name if i.escalated_user else None,
            escalation_reason=i.escalation_reason,
            escalated_at=i.escalated_at,
            resolution_notes=i.resolution_notes,
            resolved_at=i.resolved_at,
            created_at=i.created_at
        ))

    return StandardResponse(data=results, message="Operational issues retrieved")

@router.post("/issues", response_model=StandardResponse[IssueItem])
def report_operational_issue(
    payload: IssueCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    if payload.examination_id not in assigned_exam_ids:
        raise HTTPException(status_code=403, detail="Access forbidden: You are not assigned to this examination.")

    exam = db.query(Examination).filter(Examination.id == payload.examination_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    # Elevate security concerns
    severity = payload.severity
    if payload.category == "SECURITY_CONCERN":
        severity = "CRITICAL"

    issue = ExamOperationalIssue(
        examination_id=payload.examination_id,
        subject_id=payload.subject_id or exam.subject_id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        severity=severity,
        status="OPEN",
        reported_by=current_user.id,
        assigned_to=payload.assigned_to_id
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)

    return StandardResponse(
        data=IssueItem(
            id=issue.id,
            examination_id=issue.examination_id,
            exam_name=exam.name,
            subject_name=exam.subject.name if exam.subject else None,
            title=issue.title,
            description=issue.description,
            category=issue.category,
            severity=issue.severity,
            status=issue.status,
            reported_by_name=current_user.full_name,
            assigned_to_name=None,
            is_escalated=False,
            escalated_to_name=None,
            escalation_reason=None,
            escalated_at=None,
            resolution_notes=None,
            resolved_at=None,
            created_at=issue.created_at
        ),
        message="Operational issue reported successfully."
    )

@router.post("/issues/{issue_id}/escalate", response_model=StandardResponse[IssueItem])
def escalate_issue_to_controller(
    issue_id: str,
    payload: IssueEscalateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Escalates an unresolved or critical operational issue directly to the Exam Controller.
    Dispatches a high-priority in-app notification.
    """
    _, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    issue = db.query(ExamOperationalIssue).filter(ExamOperationalIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")

    if issue.examination_id not in assigned_exam_ids:
        raise HTTPException(status_code=403, detail="Access forbidden: You are not assigned to this examination.")

    # Target Controller
    target_controller = None
    if payload.escalated_to_id:
        target_controller = db.query(User).filter(User.id == payload.escalated_to_id).first()
    if not target_controller:
        target_controller = db.query(User).filter(User.role_name == "EXAM_CONTROLLER").first()

    issue.is_escalated = True
    issue.status = "ESCALATED"
    issue.escalated_to = target_controller.id if target_controller else None
    issue.escalation_reason = payload.escalation_reason
    issue.escalated_at = get_utc_now()
    issue.updated_at = get_utc_now()

    # Create notification for controller
    if target_controller:
        notif = ExamNotification(
            recipient_id=target_controller.id,
            sender_id=current_user.id,
            examination_id=issue.examination_id,
            title=f"ESCALATION: {issue.title}",
            message=f"Exam Coordinator {current_user.full_name} has escalated an issue for {issue.examination.name if issue.examination else 'Examination'}: {payload.escalation_reason}",
            notification_type="ISSUE_ESCALATION",
            channel="IN_APP"
        )
        db.add(notif)

    db.commit()
    db.refresh(issue)

    return StandardResponse(
        data=IssueItem(
            id=issue.id,
            examination_id=issue.examination_id,
            exam_name=issue.examination.name if issue.examination else "",
            subject_name=issue.subject.name if issue.subject else None,
            title=issue.title,
            description=issue.description,
            category=issue.category,
            severity=issue.severity,
            status=issue.status,
            reported_by_name=issue.reporter.full_name if issue.reporter else None,
            assigned_to_name=issue.assignee.full_name if issue.assignee else None,
            is_escalated=True,
            escalated_to_name=target_controller.full_name if target_controller else "Exam Controller Office",
            escalation_reason=issue.escalation_reason,
            escalated_at=issue.escalated_at,
            resolution_notes=issue.resolution_notes,
            resolved_at=issue.resolved_at,
            created_at=issue.created_at
        ),
        message="Issue escalated successfully to Exam Controller."
    )

# ---------------------------------------------------------
# Screen 8: Notifications & Deadline Reminders
# ---------------------------------------------------------
@router.get("/notifications", response_model=StandardResponse[List[NotificationItem]])
def get_coordinator_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = db.query(ExamNotification).filter(
        ExamNotification.recipient_id == current_user.id
    ).order_by(ExamNotification.created_at.desc()).all()

    results: List[NotificationItem] = []
    for n in notifs:
        results.append(NotificationItem(
            id=n.id,
            recipient_id=n.recipient_id,
            sender_name=n.sender.full_name if n.sender else "QPMS Examination System",
            examination_id=n.examination_id,
            exam_name=n.examination.name if n.examination else None,
            title=n.title,
            message=n.message,
            notification_type=n.notification_type,
            channel=n.channel,
            is_read=n.is_read,
            created_at=n.created_at
        ))

    return StandardResponse(data=results, message="Notifications retrieved")

@router.put("/notifications/{notif_id}/read", response_model=StandardResponse[bool])
def mark_notification_read(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    n = db.query(ExamNotification).filter(
        ExamNotification.id == notif_id,
        ExamNotification.recipient_id == current_user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found.")

    n.is_read = True
    n.read_at = get_utc_now()
    db.commit()
    return StandardResponse(data=True, message="Notification marked as read")

@router.post("/notifications/remind", response_model=StandardResponse[NotificationItem])
def send_deadline_reminder(
    payload: ReminderSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sends an authorized reminder to assigned Faculty or department staff.
    Includes deduplication logic preventing duplicate reminders within a 2-hour window.
    Reports delivery channels accurately (IN_APP, with note on external email unavailability).
    """
    _, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    if payload.examination_id not in assigned_exam_ids:
        raise HTTPException(status_code=403, detail="Access forbidden: You are not assigned to this examination.")

    recipient = db.query(User).filter(User.id == payload.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient user not found.")

    exam = db.query(Examination).filter(Examination.id == payload.examination_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    # Deduplication check: Has a reminder been sent to recipient for this exam in last 2 hours?
    two_hours_ago = get_utc_now() - timedelta(hours=2)
    duplicate = db.query(ExamNotification).filter(
        ExamNotification.recipient_id == payload.recipient_id,
        ExamNotification.examination_id == payload.examination_id,
        ExamNotification.notification_type == payload.notification_type,
        ExamNotification.created_at >= two_hours_ago
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A reminder was already sent to this recipient for this examination within the last 2 hours. Please avoid duplicate notifications."
        )

    notif = ExamNotification(
        recipient_id=payload.recipient_id,
        sender_id=current_user.id,
        examination_id=payload.examination_id,
        title=f"Reminder: {payload.subject}",
        message=payload.message,
        notification_type=payload.notification_type,
        channel="IN_APP"
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    return StandardResponse(
        data=NotificationItem(
            id=notif.id,
            recipient_id=notif.recipient_id,
            sender_name=current_user.full_name,
            examination_id=notif.examination_id,
            exam_name=exam.name,
            title=notif.title,
            message=notif.message,
            notification_type=notif.notification_type,
            channel=notif.channel,
            is_read=False,
            created_at=notif.created_at
        ),
        message="Reminder sent successfully (In-App notification delivered)."
    )

# ---------------------------------------------------------
# Screen 9: Scoped Reports & Analytics
# ---------------------------------------------------------
@router.get("/reports", response_model=StandardResponse[CoordinatorReportsData])
def get_coordinator_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _, assigned_exam_ids = resolve_coordinator_context(current_user, db)
    if not assigned_exam_ids:
        return StandardResponse(data=CoordinatorReportsData(), message="No examinations assigned.")

    exams = db.query(Examination).filter(Examination.id.in_(assigned_exam_ids)).all()
    subject_ids = [e.subject_id for e in exams if e.subject_id]

    papers = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(subject_ids)).all() if subject_ids else []
    paper_map: Dict[str, QuestionPaper] = {p.subject_id: p for p in papers}

    now = get_utc_now()

    # 1. Exam Progress Rows
    exam_progress_rows = []
    total_approved = 0
    total_overdue = 0

    for e in exams:
        p = paper_map.get(e.subject_id)
        p_st = p.status if p else "NOT_STARTED"
        if p_st in ["APPROVED", "PUBLISHED"]:
            total_approved += 1

        is_ov = bool(e.paper_submission_deadline and e.paper_submission_deadline < now and p_st not in ["APPROVED", "PUBLISHED"])
        if is_ov:
            total_overdue += 1

        exam_progress_rows.append({
            "exam_code": e.code,
            "exam_name": e.name,
            "subject_code": e.subject.code if e.subject else "",
            "subject_name": e.subject.name if e.subject else "",
            "paper_status": p_st,
            "submission_deadline": e.paper_submission_deadline.strftime("%b %d, %Y") if e.paper_submission_deadline else "Not set",
            "is_overdue": is_ov
        })

    # 2. Readiness Breakdown Rows
    readiness_items = db.query(ExamReadinessItem).filter(
        ExamReadinessItem.examination_id.in_(assigned_exam_ids)
    ).all()

    total_req_items = sum(1 for it in readiness_items if it.is_required)
    completed_req_items = sum(1 for it in readiness_items if it.is_required and it.status == "COMPLETED")
    readiness_rate = (completed_req_items / total_req_items * 100) if total_req_items > 0 else 0.0

    readiness_rows = [
        {
            "category": cat,
            "total_items": sum(1 for it in readiness_items if it.category == cat),
            "completed": sum(1 for it in readiness_items if it.category == cat and it.status == "COMPLETED"),
            "blocked": sum(1 for it in readiness_items if it.category == cat and it.status == "BLOCKED")
        }
        for cat in ["QUESTION_PAPER", "SCHEDULING", "OPERATIONAL", "FINAL"]
    ]

    # 3. Issue Summary
    issues = db.query(ExamOperationalIssue).filter(
        ExamOperationalIssue.examination_id.in_(assigned_exam_ids)
    ).all()

    issue_summary = {
        "total_issues": len(issues),
        "open": sum(1 for i in issues if i.status == "OPEN"),
        "in_progress": sum(1 for i in issues if i.status == "IN_PROGRESS"),
        "escalated": sum(1 for i in issues if i.status == "ESCALATED"),
        "resolved": sum(1 for i in issues if i.status in ["RESOLVED", "CLOSED"]),
        "critical": sum(1 for i in issues if i.severity == "CRITICAL")
    }

    report_data = CoordinatorReportsData(
        total_exams=len(exams),
        total_papers=len(papers),
        papers_approved=total_approved,
        papers_overdue=total_overdue,
        readiness_rate=round(readiness_rate, 1),
        exam_progress_rows=exam_progress_rows,
        faculty_coordination_rows=[],
        review_approval_rows=[],
        readiness_rows=readiness_rows,
        issue_summary=issue_summary
    )

    return StandardResponse(data=report_data, message="Coordinator reports compiled")
