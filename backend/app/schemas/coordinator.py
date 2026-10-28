from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class CoordinatorDashboardStats(BaseModel):
    total_assigned_exams: int = 0
    upcoming_exams: int = 0
    in_progress_exams: int = 0
    completed_exams: int = 0
    papers_awaiting_submission: int = 0
    papers_pending_review: int = 0
    papers_awaiting_approval: int = 0
    papers_ready: int = 0
    overdue_submissions: int = 0
    incomplete_checklists: int = 0
    open_issues: int = 0
    critical_escalations: int = 0
    recent_activity: List[Dict[str, Any]] = []
    recent_notifications: List[Dict[str, Any]] = []

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
    can_edit_schedule: bool = False
    readiness_percentage: float = 0.0
    readiness_status: str = "PENDING"
    paper_status: str = "NOT_STARTED"
    paper_id: Optional[str] = None
    faculty_name: Optional[str] = None
    days_remaining: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ExaminationDetail(ExaminationItem):
    instructions: Optional[str] = None
    academic_year_name: Optional[str] = None
    assigned_coordinators: List[Dict[str, Any]] = []
    readiness_summary: Dict[str, Any] = {}

class ScheduleItem(BaseModel):
    id: str
    examination_id: str
    code: str
    name: str
    subject_code: str
    subject_name: str
    program_name: str
    semester_name: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: int = 180
    venue: Optional[str] = None
    paper_deadline: Optional[datetime] = None
    status: str
    can_edit: bool = False

    model_config = ConfigDict(from_attributes=True)

class ScheduleUpdateRequest(BaseModel):
    start_time: datetime
    end_time: datetime
    venue: Optional[str] = None
    duration_minutes: Optional[int] = None
    reason: Optional[str] = "Timetable coordination adjustment"

class ScheduleConflictCheckRequest(BaseModel):
    examination_id: str
    start_time: datetime
    end_time: datetime
    venue: Optional[str] = None

class ConflictReport(BaseModel):
    has_conflict: bool = False
    conflicts: List[Dict[str, Any]] = []

class PaperTrackingItem(BaseModel):
    id: Optional[str] = None # Paper ID if generated/created
    examination_id: str
    exam_name: str
    exam_code: str
    subject_id: str
    subject_code: str
    subject_name: str
    program_name: str
    semester_name: str
    faculty_id: Optional[str] = None
    faculty_name: Optional[str] = None
    reviewer_name: Optional[str] = None
    submission_deadline: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    paper_status: str = "NOT_STARTED"
    review_status: str = "PENDING"
    approval_status: str = "PENDING"
    is_overdue: bool = False
    days_remaining: Optional[int] = None
    total_marks: int = 100
    version: int = 1

    model_config = ConfigDict(from_attributes=True)

class FacultyCoordinationItem(BaseModel):
    faculty_id: str
    faculty_name: str
    faculty_email: str
    department_name: str
    subject_id: str
    subject_code: str
    subject_name: str
    examination_id: str
    exam_name: str
    paper_deadline: Optional[datetime] = None
    paper_status: str = "NOT_STARTED"
    last_follow_up_date: Optional[datetime] = None
    outstanding_tasks: List[str] = []
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ReadinessItemSchema(BaseModel):
    id: str
    examination_id: str
    category: str
    title: str
    description: Optional[str] = None
    is_required: bool = True
    status: str = "NOT_STARTED"
    notes: Optional[str] = None
    updated_by_name: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ReadinessItemUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = None

class IssueItem(BaseModel):
    id: str
    examination_id: str
    exam_name: str
    subject_name: Optional[str] = None
    title: str
    description: str
    category: str
    severity: str
    status: str
    reported_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    is_escalated: bool = False
    escalated_to_name: Optional[str] = None
    escalation_reason: Optional[str] = None
    escalated_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class IssueCreateRequest(BaseModel):
    examination_id: str
    subject_id: Optional[str] = None
    title: str
    description: str
    category: str = "OTHER"
    severity: str = "MEDIUM"
    assigned_to_id: Optional[str] = None

class IssueEscalateRequest(BaseModel):
    escalation_reason: str
    escalated_to_id: Optional[str] = None

class IssueUpdateRequest(BaseModel):
    status: Optional[str] = None
    resolution_notes: Optional[str] = None

class NotificationItem(BaseModel):
    id: str
    recipient_id: str
    sender_name: Optional[str] = None
    examination_id: Optional[str] = None
    exam_name: Optional[str] = None
    title: str
    message: str
    notification_type: str
    channel: str = "IN_APP"
    is_read: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReminderSendRequest(BaseModel):
    recipient_id: str
    examination_id: str
    subject: str
    message: str
    notification_type: str = "DEADLINE_REMINDER"

class CoordinatorReportsData(BaseModel):
    total_exams: int = 0
    total_papers: int = 0
    papers_approved: int = 0
    papers_overdue: int = 0
    readiness_rate: float = 0.0
    exam_progress_rows: List[Dict[str, Any]] = []
    faculty_coordination_rows: List[Dict[str, Any]] = []
    review_approval_rows: List[Dict[str, Any]] = []
    readiness_rows: List[Dict[str, Any]] = []
    issue_summary: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)
