import { PreviousPaper, PreviousPaperQuery, User, PaperStatus } from '@/types';
import { initialPreviousPapers } from '@/data/previousPaperData';
import { updateDemoState } from '@/data/demoState';
import { permissionService } from '@/lib/permissions/permissionService';
import { auditService } from '@/lib/services/auditService';

const STORAGE_KEY = 'qpms_papers_v1';

function getStoredPapers(): PreviousPaper[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch (e) {
    console.error('Failed to read papers from localStorage', e);
  }
  return [...initialPreviousPapers];
}

function saveStoredPapers(papers: PreviousPaper[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(papers));
    }
  } catch (e) {
    console.error('Failed to write papers to localStorage', e);
  }
}

let paperStore: PreviousPaper[] = getStoredPapers();
const listeners: Array<() => void> = [];

function notifyListeners() {
  saveStoredPapers(paperStore);
  updateDemoState(state => ({ ...state, papers: paperStore }));
  listeners.forEach(fn => fn());
}

const legacyStatus: Record<PaperStatus, PreviousPaper['status']> = {
  DRAFT: 'draft', SUBMITTED: 'submitted', UNDER_REVIEW: 'under_review', CHANGES_REQUESTED: 'rejected',
  QUALITY_REVIEW: 'under_review', QUALITY_APPROVED: 'approved', PENDING_FINAL_APPROVAL: 'approved',
  APPROVED: 'approved', FINALIZED: 'approved', PUBLISHED: 'approved', ARCHIVED: 'archived',
};
const normalizePaper = (paper: PreviousPaper): PreviousPaper => ({ ...paper, workflowStatus: paper.workflowStatus || ({ draft: 'DRAFT', submitted: 'SUBMITTED', under_review: 'UNDER_REVIEW', approved: 'APPROVED', rejected: 'CHANGES_REQUESTED', archived: 'ARCHIVED' } as const)[paper.status] || 'DRAFT', version: paper.version || 1 });
paperStore = paperStore.map(normalizePaper);

function appendEvent(paper: PreviousPaper, status: PaperStatus, user: User, comment?: string) {
  const at = new Date().toISOString();
  return { ...paper, workflowStatus: status, status: legacyStatus[status], updatedAt: at, timeline: [...(paper.timeline || []), { status, actor: user.name, at, comment }] };
}

/**
 * Extracts numeric year from Academic Year string (e.g. "2025-26" -> 2025) or date.
 */
function getSortYear(paper: PreviousPaper): number {
  const parts = paper.academicYear.split('-');
  const startYear = parseInt(parts[0], 10);
  if (!isNaN(startYear)) return startYear;
  const dateMatch = paper.generatedAt.match(/\d{4}/);
  return dateMatch ? parseInt(dateMatch[0], 10) : 0;
}

