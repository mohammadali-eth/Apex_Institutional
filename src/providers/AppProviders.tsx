'use client';

import React from 'react';
import { I18nProvider } from './I18nProvider';
import { AuthProvider } from './AuthProvider';
import { DepartmentProvider } from './DepartmentProvider';
import { ToastProvider } from './ToastProvider';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <I18nProvider>
      <AuthProvider>
        <DepartmentProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </DepartmentProvider>
      </AuthProvider>
    </I18nProvider>
  );
};
