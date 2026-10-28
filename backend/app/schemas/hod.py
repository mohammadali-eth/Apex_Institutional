from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr, model_validator
from datetime import datetime

# ==============================================================================
# HOD Dashboard Stats
# ==============================================================================

class HODFacultyStats(BaseModel):
    total_faculty: int = 0
    active_faculty: int = 0

class HODCurriculumStats(BaseModel):
    total_programs: int = 0
    total_subjects: int = 0
    total_syllabus_units: int = 0

class HODQuestionStats(BaseModel):
    total_questions: int = 0
    pending_review: int = 0
    approved_questions: int = 0
    rejected_questions: int = 0
    revision_required: int = 0

class HODPaperStats(BaseModel):
    total_papers: int = 0
    pending_approval: int = 0
    approved_papers: int = 0
    published_papers: int = 0

class HODExamStats(BaseModel):
    total_exams: int = 0
    upcoming_exams: int = 0

class HODDashboardStats(BaseModel):
    department_id: str
    department_name: str
    department_code: str
    university_id: str
    university_name: str
    faculty_stats: HODFacultyStats
    curriculum_stats: HODCurriculumStats
    question_stats: HODQuestionStats
    paper_stats: HODPaperStats
    exam_stats: HODExamStats
    pending_reviewer_assignments: int = 0
    recent_activity: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)

# ==============================================================================
# Faculty Management Schemas
# ==============================================================================

class HODFacultyItem(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    employee_code: Optional[str] = None
    role_name: str
    is_active: bool
    must_change_password: bool = False
    assigned_subjects: List[Dict[str, Any]] = []
    assigned_subjects_count: int = 0
    questions_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HODFacultyCreateRequest(BaseModel):
    full_name: str = ""
    name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    employee_code: Optional[str] = None
    subject_ids: Optional[List[str]] = []
    password: Optional[str] = None
    is_active: bool = True

    @model_validator(mode="before")
    @classmethod
    def resolve_name_fields(cls, data: Any):
        if isinstance(data, dict):
            if "name" in data and not data.get("full_name"):
                data["full_name"] = data["name"]
        return data

class HODFacultyUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    employee_code: Optional[str] = None
    is_active: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_name_fields(cls, data: Any):
        if isinstance(data, dict):
            if "name" in data and not data.get("full_name"):
                data["full_name"] = data["name"]
        return data

class HODSubjectAssignmentRequest(BaseModel):
    subject_ids: List[str]

# ==============================================================================
# Academic Programs & Subjects Schemas
# ==============================================================================

class HODProgramItem(BaseModel):
    id: str
    name: str
    code: str
    degree_level: str
    total_semesters: int
    is_active: bool
    subjects_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HODProgramCreateRequest(BaseModel):
    name: str
    code: str
    degree_level: str = "UG"
    total_semesters: int = 6
    is_active: bool = True

class HODProgramUpdateRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    degree_level: Optional[str] = None
    total_semesters: Optional[int] = None
    is_active: Optional[bool] = None

class HODSubjectItem(BaseModel):
    id: str
    program_id: Optional[str] = None
    program_name: Optional[str] = None
    semester_id: Optional[str] = None
    semester_number: Optional[int] = None
    name: str
    code: str
    credits: int
    description: Optional[str] = None
    is_active: bool
    units_count: int = 0
    assigned_teachers: List[Dict[str, Any]] = []
    questions_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HODSubjectCreateRequest(BaseModel):
    program_id: str
    semester_number: int = 1
    name: str
    code: str
    credits: int = 3
    description: Optional[str] = None
    is_active: bool = True

class HODSubjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    credits: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

# ==============================================================================
# Syllabus & Units Schemas
# ==============================================================================

class HODTopicItem(BaseModel):
    id: str
    title: str
    order_index: int

    model_config = ConfigDict(from_attributes=True)

class HODUnitItem(BaseModel):
    id: str
    unit_number: int
    title: str
    description: Optional[str] = None
    hours: int = 0
    topics: List[HODTopicItem] = []

    model_config = ConfigDict(from_attributes=True)

class HODSyllabusOverviewItem(BaseModel):
    subject_id: str
    subject_code: str
    subject_name: str
    program_name: Optional[str] = None
    syllabus_id: Optional[str] = None
    version: Optional[str] = None
    is_active: bool = True
    units_count: int = 0
    document_url: Optional[str] = None
    units: List[HODUnitItem] = []

class HODUnitCreateRequest(BaseModel):
    unit_number: int
    title: str
    description: Optional[str] = None
    hours: int = 10

class HODUnitUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    hours: Optional[int] = None

class HODTopicCreateRequest(BaseModel):
    title: str
    order_index: int = 0

# ==============================================================================
# Review & Decision Schemas
# ==============================================================================

class HODQuestionReviewRequest(BaseModel):
    action: str # APPROVE, REJECT, REQUEST_REVISION
    comments: Optional[str] = None

class HODPaperReviewRequest(BaseModel):
    action: str # APPROVE, REJECT, REQUEST_REVISION
    comments: Optional[str] = None

class HODAssignReviewerRequest(BaseModel):
    reviewer_id: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    notes: Optional[str] = None

# ==============================================================================
# Department Examination Schemas
# ==============================================================================

class HODExamItem(BaseModel):
    id: str
    subject_id: str
    subject_code: str
    subject_name: str
    title: str
    description: Optional[str] = None
    test_type: str
    difficulty: str
    duration_minutes: int
    total_marks: int
    passing_marks: int
    instructions: Optional[str] = None
    is_published: bool
    attempt_limit: int
    questions_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HODExamCreateRequest(BaseModel):
    subject_id: str
    title: str
    description: Optional[str] = None
    test_type: str = "OFFICIAL"
    difficulty: str = "MEDIUM"
    duration_minutes: int = 60
    total_marks: int = 50
    passing_marks: int = 20
    instructions: Optional[str] = None
    is_published: bool = False
    attempt_limit: int = 1

class HODExamUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    duration_minutes: Optional[int] = None
    total_marks: Optional[int] = None
    passing_marks: Optional[int] = None
    instructions: Optional[str] = None
    is_published: Optional[bool] = None
    attempt_limit: Optional[int] = None

# ==============================================================================
# Reports Schemas
# ==============================================================================

class HODReportFacultyWorkload(BaseModel):
    faculty_id: str
    faculty_name: str
    email: str
    assigned_subjects: int
    questions_submitted: int
    questions_approved: int
    reviews_completed: int

class HODReportQuestionHealth(BaseModel):
    subject_code: str
    subject_name: str
    total_questions: int
    easy: int
    medium: int
    hard: int
    approved: int
    pending: int
    rejected: int

class HODReportPaperReadiness(BaseModel):
    subject_code: str
    subject_name: str
    paper_title: str
    status: str
    total_marks: int
    questions_count: int
    approved_by: Optional[str] = None
    created_at: datetime

class HODReportsData(BaseModel):
    department_name: str
    faculty_workload: List[HODReportFacultyWorkload]
    question_health: List[HODReportQuestionHealth]
    paper_readiness: List[HODReportPaperReadiness]
