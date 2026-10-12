import {
  mockInstitutions,
  mockUniversities,
  mockDepartments,
  mockPrograms,
  mockSubjects,
  mockUsers,
  mockUnits,
  mockChapters,
  mockTopics,
} from '@/data/academicData';
import {
  User,
  Institution,
  Department,
  Program,
  Subject,
  Unit,
  Chapter,
  Question,
  PreviousPaper,
  Exam,
  Topic,
  University,
  QuestionBank,
  Material,
  AuditEvent,
  Notification,
  PermissionName,
} from '@/types';
import { ROLE_DEFINITIONS } from '@/lib/permissions/rolePermissions';
import { initialQuestions } from '@/data/questionData';
import { initialPreviousPapers } from '@/data/previousPaperData';

export type DemoState = {
  activeUserId: string | null;
  activeDepartmentId: string | null;
  locale: string;
  institutions: Institution[];
  departments: Department[];
  programs: Program[];
  subjects: Subject[];
  units: Unit[];
  chapters: Chapter[];
  users: User[];
  questions: Question[];
  papers: PreviousPaper[];
  exams: Exam[];
  universities: University[];
  topics: Topic[];
  questionBanks: QuestionBank[];
  materials: Material[];
  roles: typeof ROLE_DEFINITIONS;
  permissions: PermissionName[];
  auditEvents: AuditEvent[];
  notifications: Notification[];
};

const STORAGE_KEY = 'qpms_demo_state_v1';

const defaultState: DemoState = {
  activeUserId: null,
  activeDepartmentId: null,
  locale: 'en',
  institutions: [...mockInstitutions],
  departments: [...mockDepartments],
  programs: [...mockPrograms],
  subjects: [...mockSubjects],
  units: [...mockUnits],
  chapters: [...mockChapters],
  users: [...mockUsers],
  questions: [...initialQuestions],
  papers: [...initialPreviousPapers],
  exams: [{ id: 'exam-midterm', name: 'Mid-Semester Examination 2026', code: 'MID-2026', academicYear: '2026-27', semester: '3', institutionId: 'inst-apex', departmentId: 'dept-cs', departmentIds: ['dept-cs'], startDate: '2026-10-12', endDate: '2026-10-20', status: 'SCHEDULED', coordinatorIds: ['u-rajesh'], controllerId: 'u-controller' }],
  universities: [...mockUniversities],
  topics: [...mockTopics],
  questionBanks: mockSubjects.map(subject => ({ id: `bank-${subject.id}`, name: `${subject.name} Question Bank`, subjectId: subject.id })),
  materials: [],
  roles: ROLE_DEFINITIONS,
  permissions: [...ROLE_DEFINITIONS.super_admin.permissions],
  auditEvents: [
    { id: 'aud-101', action: 'Question Q-1024 edited', actorId: 'u-rahul', occurredAt: '2026-03-12T14:32:00' },
    { id: 'aud-102', action: 'Approved Question Q-1024 v3', actorId: 'u-sunita', occurredAt: '2026-03-12T11:20:00' },
  ],
  notifications: [{ id: 'notif-approval-queue', title: 'Approval queue', message: 'Review submitted examination papers.', read: false }],
};

const readStorage = (): Storage | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
};

export const loadDemoState = (): DemoState => {
  const storage = readStorage();
  if (!storage) return { ...defaultState };

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultState };
    }

    const parsed = JSON.parse(raw) as Partial<DemoState>;
    const institutions = Array.isArray(parsed.institutions) && parsed.institutions.length ? parsed.institutions : [...mockInstitutions];
    const subjects = Array.isArray(parsed.subjects) && parsed.subjects.length ? parsed.subjects : [...mockSubjects];
    const rawUsers = Array.isArray(parsed.users) && parsed.users.length ? parsed.users : [...mockUsers];
    const rawExams = Array.isArray(parsed.exams) ? parsed.exams : defaultState.exams;
    const exams = rawExams.map(exam => exam.id === 'exam-midterm' ? { ...defaultState.exams[0], ...exam, code: exam.code || 'MID-2026', academicYear: exam.academicYear || '2026-27', semester: exam.semester || '3', departmentIds: exam.departmentIds || ['dept-cs'], status: exam.status || 'SCHEDULED', coordinatorIds: exam.coordinatorIds || ['u-rajesh'], controllerId: exam.controllerId || 'u-controller' } : exam);
    const users = rawUsers.map(user => {
      const departmentIds = user.departmentIds?.length ? user.departmentIds : user.assignedDepartments.map(department => department.id);
      const validSubjectIds = (user.subjectIds || []).filter(id => subjects.some(subject => subject.id === id));
      const institution = institutions.find(item => item.id === user.institutionId);
      return { ...user, departmentIds, subjectIds: validSubjectIds.length ? validSubjectIds : subjects.filter(subject => departmentIds.includes(subject.departmentId)).map(subject => subject.id), examIds: user.examIds?.length ? user.examIds : user.role==='student'?['exam-midterm']:[], universityId: user.universityId === 'univ-apex' ? 'uni-apex' : (user.universityId || institution?.universityId) };
    });
    return {
      activeUserId: typeof parsed.activeUserId === 'string' ? parsed.activeUserId : null,
      activeDepartmentId: typeof parsed.activeDepartmentId === 'string' ? parsed.activeDepartmentId : null,
      locale: typeof parsed.locale === 'string' ? parsed.locale : 'en',
      institutions,
      departments: Array.isArray(parsed.departments) && parsed.departments.length ? parsed.departments : [...mockDepartments],
      programs: Array.isArray(parsed.programs) && parsed.programs.length ? parsed.programs : [...mockPrograms],
      subjects,
      units: Array.isArray(parsed.units) && parsed.units.length ? parsed.units : [...mockUnits],
      chapters: Array.isArray(parsed.chapters) && parsed.chapters.length ? parsed.chapters : [...mockChapters],
      users,
      questions: Array.isArray(parsed.questions) && parsed.questions.length ? parsed.questions : [...initialQuestions],
      papers: Array.isArray(parsed.papers) ? parsed.papers : [...initialPreviousPapers],
      exams,
      universities: Array.isArray(parsed.universities) && parsed.universities.length ? parsed.universities : [...mockUniversities],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [...mockTopics],
      questionBanks: Array.isArray(parsed.questionBanks) ? parsed.questionBanks : defaultState.questionBanks,
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      roles: parsed.roles || ROLE_DEFINITIONS,
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : defaultState.permissions,
      auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents : defaultState.auditEvents,
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : defaultState.notifications,
    };
  } catch (error) {
    console.error('Failed to parse demo state:', error);
    return { ...defaultState };
  }
};

export const saveDemoState = (state: DemoState) => {
  const storage = readStorage();
  if (!storage) return state;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('qpms_demo_state_updated'));
    return state;
  } catch (error) {
    console.error('Failed to persist demo state:', error);
    return state;
  }
};

export const updateDemoState = (updater: (state: DemoState) => DemoState) => {
  const next = updater(loadDemoState());
  return saveDemoState(next);
};

export const resetDemoState = () => {
  const next = { ...defaultState };
  return saveDemoState(next);
};

export const getDemoUser = (userId: string | null) => {
  if (!userId) return null;
  return loadDemoState().users.find(user => user.id === userId) || null;
};

export const getDemoDepartment = (departmentId: string | null) => {
  if (!departmentId) return null;
  return loadDemoState().departments.find(dept => dept.id === departmentId) || null;
};
