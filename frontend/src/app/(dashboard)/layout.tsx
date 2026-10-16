'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDepartment } from '@/hooks/useDepartment';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { SelectDepartmentPage } from '@/features/auth/SelectDepartmentPage';
import { NoDepartmentPage } from '@/features/auth/NoDepartmentPage';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { status } = useDepartment();
  const [manualSelectDeptOpen, setManualSelectDeptOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine activeNav from pathname
  const activeNav = React.useMemo(() => {
    if (!pathname) return 'dashboard';
    const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
    return segment;
  }, [pathname]);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent relative z-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  // 1. Unauthenticated -> Show Login Page
  if (!isAuthenticated) {
    return (
      <LoginPage
        onSuccess={() => {
          router.push('/dashboard');
        }}
      />
    );
  }

  // 2. Authenticated but No Department Assigned
  if (status === 'no_department') {
    return (
      <NoDepartmentPage
        onLogout={logout}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // 3. Authenticated and Multiple Departments Assigned -> Prompt Selection Screen
  if (status === 'requires_selection' || manualSelectDeptOpen) {
    return (
      <SelectDepartmentPage
        onSelected={() => {
          setManualSelectDeptOpen(false);
          router.push('/dashboard');
        }}
      />
    );
  }

  // 4. Authenticated & Department Resolved -> Render Full AppShell
  return (
    <AppShell
      activeNav={activeNav}
      onNavigate={(route) => router.push(`/${route}`)}
      onOpenSelectDepartment={() => setManualSelectDeptOpen(true)}
    >
      {children}
    </AppShell>
  );
}
