'use client';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { Question, User } from '@/types';
import { questionService } from '@/lib/services/questionService';
import { canUserEditQuestion } from '@/lib/services/permissionService';
import { permissionService } from '@/lib/permissions/permissionService';
import { loadDemoState } from '@/data/demoState';
import { Badge } from '@/components/ui/Badge';
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
  Sparkles,
} from 'lucide-react';

interface QuestionBankViewProps {
  currentUser: User;
  onViewQuestion: (questionId: string) => void;
  onEditQuestion: (questionId: string) => void;
  onCreateQuestion: () => void;
  initialStatus?: string;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  currentUser,
  onViewQuestion,
  onEditQuestion,
  onCreateQuestion,
  initialStatus = 'all',
}) => {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>(() => questionService.getAllQuestions());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedBloom, setSelectedBloom] = useState('all');
  const [selectedCreatedBy, setSelectedCreatedBy] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'marks' | 'difficulty'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

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
      questionService.archiveQuestion(id, currentUser);
      showToast('Question Archived', 'The question has been moved to the archived set.', 'info');
    }
  };

  const handleRestore = (id: string) => {
    questionService.restoreQuestion(id, currentUser);
    showToast('Question Restored', `${id} has been restored to draft and can be revised again.`, 'success');
  };

  const inScope = (q: Question) => {
    if (currentUser.role === 'guest') return Boolean(q.isPublic);
    if (!permissionService.canViewQuestions(currentUser)) return false;
    if (currentUser.role === 'student' && q.status !== 'Approved') return false;
    if (currentUser.role === 'faculty') return (currentUser.subjectIds || []).includes(q.subjectId) && permissionService.hasDepartmentAccess(currentUser, q.departmentId);
    return permissionService.canAccessResource(currentUser, { departmentId: q.departmentId, subjectId: q.subjectId });
  };
  const scopedQuestions = questions.filter(inScope);
  const domain = loadDemoState();
  const unitList = domain.units.filter(unit => selectedSubject === 'all' || unit.subjectId === selectedSubject);
  const topicList = domain.topics.filter(topic => (selectedSubject === 'all' || topic.subjectId === selectedSubject) && (selectedUnit === 'all' || topic.unitId === selectedUnit));
  const departmentList = Array.from(new Set(scopedQuestions.map(q => q.departmentId))).map(id => ({ id, label: domain.departments.find(department => department.id === id)?.name || id }));
  const filteredQuestions = scopedQuestions.filter(q => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesId = q.id.toLowerCase().includes(term);
      const matchesText = (q.questionText || q.text).toLowerCase().includes(term);
      const matchesSubject = q.subjectName.toLowerCase().includes(term);
      const matchesTopic = (q.topicName || '').toLowerCase().includes(term);
      const matchesTags = (q.tags || []).some(tag => tag.toLowerCase().includes(term));
      const matchesCreatedBy = q.createdBy.toLowerCase().includes(term);
      if (!matchesId && !matchesText && !matchesSubject && !matchesTopic && !matchesTags && !matchesCreatedBy) return false;
    }
    if (selectedDepartment !== 'all' && q.departmentId !== selectedDepartment) return false;
    if (selectedSubject !== 'all' && q.subjectId !== selectedSubject) return false;
    if (selectedUnit !== 'all' && q.unitId !== selectedUnit) return false;
    if (selectedTopic !== 'all' && q.topicId !== selectedTopic) return false;
    const statusAliases: Record<string, string> = { 'UNDER REVIEW': 'UNDER_REVIEW', UNDER_REVIEW: 'UNDER_REVIEW' };
    const normalizedStatus = statusAliases[String(q.status).toUpperCase()] || String(q.status).toUpperCase().replace(/ /g, '_');
    if (selectedStatus !== 'all' && normalizedStatus !== selectedStatus) return false;
    if (selectedDifficulty !== 'all' && String(q.difficulty).toUpperCase() !== String(selectedDifficulty).toUpperCase()) return false;
    const typeAliases: Record<string, string> = { mcq: 'MCQ', short: 'SHORT_ANSWER', short_answer: 'SHORT_ANSWER', long: 'LONG_ANSWER', long_answer: 'LONG_ANSWER', essay: 'ESSAY', numerical: 'NUMERICAL', descriptive: 'DESCRIPTIVE' };
    if (selectedType !== 'all' && (q.questionType || typeAliases[String(q.type).toLowerCase()] || String(q.type).toUpperCase()) !== selectedType) return false;
    if (selectedBloom !== 'all' && q.bloomLevel !== selectedBloom) return false;
    if (selectedCreatedBy !== 'all' && q.createdBy !== selectedCreatedBy) return false;
    if (selectedCategory !== 'all' && !(q.tags || []).includes(selectedCategory)) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'marks') return b.marks - a.marks;
    if (sortBy === 'difficulty') { const rank = (value: string) => ({ EASY: 1, MEDIUM: 2, HARD: 3 }[value.toUpperCase()] || 0); return rank(b.difficulty) - rank(a.difficulty); }
    const timestamp = (value: string) => new Date(value).getTime() || 0;
    if (sortBy === 'oldest') return timestamp(a.createdAt) - timestamp(b.createdAt);
    return timestamp(b.createdAt) - timestamp(a.createdAt);
  });

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDepartment, selectedSubject, selectedUnit, selectedTopic, selectedStatus, selectedDifficulty, selectedType, selectedBloom, selectedCreatedBy, selectedCategory, sortBy]);
  useEffect(() => setSelectedStatus(initialStatus), [initialStatus]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
      {/* Workflow Guidance Banner (Requirement #1) */}
      <div className="bg-brand-secondary rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
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
            hidden={!permissionService.hasPermission(currentUser, 'question.create')}
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

          <select
            value={selectedDepartment}
            onChange={e => setSelectedDepartment(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Departments</option>
            {departmentList.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>

          <select
            value={selectedSubject}
            onChange={e => {
              setSelectedSubject(e.target.value);
              setSelectedUnit('all');
              setSelectedTopic('all');
            }}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Subjects</option>
            {domain.subjects.filter(s => currentUser.role === 'super_admin' || currentUser.role === 'university_admin' || currentUser.role === 'institution_admin' || (currentUser.subjectIds || []).includes(s.id)).map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>

          <select
            value={selectedUnit}
            onChange={e => {
              setSelectedUnit(e.target.value);
              setSelectedTopic('all');
            }}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Units</option>
            {unitList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <select
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Topics</option>
            {topicList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ARCHIVED">Archived</option>
          </select>

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

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="LONG_ANSWER">Long Answer</option>
            <option value="ESSAY">Essay</option>
            <option value="DESCRIPTIVE">Descriptive</option>
            <option value="NUMERICAL">Numerical</option>
          </select>

          <select
            value={selectedBloom}
            onChange={e => setSelectedBloom(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Bloom Levels</option>
            <option value="REMEMBER">Remember</option>
            <option value="UNDERSTAND">Understand</option>
            <option value="APPLY">Apply</option>
            <option value="ANALYZE">Analyze</option>
            <option value="EVALUATE">Evaluate</option>
            <option value="CREATE">Create</option>
          </select>

          <select
            value={selectedCreatedBy}
            onChange={e => setSelectedCreatedBy(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Created by</option>
            {Array.from(new Set(scopedQuestions.map(q => q.createdBy))).map(person => (
              <option key={person} value={person}>{person}</option>
            ))}
          </select>

          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700">
            <option value="all">All Categories</option>
            {Array.from(new Set(scopedQuestions.flatMap(question => question.tags || []))).map(category => <option key={category} value={category}>{category}</option>)}
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'newest' | 'oldest' | 'marks' | 'difficulty')}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="marks">Marks</option>
            <option value="difficulty">Difficulty</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>{filteredQuestions.length} records matched</span>
        <span>Page {currentPage} of {totalPages}</span>
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
              {paginatedQuestions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No questions match the current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedQuestions.map((q) => {
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
                          {q.questionText || q.text}
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
                          {<button
                            type="button"
                            onClick={() => onViewQuestion(q.id)}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                            title="View Question Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>}

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

                          {permissionService.hasPermission(currentUser, 'question.create') && <button
                            type="button"
                            onClick={() => handleDuplicate(q.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Duplicate Question"
                          >
                            <Copy className="h-4 w-4" />
                          </button>}

                          {q.status === 'Archived' && permissionService.hasPermission(currentUser, 'question_bank.manage') ? (
                            <button
                              type="button"
                              onClick={() => handleRestore(q.id)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Restore Question"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          ) : q.status !== 'Archived' && permissionService.hasPermission(currentUser, 'question_bank.archive') ? (
                            <button
                              type="button"
                              onClick={() => handleArchive(q.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Archive Question"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          ) : null}
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

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};

