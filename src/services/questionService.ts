import { Question, QuestionVersion, User } from '../types';
import { initialQuestions } from '../mock/questionData';
import { loadDemoState, saveDemoState } from '../store/demoState';
import { mockSubjects, mockTopics } from '../mock/academicData';
import { auditService } from './auditService';

const STORAGE_KEY = 'qpms_questions_v1';

function getStoredQuestions(): Question[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Question[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read from localStorage', e);
  }
  const centralized = loadDemoState().questions;
  return centralized.length ? [...centralized] : [...initialQuestions];
}

const canonicalTypes: Record<string, Question['questionType']> = { mcq: 'MCQ', short: 'SHORT_ANSWER', short_answer: 'SHORT_ANSWER', long: 'LONG_ANSWER', long_answer: 'LONG_ANSWER', essay: 'ESSAY', numerical: 'NUMERICAL', descriptive: 'DESCRIPTIVE' };
const normalizeQuestion = (question: Question): Question => {
  const subject = mockSubjects.find(item => item.id === question.subjectId);
  const topic = question.topicId ? mockTopics.find(item => item.id === question.topicId) : mockTopics.find(item => item.unitId === question.unitId);
  return {
    ...question,
    questionText: question.questionText || question.text,
    isPublic: question.isPublic ?? question.id === 'Q-1025',
    questionType: question.questionType || canonicalTypes[String(question.type).toLowerCase()] || 'SHORT_ANSWER',
    universityId: question.universityId || 'univ-apex',
    institutionId: question.institutionId || subject?.institutionId || 'inst-apex',
    programId: question.programId || subject?.programId,
    topicId: question.topicId || topic?.id,
    topicName: question.topicName || topic?.name,
    bloomLevel: question.bloomLevel || 'UNDERSTAND',
    qualityStatus: question.status.toUpperCase().replace(/ /g, '_') as Question['qualityStatus'],
  };
};

function saveStoredQuestions(questions: Question[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    }
  } catch (e) {
    console.error('Failed to write to localStorage', e);
  }
}

let questionStore: Question[] = getStoredQuestions().map(normalizeQuestion);
const listeners: Array<() => void> = [];

function notifyListeners(changedQuestion = questionStore[0], action = 'QUESTION_UPDATED', actor?: User) {
  saveStoredQuestions(questionStore);
  const state = loadDemoState();
  state.questions = [...questionStore];
  const occurredAt = new Date().toISOString();
  const question = changedQuestion;
  if (question) {
    state.auditEvents = state.auditEvents.slice(0, 100);
    state.notifications = [{ id: `notification-${Date.now()}`, title: 'Question bank updated', message: `${question.id} is now ${question.status}.`, read: false }, ...state.notifications].slice(0, 100);
  }
  saveDemoState(state);
  if (question) auditService.record({ action, user: actor, resource: 'question', resourceId: question.id, description: `${action.replace(/_/g,' ')} · ${question.id} v${question.version}` });
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
    return questionStore.map(question => ({ ...question }));
  },

  getQuestionsByDepartment(departmentId: string): Question[] {
    return questionStore.filter(q => q.departmentId === departmentId).map(question => ({ ...question }));
  },

  getQuestionById(id: string): Question | undefined {
    const question = questionStore.find(q => q.id === id);
    return question ? { ...question } : undefined;
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
        notifyListeners(updated, submitImmediately ? 'QUESTION_SUBMITTED' : 'QUESTION_UPDATED', user);
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

      const updated: Question = normalizeQuestion({
        ...questionData,
        status: submitImmediately ? 'Submitted' : 'Draft',
        updatedBy: user.name,
        updatedAt: now,
        versionHistory: currentHistory,
      });

      questionStore[existingIndex] = updated;
      notifyListeners(updated, submitImmediately ? 'QUESTION_SUBMITTED' : 'QUESTION_UPDATED', user);
      return { question: updated, isNewVersion: false };
    }

    // Creating a brand new question
    const newVersionNumber = 1;
    const newQuestion: Question = normalizeQuestion({
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
    });

    questionStore.unshift(newQuestion);
    notifyListeners(newQuestion, submitImmediately ? 'QUESTION_SUBMITTED' : 'QUESTION_CREATED', user);
    return { question: newQuestion, isNewVersion: false };
  },

  submitForReview(id: string, user: User) {
    const q = questionStore.find(item => item.id === id);
    if (!q) return;
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    q.status = 'Submitted';
    q.qualityStatus = 'SUBMITTED';
    q.updatedBy = user.name;
    q.updatedAt = now;
    if (q.versionHistory && q.versionHistory.length > 0) {
      q.versionHistory[0].status = 'Submitted';
      q.versionHistory[0].editedAt = now;
      q.versionHistory[0].editedBy = user.name;
    }
    notifyListeners(q, 'QUESTION_SUBMITTED', user);
  },

  approveQuestion(id: string, user: User) {
    const q = questionStore.find(item => item.id === id);
    if (!q) return;
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    q.status = 'Approved';
    q.qualityStatus = 'APPROVED';
    q.approvedBy = user.name;
    q.approvedAt = now;
    if (q.versionHistory && q.versionHistory.length > 0) {
      q.versionHistory[0].status = 'Approved';
      q.versionHistory[0].editedAt = now;
    }
    notifyListeners(q, 'QUESTION_APPROVED', user);
  },

  rejectQuestion(id: string, user: User, reason: string) {
    const q = questionStore.find(item => item.id === id);
    if (!q) return;
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    q.status = 'Rejected';
    q.qualityStatus = 'REJECTED';
    if (q.versionHistory && q.versionHistory.length > 0) {
      q.versionHistory[0].status = 'Rejected';
      q.versionHistory[0].comments = `Rejected by ${user.name}: ${reason}`;
      q.versionHistory[0].editedAt = now;
    }
    notifyListeners(q, 'QUESTION_REJECTED', user);
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
    notifyListeners(copy, 'QUESTION_CREATED', user);
    return copy;
  },

  archiveQuestion(id: string, user?: User) {
    const q = questionStore.find(item => item.id === id);
    if (!q) return;
    q.status = 'Archived';
    q.qualityStatus = 'ARCHIVED';
    notifyListeners(q, 'QUESTION_ARCHIVED', user);
  },

  restoreQuestion(id: string, user?: User) {
    const q = questionStore.find(item => item.id === id);
    if (!q) return;
    q.status = 'Draft';
    q.qualityStatus = 'DRAFT';
    notifyListeners(q, 'QUESTION_RESTORED', user);
  },

  resetDefaults() {
    questionStore = [...initialQuestions].map(normalizeQuestion);
    notifyListeners();
  }
};
