from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class ControllerDashboardStats(BaseModel):
    total_examinations: int = 0
    scheduled_examinations: int = 0
    in_progress_examinations: int = 0
    completed_examinations: int = 0
    papers_awaiting_approval: int = 0
    papers_pending_prior_review: int = 0
    revision_queue_count: int = 0
    finalized_papers_count: int = 0
    released_papers_count: int = 0
    overdue_submissions: int = 0
    open_critical_issues: int = 0
    active_coordinators: int = 0
    recent_activities: List[Dict[str, Any]] = []
    urgent_alerts: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)

class ExaminationItem(BaseModel):
    id: str
    code: str
    name: str
    exam_type: str = "FINAL"
    organization_id: str
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    program_id: Optional[str] = None
    program_name: Optional[str] = None
    semester_id: Optional[str] = None
    semester_name: Optional[str] = None
    subject_id: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: int = 180
    total_marks: int = 100
    venue: Optional[str] = None
    paper_submission_deadline: Optional[datetime] = None
    status: str = "SCHEDULED"
    readiness_percentage: float = 0.0
    paper_status: str = "NOT_STARTED"
    paper_id: Optional[str] = None
    assigned_coordinators_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class ExaminationCreateRequest(BaseModel):
    code: str
    name: str
    exam_type: str = "FINAL"
    department_id: Optional[str] = None
    program_id: Optional[str] = None
    academic_year_id: Optional[str] = None
    semester_id: Optional[str] = None
    subject_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: int = 180
    total_marks: int = 100
    venue: Optional[str] = None
    paper_submission_deadline: Optional[datetime] = None
    status: str = "SCHEDULED"

class ExaminationUpdateRequest(BaseModel):
    name: Optional[str] = None
    exam_type: Optional[str] = None
    department_id: Optional[str] = None
    program_id: Optional[str] = None
    academic_year_id: Optional[str] = None
    semester_id: Optional[str] = None
    subject_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    total_marks: Optional[int] = None
    venue: Optional[str] = None
    paper_submission_deadline: Optional[datetime] = None
    status: Optional[str] = None

class ExaminationStatusUpdateRequest(BaseModel):
    status: str

class PaperApprovalItem(BaseModel):
    id: str
    title: str
    exam_name: str
    subject_id: str
    subject_code: str
    subject_name: str
    department_name: Optional[str] = None
    total_marks: int
    duration_minutes: Optional[int] = None
    status: str
    version: int = 1
    is_locked: bool = False
    created_by_name: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    has_prior_review: bool = False
    validation_passed: bool = True
    validation_errors: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PaperApprovalDecisionRequest(BaseModel):
    action: str  # APPROVE, RETURN_REVISION, REJECT
    comments: Optional[str] = None
    rejection_reason: Optional[str] = None

class RevisionQueueItem(BaseModel):
    id: str
    title: str
    exam_name: str
    subject_code: str
    subject_name: str
    department_name: Optional[str] = None
    status: str
    version: int
    rejection_reason: Optional[str] = None
    revision_comments: Optional[str] = None
    created_by_name: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PaperFinalizeRequest(BaseModel):
    confirmation_notes: Optional[str] = None

class FinalizedPaperItem(BaseModel):
    id: str
    title: str
    exam_name: str
    subject_code: str
    subject_name: str
    department_name: Optional[str] = None
    version: int
    total_marks: int
    status: str
    is_locked: bool
    finalized_at: Optional[datetime] = None
    finalized_by_name: Optional[str] = None
    finalization_hash: Optional[str] = None
    release_status: str = "NOT_READY"

    model_config = ConfigDict(from_attributes=True)

class PaperReleaseConfigRequest(BaseModel):
    paper_id: str
    examination_id: Optional[str] = None
    scheduled_release_at: Optional[datetime] = None
    recipient_roles: List[str] = ["EXAM_COORDINATOR", "FACULTY"]
    release_notes: Optional[str] = None

class PaperReleaseAuthorizeRequest(BaseModel):
    confirmation: bool = True

class PaperReleaseItem(BaseModel):
    id: str
    paper_id: str
    paper_title: str
    subject_code: str
    subject_name: str
    examination_name: Optional[str] = None
    release_status: str
    scheduled_release_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    released_by_name: Optional[str] = None
    recipient_roles: List[str] = []
    release_notes: Optional[str] = None
    download_token_hash: Optional[str] = None
    is_locked: bool = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CoordinatorAssignmentItem(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    examination_id: Optional[str] = None
    examination_code: Optional[str] = None
    examination_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    can_edit_schedule: bool = False
    is_active: bool = True
    assigned_at: Optional[datetime] = None
    assigned_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class CoordinatorAssignRequest(BaseModel):
    user_id: str
    examination_id: Optional[str] = None
    department_id: Optional[str] = None
    can_edit_schedule: bool = False

class ControllerReportsData(BaseModel):
    total_examinations: int
    examinations_by_status: Dict[str, int]
    papers_by_status: Dict[str, int]
    department_performance: List[Dict[str, Any]]
    readiness_breakdown: Dict[str, int]
    avg_turnaround_hours: float
    security_incidents_total: int
    resolved_issues_total: int
    open_critical_issues_total: int

    model_config = ConfigDict(from_attributes=True)

class AuditLogItem(BaseModel):
    id: str
    action: str
    entity_name: Optional[str] = None
    entity_id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
