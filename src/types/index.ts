export type UserRole =
  | 'university_admin'
  | 'institution_admin'
  | 'hod'
  | 'teacher'
  | 'coordinator';

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
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  type: 'University' | 'College' | 'School' | 'ITI' | 'Polytechnic';
  status: 'active' | 'inactive';
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
  status: 'active' | 'inactive';
}

export interface Semester {
  id: string;
  number: number;
  label: string;
  programId: string;
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

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type QuestionStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Archived';
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
  subjectId: string;
  subjectName: string;
  unitId: string;
  unitName: string;
  chapterId: string;
  chapterName: string;
  departmentId: string;
  institutionId: string;
  type: QuestionType;
  language: QuestionLanguage;
  marks: number;
  difficulty: DifficultyLevel;
  text: string;
  answer: string;
  tags: string[];
  status: QuestionStatus;
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
}

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
