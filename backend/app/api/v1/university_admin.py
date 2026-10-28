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
    Organization, Department, Program, Semester, Subject, Syllabus, Unit, User, Role,
    Question, QuestionPaper, AuditLog, FacultyAssignment, UniversityTheme
)
from app.schemas.academic import (
    OrganizationResponse, UniversityThemeResponse, UniversityThemeUpdate,
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    ProgramResponse, SubjectResponse
)
from app.schemas.university_admin import (
    UniversityAdminDashboardStats, UniversityProfileUpdate,
    HODCreateRequest, HODUpdateRequest, StaffUserResponse,
    TeacherCreateRequest, TeacherUpdateRequest, TeacherSubjectAssignRequest,
    ExamControllerCreateRequest, ExamControllerUpdateRequest,
    StaffCredentialResetResponse, UniversityDepartmentItem, DepartmentAssignHODRequest,
    UniversityDepartmentCreate
)
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, require_permission, require_roles
from app.services.audit_service import log_audit

router = APIRouter(prefix="/university-admin", tags=["University Admin"])

HEX_COLOR_REGEX = re.compile(r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024 # 5 MB

DEFAULT_THEME_VALUES = {
    "primary_color": "#82c341",
    "secondary_color": "#45525b",
    "background_color": "#f3f3f3",
    "font_color": "#838383",
    "title_color": "#44535b",
    "paragraph_color": "#676767",
    "bg_text_color": "#dcdcdc",
    "bg_title_color": "#f6f6f7",
    "sidebar_style": "default",
    "is_dark_mode_supported": False,
    "logo_url": None,
    "favicon_url": None,
    "login_banner_text": None
}

def resolve_university_context(
    current_user: User,
    db: Session,
    target_univ_id: Optional[str] = None
) -> tuple[Organization, List[str]]:
    """Resolves and enforces university tenant scope. Prevents cross-tenant access."""
    if current_user.role_name == RoleEnum.SUPER_ADMIN.value:
        if target_univ_id:
            univ = db.query(Organization).filter(Organization.id == target_univ_id, Organization.type == "UNIVERSITY").first()
            if not univ:
                raise HTTPException(status_code=404, detail="University not found")
        else:
            univ = db.query(Organization).filter(Organization.type == "UNIVERSITY").first()
            if not univ:
                raise HTTPException(status_code=404, detail="No university configured")
    else:
        if not current_user.organization_id:
            raise HTTPException(status_code=403, detail="No university assigned to your account")
        user_org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
        if not user_org:
            raise HTTPException(status_code=404, detail="Assigned university not found")
        univ = user_org if user_org.type == "UNIVERSITY" else user_org.parent
        if not univ:
            raise HTTPException(status_code=404, detail="Parent university not found")
        
        # Cross-tenant manipulation check
        if target_univ_id and target_univ_id != univ.id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot access or modify another university's records.")

    child_insts = db.query(Organization.id).filter(Organization.parent_id == univ.id).all()
    affiliated_ids = [univ.id] + [ci.id for ci in child_insts]
    return univ, affiliated_ids

# ==============================================================================
# 1. Executive Dashboard Overview
# ==============================================================================

@router.get("/dashboard", response_model=StandardResponse[UniversityAdminDashboardStats])
def get_university_dashboard(
    university_id: Optional[str] = None,
    target_univ_id: Optional[str] = None,
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    target_id = university_id or target_univ_id
    univ, affiliated_ids = resolve_university_context(current_user, db, target_id)

    # 1. Departments & Institutions
    total_depts = db.query(Department).filter(Department.organization_id.in_(affiliated_ids)).count()
    total_institutions = db.query(Organization).filter(Organization.parent_id == univ.id).count()

    # 2. Staff Counts
    active_hods = db.query(User).filter(
        User.organization_id.in_(affiliated_ids),
        User.role_name == "HOD",
        User.is_active == True
    ).count()

    active_teachers = db.query(User).filter(
        User.organization_id.in_(affiliated_ids),
        User.role_name.in_(["FACULTY", "TEACHER"]),
        User.is_active == True
    ).count()

    active_exam_controllers = db.query(User).filter(
        User.organization_id.in_(affiliated_ids),
        User.role_name == "EXAM_CONTROLLER",
        User.is_active == True
    ).count()

    # 3. Academic Hierarchy
    dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id.in_(affiliated_ids)).all()]
    prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id.in_(dept_ids)).all()] if dept_ids else []
    total_programs = len(prog_ids)

    sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()] if prog_ids else []
    subj_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()] if sem_ids else []
    total_subjects = len(subj_ids)

    # 4. Syllabus Units
    syl_ids = [s.id for s in db.query(Syllabus.id).filter(Syllabus.subject_id.in_(subj_ids)).all()] if subj_ids else []
    syllabus_units_count = db.query(Unit).filter(Unit.syllabus_id.in_(syl_ids)).count() if syl_ids else 0

    # 5. Question Metrics
    q_query = db.query(Question).filter(Question.subject_id.in_(subj_ids)) if subj_ids else db.query(Question).filter(False)
    total_questions = q_query.count()
    questions_awaiting_review = q_query.filter(Question.status.in_(["SUBMITTED", "UNDER_REVIEW"])).count()
    approved_questions = q_query.filter(Question.status == "APPROVED").count()

    # 6. Question Paper Breakdown
    p_query = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(subj_ids)) if subj_ids else db.query(QuestionPaper).filter(False)
    total_papers = p_query.count()

    papers_by_status = {
        "DRAFT": p_query.filter(QuestionPaper.status == "DRAFT").count(),
        "GENERATED": p_query.filter(QuestionPaper.status == "GENERATED").count(),
        "UNDER_REVIEW": p_query.filter(QuestionPaper.status == "UNDER_REVIEW").count(),
        "APPROVED": p_query.filter(QuestionPaper.status == "APPROVED").count(),
        "PUBLISHED": p_query.filter(QuestionPaper.status == "PUBLISHED").count(),
        "REJECTED": p_query.filter(QuestionPaper.status == "REJECTED").count(),
        "ARCHIVED": p_query.filter(QuestionPaper.status == "ARCHIVED").count(),
    }

    # 7. Recent Accounts
    recent_users = db.query(User).filter(
        User.organization_id.in_(affiliated_ids)
    ).order_by(desc(User.created_at)).limit(8).all()

    recent_accounts_data = [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role_name": u.role_name,
            "department_name": u.department.name if u.department else None,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat()
        } for u in recent_users
    ]

    # 8. University Audit Events (Filtered strictly to this university's users)
    user_ids = [u.id for u in db.query(User.id).filter(User.organization_id.in_(affiliated_ids)).all()]
    recent_logs = db.query(AuditLog).filter(
        or_(
            AuditLog.user_id.in_(user_ids),
            AuditLog.entity_id == univ.id,
            AuditLog.entity_id.in_(dept_ids)
        )
    ).order_by(desc(AuditLog.created_at)).limit(10).all() if user_ids else []

    recent_audit_data = [
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

    stats = UniversityAdminDashboardStats(
        university_id=univ.id,
        university_name=univ.name,
        university_code=univ.code,
        total_departments=total_depts,
        total_institutions=total_institutions,
        active_hods=active_hods,
        active_teachers=active_teachers,
        active_exam_controllers=active_exam_controllers,
        total_programs=total_programs,
        total_subjects=total_subjects,
        syllabus_units_count=syllabus_units_count,
        total_questions=total_questions,
        questions_awaiting_review=questions_awaiting_review,
        approved_questions=approved_questions,
        total_papers=total_papers,
        papers_by_status=papers_by_status,
        recent_accounts=recent_accounts_data,
        recent_audit_events=recent_audit_data
    )

    return StandardResponse(data=stats)

# ==============================================================================
# 2. University Profile Management
# ==============================================================================

@router.get("/profile", response_model=StandardResponse[OrganizationResponse])
def get_university_profile(
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    univ, _ = resolve_university_context(current_user, db)
    return StandardResponse(
        data=OrganizationResponse(
            id=univ.id,
            name=univ.name,
            code=univ.code,
            type=univ.type,
            parent_id=univ.parent_id,
            address=univ.address,
            website=univ.website,
            logo_url=univ.logo_url,
            is_active=univ.is_active,
            created_at=univ.created_at,
            departments_count=len(univ.departments),
            institutions_count=len(univ.institutions),
            theme=UniversityThemeResponse.model_validate(univ.theme) if univ.theme else None
        )
    )

@router.put("/profile", response_model=StandardResponse[OrganizationResponse])
@router.patch("/profile", response_model=StandardResponse[OrganizationResponse])
def update_university_profile(
    data: UniversityProfileUpdate,
    current_user: User = Depends(require_permission("university.update")),
    db: Session = Depends(get_db)
):
    univ, _ = resolve_university_context(current_user, db)

    update_dict = data.model_dump(exclude_unset=True)
    if "display_name" in update_dict:
        disp_name = update_dict.pop("display_name")
        if disp_name and not update_dict.get("name"):
            update_dict["name"] = disp_name
    for k, v in update_dict.items():
        if hasattr(univ, k):
            setattr(univ, k, v)

    db.commit()
    db.refresh(univ)

    log_audit(
        db,
        action="UNIVERSITY_PROFILE_UPDATED",
        entity_type="University",
        user_id=current_user.id,
        entity_id=univ.id,
        metadata={"updated_fields": list(update_dict.keys())}
    )

    return StandardResponse(
        data=OrganizationResponse(
            id=univ.id,
            name=univ.name,
            code=univ.code,
            type=univ.type,
            parent_id=univ.parent_id,
            address=univ.address,
            website=univ.website,
            logo_url=univ.logo_url,
            is_active=univ.is_active,
            created_at=univ.created_at,
            departments_count=len(univ.departments),
            institutions_count=len(univ.institutions),
            theme=UniversityThemeResponse.model_validate(univ.theme) if univ.theme else None
        ),
        message="University profile updated successfully"
    )

# ==============================================================================
# 3. Department Management (CRUD + Assign HOD)
# ==============================================================================

@router.get("/departments", response_model=StandardResponse[List[UniversityDepartmentItem]])
def list_university_departments(
    search: Optional[str] = None,
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)

    query = db.query(Department).filter(Department.organization_id.in_(affiliated_ids))
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(Department.name.ilike(s), Department.code.ilike(s)))

    departments = query.order_by(Department.name).all()
    results = []

    for d in departments:
        # Find active HOD
        hod_user = db.query(User).filter(
            User.department_id == d.id,
            User.role_name == "HOD",
            User.is_active == True
        ).first()

        # Count programs, teachers, subjects
        progs_count = len(d.programs)
        prog_ids = [p.id for p in d.programs]
        sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()] if prog_ids else []
        subjects_count = db.query(Subject).filter(Subject.semester_id.in_(sem_ids)).count() if sem_ids else 0

        teachers_count = db.query(User).filter(
            User.department_id == d.id,
            User.role_name.in_(["FACULTY", "TEACHER"]),
            User.is_active == True
        ).count()

        results.append(UniversityDepartmentItem(
            id=d.id,
            organization_id=d.organization_id,
            organization_name=d.organization.name if d.organization else None,
            name=d.name,
            code=d.code,
            description=d.description,
            is_active=d.is_active,
            hod_name=hod_user.full_name if hod_user else None,
            hod_email=hod_user.email if hod_user else None,
            hod_id=hod_user.id if hod_user else None,
            programs_count=progs_count,
            subjects_count=subjects_count,
            teachers_count=teachers_count,
            created_at=d.created_at
        ))

    return StandardResponse(data=results)

