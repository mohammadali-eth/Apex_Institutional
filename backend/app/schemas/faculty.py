from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.schemas.question import QuestionOptionCreate, QuestionOptionResponse, QuestionResponse
from app.schemas.paper import QuestionPaperResponse, PaperValidationResult

class FacultySubjectItem(BaseModel):
    id: str
    code: str
    name: str
    credits: int = 3
    program_id: Optional[str] = None
    program_name: Optional[str] = None
    semester_id: Optional[str] = None
    semester_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    syllabus_version: int = 1
    syllabus_file_url: Optional[str] = None
    units_count: int = 0
    topics_count: int = 0
    questions_count: int = 0
    role_type: str = "TEACHER"
    assigned_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class FacultyTopicDetail(BaseModel):
    id: str
    topic_number: int
    title: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class FacultyUnitDetail(BaseModel):
    id: str
    unit_number: int
    title: str
    description: Optional[str] = None
    topics: List[FacultyTopicDetail] = []
    questions_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class FacultySubjectDetail(FacultySubjectItem):
    units: List[FacultyUnitDetail] = []

class FacultyFeedbackItem(BaseModel):
    id: str
    entity_type: str # "QUESTION" or "PAPER"
    title: str
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    status: str # "REVISION_REQUIRED", "REJECTED", "APPROVED"
    reviewer_name: Optional[str] = None
    feedback_comments: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class FacultyExamItem(BaseModel):
    id: str
    subject_id: str
    subject_code: str
    subject_name: str
    title: str
    description: Optional[str] = None
    test_type: str
    duration_minutes: int
    total_marks: int
    passing_marks: int
    is_published: bool
    created_at: datetime
    deadline_display: Optional[str] = None
    status: str

    model_config = ConfigDict(from_attributes=True)

class FacultyDashboardStats(BaseModel):
    faculty_name: str
    department_name: Optional[str] = None
    assigned_subjects_count: int = 0
    total_questions_created: int = 0
    draft_questions_count: int = 0
    pending_review_questions_count: int = 0
    approved_questions_count: int = 0
    rejected_questions_count: int = 0
    revision_required_questions_count: int = 0
    draft_papers_count: int = 0
    pending_review_papers_count: int = 0
    approved_papers_count: int = 0
    rejected_papers_count: int = 0
    revision_required_papers_count: int = 0
    published_papers_count: int = 0
    upcoming_deadlines_count: int = 0
    upcoming_exams: List[FacultyExamItem] = []
    recent_feedback: List[FacultyFeedbackItem] = []
    recent_activity: List[dict] = []

    model_config = ConfigDict(from_attributes=True)

class FacultyReportsData(BaseModel):
    faculty_name: str
    email: str
    department_name: Optional[str] = None
    total_questions: int = 0
    questions_by_status: Dict[str, int] = {}
    questions_by_type: Dict[str, int] = {}
    questions_by_difficulty: Dict[str, int] = {}
    total_papers: int = 0
    papers_by_status: Dict[str, int] = {}
    subject_workload: List[dict] = []
    approval_rate_percent: float = 0.0

    model_config = ConfigDict(from_attributes=True)

class FacultyQuestionCreateRequest(BaseModel):
    subject_id: str
    unit_id: Optional[str] = None
    topic_id: Optional[str] = None
    question_text: str
    question_type: str # MCQ, TRUE_FALSE, FILL_BLANK, DESCRIPTIVE
    marks: int = 1
    difficulty: str = "MEDIUM" # EASY, MEDIUM, HARD
    language: str = "English"
    explanation: Optional[str] = None
    expected_answer: Optional[str] = None
    options: List[QuestionOptionCreate] = []
    tags: List[str] = []
    is_submitted: bool = False

class FacultyQuestionUpdateRequest(BaseModel):
    subject_id: Optional[str] = None
    unit_id: Optional[str] = None
    topic_id: Optional[str] = None
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    marks: Optional[int] = None
    difficulty: Optional[str] = None
    language: Optional[str] = None
    explanation: Optional[str] = None
    expected_answer: Optional[str] = None
    options: Optional[List[QuestionOptionCreate]] = None
    tags: Optional[List[str]] = None
    is_submitted: Optional[bool] = None

class FacultyPaperCreateRequest(BaseModel):
    subject_id: str
    title: str = "Class Assessment / Midterm Paper"
    exam_name: str = "Midterm Examination 2026-27"
    duration_minutes: int = 120
    total_marks: int = 50
    instructions: Optional[str] = "1. Answer all questions.\n2. Write clearly."

class FacultyPaperUpdateRequest(BaseModel):
    title: Optional[str] = None
    exam_name: Optional[str] = None
    duration_minutes: Optional[int] = None
    total_marks: Optional[int] = None
    instructions: Optional[str] = None
