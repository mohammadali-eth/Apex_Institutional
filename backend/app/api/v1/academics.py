from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Program, AcademicYear, Semester, Subject, Department, User, Organization
from app.schemas.academic import (
    ProgramCreate, ProgramUpdate, ProgramResponse,
    AcademicYearCreate, AcademicYearResponse,
    SemesterCreate, SemesterResponse,
    SubjectCreate, SubjectUpdate, SubjectResponse
)
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, require_permission
from app.services.audit_service import log_audit

router = APIRouter(prefix="/academic", tags=["Academics"])

# --- PROGRAMS ---
@router.get("/programs", response_model=StandardResponse[List[ProgramResponse]])
def get_programs(department_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Program)
    if current_user.role_name == "UNIVERSITY_ADMIN" and current_user.organization_id:
        child_insts = [ci.id for ci in db.query(Organization.id).filter(Organization.parent_id == current_user.organization_id).all()]
        allowed_orgs = [current_user.organization_id] + child_insts
        query = query.join(Department).filter(Department.organization_id.in_(allowed_orgs))
    if department_id:
        query = query.filter(Program.department_id == department_id)
    programs = query.order_by(Program.name).all()
    res = [
        ProgramResponse(
            id=p.id,
            department_id=p.department_id,
            department_name=p.department.name if p.department else None,
            name=p.name,
            code=p.code,
            degree_level=p.degree_level,
            total_semesters=p.total_semesters,
            is_active=p.is_active,
            created_at=p.created_at
        ) for p in programs
    ]
    return StandardResponse(data=res)

@router.post("/programs", response_model=StandardResponse[ProgramResponse])
def create_program(data: ProgramCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("academic.manage"))):
    if current_user.role_name == "UNIVERSITY_ADMIN" and current_user.organization_id:
        dept = db.query(Department).filter(Department.id == data.department_id).first()
        child_insts = [ci.id for ci in db.query(Organization.id).filter(Organization.parent_id == current_user.organization_id).all()]
        allowed_orgs = [current_user.organization_id] + child_insts
        if not dept or dept.organization_id not in allowed_orgs:
            raise HTTPException(status_code=403, detail="Department does not belong to your university")
    prog = Program(**data.dict())
    db.add(prog)
    db.commit()
    db.refresh(prog)

    # Automatically create the semesters for this program
    for i in range(1, prog.total_semesters + 1):
        sem = Semester(
            program_id=prog.id,
            number=i,
            name=f"Semester {i}"
        )
        db.add(sem)
    db.commit()

    return StandardResponse(
        data=ProgramResponse(
            id=prog.id,
            department_id=prog.department_id,
            name=prog.name,
            code=prog.code,
            degree_level=prog.degree_level,
            total_semesters=prog.total_semesters,
            is_active=prog.is_active,
            created_at=prog.created_at
        ),
        message="Program and semesters created successfully"
    )

# --- ACADEMIC YEARS ---
@router.get("/years", response_model=StandardResponse[List[AcademicYearResponse]])
def get_academic_years(db: Session = Depends(get_db)):
    years = db.query(AcademicYear).order_by(AcademicYear.name.desc()).all()
    return StandardResponse(data=[AcademicYearResponse.from_orm(y) for y in years])

@router.post("/years", response_model=StandardResponse[AcademicYearResponse])
def create_academic_year(data: AcademicYearCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("academic.manage"))):
    year = AcademicYear(**data.dict())
    db.add(year)
    db.commit()
    db.refresh(year)
    return StandardResponse(data=AcademicYearResponse.from_orm(year), message="Academic year created")

# --- SEMESTERS ---
@router.get("/semesters", response_model=StandardResponse[List[SemesterResponse]])
def get_semesters(program_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Semester)
    if program_id:
        query = query.filter(Semester.program_id == program_id)
    sems = query.order_by(Semester.number).all()
    res = [
        SemesterResponse(
            id=s.id,
            program_id=s.program_id,
            program_name=s.program.name if s.program else None,
            number=s.number,
            name=s.name,
            created_at=s.created_at
        ) for s in sems
    ]
    return StandardResponse(data=res)

