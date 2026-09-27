import { PermissionName, UserRole } from '../types';
import { loadDemoState, updateDemoState } from '../store/demoState';
import { auditService } from './auditService';
import { User } from '../types';
import { userService } from './userService';

export const roleService = {
  updatePermissions(role: UserRole, permissions: PermissionName[], actor: User, verified = false) {
    if (!actor.permissions?.includes('system.manage') || actor.role === role) return false;
    const current=loadDemoState().roles[role]?.permissions||[];
    if(permissions.some(permission=>!current.includes(permission))&&!verified)return false;
    if (role === 'super_admin' && !permissions.includes('system.manage')) return false;
    const state = loadDemoState();
    const roleDef = state.roles[role];
    if (!roleDef) return false;
    const normalized = [...new Set(permissions)];
    updateDemoState(current => ({ ...current, roles: { ...current.roles, [role]: { ...current.roles[role], permissions: normalized } }, users: current.users.map(user => user.role === role ? { ...user, permissions: normalized } : user) }));
    userService.applyRolePermissions(role, normalized);
    auditService.record({ action: 'PERMISSION_CHANGED', user: actor, resource: 'role', resourceId: role, description: `Updated role permissions for ${role}`, severity: 'CRITICAL' });
    return true;
  },
  getRoles() { return loadDemoState().roles; },
};
