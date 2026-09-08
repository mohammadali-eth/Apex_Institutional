import { Institution, Department, Program, Subject } from '../types';
import { mockInstitutions, mockDepartments, mockPrograms, mockSubjects } from '../mock/academicData';

const DEPTS_STORAGE_KEY = 'qpms_departments_store';

const getStoredDepartments = (): Department[] => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(DEPTS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored departments:', e);
    }
  }
  return [...mockDepartments];
};

let institutionsStore = [...mockInstitutions];
let departmentsStore: Department[] = getStoredDepartments();
let programsStore = [...mockPrograms];
let subjectsStore = [...mockSubjects];

const saveDepartments = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(DEPTS_STORAGE_KEY, JSON.stringify(departmentsStore));
      window.dispatchEvent(new Event('qpms_academic_updated'));
    } catch (e) {
      console.error('Failed to persist departments:', e);
    }
  }
};

export interface CreateDepartmentDTO {
  name: string;
  code: string;
  institutionId?: string;
  hodName?: string;
  status?: 'active' | 'inactive';
}

export const academicService = {
  getInstitutions(): Institution[] {
    return [...institutionsStore];
  },

  getDepartments(institutionId?: string): Department[] {
    if (institutionId) return departmentsStore.filter(d => d.institutionId === institutionId);
    return [...departmentsStore];
  },

  addDepartment(dto: CreateDepartmentDTO): Department {
    const instId = dto.institutionId || institutionsStore[0]?.id || 'inst-apex';
    const newDept: Department = {
      id: `dept-${dto.code.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now().toString(36)}`,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      institutionId: instId,
      hodName: dto.hodName?.trim() || 'Pending Assignment',
      status: dto.status || 'active',
    };

    departmentsStore = [...departmentsStore, newDept];
    saveDepartments();
    return newDept;
  },

  getPrograms(departmentId?: string): Program[] {
    if (departmentId) return programsStore.filter(p => p.departmentId === departmentId);
    return [...programsStore];
  },

  getSubjects(departmentId?: string, programId?: string): Subject[] {
    let list = [...subjectsStore];
    if (departmentId) list = list.filter(s => s.departmentId === departmentId);
    if (programId) list = list.filter(s => s.programId === programId);
    return list;
  }
};
