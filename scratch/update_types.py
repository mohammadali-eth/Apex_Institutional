with open('frontend/lib/types.ts', 'r', encoding='utf-8') as f:
    c = f.read().replace('\r\n', '\n')

old_q = """export interface QuestionPaperQuestion {
  id: string;
  question_id: string;
  order_index: number;
  marks: number;
  is_compulsory: boolean;
  or_group_id?: string | null;
  source_type?: string;
  bloom_level?: string;
  marking_scheme?: string | null;
  expected_answer?: string | null;
  question: Question;
}

export interface QuestionPaperSection {
  id: string;
  name: string;
  instructions?: string | null;
  order_index: number;
  total_marks: number;
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
  title: string;
  exam_name: string;
  duration_minutes: number;
  total_marks: number;
  current_marks: number;
  status: "DRAFT" | "GENERATED" | "UNDER_REVIEW" | "APPROVED" | "FINALIZED" | "REJECTED" | "PUBLISHED" | "ARCHIVED";
  instructions?: string | null;
  version: number;
  created_by?: string | null;
  creator_name?: string | null;
  source_ratio?: { bank_percentage: number; ai_percentage: number } | null;
  validation_status?: string | null;
  sections: QuestionPaperSection[];
  created_at: string;
  updated_at: string;
}"""

new_q = """export interface QuestionPaperQuestion {
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
}"""

if old_q in c:
    c = c.replace(old_q, new_q)
    with open('frontend/lib/types.ts', 'w', encoding='utf-8') as f:
        f.write(c)
    print('SUCCESS')
else:
    print('NOT FOUND')
