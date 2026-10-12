'use client';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { PreviousPaper, User } from '@/types';
import { paperService } from '@/lib/services/paperService';
import { mockSubjects, mockDepartments } from '@/data/academicData';
import { Badge } from '@/components/ui/Badge';
import { PaperPreviewModal } from '@/features/generator/PaperPreviewModal';
import { DuplicatePaperModal } from './DuplicatePaperModal';
import {
  Search,
  Filter,
  Eye,
  Copy,
  BookmarkCheck,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  History
} from 'lucide-react';

interface PaperHistoryViewProps {
  currentUser: User;
  onUseAsReferenceInGenerator: (paper: PreviousPaper) => void;
}

export const PaperHistoryView: React.FC<PaperHistoryViewProps> = ({
  currentUser,
  onUseAsReferenceInGenerator,
}) => {
  const { showToast } = useToast();
  const [papers, setPapers] = useState<PreviousPaper[]>(() => paperService.getAllPapers());
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [setFilter, setSetFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');

  // Modal states
  const [previewPaper, setPreviewPaper] = useState<PreviousPaper | undefined>(undefined);
  const [duplicateTargetPaper, setDuplicateTargetPaper] = useState<PreviousPaper | undefined>(undefined);

  useEffect(() => {
    return paperService.subscribe(() => {
      setPapers(paperService.getAllPapers());
    });
  }, []);

  const handleDuplicateConfirm = () => {
    if (duplicateTargetPaper) {
      const draft = paperService.duplicatePaperAsNewDraft(duplicateTargetPaper.id, currentUser);
      if (draft) {
        showToast('Draft Created', `New paper draft created: ${draft.id}`, 'success');
        setDuplicateTargetPaper(undefined);
      }
    }
  };

  // Filtered papers
  const filteredPapers = papers.filter(p => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesId = p.id.toLowerCase().includes(term);
      const matchesSub = p.subjectName.toLowerCase().includes(term);
      const matchesAuthor = p.createdBy.toLowerCase().includes(term);
      if (!matchesId && !matchesSub && !matchesAuthor) return false;
    }
    if (subjectFilter !== 'all' && p.subjectId !== subjectFilter) return false;
    if (deptFilter !== 'all' && p.departmentId !== deptFilter) return false;
    if (yearFilter !== 'all' && p.academicYear !== yearFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (setFilter !== 'all' && p.set !== setFilter) return false;
    if (langFilter !== 'all' && p.language.toLowerCase() !== langFilter.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
      {/* Title & Guidance Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <History className="h-6 w-6 text-brand-600" />
            <h1 className="text-2xl font-bold text-slate-900">Historical Paper Repository</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete institutional archive of generated examination papers. Historical approved papers remain immutable for audit integrity.
          </p>
        </div>

        <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center space-x-1.5">
          <span className="font-semibold text-slate-800">Total Archived:</span>
          <span>{papers.length} Examination Sets</span>
        </div>
      </div>

      {/* Filter Toolbar (Requirement #22) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by ID, subject, or creator..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Departments</option>
            {mockDepartments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Subjects</option>
            {mockSubjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Academic Year Filter */}
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Academic Years</option>
            <option value="2026-27">2026-27</option>
            <option value="2025-26">2025-26</option>
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
            <option value="2022-23">2022-23</option>
          </select>

          {/* Set Filter */}
          <select
            value={setFilter}
            onChange={e => setSetFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Sets</option>
            <option value="A">Set A</option>
            <option value="B">Set B</option>
            <option value="C">Set C</option>
            <option value="D">Set D</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>

          {/* Reset */}
          {(searchTerm || subjectFilter !== 'all' || deptFilter !== 'all' || yearFilter !== 'all' || statusFilter !== 'all' || setFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSubjectFilter('all');
                setDeptFilter('all');
                setYearFilter('all');
                setStatusFilter('all');
                setSetFilter('all');
              }}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              title="Reset Filters"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Historical Papers Table (Requirement #22) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Paper ID</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Academic Year</th>
                <th className="py-3 px-4">Generated Date</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Language</th>
                <th className="py-3 px-4">Set</th>
                <th className="py-3 px-4">Marks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPapers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    No historical question papers match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPapers.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    {/* Paper ID */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-brand-700">
                      {p.id}
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-800">
                      {p.subjectName}
                    </td>

                    {/* Academic Year (Requirement #9) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant="year">{p.academicYear}</Badge>
                    </td>

                    {/* Generated Date (Requirement #9) */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {p.generatedAt}
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {p.departmentId === 'dept-cs' ? 'CSE' : 'EE'}
                    </td>

                    {/* Semester */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      Sem {p.semesterId?.replace('sem-', '') || '3'}
                    </td>

                    {/* Language */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {p.language}
                    </td>

                    {/* Set */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant="set">{p.set}</Badge>
                    </td>

                    {/* Marks */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-800">
                      {p.totalMarks} M
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge status={p.status}>{p.status}</Badge>
                    </td>

                    {/* Actions Column (Requirement #22: View, Duplicate as New Draft, Use as Reference) */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* View Action */}
                        <button
                          type="button"
                          onClick={() => setPreviewPaper(p)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                          title="View Historical Paper"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Duplicate as New Draft (Requirement #23) */}
                        <button
                          type="button"
                          onClick={() => setDuplicateTargetPaper(p)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Duplicate as New Draft"
                        >
                          <Copy className="h-4 w-4" />
                        </button>

                        {/* Use as Reference Action */}
                        <button
                          type="button"
                          onClick={() => onUseAsReferenceInGenerator(p)}
                          className="p-1.5 text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded-lg transition"
                          title="Use as Reference in Generator"
                        >
                          <BookmarkCheck className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <PaperPreviewModal
        isOpen={Boolean(previewPaper)}
        paper={previewPaper}
        onClose={() => setPreviewPaper(undefined)}
        onUseAsReference={p => {
          setPreviewPaper(undefined);
          onUseAsReferenceInGenerator(p);
        }}
      />

      <DuplicatePaperModal
        isOpen={Boolean(duplicateTargetPaper)}
        paper={duplicateTargetPaper}
        onClose={() => setDuplicateTargetPaper(undefined)}
        onConfirm={handleDuplicateConfirm}
      />
    </div>
  );
};

