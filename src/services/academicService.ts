import { Institution, Department, Program, Subject } from '../types';
import { mockInstitutions, mockDepartments, mockPrograms, mockSubjects } from '../mock/academicData';
import { loadDemoState, saveDemoState } from '../store/demoState';

const getStoredDepartments = (): Department[] => {
  const state = loadDemoState();
  return [...state.departments];
};

let institutionsStore = [...mockInstitutions];
let departmentsStore: Department[] = getStoredDepartments();
let programsStore = [...mockPrograms];
let subjectsStore = [...mockSubjects];

const saveDepartments = () => {
  const state = loadDemoState();
  state.departments = departmentsStore;
  saveDemoState(state);
  window.dispatchEvent(new Event('qpms_academic_updated'));
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
