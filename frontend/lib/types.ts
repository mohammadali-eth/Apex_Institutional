export interface User {
  id: string;
  email: string;
  full_name: string;
  role_name: string;
  organization_id?: string | null;
  department_id?: string | null;
  organization_name?: string | null;
  department_name?: string | null;
  is_active: boolean;
  permissions: string[];
  created_at: string;
}

export interface UniversityTheme {
  id: string;
  university_id: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_color: string;
  title_color: string;
  paragraph_color: string;
  bg_text_color: string;
  bg_title_color: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  login_banner_text?: string | null;
  sidebar_style?: string;
  is_dark_mode_supported?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  type: string;
  parent_id?: string | null;
  parent_name?: string | null;
  address?: string;
  website?: string;
  logo_url?: string;
  is_active: boolean;
  departments_count?: number;
  institutions_count?: number;
  theme?: UniversityTheme | null;
  created_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  organization_name?: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  programs_count?: number;
  created_at: string;
}

export interface Program {
  id: string;
  department_id: string;
  department_name?: string;
  name: string;
  code: string;
  degree_level: string;
  total_semesters: number;
  is_active: boolean;
  created_at: string;
}

export interface Semester {
  id: string;
  program_id: string;
  program_name?: string;
  number: number;
  name: string;
  created_at: string;
}

export interface Subject {
  id: string;
  semester_id: string;
  semester_name?: string;
  program_name?: string;
  department_name?: string;
  code: string;
  name: string;
  credits: number;
  description?: string;
  is_active: boolean;
  units_count?: number;
  questions_count?: number;
  created_at: string;
}

export interface Topic {
  id: string;
  unit_id: string;
  topic_number: number;
  title: string;
  description?: string;
  created_at: string;
}

export interface Unit {
  id: string;
  syllabus_id: string;
  unit_number: number;
  title: string;
  description?: string;
  topics: Topic[];
  questions_count?: number;
  created_at: string;
}

export interface Syllabus {
  id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  title: string;
  version: number;
  description?: string;
  academic_year_id?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  is_active: boolean;
  units: Unit[];
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id?: string;
  option_key: string;
  option_text: string;
  is_correct: boolean;
}

export interface Question {
  id: string;
  subject_id: string;
  unit_id?: string | null;
  topic_id?: string | null;
  question_text: string;
  question_type: "MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "DESCRIPTIVE";
  marks: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  bloom_level?: string;
  source_type?: string;
  marking_rubric?: string | null;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";
  language: string;
  explanation?: string | null;
  expected_answer?: string | null;
  tags: string[];
  created_by?: string | null;
  creator_name?: string | null;
  reviewer_id?: string | null;
  review_feedback?: string | null;
  subject_name?: string | null;
  subject_code?: string | null;
  unit_title?: string | null;
  topic_title?: string | null;
  options: QuestionOption[];
  created_at: string;
  updated_at: string;
}

export interface QuestionPaperQuestion {
  id: string;
  question_id: string;
  order_index: number;
  marks: number;
  is_compulsory: boolean;
  or_group_id?: string | null;
  group_id?: string | null;
  group_type?: "SINGLE" | "OR_PAIR" | "OR_GROUP" | "ATTEMPT_ANY_N" | string;
  selection_rule?: "SINGLE" | "OR_PAIR" | "OR_GROUP" | "ATTEMPT_ANY_N" | string;
  required_attempts?: number;
  alternative_label?: string | null;
  group_marks?: number | null;
  source_type?: string;
  bloom_level?: string;
  marking_scheme?: string | null;
  expected_answer?: string | null;
  syllabus_provenance?: {
    is_grounded: boolean;
    syllabus_version?: number | null;
    unit_id?: string | null;
    unit_title?: string | null;
    unit_number?: number | null;
    topic_id?: string | null;
    topic_title?: string | null;
    source?: string | null;
    generation_mode?: string | null;
  } | null;
  question: Question;
}

export interface QuestionPaperSection {
  id: string;
  name: string;
  instructions?: string | null;
  order_index: number;
  section_type?: "STANDARD" | "CHOICE_SECTION" | string;
  total_marks: number;
  displayed_marks?: number;
  required_attempts?: number | null;
  selection_rule?: "ALL" | "ATTEMPT_ANY_N" | string;
  questions: QuestionPaperQuestion[];
}

