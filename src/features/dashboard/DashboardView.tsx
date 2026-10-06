'use client';
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDepartment } from '@/hooks/useDepartment';
import { useI18n } from '@/hooks/useI18n';
import { questionService } from '@/lib/services/questionService';
import { paperService } from '@/lib/services/paperService';
import { loadDemoState } from '@/data/demoState';
import { permissionService } from '@/lib/permissions/permissionService';
import { PermissionName } from '@/types';
import {
  BookOpen,
  HelpCircle,
  FileText,
  Layers,
  History,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  Building,
  UploadCloud,
  FileCheck
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (route: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { currentDepartment, currentInstitution } = useDepartment();
  const { t } = useI18n();

  const deptId = currentDepartment?.id || 'dept-cs';

  // Department-scoped statistics
  const scopedQuestions = questionService.getAllQuestions().filter(question => {
    if (!currentUser) return false;
    if (currentUser.role === 'guest') return Boolean(question.isPublic);
    if (currentUser.role === 'student' && question.status !== 'Approved') return false;
    return permissionService.canAccessResource(currentUser, { departmentId: question.departmentId, subjectId: question.subjectId });
  });
  const deptQuestions = scopedQuestions.filter(question => question.departmentId === deptId);
  const totalQuestions = deptQuestions.length;
  const draftQuestions = deptQuestions.filter(q => q.status === 'Draft').length;
  const approvedQuestions = deptQuestions.filter(q => q.status === 'Approved').length;

  const deptPapers = currentUser?.role === 'guest' ? [] : paperService.getAllPapers({ departmentId: deptId }).filter(paper => permissionService.canAccessResource(currentUser || null, { departmentId: paper.departmentId, subjectId: paper.subjectId, examId: paper.examId }) && (currentUser?.role !== 'student' || (paper.workflowStatus === 'PUBLISHED' && (currentUser.subjectIds || []).includes(paper.subjectId))));
  const totalPapers = deptPapers.length;
  const pendingPapers = deptPapers.filter(p => ['SUBMITTED', 'UNDER_REVIEW', 'QUALITY_REVIEW', 'QUALITY_APPROVED', 'PENDING_FINAL_APPROVAL'].includes(p.workflowStatus || 'DRAFT')).length;
  const paperCounts = ['DRAFT','SUBMITTED','UNDER_REVIEW','FINALIZED','PUBLISHED'].map(status => ({ status, count: deptPapers.filter(p => p.workflowStatus === status).length }));

  const assignedSubjects = loadDemoState().subjects.filter(subject => subject.departmentId === deptId && currentUser && permissionService.hasSubjectAccess(currentUser, subject.id));
  const workspaceByRole: Record<string, { title: string; description: string; route: string; permission: string }> = {
    super_admin: { title: 'System administration', description: 'Manage access, roles, and institution wide controls.', route: 'users', permission: 'user.view' },
    university_admin: { title: 'University administration', description: 'Review users and academic operations across your university scope.', route: 'users', permission: 'user.view' },
    institution_admin: { title: 'Institution administration', description: 'Manage institution users and scoped academic operations.', route: 'users', permission: 'user.view' },
    department_admin: { title: 'Department leadership', description: 'Review department activity, assigned subjects, and academic approvals.', route: 'departments', permission: 'question.view' },
    faculty: { title: 'Faculty workspace', description: 'Create questions and prepare examination papers for assigned subjects.', route: 'create-question', permission: 'question.create' },
    question_bank_manager: { title: 'Question bank management', description: 'Review and organize questions in your permitted department scope.', route: 'questions', permission: 'question_bank.view' },
    question_paper_reviewer: { title: 'Review workspace', description: 'Work through papers awaiting your review.', route: 'approvals', permission: 'paper.review' },
    exam_coordinator: { title: 'Exam coordination', description: 'Track assigned examination schedules and paper progress.', route: 'examinations', permission: 'exam.view' },
    exam_controller: { title: 'Examination control', description: 'Monitor scheduled examinations and controller assignments.', route: 'examinations', permission: 'exam.view' },
    quality_controller: { title: 'Quality control', description: 'Review flagged questions and papers in the quality queue.', route: 'quality', permission: 'paper.review' },
    viewer: { title: 'Read only workspace', description: 'Browse records available in your assigned scope.', route: 'history', permission: 'paper.view' },
  };
  const workspace = currentUser ? workspaceByRole[currentUser.role] : undefined;

  return (
    <div className="space-y-8">
      {/* Department Banner (Requirement #11) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase text-brand-font tracking-wider mb-1">
            <Building className="h-4 w-4 text-brand-primary" />
            <span>{currentInstitution?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-title tracking-tight">
            {currentDepartment?.name || 'Department Faculty Portal'}
          </h1>
          <p className="text-xs text-brand-paragraph mt-1">
            Welcome back, <strong className="text-slate-800">{currentUser?.name}</strong> ({currentUser?.role?.replace('_', ' ')}). Operating strictly inside your authorized academic faculty scope.
          </p>
        </div>

        {/* Quick Top CTA */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => onNavigate('generator')}
            hidden={!currentUser || !permissionService.hasPermission(currentUser, 'paper.create')}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate Question Paper</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Requirement #11) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Questions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-brand-font mb-2">
            <span className="text-xs font-bold uppercase">Question Bank</span>
            <HelpCircle className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="text-2xl font-bold text-brand-title">{totalQuestions}</div>
          <div className="text-[11px] text-brand-paragraph mt-1">Questions available</div>
        </div>

        {/* Approved Questions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase">Approved</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{approvedQuestions}</div>
          <div className="text-[11px] text-slate-500 mt-1">Production ready</div>
        </div>

        {/* Draft Questions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase">Drafts</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{draftQuestions}</div>
          <div className="text-[11px] text-slate-500 mt-1">Under formulation</div>
        </div>

        {/* Papers Generated */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-brand-title mb-2">
            <span className="text-xs font-bold uppercase">Papers Generated</span>
            <Layers className="h-4 w-4 text-brand-secondary" />
          </div>
          <div className="text-2xl font-bold text-brand-title">{totalPapers}</div>
          <div className="text-[11px] text-brand-paragraph mt-1">Examination sets</div>
        </div>

        {/* Awaiting Review */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-brand-secondary mb-2">
            <span className="text-xs font-bold uppercase">Awaiting Approval</span>
            <FileCheck className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="text-2xl font-bold text-brand-title">{pendingPapers}</div>
          <div className="text-[11px] text-brand-paragraph mt-1">In review queue</div>
        </div>
      </div>

      <section aria-label="Paper lifecycle counts" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {paperCounts.map(item => <div key={item.status} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-bold uppercase text-slate-500">{item.status.replace(/_/g,' ')}</p><p className="mt-1 text-2xl font-bold text-slate-900">{item.count}</p></div>)}
      </section>

      {/* Quick Actions Panel (Requirement #11) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase text-brand-font tracking-wider mb-4">
          {workspace ? `${workspace.title} · Quick Actions` : 'Quick Actions'}
        </h3>
        {workspace && currentUser && permissionService.hasPermission(currentUser, workspace.permission as PermissionName) && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-primary/20 bg-brand-primary-light/30 p-4"><div><p className="text-sm font-bold text-brand-title">{workspace.title}</p><p className="mt-1 text-xs text-brand-paragraph">{workspace.description}</p></div><button type="button" onClick={() => onNavigate(workspace.route)} className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover">Open workspace <ArrowRight className="h-3.5 w-3.5"/></button></div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('create-question')}
            hidden={!currentUser || !permissionService.hasPermission(currentUser, 'question.create')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary-light transition flex flex-col items-center text-center group"
          >
            <Plus className="h-5 w-5 text-brand-primary mb-1.5" />
            <span className="text-xs font-bold text-brand-title">Create Question</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('questions')}
            hidden={!currentUser || (currentUser.role !== 'guest' && !permissionService.canViewQuestions(currentUser))}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary-light transition flex flex-col items-center text-center group"
          >
            <HelpCircle className="h-5 w-5 text-brand-secondary mb-1.5" />
            <span className="text-xs font-bold text-brand-title">Question Bank</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('materials')}
            hidden={!currentUser || !permissionService.hasPermission(currentUser, 'question.create')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary-light transition flex flex-col items-center text-center group"
          >
            <UploadCloud className="h-5 w-5 text-brand-primary mb-1.5" />
            <span className="text-xs font-bold text-brand-title">Upload Material</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('generator')}
            hidden={!currentUser || !permissionService.hasPermission(currentUser, 'paper.create')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary-light transition flex flex-col items-center text-center group"
          >
            <Layers className="h-5 w-5 text-brand-secondary mb-1.5" />
            <span className="text-xs font-bold text-brand-title">Generate Paper</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('history')}
            hidden={!currentUser || !permissionService.hasPermission(currentUser, 'paper.view')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary-light transition flex flex-col items-center text-center group"
          >
            <Sparkles className="h-5 w-5 text-brand-primary mb-1.5" />
            <span className="text-xs font-bold text-brand-title">Previous Papers</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('history')}
            hidden={!currentUser || !permissionService.hasPermission(currentUser, 'paper.view')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary-light transition flex flex-col items-center text-center group"
          >
            <History className="h-5 w-5 text-brand-secondary mb-1.5" />
            <span className="text-xs font-bold text-brand-title">Paper History</span>
          </button>
        </div>
      </div>

      {/* 2 Column Layout: Assigned Subjects & Recent Papers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Subjects in Current Department (Requirement #11) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-brand-title flex items-center justify-between border-b border-slate-100 pb-3">
            <span>Department Subjects ({assignedSubjects.length})</span>
            <span className="text-xs text-brand-font font-normal">Active Scope</span>
          </h3>
          <div className="space-y-2.5">
            {assignedSubjects.map(sub => (
              <div key={sub.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-brand-title">{sub.name}</h4>
                  <span className="text-[10px] text-brand-font">{sub.code} • {sub.unitCount} Units</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('generator')}
                  hidden={!currentUser || !permissionService.hasPermission(currentUser, 'paper.create')}
                  className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover"
                >
                  Generate →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Generated Papers in Department */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-brand-title">Recent Examination Papers</h3>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover"
            >
              View All History →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-brand-bg-title border-b border-slate-200 text-[10px] font-bold text-brand-font uppercase tracking-wider">
                  <th className="py-2.5 px-3">Paper ID</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Academic Year</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Set</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deptPapers.slice(0, 5).map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-secondary">{p.id}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{p.subjectName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-brand-title">
                        AY {p.academicYear}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{p.generatedAt}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-700">Set {p.set}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.status === 'approved' ? 'bg-brand-primary-light text-brand-secondary border border-brand-primary/40' :
                        p.status === 'submitted' ? 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/30' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

