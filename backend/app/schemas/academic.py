from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime

# University Theme
class UniversityThemeBase(BaseModel):
    primary_color: str = "#82c341"
    secondary_color: str = "#45525b"
    background_color: str = "#f3f3f3"
    font_color: str = "#838383"
    title_color: str = "#44535b"
    paragraph_color: str = "#676767"
    bg_text_color: str = "#dcdcdc"
    bg_title_color: str = "#f6f6f7"
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    login_banner_text: Optional[str] = None
    sidebar_style: str = "default"
    is_dark_mode_supported: bool = False

class UniversityThemeCreate(UniversityThemeBase):
    pass

class UniversityThemeUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    background_color: Optional[str] = None
    font_color: Optional[str] = None
    title_color: Optional[str] = None
    paragraph_color: Optional[str] = None
    bg_text_color: Optional[str] = None
    bg_title_color: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    login_banner_text: Optional[str] = None
    sidebar_style: Optional[str] = None
    is_dark_mode_supported: Optional[bool] = None

class UniversityThemeResponse(UniversityThemeBase):
    id: str
    university_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Organization (University / Institution)
class OrganizationBase(BaseModel):
    name: str
    code: str
    type: str = "UNIVERSITY" # UNIVERSITY, COLLEGE, INSTITUTE
    parent_id: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: bool = True

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    type: Optional[str] = None
    parent_id: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None

class OrganizationResponse(OrganizationBase):
    id: str
    created_at: datetime
    parent_name: Optional[str] = None
    departments_count: Optional[int] = 0
    institutions_count: Optional[int] = 0
    theme: Optional[UniversityThemeResponse] = None

    model_config = ConfigDict(from_attributes=True)

class UniversityWithAdminCreate(BaseModel):
    name: str
    code: str
    type: Optional[str] = "UNIVERSITY"
    address: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    admin_full_name: str
    admin_email: EmailStr
    admin_password: Optional[str] = None
    admin_phone: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

class UniversityAdminProvisionRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: Optional[str] = None
    phone: Optional[str] = None

class UniversityStatusAction(BaseModel):
    reason: Optional[str] = None

class UniversityAdminSummary(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    must_change_password: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UniversityDetailResponse(OrganizationResponse):
    admins: List[UniversityAdminSummary] = []
    total_faculty: int = 0
    total_students: int = 0
    total_programs: int = 0
    total_subjects: int = 0
    total_questions: int = 0
    total_papers: int = 0
    recent_activity_count: int = 0

# Department
class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    organization_id: str

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DepartmentResponse(DepartmentBase):
    id: str
    organization_id: str
    organization_name: Optional[str] = None
    programs_count: Optional[int] = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Program
class ProgramBase(BaseModel):
    name: str
    code: str
    degree_level: str = "UG"
    total_semesters: int = 6
    is_active: bool = True

class ProgramCreate(ProgramBase):
    department_id: str

class ProgramUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    degree_level: Optional[str] = None
    total_semesters: Optional[int] = None
    is_active: Optional[bool] = None

class ProgramResponse(ProgramBase):
    id: str
    department_id: str
    department_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Academic Year
class AcademicYearBase(BaseModel):
    name: str
    is_current: bool = False
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AcademicYearCreate(AcademicYearBase):
    pass

class AcademicYearResponse(AcademicYearBase):
    id: str

    model_config = ConfigDict(from_attributes=True)

# Semester
class SemesterBase(BaseModel):
    number: int
    name: str

class SemesterCreate(SemesterBase):
    program_id: str

class SemesterResponse(SemesterBase):
    id: str
    program_id: str
    program_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Subject
class SubjectBase(BaseModel):
    code: str
    name: str
    credits: int = 4
    description: Optional[str] = None
    is_active: bool = True

class SubjectCreate(SubjectBase):
    semester_id: str

class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    credits: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class SubjectResponse(SubjectBase):
    id: str
    semester_id: str
    semester_name: Optional[str] = None
    program_name: Optional[str] = None
    department_name: Optional[str] = None
    units_count: Optional[int] = 0
    questions_count: Optional[int] = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
