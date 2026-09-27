import {
  mockInstitutions,
  mockDepartments,
  mockPrograms,
  mockSubjects,
  mockUsers,
  mockUnits,
  mockChapters,
} from '../mock/academicData';
import {
  User,
  Institution,
  Department,
  Program,
  Subject,
  Unit,
  Chapter,
} from '../types';

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
    return {
      activeUserId: typeof parsed.activeUserId === 'string' ? parsed.activeUserId : null,
      activeDepartmentId: typeof parsed.activeDepartmentId === 'string' ? parsed.activeDepartmentId : null,
      locale: typeof parsed.locale === 'string' ? parsed.locale : 'en',
      institutions: Array.isArray(parsed.institutions) && parsed.institutions.length ? parsed.institutions : [...mockInstitutions],
      departments: Array.isArray(parsed.departments) && parsed.departments.length ? parsed.departments : [...mockDepartments],
      programs: Array.isArray(parsed.programs) && parsed.programs.length ? parsed.programs : [...mockPrograms],
      subjects: Array.isArray(parsed.subjects) && parsed.subjects.length ? parsed.subjects : [...mockSubjects],
      units: Array.isArray(parsed.units) && parsed.units.length ? parsed.units : [...mockUnits],
      chapters: Array.isArray(parsed.chapters) && parsed.chapters.length ? parsed.chapters : [...mockChapters],
      users: Array.isArray(parsed.users) && parsed.users.length ? parsed.users : [...mockUsers],
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