export interface QuestionPaper {
  id: string;
  subject_id: string;
  subject_name?: string | null;
  subject_code?: string | null;
  academic_year_name?: string | null;
  semester_name?: string | null;
  department_name?: string | null;
  university_name?: string | null;
  program_name?: string | null;
  title: string;
  exam_name: string;
  duration_minutes: number;
  total_marks: number;
  current_marks: number;
  displayed_marks?: number;
  status: "DRAFT" | "GENERATED" | "UNDER_REVIEW" | "APPROVED" | "FINALIZED" | "REJECTED" | "PUBLISHED" | "ARCHIVED";
  instructions?: string | null;
  version: number;
  created_by?: string | null;
  creator_name?: string | null;
  source_ratio?: { bank_percentage: number; ai_percentage: number } | null;
  validation_status?: string | null;
  is_syllabus_grounded?: boolean;
  syllabus_version?: number | null;
  generation_mode?: string | null;
  sections: QuestionPaperSection[];
  created_at: string;
  updated_at: string;
}

export interface QuestionPaperTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  max_marks: number;
  duration_minutes: number;
  instructions_template?: string | null;
  sections_config?: Array<{
    name: string;
    instructions?: string | null;
    order_index: number;
    section_type?: string;
    total_marks?: number;
    required_attempts?: number | null;
    selection_rule?: string;
  }> | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface BlueprintDistributionItem {
  question_type: string;
  marks: number;
  count: number;
  section_name?: string | null;
  instructions?: string | null;
  is_compulsory?: boolean;
  or_choice?: boolean;
  has_or_alternative?: boolean;
  or_question_type?: string | null;
  or_marks?: number | null;
  selection_rule?: string | null;
  required_attempts?: number | null;
}

export type QuestionPaperResponse = QuestionPaper;

export interface PaperValidationResult {
  is_valid: boolean;
  status?: "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED" | string;
  total_marks_expected: number;
  total_marks_actual: number;
  total_questions: number;
  duplicate_count: number;
  errors: string[];
  warnings: string[];
  unit_coverage: Record<string, number>;
  difficulty_breakdown: Record<string, number>;
  bloom_breakdown?: Record<string, number>;
  source_composition?: Record<string, number>;
  deduplication_summary?: Record<string, any>;
  grounding_checks?: Record<string, any>;
}

export interface AnswerKeyItem {
  question_id: string;
  section_name: string;
  question_number: number;
  question_text: string;
  question_type: string;
  marks: number;
  difficulty: string;
  bloom_level: string;
  source_type: string;
  correct_option?: string | null;
  expected_answer?: string | null;
  solution_explanation?: string | null;
}

export interface AnswerKeyResponse {
  paper_id: string;
  paper_title: string;
  exam_name: string;
  subject_code: string;
  subject_name: string;
  total_marks: number;
  is_confidential: boolean;
  items: AnswerKeyItem[];
}

export interface MarkingSchemeItem {
  question_id: string;
  section_name: string;
  question_number: number;
  marks: number;
  rubric_criteria?: string | null;
  expected_answer_points?: string | null;
  step_marks?: string | null;
  examiner_notes?: string | null;
}

export interface MarkingSchemeResponse {
  paper_id: string;
  paper_title: string;
  exam_name: string;
  subject_code: string;
  subject_name: string;
  total_marks: number;
  items: MarkingSchemeItem[];
}

export interface BlueprintValidationResponse {
  is_valid: boolean;
  total_marks_expected: number;
  total_marks_calculated: number;
  total_questions_calculated: number;
  errors: string[];
  warnings: string[];
}

export interface DashboardStats {
  role: string;
  total_universities: number;
  total_institutions: number;
  total_departments: number;
  total_programs: number;
  total_subjects: number;
  total_users: number;
  total_faculty: number;
  total_students: number;
  total_questions: number;
  approved_questions: number;
  pending_questions: number;
  my_questions: number;
  my_draft_questions: number;
  my_submitted_questions: number;
  my_approved_questions: number;
  total_papers: number;
  published_papers: number;
  pending_papers: number;
  enrolled_subjects: number;
  assigned_subjects: number;
  syllabus_units_count: number;
  organization_name?: string | null;
  department_name?: string | null;
  system_status?: string;
  role_summary?: Record<string, any>;
  recent_activity: {
    id: string;
    action: string;
    entity_type: string;
    user_email: string;
    created_at: string;
  }[];
}

