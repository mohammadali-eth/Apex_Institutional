'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AssignedDepartment } from '@/types';
import { userService } from '@/lib/services/userService';
import { authService, AuthUserResponse } from '@/lib/services/authService';
import { loadDemoState, saveDemoState } from '@/data/demoState';
import { auditService } from '@/lib/services/auditService';
import { ROLE_DEFINITIONS } from '@/lib/permissions/rolePermissions';

const ROLE_CODE_MAP: Record<string, UserRole> = {
  SUPER_ADMIN: 'super_admin',
  UNIVERSITY_ADMIN: 'university_admin',
  INSTITUTION_ADMIN: 'institution_admin',
  DEPARTMENT_ADMIN: 'department_admin',
  FACULTY_QUESTION_SETTER: 'faculty',
  QUESTION_PAPER_REVIEWER: 'question_paper_reviewer',
  EXAM_CONTROLLER: 'exam_controller',
  EXAM_COORDINATOR: 'exam_coordinator',
  QUESTION_BANK_MANAGER: 'question_bank_manager',
  QUALITY_CONTROLLER: 'quality_controller',
  STUDENT: 'student',
  GENERAL_USER: 'viewer',
};

function resolveFrontendUserFromBackend(authRes: AuthUserResponse): User {
  const allUsers = userService.getUsers();
  const localMatch = allUsers.find((u) => u.email.toLowerCase() === authRes.email.toLowerCase());

  const activeCode =
    authRes.active_role ||
    authRes.primary_role ||
    authRes.roles?.[0]?.role_code ||
    authRes.role_assignments?.[0]?.role_code ||
    'GENERAL_USER';

  const mappedRole: UserRole = ROLE_CODE_MAP[activeCode] || 'viewer';

  if (localMatch) {
    return {
      ...localMatch,
      role: mappedRole,
      name: authRes.full_name || localMatch.name,
      isActive: authRes.status === 'active',
    };
  }

  const rawAssignments = authRes.roles || authRes.role_assignments || [];
  const assignedDepts: AssignedDepartment[] = rawAssignments
    .filter((r) => r.department_id && r.is_active)
    .map((r) => ({
      id: r.department_id!,
      name: r.department_name || 'Academic Department',
      code: r.department_name?.substring(0, 3).toUpperCase() || 'DEP',
      institutionId: r.institution_id || 'inst-apex',
      institutionName: r.institution_name || 'Apex University',
      programCount: 1,
      subjectCount: 1,
    }));

  const primaryScope = rawAssignments[0];
  const permissions = ROLE_DEFINITIONS[mappedRole]?.permissions || [];

  return {
    id: authRes.id,
    name: authRes.full_name || authRes.email.split('@')[0].toUpperCase(),
    email: authRes.email,
    role: mappedRole,
    institutionId: primaryScope?.institution_id || 'inst-apex',
    institutionName: primaryScope?.institution_name || 'Apex University',
    universityId: primaryScope?.university_id || 'APEX-UNIV',
    departmentId: assignedDepts[0]?.id,
    departmentName: assignedDepts[0]?.name,
    assignedDepartments: assignedDepts,
    permissions,
    isActive: authRes.status === 'active',
  };
}

export interface AuthContextType {
  currentUser: User | null;
  backendUser: AuthUserResponse | null;
  isAuthenticated: boolean;
  login: (userId: string) => { requiresDeptSelection: boolean; noDeptAssigned: boolean };
  loginWithCredentials: (
    email: string,
    password: string
  ) => Promise<{
    success: boolean;
    error?: string;
    portalRoute?: string;
    status?: { requiresDeptSelection: boolean; noDeptAssigned: boolean };
  }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => void;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  backendUser: null,
  isAuthenticated: false,
  login: () => ({ requiresDeptSelection: false, noDeptAssigned: false }),
  loginWithCredentials: async () => ({ success: false, error: 'Not implemented' }),
  logout: async () => {},
  switchUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<AuthUserResponse | null>(null);

