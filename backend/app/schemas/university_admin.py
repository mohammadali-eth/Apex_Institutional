from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr, model_validator
from datetime import datetime
from app.schemas.academic import OrganizationResponse, UniversityThemeResponse, DepartmentResponse

class UniversityAdminDashboardStats(BaseModel):
    university_id: str
    university_name: str
    university_code: str
    total_departments: int = 0
    total_institutions: int = 0
    active_hods: int = 0
    active_teachers: int = 0
    active_exam_controllers: int = 0
    total_programs: int = 0
    total_subjects: int = 0
    syllabus_units_count: int = 0
    total_questions: int = 0
    questions_awaiting_review: int = 0
    approved_questions: int = 0
    total_papers: int = 0
    papers_by_status: Dict[str, int] = {}
    recent_accounts: List[Dict[str, Any]] = []
    recent_audit_events: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)

class UniversityProfileUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None

class DepartmentAssignHODRequest(BaseModel):
    hod_user_id: str

class UniversityDepartmentCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    organization_id: Optional[str] = None
    is_active: bool = True

class HODCreateRequest(BaseModel):
    full_name: str = ""
    name: Optional[str] = None
    email: EmailStr
    department_id: str
    phone: Optional[str] = None
    password: Optional[str] = None
    is_active: bool = True

    @model_validator(mode="before")
    @classmethod
    def resolve_name_fields(cls, data: Any):
        if isinstance(data, dict):
            if "name" in data and not data.get("full_name"):
                data["full_name"] = data["name"]
        return data

class HODUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[str] = None
    is_active: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_name_fields(cls, data: Any):
        if isinstance(data, dict):
            if "name" in data and not data.get("full_name"):
                data["full_name"] = data["name"]
        return data

class StaffUserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role_name: str
    phone: Optional[str] = None
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    is_active: bool
    must_change_password: bool = False
    assigned_subjects_count: int = 0
    assigned_subjects: List[Dict[str, Any]] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TeacherCreateRequest(BaseModel):
    full_name: str = ""
    name: Optional[str] = None
    email: EmailStr
    department_id: str
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

class TeacherUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[str] = None
    is_active: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_name_fields(cls, data: Any):
        if isinstance(data, dict):
            if "name" in data and not data.get("full_name"):
                data["full_name"] = data["name"]
        return data

class TeacherSubjectAssignRequest(BaseModel):
    subject_ids: List[str]

class ExamControllerCreateRequest(BaseModel):
    full_name: str = ""
    name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    office_location: Optional[str] = None
    password: Optional[str] = None
    is_active: bool = True

    @model_validator(mode="before")
    @classmethod
    def resolve_name_fields(cls, data: Any):
        if isinstance(data, dict):
            if "name" in data and not data.get("full_name"):
                data["full_name"] = data["name"]
        return data

class ExamControllerUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    office_location: Optional[str] = None
    is_active: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_name_fields(cls, data: Any):
        if isinstance(data, dict):
            if "name" in data and not data.get("full_name"):
                data["full_name"] = data["name"]
        return data

class StaffCredentialResetResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    temporary_password: str
    setup_token: Optional[str] = None
    message: str

class UniversityDepartmentItem(BaseModel):
    id: str
    organization_id: str
    organization_name: Optional[str] = None
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True
    hod_name: Optional[str] = None
    hod_email: Optional[str] = None
    hod_id: Optional[str] = None
    programs_count: int = 0
    subjects_count: int = 0
    teachers_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
