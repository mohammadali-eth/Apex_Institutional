import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { userService } from '../services/userService';
import { loadDemoState, saveDemoState } from '../store/demoState';
import { auditService } from '../services/auditService';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (userId: string) => { requiresDeptSelection: boolean; noDeptAssigned: boolean };
  logout: () => void;
  switchUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAuthenticated: false,
  login: () => ({ requiresDeptSelection: false, noDeptAssigned: false }),
  logout: () => {},
  switchUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const state = loadDemoState();
      const savedId = state.activeUserId || localStorage.getItem('qpms_active_user');
      if (savedId) {
        const found = userService.getUserById(savedId);
        if (found && found.isActive !== false) return found;
      }
    } catch {}
    return null;
  });

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

  const login = (userId: string) => {
    const user = userService.getUserById(userId) || userService.getUsers()[0];
    if (!user || user.isActive === false) {
      return { requiresDeptSelection: false, noDeptAssigned: false };
    }

    setCurrentUser(user);
    auditService.record({ action: 'LOGIN', user, resource: 'session', resourceId: user.id, description: `${user.name} signed in` });
    const nextState = loadDemoState();
    nextState.activeUserId = user.id;
    nextState.activeDepartmentId = user.departmentId || nextState.activeDepartmentId || null;
    saveDemoState(nextState);

    try {
      localStorage.setItem('qpms_active_user', user.id);
    } catch {}

    const deptCount = user.assignedDepartments.length;
    if (deptCount === 0 && user.role === 'faculty') {
      return { requiresDeptSelection: false, noDeptAssigned: true };
    }
    if (deptCount > 1) {
      return { requiresDeptSelection: true, noDeptAssigned: false };
    }
    return { requiresDeptSelection: false, noDeptAssigned: false };
  };

  const logout = () => {
    setCurrentUser(null);
    const nextState = loadDemoState();
    nextState.activeUserId = null;
    nextState.activeDepartmentId = null;
    saveDemoState(nextState);

    try {
      localStorage.removeItem('qpms_active_user');
    } catch {}
  };

  const switchUser = (userId: string) => {
    const user = userService.getUserById(userId);
    if (user && user.isActive !== false) {
      setCurrentUser(user);
      auditService.record({ action: 'LOGIN', user, resource: 'session', resourceId: user.id, description: `Switched demo session to ${user.name}` });
      const nextState = loadDemoState();
      nextState.activeUserId = user.id;
      nextState.activeDepartmentId = user.departmentId || nextState.activeDepartmentId || null;
      saveDemoState(nextState);

      try {
        localStorage.setItem('qpms_active_user', user.id);
      } catch {}
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        switchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
