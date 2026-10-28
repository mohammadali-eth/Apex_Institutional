from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# Topic
class TopicBase(BaseModel):
    topic_number: int
    title: str
    description: Optional[str] = None

class TopicCreate(TopicBase):
    pass

class TopicResponse(TopicBase):
    id: str
    unit_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Unit
class UnitBase(BaseModel):
    unit_number: int
    title: str
    description: Optional[str] = None

class UnitCreate(UnitBase):
    topics: List[TopicCreate] = []

class UnitResponse(UnitBase):
    id: str
    syllabus_id: str
    topics: List[TopicResponse] = []
    questions_count: Optional[int] = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Syllabus
class SyllabusBase(BaseModel):
    title: str
    description: Optional[str] = None
    version: int = 1
    academic_year_id: Optional[str] = None

class SyllabusCreate(SyllabusBase):
    subject_id: str
    units: List[UnitCreate] = []

class SyllabusUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    academic_year_id: Optional[str] = None
    is_active: Optional[bool] = None

class SyllabusResponse(SyllabusBase):
    id: str
    subject_id: str
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = 0
    file_type: Optional[str] = None
    is_active: bool
    units: List[UnitResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
