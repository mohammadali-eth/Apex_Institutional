import os
import re
import uuid
import secrets
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_

from app.database.session import get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.permissions import RoleEnum, can_provision_role
from app.models.models import (
    Organization, Department, Program, Semester, Subject, Syllabus, SyllabusVersion,
    Unit, Topic, User, Role, Question, QuestionOption, QuestionApproval,
    QuestionPaper, QuestionPaperSection, QuestionPaperQuestion, AuditLog,
    FacultyAssignment, StudentEnrollment, OnlineTest, TestQuestionSnapshot
)
from app.schemas.hod import (
    HODDashboardStats, HODFacultyStats, HODCurriculumStats, HODQuestionStats,
    HODPaperStats, HODExamStats, HODFacultyItem, HODFacultyCreateRequest,
    HODFacultyUpdateRequest, HODSubjectAssignmentRequest, HODProgramItem,
    HODProgramCreateRequest, HODProgramUpdateRequest, HODSubjectItem,
    HODSubjectCreateRequest, HODSubjectUpdateRequest, HODTopicItem, HODUnitItem,
    HODSyllabusOverviewItem, HODUnitCreateRequest, HODUnitUpdateRequest,
    HODTopicCreateRequest, HODQuestionReviewRequest, HODPaperReviewRequest,
    HODAssignReviewerRequest, HODExamItem, HODExamCreateRequest, HODExamUpdateRequest,
    HODReportsData, HODReportFacultyWorkload, HODReportQuestionHealth, HODReportPaperReadiness
)
from app.schemas.common import StandardResponse, PaginatedResponse, PaginatedData, PaginationMeta
from app.schemas.paper import QuestionPaperResponse
from app.schemas.question import QuestionResponse
from app.api.deps import get_current_user, require_permission, require_roles
from app.services.audit_service import log_audit
from app.services.paper_validator import validate_question_paper
from app.api.v1.question_papers import paper_to_response
from app.api.v1.questions import question_to_response

router = APIRouter(prefix="/hod", tags=["Head of Department (HOD)"])

ALLOWED_DOC_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword"
}
MAX_DOC_SIZE = 10 * 1024 * 1024 # 10 MB

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

def resolve_hod_context(
    current_user: User,
    db: Session,
    target_dept_id: Optional[str] = None
) -> tuple[Department, Organization, List[str]]:
    """
    Resolves the authenticated HOD's authorized department and university.
    Strictly verifies ownership and prevents cross-department/cross-university access.
    """
    if current_user.role_name in ["SUPER_ADMIN", "UNIVERSITY_ADMIN"]:
        if target_dept_id:
            dept = db.query(Department).filter(Department.id == target_dept_id).first()
            if not dept:
                raise HTTPException(status_code=404, detail="Department not found")
        elif current_user.department_id:
            dept = db.query(Department).filter(Department.id == current_user.department_id).first()
            if not dept:
                dept = db.query(Department).first()
        else:
            dept = db.query(Department).first()

        if not dept:
            raise HTTPException(status_code=404, detail="No department configured")
        org = dept.organization
    else:
        # Standard HOD / DEPARTMENT_ADMIN
        if not current_user.department_id:
            raise HTTPException(status_code=403, detail="No department assigned to your HOD account")
        
        dept = db.query(Department).filter(
            Department.id == current_user.department_id,
            Department.is_active == True
        ).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Assigned department not found or is inactive")
        
        # Enforce that client cannot forge or request a different department
        if target_dept_id and target_dept_id != dept.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You are strictly scoped to your assigned department."
            )
        
        org = dept.organization
        if not org or not org.is_active:
            raise HTTPException(status_code=403, detail="Parent university is inactive or suspended.")

    # Resolve all course subjects belonging to this department
    prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id == dept.id).all()]
    sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()] if prog_ids else []
    dept_subject_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()] if sem_ids else []

    return dept, org, dept_subject_ids

# ==============================================================================
# 1. HOD Dashboard Overview
# ==============================================================================

@router.get("/dashboard", response_model=StandardResponse[HODDashboardStats])
def get_hod_dashboard(
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, org, dept_subject_ids = resolve_hod_context(current_user, db)

    # Faculty stats
    faculty_query = db.query(User).filter(
        User.department_id == dept.id,
        User.role_name.in_(["FACULTY", "TEACHER"])
    )
    total_faculty = faculty_query.count()
    active_faculty = faculty_query.filter(User.is_active == True).count()

    # Curriculum stats
    total_programs = db.query(Program).filter(Program.department_id == dept.id).count()
    total_subjects = len(dept_subject_ids)
    syl_ids = [s.id for s in db.query(Syllabus.id).filter(Syllabus.subject_id.in_(dept_subject_ids)).all()] if dept_subject_ids else []
    total_units = db.query(Unit).filter(Unit.syllabus_id.in_(syl_ids)).count() if syl_ids else 0

    # Question stats
    q_query = db.query(Question).filter(Question.subject_id.in_(dept_subject_ids)) if dept_subject_ids else db.query(Question).filter(False)
    total_questions = q_query.count()
    pending_review = q_query.filter(Question.status.in_(["SUBMITTED", "UNDER_REVIEW"])).count()
    approved_questions = q_query.filter(Question.status == "APPROVED").count()
    rejected_questions = q_query.filter(Question.status == "REJECTED").count()
    revision_required = q_query.filter(Question.status == "REVISION_REQUIRED").count()

    # Paper stats
    p_query = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(dept_subject_ids)) if dept_subject_ids else db.query(QuestionPaper).filter(False)
    total_papers = p_query.count()
    pending_approval = p_query.filter(QuestionPaper.status.in_(["UNDER_REVIEW", "GENERATED"])).count()
    approved_papers = p_query.filter(QuestionPaper.status == "APPROVED").count()
    published_papers = p_query.filter(QuestionPaper.status == "PUBLISHED").count()

    # Exam stats
    exam_query = db.query(OnlineTest).filter(OnlineTest.subject_id.in_(dept_subject_ids)) if dept_subject_ids else db.query(OnlineTest).filter(False)
    total_exams = exam_query.count()
    upcoming_exams = exam_query.filter(OnlineTest.is_published == True).count()

    # Reviewer assignments needed (questions submitted with no reviewer assigned)
    pending_reviewer_assignments = q_query.filter(
        Question.status.in_(["SUBMITTED", "UNDER_REVIEW"]),
        Question.reviewer_id.is_(None)
    ).count()

    # Recent activity
    dept_user_ids = [u.id for u in db.query(User.id).filter(User.department_id == dept.id).all()]
    recent_logs = db.query(AuditLog).filter(
        or_(
            AuditLog.user_id.in_(dept_user_ids),
            AuditLog.entity_id == dept.id,
            AuditLog.entity_id.in_(dept_subject_ids)
        )
    ).order_by(desc(AuditLog.created_at)).limit(10).all() if dept_user_ids else []

    recent_activity_data = [
        {
            "id": l.id,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "user_email": l.user.email if l.user else "System",
            "user_name": l.user.full_name if l.user else "System",
            "created_at": l.created_at.isoformat()
        } for l in recent_logs
    ]

    stats = HODDashboardStats(
        department_id=dept.id,
        department_name=dept.name,
        department_code=dept.code,
        university_id=org.id,
        university_name=org.name,
        faculty_stats=HODFacultyStats(total_faculty=total_faculty, active_faculty=active_faculty),
        curriculum_stats=HODCurriculumStats(
            total_programs=total_programs,
            total_subjects=total_subjects,
            total_syllabus_units=total_units
        ),
        question_stats=HODQuestionStats(
            total_questions=total_questions,
            pending_review=pending_review,
            approved_questions=approved_questions,
            rejected_questions=rejected_questions,
            revision_required=revision_required
        ),
        paper_stats=HODPaperStats(
            total_papers=total_papers,
            pending_approval=pending_approval,
            approved_papers=approved_papers,
            published_papers=published_papers
        ),
        exam_stats=HODExamStats(total_exams=total_exams, upcoming_exams=upcoming_exams),
        pending_reviewer_assignments=pending_reviewer_assignments,
        recent_activity=recent_activity_data
    )

    return StandardResponse(data=stats)

