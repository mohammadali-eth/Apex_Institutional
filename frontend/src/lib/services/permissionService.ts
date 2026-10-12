import { User, Question } from '@/types';
import { permissionService } from '@/lib/permissions/permissionService';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  willCreateNewVersion?: boolean;
}

/**
 * Checks if a user is permitted to edit a specific question.
 * Requirements #2 & #25:
 * - Teacher can edit questions they created or within their department scope.
 * - Teacher CANNOT edit questions outside their department scope.
 * - Approved questions trigger versioning workflow (Requirement #5).
 */
export function canUserEditQuestion(user: User, question: Question): PermissionCheckResult {
  if (!permissionService.hasAnyPermission(user, ['question.update', 'question.create']) || !permissionService.canAccessResource(user, { departmentId: question.departmentId, subjectId: question.subjectId })) {
    return {
      allowed: false,
      reason: `Unauthorized: Question belongs to ${question.departmentId === 'dept-cs' ? 'Computer Science' : 'Electrical Engineering'} department. You are in ${user.departmentName}.`,
    };
  }

  // 2. Archived questions cannot be directly edited
  if (question.status === 'Archived') {
    return {
      allowed: false,
      reason: 'This question is archived and cannot be edited directly. Duplicate it as a draft instead.',
    };
  }

  // 3. Approved question: allows editing but creates a new draft version
  if (question.status === 'Approved') {
    return {
      allowed: true,
      willCreateNewVersion: true,
      reason: 'Editing this approved question will create a new Draft Version (v' + (question.version + 1) + ') for review.',
    };
  }

  // 4. Submitted question (under review)
  if (question.status === 'Submitted') {
    // HOD or author can retract/edit
    if (user.role === 'department_admin' || question.createdBy === user.name) {
      return {
        allowed: true,
        reason: 'Editing a submitted question will return it to Draft status.',
      };
    }
    return {
      allowed: false,
      reason: 'Question is currently under review by the department reviewer.',
    };
  }

  // 5. Draft or Rejected question
  return {
    allowed: true,
  };
}

export function canUserReviewQuestion(user: User, question: Question): boolean {
  return permissionService.hasPermission(user, 'question.approve') && permissionService.canAccessResource(user, { departmentId: question.departmentId, subjectId: question.subjectId });
}
