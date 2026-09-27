import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { PaperGenerationContext, User, PreviousPaper } from '../../types';
import { mockSubjects } from '../../mock/academicData';
import { paperService } from '../../services/paperService';
import {
  CheckCircle2,
  Printer,
  FileDown,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Save,
  BookOpen
} from 'lucide-react';

interface GeneratorPreviewStepProps {
  currentUser: User;
  context: PaperGenerationContext;
  onReset: () => void;
  onNavigateHistory: () => void;
}

export const GeneratorPreviewStep: React.FC<GeneratorPreviewStepProps> = ({
  currentUser,
  context,
  onReset,
  onNavigateHistory,
}) => {
  const { showToast } = useToast();
  const currentSubject = mockSubjects.find(s => s.id === context.subjectId);
  const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const [newPaperId] = useState(`QP-2026-${Math.floor(100 + Math.random() * 899)}`);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveToHistory = () => {
    const newPaper: PreviousPaper = {
      id: newPaperId,
      institutionId: currentUser.institutionId,
      departmentId: currentUser.departmentId || 'dept-cs',
      programId: context.programId,
      semesterId: context.semesterId,
      subjectId: context.subjectId,
      subjectName: currentSubject?.name || 'Data Structures',
      programName: 'Bachelor of Computer Applications (BCA)',
      academicYear: context.academicYear,
      generatedAt: now,
      totalMarks: context.totalMarks,
      duration: context.examDuration,
      language: context.language || 'English',
      set: context.set,
      questionCount: context.totalMarks === 50 ? 12 : 24,
      unitCount: 5,
      status: 'draft',
      createdBy: currentUser.name,
    };

    paperService.createPaper(newPaper);
    setIsSaved(true);
    showToast('Paper Saved', `${newPaperId} has been saved to paper history as draft.`, 'success');
  };

  return (
    <div className="space-y-8">
      {/* Success Notification Bar */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-emerald-950">Paper Generation Successful!</h2>
              <span className="font-mono text-xs font-bold bg-white text-emerald-800 px-2.5 py-0.5 rounded border border-emerald-300">
                {newPaperId}
              </span>
            </div>
            <p className="text-xs text-emerald-800 mt-1">
              Constructed following curriculum blueprint, Bloom taxonomy weights, and previous paper avoidance constraints.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {!isSaved ? (
            <button
              type="button"
              onClick={handleSaveToHistory}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition"
            >
              <Save className="h-4 w-4" />
              <span>Save to History</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNavigateHistory}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-brand-700 bg-white border border-brand-300 hover:bg-brand-50 rounded-lg transition"
            >
              <BookOpen className="h-4 w-4" />
              <span>View in Paper History</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>New Generation</span>
          </button>
        </div>
      </div>

      {/* Advanced Settings Enforcement Summary (Requirements #15 & #16) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
          <ShieldCheck className="h-4 w-4 text-brand-600" />
          <span>Applied Generation Filters & Repetition Guard</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-400 block font-medium">Previous Paper Avoidance:</span>
            <span className="font-bold text-slate-800">
              {context.advancedSettings.excludePreviousPaperQuestions ? 'Active (Past ' + context.advancedSettings.excludePapersYears + ' Years)' : 'Disabled'}
            </span>
            <span className="text-[11px] text-emerald-700 block mt-0.5">
              ✓ 14 previously used questions avoided
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-400 block font-medium">Semantic Similarity Guard:</span>
            <span className="font-bold text-slate-800">
              {context.advancedSettings.preventSimilarQuestions ? 'Active (AI Guard Enabled)' : 'Disabled'}
            </span>
            <span className="text-[11px] text-brand-primary font-bold block mt-0.5">
              ✓ Low cosine similarity threshold applied
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-400 block font-medium">Reference Model Profile:</span>
            <span className="font-bold text-slate-800">
              {context.referencePaperName || 'None (Default Distribution)'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Unit weightage matched to reference
            </span>
          </div>
        </div>
      </div>

      {/* Realistic Question Paper Preview Sheet */}
      <div className="bg-white border-2 border-slate-900 rounded-xl p-8 shadow-md font-serif text-slate-900 paper-preview-watermark max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
          <div className="text-xs uppercase font-sans tracking-widest text-slate-500 font-bold">
            Autonomous University Examination System
          </div>
          <h2 className="text-xl font-bold uppercase tracking-wider text-slate-950">
            {currentUser.institutionName}
          </h2>
          <div className="text-sm font-semibold text-slate-700">
            {currentUser.departmentName}
          </div>
          <div className="text-sm text-slate-800 font-medium">
            Bachelor of Computer Applications (BCA) — Semester 3 Examinations
          </div>
        </div>

        {/* Meta */}
        <div className="py-4 border-b border-slate-800 text-xs font-sans grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
          <div>
            <span className="text-slate-500 block">Subject:</span>
            <strong className="text-slate-900 text-sm">{currentSubject?.name || 'Data Structures'}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Academic Year:</span>
            <strong className="text-slate-900 text-sm">{context.academicYear}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Time Allowed:</span>
            <strong className="text-slate-900 text-sm">{context.examDuration}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Max Marks:</span>
            <strong className="text-slate-900 text-sm">{context.totalMarks}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Set:</span>
            <strong className="text-slate-900 text-sm">SET {context.set}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Generated:</span>
            <strong className="text-slate-900 text-sm">{now}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Paper ID:</span>
            <strong className="text-slate-900 text-sm font-mono">{newPaperId}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Faculty:</span>
            <strong className="text-slate-900 text-sm">{currentUser.name}</strong>
          </div>
        </div>

        {/* Questions Body */}
        <div className="pt-6 space-y-6">
          {/* Section A */}
          <div className="space-y-3">
            <div className="border-b border-slate-400 pb-1 flex justify-between items-baseline">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                SECTION A: Objective & Concepts (10 x 1 = 10 Marks)
              </h3>
              <span className="text-xs font-sans text-slate-500">[All Compulsory]</span>
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

          {/* Section B */}
          <div className="space-y-3 pt-4">
            <div className="border-b border-slate-400 pb-1 flex justify-between items-baseline">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                SECTION B: Analytical & Descriptive Problems (4 x 5 = 20 Marks)
              </h3>
              <span className="text-xs font-sans text-slate-500">[Answer any 4]</span>
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

        <div className="mt-12 text-center text-xs font-sans text-slate-400 tracking-widest uppercase">
          *** End of Examination Paper ***
        </div>
      </div>
    </div>
  );
};
