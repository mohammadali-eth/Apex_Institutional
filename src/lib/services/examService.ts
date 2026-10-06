import { Examination, User } from '@/types';
import { loadDemoState, updateDemoState } from '@/data/demoState';
import { permissionService } from '@/lib/permissions/permissionService';
import { auditService } from '@/lib/services/auditService';

export const examService = {
  getExams(user?: User | null) {
    const exams = loadDemoState().exams;
    if (!user) return [];
    return exams.filter(exam => {
      const departmentIds = exam.departmentIds || (exam.departmentId ? [exam.departmentId] : []);
      const scopeOk = !departmentIds.length || departmentIds.some(id => permissionService.hasDepartmentAccess(user, id));
      if (!scopeOk || !permissionService.hasPermission(user, 'exam.view')) return false;
      if (['exam_coordinator', 'exam_controller'].includes(user.role)) return (exam.coordinatorIds || []).includes(user.id) || exam.controllerId === user.id || (user.examIds || []).includes(exam.id);
      return true;
    });
  },
  create(exam: Examination, user: User) {
    if (user.role==='exam_coordinator'||user.role==='exam_controller'||!permissionService.hasPermission(user, 'exam.create') || !(exam.departmentIds || []).every(id => permissionService.hasDepartmentAccess(user, id))) return undefined;
    updateDemoState(state => ({ ...state, exams: [exam, ...state.exams] }));
    auditService.record({ action: 'EXAM_CREATED', user, resource: 'exam', resourceId: exam.id, description: `Created examination ${exam.name}` });
    return exam;
  },
  update(id: string, changes: Partial<Examination>, user: User) {
    const existing = loadDemoState().exams.find(exam => exam.id === id);
    if (!existing || !permissionService.hasPermission(user, 'exam.update') || !permissionService.hasDepartmentAccess(user, existing.departmentId) || user.role==='exam_coordinator'&&!(existing.coordinatorIds||[]).includes(user.id)) return undefined;
    const updated = { ...existing, ...changes };
    updateDemoState(state => ({ ...state, exams: state.exams.map(exam => exam.id === id ? updated : exam) }));
    auditService.record({ action: 'EXAM_UPDATED', user, resource: 'exam', resourceId: id, description: `Updated examination ${updated.name}` });
    return updated;
  },
};
