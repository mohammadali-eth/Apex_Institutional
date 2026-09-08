import { Question, QuestionVersion, User } from '../types';
import { initialQuestions } from '../mock/questionData';

const STORAGE_KEY = 'qpms_questions_v1';

function getStoredQuestions(): Question[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch (e) {
    console.error('Failed to read from localStorage', e);
  }
  return [...initialQuestions];
}

function saveStoredQuestions(questions: Question[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    }
  } catch (e) {
    console.error('Failed to write to localStorage', e);
  }
}

let questionStore: Question[] = getStoredQuestions();
const listeners: Array<() => void> = [];

function notifyListeners() {
  saveStoredQuestions(questionStore);
  listeners.forEach(fn => fn());
}

export const questionService = {
  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  getAllQuestions(): Question[] {
    return [...questionStore];
  },

  getQuestionsByDepartment(departmentId: string): Question[] {
    return questionStore.filter(q => q.departmentId === departmentId);
  },

  getQuestionById(id: string): Question | undefined {
    return questionStore.find(q => q.id === id);
  },

  saveQuestion(questionData: Question, user: User, submitImmediately = false): { question: Question; isNewVersion: boolean } {
    const existingIndex = questionStore.findIndex(q => q.id === questionData.id);
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    if (existingIndex !== -1) {
      const existing = questionStore[existingIndex];

      // If existing question is Approved, create a New Draft Version (Requirement #5)
      if (existing.status === 'Approved') {
        const newVersionNumber = existing.version + 1;
        const newVersionHistory: QuestionVersion[] = [
          {
            version: newVersionNumber,
            editedBy: user.name,
            editedAt: now,
            status: submitImmediately ? 'Submitted' : 'Draft',
            text: questionData.text,
            marks: questionData.marks,
            difficulty: questionData.difficulty,
            answer: questionData.answer,
            options: questionData.options,
            correctAnswer: questionData.correctAnswer,
            comments: submitImmediately ? 'Submitted updated version for review' : 'Draft revision of approved question',
          },
          ...existing.versionHistory
        ];

        const updated: Question = {
          ...questionData,
          version: newVersionNumber,
          status: submitImmediately ? 'Submitted' : 'Draft',
          updatedBy: user.name,
          updatedAt: now,
          versionHistory: newVersionHistory,
        };

        questionStore[existingIndex] = updated;
        notifyListeners();
        return { question: updated, isNewVersion: true };
      }

      // If existing question was Draft or Submitted or Rejected, update it
      const currentHistory = [...(existing.versionHistory || [])];
      if (currentHistory.length > 0) {
        currentHistory[0] = {
          ...currentHistory[0],
          text: questionData.text,
          marks: questionData.marks,
          difficulty: questionData.difficulty,
          answer: questionData.answer,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          editedBy: user.name,
          editedAt: now,
          status: submitImmediately ? 'Submitted' : 'Draft',
        };
      }

      const updated: Question = {
        ...questionData,
        status: submitImmediately ? 'Submitted' : 'Draft',
        updatedBy: user.name,
        updatedAt: now,
        versionHistory: currentHistory,
      };

      questionStore[existingIndex] = updated;
      notifyListeners();
      return { question: updated, isNewVersion: false };
    }

    // Creating a brand new question
    const newVersionNumber = 1;
    const newQuestion: Question = {
      ...questionData,
      version: newVersionNumber,
      status: submitImmediately ? 'Submitted' : 'Draft',
      createdBy: user.name,
      createdAt: now,
      versionHistory: [
        {
          version: 1,
          editedBy: user.name,
          editedAt: now,
          status: submitImmediately ? 'Submitted' : 'Draft',
          text: questionData.text,
          marks: questionData.marks,
          difficulty: questionData.difficulty,
          answer: questionData.answer,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          comments: 'Initial creation',
        }
      ]
    };

    questionStore.unshift(newQuestion);
    notifyListeners();
    return { question: newQuestion, isNewVersion: false };
  },

  submitForReview(id: string, user: User) {
    const q = questionStore.find(item => item.id === id);
    if (!q) return;
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    q.status = 'Submitted';
    q.updatedBy = user.name;
    q.updatedAt = now;
    if (q.versionHistory && q.versionHistory.length > 0) {
      q.versionHistory[0].status = 'Submitted';
      q.versionHistory[0].editedAt = now;
      q.versionHistory[0].editedBy = user.name;
    }
    notifyListeners();
  },

  approveQuestion(id: string, user: User) {
    const q = questionStore.find(item => item.id === id);
    if (!q) return;
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    q.status = 'Approved';
    q.approvedBy = user.name;
    q.approvedAt = now;
    if (q.versionHistory && q.versionHistory.length > 0) {
      q.versionHistory[0].status = 'Approved';
      q.versionHistory[0].editedAt = now;
    }
    notifyListeners();
  },

  rejectQuestion(id: string, user: User, reason: string) {
    const q = questionStore.find(item => item.id === id);
    if (!q) return;
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    q.status = 'Rejected';
    if (q.versionHistory && q.versionHistory.length > 0) {
      q.versionHistory[0].status = 'Rejected';
      q.versionHistory[0].comments = `Rejected by ${user.name}: ${reason}`;
      q.versionHistory[0].editedAt = now;
    }
    notifyListeners();
  },

  duplicateQuestion(id: string, user: User): Question | undefined {
    const original = questionStore.find(q => q.id === id);
    if (!original) return undefined;

    const nextNumber = Math.floor(1030 + Math.random() * 8900);
    const newId = `Q-${nextNumber}`;
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const copy: Question = {
      ...original,
      id: newId,
      status: 'Draft',
      version: 1,
      createdBy: user.name,
      createdAt: now,
      updatedBy: undefined,
      updatedAt: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
      versionHistory: [
        {
          version: 1,
          editedBy: user.name,
          editedAt: now,
          status: 'Draft',
          text: original.text,
          marks: original.marks,
          difficulty: original.difficulty,
          answer: original.answer,
          options: original.options ? [...original.options] : undefined,
          correctAnswer: original.correctAnswer,
          comments: `Duplicated from ${original.id} (v${original.version})`,
        }
      ]
    };

    questionStore.unshift(copy);
    notifyListeners();
    return copy;
  },

  archiveQuestion(id: string) {
    const q = questionStore.find(item => item.id === id);
    if (!q) return;
    q.status = 'Archived';
    notifyListeners();
  },

  resetDefaults() {
    questionStore = [...initialQuestions];
    notifyListeners();
  }
};
