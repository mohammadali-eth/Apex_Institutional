export type UserRole =
  | 'super_admin'
  | 'university_admin'
  | 'institution_admin'
  | 'department_admin'
  | 'faculty'
  | 'question_paper_reviewer'
  | 'exam_controller'
  | 'exam_coordinator'
  | 'question_bank_manager'
  | 'quality_controller'
  | 'student'
  | 'viewer'
  | 'system_auditor'
  | 'guest';

export type UniversityId = string;
export type InstitutionType = 'University' | 'College' | 'School' | 'ITI' | 'Polytechnic';
export type AcademicStatus = 'active' | 'inactive';

export type PermissionName =
  | 'user.view'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'question.view'
  | 'question.create'
  | 'question.update'
  | 'question.delete'
  | 'question.approve'
  | 'question_bank.view'
  | 'question_bank.manage'
  | 'question_bank.archive'
  | 'paper.view'
  | 'paper.create'
  | 'paper.update'
  | 'paper.submit'
  | 'paper.review'
  | 'paper.approve'
  | 'paper.finalize'
  | 'paper.publish'
  | 'exam.view'
  | 'exam.create'
  | 'exam.update'
  | 'exam.manage'
  | 'report.view'
  | 'audit.view'
  | 'system.manage';

export interface RoleDefinition {
  id: UserRole;
  label: string;
  permissions: PermissionName[];
  description?: string;
  responsibilities?: string[];
  scope?: string;
}

export interface AssignedDepartment {
  id: string;
  name: string;
  code: string;
  institutionId: string;
  institutionName: string;
  programCount: number;
  subjectCount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId: string;
  institutionName: string;
  departmentId?: string; // Current active department
  departmentName?: string;
  assignedDepartments: AssignedDepartment[]; // Critical for 1 dept vs >1 dept vs 0 dept flow
  universityId?: string;
  institutionIds?: string[];
  departmentIds?: string[];
  subjectIds?: string[];
  examIds?: string[];
  permissions?: PermissionName[];
  isActive?: boolean;
}

export type ExaminationStatus = 'PLANNED'|'SCHEDULED'|'ACTIVE'|'COMPLETED'|'CANCELLED';
export interface Examination { id: string; name: string; code?: string; academicYear?: string; semester?: string; institutionId?: string; departmentId?: string; departmentIds?: string[]; startDate?: string; endDate?: string; status?: ExaminationStatus; coordinatorIds?: string[]; controllerId?: string; }
export type Exam = Examination;
export interface AuditEvent { id: string; action: string; actorId: string; occurredAt: string; timestamp?: string; userId?: string; userName?: string; resource?: string; resourceId?: string; description?: string; ipAddress?: string; severity?: 'INFO'|'WARNING'|'CRITICAL'; }
export interface Notification { id: string; title: string; message: string; read: boolean; }
export interface QuestionBank { id: string; name: string; subjectId: string; }
export interface QuestionPaper { id: string; title: string; examId: string; departmentId?: string; }

export interface Institution {
  id: string;
  name: string;
  code: string;
  type: InstitutionType;
  status: AcademicStatus;
  universityId?: string;
  address?: string;
  contactEmail?: string;
}

export interface University {
  id: string;
  name: string;
  code: string;
  type: 'State University' | 'Private University' | 'Autonomous University';
  status: AcademicStatus;
  region?: string;
  address?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  institutionId: string;
  hodName: string;
  status: 'active' | 'inactive';
}

export interface Program {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  durationYears: number;
  status: AcademicStatus;
  institutionId?: string;
  tagline?: string;
}

export interface Semester {
  id: string;
  number: number;
  label: string;
  programId: string;
}

export interface Topic {
  id: string;
  name: string;
  subjectId: string;
  unitId: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  programId: string;
  semesterId: string;
  credits: number;
  language: string;
  unitCount: number;
  questionCount: number;
  status: 'active' | 'inactive';
  description?: string;
  syllabusVersion?: string;
  category?: string;
  universityId?: string;
  institutionId?: string;
}

export interface Unit {
  id: string;
  number: number;
  name: string;
  subjectId: string;
  weightagePercent?: number;
}

export interface Chapter {
  id: string;
  name: string;
  unitId: string;
}

export interface MaterialTopic {
  id: string;
  name: string;
  confidenceScore: number;
}

export interface MaterialUnit {
  id: string;
  unitNumber: number;
  name: string;
  topics: MaterialTopic[];
}

export interface Material {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  departmentId: string;
  sourceType: 'pdf' | 'scanned_image' | 'text_paste';
  uploadedBy: string;
  uploadedAt: string;
  status: 'detected' | 'reviewed' | 'approved';
  rawText?: string;
  extractedUnits: MaterialUnit[];
}