@router.post("/departments", response_model=StandardResponse[UniversityDepartmentItem])
def create_university_department(
    data: UniversityDepartmentCreate,
    current_user: User = Depends(require_permission("department.create")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)

    target_org_id = data.organization_id or univ.id
    if target_org_id not in affiliated_ids:
        raise HTTPException(status_code=403, detail="Cannot create department outside your assigned university.")

    # Unique code check within organization
    existing = db.query(Department).filter(
        Department.organization_id == target_org_id,
        Department.code == data.code.strip().upper()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Department with code '{data.code}' already exists in this institution.")

    dept = Department(
        organization_id=target_org_id,
        name=data.name.strip(),
        code=data.code.strip().upper(),
        description=data.description,
        is_active=data.is_active
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    log_audit(db, action="DEPARTMENT_CREATED", entity_type="Department", user_id=current_user.id, entity_id=dept.id)

    return StandardResponse(
        data=UniversityDepartmentItem(
            id=dept.id,
            organization_id=dept.organization_id,
            organization_name=dept.organization.name if dept.organization else None,
            name=dept.name,
            code=dept.code,
            description=dept.description,
            is_active=dept.is_active,
            created_at=dept.created_at
        ),
        message="Department created successfully"
    )

@router.get("/departments/{dept_id}", response_model=StandardResponse[UniversityDepartmentItem])
def get_university_department(
    dept_id: str,
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id.in_(affiliated_ids)).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found in your university")

    hod_user = db.query(User).filter(User.department_id == dept.id, User.role_name == "HOD", User.is_active == True).first()
    prog_ids = [p.id for p in dept.programs]
    sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()] if prog_ids else []
    subjects_count = db.query(Subject).filter(Subject.semester_id.in_(sem_ids)).count() if sem_ids else 0
    teachers_count = db.query(User).filter(User.department_id == dept.id, User.role_name.in_(["FACULTY", "TEACHER"]), User.is_active == True).count()

    return StandardResponse(
        data=UniversityDepartmentItem(
            id=dept.id,
            organization_id=dept.organization_id,
            organization_name=dept.organization.name if dept.organization else None,
            name=dept.name,
            code=dept.code,
            description=dept.description,
            is_active=dept.is_active,
            hod_name=hod_user.full_name if hod_user else None,
            hod_email=hod_user.email if hod_user else None,
            hod_id=hod_user.id if hod_user else None,
            programs_count=len(dept.programs),
            subjects_count=subjects_count,
            teachers_count=teachers_count,
            created_at=dept.created_at
        )
    )

@router.patch("/departments/{dept_id}", response_model=StandardResponse[UniversityDepartmentItem])
def update_university_department(
    dept_id: str,
    data: DepartmentUpdate,
    current_user: User = Depends(require_permission("department.update")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id.in_(affiliated_ids)).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found in your university")

    update_dict = data.model_dump(exclude_unset=True)
    if "code" in update_dict and update_dict["code"]:
        update_dict["code"] = update_dict["code"].strip().upper()
        # Verify unique code
        clash = db.query(Department).filter(
            Department.organization_id == dept.organization_id,
            Department.code == update_dict["code"],
            Department.id != dept.id
        ).first()
        if clash:
            raise HTTPException(status_code=400, detail="Another department with this code already exists.")

    for k, v in update_dict.items():
        setattr(dept, k, v)

    db.commit()
    db.refresh(dept)
    log_audit(db, action="DEPARTMENT_UPDATED", entity_type="Department", user_id=current_user.id, entity_id=dept.id)

    return get_university_department(dept_id, current_user, db)

@router.post("/departments/{dept_id}/deactivate", response_model=StandardResponse[dict])
def deactivate_university_department(
    dept_id: str,
    current_user: User = Depends(require_permission("department.delete")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id.in_(affiliated_ids)).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found in your university")

    active_teachers = db.query(User).filter(User.department_id == dept.id, User.is_active == True).count()
    dept.is_active = False
    db.commit()

    log_audit(
        db,
        action="DEPARTMENT_DEACTIVATED",
        entity_type="Department",
        user_id=current_user.id,
        entity_id=dept.id,
        metadata={"active_staff_affected": active_teachers}
    )

    return StandardResponse(
        data={"id": dept.id, "is_active": False, "active_staff_affected": active_teachers},
        message="Department deactivated successfully."
    )

@router.post("/departments/{dept_id}/activate", response_model=StandardResponse[dict])
def activate_university_department(
    dept_id: str,
    current_user: User = Depends(require_permission("department.update")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id.in_(affiliated_ids)).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found in your university")

    dept.is_active = True
    db.commit()

    log_audit(db, action="DEPARTMENT_ACTIVATED", entity_type="Department", user_id=current_user.id, entity_id=dept.id)
    return StandardResponse(data={"id": dept.id, "is_active": True}, message="Department activated successfully.")

@router.post("/departments/{dept_id}/assign-hod", response_model=StandardResponse[dict])
def assign_department_hod(
    dept_id: str,
    req: DepartmentAssignHODRequest,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    dept = db.query(Department).filter(Department.id == dept_id, Department.organization_id.in_(affiliated_ids)).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found in your university")

    hod_user = db.query(User).filter(User.id == req.hod_user_id, User.organization_id.in_(affiliated_ids)).first()
    if not hod_user:
        raise HTTPException(status_code=404, detail="User not found in your university")

    hod_role = db.query(Role).filter(Role.name == "HOD").first()
    if not hod_role:
        raise HTTPException(status_code=500, detail="HOD system role is unconfigured")

    # Update role and department
    hod_user.department_id = dept.id
    hod_user.role_name = "HOD"
    if hod_role not in hod_user.roles:
        hod_user.roles = [hod_role]

    db.commit()

    log_audit(
        db,
        action="HOD_ASSIGNED_TO_DEPARTMENT",
        entity_type="Department",
        user_id=current_user.id,
        entity_id=dept.id,
        metadata={"hod_user_id": hod_user.id, "hod_email": hod_user.email}
    )

    return StandardResponse(
        data={"department_id": dept.id, "hod_id": hod_user.id, "hod_name": hod_user.full_name},
        message=f"Prof. {hod_user.full_name} assigned as Head of {dept.name}"
    )

# ==============================================================================
# 4. HOD Management (List, Create, Update, Activate, Deactivate, Reset Password)
# ==============================================================================

@router.get("/hods", response_model=StandardResponse[List[StaffUserResponse]])
def list_university_hods(
    department_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)

    query = db.query(User).filter(
        User.organization_id.in_(affiliated_ids),
        User.role_name == "HOD"
    )
    if department_id:
        query = query.filter(User.department_id == department_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(User.full_name.ilike(s), User.email.ilike(s)))

    hods = query.order_by(User.full_name).all()
    results = [
        StaffUserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role_name=u.role_name,
            organization_id=u.organization_id,
            organization_name=u.organization.name if u.organization else None,
            department_id=u.department_id,
            department_name=u.department.name if u.department else None,
            department_code=u.department.code if u.department else None,
            is_active=u.is_active,
            must_change_password=bool(u.must_change_password),
            created_at=u.created_at
        ) for u in hods
    ]
    return StandardResponse(data=results)

@router.post("/hods", response_model=StandardResponse[StaffUserResponse])
def create_university_hod(
    req: HODCreateRequest,
    current_user: User = Depends(require_permission("user.create")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)

    # 1. Authority Check
    if not can_provision_role(current_user.role_name, "HOD"):
        raise HTTPException(status_code=403, detail="Not authorized to provision HOD accounts")

    # 2. Email duplication check
    existing_user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail=f"User with email '{req.email}' already exists")

    # 3. Department validation (must belong to this university)
    dept = db.query(Department).filter(
        Department.id == req.department_id,
        Department.organization_id.in_(affiliated_ids)
    ).first()
    if not dept:
        raise HTTPException(status_code=400, detail="Specified department does not exist in your university")

    # 4. Check if department already has an active HOD
    existing_hod = db.query(User).filter(
        User.department_id == dept.id,
        User.role_name == "HOD",
        User.is_active == True
    ).first()
    if existing_hod:
        raise HTTPException(
            status_code=400,
            detail=f"Department '{dept.name}' already has an active HOD ({existing_hod.full_name}). Deactivate or reassign them first."
        )

    # 5. Password setup
    temporary_password = req.password.strip() if req.password else f"QPMS@{secrets.token_hex(4)}!"
    hashed_pwd = get_password_hash(temporary_password)
    setup_token = secrets.token_urlsafe(32)

    hod_role = db.query(Role).filter(Role.name == "HOD").first()

    user = User(
        email=req.email.lower().strip(),
        hashed_password=hashed_pwd,
        full_name=req.full_name.strip(),
        role_name="HOD",
        organization_id=dept.organization_id,
        department_id=dept.id,
        is_active=req.is_active,
        must_change_password=True,
        invitation_token=setup_token
    )
    if hod_role:
        user.roles.append(hod_role)

    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(
        db,
        action="HOD_ACCOUNT_CREATED",
        entity_type="User",
        user_id=current_user.id,
        entity_id=user.id,
        metadata={"department_id": dept.id, "email": user.email}
    )

    return StandardResponse(
        data=StaffUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role_name=user.role_name,
            organization_id=user.organization_id,
            organization_name=user.organization.name if user.organization else None,
            department_id=user.department_id,
            department_name=dept.name,
            department_code=dept.code,
            is_active=user.is_active,
            must_change_password=True,
            created_at=user.created_at
        ),
        message=f"HOD account for {user.full_name} created successfully. Temporary password: {temporary_password}"
    )

@router.patch("/hods/{hod_id}", response_model=StandardResponse[StaffUserResponse])
def update_university_hod(
    hod_id: str,
    req: HODUpdateRequest,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)

    user = db.query(User).filter(
        User.id == hod_id,
        User.organization_id.in_(affiliated_ids),
        User.role_name == "HOD"
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="HOD account not found in your university")

    if req.full_name is not None:
        user.full_name = req.full_name.strip()
    if req.is_active is not None:
        user.is_active = req.is_active

    if req.department_id is not None and req.department_id != user.department_id:
        dept = db.query(Department).filter(
            Department.id == req.department_id,
            Department.organization_id.in_(affiliated_ids)
        ).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Target department does not exist in your university")
        user.department_id = dept.id
        user.organization_id = dept.organization_id

    db.commit()
    db.refresh(user)

    log_audit(db, action="HOD_ACCOUNT_UPDATED", entity_type="User", user_id=current_user.id, entity_id=user.id)

    return StandardResponse(
        data=StaffUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role_name=user.role_name,
            organization_id=user.organization_id,
            organization_name=user.organization.name if user.organization else None,
            department_id=user.department_id,
            department_name=user.department.name if user.department else None,
            department_code=user.department.code if user.department else None,
            is_active=user.is_active,
            must_change_password=bool(user.must_change_password),
            created_at=user.created_at
        ),
        message="HOD account updated successfully"
    )

@router.post("/hods/{hod_id}/activate", response_model=StandardResponse[dict])
def activate_university_hod(
    hod_id: str,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    user = db.query(User).filter(User.id == hod_id, User.organization_id.in_(affiliated_ids)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    log_audit(db, action="USER_ACTIVATED", entity_type="User", user_id=current_user.id, entity_id=user.id)
    return StandardResponse(data={"id": user.id, "is_active": True}, message=f"Account {user.email} activated")

@router.post("/hods/{hod_id}/deactivate", response_model=StandardResponse[dict])
def deactivate_university_hod(
    hod_id: str,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    user = db.query(User).filter(User.id == hod_id, User.organization_id.in_(affiliated_ids)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    log_audit(db, action="USER_DEACTIVATED", entity_type="User", user_id=current_user.id, entity_id=user.id)
    return StandardResponse(data={"id": user.id, "is_active": False}, message=f"Account {user.email} deactivated")

@router.post("/hods/{hod_id}/reset-credentials", response_model=StandardResponse[StaffCredentialResetResponse])
def reset_hod_credentials(
    hod_id: str,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    user = db.query(User).filter(User.id == hod_id, User.organization_id.in_(affiliated_ids)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temp_password = f"QPMS@{secrets.token_hex(4)}!"
    user.hashed_password = get_password_hash(temp_password)
    user.must_change_password = True
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    db.commit()

    log_audit(db, action="CREDENTIALS_RESET_BY_ADMIN", entity_type="User", user_id=current_user.id, entity_id=user.id)

    return StandardResponse(
        data=StaffCredentialResetResponse(
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            temporary_password=temp_password,
            setup_token=token,
            message="Credentials successfully reset. Provide the temporary password securely to the user."
        )
    )

# ==============================================================================
# 5. Teacher / Faculty Management & Subject Assignments
# ==============================================================================

@router.get("/teachers", response_model=StandardResponse[List[StaffUserResponse]])
def list_university_teachers(
    department_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)

    query = db.query(User).filter(
        User.organization_id.in_(affiliated_ids),
        User.role_name.in_(["FACULTY", "TEACHER"])
    )
    if department_id:
        query = query.filter(User.department_id == department_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(User.full_name.ilike(s), User.email.ilike(s)))

    teachers = query.order_by(User.full_name).all()
    results = []

    for t in teachers:
        assignments = db.query(FacultyAssignment).filter(FacultyAssignment.user_id == t.id).all()
        assigned_subjects = [
            {
                "id": a.subject.id,
                "code": a.subject.code,
                "name": a.subject.name,
                "role_type": a.role_type
            } for a in assignments if a.subject
        ]

        results.append(StaffUserResponse(
            id=t.id,
            email=t.email,
            full_name=t.full_name,
            role_name=t.role_name,
            organization_id=t.organization_id,
            organization_name=t.organization.name if t.organization else None,
            department_id=t.department_id,
            department_name=t.department.name if t.department else None,
            department_code=t.department.code if t.department else None,
            is_active=t.is_active,
            must_change_password=bool(t.must_change_password),
            assigned_subjects_count=len(assigned_subjects),
            assigned_subjects=assigned_subjects,
            created_at=t.created_at
        ))

    return StandardResponse(data=results)

@router.post("/teachers", response_model=StandardResponse[StaffUserResponse])
def create_university_teacher(
    req: TeacherCreateRequest,
    current_user: User = Depends(require_permission("user.create")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)

    if not can_provision_role(current_user.role_name, "FACULTY"):
        raise HTTPException(status_code=403, detail="Not authorized to provision faculty accounts")

    existing_user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail=f"User with email '{req.email}' already exists")

    dept = db.query(Department).filter(
        Department.id == req.department_id,
        Department.organization_id.in_(affiliated_ids)
    ).first()
    if not dept:
        raise HTTPException(status_code=400, detail="Department not found in your university")

    temporary_password = req.password.strip() if req.password else f"QPMS@{secrets.token_hex(4)}!"
    hashed_pwd = get_password_hash(temporary_password)
    setup_token = secrets.token_urlsafe(32)

    teacher_role = db.query(Role).filter(Role.name.in_(["FACULTY", "TEACHER"])).first()

    user = User(
        email=req.email.lower().strip(),
        hashed_password=hashed_pwd,
        full_name=req.full_name.strip(),
        role_name="FACULTY",
        organization_id=dept.organization_id,
        department_id=dept.id,
        is_active=req.is_active,
        must_change_password=True,
        invitation_token=setup_token
    )
    if teacher_role:
        user.roles.append(teacher_role)

    db.add(user)
    db.flush()

    # Assign subjects if provided
    assigned_subjects = []
    if req.subject_ids:
        # Validate all subjects belong to this university
        dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id.in_(affiliated_ids)).all()]
        prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id.in_(dept_ids)).all()]
        sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()]
        valid_subjects = db.query(Subject).filter(Subject.id.in_(req.subject_ids), Subject.semester_id.in_(sem_ids)).all()

        for s in valid_subjects:
            db.add(FacultyAssignment(
                user_id=user.id,
                subject_id=s.id,
                role_type="TEACHER"
            ))
            assigned_subjects.append({"id": s.id, "code": s.code, "name": s.name, "role_type": "TEACHER"})

    db.commit()
    db.refresh(user)

    log_audit(
        db,
        action="TEACHER_ACCOUNT_CREATED",
        entity_type="User",
        user_id=current_user.id,
        entity_id=user.id,
        metadata={"department_id": dept.id, "assigned_subjects_count": len(assigned_subjects)}
    )

    return StandardResponse(
        data=StaffUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role_name=user.role_name,
            organization_id=user.organization_id,
            organization_name=user.organization.name if user.organization else None,
            department_id=user.department_id,
            department_name=dept.name,
            department_code=dept.code,
            is_active=user.is_active,
            must_change_password=True,
            assigned_subjects_count=len(assigned_subjects),
            assigned_subjects=assigned_subjects,
            created_at=user.created_at
        ),
        message=f"Faculty account for {user.full_name} created. Temporary password: {temporary_password}"
    )

@router.patch("/teachers/{teacher_id}", response_model=StandardResponse[StaffUserResponse])
def update_university_teacher(
    teacher_id: str,
    req: TeacherUpdateRequest,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    user = db.query(User).filter(
        User.id == teacher_id,
        User.organization_id.in_(affiliated_ids),
        User.role_name.in_(["FACULTY", "TEACHER"])
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Faculty account not found")

    if req.full_name is not None:
        user.full_name = req.full_name.strip()
    if req.is_active is not None:
        user.is_active = req.is_active
    if req.department_id is not None and req.department_id != user.department_id:
        dept = db.query(Department).filter(Department.id == req.department_id, Department.organization_id.in_(affiliated_ids)).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Department does not belong to your university")
        user.department_id = dept.id
        user.organization_id = dept.organization_id

    db.commit()
    db.refresh(user)

    log_audit(db, action="TEACHER_ACCOUNT_UPDATED", entity_type="User", user_id=current_user.id, entity_id=user.id)

    assignments = db.query(FacultyAssignment).filter(FacultyAssignment.user_id == user.id).all()
    assigned_subjects = [{"id": a.subject.id, "code": a.subject.code, "name": a.subject.name} for a in assignments if a.subject]

    return StandardResponse(
        data=StaffUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role_name=user.role_name,
            organization_id=user.organization_id,
            organization_name=user.organization.name if user.organization else None,
            department_id=user.department_id,
            department_name=user.department.name if user.department else None,
            department_code=user.department.code if user.department else None,
            is_active=user.is_active,
            must_change_password=bool(user.must_change_password),
            assigned_subjects_count=len(assigned_subjects),
            assigned_subjects=assigned_subjects,
            created_at=user.created_at
        ),
        message="Faculty account updated successfully"
    )

@router.post("/teachers/{teacher_id}/assign-subjects", response_model=StandardResponse[dict])
def assign_teacher_subjects(
    teacher_id: str,
    req: TeacherSubjectAssignRequest,
    current_user: User = Depends(require_permission("academic.manage")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    user = db.query(User).filter(
        User.id == teacher_id,
        User.organization_id.in_(affiliated_ids),
        User.role_name.in_(["FACULTY", "TEACHER"])
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Faculty account not found")

    # Validate all subjects belong to this university
    dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id.in_(affiliated_ids)).all()]
    prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id.in_(dept_ids)).all()]
    sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()]

    valid_subjects = db.query(Subject).filter(
        Subject.id.in_(req.subject_ids),
        Subject.semester_id.in_(sem_ids)
    ).all() if req.subject_ids else []

    if len(valid_subjects) != len(req.subject_ids):
        raise HTTPException(status_code=400, detail="One or more subjects do not belong to your university.")

    # Remove existing assignments and replace transactionally
    db.query(FacultyAssignment).filter(FacultyAssignment.user_id == user.id).delete()
    for s in valid_subjects:
        db.add(FacultyAssignment(user_id=user.id, subject_id=s.id, role_type="TEACHER"))

    db.commit()

    log_audit(
        db,
        action="FACULTY_SUBJECTS_ASSIGNED",
        entity_type="FacultyAssignment",
        user_id=current_user.id,
        entity_id=user.id,
        metadata={"subject_ids": req.subject_ids}
    )

    return StandardResponse(
        data={"teacher_id": user.id, "assigned_subjects_count": len(valid_subjects)},
        message=f"{len(valid_subjects)} course subject(s) assigned to {user.full_name}"
    )

@router.post("/teachers/{teacher_id}/reset-credentials", response_model=StandardResponse[StaffCredentialResetResponse])
def reset_teacher_credentials(
    teacher_id: str,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    user = db.query(User).filter(
        User.id == teacher_id,
        User.organization_id.in_(affiliated_ids),
        User.role_name.in_(["FACULTY", "TEACHER"])
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Faculty account not found")

    temp_password = f"QPMS@{secrets.token_hex(4)}!"
    user.hashed_password = get_password_hash(temp_password)
    user.must_change_password = True
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    db.commit()

    log_audit(db, action="CREDENTIALS_RESET_BY_ADMIN", entity_type="User", user_id=current_user.id, entity_id=user.id)

    return StandardResponse(
        data=StaffCredentialResetResponse(
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            temporary_password=temp_password,
            setup_token=token,
            message="Credentials successfully reset. Provide the temporary password securely to the faculty member."
        )
    )

# ==============================================================================
# 6. Exam Controller Management
# ==============================================================================

@router.get("/exam-controllers", response_model=StandardResponse[List[StaffUserResponse]])
def list_exam_controllers(
    search: Optional[str] = None,
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)

    query = db.query(User).filter(
        User.organization_id.in_(affiliated_ids),
        User.role_name == "EXAM_CONTROLLER"
    )
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(User.full_name.ilike(s), User.email.ilike(s)))

    controllers = query.order_by(User.full_name).all()
    results = [
        StaffUserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role_name=u.role_name,
            organization_id=u.organization_id,
            organization_name=u.organization.name if u.organization else None,
            department_id=None,
            department_name=None,
            is_active=u.is_active,
            must_change_password=bool(u.must_change_password),
            created_at=u.created_at
        ) for u in controllers
    ]
    return StandardResponse(data=results)

@router.post("/exam-controllers", response_model=StandardResponse[StaffUserResponse])
def create_exam_controller(
    req: ExamControllerCreateRequest,
    current_user: User = Depends(require_permission("user.create")),
    db: Session = Depends(get_db)
):
    univ, _ = resolve_university_context(current_user, db)

    if not can_provision_role(current_user.role_name, "EXAM_CONTROLLER"):
        raise HTTPException(status_code=403, detail="Not authorized to provision Exam Controllers")

    existing_user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail=f"User with email '{req.email}' already exists")

    temporary_password = req.password.strip() if req.password else f"QPMS@{secrets.token_hex(4)}!"
    hashed_pwd = get_password_hash(temporary_password)
    setup_token = secrets.token_urlsafe(32)

    controller_role = db.query(Role).filter(Role.name == "EXAM_CONTROLLER").first()

    user = User(
        email=req.email.lower().strip(),
        hashed_password=hashed_pwd,
        full_name=req.full_name.strip(),
        role_name="EXAM_CONTROLLER",
        organization_id=univ.id,
        is_active=req.is_active,
        must_change_password=True,
        invitation_token=setup_token
    )
    if controller_role:
        user.roles.append(controller_role)

    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(db, action="EXAM_CONTROLLER_CREATED", entity_type="User", user_id=current_user.id, entity_id=user.id)

    return StandardResponse(
        data=StaffUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role_name=user.role_name,
            organization_id=user.organization_id,
            organization_name=univ.name,
            department_id=None,
            is_active=user.is_active,
            must_change_password=True,
            created_at=user.created_at
        ),
        message=f"Exam Controller {user.full_name} created. Temporary password: {temporary_password}"
    )

