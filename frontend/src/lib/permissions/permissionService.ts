import { User, Question, PreviousPaper, PermissionName, UserRole } from '../../types';
import { ROLE_DEFINITIONS } from './rolePermissions';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  willCreateNewVersion?: boolean;
}

const normalizeRole = (role?: UserRole | string): UserRole | null => role && role in ROLE_DEFINITIONS ? role as UserRole : null;

export const permissionService = {
  hasRole(user: User | null, role: UserRole | string): boolean {
    if (!user) return false;
    return normalizeRole(user.role) === normalizeRole(role);
  },

  hasPermission(user: User | null, permission: PermissionName): boolean {
    if (!user) return false;
    const normalized = normalizeRole(user.role);
    if (!normalized) return false;
    return user.permissions?.includes(permission) ?? ROLE_DEFINITIONS[normalized]?.permissions.includes(permission) ?? false;
  },

  hasAnyPermission(user: User | null, permissions: PermissionName[]): boolean {
    return !!user && permissions.some(permission => this.hasPermission(user, permission));
  },

  hasAllPermissions(user: User | null, permissions: PermissionName[]): boolean {
    return !!user && permissions.every(permission => this.hasPermission(user, permission));
  },

  hasDepartmentAccess(user: User | null, departmentId?: string): boolean {
    if (!user || !departmentId) return !!user;
    if (this.hasPermission(user, 'system.manage')) return true;
    if (user.departmentIds?.length) return user.departmentIds.includes(departmentId);
    if (user.assignedDepartments?.length) {
      return user.assignedDepartments.some(item => item.id === departmentId) || user.departmentId === departmentId;
    }
    return user.departmentId === departmentId;
  },

  hasSubjectAccess(user: User | null, subjectId?: string): boolean {
    if (!user || !subjectId) return !!user;
    if (this.hasPermission(user, 'system.manage')) return true;
    if (user.subjectIds?.length) return user.subjectIds.includes(subjectId);
    return false;
  },

  hasExamAccess(user: User | null, examId?: string): boolean {
    if (!user || !examId) return !!user;
    if (this.hasPermission(user, 'system.manage')) return true;
    if (user.examIds?.length) return user.examIds.includes(examId);
    return this.hasDepartmentAccess(user, user.departmentId || undefined);
  },

  canAccessResource(user: User | null, resource: { departmentId?: string; subjectId?: string; examId?: string }): boolean {
    if (!user) return false;
    if (this.hasPermission(user, 'system.manage')) return true;
    if (resource.departmentId && !this.hasDepartmentAccess(user, resource.departmentId)) return false;
    if (resource.subjectId && !this.hasSubjectAccess(user, resource.subjectId)) return false;
    if (resource.examId && !this.hasExamAccess(user, resource.examId)) return false;
    return true;
  },

  canViewQuestions(user: User | null): boolean {
    return this.hasPermission(user, 'question.view') || this.hasPermission(user, 'question_bank.view');
  },

  canCreateQuestion(user: User | null): boolean {
    return this.hasPermission(user, 'question.create');
  },

  canEditQuestion(user: User | null, question: Question): PermissionCheckResult {
    if (!user) {
      return { allowed: false, reason: 'Authentication required.' };
    }

    if (this.hasPermission(user, 'system.manage') || this.hasPermission(user, 'user.update')) {
      return { allowed: true };
    }

    if (user.departmentId && user.departmentId !== question.departmentId) {
      return {
        allowed: false,
        reason: `Unauthorized: Question belongs to another department. Your active department is ${user.departmentName || user.departmentId}.`,
      };
    }

    if (question.status === 'Archived') {
      return {
        allowed: false,
        reason: 'Archived questions cannot be edited directly. Please duplicate as a new draft.',
      };
    }

    if (question.status === 'Approved') {
      return {
        allowed: true,
        willCreateNewVersion: true,
        reason: `Editing this approved question will create a new Draft Version (v${question.version + 1}) for review.`,
      };
    }

    if (question.status === 'Submitted') {
      if (this.hasPermission(user, 'question.approve') || question.createdBy === user.name) {
        return { allowed: true, reason: 'Editing will return the submitted question to draft status.' };
      }
      return {
        allowed: false,
        reason: 'Question is currently under review by the department reviewer.',
      };
    }

    return { allowed: true };
  },

  canApproveQuestion(user: User | null, question: Question): boolean {
    if (!user) return false;
    if (user.departmentId && user.departmentId !== question.departmentId) return false;
    return this.hasPermission(user, 'question.approve') || this.hasPermission(user, 'paper.approve');
  },

  canGeneratePaper(user: User | null): boolean {
    return this.hasAnyPermission(user, ['paper.create', 'paper.update', 'paper.submit']);
  },

  canApprovePaper(user: User | null, paper?: PreviousPaper): boolean {
    if (!user) return false;
    if (paper && user.departmentId && user.departmentId !== paper.departmentId) return false;
    return this.hasPermission(user, 'paper.approve') || this.hasPermission(user, 'paper.finalize');
  },

  canManageAcademicStructure(user: User | null): boolean {
    return this.hasAnyPermission(user, ['system.manage', 'user.update', 'user.create']);
  },

  canUploadMaterials(user: User | null): boolean {
    return this.hasPermission(user, 'question.create') || this.hasPermission(user, 'question.update');
  }
};
