/**
 * University Administrator API Service
 *
 * Scoped administrative service communicating with FastAPI /api/v1/university-admin endpoints
 * using HttpOnly cookies and CSRF protection headers.
 */

import { authService, UserRoleAssignmentResponse } from './authService';
import {
  UniversityResponse,
  InstitutionResponse,
  DepartmentResponse,
  RoleResponse,
} from './superAdminService';

export interface StaffMemberResponse {
  id: string;
  email: string;
  username?: string;
  full_name?: string | null;
  status?: string;
  is_active?: boolean;
  is_verified?: boolean;
  roles?: UserRoleAssignmentResponse[];
  role_assignments?: UserRoleAssignmentResponse[];
  created_at?: string;
  last_login_at?: string | null;
}

export interface StaffInvitationResponse {
  id: string;
  email: string;
  full_name?: string | null;
  university_id: string;
  role: RoleResponse;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expires_at: string;
  created_at: string;
}

export interface InviteStaffRequest {
  email: string;
  full_name?: string;
  role_code: string;
  institution_id?: string;
  department_id?: string;
}

export interface CreateStaffUserPayload {
  email: string;
  password: string;
  full_name: string;
  role_code: string;
  institution_id?: string;
  department_id?: string;
}

export interface UpdateStaffUserPayload {
  full_name?: string;
  email?: string;
  role_code?: string;
  institution_id?: string;
  department_id?: string;
  status?: string;
  password?: string;
}

export interface AssignRoleRequest {
  role_code: string;
  institution_id?: string;
  department_id?: string;
}

class UniversityAdminService {
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

  async getAssignedOrganization(): Promise<UniversityResponse> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/organization`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch assigned university');
    }
    return res.json();
  }

  async listInstitutions(): Promise<InstitutionResponse[]> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/institutions`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to list institutions');
    }
    return res.json();
  }

  async createInstitution(data: { name: string; code: string }): Promise<InstitutionResponse> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/institutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to create institution');
    }
    return res.json();
  }

  async listDepartments(institutionId?: string): Promise<DepartmentResponse[]> {
    const query = institutionId ? `?institution_id=${encodeURIComponent(institutionId)}` : '';
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/departments${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to list departments');
    }
    return res.json();
  }

  async createDepartment(data: { name: string; code: string; institution_id?: string }): Promise<DepartmentResponse> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to create department');
    }
    return res.json();
  }

  async listDelegableRoles(): Promise<RoleResponse[]> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/delegable-roles`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch delegable roles');
    }
    return res.json();
  }

  async listStaff(): Promise<StaffMemberResponse[]> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/staff`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to list staff members');
    }
    return res.json();
  }

  async listAuthorizedDomains(): Promise<string[]> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/domains`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to list authorized domains');
    }
    return res.json();
  }

  async provisionStaffUser(data: CreateStaffUserPayload): Promise<StaffMemberResponse> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.detail || 'Failed to provision staff member');
    }
    return res.json();
  }

  async inviteStaff(data: InviteStaffRequest): Promise<StaffInvitationResponse> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/staff/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to issue staff invitation');
    }
    return res.json();
  }

  async listInvitations(): Promise<StaffInvitationResponse[]> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/invitations`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to list invitations');
    }
    return res.json();
  }

  async resendInvitation(invitationId: string): Promise<StaffInvitationResponse> {
    const res = await this.fetchWithAuth(
      `${this.baseUrl}/university-admin/invitations/${invitationId}/resend`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to resend invitation');
    }
    return res.json();
  }

  async revokeInvitation(invitationId: string): Promise<StaffInvitationResponse> {
    const res = await this.fetchWithAuth(
      `${this.baseUrl}/university-admin/invitations/${invitationId}/revoke`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to revoke invitation');
    }
    return res.json();
  }

  async assignRole(userId: string, data: AssignRoleRequest): Promise<UserRoleAssignmentResponse> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/staff/${userId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to assign role');
    }
    return res.json();
  }

  async revokeRole(userId: string, roleCode: string): Promise<{ message: string }> {
    const res = await this.fetchWithAuth(
      `${this.baseUrl}/university-admin/staff/${userId}/roles/${roleCode}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to revoke role');
    }
    return res.json();
  }

  async updateStaffStatus(userId: string, isActive: boolean): Promise<{ message: string; is_active: boolean }> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/staff/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive, status: isActive ? 'active' : 'disabled' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.detail || 'Failed to update staff status');
    }
    return res.json();
  }

  async updateStaffUser(userId: string, data: UpdateStaffUserPayload): Promise<StaffMemberResponse> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/staff/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.detail || 'Failed to update staff member');
    }
    return res.json();
  }

  async deleteStaffUser(userId: string): Promise<{ message: string }> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/university-admin/staff/${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.detail || 'Failed to delete staff member');
    }
    return res.json();
  }
}

export const universityAdminService = new UniversityAdminService();
