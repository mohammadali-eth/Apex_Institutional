from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Classes & Subjects ---

class StudentClassSummary(BaseModel):
    subject_id: str
    subject_code: str
    subject_name: str
    program_name: Optional[str] = None
    semester_name: Optional[str] = None
    credits: int = 4
    teacher_name: Optional[str] = None
    syllabus_units_count: int = 0
    syllabus_progress_pct: float = 0.0
    published_papers_count: int = 0
    available_tests_count: int = 0

# --- Syllabus & Progress ---

class TopicProgressItem(BaseModel):
    id: str
    topic_id: Optional[str] = None
    title: str
    order_index: int
    is_completed: bool = False
    completed_at: Optional[datetime] = None

class UnitSyllabusProgress(BaseModel):
    unit_id: str
    unit_number: int
    title: str
    description: Optional[str] = None
    topics_count: int = 0
    completed_topics_count: int = 0
    topics: List[TopicProgressItem] = []

class StudentClassDetail(StudentClassSummary):
    description: Optional[str] = None
    total_topics: int = 0
    completed_topics: int = 0
    units: List[UnitSyllabusProgress] = []
    progress_percent: Optional[float] = None
    units_count: Optional[int] = None
    topics_count: Optional[int] = None
    completed_topics_count: Optional[int] = None

class StudentSubjectSyllabusResponse(BaseModel):
    subject_id: str
    subject_code: str
    subject_name: str
    syllabus_title: str
    version: int = 1
    total_topics: int = 0
    completed_topics: int = 0
    progress_percentage: float = 0.0
    units: List[UnitSyllabusProgress] = []

class StudentSyllabusProgressRequest(BaseModel):
    subject_id: Optional[str] = None
    topic_id: str
    is_completed: bool = True

class StudentSyllabusProgressResponse(BaseModel):
    subject_id: str
    total_topics: int
    completed_topics: int
    progress_percentage: float
    updated_topic_id: str
    is_completed: bool

# --- Online Tests ---

class OnlineTestSummary(BaseModel):
    id: str
    test_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    subject_id: str
    subject_code: str
    subject_name: str
    test_type: str # OFFICIAL, PRACTICE_BANK, PRACTICE_AI
    difficulty: str # EASY, MEDIUM, HARD, MIXED
    duration_minutes: int
    total_marks: int
    passing_marks: int
    question_count: int = 0
    attempt_limit: int = 3
    attempts_taken: int = 0
    best_score: Optional[float] = None
    can_attempt: bool = True
    is_published: bool = True

class OnlineTestDetail(OnlineTestSummary):
    instructions: Optional[str] = None
    negative_marking: float = 0.0
    mcq_count: int = 0
    true_false_count: int = 0
    fill_blank_count: int = 0
    descriptive_count: int = 0

class PracticeTestCreateRequest(BaseModel):
    subject_id: str
    unit_ids: Optional[List[str]] = None
    difficulty: str = Field(default="MEDIUM", pattern="^(EASY|MEDIUM|HARD|MIXED)$")
    question_count: int = Field(default=10, ge=3, le=50)
    duration_minutes: int = Field(default=30, ge=5, le=180)
    question_types: List[str] = Field(default=["MCQ", "TRUE_FALSE", "FILL_BLANK", "DESCRIPTIVE"])

# --- Exam Sitting & Attempt ---

class TestStartResponse(BaseModel):
    attempt_id: str
    test_id: str
    attempt_number: int
    started_at: datetime
    deadline_at: datetime
    duration_minutes: int
    total_questions: int

class StudentTestQuestion(BaseModel):
    snapshot_id: str
    order_index: int
    question_text: str
    question_type: str # MCQ, TRUE_FALSE, FILL_BLANK, DESCRIPTIVE
    marks: int
    options: Optional[List[Dict[str, Any]]] = None # For MCQ only

class TestAttemptDetail(BaseModel):
    attempt_id: str
    test_id: str
    test_title: str
    subject_name: str
    status: str # IN_PROGRESS, SUBMITTED, TIMED_OUT, ABANDONED
    started_at: datetime
    deadline_at: datetime
    remaining_seconds: int
    total_marks: int
    questions: List[StudentTestQuestion]
    saved_answers: Dict[str, Dict[str, Any]] # snapshot_id -> {selected_option_key, answer_text, is_marked_for_review}

class AnswerSaveRequest(BaseModel):
    selected_option_key: Optional[str] = None
    answer_text: Optional[str] = None
    is_marked_for_review: Optional[bool] = False

class TestLifecycleEventRequest(BaseModel):
    event_type: str
    event_data: Optional[Any] = None
    details: Optional[Any] = None

class TestSubmitResponse(BaseModel):
    attempt_id: str
    status: str
    submitted_at: datetime
    total_score: float
    obtained_marks: Optional[float] = None
    total_marks: int
    percentage: Optional[float] = None
    auto_graded_score: float
    is_graded: bool
    has_pending_descriptive: bool
    message: str

# --- Results ---

class QuestionReviewItem(BaseModel):
    snapshot_id: str
    order_index: int
    question_text: str
    question_type: str
    marks: int
    marks_awarded: float
    obtained_marks: Optional[float] = None
    student_selected_option: Optional[str] = None
    student_answer_text: Optional[str] = None
    student_answer: Optional[str] = None
    correct_answer_key: Optional[str] = None
    is_correct: Optional[bool] = None
    explanation: Optional[str] = None
    evaluator_comment: Optional[str] = None
    options: Optional[List[Dict[str, Any]]] = None

class TestResultSummary(BaseModel):
    attempt_id: str
    test_id: str
    test_title: str
    subject_name: str
    subject_code: Optional[str] = None
    test_type: Optional[str] = None
    submitted_at: Optional[datetime] = None
    total_score: float
    obtained_marks: Optional[float] = None
    total_marks: int
    percentage: float
    status: str
    is_graded: bool
    is_passed: Optional[bool] = False
    has_pending_descriptive: bool
    total_questions: Optional[int] = 0
    correct_count: Optional[int] = 0
    pending_eval_count: Optional[int] = 0

class TestResultDetail(TestResultSummary):
    passing_marks: int
    is_passed: bool
    time_taken_seconds: int
    evaluator_feedback: Optional[str] = None
    questions_review: List[QuestionReviewItem] = []
    questions: Optional[List[QuestionReviewItem]] = None

# --- Student Dashboard Overview ---

class StudentDashboardData(BaseModel):
    student_name: str
    roll_number: Optional[str] = None
    program_name: Optional[str] = None
    semester_name: Optional[str] = None
    classes: List[StudentClassSummary] = []
    enrolled_classes: Optional[List[StudentClassSummary]] = None
    upcoming_tests: List[OnlineTestSummary] = []
    recent_results: List[TestResultSummary] = []
    recent_papers: List[Dict[str, Any]] = []
    published_papers: Optional[List[Dict[str, Any]]] = None
    overall_syllabus_progress: float = 0.0
    overall_syllabus_percent: Optional[float] = None
