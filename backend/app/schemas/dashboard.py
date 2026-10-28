from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class DashboardStats(BaseModel):
    role: str = "FACULTY"
    total_universities: int = 0
    total_institutions: int = 0
    total_departments: int = 0
    total_programs: int = 0
    total_subjects: int = 0
    total_users: int = 0
    total_faculty: int = 0
    total_students: int = 0
    
    # Question Metrics
    total_questions: int = 0
    approved_questions: int = 0
    pending_questions: int = 0
    my_questions: int = 0
    my_draft_questions: int = 0
    my_submitted_questions: int = 0
    my_approved_questions: int = 0
    
    # Question Paper Metrics
    total_papers: int = 0
    published_papers: int = 0
    pending_papers: int = 0
    
    # Academic Scoping & Counts
    enrolled_subjects: int = 0
    assigned_subjects: int = 0
    syllabus_units_count: int = 0
    
    organization_name: Optional[str] = None
    department_name: Optional[str] = None
    system_status: str = "Active"
    
    recent_activity: List[Dict[str, Any]] = []
    role_summary: Dict[str, Any] = {}

class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    metadata_json: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
