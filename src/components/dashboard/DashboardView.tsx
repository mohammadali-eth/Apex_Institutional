import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDepartment } from '../../contexts/DepartmentContext';
import { useI18n } from '../../lib/i18n';
import { questionService } from '../../services/questionService';
import { paperService } from '../../services/paperService';
import { mockSubjects } from '../../mock/academicData';
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
  const deptQuestions = questionService.getQuestionsByDepartment(deptId);
  const totalQuestions = deptQuestions.length;
  const draftQuestions = deptQuestions.filter(q => q.status === 'Draft').length;
  const approvedQuestions = deptQuestions.filter(q => q.status === 'Approved').length;

  const deptPapers = paperService.getAllPapers({ departmentId: deptId });
  const totalPapers = deptPapers.length;
  const pendingPapers = deptPapers.filter(p => p.status === 'submitted' || p.status === 'under_review').length;

  const assignedSubjects = mockSubjects.filter(s => s.departmentId === deptId);

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

      {/* Quick Actions Panel (Requirement #11) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase text-brand-font tracking-wider mb-4">
          Quick Faculty Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('create-question')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary-light transition flex flex-col items-center text-center group"
          >
            <Plus className="h-5 w-5 text-brand-primary mb-1.5" />
            <span className="text-xs font-bold text-brand-title">Create Question</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('questions')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary-light transition flex flex-col items-center text-center group"
          >
            <HelpCircle className="h-5 w-5 text-brand-secondary mb-1.5" />
            <span className="text-xs font-bold text-brand-title">Question Bank</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('materials')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary-light transition flex flex-col items-center text-center group"
          >
            <UploadCloud className="h-5 w-5 text-brand-primary mb-1.5" />
            <span className="text-xs font-bold text-brand-title">Upload Material</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('generator')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary-light transition flex flex-col items-center text-center group"
          >
            <Layers className="h-5 w-5 text-brand-secondary mb-1.5" />
            <span className="text-xs font-bold text-brand-title">Generate Paper</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary-light transition flex flex-col items-center text-center group"
          >
            <Sparkles className="h-5 w-5 text-brand-primary mb-1.5" />
            <span className="text-xs font-bold text-brand-title">Previous Papers</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('history')}
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