# ==============================================================================
# 2. Module 1: Faculty Management
# ==============================================================================

@router.get("/faculty", response_model=StandardResponse[List[HODFacultyItem]])
def list_department_faculty(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    query = db.query(User).filter(
        User.department_id == dept.id,
        User.role_name.in_(["FACULTY", "TEACHER"])
    )

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(User.full_name.ilike(s), User.email.ilike(s)))

    faculty_members = query.order_by(User.full_name).all()
    results = []

    for f in faculty_members:
        assignments = db.query(FacultyAssignment).filter(FacultyAssignment.user_id == f.id).all()
        assigned_subjects = [
            {"id": a.subject.id, "code": a.subject.code, "name": a.subject.name}
            for a in assignments if a.subject
        ]
        q_count = db.query(Question).filter(Question.created_by == f.id).count()

        results.append(HODFacultyItem(
            id=f.id,
            full_name=f.full_name,
            email=f.email,
            phone=None,
            employee_code=None,
            role_name=f.role_name,
            is_active=f.is_active,
            must_change_password=bool(f.must_change_password),
            assigned_subjects=assigned_subjects,
            assigned_subjects_count=len(assigned_subjects),
            questions_count=q_count,
            created_at=f.created_at
        ))

    return StandardResponse(data=results)

@router.post("/faculty", response_model=StandardResponse[HODFacultyItem])
def create_department_faculty(
    req: HODFacultyCreateRequest,
    current_user: User = Depends(require_permission("user.create")),
    db: Session = Depends(get_db)
):
    dept, org, dept_subject_ids = resolve_hod_context(current_user, db)

    # Authority check
    if not can_provision_role(current_user.role_name, "FACULTY"):
        raise HTTPException(status_code=403, detail="Not authorized to provision faculty accounts.")

    # Duplicate email check
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"User with email '{req.email}' already exists")

    temp_password = req.password.strip() if req.password else f"QPMS@{secrets.token_hex(4)}!"
    hashed_pwd = get_password_hash(temp_password)
    setup_token = secrets.token_urlsafe(32)

    faculty_role = db.query(Role).filter(Role.name.in_(["FACULTY", "TEACHER"])).first()

    user = User(
        email=req.email.lower().strip(),
        hashed_password=hashed_pwd,
        full_name=req.full_name.strip(),
        role_name="FACULTY",
        organization_id=org.id,
        department_id=dept.id,
        is_active=req.is_active,
        must_change_password=True,
        invitation_token=setup_token
    )
    if faculty_role:
        user.roles.append(faculty_role)

    db.add(user)
    db.flush()

    # Assign initial subjects if provided
    assigned_subjects = []
    if req.subject_ids:
        # Validate that subjects belong to this department
        valid_subjects = db.query(Subject).filter(
            Subject.id.in_(req.subject_ids),
            Subject.id.in_(dept_subject_ids)
        ).all()
        for s in valid_subjects:
            db.add(FacultyAssignment(user_id=user.id, subject_id=s.id, role_type="TEACHER"))
            assigned_subjects.append({"id": s.id, "code": s.code, "name": s.name})

    db.commit()
    db.refresh(user)

    log_audit(
        db,
        action="FACULTY_ACCOUNT_CREATED",
        entity_type="User",
        user_id=current_user.id,
        entity_id=user.id,
        metadata={"department_id": dept.id, "email": user.email}
    )

    return StandardResponse(
        data=HODFacultyItem(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone=req.phone,
            employee_code=req.employee_code,
            role_name=user.role_name,
            is_active=user.is_active,
            must_change_password=True,
            assigned_subjects=assigned_subjects,
            assigned_subjects_count=len(assigned_subjects),
            questions_count=0,
            created_at=user.created_at
        ),
        message=f"Faculty account created successfully. Temporary password: {temp_password}"
    )

