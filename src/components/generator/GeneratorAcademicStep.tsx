import React, { useState, useMemo } from 'react';
import { User, PreviousPaper, PaperGenerationContext } from '../../types';
import { mockInstitutions, mockDepartments, mockPrograms, mockSemesters, mockSubjects } from '../../mock/academicData';
import { paperService } from '../../services/paperService';
import { PreviousPaperCard } from './PreviousPaperCard';
import { PaperPreviewModal } from './PaperPreviewModal';
import { ReferenceConfirmationModal } from './ReferenceConfirmationModal';
import { Modal } from '../common/Modal';
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Filter,
  CheckCircle,
  Clock,
  Layers,
  Search,
  RotateCcw
} from 'lucide-react';

interface GeneratorAcademicStepProps {
  currentUser: User;
  context: PaperGenerationContext;
  onUpdateContext: (updates: Partial<PaperGenerationContext>) => void;
  onNext: () => void;
}

export const GeneratorAcademicStep: React.FC<GeneratorAcademicStepProps> = ({
  currentUser,
  context,
  onUpdateContext,
  onNext,
}) => {
  // Department-scoped programs and subjects (Department Isolation - Requirement #25)
  const availablePrograms = mockPrograms.filter(p => p.departmentId === currentUser.departmentId);
  const availableSemesters = mockSemesters;
  const availableSubjects = mockSubjects.filter(
    s => s.departmentId === currentUser.departmentId &&
    (context.programId ? s.programId === context.programId : true) &&
    (context.semesterId ? s.semesterId === context.semesterId : true)
  );

  // Recommendation Filters State (Requirement #11)
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterLang, setFilterLang] = useState<string>('all');
  const [filterSet, setFilterSet] = useState<string>('all');
  const [filterProgram, setFilterProgram] = useState<string>('all');

  // Modal states
  const [previewPaper, setPreviewPaper] = useState<PreviousPaper | undefined>(undefined);
  const [candidateReferencePaper, setCandidateReferencePaper] = useState<PreviousPaper | undefined>(undefined);
  const [showAllModal, setShowAllModal] = useState<boolean>(false);

  // Selected subject object
  const currentSubject = mockSubjects.find(s => s.id === context.subjectId);

  // Query Previous Papers via Dedicated Mock Service (Requirement #17)
  const previousPapers: PreviousPaper[] = useMemo(() => {
    if (!context.subjectId) return [];

    return paperService.getPreviousPapersForSubject({
      institutionId: currentUser.institutionId,
      departmentId: currentUser.departmentId || 'dept-cs',
      programId: filterProgram !== 'all' ? filterProgram : context.programId,
      semesterId: context.semesterId,
      subjectId: context.subjectId,
      academicYear: filterYear,
      language: filterLang,
      set: filterSet,
    });
  }, [
    currentUser.institutionId,
    currentUser.departmentId,
    context.programId,
    context.semesterId,
    context.subjectId,
    filterYear,
    filterLang,
    filterSet,
    filterProgram,
  ]);

  // Requirement #21: Show top 4 most relevant papers
  const displayedPapers = previousPapers.slice(0, 4);
  const hasMorePapers = previousPapers.length > 4;

  const handleSelectSubject = (subjectId: string) => {
    const sub = mockSubjects.find(s => s.id === subjectId);
    if (sub) {
      onUpdateContext({
        subjectId,
        programId: sub.programId,
        semesterId: sub.semesterId,
      });
    } else {
      onUpdateContext({ subjectId: '' });
    }
  };

  const handleUseAsReference = (paper: PreviousPaper) => {
    setCandidateReferencePaper(paper);
  };

  const handleConfirmReference = () => {
    if (candidateReferencePaper) {
      onUpdateContext({
        referencePaperId: candidateReferencePaper.id,
        referencePaperName: `${candidateReferencePaper.subjectName} (${candidateReferencePaper.academicYear} Set ${candidateReferencePaper.set})`,
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-1">
          <span>Step 1 of 3</span>
          <span>•</span>
          <span>Academic Context & History</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Define Academic Curriculum & Subject</h2>
        <p className="text-xs text-slate-500 mt-1">
          Select the academic context. The system will search previous examination paper archives to assist in blueprint balancing and question repetition avoidance.
        </p>

        {/* Academic Hierarchy Form (Requirement #24) */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Institution */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Institution
            </label>
            <input
              type="text"
              readOnly
              value={currentUser.institutionName}
              className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 cursor-not-allowed"
            />
          </div>

          {/* Department (Scoped) */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Department (Scoped)
            </label>
            <input
              type="text"
              readOnly
              value={currentUser.departmentName}
              className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 cursor-not-allowed"
            />
          </div>

          {/* Program */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Program
            </label>
            <select
              value={context.programId}
              onChange={e => onUpdateContext({ programId: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select Program</option>
              {availablePrograms.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Semester
            </label>
            <select
              value={context.semesterId}
              onChange={e => onUpdateContext({ semesterId: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select Semester</option>
              {availableSemesters.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Subject (Key Trigger) */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-brand-700 mb-1 flex items-center justify-between">
              <span>Subject <span className="text-rose-500">*</span></span>
              <span className="text-[9px] bg-brand-50 text-brand-600 px-1 py-0.2 rounded font-bold">Trigger</span>
            </label>
            <select
              value={context.subjectId}
              onChange={e => handleSelectSubject(e.target.value)}
              className="w-full bg-white border-2 border-brand-500 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select Subject...</option>
              {availableSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Reference Paper Notice if selected */}
      {context.referencePaperId && (
        <div className="bg-brand-50 border border-brand-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-600 text-white rounded-lg">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-brand-700 tracking-wider">
                Active Reference Paper
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                {context.referencePaperName}
              </h4>
              <p className="text-xs text-brand-800">
                Configured for repetition avoidance and syllabus distribution alignment.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onUpdateContext({ referencePaperId: undefined, referencePaperName: undefined })}
            className="text-xs text-slate-500 hover:text-rose-600 underline font-medium"
          >
            Clear Reference
          </button>
        </div>
      )}

      {/* PREVIOUS PAPER RECOMMENDATION SECTION (Requirements #8, #9, #10, #11, #12, #18, #19, #20, #21) */}
      <div className="space-y-4">
        {/* Requirement #19: Before Subject Selection Trigger */}
        {!context.subjectId ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-700">
              Select a subject to see previous papers.
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Once you select a subject (e.g. Data Structures), historical question papers from multiple academic years will be recommended here.
            </p>
          </div>
        ) : (
          /* After Subject Selection Trigger */
          <div className="space-y-4">
            {/* Recommendation Header & Filters (Requirement #11) */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-brand-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Previously Generated Papers
                    </h3>
                    <span className="text-xs font-semibold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full border border-brand-200">
                      {previousPapers.length} {previousPapers.length === 1 ? 'paper found' : 'papers found'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    We found {previousPapers.length} historical papers for <strong className="text-slate-800">{currentSubject?.name}</strong>.
                  </p>
                </div>

                {hasMorePapers && (
                  <button
                    type="button"
                    onClick={() => setShowAllModal(true)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-800 underline"
                  >
                    View All {previousPapers.length} Previous Papers →
                  </button>
                )}
              </div>

              {/* Optional Quick Filters (Requirement #11) */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
                <span className="text-slate-400 font-semibold flex items-center mr-1">
                  <Filter className="h-3 w-3 mr-1" />
                  Filters:
                </span>

                {/* Academic Year */}
                <select
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:ring-1 focus:ring-brand-500 font-medium"
                >
                  <option value="all">All Academic Years</option>
                  <option value="2025-26">AY 2025-26</option>
                  <option value="2024-25">AY 2024-25</option>
                  <option value="2023-24">AY 2023-24</option>
                  <option value="2022-23">AY 2022-23</option>
                </select>

                {/* Language */}
                <select
                  value={filterLang}
                  onChange={e => setFilterLang(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:ring-1 focus:ring-brand-500 font-medium"
                >
                  <option value="all">All Languages</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Gujarati">Gujarati</option>
                </select>

                {/* Set */}
                <select
                  value={filterSet}
                  onChange={e => setFilterSet(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:ring-1 focus:ring-brand-500 font-medium"
                >
                  <option value="all">All Sets (A-D)</option>
                  <option value="A">Set A</option>
                  <option value="B">Set B</option>
                  <option value="C">Set C</option>
                  <option value="D">Set D</option>
                </select>

                {(filterYear !== 'all' || filterLang !== 'all' || filterSet !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterYear('all');
                      setFilterLang('all');
                      setFilterSet('all');
                    }}
                    className="text-slate-500 hover:text-slate-800 flex items-center space-x-1 ml-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Requirement #20: No Previous Papers Clean Empty State */}
            {previousPapers.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Layers className="h-5 w-5" />
                </div>
                <h4 className="text-base font-bold text-slate-800">No previous papers found</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  There are no previously generated papers for this subject and academic context. You can continue with a new paper.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onNext}
                    className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition"
                  >
                    <span>Continue with New Paper</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Requirement #12 & #21: Top 4 Previous Paper Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedPapers.map(paper => (
                  <PreviousPaperCard
                    key={paper.id}
                    paper={paper}
                    isSelectedAsReference={context.referencePaperId === paper.id}
                    onViewPaper={p => setPreviewPaper(p)}
                    onUseAsReference={handleUseAsReference}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Step Navigation */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onNext}
          disabled={!context.subjectId}
          className="inline-flex items-center space-x-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition"
        >
          <span>Continue to Distribution</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Paper Preview Modal (Requirement #13) */}
      <PaperPreviewModal
        isOpen={Boolean(previewPaper)}
        paper={previewPaper}
        onClose={() => setPreviewPaper(undefined)}
        onUseAsReference={handleUseAsReference}
      />

      {/* Reference Confirmation Modal (Requirement #14) */}
      <ReferenceConfirmationModal
        isOpen={Boolean(candidateReferencePaper)}
        paper={candidateReferencePaper}
        onClose={() => setCandidateReferencePaper(undefined)}
        onContinue={handleConfirmReference}
      />

      {/* View All Previous Papers Modal (Requirement #21) */}
      {showAllModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowAllModal(false)}
          title={`All Historical Question Papers — ${currentSubject?.name}`}
          subtitle={`Showing all ${previousPapers.length} archived papers for this subject`}
          maxWidth="5xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previousPapers.map(paper => (
                <PreviousPaperCard
                  key={paper.id}
                  paper={paper}
                  isSelectedAsReference={context.referencePaperId === paper.id}
                  onViewPaper={p => {
                    setShowAllModal(false);
                    setPreviewPaper(p);
                  }}
                  onUseAsReference={p => {
                    setShowAllModal(false);
                    handleUseAsReference(p);
                  }}
                />
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
