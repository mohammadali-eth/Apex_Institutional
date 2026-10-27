/**
 * Backend Authentication & Secure Session API Client
 *
 * Communicates with FastAPI /api/v1/auth endpoints using HttpOnly cookies
 * and CSRF double-submit token protection.
 *
 * Tokens are NEVER stored in localStorage or sessionStorage.
 */

import { env } from '@/lib/env';

export interface UserRoleAssignmentResponse {
  id: string;
  role_id: string;
  role_code: string;
  role_name: string;
  university_id?: string | null;
  university_name?: string | null;
  institution_id?: string | null;
  institution_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  username?: string;
  full_name?: string | null;
  status: 'pending_verification' | 'active' | 'locked' | 'disabled';
  email_verified_at: string | null;
  created_at: string;
  last_login_at: string | null;
  roles?: UserRoleAssignmentResponse[];
  role_assignments?: UserRoleAssignmentResponse[];
  active_role?: string | null;
  primary_role?: string | null;
  portal_route?: string;
}

export interface VerifyInvitationResponse {
  valid: boolean;
  email: string;
  role_code: string;
  role_name: string;
  university_name: string;
  institution_name?: string | null;
  department_name?: string | null;
  expires_at: string;
  full_name?: string | null;
}

export type InvitationVerificationResponse = VerifyInvitationResponse;

export interface ApiMessageResponse {
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: Array<{ field: string; message: string }>;
  };
}

class AuthService {
  private baseUrl: string;
  private cachedCsrfToken: string | null = null;

  constructor() {
    this.baseUrl = env.NEXT_PUBLIC_API_URL;
  }

  /**
   * Helper to retrieve CSRF token from document.cookie
   */
  private getCsrfFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(
      new RegExp('(^|;\\s*)qpms_csrf=([^;]*)')
    );
    return match ? decodeURIComponent(match[2]) : null;
  }

  /**
   * Fetch or return cached CSRF token
   */
  async getCsrfToken(): Promise<string> {
    const fromCookie = this.getCsrfFromCookie();
    if (fromCookie) {
      this.cachedCsrfToken = fromCookie;
      return fromCookie;
    }

    try {
      const res = await fetch(`${this.baseUrl}/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        this.cachedCsrfToken = data.csrf_token;
        return data.csrf_token;
      }
    } catch {
      // Return empty string or fallback on network error
    }
    return this.cachedCsrfToken || '';
  }

  /**
   * Authenticate user with credentials and obtain HttpOnly session cookie
   */
  async login(email: string, password: string): Promise<AuthUserResponse> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (!res.ok) {
      const errorData: ApiErrorResponse = await res.json().catch(() => ({
        error: { code: 'HTTP_ERROR', message: 'Authentication failed' },
      }));
      const detailMsg = errorData.error?.details?.map((d) => d.message).join(', ');
      throw new Error(detailMsg || errorData.error?.message || 'Invalid email or password.');
    }

    // Refresh CSRF token after login
    this.cachedCsrfToken = this.getCsrfFromCookie();
    return res.json();
  }

  /**
   * Retrieve current authenticated user identity from backend session
   */
  async getMe(): Promise<AuthUserResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Log out active session and clear cookies
   */
  async logout(): Promise<void> {
    const csrfToken = await this.getCsrfToken();
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    }
    this.cachedCsrfToken = null;
  }

  /**
   * Log out all active sessions across all devices
   */
  async logoutAll(): Promise<void> {
    const csrfToken = await this.getCsrfToken();
    const res = await fetch(`${this.baseUrl}/auth/logout-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to logout from all devices');
    }
    this.cachedCsrfToken = null;
  }

  /**
   * Change password for the current user
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiMessageResponse> {
    const csrfToken = await this.getCsrfToken();
    const res = await fetch(`${this.baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (!res.ok) {
      const err: ApiErrorResponse = await res.json().catch(() => ({
        error: { code: 'HTTP_ERROR', message: 'Failed to update password' },
      }));
      throw new Error(err.error?.message || 'Failed to update password');
    }
    return res.json();
  }

  /**
   * Request password recovery email
   */
  async forgotPassword(email: string): Promise<ApiMessageResponse> {
    const res = await fetch(`${this.baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.trim() }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Password reset request failed');
    }
    return res.json();
  }

  /**
   * Reset password using single-use recovery token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<ApiMessageResponse> {
    const res = await fetch(`${this.baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, new_password: newPassword }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Password reset failed');
    }
    return res.json();
  }

  /**
   * Verify email address using token
   */
  async verifyEmail(token: string): Promise<ApiMessageResponse> {
    const res = await fetch(`${this.baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Email verification failed');
    }
    return res.json();
  }

  /**
   * Resend email verification instructions
   */
  async resendVerification(email: string): Promise<ApiMessageResponse> {
    const res = await fetch(`${this.baseUrl}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.trim() }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.error?.message || 'Resend verification request failed'
      );
    }
    return res.json();
  }

  /**
   * Validate a staff invitation token preview
   */
  async verifyInvitation(token: string): Promise<VerifyInvitationResponse> {
    const res = await fetch(
      `${this.baseUrl}/auth/invitation/verify?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Invalid or expired invitation token');
    }
    return res.json();
  }

  /**
   * Consume an invitation token and establish initial credentials
   */
  async acceptInvitation(payload: {
    token: string;
    password: string;
    full_name?: string;
    username?: string;
  }): Promise<ApiMessageResponse> {
    const res = await fetch(`${this.baseUrl}/auth/invitation/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to activate staff invitation');
    }
    return res.json();
  }
}

export const authService = new AuthService();
