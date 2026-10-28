from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from app.schemas.question import QuestionResponse

class DistributionItem(BaseModel):
    question_type: str # MCQ, TRUE_FALSE, FILL_BLANK, DESCRIPTIVE, SHORT, LONG
    marks: int # 1, 2, 5, 10
    count: int
    section_name: Optional[str] = None # e.g. "Section A", "Section B", "Section C"
    instructions: Optional[str] = None
    is_compulsory: bool = True
    or_choice: bool = False
    has_or_alternative: bool = False # First-class OR alternative in blueprint
    or_question_type: Optional[str] = None # Paired alternative question type (e.g. TRUE_FALSE vs SHORT)
    or_marks: Optional[int] = None
    selection_rule: Optional[str] = "SINGLE" # SINGLE, OR_PAIR, OR_GROUP, ATTEMPT_ANY_N
    required_attempts: Optional[int] = None # e.g. Attempt 5 out of 8
    unit_id: Optional[str] = None
    bloom_level: Optional[str] = None

class DifficultyDistribution(BaseModel):
    easy: int = 30 # percentage
    medium: int = 50 # percentage
    hard: int = 20 # percentage

class BloomDistribution(BaseModel):
    remember: int = 20 # percentage
    understand: int = 30 # percentage
    apply: int = 25 # percentage
    analyze: int = 15 # percentage
    evaluate: int = 5 # percentage
    create: int = 5 # percentage

class SourceRatioConfig(BaseModel):
    bank_percentage: int = 50 # 0 to 100%
    ai_percentage: int = 50 # 0 to 100%

class PaperManualCreate(BaseModel):
    subject_id: str
    title: str = "Mid Term Examination"
    exam_name: str = "End Semester Examination 2026-27"
    duration_minutes: int = 180
    total_marks: int = 70
    instructions: Optional[str] = None

class PaperGenerationRequest(BaseModel):
    subject_id: str
    academic_year_id: Optional[str] = None
    semester_id: Optional[str] = None
    title: str = "Mid Term Examination"
    exam_name: str = "End Semester Examination 2026-27"
    duration_minutes: int = 180
    total_marks: int = 70
    instructions: Optional[str] = "1. Section A is compulsory.\n2. In Section B and C, answer required questions."
    distribution: List[DistributionItem]
    difficulty: Optional[DifficultyDistribution] = None
    bloom_taxonomy: Optional[BloomDistribution] = None
    source_ratio: Optional[SourceRatioConfig] = None
    unit_distribution: Optional[Dict[str, int]] = None # unit_id -> count or marks
    sections_config: Optional[List[Dict[str, Any]]] = None # Custom dynamic section definitions
    allow_fallback: bool = False # Explicit consent for fallback generation when syllabus is unavailable
    seed: Optional[int] = None # Deterministic random generation seed

class BlueprintValidationResponse(BaseModel):
    is_valid: bool
    total_marks_expected: int
    total_marks_calculated: int
    total_displayed_marks: int = 0
    total_questions_calculated: int
    errors: List[str] = []
    warnings: List[str] = []

class PaperManualQuestionAdd(BaseModel):
    question_id: str
    section_id: str
    order_index: Optional[int] = None
    marks: Optional[int] = None

class PaperQuestionReorderItem(BaseModel):
    question_paper_question_id: str
    new_section_id: Optional[str] = None
    new_order_index: int

class PaperReorderRequest(BaseModel):
    reordered_questions: List[PaperQuestionReorderItem]

class PaperSectionCreate(BaseModel):
    name: str # e.g. "Section A", "Part I", etc.
    instructions: Optional[str] = None
    order_index: int = 0
    section_type: str = "STANDARD" # STANDARD, CHOICE_SECTION
    total_marks: int = 0
    required_attempts: Optional[int] = None
    selection_rule: str = "ALL" # ALL, ATTEMPT_ANY_N

class PaperSectionUpdate(BaseModel):
    name: Optional[str] = None
    instructions: Optional[str] = None
    order_index: Optional[int] = None
    section_type: Optional[str] = None
    total_marks: Optional[int] = None
    required_attempts: Optional[int] = None
    selection_rule: Optional[str] = None

class PaperSectionReorderItem(BaseModel):
    section_id: str
    new_order_index: int

class PaperSectionReorderRequest(BaseModel):
    sections: List[PaperSectionReorderItem]

class PaperAddAlternativeRequest(BaseModel):
    """Adds an alternative question to pair with an existing question (creating or appending to an OR group)"""
    question_id: Optional[str] = None # Existing Question Bank question ID
    # Or create inline/AI
    question_text: Optional[str] = None
    question_type: Optional[str] = "SHORT"
    marks: Optional[int] = None
    difficulty: Optional[str] = "MEDIUM"
    bloom_level: Optional[str] = "UNDERSTAND"
    source_type: Optional[str] = "AI_GENERATED"
    expected_answer: Optional[str] = None
    marking_scheme: Optional[str] = None
    options: Optional[List[Dict[str, Any]]] = None

class PaperCreateOrGroupRequest(BaseModel):
    section_id: str
    selection_rule: str = "OR_PAIR" # OR_PAIR, OR_GROUP, ATTEMPT_ANY_N
    required_attempts: int = 1
    marks: int
    question_ids: List[str] # Questions to associate into this OR group

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    max_marks: int = 70
    duration_minutes: int = 180
    header_html: Optional[str] = None
    footer_html: Optional[str] = None
    instructions_template: Optional[str] = None
    sections_config: Optional[List[Dict[str, Any]]] = None
    is_default: bool = False

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    max_marks: Optional[int] = None
    duration_minutes: Optional[int] = None
    header_html: Optional[str] = None
    footer_html: Optional[str] = None
    instructions_template: Optional[str] = None
    sections_config: Optional[List[Dict[str, Any]]] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

class TemplateResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    max_marks: int
    duration_minutes: int
    instructions_template: Optional[str] = None
    sections_config: Optional[List[Dict[str, Any]]] = None
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PaperValidationResult(BaseModel):
    is_valid: bool
    status: str = "PASSED" # PASSED, PASSED_WITH_WARNINGS, FAILED
    total_marks_expected: int
    total_marks_actual: int
    total_questions: int
    duplicate_count: int
    errors: List[str] = []
    warnings: List[str] = []
    unit_coverage: Dict[str, int] = {}
    difficulty_breakdown: Dict[str, int] = {}
    bloom_breakdown: Dict[str, int] = {}
    source_composition: Dict[str, int] = {}
    deduplication_summary: Dict[str, Any] = {}
    grounding_checks: Dict[str, Any] = {}

class PaperStatusAction(BaseModel):
    action: str # "SUBMIT_FOR_REVIEW", "APPROVE", "FINALIZE", "PUBLISH", "REQUEST_REVISION", "REJECT", "ARCHIVE"
    comments: Optional[str] = None

class QuestionPaperQuestionDetail(BaseModel):
    id: str # question_paper_question ID
    question_id: str
    order_index: int
    marks: int
    is_compulsory: bool = True
    or_group_id: Optional[str] = None
    group_id: Optional[str] = None
    group_type: Optional[str] = "SINGLE" # SINGLE, OR_PAIR, OR_GROUP, ATTEMPT_ANY_N
    selection_rule: Optional[str] = "SINGLE"
    required_attempts: Optional[int] = 1
    alternative_label: Optional[str] = None # "a", "b", "c"
    group_marks: Optional[int] = None
    source_type: Optional[str] = "QUESTION_BANK"
    bloom_level: Optional[str] = "UNDERSTAND"
    marking_scheme: Optional[str] = None
    expected_answer: Optional[str] = None
    syllabus_provenance: Optional[Dict[str, Any]] = None
    question: QuestionResponse

    model_config = ConfigDict(from_attributes=True)

class QuestionPaperSectionDetail(BaseModel):
    id: str
    name: str
    instructions: Optional[str] = None
    order_index: int
    section_type: str = "STANDARD" # STANDARD, CHOICE_SECTION
    total_marks: int = 0 # Candidate attempt marks target
    displayed_marks: int = 0 # Sum of marks of all questions in section
    required_attempts: Optional[int] = None
    selection_rule: str = "ALL" # ALL, ATTEMPT_ANY_N
    questions: List[QuestionPaperQuestionDetail] = []

    model_config = ConfigDict(from_attributes=True)

class QuestionPaperResponse(BaseModel):
    id: str
    subject_id: str
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    academic_year_name: Optional[str] = None
    semester_name: Optional[str] = None
    department_name: Optional[str] = None
    university_name: Optional[str] = None
    program_name: Optional[str] = None
    title: str
    exam_name: str
    duration_minutes: int
    total_marks: int
    current_marks: int = 0 # Candidate attempt marks calculated
    displayed_marks: int = 0 # Total displayed marks across all alternatives
    status: str
    instructions: Optional[str] = None
    version: int
    created_by: Optional[str] = None
    creator_name: Optional[str] = None
    source_ratio: Optional[Dict[str, int]] = None
    validation_status: Optional[str] = None
    is_syllabus_grounded: bool = True
    syllabus_version: Optional[int] = 1
    generation_mode: str = "SYLLABUS_GROUNDED"
    sections: List[QuestionPaperSectionDetail] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Regeneration and In-Place Editing Schemas
class QuestionRegenerateRequest(BaseModel):
    preference: Optional[str] = "ANY" # "BANK", "AI", "ANY"
    reason: Optional[str] = None

class SectionRegenerateRequest(BaseModel):
    preference: Optional[str] = "ANY"

class QuestionPaperContentUpdate(BaseModel):
    question_id: str
    question_text: Optional[str] = None
    marks: Optional[int] = None
    difficulty: Optional[str] = None
    bloom_level: Optional[str] = None
    expected_answer: Optional[str] = None
    marking_scheme: Optional[str] = None
    options: Optional[List[Dict[str, Any]]] = None

# Confidential Answer Key & Marking Scheme Schemas
class AnswerKeyItem(BaseModel):
    question_id: str
    section_name: str
    question_number: int
    question_text: str
    question_type: str
    marks: int
    difficulty: str
    bloom_level: str
    source_type: str
    correct_option: Optional[str] = None # e.g. "A" or "B" for MCQs
    expected_answer: Optional[str] = None
    solution_explanation: Optional[str] = None

class AnswerKeyResponse(BaseModel):
    paper_id: str
    paper_title: str
    exam_name: str
    subject_code: str
    subject_name: str
    total_marks: int
    is_confidential: bool = True
    items: List[AnswerKeyItem] = []

class MarkingSchemeItem(BaseModel):
    question_id: str
    section_name: str
    question_number: int
    marks: int
    rubric_criteria: Optional[str] = None
    expected_answer_points: Optional[str] = None
    step_marks: Optional[str] = None
    examiner_notes: Optional[str] = None

class MarkingSchemeResponse(BaseModel):
    paper_id: str
    paper_title: str
    exam_name: str
    subject_code: str
    subject_name: str
    total_marks: int
    items: List[MarkingSchemeItem] = []

class GenerationJobResponse(BaseModel):
    id: str
    subject_id: str
    paper_id: Optional[str] = None
    status: str
    progress: int
    status_message: str
    error_message: Optional[str] = None
    created_at: datetime
