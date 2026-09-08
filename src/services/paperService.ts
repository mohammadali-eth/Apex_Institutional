import { PreviousPaper, PreviousPaperQuery, User } from '../types';
import { initialPreviousPapers } from '../mock/previousPaperData';

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
  listeners.forEach(fn => fn());
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
