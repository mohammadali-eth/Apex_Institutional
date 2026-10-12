'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDepartment } from '@/hooks/useDepartment';
import { useToast } from '@/hooks/useToast';
import { approvalService } from '@/lib/services/approvalService';
import { paperService } from '@/lib/services/paperService';
import { PreviousPaper } from '@/types';
import { PaperPreviewModal } from '@/features/generator/PaperPreviewModal';
import { Modal } from '@/components/ui/Modal';
import { CheckSquare, CheckCircle2, XCircle, Eye, AlertCircle, Clock } from 'lucide-react';

export const ApprovalsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentDepartment } = useDepartment();
  const { showToast } = useToast();

  const deptId = currentDepartment?.id || 'dept-cs';
  const [papers, setPapers] = useState<PreviousPaper[]>(() => approvalService.getPapersAwaitingReview(deptId));
  const [previewPaper, setPreviewPaper] = useState<PreviousPaper | undefined>(undefined);
  const [rejectPaper, setRejectPaper] = useState<PreviousPaper | undefined>(undefined);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    return paperService.subscribe(() => {
      setPapers(approvalService.getPapersAwaitingReview(deptId));
    });
  }, [deptId]);

  const handleApprove = (paperId: string) => {
    if (!currentUser) return;
    approvalService.processReview({
      paperId,
      user: currentUser,
      action: 'approve',
      remarks: 'Approved for institutional administration.',
    });
    showToast('Paper Approved', `${paperId} has been moved to the active master archive.`, 'success');
  };

  const handleRejectConfirm = () => {
    if (!currentUser || !rejectPaper) return;
    approvalService.processReview({
      paperId: rejectPaper.id,
      user: currentUser,
      action: 'reject',
      remarks,
    });
    setRejectPaper(undefined);
    setRemarks('');
    showToast('Paper Returned', `${rejectPaper.id} has been sent back for revision.`, 'warning');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <CheckSquare className="h-6 w-6 text-brand-primary" />
            <h1 className="text-2xl font-bold text-brand-title">Examination Paper Approval Queue</h1>
          </div>
          <p className="text-xs text-brand-paragraph mt-1">
            HOD & Exam Coordinator review workflow. Review question blueprint alignment and approve for official publication.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 flex items-center space-x-1.5">
          <Clock className="h-4 w-4 text-brand-primary" />
          <span>{papers.length} Papers Awaiting Verification</span>
        </span>
      </div>

      {/* Papers Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-brand-bg-title border-b border-slate-200 text-[10px] font-bold text-brand-font uppercase tracking-wider">
              <th className="py-3 px-4">Paper ID</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Academic Year</th>
              <th className="py-3 px-4">Date Submitted</th>
              <th className="py-3 px-4">Set</th>
              <th className="py-3 px-4">Faculty Author</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {papers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-brand-font">
                  No examination papers are currently awaiting approval in this department.
                </td>
              </tr>
            ) : (
              papers.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-brand-secondary">{p.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-brand-title">{p.subjectName}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      AY {p.academicYear}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{p.generatedAt}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">Set {p.set}</td>
                  <td className="py-3.5 px-4 text-brand-paragraph">{p.createdBy}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setPreviewPaper(p)}
                        className="p-1.5 text-slate-600 hover:text-brand-title hover:bg-slate-100 rounded-lg transition"
                        title="View Paper"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(p.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectPaper(p)}
                        className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paper Preview Modal */}
      <PaperPreviewModal
        isOpen={Boolean(previewPaper)}
        paper={previewPaper}
        onClose={() => setPreviewPaper(undefined)}
      />

      {/* Reject Remarks Modal */}
      {rejectPaper && (
        <Modal
          isOpen={true}
          onClose={() => setRejectPaper(undefined)}
          title="Return Paper with Revision Remarks"
          subtitle={`Paper ID: ${rejectPaper.id} • ${rejectPaper.subjectName}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <textarea
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="State reason for rejection (e.g. Unit 3 weightage mismatch, question similarity issue)..."
              className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:ring-2 focus:ring-rose-500 text-slate-800"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setRejectPaper(undefined)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={!remarks.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 rounded hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Return
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

