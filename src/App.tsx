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
import { PaperWorkflowView } from './components/papers/PaperWorkflowView';
import { ApprovalsView } from './components/approvals/ApprovalsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { OrganizationBrowser } from './components/academic/OrganizationBrowser';
import { PreviousPaper, PermissionName } from './types';
import { permissionService } from './lib/permissions/permissionService';
import { canUserEditQuestion } from './services/permissionService';
import { questionService } from './services/questionService';
import { EnterpriseModule, EnterprisePage } from './components/admin/EnterpriseModule';

const ROUTE_PERMISSIONS: Record<string, PermissionName[]> = {
  dashboard: ['question.view', 'paper.view', 'exam.view', 'report.view'],
  academic: ['user.update', 'question_bank.manage', 'system.manage'],
  materials: ['question.create', 'question.update', 'question_bank.manage'],
  questions: ['question.view'],
  generator: ['paper.create', 'paper.update', 'paper.submit'],
  history: ['paper.view', 'report.view'],
  approvals: ['paper.review', 'paper.approve', 'paper.finalize'],
  'paper-workflow': ['paper.view'],
  reports: ['report.view'],
  settings: ['system.manage', 'user.update', 'user.create'],
  'question-bank': ['question_bank.view'], papers: ['paper.view'], examinations: ['exam.view'],
  departments: ['user.view', 'question.view', 'user.update', 'user.create', 'system.manage'], subjects: ['question_bank.view', 'question.view'],
  users: ['user.view'], roles: ['user.view'], permissions: ['user.view'], audit: ['audit.view'], quality: ['paper.review','paper.approve'],
  universities: ['user.view'], institutions: ['user.view'], programs: ['question_bank.view', 'question.view'],
  'institution-detail': ['user.view'], 'department-detail': ['user.view', 'question.view'], 'program-detail': ['question_bank.view', 'question.view'], 'subject-detail': ['question_bank.view', 'question.view'],
  'question-review': ['question.approve'], 'archived-questions': ['question_bank.view'],
  'question-categories': ['question_bank.view'], 'question-topics': ['question_bank.view'],
};

