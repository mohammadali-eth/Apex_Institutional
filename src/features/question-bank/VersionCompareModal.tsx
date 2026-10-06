'use client';
import React, { useState } from 'react';
import { Question, QuestionVersion } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeftRight, CheckCircle, AlertCircle } from 'lucide-react';

interface VersionCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question;
}

export const VersionCompareModal: React.FC<VersionCompareModalProps> = ({
  isOpen,
  onClose,
  question,
}) => {
  const versions = question.versionHistory || [];
  const [leftVerNum, setLeftVerNum] = useState<number>(versions[1]?.version || versions[0]?.version || 1);
  const [rightVerNum, setRightVerNum] = useState<number>(versions[0]?.version || 1);

  const leftVersion: QuestionVersion | undefined = versions.find(v => v.version === leftVerNum) || versions[0];
  const rightVersion: QuestionVersion | undefined = versions.find(v => v.version === rightVerNum) || versions[0];

  if (!isOpen || !leftVersion || !rightVersion) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <ArrowLeftRight className="h-5 w-5 text-brand-600" />
          <span>Compare Versions — {question.id}</span>
        </div>
      }
      subtitle={`Subject: ${question.subjectName} • ${question.unitName}`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Version Pickers */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Base Version (Earlier)
            </label>
            <select
              value={leftVerNum}
              onChange={e => setLeftVerNum(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500"
            >
              {versions.map(v => (
                <option key={v.version} value={v.version}>
                  Version {v.version} ({v.status} • {v.editedAt})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Comparison Version (Later)
            </label>
            <select
              value={rightVerNum}
              onChange={e => setRightVerNum(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500"
            >
              {versions.map(v => (
                <option key={v.version} value={v.version}>
                  Version {v.version} ({v.status} • {v.editedAt})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <span className="font-bold text-slate-900 text-sm">Version {leftVersion.version}</span>
              <Badge status={leftVersion.status}>{leftVersion.status}</Badge>
            </div>
            
            <div className="text-xs text-slate-500 mb-3">
              Edited by: <span className="font-medium text-slate-700">{leftVersion.editedBy}</span>
              <br />
              Date: {leftVersion.editedAt}
            </div>

            <div className="flex space-x-2 mb-3">
              <span className="text-xs bg-white px-2 py-1 border rounded font-semibold text-slate-700">
                {leftVersion.marks} Marks
              </span>
              <Badge difficulty={leftVersion.difficulty}>{leftVersion.difficulty}</Badge>
            </div>

            <div className="mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Question Text:</span>
              <div className="text-sm text-slate-800 bg-white p-3 rounded-lg border border-slate-200 min-h-[90px]">
                {leftVersion.text}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Answer / Solution:</span>
              <div className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200 min-h-[70px]">
                {leftVersion.answer}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="border border-brand-200 rounded-xl p-4 bg-brand-50/20">
            <div className="flex items-center justify-between pb-3 border-b border-brand-200 mb-3">
              <span className="font-bold text-slate-900 text-sm">Version {rightVersion.version}</span>
              <Badge status={rightVersion.status}>{rightVersion.status}</Badge>
            </div>

            <div className="text-xs text-slate-500 mb-3">
              Edited by: <span className="font-medium text-slate-700">{rightVersion.editedBy}</span>
              <br />
              Date: {rightVersion.editedAt}
            </div>

            <div className="flex space-x-2 mb-3">
              <span className="text-xs bg-white px-2 py-1 border rounded font-semibold text-slate-700">
                {rightVersion.marks} Marks
              </span>
              <Badge difficulty={rightVersion.difficulty}>{rightVersion.difficulty}</Badge>
            </div>

            <div className="mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Question Text:</span>
              <div className="text-sm text-slate-900 bg-white p-3 rounded-lg border border-brand-200 min-h-[90px]">
                {rightVersion.text}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Answer / Solution:</span>
              <div className="text-sm text-slate-800 bg-white p-3 rounded-lg border border-brand-200 min-h-[70px]">
                {rightVersion.answer}
              </div>
            </div>
          </div>
        </div>

        {/* Change Highlights */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600">
          <div className="font-semibold text-slate-800 mb-1 flex items-center">
            <CheckCircle className="h-4 w-4 text-emerald-600 mr-1.5" />
            Audit Traceability Note
          </div>
          Historical question papers generated prior to Version {rightVersion.version} preserve their referenced snapshot intact. Approved questions branch new versions to ensure complete paper reproduction reproducibility.
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </Modal>
  );
};

