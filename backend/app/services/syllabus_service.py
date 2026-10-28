"""
Syllabus Management & Curriculum Grounding Service for QPMS Apex.
Authoritative source for syllabus availability, curriculum units,
topics extraction, and syllabus-first paper generation readiness.
"""

from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import Subject, Syllabus, Unit, Topic, Question

def check_syllabus_readiness(db: Session, subject_id: str) -> Dict[str, Any]:
    """
    Evaluates whether an authoritative university syllabus is available, active,
    and sufficiently structured for syllabus-grounded examination generation.

    Status Categories:
    - AVAILABLE: Active syllabus exists with non-empty curriculum units and topics.
    - INCOMPLETE: Syllabus record exists but has 0 units or empty topics.
    - PROCESSING: Syllabus curriculum document is uploaded but awaiting parsing.
    - UNAVAILABLE: No syllabus record exists for this academic subject.
    """
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    syllabus = db.query(Syllabus).filter(
        Syllabus.subject_id == subject_id,
        Syllabus.is_active == True
    ).first()

    # Also check if an inactive syllabus exists if no active one found
    if not syllabus:
        syllabus = db.query(Syllabus).filter(Syllabus.subject_id == subject_id).first()

    sem_name = subject.semester.name if subject.semester else "N/A"
    prog_name = subject.semester.program.name if (subject.semester and subject.semester.program) else "N/A"

    bank_count = db.query(Question).filter(
        Question.subject_id == subject_id,
        Question.status == "APPROVED"
    ).count()

    if not syllabus:
        msg = f"No official syllabus record exists for {subject.name} ({subject.code}). Explicit fallback generation mode is required."
        return {
            "subject_id": subject.id,
            "subject_name": subject.name,
            "subject_code": subject.code,
            "semester_name": sem_name,
            "program_name": prog_name,
            "status": "UNAVAILABLE",
            "syllabus_id": None,
            "syllabus_title": None,
            "version": None,
            "is_active": False,
            "units_count": 0,
            "topics_count": 0,
            "units": [],
            "question_bank_count": bank_count,
            "can_generate_syllabus_grounded": False,
            "requires_fallback_consent": True,
            "allow_fallback_required": True,
            "status_message": msg,
            "message": msg
        }

    # Filter out test units (e.g. Unit 99 test artifacts) if real units exist
    raw_units = syllabus.units or []
    curriculum_units = [u for u in raw_units if not u.title.startswith("Unit 99")]
    if not curriculum_units and raw_units:
        curriculum_units = raw_units

    if len(curriculum_units) == 0:
        if syllabus.file_url and not syllabus.is_active:
            status = "PROCESSING"
            msg = f"Syllabus document '{syllabus.file_name or 'Uploaded File'}' is currently being processed by curriculum ingestion pipeline."
        else:
            status = "INCOMPLETE"
            msg = f"Syllabus v{syllabus.version} exists for {subject.name} but does not contain any curriculum units."
        
        return {
            "subject_id": subject.id,
            "subject_name": subject.name,
            "subject_code": subject.code,
            "semester_name": sem_name,
            "program_name": prog_name,
            "status": status,
            "syllabus_id": syllabus.id,
            "syllabus_title": syllabus.title,
            "version": syllabus.version,
            "is_active": syllabus.is_active,
            "units_count": 0,
            "topics_count": 0,
            "units": [],
            "question_bank_count": bank_count,
            "can_generate_syllabus_grounded": False,
            "requires_fallback_consent": True,
            "allow_fallback_required": True,
            "status_message": msg,
            "message": msg
        }

    # Syllabus is AVAILABLE and usable
    formatted_units = []
    total_topics = 0
    for u in curriculum_units:
        t_list = [t.title for t in u.topics] if u.topics else []
        total_topics += len(t_list)
        formatted_units.append({
            "id": u.id,
            "unit_number": u.unit_number,
            "title": u.title,
            "description": u.description,
            "topics_count": len(t_list),
            "topics": t_list
        })

    avail_msg = f"Official university syllabus v{syllabus.version} verified with {len(curriculum_units)} units and {total_topics} curriculum topics."
    return {
        "subject_id": subject.id,
        "subject_name": subject.name,
        "subject_code": subject.code,
        "semester_name": sem_name,
        "program_name": prog_name,
        "status": "AVAILABLE",
        "syllabus_id": syllabus.id,
        "syllabus_title": syllabus.title,
        "version": syllabus.version,
        "is_active": syllabus.is_active,
        "units_count": len(curriculum_units),
        "topics_count": total_topics,
        "units": formatted_units,
        "question_bank_count": bank_count,
        "can_generate_syllabus_grounded": True,
        "requires_fallback_consent": False,
        "allow_fallback_required": False,
        "status_message": avail_msg,
        "message": avail_msg
    }

def get_grounded_curriculum(
    db: Session,
    subject_id: str
) -> Tuple[Optional[Syllabus], List[Unit], Dict[str, List[Topic]]]:
    """
    Retrieves syllabus units and topics for question synthesis.
    Returns (syllabus, units_list, unit_topics_dict).
    """
    syllabus = db.query(Syllabus).filter(
        Syllabus.subject_id == subject_id,
        Syllabus.is_active == True
    ).first()
    if not syllabus:
        syllabus = db.query(Syllabus).filter(Syllabus.subject_id == subject_id).first()

    if not syllabus or not syllabus.units:
        return syllabus, [], {}

    raw_units = syllabus.units or []
    curriculum_units = [u for u in raw_units if not u.title.startswith("Unit 99")]
    if not curriculum_units and raw_units:
        curriculum_units = raw_units

    unit_topics: Dict[str, List[Topic]] = {}
    for u in curriculum_units:
        unit_topics[u.id] = u.topics or []

    return syllabus, curriculum_units, unit_topics
