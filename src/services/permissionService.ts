import { User, Question } from '../types';

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
  // 1. Department isolation check
  if (user.departmentId !== question.departmentId) {
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
    if (user.role === 'hod' || question.createdBy === user.name) {
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
  if (user.departmentId && user.departmentId !== question.departmentId) return false;
  return user.role === 'hod' || user.role === 'coordinator' || user.role === 'institution_admin' || user.role === 'university_admin';
}
