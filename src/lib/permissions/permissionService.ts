import { User, Question, PreviousPaper } from '../../types';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  willCreateNewVersion?: boolean;
}

export const permissionService = {
  canViewQuestions(user: User | null): boolean {
    return !!user && (user.role === 'teacher' || user.role === 'hod' || user.role === 'coordinator' || user.role === 'institution_admin' || user.role === 'university_admin');
  },

  canCreateQuestion(user: User | null): boolean {
    return !!user && (user.role === 'teacher' || user.role === 'hod' || user.role === 'coordinator');
  },

  canEditQuestion(user: User | null, question: Question): PermissionCheckResult {
    if (!user) {
      return { allowed: false, reason: 'Authentication required.' };
    }

    // Admins have broad access
    if (user.role === 'university_admin' || user.role === 'institution_admin') {
      return { allowed: true };
    }

    // Department isolation check (Requirement #7)
    if (user.departmentId && user.departmentId !== question.departmentId) {
      return {
        allowed: false,
        reason: `Unauthorized: Question belongs to another department. Your active department is ${user.departmentName || user.departmentId}.`,
      };
    }

    // Archived questions
    if (question.status === 'Archived') {
      return {
        allowed: false,
        reason: 'Archived questions cannot be edited directly. Please duplicate as a new draft.',
      };
    }

    // Approved questions trigger version-aware branch (Requirement #18 & #19)
    if (question.status === 'Approved') {
      return {
        allowed: true,
        willCreateNewVersion: true,
        reason: `Editing this approved question will create a new Draft Version (v${question.version + 1}) for review.`,
      };
    }

    // Submitted question
    if (question.status === 'Submitted') {
      if (user.role === 'hod' || user.role === 'coordinator' || question.createdBy === user.name) {
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
    return user.role === 'hod' || user.role === 'coordinator' || user.role === 'institution_admin' || user.role === 'university_admin';
  },

  canGeneratePaper(user: User | null): boolean {
    return !!user && (user.role === 'teacher' || user.role === 'hod' || user.role === 'coordinator');
  },

  canApprovePaper(user: User | null, paper?: PreviousPaper): boolean {
    if (!user) return false;
    if (paper && user.departmentId && user.departmentId !== paper.departmentId) return false;
    return user.role === 'hod' || user.role === 'coordinator' || user.role === 'institution_admin' || user.role === 'university_admin';
  },

  canManageAcademicStructure(user: User | null): boolean {
    return !!user && (user.role === 'university_admin' || user.role === 'institution_admin' || user.role === 'hod');
  },

  canUploadMaterials(user: User | null): boolean {
    return !!user && (user.role === 'teacher' || user.role === 'hod');
  }
};