export const paperService = {
  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  getPreviousPapersForSubject(query: PreviousPaperQuery): PreviousPaper[] {
    return paperStore
      .filter(paper => {
        // Enforce department boundary
        if (paper.departmentId !== query.departmentId) {
          return false;
        }

        // Match subject
        if (paper.subjectId !== query.subjectId) {
          return false;
        }

        // Match optional filters if provided
        if (query.programId && paper.programId !== query.programId) {
          return false;
        }
        if (query.semesterId && paper.semesterId && paper.semesterId !== query.semesterId) {
          return false;
        }
        if (query.academicYear && query.academicYear !== 'all' && paper.academicYear !== query.academicYear) {
          return false;
        }
        if (query.language && query.language !== 'all' && paper.language.toLowerCase() !== query.language.toLowerCase()) {
          return false;
        }
        if (query.set && query.set !== 'all' && paper.set !== query.set) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort Newest -> Oldest (Requirement #10)
        const yearDiff = getSortYear(b) - getSortYear(a);
        if (yearDiff !== 0) return yearDiff;
        return b.generatedAt.localeCompare(a.generatedAt);
      });
  },

  getAllPapers(filters?: {
    departmentId?: string;
    subjectId?: string;
    programId?: string;
    semesterId?: string;
    academicYear?: string;
    language?: string;
    set?: string;
    status?: string;
    searchTerm?: string;
  }): PreviousPaper[] {
    let result = [...paperStore];

    if (filters) {
      if (filters.departmentId) {
        result = result.filter(p => p.departmentId === filters.departmentId);
      }
      if (filters.subjectId && filters.subjectId !== 'all') {
        result = result.filter(p => p.subjectId === filters.subjectId);
      }
      if (filters.programId && filters.programId !== 'all') {
        result = result.filter(p => p.programId === filters.programId);
      }
      if (filters.academicYear && filters.academicYear !== 'all') {
        result = result.filter(p => p.academicYear === filters.academicYear);
      }
      if (filters.language && filters.language !== 'all') {
        result = result.filter(p => p.language.toLowerCase() === filters.language!.toLowerCase());
      }
      if (filters.set && filters.set !== 'all') {
        result = result.filter(p => p.set === filters.set);
      }
      if (filters.status && filters.status !== 'all') {
        result = result.filter(p => p.status === filters.status);
      }
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        result = result.filter(
          p =>
            p.id.toLowerCase().includes(term) ||
            p.subjectName.toLowerCase().includes(term) ||
            p.createdBy.toLowerCase().includes(term)
        );
      }
    }

    return result.sort((a, b) => getSortYear(b) - getSortYear(a));
  },

  getPaperById(id: string): PreviousPaper | undefined {
    return paperStore.find(p => p.id === id);
  },

  createWorkflowPaper(paper: PreviousPaper, user: User) {
    if (!permissionService.hasPermission(user, 'paper.create') || !permissionService.canAccessResource(user, { departmentId: paper.departmentId, subjectId: paper.subjectId, examId: paper.examId })) return undefined;
    const created = appendEvent({ ...paper, createdBy: user.name, version: 1, title: paper.title || `${paper.subjectName} Examination`, history: [{ version: 1, changedBy: user.name, changedAt: new Date().toISOString(), summary: 'Initial paper draft' }] }, 'DRAFT', user);
    paperStore.unshift(created); notifyListeners(); this.recordAudit(`Created paper ${created.id}`, user); return created;
  },

  transitionPaper(id: string, next: PaperStatus, user: User, comment?: string, confirmed = false) {
    const paper = paperStore.find(item => item.id === id);
    if (!paper || !permissionService.canAccessResource(user, { departmentId: paper.departmentId, subjectId: paper.subjectId, examId: paper.examId })) return undefined;
    const current = paper.workflowStatus || 'DRAFT';
    if (next === 'SUBMITTED' && current !== 'DRAFT' && current !== 'CHANGES_REQUESTED') return undefined;
    if (next === 'UNDER_REVIEW' && current !== 'SUBMITTED' || next === 'CHANGES_REQUESTED' && !['UNDER_REVIEW', 'QUALITY_REVIEW', 'PENDING_FINAL_APPROVAL'].includes(current)) return undefined;
    if (next === 'QUALITY_REVIEW' && current !== 'UNDER_REVIEW' || next === 'QUALITY_APPROVED' && current !== 'QUALITY_REVIEW') return undefined;
    if (next === 'PENDING_FINAL_APPROVAL' && current !== 'QUALITY_APPROVED' || next === 'APPROVED' && current !== 'PENDING_FINAL_APPROVAL') return undefined;
    if (next === 'FINALIZED' && (current !== 'APPROVED' || !confirmed) || next === 'PUBLISHED' && (current !== 'FINALIZED' || !confirmed)) return undefined;
    if (next === 'ARCHIVED' && !['DRAFT', 'PUBLISHED'].includes(current)) return undefined;
    if (next === 'SUBMITTED') {
      const chosen = (paper.sections || []).flatMap(section => section.questions);
      const marks = chosen.reduce((total, question) => total + question.marks, 0);
      if (!paper.examId || !paper.subjectId || !(paper.sections || []).length || !chosen.length || marks !== paper.totalMarks) return undefined;
    }
    if (['APPROVED','FINALIZED','PUBLISHED'].includes(next) && !confirmed) return undefined;
    if (['QUALITY_APPROVED', 'PENDING_FINAL_APPROVAL'].includes(next) && user.role !== 'quality_controller' && !['super_admin', 'institution_admin', 'university_admin'].includes(user.role)) return undefined;
    if (['APPROVED', 'FINALIZED'].includes(next) && user.role !== 'exam_controller' && !['super_admin', 'institution_admin', 'university_admin'].includes(user.role)) return undefined;
    const required: Record<string, Parameters<typeof permissionService.hasPermission>[1]> = {
      SUBMITTED: 'paper.submit', UNDER_REVIEW: 'paper.review', CHANGES_REQUESTED: 'paper.review', QUALITY_REVIEW: 'paper.review', QUALITY_APPROVED: 'paper.approve', PENDING_FINAL_APPROVAL: 'paper.approve', APPROVED: 'paper.finalize', FINALIZED: 'paper.finalize', PUBLISHED: 'paper.publish', ARCHIVED: 'paper.update',
    };
    if (required[next] && !permissionService.hasPermission(user, required[next])) return undefined;
    if (next === 'CHANGES_REQUESTED' && !comment?.trim()) return undefined;
    const updated = appendEvent(paper, next, user, comment);
    if (next === 'SUBMITTED') updated.submittedBy = user.name;
    if (next === 'CHANGES_REQUESTED') updated.reviewComments = [...(paper.reviewComments || []), comment!.trim()];
    if (next === 'UNDER_REVIEW') updated.reviewerId = user.id;
    if (next === 'QUALITY_REVIEW') updated.qualityControllerId = user.id;
    if (next === 'FINALIZED' || next === 'APPROVED') updated.examControllerId = user.id;
    paperStore = paperStore.map(item => item.id === id ? updated : item);
    notifyListeners(); this.recordAudit(`${next.replace(/_/g, ' ')} paper ${id}`, user);
    const notice = ({ SUBMITTED: 'Paper submitted', CHANGES_REQUESTED: 'Changes requested', APPROVED: 'Paper approved', QUALITY_APPROVED: 'Quality approved', PENDING_FINAL_APPROVAL: 'Final approval requested', FINALIZED: 'Paper finalized', PUBLISHED: 'Paper published' } as Partial<Record<PaperStatus, string>>)[next];
    if (notice) updateDemoState(state => ({ ...state, notifications: [{ id: `notif-${Date.now()}`, title: notice, message: `${updated.title || updated.subjectName} (${id}) is now ${next.replace(/_/g, ' ').toLowerCase()}.`, read: false }, ...state.notifications] }));
    return updated;
  },

  updateWorkflowPaper(id: string, changes: Partial<PreviousPaper>, user: User) {
    const paper = paperStore.find(item => item.id === id);
    if (!paper || !['DRAFT', 'CHANGES_REQUESTED'].includes(paper.workflowStatus || 'DRAFT') || (!permissionService.hasPermission(user, 'system.manage') && paper.createdBy !== user.name) || !permissionService.hasPermission(user, 'paper.update') || !permissionService.canAccessResource(user, { departmentId: paper.departmentId, subjectId: paper.subjectId })) return undefined;
    const version = (paper.version || 1) + 1;
    const updated = { ...paper, ...changes, workflowStatus: 'DRAFT' as PaperStatus, status: 'draft' as const, version, updatedAt: new Date().toISOString(), history: [...(paper.history || []), { version, changedBy: user.name, changedAt: new Date().toISOString(), summary: 'Updated paper content' }] };
    paperStore = paperStore.map(item => item.id === id ? updated : item); notifyListeners(); this.recordAudit(`Updated paper ${id} v${version}`, user); return updated;
  },

  recordAudit(action: string, user: User) {
    const eventAction = action.startsWith('Created paper') ? 'PAPER_CREATED' : action.startsWith('Updated paper') ? 'PAPER_UPDATED' : action.startsWith('SUBMITTED paper') ? 'PAPER_SUBMITTED' : action.startsWith('UNDER_REVIEW paper') ? 'PAPER_REVIEWED' : action.startsWith('CHANGES_REQUESTED paper') ? 'PAPER_CHANGES_REQUESTED' : action.startsWith('QUALITY_APPROVED paper') ? 'PAPER_QUALITY_APPROVED' : action.startsWith('APPROVED paper') ? 'PAPER_APPROVED' : action.startsWith('FINALIZED paper') ? 'PAPER_FINALIZED' : action.startsWith('PUBLISHED paper') ? 'PAPER_PUBLISHED' : action;
    auditService.record({ action:eventAction, user, resource: 'paper', resourceId: action.match(/QP[^ ]*/)?.[0], description: action, severity: /FINALIZED|PUBLISHED/.test(action) ? 'CRITICAL' : 'INFO' });
  },

  duplicatePaperAsNewDraft(paperId: string, user: User): PreviousPaper | undefined {
    const original = paperStore.find(p => p.id === paperId);
    if (!original) return undefined;

    const randomSuffix = Math.floor(14 + Math.random() * 85);
    const newId = `QP-2026-${randomSuffix.toString().padStart(3, '0')}`;
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const newDraft: PreviousPaper = {
      ...original,
      id: newId,
      academicYear: '2026-27',
      generatedAt: now,
      status: 'draft',
      createdBy: user.name,
      sections: original.sections ? JSON.parse(JSON.stringify(original.sections)) : []
    };

    paperStore.unshift(newDraft);
    notifyListeners();
    return newDraft;
  },

  createPaper(paper: PreviousPaper) {
    paperStore.unshift(paper);
    notifyListeners();
  },

  resetDefaults() {
    paperStore = [...initialPreviousPapers];
    notifyListeners();
  }
};
