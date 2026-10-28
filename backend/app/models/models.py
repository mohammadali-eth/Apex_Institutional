import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Boolean, Text, ForeignKey,
    DateTime, Float, Table, UniqueConstraint, Index, JSON
)
from sqlalchemy.orm import relationship
from app.database.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

# Many-to-Many association tables
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', String(36), ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', String(36), ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
)

user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', String(36), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('role_id', String(36), ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
)

class Role(Base):
    __tablename__ = 'roles'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    
    permissions = relationship('Permission', secondary=role_permissions, back_populates='roles')
    users = relationship('User', secondary=user_roles, back_populates='roles')

class Permission(Base):
    __tablename__ = 'permissions'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False, index=True)
    module = Column(String(50), nullable=False)
    description = Column(String(255), nullable=True)
    
    roles = relationship('Role', secondary=role_permissions, back_populates='permissions')

class Organization(Base):
    """University or Institution level entity"""
    __tablename__ = 'organizations'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    type = Column(String(50), default="UNIVERSITY") # UNIVERSITY, COLLEGE, INSTITUTE
    parent_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True, index=True)
    address = Column(Text, nullable=True)
    website = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    parent = relationship('Organization', remote_side=[id], backref='institutions')
    theme = relationship('UniversityTheme', back_populates='university', uselist=False, cascade='all, delete-orphan')
    departments = relationship('Department', back_populates='organization', cascade='all, delete-orphan')
    users = relationship('User', back_populates='organization')
    templates = relationship('QuestionPaperTemplate', back_populates='organization')

class UniversityTheme(Base):
    """University-specific branding and CSS theme overrides"""
    __tablename__ = 'university_themes'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    university_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), unique=True, nullable=False, index=True)
    primary_color = Column(String(20), default="#82c341")
    secondary_color = Column(String(20), default="#45525b")
    background_color = Column(String(20), default="#f3f3f3")
    font_color = Column(String(20), default="#838383")
    title_color = Column(String(20), default="#44535b")
    paragraph_color = Column(String(20), default="#676767")
    bg_text_color = Column(String(20), default="#dcdcdc")
    bg_title_color = Column(String(20), default="#f6f6f7")
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    login_banner_text = Column(String(255), nullable=True)
    sidebar_style = Column(String(50), default="default")
    is_dark_mode_supported = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    university = relationship('Organization', back_populates='theme')

class Department(Base):
    """Academic Department (e.g. Computer Science, Mathematics)"""
    __tablename__ = 'departments'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    __table_args__ = (
        UniqueConstraint('organization_id', 'code', name='uq_org_dept_code'),
    )

    organization = relationship('Organization', back_populates='departments')
    programs = relationship('Program', back_populates='department', cascade='all, delete-orphan')
    users = relationship('User', back_populates='department')

class Program(Base):
    """Academic Degree / Program (e.g. BCA, MCA, B.Tech, M.Tech)"""
    __tablename__ = 'programs'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    department_id = Column(String(36), ForeignKey('departments.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=False)
    degree_level = Column(String(50), default="UG") # UG, PG, DIPLOMA, PH_D
    total_semesters = Column(Integer, default=6)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    __table_args__ = (
        UniqueConstraint('department_id', 'code', name='uq_dept_program_code'),
    )

    department = relationship('Department', back_populates='programs')
    semesters = relationship('Semester', back_populates='program', cascade='all, delete-orphan')

class AcademicYear(Base):
    """Academic Year entity e.g. 2026-27"""
    __tablename__ = 'academic_years'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), unique=True, nullable=False, index=True) # e.g. "2026-2027"
    is_current = Column(Boolean, default=False)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)

class Semester(Base):
    """Semester entity linked to Program"""
    __tablename__ = 'semesters'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    program_id = Column(String(36), ForeignKey('programs.id', ondelete='CASCADE'), nullable=False, index=True)
    number = Column(Integer, nullable=False)
    name = Column(String(50), nullable=False) # e.g. "Semester 1", "Semester 4"
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    __table_args__ = (
        UniqueConstraint('program_id', 'number', name='uq_program_semester_num'),
    )

    program = relationship('Program', back_populates='semesters')
    subjects = relationship('Subject', back_populates='semester', cascade='all, delete-orphan')

