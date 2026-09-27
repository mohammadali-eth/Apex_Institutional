import React, { useState, useEffect } from 'react';
import { I18nProvider } from './lib/i18n';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DepartmentProvider, useDepartment } from './contexts/DepartmentContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppShell } from './components/layout/AppShell';

import { LoginPage } from './components/auth/LoginPage';
import { SelectDepartmentPage } from './components/auth/SelectDepartmentPage';
import { NoDepartmentPage } from './components/auth/NoDepartmentPage';

import { DashboardView } from './components/dashboard/DashboardView';
import { AcademicStructureView } from './components/academic/AcademicStructureView';
import { MaterialsView } from './components/materials/MaterialsView';
import { QuestionBankView } from './components/questionBank/QuestionBankView';
import { QuestionEditForm } from './components/questionBank/QuestionEditForm';
import { QuestionDetailsView } from './components/questionBank/QuestionDetailsView';
import { PaperGeneratorWizard } from './components/papers/PaperGeneratorWizard';
import { PaperHistoryView } from './components/history/PaperHistoryView';
import { ApprovalsView } from './components/approvals/ApprovalsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { PreviousPaper } from './types';

function MainApplication() {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { status, setDepartment, currentDepartment } = useDepartment();

  const [activeNav, setActiveNav] = useState<string>('dashboard');
  const [activeQuestionId, setActiveQuestionId] = useState<string | undefined>(undefined);
  const [generatorReference, setGeneratorReference] = useState<{ id?: string; name?: string }>({});
  const [manualSelectDeptOpen, setManualSelectDeptOpen] = useState(false);

  // Sync hash routing with auth state and enforce a real login route.
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const route = hash || 'dashboard';

      if (!isAuthenticated) {
        if (route !== 'login') {
          window.location.hash = 'login';
          setActiveQuestionId(undefined);
        }
        setActiveNav('login');
        return;
      }

      if (route === 'login' || !hash) {
        window.location.hash = 'dashboard';
        setActiveNav('dashboard');
        setActiveQuestionId(undefined);
        return;
      }

      if (route === 'create-question') {
        setActiveQuestionId(undefined);
        setActiveNav('edit-question');
        return;
      }

      const editMatch = route.match(/^questions\/([^\/]+)\/edit$/);
      if (editMatch) {
        setActiveQuestionId(editMatch[1]);
        setActiveNav('edit-question');
        return;
      }

      const viewMatch = route.match(/^questions\/([^\/]+)$/);
      if (viewMatch) {
        setActiveQuestionId(viewMatch[1]);
        setActiveNav('view-question');
        return;
      }

      setActiveQuestionId(undefined);
      if (route === 'dashboard' || route === 'academic' || route === 'materials' || route === 'questions' || route === 'generator' || route === 'history' || route === 'approvals' || route === 'reports' || route === 'settings') {
        setActiveNav(route);
      } else {
        setActiveNav('dashboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated]);

  const navigateTo = (route: string, qId?: string) => {
    if (!isAuthenticated && route !== 'login') {
      window.location.hash = 'login';
      setActiveNav('login');
      return;
    }

    setActiveNav(route);
    if (route === 'login') {
      window.location.hash = 'login';
      setActiveQuestionId(undefined);
      return;
    }

    if (route === 'edit-question') {
      setActiveQuestionId(qId);
      window.location.hash = qId ? `questions/${qId}/edit` : 'create-question';
      return;
    }

    if (route === 'view-question') {
      setActiveQuestionId(qId);
      window.location.hash = qId ? `questions/${qId}` : 'questions';
      return;
    }

    setActiveQuestionId(undefined);
    window.location.hash = route;
  };

  const handleUseReference = (paper: PreviousPaper) => {
    setGeneratorReference({
      id: paper.id,
      name: `${paper.subjectName} (${paper.academicYear} Set ${paper.set})`,
    });
    navigateTo('generator');
  };

  // 1. Unauthenticated -> Show Login Page
  if (!isAuthenticated) {
    return (
      <LoginPage
        onSuccess={() => {
          if (window.location.hash !== '#dashboard') {
            window.location.hash = 'dashboard';
          }
          setActiveNav('dashboard');
        }}
      />
    );
  }

  // 2. Authenticated but No Department Assigned (Requirement #6: Blocked Flow)
  if (status === 'no_department') {
    return (
      <NoDepartmentPage
        onLogout={logout}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // 3. Authenticated and Multiple Departments Assigned -> Prompt Selection Screen (Requirement #6)
  if (status === 'requires_selection' || manualSelectDeptOpen) {
    return (
      <SelectDepartmentPage
        onSelected={() => {
          setManualSelectDeptOpen(false);
          navigateTo('dashboard');
        }}
      />
    );
  }

  // 4. Authenticated & Department Resolved -> Render Full AppShell
  return (
    <AppShell
      activeNav={activeNav}
      onNavigate={route => navigateTo(route)}
      onOpenSelectDepartment={() => setManualSelectDeptOpen(true)}
    >
      {activeNav === 'dashboard' && (
        <DashboardView onNavigate={route => navigateTo(route)} />
      )}

      {activeNav === 'academic' && (
        <AcademicStructureView
          onNavigateQuestionBank={() => navigateTo('questions')}
          onNavigateGenerator={() => navigateTo('generator')}
        />
      )}

      {activeNav === 'materials' && (
        <MaterialsView />
      )}

      {activeNav === 'questions' && currentUser && (
        <QuestionBankView
          currentUser={currentUser}
          onViewQuestion={qId => navigateTo('view-question', qId)}
          onEditQuestion={qId => navigateTo('edit-question', qId)}
          onCreateQuestion={() => navigateTo('edit-question')}
        />
      )}

      {activeNav === 'edit-question' && currentUser && (
        <QuestionEditForm
          questionId={activeQuestionId}
          currentUser={currentUser}
          onCancel={() => navigateTo('questions')}
          onSaved={savedId => navigateTo('view-question', savedId)}
        />
      )}

      {activeNav === 'view-question' && activeQuestionId && currentUser && (
        <QuestionDetailsView
          questionId={activeQuestionId}
          currentUser={currentUser}
          onBack={() => navigateTo('questions')}
          onEdit={qId => navigateTo('edit-question', qId)}
          onQuestionUpdated={() => {}}
        />
      )}

      {activeNav === 'generator' && (
        <PaperGeneratorWizard
          onNavigateHistory={() => navigateTo('history')}
          initialReferencePaperId={generatorReference.id}
          initialReferencePaperName={generatorReference.name}
        />
      )}

      {activeNav === 'history' && currentUser && (
        <PaperHistoryView
          currentUser={currentUser}
          onUseAsReferenceInGenerator={handleUseReference}
        />
      )}

      {activeNav === 'approvals' && (
        <ApprovalsView />
      )}

      {activeNav === 'reports' && (
        <ReportsView />
      )}

      {activeNav === 'settings' && (
        <SettingsView />
      )}
    </AppShell>
  );
}

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <DepartmentProvider>
          <ToastProvider>
            <MainApplication />
          </ToastProvider>
        </DepartmentProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
