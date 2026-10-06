import { User, UserRole, AssignedDepartment, PermissionName, Examination } from "@/types";
import { mockUsers } from "@/data/academicData";
import { academicService } from "./academicService";
import { loadDemoState, saveDemoState } from "@/data/demoState";
import { ROLE_DEFINITIONS } from "@/lib/permissions/rolePermissions";
import { auditService } from "./auditService";

const getStoredUsers = (): User[] => {
  const state = loadDemoState();
  return [...state.users];
};

let usersStore: User[] = getStoredUsers();

const saveUsers = () => {
  const state = loadDemoState();
  state.users = usersStore;
  saveDemoState(state);
  window.dispatchEvent(new Event("qpms_users_updated"));
};

export interface CreateUserDTO {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  institutionId?: string;
  departmentIds: string[];
  subjectIds?: string[];
  examIds?: string[];
  permissions?: PermissionName[];
}

export const userService = {
  getUsers(): User[] {
    return [...usersStore];
  },

  getUserById(id: string): User | undefined {
    return usersStore.find((u) => u.id === id);
  },

  createUser(
    dto: CreateUserDTO,
    actor?: User | null,
    verified = false,
  ): User | undefined {
    if (
      actor &&
      (!verified ||
        !actor.permissions?.includes("user.create") ||
        dto.departmentIds.some(
          (id) =>
            !actor.permissions?.includes("system.manage") &&
            !actor.departmentIds?.includes(id),
        ) ||
        (!actor.permissions?.includes("system.manage") &&
          dto.institutionId &&
          dto.institutionId !== actor.institutionId &&
          !actor.institutionIds?.includes(dto.institutionId)) ||
        dto.departmentIds.some(
          (id) =>
            academicService
              .getDepartments()
              .find((department) => department.id === id)?.institutionId &&
            academicService
              .getDepartments()
              .find((department) => department.id === id)?.institutionId !==
              dto.institutionId,
        ) ||
        (dto.subjectIds || []).some(
          (id) =>
            !dto.departmentIds.includes(
              academicService.getSubjects().find((subject) => subject.id === id)
                ?.departmentId || "",
            ),
        ) ||
        (dto.examIds || []).some(
          (id) =>
            !loadDemoState().exams.some(
              (exam: Examination) =>
                exam.id === id &&
                (!exam.departmentId ||
                  dto.departmentIds.includes(exam.departmentId)),
            ),
        ))
    )
      return undefined;
    const allInstitutions = academicService.getInstitutions();
    const instId = dto.institutionId || allInstitutions[0]?.id || "inst-apex";
    const inst = allInstitutions.find((i) => i.id === instId);
    const instName = inst?.name || "Apex Institute of Technology & Science";

    const allDepts = academicService.getDepartments();
    const assignedDepartments: AssignedDepartment[] = dto.departmentIds
      .map((dId) => {
        const d = allDepts.find((dept) => dept.id === dId);
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
      universityId: inst?.universityId || "uni-apex",
      institutionIds: [instId],
      departmentIds: assignedDepartments.map((department) => department.id),
      subjectIds: assignedDepartments.flatMap((department) =>
        academicService.getSubjects(department.id).map((subject) => subject.id),
      ),
      examIds: dto.examIds || [],
      permissions:
        dto.permissions ||
        loadDemoState().roles[dto.role]?.permissions ||
        ROLE_DEFINITIONS[dto.role].permissions,
      isActive: true,
    };

    usersStore = [newUser, ...usersStore];
    saveUsers();
    auditService.record({
      action: "USER_CREATED",
      user: actor,
      resource: "user",
      resourceId: newUser.id,
      description: `Created user ${newUser.name} with role ${newUser.role}`,
      severity: "WARNING",
    });
    return newUser;
  },

  updateUser(
    id: string,
    changes: Partial<User>,
    actor?: User | null,
    verified = false,
  ): User | undefined {
    const existing = usersStore.find((u) => u.id === id);
    if (!existing) return undefined;
    const escalatesRole = !!changes.role && changes.role !== existing.role;
    const addsPermissions =
      !!changes.permissions &&
      changes.permissions.some(
        (permission) => !existing.permissions?.includes(permission),
      );
    if (actor && (escalatesRole || addsPermissions) && !verified)
      return undefined;
    if (
      actor &&
      addsPermissions &&
      !actor.permissions?.includes("system.manage")
    )
      return undefined;
    const assignedDepartments =
      changes.departmentIds || existing.departmentIds || [];
    const assignedSubjects = changes.subjectIds || existing.subjectIds || [];
    const assignedExams = changes.examIds || existing.examIds || [];
    if (
      actor &&
      (!actor.permissions?.includes("user.update") ||
        actor.id === id ||
        (!actor.permissions?.includes("system.manage") &&
          (actor.institutionId !== existing.institutionId ||
            existing.departmentIds?.some(
              (dept) => !actor.departmentIds?.includes(dept),
            ) ||
            assignedDepartments.some(
              (dept) => !actor.departmentIds?.includes(dept),
            ) ||
            (changes.institutionId &&
              changes.institutionId !== actor.institutionId))) ||
        assignedSubjects.some(
          (subjectId) =>
            !assignedDepartments.includes(
              academicService
                .getSubjects()
                .find((subject) => subject.id === subjectId)?.departmentId ||
                "",
            ),
        ) ||
        assignedExams.some(
          (examId) =>
            !loadDemoState().exams.some(
              (exam: Examination) =>
                exam.id === examId &&
                (!(exam.departmentIds || []).length ||
                  (exam.departmentIds || []).some((dept: string) =>
                    assignedDepartments.includes(dept),
                  )),
            ),
        ))
    )
      return undefined;
    const nextRole = changes.role || existing.role;
    const next = {
      ...existing,
      ...changes,
      permissions:
        changes.permissions ||
        loadDemoState().roles[nextRole]?.permissions ||
        existing.permissions,
    };
    usersStore = usersStore.map((u) => (u.id === id ? next : u));
    saveUsers();
    if (changes.role && changes.role !== existing.role)
      auditService.record({
        action: "ROLE_CHANGED",
        user: actor,
        resource: "user",
        resourceId: id,
        description: `Changed ${existing.name}'s role from ${existing.role} to ${changes.role}`,
        severity: "CRITICAL",
      });
    if (changes.permissions)
      auditService.record({
        action: "PERMISSION_CHANGED",
        user: actor,
        resource: "user",
        resourceId: id,
        description: `Updated permissions for ${existing.name}`,
        severity: "CRITICAL",
      });
    return next;
  },

  setActive(
    id: string,
    active: boolean,
    actor?: User | null,
  ): User | undefined {
    if (
      actor &&
      (!actor.permissions?.includes("user.update") || actor.id === id)
    )
      return undefined;
    const updated = this.updateUser(id, { isActive: active }, actor);
    if (updated)
      auditService.record({
        action: active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        user: actor,
        resource: "user",
        resourceId: id,
        description: `${active ? "Activated" : "Deactivated"} ${updated.name}`,
        severity: "WARNING",
      });
    return updated;
  },

  updateProfile(
    id: string,
    changes: { name?: string; email?: string },
  ): User | undefined {
    const existing = usersStore.find((user) => user.id === id);
    if (!existing) return undefined;
    const name = changes.name?.trim() || existing.name;
    const email = changes.email?.trim().toLowerCase() || existing.email;
    if (!email.includes("@")) return undefined;
    const updated = { ...existing, name, email };
    usersStore = usersStore.map((user) => (user.id === id ? updated : user));
    saveUsers();
    auditService.record({
      action: "USER_PROFILE_UPDATED",
      user: updated,
      resource: "user",
      resourceId: id,
      description: `Updated profile for ${updated.name}`,
    });
    return updated;
  },

  applyRolePermissions(role: UserRole, permissions: PermissionName[]) {
    usersStore = usersStore.map((user) =>
      user.role === role ? { ...user, permissions: [...permissions] } : user,
    );
    saveUsers();
  },

  getUsersByDepartment(departmentId: string): User[] {
    return usersStore.filter(
      (u) =>
        u.assignedDepartments.some((d) => d.id === departmentId) ||
        u.departmentId === departmentId,
    );
  },
};
