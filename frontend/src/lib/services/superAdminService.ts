/**
 * Super Administrator API Service
 *
 * Communicates with /api/v1/super-admin endpoints using credentialed cookies
 * and CSRF double-submit token headers.
 */

import { authService } from './authService';

export interface UniversityItem {
  id: string;
  code: string;
  name: string;
  type: string;
  status: 'active' | 'suspended' | 'inactive';
  region?: string | null;
  address?: string | null;
  institutions_count: number;
  admins_count: number;
  created_at: string;
  updated_at: string;
}

export interface InstitutionItem {
  id: string;
  university_id: string;
  code: string;
  name: string;
  type: string;
  status: 'active' | 'suspended' | 'inactive';
  address?: string | null;
  contact_email?: string | null;
  departments_count: number;
  created_at: string;
  updated_at: string;
}

export interface UniversityAdminItem {
  id: string;
  email: string;
  full_name?: string | null;
  status: 'pending_verification' | 'active' | 'locked' | 'disabled';
  created_at: string;
  last_login_at?: string | null;
  roles: Array<{
    id: string;
    role_code: string;
    role_name: string;
    university_id?: string | null;
    university_name?: string | null;
    is_active: boolean;
    created_at: string;
  }>;
}

export interface PlatformStats {
  total_universities: number;
  total_institutions: number;
  total_departments: number;
  total_users: number;
  pending_invitations: number;
}

export interface DepartmentItem {
  id: string;
  institution_id: string;
  code: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface RoleItem {
  id: string;
  code: string;
  name: string;
  description: string;
  is_system: boolean;
  is_active: boolean;
}

export interface AuditEventItem {
  id: string;
  action?: string;
  event_type?: string;
  actor_user_id?: string | null;
  user_id?: string | null;
  target_user_id?: string | null;
  created_at: string;
  timestamp?: string;
  ip_address?: string | null;
  details?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type UniversityResponse = UniversityItem;
export type InstitutionResponse = InstitutionItem;
export type DepartmentResponse = DepartmentItem;
export type RoleResponse = RoleItem;
export type UniversityAdminUserResponse = UniversityAdminItem;
export type PlatformStatsResponse = PlatformStats;
export type AuditEventResponse = AuditEventItem;

class SuperAdminService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method?.toUpperCase() || 'GET')) {
      const csrfToken = await authService.getCsrfToken();
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
      }
    }
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  }

  async getStats(): Promise<PlatformStats> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/super-admin/stats`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch platform statistics');
    }
    return res.json();
  }

  async listUniversities(status?: string): Promise<UniversityItem[]> {
    const url = status
      ? `${this.baseUrl}/super-admin/universities?status=${encodeURIComponent(status)}`
      : `${this.baseUrl}/super-admin/universities`;
    const res = await this.fetchWithAuth(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch universities');
    }
    return res.json();
  }

  async createUniversity(data: {
    code: string;
    name: string;
    type?: string;
    region?: string;
    address?: string;
  }): Promise<UniversityItem> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/super-admin/universities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to register university');
    }
    return res.json();
  }

  async updateUniversity(
    universityId: string,
    data: Partial<{
      name: string;
      type: string;
      status: 'active' | 'suspended' | 'inactive';
      region: string;
      address: string;
    }>
  ): Promise<UniversityItem> {
    const res = await this.fetchWithAuth(
      `${this.baseUrl}/super-admin/universities/${universityId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update university');
    }
    return res.json();
  }

  async listInstitutions(universityId: string): Promise<InstitutionItem[]> {
    const res = await this.fetchWithAuth(
      `${this.baseUrl}/super-admin/universities/${universityId}/institutions`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch institutions');
    }
    return res.json();
  }

  async createInstitution(
    universityId: string,
    data: {
      code: string;
      name: string;
      type?: string;
      contact_email?: string;
      address?: string;
    }
  ): Promise<InstitutionItem> {
    const res = await this.fetchWithAuth(
      `${this.baseUrl}/super-admin/universities/${universityId}/institutions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to create institution');
    }
    return res.json();
  }

  async listAdmins(universityId?: string): Promise<UniversityAdminItem[]> {
    const url = universityId
      ? `${this.baseUrl}/super-admin/admins?university_id=${encodeURIComponent(universityId)}`
      : `${this.baseUrl}/super-admin/admins`;
    const res = await this.fetchWithAuth(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch administrators');
    }
    return res.json();
  }

  async provisionAdmin(data: {
    email: string;
    full_name: string;
    university_id: string;
    password: string;
  }): Promise<UniversityAdminItem> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/super-admin/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to provision University Admin');
    }
    return res.json();
  }

  async updateAdminStatus(
    userId: string,
    status: 'active' | 'disabled' | 'locked'
  ): Promise<{ message: string }> {
    const res = await this.fetchWithAuth(
      `${this.baseUrl}/super-admin/admins/${userId}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update administrator status');
    }
    return res.json();
  }

  async listAuditEvents(limit: number = 50): Promise<AuditEventItem[]> {
    const res = await this.fetchWithAuth(
      `${this.baseUrl}/super-admin/audit-events?limit=${limit}`
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch audit events');
    }
    return res.json();
  }

  async getAuditEvents(limit: number = 50): Promise<AuditEventItem[]> {
    return this.listAuditEvents(limit);
  }

  async getPlatformStats(): Promise<PlatformStats> {
    return this.getStats();
  }

  async listUniversityAdmins(universityId?: string): Promise<UniversityAdminItem[]> {
    return this.listAdmins(universityId);
  }

  async provisionUniversityAdmin(data: {
    email: string;
    username?: string;
    full_name?: string;
    university_id: string;
    password: string;
  }): Promise<UniversityAdminItem> {
    return this.provisionAdmin({
      email: data.email,
      full_name: data.full_name || data.username || data.email,
      university_id: data.university_id,
      password: data.password,
    });
  }

  async updateUniversityStatus(
    universityId: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'active' | 'suspended' | 'inactive'
  ): Promise<UniversityItem> {
    const norm = status.toLowerCase() as 'active' | 'suspended' | 'inactive';
    return this.updateUniversity(universityId, { status: norm });
  }
}

export const superAdminService = new SuperAdminService();
