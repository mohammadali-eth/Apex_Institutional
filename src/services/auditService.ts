import { AuditEvent, User } from '../types';
import { loadDemoState, updateDemoState } from '../store/demoState';

export const auditService = {
  record(input: { action: string; user?: User | null; resource?: string; resourceId?: string; description?: string; severity?: AuditEvent['severity'] }) {
    const occurredAt = new Date().toISOString();
    const state=loadDemoState(); const actor=input.user||state.users.find(user=>user.id===state.activeUserId)||null;
    const event: AuditEvent = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      action: input.action,
      actorId: actor?.id || 'system',
      occurredAt,
      timestamp: occurredAt,
      userId: actor?.id || 'system',
      userName: actor?.name || 'System',
      resource: input.resource || 'system',
      resourceId: input.resourceId,
      description: input.description || input.action,
      ipAddress: '127.0.0.1 (demo)',
      severity: input.severity || 'INFO',
    };
    updateDemoState(state => ({ ...state, auditEvents: [event, ...state.auditEvents] }));
    return event;
  },
};
