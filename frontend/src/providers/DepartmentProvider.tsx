'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Department, Institution } from '@/types';
import { mockDepartments, mockInstitutions } from '@/data/academicData';
import { useAuth } from './AuthProvider';
import { loadDemoState, saveDemoState } from '@/data/demoState';

export interface DepartmentContextType {
  currentInstitution: Institution | null;
  currentDepartment: Department | null;
  availableDepartments: Department[];
  setDepartment: (departmentId: string) => void;
  status: 'resolved' | 'requires_selection' | 'no_department';
}

export const DepartmentContext = createContext<DepartmentContextType>({
  currentInstitution: null,
  currentDepartment: null,
  availableDepartments: [],
  setDepartment: () => {},
  status: 'resolved',
});

export const DepartmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);
  const [status, setStatus] = useState<'resolved' | 'requires_selection' | 'no_department'>('resolved');

  useEffect(() => {
    try {
      const state = loadDemoState();
      if (state.activeDepartmentId) {
        const found = mockDepartments.find(d => d.id === state.activeDepartmentId);
        if (found) setCurrentDepartment(found);
      }
    } catch {}
  }, []);

  // Enforce Critical Login -> Department Resolution Flow (Requirement #6 & #7)
  useEffect(() => {
    if (!currentUser) {
      setCurrentDepartment(null);
      setStatus('resolved');
      const nextState = loadDemoState();
      nextState.activeDepartmentId = null;
      saveDemoState(nextState);
      return;
    }

    // University Admin or Institution Admin
    if (currentUser.role === 'university_admin' || currentUser.role === 'institution_admin') {
      const defaultDept = mockDepartments[0];
      setCurrentDepartment(defaultDept);
      const nextState = loadDemoState();
      nextState.activeDepartmentId = defaultDept.id;
      saveDemoState(nextState);
      setStatus('resolved');
      return;
    }

    const assigned = currentUser.assignedDepartments || [];

    // Case 1: No department assigned
    if (assigned.length === 0) {
      setCurrentDepartment(null);
      const nextState = loadDemoState();
      nextState.activeDepartmentId = null;
      saveDemoState(nextState);
      setStatus('no_department');
      return;
    }

    // Case 2: Exactly ONE department assigned -> Automatically resolve and redirect to dashboard
    if (assigned.length === 1) {
      const found = mockDepartments.find(d => d.id === assigned[0].id) || mockDepartments[0];
      setCurrentDepartment(found);
      const nextState = loadDemoState();
      nextState.activeDepartmentId = found.id;
      saveDemoState(nextState);
      setStatus('resolved');
      return;
    }

    // Case 3: MULTIPLE departments assigned -> Show department selection screen
    // Check if user already picked a valid department
    if (currentDepartment && assigned.some(a => a.id === currentDepartment.id)) {
      const nextState = loadDemoState();
      nextState.activeDepartmentId = currentDepartment.id;
      saveDemoState(nextState);
      setStatus('resolved');
    } else {
      const nextState = loadDemoState();
      nextState.activeDepartmentId = null;
      saveDemoState(nextState);
      setStatus('requires_selection');
    }
  }, [currentUser, currentDepartment]);

  const availableDepartments = currentUser
    ? mockDepartments.filter(d => (currentUser.assignedDepartments || []).some(a => a.id === d.id))
    : [];

  const setDepartment = (departmentId: string) => {
    const dept = mockDepartments.find(d => d.id === departmentId);
    if (dept) {
      setCurrentDepartment(dept);
      const nextState = loadDemoState();
      nextState.activeDepartmentId = dept.id;
      saveDemoState(nextState);
      setStatus('resolved');
    }
  };

  const currentInstitution = currentUser
    ? mockInstitutions.find(i => i.id === currentUser.institutionId) || mockInstitutions[0]
    : mockInstitutions[0];

  return (
    <DepartmentContext.Provider
      value={{
        currentInstitution,
        currentDepartment,
        availableDepartments,
        setDepartment,
        status,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
};

export const useDepartment = () => useContext(DepartmentContext);
