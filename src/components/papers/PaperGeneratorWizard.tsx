import React, { useState, useMemo } from 'react';
import { useDepartment } from '../../contexts/DepartmentContext';
import { useAuth } from '../../contexts/AuthContext';
import { mockPrograms, mockSemesters, mockSubjects, mockUnits } from '../../mock/academicData';
import { paperService } from '../../services/paperService';
import { questionService } from '../../services/questionService';
import { PreviousPaper, BlueprintItem, PaperGenerationContext, Question } from '../../types';
import { PreviousPaperCard } from '../generator/PreviousPaperCard';
import { PaperPreviewModal } from '../generator/PaperPreviewModal';
import { ReferenceConfirmationModal } from '../generator/ReferenceConfirmationModal';
import {
  Sparkles,
  Layers,
  FileText,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Eye,
  Save,
  Printer,
  FileDown
} from 'lucide-react';

interface PaperGeneratorWizardProps {
  onNavigateHistory: () => void;
  initialReferencePaperId?: string;
  initialReferencePaperName?: string;
}

export const PaperGeneratorWizard: React.FC<PaperGeneratorWizardProps> = ({
  onNavigateHistory,
  initialReferencePaperId,
  initialReferencePaperName,
}) => {
  const { currentDepartment, currentInstitution } = useDepartment();
  const { currentUser } = useAuth();

  const deptId = currentDepartment?.id || 'dept-cs';
  const availablePrograms = mockPrograms.filter(p => p.departmentId === deptId);
  const availableSubjects = mockSubjects.filter(s => s.departmentId === deptId);

  // Wizard Stage (1 to 8)
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Academic Context
  const [programId, setProgramId] = useState(availablePrograms[0]?.id || 'prog-bca');
  const [semesterId, setSemesterId] = useState('sem-3');
  const [subjectId, setSubjectId] = useState(availableSubjects[0]?.id || 'sub-ds');
  const [targetYear, setTargetYear] = useState('2026-27');
  const [examDuration, setExamDuration] = useState('3 Hours');
  const [paperLanguage, setPaperLanguage] = useState('English');
  const [activeSet, setActiveSet] = useState<'A' | 'B' | 'C' | 'D'>('A');

  // Blueprint Items (Live calculation - Requirement #30)
  const [blueprint, setBlueprint] = useState<BlueprintItem[]>([
    { id: 'bp-1', questionType: 'mcq', questionCount: 10, marksPerQuestion: 1, totalMarks: 10 },
    { id: 'bp-2', questionType: 'short', questionCount: 5, marksPerQuestion: 2, totalMarks: 10 },
    { id: 'bp-3', questionType: 'long', questionCount: 4, marksPerQuestion: 5, totalMarks: 20 },
    { id: 'bp-4', questionType: 'essay', questionCount: 1, marksPerQuestion: 10, totalMarks: 10 },
  ]);

  // Advanced Previous Paper & Distribution Settings (Requirements #15, #16, #28)
  const [excludePrevious, setExcludePrevious] = useState(true);
  const [reduceRepetition, setReduceRepetition] = useState(true);
  const [excludeYears, setExcludeYears] = useState(3);
  const [preventSimilar, setPreventSimilar] = useState(true);
  const [autoBalanceUnits, setAutoBalanceUnits] = useState(true);

  // Reference paper state
  const [referencePaperId, setReferencePaperId] = useState<string | undefined>(initialReferencePaperId);
  const [referencePaperName, setReferencePaperName] = useState<string | undefined>(initialReferencePaperName);
  const [candidateRefPaper, setCandidateRefPaper] = useState<PreviousPaper | undefined>(undefined);
  const [previewPaper, setPreviewPaper] = useState<PreviousPaper | undefined>(undefined);

  // Subject units
  const units = mockUnits.filter(u => u.subjectId === subjectId);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>(units.map(u => u.id));

  // Generated Paper ID
  const [generatedId, setGeneratedId] = useState(`QP-2026-${Math.floor(100 + Math.random() * 899)}`);

  // Blueprint Total Calculation
  const totalMarksSum = blueprint.reduce((acc, b) => acc + (b.questionCount * b.marksPerQuestion), 0);

  // Dynamic Query for Previous Papers (Requirement #22)
  const previousPapers = useMemo(() => {
    if (!subjectId) return [];
    return paperService.getPreviousPapersForSubject({
      institutionId: currentInstitution?.id,
      departmentId: deptId,
      subjectId,
    });
  }, [currentInstitution?.id, deptId, subjectId]);

  // Bank Questions for Subject
  const bankQuestions = questionService.getQuestionsByDepartment(deptId).filter(q => q.subjectId === subjectId && q.status === 'Approved');
  const isInsufficientQuestions = bankQuestions.length < 3 && subjectId === 'sub-ecn'; // Demonstrates insufficient questions state (Requirement #29)

  const handleUpdateBlueprint = (id: string, count: number, marks: number) => {
    setBlueprint(prev => prev.map(b => b.id === id ? { ...b, questionCount: count, marksPerQuestion: marks, totalMarks: count * marks } : b));
  };

  const handleSaveToHistory = (status: 'draft' | 'submitted') => {
    const sub = mockSubjects.find(s => s.id === subjectId);
    const newPaper: PreviousPaper = {
      id: generatedId,
      institutionId: currentInstitution?.id || 'inst-apex',
      departmentId: deptId,
      programId,
      semesterId,
      subjectId,
      subjectName: sub?.name || 'Data Structures',
      programName: 'Bachelor of Computer Applications (BCA)',
      academicYear: targetYear,
      generatedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      totalMarks: totalMarksSum,
      duration: examDuration,
      language: paperLanguage,
      set: activeSet,
      questionCount: blueprint.reduce((a, b) => a + b.questionCount, 0),
      unitCount: selectedUnitIds.length,
      status,
      createdBy: currentUser?.name || 'Faculty',
    };

    paperService.createPaper(newPaper);
    alert(`Examination Paper ${generatedId} saved as ${status === 'submitted' ? 'Submitted for Review' : 'Draft'} in Paper History!`);
    onNavigateHistory();
  };

  const stages = [
    { num: 1, title: 'Academic' },
    { num: 2, title: 'Material' },
    { num: 3, title: 'Questions' },
    { num: 4, title: 'Blueprint' },
    { num: 5, title: 'Distribution' },
    { num: 6, title: 'Previous Papers' },
    { num: 7, title: 'Sets' },
    { num: 8, title: 'Preview' },
  ];

  return (
    <div className="space-y-6">
      {/* 8-Stage Horizontal Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {stages.map((st, idx) => {
            const isDone = currentStage > st.num;
            const isCurrent = currentStage === st.num;
            return (
              <React.Fragment key={st.num}>
                <div
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={() => setCurrentStage(st.num)}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isCurrent
                        ? 'bg-brand-primary text-white shadow ring-4 ring-brand-primary-light'
                        : isDone
                        ? 'bg-brand-secondary text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? '✓' : st.num}
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${
                    isCurrent ? 'text-brand-title font-bold' : 'text-brand-font'
                  }`}>
                    {st.title}
                  </span>
                </div>
                {idx < stages.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${currentStage > st.num ? 'bg-brand-secondary' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STAGE 1: ACADEMIC STEP (Requirement #20 & #21) */}
      {currentStage === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-brand-title">Step 1: Academic Context & Target Curriculum</h3>
            <p className="text-xs text-brand-paragraph mt-1">
              Department scope is automatically resolved ({currentDepartment?.name}). Select target examination program and subject.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">Program</label>
              <select
                value={programId}
                onChange={e => setProgramId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title focus:ring-2 focus:ring-brand-primary"
              >
                {availablePrograms.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">Semester</label>
              <select
                value={semesterId}
                onChange={e => setSemesterId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title focus:ring-2 focus:ring-brand-primary"
              >
                {mockSemesters.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
                Target Subject <span className="text-rose-500">*</span>
              </label>
              <select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-brand-primary rounded-lg px-3 py-2 text-xs font-bold text-brand-title focus:ring-2 focus:ring-brand-primary"
              >
                {availableSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">Target Academic Year</label>
              <select
                value={targetYear}
                onChange={e => setTargetYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title focus:ring-2 focus:ring-brand-primary"
              >
                <option value="2026-27">2026-27 (Upcoming)</option>
                <option value="2025-26">2025-26</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStage(2)}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition"
            >
              <span>Next: Material Ingestion</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: MATERIAL STEP */}
      {currentStage === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-brand-title">Step 2: Select Approved Syllabus Units</h3>
            <p className="text-xs text-brand-paragraph mt-1">
              Confirm the syllabus modules covered in this examination cycle.
            </p>
          </div>

          <div className="space-y-3">
            {units.map((u) => {
              const isChecked = selectedUnitIds.includes(u.id);
              return (
                <label
                  key={u.id}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isChecked ? 'border-brand-primary bg-brand-primary-light' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => {
                        if (e.target.checked) setSelectedUnitIds([...selectedUnitIds, u.id]);
                        else setSelectedUnitIds(selectedUnitIds.filter(id => id !== u.id));
                      }}
                      className="rounded border-slate-300 text-brand-primary accent-brand-primary focus:ring-brand-primary w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-brand-title block">{u.name}</span>
                      <span className="text-[11px] text-brand-font">Standard Weight: {u.weightagePercent || 20}%</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-brand-font px-2 py-0.5 rounded bg-white border">
                    Unit {u.number}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStage(1)}
              className="px-4 py-2 text-xs font-semibold text-brand-paragraph hover:bg-slate-50 rounded-lg"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(3)}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition"
            >
              <span>Next: Question Bank Pool</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: QUESTIONS STEP */}
      {currentStage === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-brand-title">Step 3: Question Bank Eligibility Pool</h3>
            <p className="text-xs text-brand-paragraph mt-1">
              Review approved pool for {mockSubjects.find(s => s.id === subjectId)?.name}.
            </p>
          </div>

          {/* Insufficient Questions State (Requirement #29) */}
          {isInsufficientQuestions ? (
            <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <span>Not enough approved questions available. (Requirement #29)</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                The generator requires at least 15 approved questions to synthesize a non-repetitive paper. Currently only {bankQuestions.length} approved questions exist for this subject.
              </p>
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => alert('Redirecting to question creation form...')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm"
                >
                  Add Questions
                </button>
                <button
                  type="button"
                  onClick={() => alert('Relaxing difficulty balance rules...')}
                  className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 font-bold text-xs rounded-lg"
                >
                  Relax Rule
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Pool contains <strong>{bankQuestions.length} approved questions</strong> spanning all {units.length} syllabus units.</span>
              </div>
              <span className="font-bold text-emerald-800">Adequate Pool</span>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStage(2)}
              className="px-4 py-2 text-xs font-semibold text-brand-paragraph hover:bg-slate-50 rounded-lg"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(4)}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition"
            >
              <span>Next: Visual Blueprint</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 4: VISUAL BLUEPRINT EDITOR (Requirement #30) */}
      {currentStage === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-brand-title">Step 4: Visual Examination Blueprint</h3>
              <p className="text-xs text-brand-paragraph mt-1">
                Configure question types and marks per question. Real-time mathematical total calculation enforced.
              </p>
            </div>
            <div className="text-right bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-brand-font block">Calculated Total</span>
              <span className="text-xl font-bold text-brand-title">{totalMarksSum} Marks</span>
            </div>
          </div>

          {/* Blueprint Table (Requirement #30) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-brand-bg-title border-b border-slate-200 text-[10px] font-bold text-brand-font uppercase tracking-wider">
                  <th className="py-2.5 px-3">Question Type</th>
                  <th className="py-2.5 px-3">Questions Count</th>
                  <th className="py-2.5 px-3">Marks / Question</th>
                  <th className="py-2.5 px-3">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blueprint.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-brand-title uppercase">{b.questionType}</td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={b.questionCount}
                        onChange={e => handleUpdateBlueprint(b.id, parseInt(e.target.value, 10) || 0, b.marksPerQuestion)}
                        className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{b.marksPerQuestion} Marks</td>
                    <td className="py-2.5 px-3 font-bold text-brand-primary">{b.questionCount * b.marksPerQuestion} Marks</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStage(3)}
              className="px-4 py-2 text-xs font-semibold text-brand-paragraph hover:bg-slate-50 rounded-lg"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(5)}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition"
            >
              <span>Next: Multi-Unit Distribution</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 5: QUESTION DISTRIBUTION & ADVANCED SETTINGS (Requirements #15, #16, #27, #28) */}
      {currentStage === 5 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-brand-title">Step 5: Balanced Multi-Unit Distribution</h3>
              <p className="text-xs text-brand-paragraph mt-1">
                The generator strictly distributes questions across all selected units (Requirement #27: Never all from one unit!).
              </p>
            </div>

            {/* Distribution Matrix Simulation */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-brand-bg-title border-b text-[10px] font-bold text-brand-font uppercase">
                    <th className="py-2.5 px-3">Question Type</th>
                    {units.map(u => (
                      <th key={u.id} className="py-2.5 px-3 text-center">Unit {u.number}</th>
                    ))}
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-brand-title">MCQ (1 Mark)</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">2</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">3</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">2</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">3</td>
                    <td className="py-2.5 px-3 text-right font-bold text-brand-primary">10</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-brand-title">Short Answer (2 Marks)</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">1</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">1</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">2</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">1</td>
                    <td className="py-2.5 px-3 text-right font-bold text-brand-primary">5</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-brand-title">Long Answer (5 Marks)</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">1</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">1</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">1</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">1</td>
                    <td className="py-2.5 px-3 text-right font-bold text-brand-primary">4</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Advanced Settings: Previous Paper Avoidance & Similarity Guard (Requirements #15 & #16) */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-title flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-primary" />
                <span>Previous Paper Settings & AI Guard (Requirements #15 & #16)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludePrevious}
                    onChange={e => setExcludePrevious(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-brand-primary accent-brand-primary focus:ring-brand-primary w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-brand-title block">Exclude questions used in previous papers</span>
                    <span className="text-slate-500 text-[11px]">Filters out past examination questions within lookback window.</span>
                  </div>
                </label>

                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reduceRepetition}
                    onChange={e => setReduceRepetition(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-brand-primary accent-brand-primary focus:ring-brand-primary w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-brand-title block">Reduce repetition from recent papers</span>
                    <span className="text-slate-500 text-[11px]">Deprioritizes items asked in consecutive examination cycles.</span>
                  </div>
                </label>

                <div className="flex items-center space-x-2">
                  <span className="font-medium text-slate-700">Exclude papers from last:</span>
                  <select
                    value={excludeYears}
                    onChange={e => setExcludeYears(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded px-2.5 py-1 font-bold text-xs"
                  >
                    <option value={1}>1 year</option>
                    <option value={2}>2 years</option>
                    <option value={3}>3 years (Standard cycle)</option>
                    <option value={5}>5 years</option>
                  </select>
                </div>

                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preventSimilar}
                    onChange={e => setPreventSimilar(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-brand-primary accent-brand-primary focus:ring-brand-primary w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-brand-title block">Prevent similar questions (Requirement #16)</span>
                    <span className="text-slate-500 text-[11px]">Avoid questions that are too similar to questions used in previous papers.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStage(4)}
                className="px-4 py-2 text-xs font-semibold text-brand-paragraph hover:bg-slate-50 rounded-lg"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStage(6)}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition"
              >
                <span>Next: Previous Papers Recommendations</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 6: PREVIOUS PAPERS RECOMMENDATIONS (Requirements #22, #23, #24) */}
      {currentStage === 6 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-brand-primary" />
                <h3 className="text-lg font-bold text-brand-title">Previously Generated Papers</h3>
              </div>
              <p className="text-xs text-brand-paragraph mt-0.5">
                We found {previousPapers.length} matching papers for this subject. Academic Year & Generated Date clearly indicated.
              </p>
            </div>

            {referencePaperName && (
              <span className="px-3 py-1 bg-brand-primary-light text-slate-900 border border-brand-primary rounded-full text-xs font-bold">
                Ref: {referencePaperName}
              </span>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {previousPapers.slice(0, 4).map(paper => (
              <PreviousPaperCard
                key={paper.id}
                paper={paper}
                isSelectedAsReference={referencePaperId === paper.id}
                onViewPaper={p => setPreviewPaper(p)}
                onUseAsReference={p => setCandidateRefPaper(p)}
              />
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStage(5)}
              className="px-4 py-2 text-xs font-semibold text-brand-paragraph hover:bg-slate-50 rounded-lg"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(7)}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition"
            >
              <span>Next: Multi-Set Configuration</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 7: MULTIPLE PAPER SETS (Requirement #31) */}
      {currentStage === 7 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-brand-title">Step 7: Multiple Examination Sets (Set A, B, C, D)</h3>
            <p className="text-xs text-brand-paragraph mt-1">
              All sets share identical blueprint, marks, and difficulty weights, with distinct randomized question sequences.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {(['A', 'B', 'C', 'D'] as const).map(setName => (
              <button
                key={setName}
                type="button"
                onClick={() => setActiveSet(setName)}
                className={`p-4 rounded-xl border text-center transition ${
                  activeSet === setName
                    ? 'border-brand-primary bg-brand-primary-light font-bold'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg block text-brand-title font-serif">SET {setName}</span>
                <span className="text-[10px] text-brand-font">50 Marks • 3 Hours</span>
              </button>
            ))}
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
            <strong className="block mb-1">Set Randomization Integrity:</strong>
            Questions across Set A, B, C, and D are permuted without internal duplicates to safeguard examination confidentiality.
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStage(6)}
              className="px-4 py-2 text-xs font-semibold text-brand-paragraph hover:bg-slate-50 rounded-lg"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(8)}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition"
            >
              <span>Compile & Preview Final Paper</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 8: COMPILED PAPER PREVIEW & EXPORT (Requirements #32 & #33) */}
      {currentStage === 8 && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold font-mono bg-slate-100 px-2.5 py-1 rounded text-brand-title">
                {generatedId}
              </span>
              <span className="text-xs font-bold text-brand-primary">SET {activeSet} COMPILED</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-brand-title text-xs font-semibold rounded-lg"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={() => alert('Simulated PDF Download initiated!')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-brand-title text-xs font-semibold rounded-lg"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveToHistory('draft')}
                className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-brand-title text-xs font-bold rounded-lg"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveToHistory('submitted')}
                className="inline-flex items-center space-x-1 px-4 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-lg shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Submit for Approval</span>
              </button>
            </div>
          </div>

          {/* Realistic High-Contrast Printed Examination Paper (Requirement #32) */}
          <div className="bg-white border-2 border-slate-900 rounded-xl p-8 shadow-md font-serif text-slate-900 paper-preview-watermark max-w-4xl mx-auto">
            <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1 font-sans">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                Autonomous University Examination Board
              </div>
              <h2 className="text-xl font-bold uppercase tracking-wider text-slate-950 font-serif">
                {currentInstitution?.name}
              </h2>
              <div className="text-sm font-semibold text-slate-700">
                {currentDepartment?.name}
              </div>
              <div className="text-sm text-slate-800 font-medium">
                Bachelor of Computer Applications (BCA) — Semester 3 Examinations
              </div>
            </div>

            <div className="py-4 border-b border-slate-800 text-xs font-sans grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
              <div>
                <span className="text-slate-500 block">Subject:</span>
                <strong className="text-slate-900 text-sm">Data Structures (CS-301)</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Academic Year:</span>
                <strong className="text-slate-900 text-sm">{targetYear}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Time Allowed:</span>
                <strong className="text-slate-900 text-sm">{examDuration}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Max Marks:</span>
                <strong className="text-slate-900 text-sm">{totalMarksSum} Marks</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Paper Set:</span>
                <strong className="text-slate-900 text-sm">SET {activeSet}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Language:</span>
                <strong className="text-slate-900 text-sm">{paperLanguage}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Paper ID:</span>
                <strong className="text-slate-900 text-sm font-mono">{generatedId}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Chief Examiner:</span>
                <strong className="text-slate-900 text-sm">{currentUser?.name}</strong>
              </div>
            </div>

            <div className="py-3 border-b border-dashed border-slate-400 text-xs font-sans text-slate-600">
              <strong>Instructions:</strong> All questions are compulsory. State assumptions clearly. Figures to the right indicate full marks.
            </div>

            {/* Questions Layout */}
            <div className="pt-6 space-y-6">
              <div className="space-y-3">
                <div className="border-b border-slate-400 pb-1 flex justify-between items-baseline font-sans">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    SECTION A: Objective & Concepts (10 x 1 = 10 Marks)
                  </h3>
                  <span className="text-xs text-slate-500">[All Compulsory]</span>
                </div>
                <div className="space-y-3 pl-2 text-sm leading-relaxed">
                  <div>
                    <span className="font-bold mr-2">Q1.</span>
                    <span>Which data structure is primarily used by compilers for syntax parsing and function call recursion management?</span>
                    <span className="text-[10px] text-slate-400 font-sans ml-2">[Q-1025 • v1]</span>
                    <div className="grid grid-cols-2 gap-2 mt-1.5 pl-6 font-sans text-xs text-slate-700">
                      <div>(A) FIFO Queue</div>
                      <div>(B) LIFO Stack</div>
                      <div>(C) Binary Min-Heap</div>
                      <div>(D) B-Tree</div>
                    </div>
                  </div>
                  <div>
                    <span className="font-bold mr-2">Q2.</span>
                    <span>State the time complexity of searching in an unsorted array of size N using linear scan.</span>
                    <span className="text-[10px] text-slate-400 font-sans ml-2">[Q-1018 • v1]</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="border-b border-slate-400 pb-1 flex justify-between items-baseline font-sans">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    SECTION B: Analytical & Descriptive Problems (4 x 5 = 20 Marks)
                  </h3>
                  <span className="text-xs text-slate-500">[Answer any 4]</span>
                </div>
                <div className="space-y-3 pl-2 text-sm leading-relaxed">
                  <div>
                    <span className="font-bold mr-2">Q3.</span>
                    <span>Differentiate between a singly linked list and a doubly linked list in terms of memory overhead and traversal capabilities.</span>
                    <span className="text-[10px] text-slate-400 font-sans ml-2">[Q-1024 • v3]</span>
                    <span className="float-right font-sans font-bold text-xs">[5]</span>
                  </div>
                  <div>
                    <span className="font-bold mr-2">Q4.</span>
                    <span>Write a C / C++ function to reverse an array in-place with O(n) time complexity and O(1) auxiliary space.</span>
                    <span className="text-[10px] text-slate-400 font-sans ml-2">[Q-1027 • v1]</span>
                    <span className="float-right font-sans font-bold text-xs">[5]</span>
                  </div>
                  <div>
                    <span className="font-bold mr-2">Q5.</span>
                    <span>Explain the algorithm for deleting a node with two children in a Binary Search Tree.</span>
                    <span className="text-[10px] text-slate-400 font-sans ml-2">[Q-1026 • v1]</span>
                    <span className="float-right font-sans font-bold text-xs">[5]</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Blocks (Requirement #32) */}
            <div className="pt-16 grid grid-cols-3 gap-8 text-center text-xs font-sans text-slate-700">
              <div className="border-t border-slate-400 pt-2 font-medium">Internal Examiner Signature</div>
              <div className="border-t border-slate-400 pt-2 font-medium">Head of Department (CSE)</div>
              <div className="border-t border-slate-400 pt-2 font-medium">Dean / Controller of Examinations</div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <PaperPreviewModal
        isOpen={Boolean(previewPaper)}
        paper={previewPaper}
        onClose={() => setPreviewPaper(undefined)}
      />

      <ReferenceConfirmationModal
        isOpen={Boolean(candidateRefPaper)}
        paper={candidateRefPaper}
        onClose={() => setCandidateRefPaper(undefined)}
        onContinue={() => {
          if (candidateRefPaper) {
            setReferencePaperId(candidateRefPaper.id);
            setReferencePaperName(`${candidateRefPaper.subjectName} (${candidateRefPaper.academicYear} Set ${candidateRefPaper.set})`);
          }
        }}
      />
    </div>
  );
};
