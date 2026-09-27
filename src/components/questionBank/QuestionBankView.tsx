import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Question, User } from '../../types';
import { questionService } from '../../services/questionService';
import { canUserEditQuestion } from '../../services/permissionService';
import { mockSubjects } from '../../mock/academicData';
import { Badge } from '../common/Badge';
import {
  Plus,
  Search,
  Eye,
  Edit3,
  Copy,
  Archive,
  Lock,
  Filter,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface QuestionBankViewProps {
  currentUser: User;
  onViewQuestion: (questionId: string) => void;
  onEditQuestion: (questionId: string) => void;
  onCreateQuestion: () => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  currentUser,
  onViewQuestion,
  onEditQuestion,
  onCreateQuestion,
}) => {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>(() => questionService.getAllQuestions());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    return questionService.subscribe(() => {
      setQuestions(questionService.getAllQuestions());
    });
  }, []);

  const handleDuplicate = (id: string) => {
    const copy = questionService.duplicateQuestion(id, currentUser);
    if (copy) {
      showToast('Question Duplicated', `New draft created: ${copy.id}`, 'success');
    }
  };

  const handleArchive = (id: string) => {
    if (window.confirm('Archive this question?')) {
      questionService.archiveQuestion(id);
      showToast('Question Archived', 'The question has been moved to the archived set.', 'info');
    }
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesId = q.id.toLowerCase().includes(term);
      const matchesText = q.text.toLowerCase().includes(term);
      const matchesSubject = q.subjectName.toLowerCase().includes(term);
      if (!matchesId && !matchesText && !matchesSubject) return false;
    }
    if (selectedSubject !== 'all' && q.subjectId !== selectedSubject) return false;
    if (selectedStatus !== 'all' && q.status !== selectedStatus) return false;
    if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
    if (selectedType !== 'all' && q.type !== selectedType) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
      {/* Workflow Guidance Banner (Requirement #1) */}
      <div className="bg-gradient-to-r from-brand-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-brand-500/20 text-brand-300 px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Standard Examination Lifecycle</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Question Bank & Review Pipeline</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Teacher Question Workflow: <strong>Create Question</strong> → <strong>Save Draft</strong> → <strong>Edit Question</strong> → <strong>Submit for Review</strong> → <strong>HOD / Reviewer Approve/Reject</strong>.
            </p>
          </div>

          {/* Quick Flow Indicators */}
          <div className="hidden lg:flex items-center space-x-2 text-xs bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80">
            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded font-medium">Draft</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
            <span className="px-2 py-1 bg-slate-700 text-slate-200 rounded font-medium">Submitted</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
            <span className="px-2 py-1 bg-brand-primary/20 text-brand-primary rounded font-bold">Approved</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
            <span className="px-2 py-1 bg-brand-primary text-white rounded font-bold">Paper Gen</span>
          </div>

          <button
            type="button"
            onClick={onCreateQuestion}
            className="inline-flex items-center space-x-2 px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-sm transition flex-shrink-0"
          >
            <Plus className="h-4 w-4 text-brand-primary font-bold" />
            <span>Create Question</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by ID, keyword, or subject..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Subjects</option>
            {mockSubjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Archived">Archived</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Types</option>
            <option value="mcq">MCQ</option>
            <option value="short">Short Answer</option>
            <option value="long">Long Answer</option>
            <option value="problem">Problem / Code</option>
          </select>
        </div>
      </div>

      {/* Questions Table (Requirement #2) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Question ID</th>
                <th className="py-3 px-4">Question Statement</th>
                <th className="py-3 px-4">Subject & Unit</th>
                <th className="py-3 px-4">Marks</th>
                <th className="py-3 px-4">Difficulty</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No questions match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q) => {
                  const perm = canUserEditQuestion(currentUser, q);
                  const isCrossDept = currentUser.departmentId !== q.departmentId;

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition group">
                      {/* ID + Version */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-brand-700 block">
                          {q.id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">v{q.version}</span>
                      </td>

                      {/* Text */}
                      <td className="py-3.5 px-4 max-w-md">
                        <p className="text-slate-800 font-serif line-clamp-2 leading-relaxed text-xs">
                          {q.text}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {q.type}
                          </span>
                          <span className="text-[11px] text-slate-400">By {q.createdBy}</span>
                        </div>
                      </td>

                      {/* Subject & Unit */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-800 block">
                          {q.subjectName}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                          {q.unitName}
                        </span>
                      </td>

                      {/* Marks */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {q.marks} M
                        </span>
                      </td>

                      {/* Difficulty */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge difficulty={q.difficulty}>{q.difficulty}</Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge status={q.status}>{q.status}</Badge>
                      </td>

                      {/* Actions Column (Requirement #2: View, Edit, Duplicate, Archive) */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View Action */}
                          <button
                            type="button"
                            onClick={() => onViewQuestion(q.id)}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                            title="View Question Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Edit Action (Requirement #2: Hide or show disabled with explanation if not allowed) */}
                          {perm.allowed ? (
                            <button
                              type="button"
                              onClick={() => onEditQuestion(q.id)}
                              className="p-1.5 text-slate-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                              title={q.status === 'Approved' ? 'Edit (Will create new draft version)' : 'Edit Question'}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 text-slate-300 hover:text-slate-400 cursor-not-allowed rounded-lg"
                              title={perm.reason}
                            >
                              <Lock className="h-4 w-4" />
                            </button>
                          )}

                          {/* Duplicate Action */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(q.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Duplicate Question"
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          {/* Archive Action */}
                          {perm.allowed && (
                            <button
                              type="button"
                              onClick={() => handleArchive(q.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Archive Question"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
