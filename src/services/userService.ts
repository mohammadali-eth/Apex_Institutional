import { User, UserRole, AssignedDepartment } from '../types';
import { mockUsers } from '../mock/academicData';
import { academicService } from './academicService';
import { loadDemoState, saveDemoState } from '../store/demoState';

const getStoredUsers = (): User[] => {
  const state = loadDemoState();
  return [...state.users];
};

let usersStore: User[] = getStoredUsers();

const saveUsers = () => {
  const state = loadDemoState();
  state.users = usersStore;
  saveDemoState(state);
  window.dispatchEvent(new Event('qpms_users_updated'));
};

export interface CreateUserDTO {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  institutionId?: string;
  departmentIds: string[];
}

export const userService = {
  getUsers(): User[] {
    return [...usersStore];
  },

  getUserById(id: string): User | undefined {
    return usersStore.find(u => u.id === id);
  },

  createUser(dto: CreateUserDTO): User {
    const allInstitutions = academicService.getInstitutions();
    const instId = dto.institutionId || allInstitutions[0]?.id || 'inst-apex';
    const inst = allInstitutions.find(i => i.id === instId);
    const instName = inst?.name || 'Apex Institute of Technology & Science';

    const allDepts = academicService.getDepartments();
    const assignedDepartments: AssignedDepartment[] = dto.departmentIds
      .map(dId => {
        const d = allDepts.find(dept => dept.id === dId);
        if (!d) return null;
        return {
          id: d.id,
          name: d.name,
          code: d.code,
          institutionId: d.institutionId || instId,
          institutionName: instName,
          programCount: academicService.getPrograms(d.id).length || 1,
          subjectCount: academicService.getSubjects(d.id).length || 2,
        };
      })
      .filter((d): d is AssignedDepartment => d !== null);

    const primaryDept = assignedDepartments[0];

    const newUser: User = {
      id: `u-${Date.now().toString(36)}`,
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      role: dto.role,
      institutionId: instId,
      institutionName: instName,
      departmentId: primaryDept?.id,
      departmentName: primaryDept?.name,
      assignedDepartments,
    };

    usersStore = [newUser, ...usersStore];
    saveUsers();
    return newUser;
  },

  getUsersByDepartment(departmentId: string): User[] {
    return usersStore.filter(u =>
      u.assignedDepartments.some(d => d.id === departmentId) || u.departmentId === departmentId
    );
  }
};
