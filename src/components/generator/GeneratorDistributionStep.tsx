import React, { useState } from 'react';
import { PaperGenerationContext } from '../../types';
import { mockSubjects, mockUnits } from '../../mock/academicData';
import {
  Sliders,
  Settings,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Clock,
  Layers,
  CheckSquare
} from 'lucide-react';

interface GeneratorDistributionStepProps {
  context: PaperGenerationContext;
  onUpdateContext: (updates: Partial<PaperGenerationContext>) => void;
  onBack: () => void;
  onGenerate: () => void;
}

export const GeneratorDistributionStep: React.FC<GeneratorDistributionStepProps> = ({
  context,
  onUpdateContext,
  onBack,
  onGenerate,
}) => {
  const currentSubject = mockSubjects.find(s => s.id === context.subjectId);
  const units = mockUnits.filter(u => u.subjectId === context.subjectId);

  const [easyPct, setEasyPct] = useState(30);
  const [medPct, setMedPct] = useState(50);
  const [hardPct, setHardPct] = useState(20);

  const adv = context.advancedSettings;

  const updateAdv = (key: keyof typeof adv, val: any) => {
    onUpdateContext({
      advancedSettings: {
        ...adv,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-1">
          <span>Step 2 of 3</span>
          <span>•</span>
          <span>Blueprint & Distribution</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Blueprint Configuration & Previous Paper Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure examination blueprint constraints, unit weightages, and repetition avoidance criteria.
        </p>

        {context.referencePaperId && (
          <div className="mt-4 bg-brand-50 border border-brand-200 p-3 rounded-lg flex items-center justify-between text-xs text-brand-900">
            <span className="flex items-center space-x-2 font-medium">
              <Sparkles className="h-4 w-4 text-brand-600" />
              <span>Reference Paper: <strong>{context.referencePaperName}</strong> is actively influencing question filtering and distribution profile.</span>
            </span>
          </div>
        )}
      </div>

      {/* Grid: Exam Parameters & Difficulty */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exam Specification */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Sliders className="h-4 w-4 text-brand-600" />
            <span>Examination Parameters</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Target Academic Year
              </label>
              <select
                value={context.academicYear}
                onChange={e => onUpdateContext({ academicYear: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-brand-500"
              >
                <option value="2026-27">2026-27 (Upcoming)</option>
                <option value="2025-26">2025-26</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Paper Set
              </label>
              <select
                value={context.set}
                onChange={e => onUpdateContext({ set: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-brand-500"
              >
                <option value="A">Set A</option>
                <option value="B">Set B</option>
                <option value="C">Set C</option>
                <option value="D">Set D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Total Marks
              </label>
              <select
                value={context.totalMarks}
                onChange={e => onUpdateContext({ totalMarks: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-brand-500"
              >
                <option value={50}>50 Marks (Mid-Term / Standard)</option>
                <option value={70}>70 Marks (University End-Sem)</option>
                <option value={100}>100 Marks (Comprehensive Final)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Exam Duration
              </label>
              <select
                value={context.examDuration}
                onChange={e => onUpdateContext({ examDuration: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-brand-500"
              >
                <option value="2 Hours">2 Hours</option>
                <option value="2.5 Hours">2.5 Hours</option>
                <option value="3 Hours">3 Hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Layers className="h-4 w-4 text-emerald-600" />
            <span>Difficulty Balance Mix</span>
          </h3>

          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700">Easy (Foundational): {easyPct}%</span>
                <span className="text-slate-500">{Math.round((context.totalMarks * easyPct) / 100)} Marks</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                value={easyPct}
                onChange={e => setEasyPct(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700">Medium (Analytical): {medPct}%</span>
                <span className="text-slate-500">{Math.round((context.totalMarks * medPct) / 100)} Marks</span>
              </div>
              <input
                type="range"
                min={20}
                max={70}
                value={medPct}
                onChange={e => setMedPct(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700">Hard (Complex/Design): {hardPct}%</span>
                <span className="text-slate-500">{Math.round((context.totalMarks * hardPct) / 100)} Marks</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                value={hardPct}
                onChange={e => setHardPct(Number(e.target.value))}
                className="w-full accent-rose-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CORE REQUIREMENTS #15 & #16: Advanced Settings & Previous Paper Settings */}
      <div className="bg-white rounded-xl border border-brand-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-brand-100 text-brand-700 rounded-lg">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Advanced Settings — Previous Paper Settings</h3>
              <p className="text-xs text-slate-500">
                Automated repetition prevention and past examination avoidance controls (Requirements #15 & #16).
              </p>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-200">
            Core Feature
          </span>
        </div>

        {/* Options List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Requirement #15: Exclude & Reduce Repetition Controls */}
          <div className="space-y-4 bg-slate-50/70 p-5 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-brand-primary" />
              <span>Historical Question Exclusion (Requirement #15)</span>
            </h4>

            {/* Checkbox 1: Exclude questions used in previous papers */}
            <label className="flex items-start space-x-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={adv.excludePreviousPaperQuestions}
                onChange={e => updateAdv('excludePreviousPaperQuestions', e.target.checked)}
                className="mt-0.5 w-4 h-4 text-brand-primary accent-brand-primary rounded border-slate-300 focus:ring-brand-primary"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">
                  Exclude questions used in previous papers
                </span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  Filters out any question item that has been formally appeared on an approved university paper within the configured lookback window.
                </span>
              </div>
            </label>

            {/* Checkbox 2: Reduce repetition from recent papers */}
            <label className="flex items-start space-x-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={adv.reduceRepetitionFromRecent}
                onChange={e => updateAdv('reduceRepetitionFromRecent', e.target.checked)}
                className="mt-0.5 w-4 h-4 text-brand-primary accent-brand-primary rounded border-slate-300 focus:ring-brand-primary"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">
                  Reduce repetition from recent papers
                </span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  Applies exponential decay weighting to prioritize freshly authored and unused questions from the bank.
                </span>
              </div>
            </label>

            {/* Config: Number of years to exclude */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-700 block">
                  Exclude papers from last:
                </label>
                <span className="text-[11px] text-slate-500">Academic years lookback window</span>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={adv.excludePapersYears}
                  onChange={e => updateAdv('excludePapersYears', Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-primary shadow-sm"
                >
                  <option value={1}>1 Year (Immediate Past)</option>
                  <option value={2}>2 Years</option>
                  <option value={3}>3 Years (Recommended)</option>
                  <option value={4}>4 Years</option>
                  <option value={5}>5 Years (Comprehensive)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Requirement #16: Similar Question Prevention */}
          <div className="space-y-4 bg-slate-50/70 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5 mb-3">
                <Sparkles className="h-4 w-4 text-brand-primary" />
                <span>Semantic & Similarity Guard (Requirement #16)</span>
              </h4>

              {/* Checkbox 3: Prevent similar questions */}
              <label className="flex items-start space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={adv.preventSimilarQuestions}
                  onChange={e => updateAdv('preventSimilarQuestions', e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-brand-primary accent-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">
                    Prevent similar questions
                  </span>
                  <p className="text-slate-500 text-[11px] mt-1 leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                    Avoid questions that are too similar to questions used in previous papers.
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-brand-primary-light p-3 rounded-lg border border-brand-primary/30 text-[11px] text-brand-title">
              <strong className="block font-semibold">Future AI Architecture Ready:</strong>
              This interface control hooks directly into the upcoming vector embedding similarity pipeline for semantic distance scoring.
            </div>
          </div>
        </div>
      </div>

      {/* Unit Weightages */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          Syllabus Units & Module Distribution
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {units.map((u, i) => (
            <div key={u.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800 block">{u.name}</span>
                <span className="text-slate-400 text-[11px]">Recommended: {Math.round(100 / (units.length || 1))}% weight</span>
              </div>
              <span className="px-2 py-1 bg-white rounded border font-semibold text-slate-700">
                Unit {i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Wizard Bottom Nav */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Academic</span>
        </button>

        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex items-center space-x-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition"
        >
          <Sparkles className="h-4 w-4" />
          <span>Generate Question Paper</span>
        </button>
      </div>
    </div>
  );
};