# --- SUBJECTS ---
@router.get("/subjects", response_model=StandardResponse[List[SubjectResponse]])
def get_subjects(
    semester_id: Optional[str] = None,
    department_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Subject)
    if current_user.role_name == "UNIVERSITY_ADMIN" and current_user.organization_id:
        child_insts = [ci.id for ci in db.query(Organization.id).filter(Organization.parent_id == current_user.organization_id).all()]
        allowed_orgs = [current_user.organization_id] + child_insts
        query = query.join(Semester).join(Program).join(Department).filter(Department.organization_id.in_(allowed_orgs))
    if semester_id:
        query = query.filter(Subject.semester_id == semester_id)
    if department_id:
        query = query.join(Semester).join(Program).filter(Program.department_id == department_id)

    subjects = query.order_by(Subject.name).all()
    results = []
    for s in subjects:
        # compute units count and questions count
        u_count = len(s.syllabi[0].units) if s.syllabi and s.syllabi[0].units else 0
        q_count = len(s.questions)
        results.append(SubjectResponse(
            id=s.id,
            semester_id=s.semester_id,
            semester_name=s.semester.name if s.semester else None,
            program_name=s.semester.program.name if (s.semester and s.semester.program) else None,
            department_name=s.semester.program.department.name if (s.semester and s.semester.program and s.semester.program.department) else None,
            code=s.code,
            name=s.name,
            credits=s.credits,
            description=s.description,
            is_active=s.is_active,
            units_count=u_count,
            questions_count=q_count,
            created_at=s.created_at
        ))
    return StandardResponse(data=results)

@router.post("/subjects", response_model=StandardResponse[SubjectResponse])
def create_subject(data: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("academic.manage"))):
    if current_user.role_name == "UNIVERSITY_ADMIN" and current_user.organization_id:
        sem = db.query(Semester).filter(Semester.id == data.semester_id).first()
        child_insts = [ci.id for ci in db.query(Organization.id).filter(Organization.parent_id == current_user.organization_id).all()]
        allowed_orgs = [current_user.organization_id] + child_insts
        if not sem or not sem.program or not sem.program.department or sem.program.department.organization_id not in allowed_orgs:
            raise HTTPException(status_code=403, detail="Semester / Program does not belong to your university")
    existing = db.query(Subject).filter(Subject.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already registered")

    subj = Subject(**data.dict())
    db.add(subj)
    db.commit()
    db.refresh(subj)
    log_audit(db, action="SUBJECT_CREATED", entity_type="Subject", user_id=current_user.id, entity_id=subj.id)

    return StandardResponse(
        data=SubjectResponse(
            id=subj.id,
            semester_id=subj.semester_id,
            semester_name=subj.semester.name if subj.semester else None,
            code=subj.code,
            name=subj.name,
            credits=subj.credits,
            description=subj.description,
            is_active=subj.is_active,
            units_count=0,
            questions_count=0,
            created_at=subj.created_at
        ),
        message="Subject created successfully"
    )

@router.get("/subjects/{subject_id}", response_model=StandardResponse[SubjectResponse])
def get_subject(subject_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")

    u_count = len(s.syllabi[0].units) if s.syllabi and s.syllabi[0].units else 0
    q_count = len(s.questions)

    return StandardResponse(
        data=SubjectResponse(
            id=s.id,
            semester_id=s.semester_id,
            semester_name=s.semester.name if s.semester else None,
            program_name=s.semester.program.name if (s.semester and s.semester.program) else None,
            department_name=s.semester.program.department.name if (s.semester and s.semester.program and s.semester.program.department) else None,
            code=s.code,
            name=s.name,
            credits=s.credits,
            description=s.description,
            is_active=s.is_active,
            units_count=u_count,
            questions_count=q_count,
            created_at=s.created_at
        )
    )
