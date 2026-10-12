'use client';
import React from 'react';
import { PreviousPaper } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { BookmarkCheck, ShieldCheck, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface ReferenceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  paper?: PreviousPaper;
}

/**
 * Requirement #14 & #29: "Use as Reference" confirmation
 * Makes crystal clear that "Previous Paper != Copy Paper", but serves to analyze distribution
 * and avoid repeating previously asked questions.
 */
export const ReferenceConfirmationModal: React.FC<ReferenceConfirmationModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  paper,
}) => {
  if (!isOpen || !paper) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2 text-brand-700">
          <BookmarkCheck className="h-6 w-6" />
          <span>Reference Paper Selected</span>
        </div>
      }
      subtitle={`Reference: ${paper.id} (${paper.academicYear} • Set ${paper.set})`}
      maxWidth="md"
    >
      <div className="space-y-4 text-sm">
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-brand-950">
          <p className="font-semibold text-sm mb-1 flex items-center">
            <Sparkles className="h-4 w-4 text-brand-600 mr-1.5" />
            Smart Generation & Distribution Reference
          </p>
          <p className="text-xs text-brand-800 leading-relaxed">
            This paper will be used as a reference for <strong>question distribution</strong> and <strong>previous-question avoidance</strong>.
          </p>
        </div>

        <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
            System Actions Configured:
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Question Repetition Avoidance:</strong> Questions from this {paper.academicYear} paper will be excluded or deprioritized.
            </span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Blueprint Alignment:</strong> Adopts balanced Bloom&apos;s taxonomy &amp; unit weightage profile.
            </span>
          </div>
          <div className="flex items-start space-x-2">
            <ShieldCheck className="h-4 w-4 text-brand-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Integrity Guard:</strong> A new distinct set of randomized questions will be generated.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onContinue();
              onClose();
            }}
            className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition"
          >
            <span>Continue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};

