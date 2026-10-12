import { PreviousPaper, User } from '@/types';
import { paperService } from '@/lib/services/paperService';

export interface ApprovalActionParams {
  paperId: string;
  user: User;
  action: 'approve' | 'reject';
  remarks?: string;
}

export const approvalService = {
  getPapersAwaitingReview(departmentId: string): PreviousPaper[] {
    return paperService.getAllPapers().filter(p => p.departmentId === departmentId && (p.status === 'submitted' || p.status === 'under_review'));
  },

  submitPaperForReview(paperId: string, user: User, remarks?: string) {
    const paper = paperService.getPaperById(paperId);
    if (paper) {
      paper.status = 'submitted';
      paper.remarks = remarks;
      paperService.createPaper(paper);
    }
  },

  processReview(params: ApprovalActionParams) {
    const paper = paperService.getPaperById(params.paperId);
    if (paper) {
      paper.status = params.action === 'approve' ? 'approved' : 'rejected';
      paper.remarks = params.remarks;
      paperService.createPaper(paper);
    }
  }
};
