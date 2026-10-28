from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class QuestionOptionBase(BaseModel):
    option_key: str # "A", "B", "C", "D"
    option_text: str
    is_correct: bool = False

class QuestionOptionCreate(QuestionOptionBase):
    pass

class QuestionOptionResponse(QuestionOptionBase):
    id: str

    model_config = ConfigDict(from_attributes=True)

class QuestionBase(BaseModel):
    subject_id: str
    unit_id: Optional[str] = None
    topic_id: Optional[str] = None
    question_text: str
    question_type: str # MCQ, TRUE_FALSE, FILL_BLANK, DESCRIPTIVE
    marks: int = 1
    difficulty: str = "MEDIUM" # EASY, MEDIUM, HARD
    bloom_level: Optional[str] = "UNDERSTAND" # REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE
    source_type: Optional[str] = "QUESTION_BANK" # QUESTION_BANK, AI_GENERATED
    marking_rubric: Optional[str] = None
    language: str = "English"
    explanation: Optional[str] = None
    expected_answer: Optional[str] = None
    tags: List[str] = []

class QuestionCreate(QuestionBase):
    options: List[QuestionOptionCreate] = [] # Required for MCQ
    status: str = "DRAFT" # DRAFT or SUBMITTED

class QuestionUpdate(BaseModel):
    subject_id: Optional[str] = None
    unit_id: Optional[str] = None
    topic_id: Optional[str] = None
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    marks: Optional[int] = None
    difficulty: Optional[str] = None
    bloom_level: Optional[str] = None
    source_type: Optional[str] = None
    marking_rubric: Optional[str] = None
    language: Optional[str] = None
    explanation: Optional[str] = None
    expected_answer: Optional[str] = None
    options: Optional[List[QuestionOptionCreate]] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None

class QuestionStatusAction(BaseModel):
    action: str # "SUBMIT", "APPROVE", "REJECT", "ARCHIVE"
    comments: Optional[str] = None

class QuestionResponse(QuestionBase):
    id: str
    status: str
    created_by: Optional[str] = None
    creator_name: Optional[str] = None
    reviewer_id: Optional[str] = None
    review_feedback: Optional[str] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    unit_title: Optional[str] = None
    topic_title: Optional[str] = None
    options: List[QuestionOptionResponse] = []
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class QuestionFilter(BaseModel):
    subject_id: Optional[str] = None
    unit_id: Optional[str] = None
    topic_id: Optional[str] = None
    question_type: Optional[str] = None
    marks: Optional[int] = None
    difficulty: Optional[str] = None
    bloom_level: Optional[str] = None
    status: Optional[str] = None
    search: Optional[str] = None
    page: int = 1
    page_size: int = 10
    sort_by: str = "created_at"
    sort_order: str = "desc"