@router.patch("/exam-controllers/{controller_id}", response_model=StandardResponse[StaffUserResponse])
def update_exam_controller(
    controller_id: str,
    req: ExamControllerUpdateRequest,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    user = db.query(User).filter(
        User.id == controller_id,
        User.organization_id.in_(affiliated_ids),
        User.role_name == "EXAM_CONTROLLER"
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Exam Controller not found")

    if req.full_name is not None:
        user.full_name = req.full_name.strip()
    if req.is_active is not None:
        user.is_active = req.is_active

    db.commit()
    db.refresh(user)
    log_audit(db, action="EXAM_CONTROLLER_UPDATED", entity_type="User", user_id=current_user.id, entity_id=user.id)

    return StandardResponse(
        data=StaffUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role_name=user.role_name,
            organization_id=user.organization_id,
            organization_name=univ.name,
            department_id=None,
            is_active=user.is_active,
            must_change_password=bool(user.must_change_password),
            created_at=user.created_at
        ),
        message="Exam Controller updated successfully"
    )

@router.post("/exam-controllers/{controller_id}/reset-credentials", response_model=StandardResponse[StaffCredentialResetResponse])
def reset_exam_controller_credentials(
    controller_id: str,
    current_user: User = Depends(require_permission("user.update")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)
    user = db.query(User).filter(
        User.id == controller_id,
        User.organization_id.in_(affiliated_ids),
        User.role_name == "EXAM_CONTROLLER"
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Exam Controller not found")

    temp_password = f"QPMS@{secrets.token_hex(4)}!"
    user.hashed_password = get_password_hash(temp_password)
    user.must_change_password = True
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    db.commit()

    log_audit(db, action="CREDENTIALS_RESET_BY_ADMIN", entity_type="User", user_id=current_user.id, entity_id=user.id)

    return StandardResponse(
        data=StaffCredentialResetResponse(
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            temporary_password=temp_password,
            setup_token=token,
            message="Credentials successfully reset. Provide the temporary password securely to the exam controller."
        )
    )

# ==============================================================================
# 7. University Branding & Site Customization
# ==============================================================================

@router.get("/branding", response_model=StandardResponse[UniversityThemeResponse])
def get_university_branding(
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "UNIVERSITY_ADMIN"])),
    db: Session = Depends(get_db)
):
    univ, _ = resolve_university_context(current_user, db)
    theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == univ.id).first()
    if not theme:
        theme = UniversityTheme(
            university_id=univ.id,
            logo_url=univ.logo_url,
            **DEFAULT_THEME_VALUES
        )
        db.add(theme)
        db.commit()
        db.refresh(theme)

    return StandardResponse(data=UniversityThemeResponse.model_validate(theme))

