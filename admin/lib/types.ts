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
}

export interface UniversityAdminSummary {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface UniversityDetailResponse {
  id: string;
  name: string;
  code: string;
  type: string;
  state?: string | null;
  country?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
  admins: UniversityAdminSummary[];
  faculty_count: number;
  student_count: number;
  program_count: number;
  question_count: number;
  paper_count: number;
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

export interface AuditLog {
  id: string;
  user_id: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface SuperAdminDashboardStats {
  total_universities: number;
  active_universities: number;
  suspended_universities: number;
  total_institutions: number;
  total_users: number;
  total_questions: number;
  total_papers: number;
  system_status: string;
}