@router.put("/faculty/{user_id}", response_model=StandardResponse[HODFacultyItem])
@router.patch("/faculty/{user_id}", response_model=StandardResponse[HODFacultyItem])
def update_department_faculty(
    user_id: str,
    req: HODFacultyUpdateRequest,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    user = db.query(User).filter(
        User.id == user_id,
        User.department_id == dept.id,
        User.role_name.in_(["FACULTY", "TEACHER"])
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Faculty member not found in your department")

    if req.full_name is not None:
        user.full_name = req.full_name.strip()
    if req.is_active is not None:
        user.is_active = req.is_active

    db.commit()
    db.refresh(user)

    log_audit(db, action="FACULTY_PROFILE_UPDATED", entity_type="User", user_id=current_user.id, entity_id=user.id)

    assignments = db.query(FacultyAssignment).filter(FacultyAssignment.user_id == user.id).all()
    assigned_subjects = [{"id": a.subject.id, "code": a.subject.code, "name": a.subject.name} for a in assignments if a.subject]
    q_count = db.query(Question).filter(Question.created_by == user.id).count()

    return StandardResponse(
        data=HODFacultyItem(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone=req.phone,
            employee_code=req.employee_code,
            role_name=user.role_name,
            is_active=user.is_active,
            must_change_password=bool(user.must_change_password),
            assigned_subjects=assigned_subjects,
            assigned_subjects_count=len(assigned_subjects),
            questions_count=q_count,
            created_at=user.created_at
        ),
        message="Faculty profile updated successfully"
    )

@router.patch("/faculty/{user_id}/status", response_model=StandardResponse[dict])
def toggle_faculty_status(
    user_id: str,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)
    user = db.query(User).filter(User.id == user_id, User.department_id == dept.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Faculty member not found in your department")

    user.is_active = not user.is_active
    db.commit()

    log_audit(
        db,
        action="FACULTY_STATUS_TOGGLED",
        entity_type="User",
        user_id=current_user.id,
        entity_id=user.id,
        metadata={"new_status": user.is_active}
    )

    return StandardResponse(
        data={"user_id": user.id, "is_active": user.is_active},
        message=f"Faculty account {'activated' if user.is_active else 'deactivated'} successfully"
    )

@router.post("/faculty/{user_id}/reset-credentials", response_model=StandardResponse[dict])
@router.post("/faculty/{user_id}/reset-password", response_model=StandardResponse[dict])
def reset_faculty_credentials(
    user_id: str,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)
    user = db.query(User).filter(User.id == user_id, User.department_id == dept.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Faculty member not found in your department")

    temp_password = f"QPMS@{secrets.token_hex(4)}!"
    user.hashed_password = get_password_hash(temp_password)
    user.must_change_password = True
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    db.commit()

    log_audit(db, action="FACULTY_CREDENTIALS_RESET", entity_type="User", user_id=current_user.id, entity_id=user.id)

    return StandardResponse(
        data={
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "temporary_password": temp_password,
            "setup_token": token
        },
        message="Temporary password generated successfully. Provide securely to the faculty member."
    )

# ==============================================================================
# 3. Module 2: Assign Subjects
# ==============================================================================

@router.get("/faculty/{user_id}/assignments", response_model=StandardResponse[List[Dict[str, Any]]])
def get_faculty_assignments(
    user_id: str,
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)
    user = db.query(User).filter(User.id == user_id, User.department_id == dept.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Faculty member not found in your department")

    assignments = db.query(FacultyAssignment).filter(FacultyAssignment.user_id == user.id).all()
    results = [
        {
            "assignment_id": a.id,
            "subject_id": a.subject.id,
            "subject_code": a.subject.code,
            "subject_name": a.subject.name,
            "role_type": a.role_type,
            "assigned_at": a.created_at.isoformat()
        }
        for a in assignments if a.subject
    ]
    return StandardResponse(data=results)

@router.post("/faculty/{user_id}/assign-subjects", response_model=StandardResponse[dict])
def assign_faculty_subjects(
    user_id: str,
    req: HODSubjectAssignmentRequest,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    user = db.query(User).filter(User.id == user_id, User.department_id == dept.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Faculty member not found in your department")

    # Validate that all requested subjects belong strictly to HOD's department!
    valid_subjects = db.query(Subject).filter(
        Subject.id.in_(req.subject_ids),
        Subject.id.in_(dept_subject_ids)
    ).all() if req.subject_ids else []

    if len(valid_subjects) != len(req.subject_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more subjects do not belong to your department curriculum."
        )

    # Transactionally replace assignments
    db.query(FacultyAssignment).filter(FacultyAssignment.user_id == user.id).delete()
    for s in valid_subjects:
        db.add(FacultyAssignment(user_id=user.id, subject_id=s.id, role_type="TEACHER"))

    db.commit()

    log_audit(
        db,
        action="HOD_ASSIGNED_SUBJECTS",
        entity_type="FacultyAssignment",
        user_id=current_user.id,
        entity_id=user.id,
        metadata={"assigned_subjects_count": len(valid_subjects), "subject_ids": req.subject_ids}
    )

    return StandardResponse(
        data={"user_id": user.id, "assigned_subjects_count": len(valid_subjects)},
        message=f"{len(valid_subjects)} subject(s) successfully assigned to {user.full_name}"
    )

# ==============================================================================
# 4. Module 3: Manage Programs
# ==============================================================================

@router.get("/programs", response_model=StandardResponse[List[HODProgramItem]])
def list_department_programs(
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)
    programs = db.query(Program).filter(Program.department_id == dept.id).order_by(Program.name).all()

    results = []
    for p in programs:
        sem_ids = [s.id for s in p.semesters]
        sub_count = db.query(Subject).filter(Subject.semester_id.in_(sem_ids)).count() if sem_ids else 0
        results.append(HODProgramItem(
            id=p.id,
            name=p.name,
            code=p.code,
            degree_level=p.degree_level,
            total_semesters=p.total_semesters,
            is_active=p.is_active,
            subjects_count=sub_count,
            created_at=p.created_at
        ))

    return StandardResponse(data=results)

@router.post("/programs", response_model=StandardResponse[HODProgramItem])
def create_department_program(
    req: HODProgramCreateRequest,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)

    # Unique code check
    existing = db.query(Program).filter(
        Program.department_id == dept.id,
        Program.code == req.code.strip().upper()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Program with code '{req.code}' already exists in your department.")

    prog = Program(
        department_id=dept.id,
        name=req.name.strip(),
        code=req.code.strip().upper(),
        degree_level=req.degree_level.strip(),
        total_semesters=req.total_semesters,
        is_active=req.is_active
    )
    db.add(prog)
    db.flush()

    # Automatically initialize semesters
    for s_num in range(1, req.total_semesters + 1):
        sem = Semester(program_id=prog.id, number=s_num, name=f"Semester {s_num}")
        db.add(sem)

    db.commit()
    db.refresh(prog)

    log_audit(db, action="PROGRAM_CREATED", entity_type="Program", user_id=current_user.id, entity_id=prog.id)

    return StandardResponse(
        data=HODProgramItem(
            id=prog.id,
            name=prog.name,
            code=prog.code,
            degree_level=prog.degree_level,
            total_semesters=prog.total_semesters,
            is_active=prog.is_active,
            subjects_count=0,
            created_at=prog.created_at
        ),
        message=f"Program '{prog.name}' created with {prog.total_semesters} semesters."
    )

@router.put("/programs/{program_id}", response_model=StandardResponse[HODProgramItem])
@router.patch("/programs/{program_id}", response_model=StandardResponse[HODProgramItem])
def update_department_program(
    program_id: str,
    req: HODProgramUpdateRequest,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)
    prog = db.query(Program).filter(Program.id == program_id, Program.department_id == dept.id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found in your department")

    if req.name is not None:
        prog.name = req.name.strip()
    if req.code is not None:
        prog.code = req.code.strip().upper()
    if req.degree_level is not None:
        prog.degree_level = req.degree_level.strip()
    if req.is_active is not None:
        prog.is_active = req.is_active

    db.commit()
    db.refresh(prog)

    sem_ids = [s.id for s in prog.semesters]
    sub_count = db.query(Subject).filter(Subject.semester_id.in_(sem_ids)).count() if sem_ids else 0

    return StandardResponse(
        data=HODProgramItem(
            id=prog.id,
            name=prog.name,
            code=prog.code,
            degree_level=prog.degree_level,
            total_semesters=prog.total_semesters,
            is_active=prog.is_active,
            subjects_count=sub_count,
            created_at=prog.created_at
        ),
        message="Program updated successfully"
    )

# ==============================================================================
# 5. Module 4: Manage Subjects
# ==============================================================================

@router.get("/subjects", response_model=StandardResponse[List[HODSubjectItem]])
def list_department_subjects(
    program_id: Optional[str] = None,
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    query = db.query(Subject).filter(Subject.id.in_(dept_subject_ids))
    if program_id:
        sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id == program_id).all()]
        query = query.filter(Subject.semester_id.in_(sem_ids))

    subjects = query.order_by(Subject.code).all()
    results = []

    for s in subjects:
        sem = s.semester
        prog = sem.program if sem else None
        syl = s.syllabi[0] if s.syllabi else None
        units_count = len(syl.units) if syl else 0
        q_count = len(s.questions)

        assignments = db.query(FacultyAssignment).filter(FacultyAssignment.subject_id == s.id).all()
        teachers = [{"id": a.user.id, "name": a.user.full_name} for a in assignments if a.user]

        results.append(HODSubjectItem(
            id=s.id,
            program_id=prog.id if prog else None,
            program_name=prog.name if prog else None,
            semester_id=sem.id if sem else None,
            semester_number=sem.number if sem else None,
            name=s.name,
            code=s.code,
            credits=s.credits,
            description=s.description,
            is_active=s.is_active,
            units_count=units_count,
            assigned_teachers=teachers,
            questions_count=q_count,
            created_at=s.created_at
        ))

    return StandardResponse(data=results)

@router.post("/subjects", response_model=StandardResponse[HODSubjectItem])
def create_department_subject(
    req: HODSubjectCreateRequest,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)

    # Verify program belongs to this department
    prog = db.query(Program).filter(Program.id == req.program_id, Program.department_id == dept.id).first()
    if not prog:
        raise HTTPException(status_code=400, detail="Specified program does not belong to your department")

    # Find or create semester
    sem = db.query(Semester).filter(
        Semester.program_id == prog.id,
        Semester.number == req.semester_number
    ).first()
    if not sem:
        sem = Semester(program_id=prog.id, number=req.semester_number, name=f"Semester {req.semester_number}")
        db.add(sem)
        db.flush()

    # Unique code check
    existing = db.query(Subject).filter(Subject.code == req.code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Subject with code '{req.code}' already exists")

    subject = Subject(
        semester_id=sem.id,
        name=req.name.strip(),
        code=req.code.strip().upper(),
        credits=req.credits,
        description=req.description,
        is_active=req.is_active
    )
    db.add(subject)
    db.flush()

    # Initialize empty syllabus
    syllabus = Syllabus(subject_id=subject.id, title=f"Syllabus - {subject.name}", version=1, is_active=True)
    db.add(syllabus)
    db.commit()
    db.refresh(subject)

    log_audit(db, action="SUBJECT_CREATED", entity_type="Subject", user_id=current_user.id, entity_id=subject.id)

    return StandardResponse(
        data=HODSubjectItem(
            id=subject.id,
            program_id=prog.id,
            program_name=prog.name,
            semester_id=sem.id,
            semester_number=sem.number,
            name=subject.name,
            code=subject.code,
            credits=subject.credits,
            description=subject.description,
            is_active=subject.is_active,
            units_count=0,
            assigned_teachers=[],
            questions_count=0,
            created_at=subject.created_at
        ),
        message=f"Course Subject '{subject.name}' created successfully"
    )

@router.put("/subjects/{subject_id}", response_model=StandardResponse[HODSubjectItem])
@router.patch("/subjects/{subject_id}", response_model=StandardResponse[HODSubjectItem])
def update_department_subject(
    subject_id: str,
    req: HODSubjectUpdateRequest,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    if subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Subject not found in your department curriculum")

    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")

    if req.name is not None:
        subj.name = req.name.strip()
    if req.code is not None:
        subj.code = req.code.strip().upper()
    if req.credits is not None:
        subj.credits = req.credits
    if req.description is not None:
        subj.description = req.description
    if req.is_active is not None:
        subj.is_active = req.is_active

    db.commit()
    db.refresh(subj)

    sem = subj.semester
    prog = sem.program if sem else None
    syl = subj.syllabi[0] if subj.syllabi else None
    units_count = len(syl.units) if syl else 0
    q_count = len(subj.questions)

    assignments = db.query(FacultyAssignment).filter(FacultyAssignment.subject_id == subj.id).all()
    teachers = [{"id": a.user.id, "name": a.user.full_name} for a in assignments if a.user]

    return StandardResponse(
        data=HODSubjectItem(
            id=subj.id,
            program_id=prog.id if prog else None,
            program_name=prog.name if prog else None,
            semester_id=sem.id if sem else None,
            semester_number=sem.number if sem else None,
            name=subj.name,
            code=subj.code,
            credits=subj.credits,
            description=subj.description,
            is_active=subj.is_active,
            units_count=units_count,
            assigned_teachers=teachers,
            questions_count=q_count,
            created_at=subj.created_at
        ),
        message="Subject updated successfully"
    )

# ==============================================================================
# 6. Module 5: Manage Syllabus and Units
# ==============================================================================

@router.get("/syllabus", response_model=StandardResponse[List[HODSyllabusOverviewItem]])
def list_department_syllabus(
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    subjects = db.query(Subject).filter(Subject.id.in_(dept_subject_ids)).order_by(Subject.code).all()

    results = []
    for s in subjects:
        prog_name = s.semester.program.name if s.semester and s.semester.program else None
        syl = s.syllabi[0] if s.syllabi else None
        units_data = []
        if syl:
            for u in syl.units:
                topics_data = [HODTopicItem(id=t.id, title=t.title, order_index=getattr(t, 'topic_number', 0)) for t in u.topics]
                units_data.append(HODUnitItem(
                    id=u.id,
                    unit_number=u.unit_number,
                    title=u.title,
                    description=u.description,
                    hours=0,
                    topics=topics_data
                ))

        results.append(HODSyllabusOverviewItem(
            subject_id=s.id,
            subject_code=s.code,
            subject_name=s.name,
            program_name=prog_name,
            syllabus_id=syl.id if syl else None,
            version=f"v{syl.version}.0" if (syl and syl.version) else "1.0",
            is_active=s.is_active,
            units_count=len(units_data),
            document_url=syl.file_url if syl else None,
            units=units_data
        ))

    return StandardResponse(data=results)

@router.get("/syllabus/{subject_id}", response_model=StandardResponse[HODSyllabusOverviewItem])
def get_subject_syllabus(
    subject_id: str,
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    if subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Subject not found in your department")

    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")

    syl = s.syllabi[0] if s.syllabi else None
    if not syl:
        syl = Syllabus(subject_id=s.id, title=f"Syllabus - {s.name}", version=1, is_active=True)
        db.add(syl)
        db.commit()
        db.refresh(syl)

    units_data = []
    for u in sorted(syl.units, key=lambda x: x.unit_number):
        topics_data = [HODTopicItem(id=t.id, title=t.title, order_index=getattr(t, 'topic_number', 0)) for t in sorted(u.topics, key=lambda x: getattr(x, 'topic_number', 0))]
        units_data.append(HODUnitItem(
            id=u.id,
            unit_number=u.unit_number,
            title=u.title,
            description=u.description,
            hours=0,
            topics=topics_data
        ))

    prog_name = s.semester.program.name if s.semester and s.semester.program else None

    return StandardResponse(
        data=HODSyllabusOverviewItem(
            subject_id=s.id,
            subject_code=s.code,
            subject_name=s.name,
            program_name=prog_name,
            syllabus_id=syl.id,
            version=f"v{syl.version}.0" if (syl and syl.version) else "1.0",
            is_active=s.is_active,
            units_count=len(units_data),
            document_url=syl.file_url,
            units=units_data
        )
    )

@router.post("/syllabus/{subject_id}/units", response_model=StandardResponse[HODUnitItem])
def add_syllabus_unit(
    subject_id: str,
    req: HODUnitCreateRequest,
    current_user: User = Depends(require_permission("syllabus.update")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    if subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Subject not found in your department")

    s = db.query(Subject).filter(Subject.id == subject_id).first()
    syl = s.syllabi[0] if s.syllabi else None
    if not syl:
        syl = Syllabus(subject_id=s.id, title=f"Syllabus - {s.name}", version=1, is_active=True)
        db.add(syl)
        db.flush()

    unit = Unit(
        syllabus_id=syl.id,
        unit_number=req.unit_number,
        title=req.title.strip(),
        description=req.description
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)

    log_audit(db, action="SYLLABUS_UNIT_ADDED", entity_type="Unit", user_id=current_user.id, entity_id=unit.id)

    return StandardResponse(
        data=HODUnitItem(
            id=unit.id,
            unit_number=unit.unit_number,
            title=unit.title,
            description=unit.description,
            hours=req.hours or 0,
            topics=[]
        ),
        message=f"Unit {unit.unit_number}: '{unit.title}' added successfully"
    )

@router.put("/syllabus/units/{unit_id}", response_model=StandardResponse[HODUnitItem])
def update_syllabus_unit(
    unit_id: str,
    req: HODUnitUpdateRequest,
    current_user: User = Depends(require_permission("syllabus.update")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit or unit.syllabus.subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Syllabus unit not found in your department")

    if req.title is not None:
        unit.title = req.title.strip()
    if req.description is not None:
        unit.description = req.description

    db.commit()
    db.refresh(unit)

    topics_data = [HODTopicItem(id=t.id, title=t.title, order_index=getattr(t, 'topic_number', 0)) for t in unit.topics]
    return StandardResponse(
        data=HODUnitItem(
            id=unit.id,
            unit_number=unit.unit_number,
            title=unit.title,
            description=unit.description,
            hours=0,
            topics=topics_data
        ),
        message="Unit updated successfully"
    )

@router.delete("/syllabus/units/{unit_id}", response_model=StandardResponse[dict])
def delete_syllabus_unit(
    unit_id: str,
    current_user: User = Depends(require_permission("syllabus.update")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit or unit.syllabus.subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Syllabus unit not found in your department")

    # Safe delete guard: check if questions exist for this unit
    q_count = db.query(Question).filter(Question.unit_id == unit.id).count()
    if q_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete unit: {q_count} questions in the question bank are linked to this unit."
        )

    db.delete(unit)
    db.commit()
    log_audit(db, action="SYLLABUS_UNIT_DELETED", entity_type="Unit", user_id=current_user.id, entity_id=unit_id)

    return StandardResponse(data={"unit_id": unit_id}, message="Unit deleted successfully")

@router.post("/syllabus/units/{unit_id}/topics", response_model=StandardResponse[HODTopicItem])
def add_syllabus_topic(
    unit_id: str,
    req: HODTopicCreateRequest,
    current_user: User = Depends(require_permission("syllabus.update")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit or unit.syllabus.subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Syllabus unit not found in your department")

    topic = Topic(
        unit_id=unit.id,
        title=req.title.strip(),
        topic_number=req.order_index
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)

    return StandardResponse(
        data=HODTopicItem(id=topic.id, title=topic.title, order_index=topic.topic_number),
        message="Topic added successfully"
    )

@router.post("/syllabus/{subject_id}/upload", response_model=StandardResponse[dict])
async def upload_syllabus_document(
    subject_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("syllabus.upload")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    if subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Subject not found in your department")

    # MIME type validation
    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF, DOC, and DOCX files are permitted for syllabus documents."
        )

    content = await file.read()
    if len(content) > MAX_DOC_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 10 MB limit.")

    ext = os.path.splitext(file.filename or "")[1].lower() or ".pdf"
    save_filename = f"syl_{subject_id}_{secrets.token_hex(6)}{ext}"
    upload_dir = os.path.join(settings.STORAGE_DIR, "syllabus")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, save_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    doc_url = f"/uploads/syllabus/{save_filename}"

    s = db.query(Subject).filter(Subject.id == subject_id).first()
    syl = s.syllabi[0] if s.syllabi else None
    if not syl:
        syl = Syllabus(
            subject_id=s.id,
            title=f"Syllabus - {s.name}",
            version=1,
            is_active=True,
            file_url=doc_url,
            file_name=file.filename,
            file_size=len(content),
            file_type=ext.replace(".", "").upper()
        )
        db.add(syl)
        db.flush()
    else:
        syl.file_url = doc_url
        syl.file_name = file.filename
        syl.file_size = len(content)
        syl.file_type = ext.replace(".", "").upper()
        syl.version = (syl.version or 1) + 1
        # Create historical version snapshot
        db.add(SyllabusVersion(
            syllabus_id=syl.id,
            version=syl.version,
            change_summary="Syllabus document updated by HOD",
            file_url=doc_url,
            created_by=current_user.id
        ))

    db.commit()

    log_audit(
        db,
        action="SYLLABUS_DOCUMENT_UPLOADED",
        entity_type="Syllabus",
        user_id=current_user.id,
        entity_id=syl.id,
        metadata={"filename": file.filename, "url": doc_url}
    )

    return StandardResponse(data={"document_url": doc_url}, message="Syllabus document uploaded successfully")

# ==============================================================================
# 7. Module 6 & 7: Question Bank Oversight & Question Review Queue
# ==============================================================================

@router.get("/questions", response_model=PaginatedResponse[QuestionResponse])
def list_department_questions(
    subject_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    question_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    query = db.query(Question).filter(Question.subject_id.in_(dept_subject_ids))

    if subject_id:
        if subject_id not in dept_subject_ids:
            raise HTTPException(status_code=403, detail="Subject does not belong to your department")
        query = query.filter(Question.subject_id == subject_id)
    if unit_id:
        query = query.filter(Question.unit_id == unit_id)
    if question_type:
        query = query.filter(Question.question_type == question_type.upper())
    if difficulty:
        query = query.filter(Question.difficulty == difficulty.upper())
    if status:
        query = query.filter(Question.status == status.upper())
    if search:
        query = query.filter(Question.question_text.ilike(f"%{search.strip()}%"))

    total = query.count()
    questions = query.order_by(desc(Question.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    items = [question_to_response(q) for q in questions]

    return PaginatedResponse(
        data=PaginatedData(
            items=items,
            meta=PaginationMeta(
                total=total,
                page=page,
                page_size=page_size,
                total_pages=(total + page_size - 1) // page_size if page_size else 1
            )
        )
    )

@router.get("/review-questions", response_model=StandardResponse[List[QuestionResponse]])
def get_questions_review_queue(
    status: Optional[str] = None,
    subject_id: Optional[str] = None,
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    query = db.query(Question).filter(Question.subject_id.in_(dept_subject_ids))

    if status:
        query = query.filter(Question.status == status.upper())
    else:
        # Default review queue shows pending review questions
        query = query.filter(Question.status.in_(["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUIRED"]))

    if subject_id and subject_id in dept_subject_ids:
        query = query.filter(Question.subject_id == subject_id)

    questions = query.order_by(desc(Question.created_at)).limit(100).all()
    results = [question_to_response(q) for q in questions]

    return StandardResponse(data=results)

@router.post("/questions/{question_id}/review", response_model=StandardResponse[QuestionResponse])
@router.post("/review-questions/{question_id}/review", response_model=StandardResponse[QuestionResponse])
def review_question_decision(
    question_id: str,
    decision: HODQuestionReviewRequest,
    current_user: User = Depends(require_permission("question.approve")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    q = db.query(Question).filter(Question.id == question_id).first()
    if not q or q.subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Question not found in your department question bank")

    # Anti-Self-Approval guard: Creator cannot approve their own question!
    if q.created_by == current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anti-Self-Approval Violation: You cannot review or approve a question you authored yourself. A peer reviewer must evaluate it."
        )

    action = decision.action.upper()
    prev_status = q.status

    if action == "APPROVE":
        q.status = "APPROVED"
        q.reviewer_id = current_user.id
        q.review_feedback = decision.comments or "Approved by HOD"
    elif action == "REJECT":
        if not decision.comments or not decision.comments.strip():
            raise HTTPException(status_code=400, detail="Rejection reason / comments are mandatory when rejecting a question.")
        q.status = "REJECTED"
        q.reviewer_id = current_user.id
        q.review_feedback = decision.comments.strip()
    elif action == "REQUEST_REVISION":
        if not decision.comments or not decision.comments.strip():
            raise HTTPException(status_code=400, detail="Actionable feedback comments are mandatory when requesting revision.")
        q.status = "REVISION_REQUIRED"
        q.reviewer_id = current_user.id
        q.review_feedback = decision.comments.strip()
    else:
        raise HTTPException(status_code=400, detail=f"Invalid review action '{action}'. Permitted: APPROVE, REJECT, REQUEST_REVISION")

    q.updated_at = get_utc_now()

    # Log approval trail
    appr = QuestionApproval(
        question_id=q.id,
        reviewer_id=current_user.id,
        previous_status=prev_status,
        new_status=q.status,
        comments=decision.comments
    )
    db.add(appr)
    db.commit()
    db.refresh(q)

    log_audit(
        db,
        action=f"QUESTION_REVIEW_{action}",
        entity_type="Question",
        user_id=current_user.id,
        entity_id=q.id,
        metadata={"previous": prev_status, "new": q.status, "comments": decision.comments}
    )

    return StandardResponse(
        data=question_to_response(q),
        message=f"Question marked as {q.status}."
    )

@router.post("/questions/{question_id}/assign-reviewer", response_model=StandardResponse[dict])
def assign_question_reviewer(
    question_id: str,
    req: HODAssignReviewerRequest,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    q = db.query(Question).filter(Question.id == question_id).first()
    if not q or q.subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Question not found in your department question bank")

    # Reviewer must be in this department and active
    reviewer = db.query(User).filter(
        User.id == req.reviewer_id,
        User.department_id == dept.id,
        User.is_active == True
    ).first()
    if not reviewer:
        raise HTTPException(status_code=400, detail="Assigned reviewer must be an active faculty member in your department.")

    # Cannot assign author to review their own submission
    if q.created_by == reviewer.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conflict of Interest: A faculty member cannot be assigned to review their own question."
        )

    q.reviewer_id = reviewer.id
    if q.status == "SUBMITTED":
        q.status = "UNDER_REVIEW"

    db.commit()

    log_audit(
        db,
        action="QUESTION_REVIEWER_ASSIGNED",
        entity_type="Question",
        user_id=current_user.id,
        entity_id=q.id,
        metadata={"reviewer_id": reviewer.id, "reviewer_name": reviewer.full_name}
    )

    return StandardResponse(
        data={"question_id": q.id, "reviewer_id": reviewer.id, "reviewer_name": reviewer.full_name},
        message=f"Reviewer {reviewer.full_name} assigned to question."
    )

# ==============================================================================
# 8. Module 8 & 9: Monitor Question Papers & Approve Papers
# ==============================================================================

@router.get("/papers", response_model=StandardResponse[List[QuestionPaperResponse]])
def list_department_papers(
    status: Optional[str] = None,
    subject_id: Optional[str] = None,
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    query = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(dept_subject_ids))

    if status:
        query = query.filter(QuestionPaper.status == status.upper())
    if subject_id and subject_id in dept_subject_ids:
        query = query.filter(QuestionPaper.subject_id == subject_id)

    papers = query.order_by(desc(QuestionPaper.created_at)).all()
    results = [paper_to_response(p, db) for p in papers]

    return StandardResponse(data=results)

@router.get("/approve-papers", response_model=StandardResponse[List[QuestionPaperResponse]])
def get_papers_approval_queue(
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    papers = db.query(QuestionPaper).filter(
        QuestionPaper.subject_id.in_(dept_subject_ids),
        QuestionPaper.status.in_(["UNDER_REVIEW", "GENERATED", "DRAFT"])
    ).order_by(desc(QuestionPaper.created_at)).all()

    results = [paper_to_response(p, db) for p in papers]
    return StandardResponse(data=results)

@router.post("/papers/{paper_id}/review", response_model=StandardResponse[QuestionPaperResponse])
@router.post("/approve-papers/{paper_id}/review", response_model=StandardResponse[QuestionPaperResponse])
def review_paper_decision(
    paper_id: str,
    decision: HODPaperReviewRequest,
    current_user: User = Depends(require_permission("paper.approve")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper or paper.subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Question paper not found in your department curriculum")

    # Anti-Self-Approval guard: Paper creator cannot self-approve
    if paper.created_by == current_user.id and current_user.role_name not in ["SUPER_ADMIN", "UNIVERSITY_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anti-Self-Approval Violation: You cannot approve a question paper that you created. Another authorized reviewer or admin must approve it."
        )

    action = decision.action.upper()
    prev_status = paper.status

    if action == "APPROVE":
        val = validate_question_paper(db, paper_id)
        if not val.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve question paper with validation errors: {'; '.join(val.errors)}"
            )
        paper.status = "APPROVED"
        paper.approved_by = current_user.id
    elif action == "REJECT":
        if not decision.comments or not decision.comments.strip():
            raise HTTPException(status_code=400, detail="Rejection reason / comments are mandatory when rejecting a paper.")
        paper.status = "REJECTED"
    elif action == "REQUEST_REVISION":
        if not decision.comments or not decision.comments.strip():
            raise HTTPException(status_code=400, detail="Actionable feedback comments are mandatory when requesting revision.")
        paper.status = "REVISION_REQUIRED"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid review action '{action}'. Permitted: APPROVE, REJECT, REQUEST_REVISION")

    paper.updated_at = get_utc_now()
    db.commit()
    db.refresh(paper)

    log_audit(
        db,
        action=f"PAPER_REVIEW_{action}",
        entity_type="QuestionPaper",
        user_id=current_user.id,
        entity_id=paper.id,
        metadata={"previous": prev_status, "new": paper.status, "comments": decision.comments}
    )

    return StandardResponse(
        data=paper_to_response(paper, db),
        message=f"Question paper status updated to {paper.status}."
    )

@router.post("/papers/{paper_id}/assign-reviewer", response_model=StandardResponse[dict])
def assign_paper_reviewer(
    paper_id: str,
    req: HODAssignReviewerRequest,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper or paper.subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Question paper not found in your department")

    reviewer = db.query(User).filter(
        User.id == req.reviewer_id,
        User.department_id == dept.id,
        User.is_active == True
    ).first()
    if not reviewer:
        raise HTTPException(status_code=400, detail="Assigned reviewer must be an active faculty member in your department.")

    if paper.created_by == reviewer.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conflict of Interest: A faculty member cannot review a paper they created."
        )

    paper.reviewed_by = reviewer.id
    if paper.status in ["DRAFT", "GENERATED"]:
        paper.status = "UNDER_REVIEW"

    db.commit()

    log_audit(
        db,
        action="PAPER_REVIEWER_ASSIGNED",
        entity_type="QuestionPaper",
        user_id=current_user.id,
        entity_id=paper.id,
        metadata={"reviewer_id": reviewer.id, "reviewer_name": reviewer.full_name}
    )

    return StandardResponse(
        data={"paper_id": paper.id, "reviewer_id": reviewer.id, "reviewer_name": reviewer.full_name},
        message=f"Reviewer {reviewer.full_name} assigned to question paper."
    )

@router.post("/assign-reviewers", response_model=StandardResponse[dict])
def assign_reviewer_unified(
    req: HODAssignReviewerRequest,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    if not req.entity_type or not req.entity_id:
        raise HTTPException(status_code=400, detail="entity_type and entity_id are required for unified assignment.")
    if req.entity_type.upper() == "QUESTION":
        return assign_question_reviewer(req.entity_id, req, current_user, db)
    elif req.entity_type.upper() == "PAPER":
        return assign_paper_reviewer(req.entity_id, req, current_user, db)
    else:
        raise HTTPException(status_code=400, detail="Invalid entity_type. Expected 'QUESTION' or 'PAPER'.")

# ==============================================================================
# 9. Module 10: Department Exams Coordination
# ==============================================================================

@router.get("/exams", response_model=StandardResponse[List[HODExamItem]])
def list_department_exams(
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    exams = db.query(OnlineTest).filter(OnlineTest.subject_id.in_(dept_subject_ids)).order_by(desc(OnlineTest.created_at)).all()
    results = [
        HODExamItem(
            id=e.id,
            subject_id=e.subject_id,
            subject_code=e.subject.code if e.subject else "",
            subject_name=e.subject.name if e.subject else "",
            title=e.title,
            description=e.description,
            test_type=e.test_type,
            difficulty=e.difficulty,
            duration_minutes=e.duration_minutes,
            total_marks=e.total_marks,
            passing_marks=e.passing_marks,
            instructions=e.instructions,
            is_published=e.is_published,
            attempt_limit=e.attempt_limit,
            questions_count=len(e.questions),
            created_at=e.created_at
        )
        for e in exams
    ]

    return StandardResponse(data=results)

@router.post("/exams", response_model=StandardResponse[HODExamItem])
def create_department_exam(
    req: HODExamCreateRequest,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    if req.subject_id not in dept_subject_ids:
        raise HTTPException(status_code=400, detail="Specified subject does not belong to your department curriculum.")

    s = db.query(Subject).filter(Subject.id == req.subject_id).first()

    exam = OnlineTest(
        subject_id=req.subject_id,
        title=req.title.strip(),
        description=req.description,
        test_type=req.test_type,
        difficulty=req.difficulty,
        duration_minutes=req.duration_minutes,
        total_marks=req.total_marks,
        passing_marks=req.passing_marks,
        instructions=req.instructions,
        is_published=req.is_published,
        attempt_limit=req.attempt_limit,
        created_by=current_user.id
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)

    log_audit(db, action="EXAM_CREATED", entity_type="OnlineTest", user_id=current_user.id, entity_id=exam.id)

    return StandardResponse(
        data=HODExamItem(
            id=exam.id,
            subject_id=exam.subject_id,
            subject_code=s.code,
            subject_name=s.name,
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
            questions_count=0,
            created_at=exam.created_at
        ),
        message=f"Department exam '{exam.title}' created successfully."
    )

@router.patch("/exams/{test_id}/publish", response_model=StandardResponse[dict])
def toggle_exam_publish(
    test_id: str,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)
    exam = db.query(OnlineTest).filter(OnlineTest.id == test_id).first()
    if not exam or exam.subject_id not in dept_subject_ids:
        raise HTTPException(status_code=404, detail="Department exam not found")

    exam.is_published = not exam.is_published
    db.commit()

    log_audit(db, action="EXAM_PUBLISH_TOGGLED", entity_type="OnlineTest", user_id=current_user.id, entity_id=exam.id)

    return StandardResponse(
        data={"exam_id": exam.id, "is_published": exam.is_published},
        message=f"Exam '{exam.title}' {'published for students' if exam.is_published else 'unpublished'}."
    )

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
    )

# ==============================================================================
# 10. Module 11: View Reports
# ==============================================================================

@router.get("/reports", response_model=StandardResponse[HODReportsData])
def get_department_reports(
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    # 1. Faculty Workload
    faculty_list = db.query(User).filter(
        User.department_id == dept.id,
        User.role_name.in_(["FACULTY", "TEACHER"])
    ).all()

    workload = []
    for f in faculty_list:
        sub_cnt = db.query(FacultyAssignment).filter(FacultyAssignment.user_id == f.id).count()
        q_submitted = db.query(Question).filter(Question.created_by == f.id).count()
        q_approved = db.query(Question).filter(Question.created_by == f.id, Question.status == "APPROVED").count()
        reviews = db.query(QuestionApproval).filter(QuestionApproval.reviewer_id == f.id).count()

        workload.append(HODReportFacultyWorkload(
            faculty_id=f.id,
            faculty_name=f.full_name,
            email=f.email,
            assigned_subjects=sub_cnt,
            questions_submitted=q_submitted,
            questions_approved=q_approved,
            reviews_completed=reviews
        ))

    # 2. Question Health
    subjects = db.query(Subject).filter(Subject.id.in_(dept_subject_ids)).all()
    q_health = []
    for s in subjects:
        questions = s.questions
        q_health.append(HODReportQuestionHealth(
            subject_code=s.code,
            subject_name=s.name,
            total_questions=len(questions),
            easy=sum(1 for q in questions if q.difficulty == "EASY"),
            medium=sum(1 for q in questions if q.difficulty == "MEDIUM"),
            hard=sum(1 for q in questions if q.difficulty == "HARD"),
            approved=sum(1 for q in questions if q.status == "APPROVED"),
            pending=sum(1 for q in questions if q.status in ["SUBMITTED", "UNDER_REVIEW"]),
            rejected=sum(1 for q in questions if q.status in ["REJECTED", "REVISION_REQUIRED"])
        ))

    # 3. Paper Readiness
    papers = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(dept_subject_ids)).order_by(desc(QuestionPaper.created_at)).limit(20).all()
    paper_readiness = []
    for p in papers:
        q_cnt = sum(len(sec.questions) for sec in p.sections)
        paper_readiness.append(HODReportPaperReadiness(
            subject_code=p.subject.code if p.subject else "",
            subject_name=p.subject.name if p.subject else "",
            paper_title=p.title,
            status=p.status,
            total_marks=p.total_marks,
            questions_count=q_cnt,
            approved_by=p.approver.full_name if p.approver else None,
            created_at=p.created_at
        ))

    return StandardResponse(
        data=HODReportsData(
            department_name=dept.name,
            faculty_workload=workload,
            question_health=q_health,
            paper_readiness=paper_readiness
        )
    )

# ==============================================================================
# 11. Module 12: Manage Department Users
# ==============================================================================

@router.get("/users", response_model=StandardResponse[List[dict]])
def list_department_users(
    role: Optional[str] = None,
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)
    query = db.query(User).filter(User.department_id == dept.id)

    if role:
        query = query.filter(User.role_name == role.upper())

    users = query.order_by(User.full_name).all()
    results = [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role_name": u.role_name,
            "phone": None,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat()
        }
        for u in users
    ]
    return StandardResponse(data=results)

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


@router.get("/eligible-reviewers", response_model=StandardResponse[List[dict]])
def list_eligible_reviewers(
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, _ = resolve_hod_context(current_user, db)

    faculty = db.query(User).filter(
        User.department_id == dept.id,
        User.role_name.in_(["FACULTY", "TEACHER", "HOD"]),
        User.is_active == True
    ).all()

    results = [
        {
            "id": f.id,
            "full_name": f.full_name,
            "email": f.email,
            "role_name": f.role_name
        }
        for f in faculty
    ]
    return StandardResponse(data=results)

@router.get("/audit", response_model=StandardResponse[List[dict]])
def get_department_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_roles(["HOD", "DEPARTMENT_ADMIN", "SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    dept, _, dept_subject_ids = resolve_hod_context(current_user, db)

    user_ids = [u.id for u in db.query(User.id).filter(User.department_id == dept.id).all()]
    logs = db.query(AuditLog).filter(
        or_(
            AuditLog.user_id.in_(user_ids),
            AuditLog.entity_id == dept.id,
            AuditLog.entity_id.in_(dept_subject_ids)
        )
    ).order_by(desc(AuditLog.created_at)).limit(limit).all() if user_ids else []

    results = [
        {
            "id": l.id,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "user_email": l.user.email if l.user else "System",
            "user_name": l.user.full_name if l.user else "System",
            "metadata": l.metadata_json,
            "created_at": l.created_at.isoformat()
        }
        for l in logs
    ]

    return StandardResponse(data=results)