@router.put("/branding", response_model=StandardResponse[UniversityThemeResponse])
def update_university_branding(
    data: UniversityThemeUpdate,
    current_user: User = Depends(require_permission("theme.update")),
    db: Session = Depends(get_db)
):
    univ, _ = resolve_university_context(current_user, db)

    theme_dict = data.model_dump(exclude_unset=True)
    # Validate colors
    for field, val in theme_dict.items():
        if field.endswith("_color") and val:
            if not HEX_COLOR_REGEX.match(val):
                raise HTTPException(status_code=400, detail=f"Invalid hex code for {field}: '{val}'")

    theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == univ.id).first()
    if not theme:
        theme = UniversityTheme(university_id=univ.id, **DEFAULT_THEME_VALUES)
        db.add(theme)
        db.flush()

    for k, v in theme_dict.items():
        setattr(theme, k, v)

    db.commit()
    db.refresh(theme)

    log_audit(db, action="UNIVERSITY_THEME_UPDATED", entity_type="UniversityTheme", user_id=current_user.id, entity_id=theme.id)
    return StandardResponse(data=UniversityThemeResponse.model_validate(theme), message="Branding saved successfully")

@router.post("/branding/logo", response_model=StandardResponse[dict])
async def upload_university_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("theme.update")),
    db: Session = Depends(get_db)
):
    univ, _ = resolve_university_context(current_user, db)

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PNG, JPG, WEBP, SVG")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image size exceeds maximum limit of 5MB")

    # Safe filename
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "png"
    safe_name = f"logo_{univ.code.lower()}_{uuid.uuid4().hex[:8]}.{ext}"
    brand_dir = os.path.join(settings.STORAGE_DIR, "branding")
    os.makedirs(brand_dir, exist_ok=True)

    file_path = os.path.join(brand_dir, safe_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    public_url = f"/uploads/branding/{safe_name}"

    # Update in university and theme
    univ.logo_url = public_url
    theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == univ.id).first()
    if theme:
        theme.logo_url = public_url

    db.commit()
    log_audit(db, action="LOGO_UPLOADED", entity_type="Organization", user_id=current_user.id, entity_id=univ.id)

    return StandardResponse(data={"logo_url": public_url}, message="University logo uploaded successfully")