function MainApplication() {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { status, setDepartment, currentDepartment } = useDepartment();

  const [activeNav, setActiveNav] = useState<string>('dashboard');
  const [activeQuestionId, setActiveQuestionId] = useState<string | undefined>(undefined);
  const [generatorReference, setGeneratorReference] = useState<{ id?: string; name?: string }>({});
  const [manualSelectDeptOpen, setManualSelectDeptOpen] = useState(false);
  const [academicSection, setAcademicSection] = useState<'departments' | 'logins' | 'subjects' | 'programs' | 'institutions'>('departments');
  const [organizationRoute, setOrganizationRoute] = useState<{ kind: 'universities' | 'institutions' | 'institution' | 'departments' | 'department' | 'programs' | 'program' | 'subjects' | 'subject'; id?: string }>({ kind: 'departments' });
  const [questionListStatus, setQuestionListStatus] = useState('all');
  const [paperPage, setPaperPage] = useState<'dashboard' | 'all' | 'mine' | 'create' | 'review' | 'changes' | 'approved' | 'final' | 'published' | 'archived'>('dashboard');
  const [enterprisePage, setEnterprisePage] = useState<EnterprisePage>('users');
  const [enterpriseId, setEnterpriseId] = useState<string | undefined>();

  const canAccessRoute = (route: string) => {
    if (!currentUser) return route === 'login';
    if (route === 'dashboard') return true;
    if (['questions', 'question-bank'].includes(route) && currentUser.role === 'guest') return true;
    const permissions = ROUTE_PERMISSIONS[route];
    if (!permissions) return true;
    return permissions.some(permission => permissionService.hasPermission(currentUser, permission));
  };

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

      if (route === 'dashboard' && currentUser?.role === 'student') { setEnterprisePage('student'); setEnterpriseId(undefined); setActiveNav('enterprise'); return; }
      if (route === 'dashboard' && currentUser?.role === 'guest') { setEnterprisePage('public'); setEnterpriseId(undefined); setActiveNav('enterprise'); return; }
      if (route === 'dashboard' && currentUser?.role === 'system_auditor') { setEnterprisePage('audit'); setEnterpriseId(undefined); setActiveNav('enterprise'); return; }
      if (currentUser?.role === 'guest' && !['public','public-papers','public-exams'].includes(route)) { setActiveNav('forbidden'); return; }
      if (currentUser?.role === 'student' && !['student','public','public-papers','public-exams'].includes(route)) { setActiveNav('forbidden'); return; }
      if (currentUser?.role === 'system_auditor' && route !== 'audit') { setActiveNav('forbidden'); return; }

      if (route === 'create-question') {
        if (!currentUser || !permissionService.hasPermission(currentUser, 'question.create')) {
          setActiveNav('forbidden');
          return;
        }
        setActiveQuestionId(undefined);
        setActiveNav('edit-question');
        return;
      }

      const editMatch = route.match(/^questions\/([^\/]+)\/edit$/);
      if (editMatch) {
        const question = questionService.getQuestionById(editMatch[1]);
        if (!currentUser || !question || !canUserEditQuestion(currentUser, question).allowed) {
          setActiveNav('forbidden');
          return;
        }
        setActiveQuestionId(editMatch[1]);
        setActiveNav('edit-question');
        return;
      }

      const viewMatch = route.match(/^questions\/([^\/]+)$/);
      if (viewMatch) {
        const question = questionService.getQuestionById(viewMatch[1]);
        const canGuestView = currentUser?.role === 'guest' && Boolean(question?.isPublic);
        if (!currentUser || !question || (!canGuestView && (!canAccessRoute('questions') || !permissionService.canAccessResource(currentUser, { departmentId: question.departmentId, subjectId: question.subjectId }))) || (currentUser.role === 'student' && question.status !== 'Approved')) {
          setActiveNav('forbidden');
          return;
        }
        setActiveQuestionId(viewMatch[1]);
        setActiveNav('view-question');
        return;
      }

      setActiveQuestionId(undefined);
      const orgRoute = route.match(/^(universities|institutions|departments|programs|subjects)(?:\/([^/]+))?$/);
      if (orgRoute) {
        const base = orgRoute[1] as 'universities' | 'institutions' | 'departments' | 'programs' | 'subjects';
        const singular = ({ institutions: 'institution', departments: 'department', programs: 'program', subjects: 'subject' } as const)[base as 'institutions' | 'departments' | 'programs' | 'subjects'];
        const kind = orgRoute[2] && base !== 'universities' ? singular : base;
        const permissionKey = orgRoute[2] ? `${singular}-detail` : route;
        if (!canAccessRoute(permissionKey)) { setActiveNav('forbidden'); return; }
        setOrganizationRoute({ kind, id: orgRoute[2] });
        setActiveNav('organization');
        return;
      }
      const enterpriseRoutes: Record<string,{page:EnterprisePage;gate?:string}> = {
        users:{page:'users',gate:'users'},roles:{page:'roles',gate:'roles'},permissions:{page:'permissions',gate:'permissions'},examinations:{page:'examinations',gate:'examinations'},quality:{page:'quality',gate:'quality'},student:{page:'student'},public:{page:'public'},'public-papers':{page:'public-papers'},'public-exams':{page:'public-exams'},audit:{page:'audit',gate:'audit'},reports:{page:'reports',gate:'reports'},settings:{page:'settings'},
      };
      const userDetail=route.match(/^users\/([^/]+)$/); const roleDetail=route.match(/^roles\/([^/]+)$/); const examDetail=route.match(/^examinations\/([^/]+)$/);
      let moduleRoute=enterpriseRoutes[route]; let moduleId:string|undefined;
      if(userDetail){moduleRoute={page:'user-details',gate:'users'};moduleId=userDetail[1];}
      else if(roleDetail){moduleRoute={page:'role-details',gate:'roles'};moduleId=roleDetail[1];}
      else if(examDetail){moduleRoute={page:'exam-details',gate:'examinations'};moduleId=examDetail[1];}
      if(moduleRoute){
        if(route==='student'&&currentUser?.role!=='student'&&!permissionService.hasPermission(currentUser,'system.manage')){setActiveNav('forbidden');return;}
        if(['public','public-papers','public-exams'].includes(route)&&currentUser?.role!=='guest'&&currentUser?.role!=='student'&&!permissionService.hasPermission(currentUser,'system.manage')){setActiveNav('forbidden');return;}
        if(moduleRoute.gate&&!canAccessRoute(moduleRoute.gate)){setActiveNav('forbidden');return;}
        setEnterprisePage(moduleRoute.page);setEnterpriseId(moduleId);setActiveNav('enterprise');return;
      }
      const paperRoute = route.match(/^papers(?:\/([^/]+))?$/);
      if (paperRoute) {
        const pageMap: Record<string, typeof paperPage> = { dashboard: 'dashboard', all: 'all', mine: 'mine', create: 'create', review: 'review', changes: 'changes', approved: 'approved', final: 'final', published: 'published', archived: 'archived' };
        const page = pageMap[paperRoute[1] || 'dashboard'] || 'dashboard';
        const gate = page === 'create' ? 'generator' : page === 'review' || page === 'changes' ? 'approvals' : 'history';
        if (!canAccessRoute(gate)) { setActiveNav('forbidden'); return; }
        setPaperPage(page); setActiveNav('paper-workflow'); return;
      }
      const aliases: Record<string, string> = { 'question-bank': 'questions', 'archived-questions': 'questions', 'question-review': 'questions', 'question-categories': 'questions', 'question-topics': 'questions' };
      const resolved = aliases[route] || route;
      if (route === 'archived-questions') setQuestionListStatus('Archived');
      else if (route === 'question-review') setQuestionListStatus('Submitted');
      else if (resolved === 'questions') setQuestionListStatus('all');
      if (resolved === 'academic') {
        const academicSections: Record<string, typeof academicSection> = { departments: 'departments', users: 'logins', subjects: 'subjects' };
        setAcademicSection(academicSections[route] || 'departments');
      }
      if (['generator', 'history', 'approvals'].includes(resolved)) {
        if (currentUser?.role === 'student' || currentUser?.role === 'guest' || currentUser?.role === 'system_auditor') { setActiveNav('forbidden'); return; }
        const page = resolved === 'generator' ? 'create' : resolved === 'approvals' ? 'review' : 'all';
        if (!canAccessRoute(resolved)) { setActiveNav('forbidden'); return; }
        setPaperPage(page); setActiveNav('paper-workflow'); return;
      }
      if (['dashboard', 'academic', 'materials', 'questions', 'reports', 'settings'].includes(resolved)) {
        const permissionRoute = route === 'question-review' ? 'question-review' : route === 'archived-questions' ? 'archived-questions' : route;
        if (!canAccessRoute(permissionRoute)) {
          setActiveNav('forbidden');
          return;
        }
        setActiveNav(resolved);
      } else {
        setActiveNav('not-found');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, currentUser]);

  const navigateTo = (route: string, qId?: string) => {
    if (!isAuthenticated && route !== 'login') {
      window.location.hash = 'login';
      setActiveNav('login');
      return;
    }

    if (currentUser && route !== 'login' && !canAccessRoute(route)) {
      window.location.hash = route;
      setActiveNav('forbidden');
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
      {activeNav === 'organization' && <OrganizationBrowser kind={organizationRoute.kind} id={organizationRoute.id} />}

      {activeNav === 'academic' && (
        <AcademicStructureView
          initialTab={academicSection}
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
          initialStatus={questionListStatus}
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

      {activeNav === 'paper-workflow' && <PaperWorkflowView page={paperPage} />}

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
      {activeNav === 'enterprise' && <EnterpriseModule page={enterprisePage} selectedId={enterpriseId}/>}
      {activeNav === 'forbidden' && <div className="m-8 rounded-xl border border-slate-200 bg-white p-8"><h1 className="text-xl font-bold text-slate-900">403 Access Denied</h1><p className="mt-2 text-sm text-slate-600">Your role or current scope does not allow access to this module.</p></div>}
      {activeNav === 'not-found' && <div className="m-8 rounded-xl border border-slate-200 bg-white p-8"><h1 className="text-xl font-bold text-slate-900">404 Not Found</h1><p className="mt-2 text-sm text-slate-600">The requested page does not exist.</p></div>}
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