class Subject(Base):
    """Subject / Course entity"""
    __tablename__ = 'subjects'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    semester_id = Column(String(36), ForeignKey('semesters.id', ondelete='CASCADE'), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True) # e.g. "BCA401"
    name = Column(String(200), nullable=False) # e.g. "Database Management Systems"
    credits = Column(Integer, default=4)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    semester = relationship('Semester', back_populates='subjects')
    syllabi = relationship('Syllabus', back_populates='subject', cascade='all, delete-orphan')
    questions = relationship('Question', back_populates='subject', cascade='all, delete-orphan')
    papers = relationship('QuestionPaper', back_populates='subject')

class Syllabus(Base):
    """Syllabus entity attached to a Subject"""
    __tablename__ = 'syllabi'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    subject_id = Column(String(36), ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False, index=True)
    academic_year_id = Column(String(36), ForeignKey('academic_years.id', ondelete='SET NULL'), nullable=True)
    title = Column(String(200), nullable=False)
    version = Column(Integer, default=1)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, default=0)
    file_type = Column(String(50), nullable=True) # PDF, DOCX, TXT
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    subject = relationship('Subject', back_populates='syllabi')
    units = relationship('Unit', back_populates='syllabus', cascade='all, delete-orphan', order_by='Unit.unit_number')
    versions = relationship('SyllabusVersion', back_populates='syllabus', cascade='all, delete-orphan')

