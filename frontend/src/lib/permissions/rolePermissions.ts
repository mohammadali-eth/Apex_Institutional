import { PermissionName, RoleDefinition, UserRole } from '../../types';

export const PERMISSION_DEFINITIONS: Record<PermissionName, { label: string; category: string }> = {
  'user.view': { label: 'View users', category: 'USER' },
  'user.create': { label: 'Create users', category: 'USER' },
  'user.update': { label: 'Update users', category: 'USER' },
  'user.delete': { label: 'Delete users', category: 'USER' },
  'question.view': { label: 'View questions', category: 'QUESTION' },
  'question.create': { label: 'Create questions', category: 'QUESTION' },
  'question.update': { label: 'Update questions', category: 'QUESTION' },
  'question.delete': { label: 'Delete questions', category: 'QUESTION' },
  'question.approve': { label: 'Approve questions', category: 'QUESTION' },
  'question_bank.view': { label: 'View question bank', category: 'QUESTION_BANK' },
  'question_bank.manage': { label: 'Manage question bank', category: 'QUESTION_BANK' },
  'question_bank.archive': { label: 'Archive question bank items', category: 'QUESTION_BANK' },
  'paper.view': { label: 'View papers', category: 'PAPER' },
  'paper.create': { label: 'Create papers', category: 'PAPER' },
  'paper.update': { label: 'Update papers', category: 'PAPER' },
  'paper.submit': { label: 'Submit papers', category: 'PAPER' },
  'paper.review': { label: 'Review papers', category: 'PAPER' },
  'paper.approve': { label: 'Approve papers', category: 'PAPER' },
  'paper.finalize': { label: 'Finalize papers', category: 'PAPER' },
  'paper.publish': { label: 'Publish papers', category: 'PAPER' },
  'exam.view': { label: 'View exams', category: 'EXAM' },
  'exam.create': { label: 'Create exams', category: 'EXAM' },
  'exam.update': { label: 'Update exams', category: 'EXAM' },
  'exam.manage': { label: 'Manage exams', category: 'EXAM' },
  'report.view': { label: 'View reports', category: 'REPORT' },
  'audit.view': { label: 'View audit logs', category: 'AUDIT' },
  'system.manage': { label: 'Manage system', category: 'SYSTEM' },
};

const baseFacultyPermissions: PermissionName[] = [
  'question.view', 'question.create', 'question.update',
  'question_bank.view', 'question_bank.manage',
  'paper.view', 'paper.create', 'paper.update', 'paper.submit',
  'exam.view',
  'report.view',
];

const baseDepartmentAdminPermissions: PermissionName[] = [
  'user.view', 'user.create',
  'question.view', 'question.create', 'question.update', 'question.approve',
  'question_bank.view', 'question_bank.manage',
  'paper.view', 'paper.create', 'paper.update', 'paper.submit', 'paper.review', 'paper.approve', 'paper.finalize',
  'exam.view', 'exam.create', 'exam.update',
  'report.view',
];

const baseExamCoordinatorPermissions: PermissionName[] = [
  'question.view',
  'question_bank.view',
  'paper.view', 'paper.create', 'paper.update', 'paper.submit', 'paper.review', 'paper.approve',
  'exam.view', 'exam.create', 'exam.update', 'exam.manage',
  'report.view',
];

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  super_admin: {
    id: 'super_admin',
    label: 'Super Admin',
    permissions: Object.keys(PERMISSION_DEFINITIONS) as PermissionName[],
  },
  university_admin: {
    id: 'university_admin',
    label: 'University Admin',
    permissions: [
      'user.view', 'user.create', 'user.update', 'user.delete',
      'question.view', 'question.create', 'question.update', 'question.delete', 'question.approve',
      'question_bank.view', 'question_bank.manage', 'question_bank.archive',
      'paper.view', 'paper.create', 'paper.update', 'paper.submit', 'paper.review', 'paper.approve', 'paper.finalize', 'paper.publish',
      'exam.view', 'exam.create', 'exam.update', 'exam.manage',
      'report.view', 'audit.view', 'system.manage',
    ],
  },
  institution_admin: {
    id: 'institution_admin',
    label: 'Institution Admin',
    permissions: [
      'user.view', 'user.create', 'user.update',
      'question.view', 'question.create', 'question.update', 'question.delete', 'question.approve',
      'question_bank.view', 'question_bank.manage',
      'paper.view', 'paper.create', 'paper.update', 'paper.submit', 'paper.review', 'paper.approve', 'paper.finalize',
      'exam.view', 'exam.create', 'exam.update', 'exam.manage',
      'report.view', 'audit.view',
    ],
  },
  department_admin: {
    id: 'department_admin',
    label: 'Department Admin / HOD',
    permissions: baseDepartmentAdminPermissions,
  },
  faculty: {
    id: 'faculty',
    label: 'Faculty / Question Setter',
    permissions: baseFacultyPermissions,
  },
  question_paper_reviewer: {
    id: 'question_paper_reviewer',
    label: 'Question Paper Reviewer',
    permissions: [
      'question.view', 'question.approve',
      'question_bank.view',
      'paper.view', 'paper.review', 'paper.approve',
      'exam.view',
      'report.view',
    ],
  },
  exam_controller: {
    id: 'exam_controller',
    label: 'Exam Controller',
    permissions: [
      'question.view',
      'question_bank.view',
      'paper.view', 'paper.review', 'paper.approve', 'paper.finalize', 'paper.publish',
      'exam.view', 'exam.create', 'exam.update', 'exam.manage',
      'report.view', 'audit.view',
    ],
  },
  exam_coordinator: {
    id: 'exam_coordinator',
    label: 'Exam Coordinator',
    permissions: baseExamCoordinatorPermissions,
  },
  question_bank_manager: {
    id: 'question_bank_manager',
    label: 'Question Bank Manager',
    permissions: [
      'question.view', 'question.create', 'question.update', 'question.delete',
      'question_bank.view', 'question_bank.manage', 'question_bank.archive',
      'paper.view',
      'exam.view',
    ],
  },
  quality_controller: {
    id: 'quality_controller',
    label: 'Quality Controller / Moderator',
    permissions: [
      'question.view', 'question.approve',
      'question_bank.view', 'question_bank.manage',
      'paper.view', 'paper.review', 'paper.approve',
      'exam.view',
      'report.view',
    ],
  },
  student: {
    id: 'student',
    label: 'Student',
    permissions: ['question.view', 'paper.view', 'exam.view'],
  },
  viewer: {
    id: 'viewer',
    label: 'Viewer',
    permissions: ['question.view', 'paper.view', 'report.view'],
  },
  system_auditor: {
    id: 'system_auditor',
    label: 'System Auditor',
    permissions: ['user.view', 'question.view', 'paper.view', 'exam.view', 'report.view', 'audit.view'],
  },
  guest: {
    id: 'guest',
    label: 'Guest',
    permissions: [],
  },
};