export type QuestionType =
  | 'MCQ'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'ESSAY'
  | 'NUMERICAL'
  | 'DESCRIPTIVE'
  | 'mcq'
  | 'true_false'
  | 'fill_blank'
  | 'one_word'
  | 'short'
  | 'long'
  | 'essay'
  | 'explain'
  | 'difference'
  | 'problem';

export type BloomLevel =
  | 'REMEMBER'
  | 'UNDERSTAND'
  | 'APPLY'
  | 'ANALYZE'
  | 'EVALUATE'
  | 'CREATE';
export type CanonicalQuestionType = 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'ESSAY' | 'NUMERICAL' | 'DESCRIPTIVE';
export type CanonicalDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type QuestionQualityStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

export interface PreviousPaperQuery {
  institutionId?: string;
  departmentId: string;
  programId?: string;
  academicLevelId?: string;
  semesterId?: string;
  subjectId: string;
  academicYear?: string;
  language?: string;
  set?: string;
}

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'Easy' | 'Medium' | 'Hard';
export type QuestionStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' | 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Archived';
export type QuestionLanguage = 'English' | 'Hindi' | 'Gujarati' | 'Regional';

export interface McqOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface QuestionVersion {
  version: number;
  editedBy: string;
  editedAt: string;
  status: QuestionStatus;
  text: string;
  marks: number;
  difficulty: DifficultyLevel;
  answer: string;
  comments?: string;
  options?: McqOption[];
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
}

export interface Question {
  id: string;
  questionText?: string;
  questionType?: CanonicalQuestionType;
  isPublic?: boolean;
  subjectId: string;
  subjectName: string;
  programId?: string;
  programName?: string;
  unitId: string;
  unitName: string;
  topicId?: string;
  topicName?: string;
  chapterId?: string;
  chapterName?: string;
  departmentId: string;
  institutionId: string;
  universityId?: string;
  type: QuestionType;
  language: QuestionLanguage;
  marks: number;
  difficulty: DifficultyLevel;
  bloomLevel?: BloomLevel;
  text: string;
  answer: string;
  explanation?: string;
  answerKey?: string;
  tags: string[];
  status: QuestionStatus;
  qualityStatus?: QuestionQualityStatus;
  options?: McqOption[];
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  version: number;
  versionHistory: QuestionVersion[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PaperQuestion {
  id: string;
  questionId: string;
  version: number;
  text: string;
  marks: number;
  unitName: string;
  difficulty: DifficultyLevel;
  type: QuestionType;
  options?: McqOption[];
}

export interface PaperSection {
  id: string;
  title: string;
  instructions: string;
  marksPerQuestion: number;
  questions: PaperQuestion[];
}

export interface PreviousPaper {
  id: string;
  institutionId: string;
  departmentId: string;
  programId: string;
  academicLevelId?: string;
  semesterId?: string;
  subjectId: string;

  subjectName: string;
  programName: string;

  academicYear: string;
  generatedAt: string;

  totalMarks: number;
  duration: string;

  language: string;
  set: 'A' | 'B' | 'C' | 'D';

  questionCount: number;
  unitCount: number;

  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived';

  createdBy: string;
  sections?: PaperSection[];
  questionVersionsUsed?: { questionId: string; version: number }[];
  remarks?: string;
  workflowStatus?: PaperStatus;
  title?: string;
  examId?: string;
  universityId?: string;
  submittedBy?: string;
  reviewerId?: string;
  qualityControllerId?: string;
  examControllerId?: string;
  instructions?: string;
  reviewComments?: string[];
  qualityComments?: string[];
  version?: number;
  timeline?: { status: PaperStatus; actor: string; at: string; comment?: string }[];
  history?: { version: number; changedBy: string; changedAt: string; summary: string }[];
}

export const PAPER_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'QUALITY_REVIEW', 'QUALITY_APPROVED', 'PENDING_FINAL_APPROVAL', 'APPROVED', 'FINALIZED', 'PUBLISHED', 'ARCHIVED'] as const;
export type PaperStatus = typeof PAPER_STATUSES[number];

export interface BlueprintItem {
  id: string;
  questionType: QuestionType;
  questionCount: number;
  marksPerQuestion: number;
  totalMarks: number;
}

export interface PaperGenerationAdvancedSettings {
  excludePreviousPaperQuestions: boolean;
  reduceRepetitionFromRecent: boolean;
  excludePapersYears: number;
  preventSimilarQuestions: boolean;
  autoBalanceUnits: boolean;
}

export interface PaperGenerationContext {
  institutionId: string;
  departmentId: string;
  programId: string;
  semesterId: string;
  subjectId: string;
  academicYear: string;
  examDuration: string;
  totalMarks: number;
  set: 'A' | 'B' | 'C' | 'D';
  language: string;
  referencePaperId?: string;
  referencePaperName?: string;
  blueprint: BlueprintItem[];
  advancedSettings: PaperGenerationAdvancedSettings;
}