class SyllabusVersion(Base):
    """Tracks syllabus historical revisions"""
    __tablename__ = 'syllabus_versions'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    syllabus_id = Column(String(36), ForeignKey('syllabi.id', ondelete='CASCADE'), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    change_summary = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    created_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    syllabus = relationship('Syllabus', back_populates='versions')

class Unit(Base):
    """Curriculum Unit / Module"""
    __tablename__ = 'units'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    syllabus_id = Column(String(36), ForeignKey('syllabi.id', ondelete='CASCADE'), nullable=False, index=True)
    unit_number = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    __table_args__ = (
        UniqueConstraint('syllabus_id', 'unit_number', name='uq_syllabus_unit_num'),
    )

    syllabus = relationship('Syllabus', back_populates='units')
    topics = relationship('Topic', back_populates='unit', cascade='all, delete-orphan', order_by='Topic.topic_number')
    questions = relationship('Question', back_populates='unit')

class Topic(Base):
    """Specific Topic within a Unit"""
    __tablename__ = 'topics'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    unit_id = Column(String(36), ForeignKey('units.id', ondelete='CASCADE'), nullable=False, index=True)
    topic_number = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    unit = relationship('Unit', back_populates='topics')
    questions = relationship('Question', back_populates='topic')

class User(Base):
    """User accounts across all roles"""
    __tablename__ = 'users'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role_name = Column(String(50), nullable=False, default="FACULTY", index=True) # Primary role string
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True, index=True)
    department_id = Column(String(36), ForeignKey('departments.id', ondelete='SET NULL'), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False)
    invitation_token = Column(String(100), nullable=True, index=True)
    reset_token = Column(String(100), nullable=True, index=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    organization = relationship('Organization', back_populates='users')
    department = relationship('Department', back_populates='users')
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    scopes = relationship('UserScope', back_populates='user', cascade='all, delete-orphan')
    questions_created = relationship('Question', foreign_keys='Question.created_by', back_populates='creator')
    papers_created = relationship('QuestionPaper', foreign_keys='QuestionPaper.created_by', back_populates='creator')
    audit_logs = relationship('AuditLog', back_populates='user')

class UserScope(Base):
    """Explicit scope mapping for user access control (Platform, University, Institution, Department, Academic)"""
    __tablename__ = 'user_scopes'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    scope_type = Column(String(50), nullable=False) # PLATFORM, UNIVERSITY, INSTITUTION, DEPARTMENT, SUBJECT, SELF
    scope_entity_id = Column(String(36), nullable=True) # ID of university, institution, department, or subject
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    user = relationship('User', back_populates='scopes')

class FacultyAssignment(Base):
    """Faculty academic assignment to subjects"""
    __tablename__ = 'faculty_assignments'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    subject_id = Column(String(36), ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False, index=True)
    academic_year_id = Column(String(36), ForeignKey('academic_years.id', ondelete='SET NULL'), nullable=True)
    role_type = Column(String(50), default="TEACHER") # TEACHER, QUESTION_SETTER, REVIEWER
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    user = relationship('User')
    subject = relationship('Subject')

class StudentEnrollment(Base):
    """Student enrollment in program and semester"""
    __tablename__ = 'student_enrollments'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    program_id = Column(String(36), ForeignKey('programs.id', ondelete='CASCADE'), nullable=False, index=True)
    semester_id = Column(String(36), ForeignKey('semesters.id', ondelete='CASCADE'), nullable=False, index=True)
    roll_number = Column(String(50), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    user = relationship('User')
    program = relationship('Program')
    semester = relationship('Semester')

class Question(Base):
    """Question entity with multi-type and status lifecycle"""
    __tablename__ = 'questions'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    subject_id = Column(String(36), ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False, index=True)
    unit_id = Column(String(36), ForeignKey('units.id', ondelete='SET NULL'), nullable=True, index=True)
    topic_id = Column(String(36), ForeignKey('topics.id', ondelete='SET NULL'), nullable=True, index=True)
    
    question_text = Column(Text, nullable=False)
    # Types: MCQ, TRUE_FALSE, FILL_BLANK, DESCRIPTIVE
    question_type = Column(String(50), nullable=False, index=True)
    marks = Column(Integer, nullable=False, default=1, index=True) # 1, 2, 3, 4, 5, 8, 10
    # Difficulty: EASY, MEDIUM, HARD
    difficulty = Column(String(50), nullable=False, default="MEDIUM", index=True)
    # Status: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, ARCHIVED
    status = Column(String(50), nullable=False, default="DRAFT", index=True)
    language = Column(String(20), default="English")
    bloom_level = Column(String(50), nullable=False, default="UNDERSTAND", index=True) # REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE
    source_type = Column(String(50), nullable=False, default="QUESTION_BANK", index=True) # QUESTION_BANK, AI_GENERATED
    marking_rubric = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    expected_answer = Column(Text, nullable=True)
    
    created_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    updated_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reviewer_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    review_feedback = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    subject = relationship('Subject', back_populates='questions')
    unit = relationship('Unit', back_populates='questions')
    topic = relationship('Topic', back_populates='questions')
    creator = relationship('User', foreign_keys=[created_by], back_populates='questions_created')
    reviewer = relationship('User', foreign_keys=[reviewer_id])
    options = relationship('QuestionOption', back_populates='question', cascade='all, delete-orphan', order_by='QuestionOption.option_key')
    tags = relationship('QuestionTag', back_populates='question', cascade='all, delete-orphan')
    approvals = relationship('QuestionApproval', back_populates='question', cascade='all, delete-orphan')

class QuestionOption(Base):
    """Options for MCQ questions"""
    __tablename__ = 'question_options'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    question_id = Column(String(36), ForeignKey('questions.id', ondelete='CASCADE'), nullable=False, index=True)
    option_key = Column(String(10), nullable=False) # "A", "B", "C", "D"
    option_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)

    question = relationship('Question', back_populates='options')

class QuestionTag(Base):
    """Tags/keywords for taxonomy classification"""
    __tablename__ = 'question_tags'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    question_id = Column(String(36), ForeignKey('questions.id', ondelete='CASCADE'), nullable=False, index=True)
    tag = Column(String(100), nullable=False, index=True)

    question = relationship('Question', back_populates='tags')

class QuestionApproval(Base):
    """Audit track of question lifecycle status transitions"""
    __tablename__ = 'question_approvals'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    question_id = Column(String(36), ForeignKey('questions.id', ondelete='CASCADE'), nullable=False, index=True)
    reviewer_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    previous_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    question = relationship('Question', back_populates='approvals')
    reviewer = relationship('User')

class QuestionPaper(Base):
    """Question paper entity containing sections and questions"""
    __tablename__ = 'question_papers'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    subject_id = Column(String(36), ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False, index=True)
    academic_year_id = Column(String(36), ForeignKey('academic_years.id', ondelete='SET NULL'), nullable=True)
    semester_id = Column(String(36), ForeignKey('semesters.id', ondelete='SET NULL'), nullable=True)
    
    title = Column(String(255), nullable=False)
    exam_name = Column(String(200), nullable=False) # e.g. "End Semester Examination 2026-27"
    duration_minutes = Column(Integer, default=180) # 3 hours
    total_marks = Column(Integer, nullable=False, default=70)
    # Status: DRAFT, GENERATED, UNDER_REVIEW, APPROVED, REJECTED, PUBLISHED, ARCHIVED
    status = Column(String(50), nullable=False, default="DRAFT", index=True)
    instructions = Column(Text, nullable=True)
    version = Column(Integer, default=1)
    is_syllabus_grounded = Column(Boolean, default=True)
    syllabus_version = Column(Integer, default=1)
    generation_mode = Column(String(50), default="SYLLABUS_GROUNDED") # SYLLABUS_GROUNDED, FALLBACK
    
    created_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    reviewed_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    is_locked = Column(Boolean, default=False)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    finalized_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    finalization_hash = Column(String(128), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    revision_comments = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    subject = relationship('Subject', back_populates='papers')
    creator = relationship('User', foreign_keys=[created_by], back_populates='papers_created')
    reviewer = relationship('User', foreign_keys=[reviewed_by])
    approver = relationship('User', foreign_keys=[approved_by])
    finalizer = relationship('User', foreign_keys=[finalized_by])
    sections = relationship('QuestionPaperSection', back_populates='paper', cascade='all, delete-orphan', order_by='QuestionPaperSection.order_index')
    releases = relationship('PaperRelease', back_populates='paper', cascade='all, delete-orphan')
    blueprint = relationship('PaperBlueprint', back_populates='paper', uselist=False, cascade='all, delete-orphan')
    validation_reports = relationship('PaperValidationReport', back_populates='paper', cascade='all, delete-orphan', order_by='PaperValidationReport.created_at.desc()')

class QuestionPaperSection(Base):
    """Section in a question paper (e.g. Section A: Objective, Section B: Short, Section C: Long)"""
    __tablename__ = 'question_paper_sections'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    paper_id = Column(String(36), ForeignKey('question_papers.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(100), nullable=False) # "Section A", "Section B", or custom
    instructions = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    section_type = Column(String(50), default="STANDARD") # STANDARD, CHOICE_SECTION
    total_marks = Column(Integer, default=0) # Target attempt marks for this section
    displayed_marks = Column(Integer, default=0) # Sum of marks of all questions in section
    required_attempts = Column(Integer, nullable=True) # e.g. 5 for attempt any 5
    selection_rule = Column(String(50), default="ALL") # ALL, ATTEMPT_ANY_N

    paper = relationship('QuestionPaper', back_populates='sections')
    questions = relationship('QuestionPaperQuestion', back_populates='section', cascade='all, delete-orphan', order_by='QuestionPaperQuestion.order_index')

class QuestionPaperQuestion(Base):
    """Association of a Question inside a Paper Section with ordering and marks"""
    __tablename__ = 'question_paper_questions'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    section_id = Column(String(36), ForeignKey('question_paper_sections.id', ondelete='CASCADE'), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey('questions.id', ondelete='CASCADE'), nullable=False, index=True)
    order_index = Column(Integer, default=0)
    marks = Column(Integer, nullable=False, default=1)
    is_compulsory = Column(Boolean, default=True)
    or_group_id = Column(String(36), nullable=True) # Kept for backward compatibility
    group_id = Column(String(36), nullable=True, index=True) # Unified question group ID
    group_type = Column(String(50), default="SINGLE") # SINGLE, OR_PAIR, OR_GROUP, ATTEMPT_ANY_N
    selection_rule = Column(String(50), default="SINGLE") # SINGLE, OR_PAIR, OR_GROUP, ATTEMPT_ANY_N
    required_attempts = Column(Integer, default=1)
    alternative_label = Column(String(10), nullable=True) # "a", "b", "c", etc.
    group_marks = Column(Integer, nullable=True) # Max attempt marks for the group
    source_type = Column(String(50), nullable=False, default="QUESTION_BANK", index=True) # QUESTION_BANK, AI_GENERATED
    bloom_level = Column(String(50), nullable=False, default="UNDERSTAND", index=True)
    marking_scheme = Column(Text, nullable=True)
    expected_answer = Column(Text, nullable=True)
    syllabus_provenance = Column(JSON, nullable=True)

    section = relationship('QuestionPaperSection', back_populates='questions')
    question = relationship('Question')

class PaperBlueprint(Base):
    """Snapshot of examination blueprint configured for paper generation"""
    __tablename__ = 'paper_blueprints'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    paper_id = Column(String(36), ForeignKey('question_papers.id', ondelete='CASCADE'), nullable=True, index=True)
    subject_id = Column(String(36), ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    exam_name = Column(String(200), nullable=False)
    duration_minutes = Column(Integer, default=180)
    total_marks = Column(Integer, nullable=False, default=70)
    
    # Store complete blueprint configuration as JSON
    blueprint_config = Column(JSON, nullable=False)
    source_ratio = Column(JSON, nullable=True) # {"bank_percentage": 50, "ai_percentage": 50}
    difficulty_target = Column(JSON, nullable=True) # {"easy": 30, "medium": 50, "hard": 20}
    bloom_target = Column(JSON, nullable=True)
    unit_weightage = Column(JSON, nullable=True)
    
    created_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    paper = relationship('QuestionPaper', back_populates='blueprint')
    subject = relationship('Subject')
    creator = relationship('User')

class PaperValidationReport(Base):
    """Persisted validation report of a Question Paper against blueprint and rules"""
    __tablename__ = 'paper_validation_reports'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    paper_id = Column(String(36), ForeignKey('question_papers.id', ondelete='CASCADE'), nullable=False, index=True)
    
    is_valid = Column(Boolean, default=False, nullable=False)
    status = Column(String(50), default="FAILED", nullable=False) # PASSED, PASSED_WITH_WARNINGS, FAILED
    total_marks_expected = Column(Integer, nullable=False)
    total_marks_actual = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    duplicate_count = Column(Integer, default=0)
    
    errors = Column(JSON, default=list) # List[str]
    warnings = Column(JSON, default=list) # List[str]
    unit_coverage = Column(JSON, default=dict) # Dict[str, int]
    difficulty_breakdown = Column(JSON, default=dict) # Dict[str, int]
    bloom_breakdown = Column(JSON, default=dict) # Dict[str, int]
    source_composition = Column(JSON, default=dict) # {"QUESTION_BANK": int, "AI_GENERATED": int}
    deduplication_summary = Column(JSON, default=dict)
    grounding_checks = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    paper = relationship('QuestionPaper', back_populates='validation_reports')

class GenerationJob(Base):
    """Tracks asynchronous/synchronous paper generation tasks and progress"""
    __tablename__ = 'generation_jobs'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    subject_id = Column(String(36), ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False, index=True)
    paper_id = Column(String(36), ForeignKey('question_papers.id', ondelete='SET NULL'), nullable=True, index=True)
    
    status = Column(String(50), default="PENDING", nullable=False, index=True) # PENDING, PROCESSING, COMPLETED, FAILED
    progress = Column(Integer, default=0) # 0 to 100
    status_message = Column(String(255), default="Initializing")
    blueprint_data = Column(JSON, nullable=False)
    error_message = Column(Text, nullable=True)
    
    created_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    subject = relationship('Subject')
    paper = relationship('QuestionPaper')
    creator = relationship('User')

class QuestionPaperTemplate(Base):
    """Customizable University Exam Paper layout template"""
    __tablename__ = 'question_paper_templates'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    header_html = Column(Text, nullable=True)
    footer_html = Column(Text, nullable=True)
    instructions_template = Column(Text, nullable=True)
    max_marks = Column(Integer, default=70)
    duration_minutes = Column(Integer, default=180)
    sections_config = Column(JSON, nullable=True) # Dynamic layout structure, sections, rules
    created_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    organization = relationship('Organization', back_populates='templates')
    creator = relationship('User', foreign_keys=[created_by])

class AuditLog(Base):
    """Comprehensive system-wide audit trail"""
    __tablename__ = 'audit_logs'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, index=True)

    user = relationship('User', back_populates='audit_logs')

class ContactInquiry(Base):
    """Public inquiries and contact form submissions"""
    __tablename__ = 'contact_inquiries'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    ip_address = Column(String(50), nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

class StudentSyllabusProgress(Base):
    """Tracks student progress through syllabus topics"""
    __tablename__ = 'student_syllabus_progress'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    subject_id = Column(String(36), ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey('topics.id', ondelete='CASCADE'), nullable=False, index=True)
    is_completed = Column(Boolean, default=True)
    completed_at = Column(DateTime(timezone=True), default=get_utc_now)

    __table_args__ = (
        UniqueConstraint('user_id', 'topic_id', name='uq_user_topic_progress'),
    )

    user = relationship('User')
    subject = relationship('Subject')
    topic = relationship('Topic')

class OnlineTest(Base):
    """Official and practice online examinations"""
    __tablename__ = 'online_tests'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    subject_id = Column(String(36), ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    test_type = Column(String(50), default="PRACTICE_BANK") # OFFICIAL, PRACTICE_BANK, PRACTICE_AI
    difficulty = Column(String(50), default="MEDIUM") # EASY, MEDIUM, HARD, MIXED
    duration_minutes = Column(Integer, default=30)
    total_marks = Column(Integer, default=20)
    passing_marks = Column(Integer, default=8)
    instructions = Column(Text, nullable=True)
    is_published = Column(Boolean, default=True)
    attempt_limit = Column(Integer, default=3)
    negative_marking = Column(Float, default=0.0)
    created_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    subject = relationship('Subject')
    creator = relationship('User', foreign_keys=[created_by])
    questions = relationship('TestQuestionSnapshot', back_populates='test', cascade='all, delete-orphan', order_by='TestQuestionSnapshot.order_index')
    attempts = relationship('TestAttempt', back_populates='test', cascade='all, delete-orphan')

class TestQuestionSnapshot(Base):
    """Immutable snapshot of question content for a test"""
    __tablename__ = 'test_question_snapshots'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    test_id = Column(String(36), ForeignKey('online_tests.id', ondelete='CASCADE'), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey('questions.id', ondelete='SET NULL'), nullable=True)
    order_index = Column(Integer, default=0)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False) # MCQ, TRUE_FALSE, FILL_BLANK, DESCRIPTIVE
    marks = Column(Integer, default=1)
    options_json = Column(Text, nullable=True)
    correct_answer_key = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)

    test = relationship('OnlineTest', back_populates='questions')
    question = relationship('Question')

class TestAttempt(Base):
    """Student examination sitting attempt"""
    __tablename__ = 'test_attempts'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    test_id = Column(String(36), ForeignKey('online_tests.id', ondelete='CASCADE'), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    attempt_number = Column(Integer, default=1)
    status = Column(String(50), default="IN_PROGRESS", index=True) # IN_PROGRESS, SUBMITTED, TIMED_OUT, ABANDONED
    started_at = Column(DateTime(timezone=True), default=get_utc_now)
    deadline_at = Column(DateTime(timezone=True), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    total_score = Column(Float, default=0.0)
    auto_graded_score = Column(Float, default=0.0)
    manual_graded_score = Column(Float, default=0.0)
    is_graded = Column(Boolean, default=False)
    has_pending_descriptive = Column(Boolean, default=False)
    evaluator_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    test = relationship('OnlineTest', back_populates='attempts')
    student = relationship('User', foreign_keys=[student_id])
    answers = relationship('TestAttemptAnswer', back_populates='attempt', cascade='all, delete-orphan')
    events = relationship('TestLifecycleEvent', back_populates='attempt', cascade='all, delete-orphan')

class TestAttemptAnswer(Base):
    """Student answer response to a question snapshot"""
    __tablename__ = 'test_attempt_answers'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    attempt_id = Column(String(36), ForeignKey('test_attempts.id', ondelete='CASCADE'), nullable=False, index=True)
    question_snapshot_id = Column(String(36), ForeignKey('test_question_snapshots.id', ondelete='CASCADE'), nullable=False, index=True)
    selected_option_key = Column(String(50), nullable=True)
    answer_text = Column(Text, nullable=True)
    is_marked_for_review = Column(Boolean, default=False)
    is_graded = Column(Boolean, default=False)
    marks_awarded = Column(Float, default=0.0)
    evaluator_comment = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    __table_args__ = (
        UniqueConstraint('attempt_id', 'question_snapshot_id', name='uq_attempt_question_answer'),
    )

    attempt = relationship('TestAttempt', back_populates='answers')
    snapshot = relationship('TestQuestionSnapshot')

class TestLifecycleEvent(Base):
    """Audit log of student examination events (fullscreen, visibility, autosave)"""
    __tablename__ = 'test_lifecycle_events'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    attempt_id = Column(String(36), ForeignKey('test_attempts.id', ondelete='CASCADE'), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    event_data = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    attempt = relationship('TestAttempt', back_populates='events')


class Examination(Base):
    """Official university examination entity containing schedules and paper requirements"""
    __tablename__ = 'examinations'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    department_id = Column(String(36), ForeignKey('departments.id', ondelete='SET NULL'), nullable=True, index=True)
    program_id = Column(String(36), ForeignKey('programs.id', ondelete='SET NULL'), nullable=True, index=True)
    academic_year_id = Column(String(36), ForeignKey('academic_years.id', ondelete='SET NULL'), nullable=True)
    semester_id = Column(String(36), ForeignKey('semesters.id', ondelete='SET NULL'), nullable=True)
    subject_id = Column(String(36), ForeignKey('subjects.id', ondelete='SET NULL'), nullable=True, index=True)

    code = Column(String(50), nullable=False, index=True) # e.g. "EXAM-2026-DBMS"
    name = Column(String(200), nullable=False) # e.g. "End Semester Exam - Database Management Systems"
    exam_type = Column(String(50), default="FINAL") # MIDTERM, FINAL, SUPPLEMENTARY, PRACTICAL
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, default=180)
    total_marks = Column(Integer, default=100)
    venue = Column(String(100), nullable=True) # e.g. "Hall A - Ground Floor"
    paper_submission_deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="SCHEDULED", index=True) # SCHEDULED, IN_PROGRESS, COMPLETED, POSTPONED, CANCELLED

    created_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    organization = relationship('Organization')
    department = relationship('Department')
    program = relationship('Program')
    academic_year = relationship('AcademicYear')
    semester = relationship('Semester')
    subject = relationship('Subject')
    creator = relationship('User', foreign_keys=[created_by])
    coordinator_assignments = relationship('ExamCoordinatorAssignment', back_populates='examination', cascade='all, delete-orphan')
    readiness_items = relationship('ExamReadinessItem', back_populates='examination', cascade='all, delete-orphan')
    issues = relationship('ExamOperationalIssue', back_populates='examination', cascade='all, delete-orphan')


class ExamCoordinatorAssignment(Base):
    """Scope assignment linking an Exam Coordinator user to an Examination or Department"""
    __tablename__ = 'exam_coordinator_assignments'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    examination_id = Column(String(36), ForeignKey('examinations.id', ondelete='CASCADE'), nullable=True, index=True)
    department_id = Column(String(36), ForeignKey('departments.id', ondelete='CASCADE'), nullable=True, index=True)
    can_edit_schedule = Column(Boolean, default=False)
    assigned_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    assigned_at = Column(DateTime(timezone=True), default=get_utc_now)
    is_active = Column(Boolean, default=True)

    user = relationship('User', foreign_keys=[user_id])
    examination = relationship('Examination', back_populates='coordinator_assignments')
    department = relationship('Department')
    assigner = relationship('User', foreign_keys=[assigned_by])


class ExamReadinessItem(Base):
    """Track operational checklist item status for an examination"""
    __tablename__ = 'exam_readiness_items'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    examination_id = Column(String(36), ForeignKey('examinations.id', ondelete='CASCADE'), nullable=False, index=True)
    category = Column(String(50), nullable=False) # QUESTION_PAPER, SCHEDULING, OPERATIONAL, FINAL
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    is_required = Column(Boolean, default=True)
    status = Column(String(50), default="NOT_STARTED") # NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED, NOT_APPLICABLE
    notes = Column(Text, nullable=True)
    updated_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    examination = relationship('Examination', back_populates='readiness_items')
    updater = relationship('User', foreign_keys=[updated_by])


class ExamOperationalIssue(Base):
    """Operational issue or security incident tracking for examinations"""
    __tablename__ = 'exam_operational_issues'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    examination_id = Column(String(36), ForeignKey('examinations.id', ondelete='CASCADE'), nullable=False, index=True)
    subject_id = Column(String(36), ForeignKey('subjects.id', ondelete='SET NULL'), nullable=True)
    paper_id = Column(String(36), ForeignKey('question_papers.id', ondelete='SET NULL'), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False) # MISSING_PAPER, DELAYED_SUBMISSION, PENDING_REVIEW, SCHEDULING_CONFLICT, INCOMPLETE_CHECKLIST, MISSING_FACULTY, MATERIAL_SHORTAGE, SECURITY_CONCERN, OTHER
    severity = Column(String(50), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(50), default="OPEN", index=True) # OPEN, IN_PROGRESS, ESCALATED, RESOLVED, CLOSED
    reported_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    assigned_to = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    is_escalated = Column(Boolean, default=False)
    escalated_to = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    escalation_reason = Column(Text, nullable=True)
    escalated_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    examination = relationship('Examination', back_populates='issues')
    subject = relationship('Subject')
    paper = relationship('QuestionPaper')
    reporter = relationship('User', foreign_keys=[reported_by])
    assignee = relationship('User', foreign_keys=[assigned_to])
    escalated_user = relationship('User', foreign_keys=[escalated_to])


class ExamNotification(Base):
    """Audit and delivery record of coordination reminders and alerts"""
    __tablename__ = 'exam_notifications'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    recipient_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    examination_id = Column(String(36), ForeignKey('examinations.id', ondelete='SET NULL'), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="DEADLINE_REMINDER") # DEADLINE_REMINDER, OVERDUE_ALERT, REVIEW_PENDING, READINESS_ALERT, ISSUE_ESCALATION, SCHEDULE_CHANGE
    channel = Column(String(50), default="IN_APP") # IN_APP, EMAIL_PENDING, EMAIL_SENT, EMAIL_FAILED
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    recipient = relationship('User', foreign_keys=[recipient_id])
    sender = relationship('User', foreign_keys=[sender_id])
    examination = relationship('Examination')


class ExamScheduleAudit(Base):
    """Audit log of schedule modifications, previous values, and conflict logs"""
    __tablename__ = 'exam_schedule_audits'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    examination_id = Column(String(36), ForeignKey('examinations.id', ondelete='CASCADE'), nullable=False, index=True)
    actor_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = Column(String(100), nullable=False) # SCHEDULE_UPDATED, CONFLICT_DETECTED
    previous_value_json = Column(Text, nullable=True)
    new_value_json = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    examination = relationship('Examination')
    actor = relationship('User', foreign_keys=[actor_id])


class PaperRelease(Base):
    """Release management, schedule window, role authorization, and tamper checks"""
    __tablename__ = 'paper_releases'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    paper_id = Column(String(36), ForeignKey('question_papers.id', ondelete='CASCADE'), nullable=False, index=True)
    examination_id = Column(String(36), ForeignKey('examinations.id', ondelete='SET NULL'), nullable=True, index=True)
    release_status = Column(String(50), default="NOT_READY", index=True) # NOT_READY, AWAITING_AUTHORIZATION, SCHEDULED, RELEASED, REVOKED
    scheduled_release_at = Column(DateTime(timezone=True), nullable=True)
    released_at = Column(DateTime(timezone=True), nullable=True)
    released_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    release_notes = Column(Text, nullable=True)
    recipient_roles_json = Column(Text, nullable=True) # JSON list e.g. ["EXAM_COORDINATOR", "FACULTY"]
    download_token_hash = Column(String(128), nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    paper = relationship('QuestionPaper', back_populates='releases')
    examination = relationship('Examination')
    releaser = relationship('User', foreign_keys=[released_by])



