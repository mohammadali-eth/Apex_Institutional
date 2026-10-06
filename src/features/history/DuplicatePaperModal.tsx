'use client';
import React from 'react';
import { PreviousPaper } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Copy, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface DuplicatePaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  paper?: PreviousPaper;
}

/**
 * Requirement #23: Paper Duplication Modal
 * "Create New Paper from Previous Paper?
 *  This will create a new draft.
 *  The original paper will remain unchanged.
 *  [Cancel] [Create Draft]"
 */
export const DuplicatePaperModal: React.FC<DuplicatePaperModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  paper,
}) => {
  if (!isOpen || !paper) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2 text-slate-900">
          <Copy className="h-5 w-5 text-brand-600" />
          <span>Create New Paper from Previous Paper?</span>
        </div>
      }
      subtitle={`Source Master: ${paper.id} (${paper.subjectName} • ${paper.academicYear})`}
      maxWidth="md"
    >
      <div className="space-y-4 text-sm">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700">
          <p className="font-semibold text-slate-900 mb-1">
            Duplication Architecture Rules:
          </p>
          <ul className="text-xs space-y-1.5 list-disc pl-4 text-slate-600">
            <li>This will create a fresh draft with a new unique examination identifier (e.g. <strong>QP-2026-014</strong>).</li>
            <li>The original historical paper (<strong className="font-mono">{paper.id}</strong>) will remain completely unchanged in the archive.</li>
            <li>Sections and structure will be cloned as a customizable starting draft.</li>
          </ul>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition"
          >
            <span>Create Draft</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};

