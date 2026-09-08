import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
}

/**
 * Requirement #4: Unsaved changes protection modal
 * "Unsaved Changes
 *  You have unsaved changes.
 *  Are you sure you want to leave?
 *  [Stay] [Leave]"
 */
export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onStay,
  onLeave,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onStay} maxWidth="md" showCloseButton={false}>
      <div className="flex items-start space-x-4">
        <div className="rounded-full bg-amber-100 p-3 text-amber-600 flex-shrink-0">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">Unsaved Changes</h3>
          <p className="mt-2 text-sm text-slate-600">
            You have unsaved changes in this question form. Are you sure you want to leave without saving?
          </p>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onStay}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              Stay
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