@router.post("/branding/favicon", response_model=StandardResponse[dict])
async def upload_university_favicon(
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("theme.update")),
    db: Session = Depends(get_db)
):
    univ, _ = resolve_university_context(current_user, db)

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: ICO, PNG, SVG")

    contents = await file.read()
    if len(contents) > 1024 * 1024:
        raise HTTPException(status_code=400, detail="Favicon size exceeds maximum limit of 1MB")

    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "ico"
    safe_name = f"favicon_{univ.code.lower()}_{uuid.uuid4().hex[:8]}.{ext}"
    brand_dir = os.path.join(settings.STORAGE_DIR, "branding")
    os.makedirs(brand_dir, exist_ok=True)

    file_path = os.path.join(brand_dir, safe_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    public_url = f"/uploads/branding/{safe_name}"
    theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == univ.id).first()
    if theme:
        theme.favicon_url = public_url
    db.commit()

    log_audit(db, action="FAVICON_UPLOADED", entity_type="UniversityTheme", user_id=current_user.id, entity_id=univ.id)
    return StandardResponse(data={"favicon_url": public_url}, message="Favicon uploaded successfully")

@router.post("/branding/reset", response_model=StandardResponse[UniversityThemeResponse])
def reset_university_branding(
    current_user: User = Depends(require_permission("theme.update")),
    db: Session = Depends(get_db)
):
    univ, _ = resolve_university_context(current_user, db)
    theme = db.query(UniversityTheme).filter(UniversityTheme.university_id == univ.id).first()
    if not theme:
        theme = UniversityTheme(university_id=univ.id, **DEFAULT_THEME_VALUES)
        db.add(theme)
    else:
        for k, v in DEFAULT_THEME_VALUES.items():
            setattr(theme, k, v)

    db.commit()
    db.refresh(theme)

    log_audit(db, action="THEME_RESET_DEFAULT", entity_type="UniversityTheme", user_id=current_user.id, entity_id=theme.id)
    return StandardResponse(data=UniversityThemeResponse.model_validate(theme), message="Theme reset to default QPMS colors")

# ==============================================================================
# 8. University Audit Logs
# ==============================================================================

@router.get("/audit", response_model=StandardResponse[List[dict]])
def get_university_audit_logs(
    search: Optional[str] = None,
    current_user: User = Depends(require_permission("audit.read")),
    db: Session = Depends(get_db)
):
    univ, affiliated_ids = resolve_university_context(current_user, db)

    user_ids = [u.id for u in db.query(User.id).filter(User.organization_id.in_(affiliated_ids)).all()]
    dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id.in_(affiliated_ids)).all()]

    query = db.query(AuditLog).filter(
        or_(
            AuditLog.user_id.in_(user_ids),
            AuditLog.entity_id == univ.id,
            AuditLog.entity_id.in_(dept_ids)
        )
    )

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(AuditLog.action.ilike(s), AuditLog.entity_type.ilike(s)))

    logs = query.order_by(desc(AuditLog.created_at)).limit(100).all()

    results = [
        {
            "id": l.id,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "ip_address": l.ip_address,
            "user_email": l.user.email if l.user else "System",
            "user_name": l.user.full_name if l.user else "System",
            "created_at": l.created_at.isoformat()
        } for l in logs
    ]

    return StandardResponse(data=results)
