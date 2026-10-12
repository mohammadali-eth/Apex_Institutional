'use client';
import React from 'react';
import { PreviousPaper } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Clock, Award, HelpCircle, Layers, Eye, BookmarkCheck, CheckCircle2 } from 'lucide-react';

interface PreviousPaperCardProps {
  paper: PreviousPaper;
  isSelectedAsReference?: boolean;
  onViewPaper: (paper: PreviousPaper) => void;
  onUseAsReference: (paper: PreviousPaper) => void;
}

/**
 * Requirement #9 & #12: Polished previous paper card design.
 * Explicitly distinguishes between Academic Year (e.g. 2025-26) and Generated Date (e.g. 12 March 2026).
 */
export const PreviousPaperCard: React.FC<PreviousPaperCardProps> = ({
  paper,
  isSelectedAsReference = false,
  onViewPaper,
  onUseAsReference,
}) => {
  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-200 p-5 shadow-sm hover:shadow-md flex flex-col justify-between relative ${
        isSelectedAsReference
          ? 'border-brand-500 ring-2 ring-brand-100 bg-brand-50/10'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Meta & Badges */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-mono text-xs font-bold text-slate-500">{paper.id}</span>
              <Badge variant="year">{paper.academicYear}</Badge>
              <Badge variant="set">{paper.set}</Badge>
            </div>
            <h4 className="text-base font-bold text-slate-900 leading-snug">
              {paper.subjectName}
            </h4>
          </div>
          <Badge status={paper.status}>{paper.status}</Badge>
        </div>

        {/* Academic Program & Semester Info */}
        <p className="text-xs text-slate-500 font-medium mb-3">
          Semester {paper.semesterId?.replace('sem-', '') || '3'} • {paper.programName}
        </p>

        {/* Key Distinction Box: Academic Year vs Generated Date (Requirement #9) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Academic Year
            </span>
            <span className="font-semibold text-slate-800 flex items-center mt-0.5">
              <Calendar className="h-3.5 w-3.5 text-brand-600 mr-1 flex-shrink-0" />
              {paper.academicYear}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Generated Date
            </span>
            <span className="font-semibold text-slate-800 flex items-center mt-0.5">
              <Clock className="h-3.5 w-3.5 text-slate-500 mr-1 flex-shrink-0" />
              {paper.generatedAt}
            </span>
          </div>
        </div>

        {/* Stats Grid: Marks, Duration, Questions, Units */}
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-600 mb-4 pt-1">
          <span className="flex items-center font-medium">
            <Award className="h-3.5 w-3.5 text-amber-500 mr-1" />
            {paper.totalMarks} Marks
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center font-medium">
            <Clock className="h-3.5 w-3.5 text-slate-400 mr-1" />
            {paper.duration}
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center font-medium">
            <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" />
            {paper.questionCount} Questions
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center font-medium">
            <Layers className="h-3.5 w-3.5 text-slate-400 mr-1" />
            {paper.unitCount} Units
          </span>
        </div>
      </div>

      {/* Action Buttons (Requirement #12, #13, #14) */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onViewPaper(paper)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition"
        >
          <Eye className="h-3.5 w-3.5 text-slate-500" />
          <span>View Paper</span>
        </button>

        <button
          type="button"
          onClick={() => onUseAsReference(paper)}
          className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
            isSelectedAsReference
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200'
          }`}
        >
          {isSelectedAsReference ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Reference Active</span>
            </>
          ) : (
            <>
              <BookmarkCheck className="h-3.5 w-3.5" />
              <span>Use as Reference</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

