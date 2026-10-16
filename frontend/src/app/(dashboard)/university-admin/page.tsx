'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';
import {
  universityAdminService,
  StaffMemberResponse,
  StaffInvitationResponse,
} from '@/lib/services/universityAdminService';
import {
  UniversityResponse,
  InstitutionResponse,
  DepartmentResponse,
  RoleResponse,
} from '@/lib/services/superAdminService';
import {
  Building2,
  Users,
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  Mail,
  Send,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  School,
  ShieldAlert,
  GraduationCap,
} from 'lucide-react';

export default function UniversityAdminPortalPage() {
  const { backendUser, currentUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const isUnivAdmin =
    backendUser?.primary_role === 'UNIVERSITY_ADMIN' ||
    backendUser?.primary_role === 'SUPER_ADMIN' ||
    backendUser?.role_assignments?.some(
      (r: { role_code: string }) => r.role_code === 'UNIVERSITY_ADMIN' || r.role_code === 'SUPER_ADMIN'
    ) ||
    currentUser?.role === 'university_admin' ||
    currentUser?.role === 'super_admin';

  const [university, setUniversity] = useState<UniversityResponse | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionResponse[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [staff, setStaff] = useState<StaffMemberResponse[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitationResponse[]>([]);
  const [delegableRoles, setDelegableRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'staff' | 'invitations' | 'campuses'>('staff');

  // Modals state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    role_code: 'FACULTY_QUESTION_SETTER',
    institution_id: '',
    department_id: '',
  });
  const [submittingInvite, setSubmittingInvite] = useState(false);

  const [createInstModalOpen, setCreateInstModalOpen] = useState(false);
  const [instForm, setInstForm] = useState({ name: '', code: '' });
  const [submittingInst, setSubmittingInst] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [univRes, instRes, deptRes, staffRes, inviteRes, rolesRes] = await Promise.allSettled([
        universityAdminService.getAssignedOrganization(),
        universityAdminService.listInstitutions(),
        universityAdminService.listDepartments(),
        universityAdminService.listStaff(),
        universityAdminService.listInvitations(),
        universityAdminService.listDelegableRoles(),
      ]);

      if (univRes.status === 'fulfilled') setUniversity(univRes.value);
      if (instRes.status === 'fulfilled') setInstitutions(instRes.value);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value);
      if (staffRes.status === 'fulfilled') setStaff(staffRes.value);
      if (inviteRes.status === 'fulfilled') setInvitations(inviteRes.value);
      if (rolesRes.status === 'fulfilled') setDelegableRoles(rolesRes.value);
    } catch {
      showToast('Error', 'Failed to synchronize university management data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isUnivAdmin) {
      loadData();
    }
  }, [isUnivAdmin, loadData]);

  if (!isUnivAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-600 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">University Admin Privilege Required</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
          Your account does not hold an authorized University Administrator delegation for this scope.
        </p>
        <button
          onClick={() => router.push(backendUser?.portal_route || '/workspace')}
          className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow-md hover:bg-brand-primary-hover transition"
        >
          Return to My Workspace
        </button>
      </div>
    );
  }

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim() || !inviteForm.role_code) {
      showToast('Validation Error', 'Staff email and delegable role are required', 'warning');
      return;
    }
    try {
      setSubmittingInvite(true);
      await universityAdminService.inviteStaff({
        email: inviteForm.email.trim(),
        full_name: inviteForm.full_name.trim() || undefined,
        role_code: inviteForm.role_code,
        institution_id: inviteForm.institution_id || undefined,
        department_id: inviteForm.department_id || undefined,
      });
      showToast('Invitation Dispatched', `Activation invitation issued to ${inviteForm.email}.`, 'success');
      setInviteModalOpen(false);
      setInviteForm({
        email: '',
        full_name: '',
        role_code: 'FACULTY_QUESTION_SETTER',
        institution_id: '',
        department_id: '',
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to issue invitation';
      showToast('Error', msg, 'error');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleResendInvite = async (invitationId: string, email: string) => {
    try {
      await universityAdminService.resendInvitation(invitationId);
      showToast('Invitation Resent', `Fresh activation token dispatched to ${email}.`, 'success');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Resend failed';
      showToast('Error', msg, 'error');
    }
  };

  const handleRevokeInvite = async (invitationId: string, email: string) => {
    try {
      await universityAdminService.revokeInvitation(invitationId);
      showToast('Invitation Revoked', `Invitation for ${email} is now revoked.`, 'info');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Revocation failed';
      showToast('Error', msg, 'error');
    }
  };

  const handleToggleStaffStatus = async (user: StaffMemberResponse) => {
    try {
      await universityAdminService.updateStaffStatus(user.id, !user.is_active);
      showToast(
        'Staff Status Updated',
        `${user.email} is now ${!user.is_active ? 'active' : 'suspended'}.`,
        'success'
      );
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      showToast('Error', msg, 'error');
    }
  };

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instForm.name.trim() || !instForm.code.trim()) {
      showToast('Validation Error', 'Campus name and code are required', 'warning');
      return;
    }
    try {
      setSubmittingInst(true);
      await universityAdminService.createInstitution({
        name: instForm.name.trim(),
        code: instForm.code.trim().toUpperCase(),
      });
      showToast('Campus Created', `${instForm.name} registered.`, 'success');
      setCreateInstModalOpen(false);
      setInstForm({ name: '', code: '' });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Creation failed';
      showToast('Error', msg, 'error');
    } finally {
      setSubmittingInst(false);
    }
  };

  const filteredStaff = staff.filter(
    (s) =>
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.full_name && s.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredInvitations = invitations.filter(
    (i) =>
      i.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.full_name && i.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      i.role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* University Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold backdrop-blur-md mb-2 border border-emerald-500/30">
              <School className="w-3.5 h-3.5" />
              <span>{university?.code || 'UNIVERSITY'} • Administrative Scope</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {university?.name || 'University Administration'}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Manage academic staff identities, role delegation, invitations, and institutional scope boundaries.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md transition border border-white/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-lg shadow-brand-primary/20 transition"
            >
              <Mail className="w-4 h-4" />
              <span>Invite Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{staff.length}</div>
            <span className="text-[11px] text-emerald-600 font-semibold">Active Identities</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Invitations</span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {invitations.filter((i) => i.status === 'PENDING').length}
            </div>
            <span className="text-[11px] text-amber-600 font-semibold">Awaiting Activation</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campuses</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{institutions.length}</div>
            <span className="text-[11px] text-slate-500 font-semibold">Affiliated Colleges</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Departments</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{departments.length}</div>
            <span className="text-[11px] text-slate-500 font-semibold">Academic Disciplines</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('staff')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'staff'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({staff.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'invitations'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Invitations &amp; Activation ({invitations.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('campuses')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'campuses'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Campuses &amp; Departments</span>
        </button>
      </div>

      {/* Tab 1: Staff Directory */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-md transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite New Staff</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Assigned Roles &amp; Scopes</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                        {loading ? 'Loading staff records...' : 'No staff members assigned.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {s.full_name || s.username}
                          </div>
                          <div className="text-slate-500 font-mono text-[11px]">{s.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {s.role_assignments.map((r) => (
                              <span
                                key={r.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                              >
                                {r.role_code}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {s.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleStaffStatus(s)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              s.is_active
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {s.is_active ? 'Suspend' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Invitations */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search invitations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-md transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Issue New Invitation</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Invited Email</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Expires</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvitations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                        {loading ? 'Loading invitations...' : 'No invitations issued yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredInvitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{inv.full_name || inv.email}</div>
                          <div className="text-slate-500 font-mono text-[11px]">{inv.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-brand-primary-light text-brand-primary">
                            {inv.role.name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : inv.status === 'ACCEPTED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {inv.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleResendInvite(inv.id, inv.email)}
                                title="Resend token"
                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-brand-primary transition"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRevokeInvite(inv.id, inv.email)}
                                title="Revoke invitation"
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Campuses & Departments */}
      {activeTab === 'campuses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campuses Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Constituent Campuses / Colleges</h3>
                <p className="text-xs text-slate-400">Institutional units under {university?.code}</p>
              </div>
              <button
                onClick={() => setCreateInstModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Campus</span>
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {institutions.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No campuses registered yet.</p>
              ) : (
                institutions.map((inst) => (
                  <div key={inst.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{inst.name}</div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                        {inst.code}
                      </span>
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold">{inst.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Departments Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Academic Departments</h3>
                <p className="text-xs text-slate-400">Subject disciplines &amp; faculty faculties</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {departments.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No departments created yet.</p>
              ) : (
                departments.map((dept) => (
                  <div key={dept.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{dept.name}</div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                        {dept.code}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Invite Staff */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Invite Academic Staff</h3>
            <p className="text-xs text-slate-500 mb-4">
              Issue an activation invitation with scoped role assignment. Password is set by the staff member during activation.
            </p>
            <form onSubmit={handleInviteStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Staff Email</label>
                <input
                  type="email"
                  required
                  placeholder="faculty@maktabah.edu"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Dr. Fatima Al-Zahra"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Delegated Role</label>
                <select
                  required
                  value={inviteForm.role_code}
                  onChange={(e) => setInviteForm({ ...inviteForm, role_code: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                >
                  {delegableRoles.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Super Admin role cannot be delegated by university administrators.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Campus (Optional)</label>
                <select
                  value={inviteForm.institution_id}
                  onChange={(e) => setInviteForm({ ...inviteForm, institution_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                >
                  <option value="">-- All University Campuses --</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md disabled:opacity-50 transition"
                >
                  {submittingInvite ? 'Dispatching...' : 'Dispatch Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Campus */}
      {createInstModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Register Campus / College</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a constituent campus under your university.
            </p>
            <form onSubmit={handleCreateInstitution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Campus Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maktabah College of Engineering"
                  value={instForm.name}
                  onChange={(e) => setInstForm({ ...instForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Campus Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCE"
                  value={instForm.code}
                  onChange={(e) => setInstForm({ ...instForm, code: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateInstModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInst}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md disabled:opacity-50 transition"
                >
                  {submittingInst ? 'Creating...' : 'Create Campus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
