'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { userService } from '@/lib/services/userService';
import { authService, AuthUserResponse } from '@/lib/services/authService';
import { loadDemoState, saveDemoState } from '@/data/demoState';
import { auditService } from '@/lib/services/auditService';

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
          // Match or construct a corresponding user in the frontend state
          const localMatch = userService
            .getUsers()
            .find((u) => u.email.toLowerCase() === me.email.toLowerCase());
          if (localMatch) {
            setCurrentUser(localMatch);
          }
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

      // Map to frontend user
      const allUsers = userService.getUsers();
      const matched =
        allUsers.find((u) => u.email.toLowerCase() === authRes.email.toLowerCase()) ||
        allUsers[0];

      if (matched) {
        setCurrentUser(matched);
        const nextState = loadDemoState();
        nextState.activeUserId = matched.id;
        nextState.activeDepartmentId = matched.departmentId || nextState.activeDepartmentId || null;
        saveDemoState(nextState);

        const deptCount = matched.assignedDepartments.length;
        const requiresDeptSelection = deptCount > 1;
        const noDeptAssigned = deptCount === 0 && matched.role === 'faculty';

        return {
          success: true,
          status: { requiresDeptSelection, noDeptAssigned },
        };
      }

      return { success: true };
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