  // Synchronize session on initial mount
  useEffect(() => {
    let isMounted = true;

    async function checkBackendSession() {
      try {
        const me = await authService.getMe();
        if (me && isMounted) {
          setBackendUser(me);
          const mapped = resolveFrontendUserFromBackend(me);
          setCurrentUser(mapped);
          return;
        }
      } catch {
        // Backend not currently connected or session inactive
      }

      // Fallback to local demo session
      try {
        const state = loadDemoState();
        const savedId = state.activeUserId;
        if (savedId && isMounted) {
          const found = userService.getUserById(savedId);
          if (found && found.isActive !== false) {
            setCurrentUser(found);
          }
        }
      } catch {}
    }

    checkBackendSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleUsersUpdated = () => {
      if (currentUser) {
        const refreshed = userService.getUserById(currentUser.id);
        if (refreshed) setCurrentUser(refreshed);
      }
    };
    window.addEventListener('qpms_users_updated', handleUsersUpdated);
    return () => window.removeEventListener('qpms_users_updated', handleUsersUpdated);
  }, [currentUser]);

  const loginWithCredentials = async (email: string, password: string) => {
    try {
      const authRes = await authService.login(email, password);
      setBackendUser(authRes);

      const mapped = resolveFrontendUserFromBackend(authRes);
      setCurrentUser(mapped);

      const nextState = loadDemoState();
      nextState.activeUserId = mapped.id;
      nextState.activeDepartmentId = mapped.departmentId || nextState.activeDepartmentId || null;
      saveDemoState(nextState);

      const deptCount = mapped.assignedDepartments.length;
      const requiresDeptSelection = deptCount > 1;
      const noDeptAssigned = deptCount === 0 && mapped.role === 'faculty';

      return {
        success: true,
        portalRoute: authRes.portal_route,
        status: { requiresDeptSelection, noDeptAssigned },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      return { success: false, error: message };
    }
  };

  const login = (userId: string) => {
    const user = userService.getUserById(userId) || userService.getUsers()[0];
    if (!user || user.isActive === false) {
      return { requiresDeptSelection: false, noDeptAssigned: false };
    }

    setCurrentUser(user);
    auditService.record({
      action: 'LOGIN',
      user,
      resource: 'session',
      resourceId: user.id,
      description: `${user.name} signed in`,
    });
    const nextState = loadDemoState();
    nextState.activeUserId = user.id;
    nextState.activeDepartmentId = user.departmentId || nextState.activeDepartmentId || null;
    saveDemoState(nextState);

    const deptCount = user.assignedDepartments.length;
    if (deptCount === 0 && user.role === 'faculty') {
      return { requiresDeptSelection: false, noDeptAssigned: true };
    }
    if (deptCount > 1) {
      return { requiresDeptSelection: true, noDeptAssigned: false };
    }
    return { requiresDeptSelection: false, noDeptAssigned: false };
  };

  const logout = async () => {
    setCurrentUser(null);
    setBackendUser(null);
    const nextState = loadDemoState();
    nextState.activeUserId = null;
    nextState.activeDepartmentId = null;
    saveDemoState(nextState);

    await authService.logout();
  };

  const switchUser = (userId: string) => {
    const user = userService.getUserById(userId);
    if (user && user.isActive !== false) {
      setCurrentUser(user);
      auditService.record({
        action: 'LOGIN',
        user,
        resource: 'session',
        resourceId: user.id,
        description: `Switched demo session to ${user.name}`,
      });
      const nextState = loadDemoState();
      nextState.activeUserId = user.id;
      nextState.activeDepartmentId = user.departmentId || nextState.activeDepartmentId || null;
      saveDemoState(nextState);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        backendUser,
        isAuthenticated: !!currentUser || !!backendUser,
        login,
        loginWithCredentials,
        logout,
        switchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