export interface StudentTopicProgress {
  topic_id: string;
  title: string;
  topic_number: number;
  is_completed: boolean;
  completed_at?: string | null;
}

export interface StudentUnitProgress {
  unit_id: string;
  unit_number: number;
  title: string;
  topics_count: number;
  completed_topics_count: number;
  progress_percent: number;
  topics: StudentTopicProgress[];
}

export interface StudentClassSummary {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  credits: number;
  semester_number: number;
  semester_name: string;
  program_name: string;
  department_name: string;
  teacher_name: string;
  units_count: number;
  topics_count: number;
  completed_topics_count: number;
  progress_percent: number;
  available_tests_count: number;
  published_papers_count: number;
}

export interface StudentClassDetail extends StudentClassSummary {
  description?: string | null;
  units: StudentUnitProgress[];
}

export interface StudentSubjectSyllabus {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  total_units: number;
  total_topics: number;
  completed_topics: number;
  overall_progress_percent: number;
  units: StudentUnitProgress[];
}

export interface OnlineTestSummary {
  id: string;
  title: string;
  description?: string | null;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  test_type: "OFFICIAL_EXAM" | "INTERNAL_ASSESSMENT" | "PRACTICE_QUIZ" | "MOCK_TEST";
  total_marks: number;
  duration_minutes: number;
  passing_percentage: number;
  questions_count: number;
  is_practice: boolean;
  allow_reattempt: boolean;
  attempts_count: number;
  best_score?: number | null;
  latest_attempt_id?: string | null;
  latest_status?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface OnlineTestDetail extends OnlineTestSummary {
  rules?: string | null;
  instructions?: string | null;
  syllabus_units: string[];
  show_results_immediately: boolean;
  can_attempt: boolean;
  active_attempt_id?: string | null;
}

export interface StudentTestQuestion {
  snapshot_id: string;
  question_id?: string;
  question_order?: number;
  order_index?: number;
  question_type: "MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "DESCRIPTIVE";
  marks: number;
  question_text: string;
  options: any[] | null;
  current_answer?: string | null;
  is_marked_for_review?: boolean;
}

export interface TestAttemptDetail {
  attempt_id: string;
  test_id: string;
  test_title: string;
  subject_name: string;
  subject_code?: string;
  duration_minutes?: number;
  started_at: string;
  expires_at?: string;
  deadline_at?: string;
  remaining_seconds: number;
  status: "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED" | "TIMED_OUT" | "CANCELLED";
  total_questions?: number;
  answered_questions?: number;
  questions: StudentTestQuestion[];
  saved_answers?: Record<string, any>;
}

export interface QuestionReviewItem {
  snapshot_id: string;
  question_text: string;
  question_type: string;
  marks: number;
  obtained_marks: number;
  options?: any[] | null;
  student_answer?: string | null;
  correct_answer_key?: string | null;
  explanation?: string | null;
  is_correct?: boolean | null;
  is_evaluated: boolean;
}

export interface TestResultSummary {
  attempt_id: string;
  test_id: string;
  test_title: string;
  subject_name: string;
  subject_code: string;
  test_type: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  is_passed: boolean;
  started_at: string;
  submitted_at?: string | null;
  time_taken_seconds?: number | null;
  status: string;
  total_questions: number;
  correct_count: number;
  pending_eval_count: number;
}

export interface TestResultDetail extends TestResultSummary {
  questions: QuestionReviewItem[];
}

export interface StudentDashboardData {
  enrolled_classes: StudentClassSummary[];
  upcoming_tests: OnlineTestSummary[];
  recent_results: TestResultSummary[];
  published_papers: QuestionPaper[];
  overall_syllabus_percent: number;
}

export interface UniversityAdminDashboardStats {
  university_id: string;
  university_name: string;
  university_code: string;
  total_departments: number;
  total_institutions: number;
  active_hods: number;
  active_teachers: number;
  active_exam_controllers: number;
  total_programs: number;
  total_subjects: number;
  syllabus_units_count: number;
  total_questions: number;
  questions_awaiting_review: number;
  approved_questions: number;
  total_papers: number;
  papers_by_status: Record<string, number>;
  recent_accounts: {
    id: string;
    full_name: string;
    email: string;
    role_name: string;
    department_name?: string | null;
    is_active: boolean;
    created_at: string;
  }[];
  recent_audit_events: {
    id: string;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    user_email: string;
    user_name: string;
    created_at: string;
  }[];
}

export interface UniversityDepartmentItem {
  id: string;
  organization_id: string;
  organization_name?: string | null;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  hod_name?: string | null;
  hod_email?: string | null;
  hod_id?: string | null;
  programs_count: number;
  subjects_count: number;
  teachers_count: number;
  created_at: string;
}

export interface StaffUserResponse {
  id: string;
  email: string;
  full_name: string;
  role_name: string;
  organization_id?: string | null;
  organization_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  department_code?: string | null;
  is_active: boolean;
  must_change_password: boolean;
  assigned_subjects_count?: number;
  assigned_subjects?: { id: string; code: string; name: string; role_type?: string }[];
  created_at: string;
}

export interface StaffCredentialResetResponse {
  user_id: string;
  email: string;
  full_name: string;
  temporary_password: string;
  setup_token?: string | null;
  message: string;
}

// =============================================================================
// HOD (Head of Department) Types
// =============================================================================

export interface HODFacultyStats {
  total_faculty: number;
  active_faculty: number;
}

export interface HODCurriculumStats {
  total_programs: number;
  total_subjects: number;
  total_syllabus_units: number;
}

export interface HODQuestionStats {
  total_questions: number;
  pending_review: number;
  approved_questions: number;
  rejected_questions: number;
  revision_required: number;
}

export interface HODPaperStats {
  total_papers: number;
  pending_approval: number;
  approved_papers: number;
  published_papers: number;
}

export interface HODExamStats {
  total_exams: number;
  upcoming_exams: number;
}

export interface HODDashboardStats {
  department_id: string;
  department_name: string;
  department_code: string;
  university_id: string;
  university_name: string;
  faculty_stats: HODFacultyStats;
  curriculum_stats: HODCurriculumStats;
  question_stats: HODQuestionStats;
  paper_stats: HODPaperStats;
  exam_stats: HODExamStats;
  pending_reviewer_assignments: number;
  recent_activity: {
    id: string;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    user_email: string;
    user_name: string;
    created_at: string;
  }[];
}

export interface HODFacultyItem {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  employee_code?: string | null;
  role_name: string;
  is_active: boolean;
  must_change_password: boolean;
  assigned_subjects: { id: string; code: string; name: string; role_type?: string }[];
  assigned_subjects_count: number;
  questions_count: number;
  created_at: string;
}

export interface HODProgramItem {
  id: string;
  name: string;
  code: string;
  degree_level: string;
  total_semesters: number;
  is_active: boolean;
  subjects_count: number;
  created_at: string;
}

export interface HODSubjectItem {
  id: string;
  program_id?: string | null;
  program_name?: string | null;
  semester_id?: string | null;
  semester_number?: number | null;
  name: string;
  code: string;
  credits: number;
  description?: string | null;
  is_active: boolean;
  units_count: number;
  assigned_teachers: { id: string; name: string; email: string }[];
  questions_count: number;
  created_at: string;
}

export interface HODTopicItem {
  id: string;
  title: string;
  order_index: number;
}

export interface HODUnitItem {
  id: string;
  unit_number: number;
  title: string;
  description?: string | null;
  hours: number;
  topics: HODTopicItem[];
}

export interface HODSyllabusOverviewItem {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  program_name?: string | null;
  syllabus_id?: string | null;
  version?: string | null;
  is_active: boolean;
  units_count: number;
  document_url?: string | null;
  units: HODUnitItem[];
}

export interface HODExamItem {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  title: string;
  description?: string | null;
  test_type: string;
  difficulty: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  is_published: boolean;
  attempt_limit: number;
  questions_count: number;
  created_by?: string | null;
  created_at: string;
}

export interface HODReportFacultyWorkload {
  faculty_id: string;
  faculty_name: string;
  email: string;
  assigned_subjects: number;
  questions_submitted: number;
  questions_approved: number;
  reviews_completed: number;
}

export interface HODReportQuestionHealth {
  subject_code: string;
  subject_name: string;
  total_questions: number;
  easy: number;
  medium: number;
  hard: number;
  approved: number;
  pending: number;
  rejected: number;
}

export interface HODReportPaperReadiness {
  subject_code: string;
  subject_name: string;
  paper_title: string;
  status: string;
  total_marks: number;
  questions_count: number;
  approved_by?: string | null;
  created_at: string;
}

export interface HODReportsData {
  department_name: string;
  faculty_workload: HODReportFacultyWorkload[];
  question_health: HODReportQuestionHealth[];
  paper_readiness: HODReportPaperReadiness[];
}

export interface HODEligibleReviewer {
  id: string;
  name: string;
  email: string;
  role: string;
  assigned_subjects: { id: string; code: string; name: string }[];
}

export interface PaginatedResult<T> {
  items: T[];
  total?: number;
  page?: number;
  page_size?: number;
  pages?: number;
  meta?: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}






// ==========================================
// FACULTY ROLE TYPES
// ==========================================

export interface FacultySubjectItem {
  id: string;
  code: string;
  name: string;
  credits: number;
  program_id?: string | null;
  program_name?: string | null;
  semester_id?: string | null;
  semester_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  syllabus_version: number;
  syllabus_file_url?: string | null;
  units_count: number;
  topics_count: number;
  questions_count: number;
  role_type: string;
  assigned_at?: string | null;
}

export interface FacultyTopicDetail {
  id: string;
  topic_number: number;
  title: string;
  description?: string | null;
  created_at?: string | null;
}

export interface FacultyUnitDetail {
  id: string;
  unit_number: number;
  title: string;
  description?: string | null;
  topics: FacultyTopicDetail[];
  questions_count: number;
}

export interface FacultySubjectDetail extends FacultySubjectItem {
  units: FacultyUnitDetail[];
}

export interface FacultyFeedbackItem {
  id: string;
  entity_type: "QUESTION" | "PAPER";
  title: string;
  subject_code?: string | null;
  subject_name?: string | null;
  status: string;
  reviewer_name?: string | null;
  feedback_comments?: string | null;
  updated_at?: string | null;
}

export interface FacultyExamItem {
  id: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  title: string;
  description?: string | null;
  test_type: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  is_published: boolean;
  created_at: string;
  deadline_display?: string | null;
  status: string;
}

export interface FacultyDashboardStats {
  faculty_name: string;
  department_name?: string | null;
  assigned_subjects_count: number;
  total_questions_created: number;
  draft_questions_count: number;
  pending_review_questions_count: number;
  approved_questions_count: number;
  rejected_questions_count: number;
  revision_required_questions_count: number;
  draft_papers_count: number;
  pending_review_papers_count: number;
  approved_papers_count: number;
  rejected_papers_count: number;
  revision_required_papers_count: number;
  published_papers_count: number;
  upcoming_deadlines_count: number;
  upcoming_exams: FacultyExamItem[];
  recent_feedback: FacultyFeedbackItem[];
  recent_activity: {
    id: string;
    action: string;
    entity_type: string;
    user_email: string;
    created_at: string;
  }[];
}

export interface FacultyReportsData {
  faculty_name: string;
  email: string;
  department_name?: string | null;
  total_questions: number;
  questions_by_status: Record<string, number>;
  questions_by_type: Record<string, number>;
  questions_by_difficulty: Record<string, number>;
  total_papers: number;
  papers_by_status: Record<string, number>;
  subject_workload: {
    subject_id: string;
    subject_code: string;
    subject_name: string;
    questions_authored: number;
    papers_authored: number;
  }[];
  approval_rate_percent: number;
}

// -------------------------------------------------------------
// Exam Coordinator Role Types
// -------------------------------------------------------------
export interface CoordinatorDashboardStats {
  total_assigned_exams: number;
  upcoming_exams: number;
  in_progress_exams: number;
  completed_exams: number;
  papers_awaiting_submission: number;
  papers_pending_review: number;
  papers_awaiting_approval: number;
  papers_ready: number;
  overdue_submissions: number;
  incomplete_checklists: number;
  open_issues: number;
  critical_escalations: number;
  recent_activity: {
    id: string;
    title: string;
    type: string;
    status: string;
    severity: string;
    created_at: string;
  }[];
  recent_notifications: {
    id: string;
    title: string;
    message: string;
    type: string;
    channel: string;
    is_read: boolean;
    created_at: string;
  }[];
}

export interface ExaminationItem {
  id: string;
  code: string;
  name: string;
  exam_type: string;
  organization_id: string;
  department_id?: string | null;
  department_name?: string | null;
  program_id?: string | null;
  program_name?: string | null;
  semester_id?: string | null;
  semester_name?: string | null;
  subject_id?: string | null;
  subject_code?: string | null;
  subject_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes: number;
  total_marks: number;
  venue?: string | null;
  paper_submission_deadline?: string | null;
  status: string;
  can_edit_schedule: boolean;
  readiness_percentage: number;
  readiness_status: "READY" | "PENDING" | "BLOCKED";
  paper_status: string;
  paper_id?: string | null;
  faculty_name?: string | null;
  days_remaining?: number | null;
}

export interface ExaminationDetail extends ExaminationItem {
  instructions?: string | null;
  academic_year_name?: string | null;
  assigned_coordinators: {
    user_id: string;
    name: string;
    can_edit: boolean;
  }[];
  readiness_summary: {
    total_items: number;
    completed: number;
    blocked: number;
    pending: number;
  };
}

export interface ScheduleItem {
  id: string;
  examination_id: string;
  code: string;
  name: string;
  subject_code: string;
  subject_name: string;
  program_name: string;
  semester_name: string;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes: number;
  venue?: string | null;
  paper_deadline?: string | null;
  status: string;
  can_edit: boolean;
}

export interface PaperTrackingItem {
  id?: string | null;
  examination_id: string;
  exam_name: string;
  exam_code: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  program_name: string;
  semester_name: string;
  faculty_id?: string | null;
  faculty_name?: string | null;
  reviewer_name?: string | null;
  submission_deadline?: string | null;
  last_updated?: string | null;
  paper_status: string;
  review_status: string;
  approval_status: string;
  is_overdue: boolean;
  days_remaining?: number | null;
  total_marks: number;
  version: number;
}

export interface FacultyCoordinationItem {
  faculty_id: string;
  faculty_name: string;
  faculty_email: string;
  department_name: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  examination_id: string;
  exam_name: string;
  paper_deadline?: string | null;
  paper_status: string;
  last_follow_up_date?: string | null;
  outstanding_tasks: string[];
  notes?: string | null;
}

export interface ReadinessItem {
  id: string;
  examination_id: string;
  category: "QUESTION_PAPER" | "SCHEDULING" | "OPERATIONAL" | "FINAL";
  title: string;
  description?: string | null;
  is_required: boolean;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "NOT_APPLICABLE";
  notes?: string | null;
  updated_by_name?: string | null;
  updated_at?: string | null;
}

export interface OperationalIssueItem {
  id: string;
  examination_id: string;
  exam_name: string;
  subject_name?: string | null;
  title: string;
  description: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "ESCALATED" | "RESOLVED" | "CLOSED";
  reported_by_name?: string | null;
  assigned_to_name?: string | null;
  is_escalated: boolean;
  escalated_to_name?: string | null;
  escalation_reason?: string | null;
  escalated_at?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface CoordinatorNotificationItem {
  id: string;
  recipient_id: string;
  sender_name?: string | null;
  examination_id?: string | null;
  exam_name?: string | null;
  title: string;
  message: string;
  notification_type: string;
  channel: string;
  is_read: boolean;
  created_at: string;
}

export interface CoordinatorReportsData {
  total_exams: number;
  total_papers: number;
  papers_approved: number;
  papers_overdue: number;
  readiness_rate: number;
  exam_progress_rows: {
    exam_code: string;
    exam_name: string;
    subject_code: string;
    subject_name: string;
    paper_status: string;
    submission_deadline: string;
    is_overdue: boolean;
  }[];
  faculty_coordination_rows: any[];
  review_approval_rows: any[];
  readiness_rows: {
    category: string;
    total_items: number;
    completed: number;
    blocked: number;
  }[];
  issue_summary: {
    total_issues: number;
    open: number;
    in_progress: number;
    escalated: number;
    resolved: number;
    critical: number;
  };
}


// Exam Controller Role Types
export interface ControllerDashboardStats {
  total_examinations: number;
  scheduled_examinations: number;
  in_progress_examinations: number;
  completed_examinations: number;
  papers_awaiting_approval: number;
  papers_pending_prior_review: number;
  revision_queue_count: number;
  finalized_papers_count: number;
  released_papers_count: number;
  overdue_submissions: number;
  open_critical_issues: number;
  active_coordinators: number;
  recent_activities: {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    created_at?: string;
    metadata?: any;
  }[];
  urgent_alerts: {
    type: string;
    severity: string;
    message: string;
  }[];
}

export interface ControllerExamItem {
  id: string;
  code: string;
  name: string;
  exam_type: string;
  organization_id: string;
  department_id?: string;
  department_name?: string;
  program_id?: string;
  program_name?: string;
  semester_id?: string;
  semester_name?: string;
  subject_id?: string;
  subject_code?: string;
  subject_name?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
  total_marks: number;
  venue?: string;
  paper_submission_deadline?: string;
  status: string;
  readiness_percentage: number;
  paper_status: string;
  paper_id?: string;
  assigned_coordinators_count: number;
}

export interface ControllerScheduleItem {
  id: string;
  code: string;
  name: string;
  department_name?: string;
  program_name?: string;
  subject_code?: string;
  subject_name?: string;
  venue?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
  status: string;
  has_conflict: boolean;
  conflicts: string[];
}

export interface ControllerPaperApprovalItem {
  id: string;
  title: string;
  exam_name: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  department_name?: string;
  total_marks: number;
  duration_minutes?: number;
  status: string;
  version: number;
  is_locked: boolean;
  created_by_name?: string;
  reviewed_by_name?: string;
  has_prior_review: boolean;
  validation_passed: boolean;
  validation_errors: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ControllerRevisionQueueItem {
  id: string;
  title: string;
  exam_name: string;
  subject_code: string;
  subject_name: string;
  department_name?: string;
  status: string;
  version: number;
  rejection_reason?: string;
  revision_comments?: string;
  created_by_name?: string;
  updated_at?: string;
}

export interface ControllerFinalizedPaperItem {
  id: string;
  title: string;
  exam_name: string;
  subject_code: string;
  subject_name: string;
  department_name?: string;
  version: number;
  total_marks: number;
  status: string;
  is_locked: boolean;
  finalized_at?: string;
  finalized_by_name?: string;
  finalization_hash?: string;
  release_status: string;
}

export interface ControllerPaperReleaseItem {
  id: string;
  paper_id: string;
  paper_title: string;
  subject_code: string;
  subject_name: string;
  examination_name?: string;
  release_status: string;
  scheduled_release_at?: string;
  released_at?: string;
  released_by_name?: string;
  recipient_roles: string[];
  release_notes?: string;
  download_token_hash?: string;
  is_locked: boolean;
  created_at?: string;
}

export interface ControllerCoordinatorAssignmentItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  examination_id?: string;
  examination_code?: string;
  examination_name?: string;
  department_id?: string;
  department_name?: string;
  can_edit_schedule: boolean;
  is_active: boolean;
  assigned_at?: string;
  assigned_by_name?: string;
}

export interface ControllerReportsData {
  total_examinations: number;
  examinations_by_status: Record<string, number>;
  papers_by_status: Record<string, number>;
  department_performance: {
    department_id: string;
    department_name: string;
    total_examinations: number;
    readiness_rate: number;
    completed_exams: number;
  }[];
  readiness_breakdown: Record<string, number>;
  avg_turnaround_hours: number;
  security_incidents_total: number;
  resolved_issues_total: number;
  open_critical_issues_total: number;
}

export interface ControllerAuditLogItem {
  id: string;
  action: string;
  entity_name?: string;
  entity_id?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  details?: string;
  ip_address?: string;
  created_at?: string;
}
