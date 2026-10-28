from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.database.session import get_db
from app.models.models import (
    Organization, Department, Program, Semester, Subject, Syllabus, Unit, User,
    Question, QuestionPaper, AuditLog, FacultyAssignment, StudentEnrollment
)
from app.schemas.dashboard import DashboardStats
from app.schemas.common import StandardResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=StandardResponse[DashboardStats])
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stats = DashboardStats()
    role = current_user.role_name
    stats.role = role

    # Resolve Organization & Department Names if present
    if current_user.organization_id:
        org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
        if org:
            stats.organization_name = org.name
    if current_user.department_id:
        dept = db.query(Department).filter(Department.id == current_user.department_id).first()
        if dept:
            stats.department_name = dept.name

    if role == "SUPER_ADMIN":
        # Global platform visibility
        stats.total_universities = db.query(Organization).filter(Organization.type == "UNIVERSITY").count()
        stats.total_institutions = db.query(Organization).filter(Organization.type.in_(["COLLEGE", "INSTITUTE"])).count()
        stats.total_departments = db.query(Department).count()
        stats.total_programs = db.query(Program).count()
        stats.total_subjects = db.query(Subject).count()
        stats.total_users = db.query(User).count()
        stats.total_faculty = db.query(User).filter(User.role_name == "FACULTY").count()
        stats.total_students = db.query(User).filter(User.role_name == "STUDENT").count()

        stats.total_questions = db.query(Question).count()
        stats.approved_questions = db.query(Question).filter(Question.status == "APPROVED").count()
        stats.pending_questions = db.query(Question).filter(Question.status.in_(["SUBMITTED", "UNDER_REVIEW"])).count()

        stats.total_papers = db.query(QuestionPaper).count()
        stats.published_papers = db.query(QuestionPaper).filter(QuestionPaper.status == "PUBLISHED").count()
        stats.pending_papers = db.query(QuestionPaper).filter(QuestionPaper.status.in_(["DRAFT", "GENERATED", "UNDER_REVIEW"])).count()
        stats.system_status = "Optimal"

        # Global audit logs
        logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(10).all()
        stats.recent_activity = [
            {
                "id": l.id,
                "action": l.action,
                "entity_type": l.entity_type,
                "user_email": l.user.email if l.user else "System",
                "created_at": l.created_at.isoformat()
            } for l in logs
        ]
        stats.role_summary = {
            "title": "Platform Overseer",
            "scope": "Multi-Tenant Platform",
            "pending_approvals_total": stats.pending_questions + stats.pending_papers
        }

    elif role == "UNIVERSITY_ADMIN":
        univ_id = current_user.organization_id
        current_org = db.query(Organization).filter(Organization.id == univ_id).first()
        if current_org and current_org.parent_id:
            univ_id = current_org.parent_id

        child_institutions = db.query(Organization).filter(Organization.parent_id == univ_id).all()
        affiliated_org_ids = [univ_id] + [inst.id for inst in child_institutions]

        stats.total_universities = 1
        stats.total_institutions = len(child_institutions)

        dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id.in_(affiliated_org_ids)).all()]
        stats.total_departments = len(dept_ids)

        prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id.in_(dept_ids)).all()]
        stats.total_programs = len(prog_ids)

        sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()]
        subj_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()]
        stats.total_subjects = len(subj_ids)

        stats.total_users = db.query(User).filter(User.organization_id.in_(affiliated_org_ids)).count()
        stats.total_faculty = db.query(User).filter(User.organization_id.in_(affiliated_org_ids), User.role_name == "FACULTY").count()
        stats.total_students = db.query(User).filter(User.organization_id.in_(affiliated_org_ids), User.role_name == "STUDENT").count()

        q_query = db.query(Question).filter(Question.subject_id.in_(subj_ids)) if subj_ids else db.query(Question).filter(False)
        stats.total_questions = q_query.count()
        stats.approved_questions = q_query.filter(Question.status == "APPROVED").count()
        stats.pending_questions = q_query.filter(Question.status.in_(["SUBMITTED", "UNDER_REVIEW"])).count()

        p_query = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(subj_ids)) if subj_ids else db.query(QuestionPaper).filter(False)
        stats.total_papers = p_query.count()
        stats.published_papers = p_query.filter(QuestionPaper.status == "PUBLISHED").count()
        stats.pending_papers = p_query.filter(QuestionPaper.status.in_(["DRAFT", "GENERATED", "UNDER_REVIEW"])).count()

        logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(8).all()
        stats.recent_activity = [
            {
                "id": l.id,
                "action": l.action,
                "entity_type": l.entity_type,
                "user_email": l.user.email if l.user else "System",
                "created_at": l.created_at.isoformat()
            } for l in logs
        ]
        stats.role_summary = {
            "title": "University Academic Executive",
            "scope": stats.organization_name or "University",
            "affiliated_colleges": len(child_institutions)
        }

    elif role == "INSTITUTION_ADMIN":
        inst_id = current_user.organization_id
        stats.total_universities = 1
        stats.total_institutions = 1

        dept_ids = [d.id for d in db.query(Department.id).filter(Department.organization_id == inst_id).all()]
        stats.total_departments = len(dept_ids)

        prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id.in_(dept_ids)).all()]
        stats.total_programs = len(prog_ids)

        sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()]
        subj_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()]
        stats.total_subjects = len(subj_ids)

        stats.total_users = db.query(User).filter(User.organization_id == inst_id).count()
        stats.total_faculty = db.query(User).filter(User.organization_id == inst_id, User.role_name == "FACULTY").count()
        stats.total_students = db.query(User).filter(User.organization_id == inst_id, User.role_name == "STUDENT").count()

        q_query = db.query(Question).filter(Question.subject_id.in_(subj_ids)) if subj_ids else db.query(Question).filter(False)
        stats.total_questions = q_query.count()
        stats.approved_questions = q_query.filter(Question.status == "APPROVED").count()
        stats.pending_questions = q_query.filter(Question.status.in_(["SUBMITTED", "UNDER_REVIEW"])).count()

        p_query = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(subj_ids)) if subj_ids else db.query(QuestionPaper).filter(False)
        stats.total_papers = p_query.count()
        stats.published_papers = p_query.filter(QuestionPaper.status == "PUBLISHED").count()
        stats.pending_papers = p_query.filter(QuestionPaper.status.in_(["DRAFT", "GENERATED", "UNDER_REVIEW"])).count()

        logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(8).all()
        stats.recent_activity = [
            {
                "id": l.id,
                "action": l.action,
                "entity_type": l.entity_type,
                "user_email": l.user.email if l.user else "System",
                "created_at": l.created_at.isoformat()
            } for l in logs
        ]
        stats.role_summary = {
            "title": "College Principal / Dean",
            "scope": stats.organization_name or "College"
        }

    elif role == "HOD":
        dept_id = current_user.department_id
        stats.total_departments = 1

        prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id == dept_id).all()]
        stats.total_programs = len(prog_ids)

        sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()]
        subj_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()]
        stats.total_subjects = len(subj_ids)

        stats.total_faculty = db.query(User).filter(User.department_id == dept_id, User.role_name == "FACULTY").count()
        stats.total_students = db.query(User).filter(User.department_id == dept_id, User.role_name == "STUDENT").count()
        stats.total_users = stats.total_faculty + stats.total_students + 1

        # Syllabus units in this department
        stats.syllabus_units_count = db.query(Unit).join(Syllabus, Unit.syllabus_id == Syllabus.id).filter(Syllabus.subject_id.in_(subj_ids)).count() if subj_ids else 0

        q_query = db.query(Question).filter(Question.subject_id.in_(subj_ids)) if subj_ids else db.query(Question).filter(False)
        stats.total_questions = q_query.count()
        stats.approved_questions = q_query.filter(Question.status == "APPROVED").count()
        stats.pending_questions = q_query.filter(Question.status.in_(["SUBMITTED", "UNDER_REVIEW"])).count()

        p_query = db.query(QuestionPaper).filter(QuestionPaper.subject_id.in_(subj_ids)) if subj_ids else db.query(QuestionPaper).filter(False)
        stats.total_papers = p_query.count()
        stats.published_papers = p_query.filter(QuestionPaper.status == "PUBLISHED").count()
        stats.pending_papers = p_query.filter(QuestionPaper.status.in_(["DRAFT", "GENERATED", "UNDER_REVIEW"])).count()

        logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(8).all()
        stats.recent_activity = [
            {
                "id": l.id,
                "action": l.action,
                "entity_type": l.entity_type,
                "user_email": l.user.email if l.user else "System",
                "created_at": l.created_at.isoformat()
            } for l in logs
        ]
        stats.role_summary = {
            "title": "Head of Department",
            "scope": stats.department_name or "Academic Department",
            "awaiting_hod_review": stats.pending_questions + stats.pending_papers
        }

    elif role == "FACULTY":
        assignments = db.query(FacultyAssignment).filter(FacultyAssignment.user_id == current_user.id).all()
        assigned_subj_ids = [a.subject_id for a in assignments]
        
        if not assigned_subj_ids and current_user.department_id:
            prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id == current_user.department_id).all()]
            sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()]
            assigned_subj_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()]

        stats.assigned_subjects = len(assigned_subj_ids)
        stats.total_subjects = len(assigned_subj_ids)

        my_q = db.query(Question).filter(Question.created_by == current_user.id)
        stats.my_questions = my_q.count()
        stats.my_draft_questions = my_q.filter(Question.status == "DRAFT").count()
        stats.my_submitted_questions = my_q.filter(Question.status.in_(["SUBMITTED", "UNDER_REVIEW"])).count()
        stats.my_approved_questions = my_q.filter(Question.status == "APPROVED").count()

        stats.total_questions = stats.my_questions
        stats.approved_questions = stats.my_approved_questions
        stats.pending_questions = stats.my_submitted_questions

        my_p = db.query(QuestionPaper).filter(QuestionPaper.created_by == current_user.id)
        stats.total_papers = my_p.count()
        stats.published_papers = my_p.filter(QuestionPaper.status == "PUBLISHED").count()
        stats.pending_papers = my_p.filter(QuestionPaper.status.in_(["DRAFT", "GENERATED", "UNDER_REVIEW"])).count()

        if assigned_subj_ids:
            stats.syllabus_units_count = db.query(Unit).join(Syllabus, Unit.syllabus_id == Syllabus.id).filter(Syllabus.subject_id.in_(assigned_subj_ids)).count()

        logs = db.query(AuditLog).filter(AuditLog.user_id == current_user.id).order_by(desc(AuditLog.created_at)).limit(6).all()
        if not logs:
            logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(6).all()

        stats.recent_activity = [
            {
                "id": l.id,
                "action": l.action,
                "entity_type": l.entity_type,
                "user_email": l.user.email if l.user else "System",
                "created_at": l.created_at.isoformat()
            } for l in logs
        ]
        stats.role_summary = {
            "title": "Faculty Member / Question Author",
            "scope": stats.department_name or "Faculty",
            "questions_authored": stats.my_questions
        }

    elif role == "STUDENT":
        enrollment = db.query(StudentEnrollment).filter(StudentEnrollment.user_id == current_user.id, StudentEnrollment.is_active == True).first()
        enrolled_subj_ids = []
        if enrollment and enrollment.semester_id:
            enrolled_subj_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id == enrollment.semester_id).all()]
        elif current_user.department_id:
            prog_ids = [p.id for p in db.query(Program.id).filter(Program.department_id == current_user.department_id).all()]
            sem_ids = [s.id for s in db.query(Semester.id).filter(Semester.program_id.in_(prog_ids)).all()]
            enrolled_subj_ids = [s.id for s in db.query(Subject.id).filter(Subject.semester_id.in_(sem_ids)).all()]
        else:
            enrolled_subj_ids = [s.id for s in db.query(Subject.id).all()]

        stats.enrolled_subjects = len(enrolled_subj_ids)
        stats.total_subjects = len(enrolled_subj_ids)

        pub_p_query = db.query(QuestionPaper).filter(QuestionPaper.status == "PUBLISHED")
        if enrolled_subj_ids:
            pub_p_query = pub_p_query.filter(QuestionPaper.subject_id.in_(enrolled_subj_ids))

        stats.total_papers = pub_p_query.count()
        stats.published_papers = stats.total_papers

        if enrolled_subj_ids:
            stats.syllabus_units_count = db.query(Unit).join(Syllabus, Unit.syllabus_id == Syllabus.id).filter(Syllabus.subject_id.in_(enrolled_subj_ids)).count()

        pub_papers = pub_p_query.order_by(desc(QuestionPaper.updated_at)).limit(6).all()
        stats.recent_activity = [
            {
                "id": p.id,
                "action": "PAPER_PUBLISHED",
                "entity_type": "QuestionPaper",
                "user_email": p.title,
                "created_at": p.updated_at.isoformat() if p.updated_at else p.created_at.isoformat()
            } for p in pub_papers
        ]
        stats.role_summary = {
            "title": "Student Scholar",
            "scope": stats.organization_name or "Academic Campus",
            "available_papers": stats.published_papers
        }

    return StandardResponse(data=stats)
