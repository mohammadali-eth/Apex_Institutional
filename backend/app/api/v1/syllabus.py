from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Syllabus, SyllabusVersion, Unit, Topic, Subject, User
from app.schemas.syllabus import (
    SyllabusCreate, SyllabusUpdate, SyllabusResponse,
    UnitCreate, UnitResponse, TopicCreate, TopicResponse
)
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user, require_permission
from app.services.storage_service import storage_service
from app.services.audit_service import log_audit

router = APIRouter(prefix="/syllabus", tags=["Syllabus"])

@router.get("", response_model=StandardResponse[List[SyllabusResponse]])
def get_syllabi(
    subject_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Syllabus)
    if subject_id:
        query = query.filter(Syllabus.subject_id == subject_id)
        
    syllabi = query.order_by(Syllabus.created_at.desc()).all()
    results = []
    for s in syllabi:
        units_resp = []
        for u in s.units:
            topics_resp = [
                TopicResponse(
                    id=t.id,
                    unit_id=t.unit_id,
                    topic_number=t.topic_number,
                    title=t.title,
                    description=t.description,
                    created_at=t.created_at
                ) for t in u.topics
            ]
            units_resp.append(UnitResponse(
                id=u.id,
                syllabus_id=u.syllabus_id,
                unit_number=u.unit_number,
                title=u.title,
                description=u.description,
                topics=topics_resp,
                questions_count=len(u.questions),
                created_at=u.created_at
            ))

        results.append(SyllabusResponse(
            id=s.id,
            subject_id=s.subject_id,
            subject_name=s.subject.name if s.subject else None,
            subject_code=s.subject.code if s.subject else None,
            title=s.title,
            version=s.version,
            description=s.description,
            academic_year_id=s.academic_year_id,
            file_url=s.file_url,
            file_name=s.file_name,
            file_size=s.file_size,
            file_type=s.file_type,
            is_active=s.is_active,
            units=units_resp,
            created_at=s.created_at,
            updated_at=s.updated_at
        ))
    return StandardResponse(data=results)

@router.get("/{syllabus_id}", response_model=StandardResponse[SyllabusResponse])
def get_syllabus(syllabus_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Syllabus not found")

    units_resp = []
    for u in s.units:
        topics_resp = [
            TopicResponse(
                id=t.id,
                unit_id=t.unit_id,
                topic_number=t.topic_number,
                title=t.title,
                description=t.description,
                created_at=t.created_at
            ) for t in u.topics
        ]
        units_resp.append(UnitResponse(
            id=u.id,
            syllabus_id=u.syllabus_id,
            unit_number=u.unit_number,
            title=u.title,
            description=u.description,
            topics=topics_resp,
            questions_count=len(u.questions),
            created_at=u.created_at
        ))

    resp = SyllabusResponse(
        id=s.id,
        subject_id=s.subject_id,
        subject_name=s.subject.name if s.subject else None,
        subject_code=s.subject.code if s.subject else None,
        title=s.title,
        version=s.version,
        description=s.description,
        academic_year_id=s.academic_year_id,
        file_url=s.file_url,
        file_name=s.file_name,
        file_size=s.file_size,
        file_type=s.file_type,
        is_active=s.is_active,
        units=units_resp,
        created_at=s.created_at,
        updated_at=s.updated_at
    )
    return StandardResponse(data=resp)

@router.post("/upload", response_model=StandardResponse[SyllabusResponse])
def upload_syllabus(
    subject_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    academic_year_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("syllabus.upload"))
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    file_url = None
    file_name = None
    file_size = 0
    file_type = None

    if file:
        file_url, file_name, file_size = storage_service.save_upload_file(file, subfolder="syllabus")
        file_type = file.content_type

    # Check if a syllabus already exists to increment version
    existing = db.query(Syllabus).filter(Syllabus.subject_id == subject_id).order_by(Syllabus.version.desc()).first()
    new_version = (existing.version + 1) if existing else 1

    syllabus = Syllabus(
        subject_id=subject_id,
        academic_year_id=academic_year_id,
        title=title,
        version=new_version,
        description=description,
        file_url=file_url,
        file_name=file_name,
        file_size=file_size,
        file_type=file_type,
        is_active=True
    )
    db.add(syllabus)
    db.flush()

    # Create default syllabus units if none exist (e.g. Unit 1 to 5)
    default_units = [
        ("Unit 1: Introduction & Fundamentals", "Core foundational concepts and architecture overview"),
        ("Unit 2: Core Principles & Methodology", "Design patterns, algorithms and structured procedures"),
        ("Unit 3: Advanced Concepts & Optimization", "Deep dive techniques, performance and security"),
        ("Unit 4: Applications & Case Studies", "Industry standard applications, protocols and implementations"),
        ("Unit 5: Emerging Trends & Best Practices", "Modern frameworks, testing, monitoring and future directions")
    ]
    for idx, (u_title, u_desc) in enumerate(default_units, start=1):
        unit = Unit(
            syllabus_id=syllabus.id,
            unit_number=idx,
            title=u_title,
            description=u_desc
        )
        db.add(unit)
        db.flush()
        # Add sample topics to each unit
        for t_idx in range(1, 4):
            topic = Topic(
                unit_id=unit.id,
                topic_number=t_idx,
                title=f"Topic {idx}.{t_idx}: Key Concepts Part {t_idx}",
                description=f"Detailed study of topic {idx}.{t_idx}"
            )
            db.add(topic)

    # Save Version history
    ver = SyllabusVersion(
        syllabus_id=syllabus.id,
        version=new_version,
        change_summary="Initial upload and auto-scaffolding of Units/Topics",
        file_url=file_url,
        created_by=current_user.id
    )
    db.add(ver)

    db.commit()
    db.refresh(syllabus)

    log_audit(db, action="SYLLABUS_UPLOADED", entity_type="Syllabus", user_id=current_user.id, entity_id=syllabus.id)

    return get_syllabus(syllabus.id, db=db, current_user=current_user)

@router.post("/{syllabus_id}/units", response_model=StandardResponse[UnitResponse])
def add_unit(
    syllabus_id: str,
    data: UnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("syllabus.update"))
):
    syllabus = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")

    unit = Unit(
        syllabus_id=syllabus_id,
        unit_number=data.unit_number,
        title=data.title,
        description=data.description
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)

    return StandardResponse(
        data=UnitResponse(
            id=unit.id,
            syllabus_id=unit.syllabus_id,
            unit_number=unit.unit_number,
            title=unit.title,
            description=unit.description,
            topics=[],
            questions_count=0,
            created_at=unit.created_at
        ),
        message="Unit added successfully"
    )

@router.post("/units/{unit_id}/topics", response_model=StandardResponse[TopicResponse])
def add_topic(
    unit_id: str,
    data: TopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("syllabus.update"))
):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    topic = Topic(
        unit_id=unit_id,
        topic_number=data.topic_number,
        title=data.title,
        description=data.description
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)

    return StandardResponse(
        data=TopicResponse(
            id=topic.id,
            unit_id=topic.unit_id,
            topic_number=topic.topic_number,
            title=topic.title,
            description=topic.description,
            created_at=topic.created_at
        ),
        message="Topic added successfully"
    )
