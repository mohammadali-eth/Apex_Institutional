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
  UserPlus,
  Eye,
  EyeOff,
  Key,
  Pencil,
  AlertTriangle,
  UserCheck,
  UserX,
  X,
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
  const [authorizedDomains, setAuthorizedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'staff' | 'invitations' | 'campuses'>('staff');

  // Direct Staff Provisioning state
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role_code: 'FACULTY_QUESTION_SETTER',
    institution_id: '',
    department_id: '',
  });
  const [showProvisionPassword, setShowProvisionPassword] = useState(false);
  const [submittingProvision, setSubmittingProvision] = useState(false);

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
  const [staffStatusFilter, setStaffStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Edit Staff Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMemberResponse | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    role_code: 'FACULTY_QUESTION_SETTER',
    institution_id: '',
    department_id: '',
    status: 'active',
    password: '',
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Staff Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<StaffMemberResponse | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [univRes, instRes, deptRes, staffRes, inviteRes, rolesRes, domainsRes] = await Promise.allSettled([
        universityAdminService.getAssignedOrganization(),
        universityAdminService.listInstitutions(),
        universityAdminService.listDepartments(),
        universityAdminService.listStaff(),
        universityAdminService.listInvitations(),
        universityAdminService.listDelegableRoles(),
        universityAdminService.listAuthorizedDomains(),
      ]);

      if (univRes.status === 'fulfilled') setUniversity(univRes.value);
      if (instRes.status === 'fulfilled') setInstitutions(instRes.value);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value);
      if (staffRes.status === 'fulfilled') setStaff(staffRes.value);
      if (inviteRes.status === 'fulfilled') setInvitations(inviteRes.value);
      if (rolesRes.status === 'fulfilled') setDelegableRoles(rolesRes.value);
      if (domainsRes.status === 'fulfilled') setAuthorizedDomains(domainsRes.value);
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

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let pwd = 'Pass#';
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += '!9A';
    setProvisionForm((prev) => ({ ...prev, password: pwd }));
    setShowProvisionPassword(true);
  };

  const handleProvisionStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = provisionForm.email.trim();
    if (!trimmedEmail || !provisionForm.password || !provisionForm.role_code || !provisionForm.full_name.trim()) {
      showToast('Validation Error', 'Full name, email, password, and role are required', 'warning');
      return;
    }
    if (provisionForm.password.length < 8) {
      showToast('Validation Error', 'Password must be at least 8 characters long', 'warning');
      return;
    }
    if (provisionForm.role_code === 'DEPARTMENT_ADMIN' && !provisionForm.department_id) {
      showToast('Validation Error', 'Department is required for Department Admin (HOD) role', 'warning');
      return;
    }

    try {
      setSubmittingProvision(true);
      await universityAdminService.provisionStaffUser({
        email: trimmedEmail,
        password: provisionForm.password,
        full_name: provisionForm.full_name.trim(),
        role_code: provisionForm.role_code,
        institution_id: provisionForm.institution_id || undefined,
        department_id: provisionForm.department_id || undefined,
      });
      showToast(
        'Staff Account Provisioned',
        `Account for ${trimmedEmail} provisioned with role ${provisionForm.role_code}.`,
        'success'
      );
      setProvisionModalOpen(false);
      setProvisionForm({
        email: '',
        password: '',
        full_name: '',
        role_code: 'FACULTY_QUESTION_SETTER',
        institution_id: '',
        department_id: '',
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to provision staff member';
      showToast('Provisioning Error', msg, 'error');
    } finally {
      setSubmittingProvision(false);
    }
  };

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
      const isCurrentlyActive = user.status === 'active' || user.is_active === true;
      await universityAdminService.updateStaffStatus(user.id, !isCurrentlyActive);
      showToast(
        'Staff Status Updated',
        `${user.email} is now ${!isCurrentlyActive ? 'active' : 'suspended'}.`,
        'success'
      );
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      showToast('Error', msg, 'error');
    }
  };

  const handleOpenEditModal = (s: StaffMemberResponse) => {
    setEditingStaff(s);
    const primaryRole = (s.roles || s.role_assignments || [])[0];
    const isActive = s.status === 'active' || s.is_active === true;
    setEditForm({
      full_name: s.full_name || '',
      email: s.email || '',
      role_code: primaryRole?.role_code || 'FACULTY_QUESTION_SETTER',
      institution_id: primaryRole?.institution_id || '',
      department_id: primaryRole?.department_id || '',
      status: isActive ? 'active' : 'disabled',
      password: '',
    });
    setShowEditPassword(false);
    setEditModalOpen(true);
  };

  const generateEditStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let pwd = 'Pass#';
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += '!9A';
    setEditForm((prev) => ({ ...prev, password: pwd }));
    setShowEditPassword(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    const trimmedEmail = editForm.email.trim();
    if (!trimmedEmail || !editForm.full_name.trim()) {
      showToast('Validation Error', 'Full name and email are required', 'warning');
      return;
    }
    if (editForm.password && editForm.password.length < 8) {
      showToast('Validation Error', 'Password must be at least 8 characters long', 'warning');
      return;
    }
    if (editForm.role_code === 'DEPARTMENT_ADMIN' && !editForm.department_id) {
      showToast('Validation Error', 'Department is required for Department Admin (HOD) role', 'warning');
      return;
    }

    try {
      setSubmittingEdit(true);
      await universityAdminService.updateStaffUser(editingStaff.id, {
        full_name: editForm.full_name.trim(),
        email: trimmedEmail,
        role_code: editForm.role_code,
        institution_id: editForm.institution_id || undefined,
        department_id: editForm.department_id || undefined,
        status: editForm.status,
        password: editForm.password.trim() || undefined,
      });
      showToast('User Updated', `Staff details for ${trimmedEmail} have been updated.`, 'success');
      setEditModalOpen(false);
      setEditingStaff(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update staff user';
      showToast('Update Failed', msg, 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleOpenDeleteModal = (s: StaffMemberResponse) => {
    if (backendUser && (backendUser.id === s.id || backendUser.email === s.email)) {
      showToast('Restricted Action', 'You cannot delete your own administrative account', 'warning');
      return;
    }
    setDeletingStaff(s);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    try {
      setSubmittingDelete(true);
      await universityAdminService.deleteStaffUser(deletingStaff.id);
      showToast(
        'User Removed',
        `${deletingStaff.full_name || deletingStaff.email} removed from university.`,
        'success'
      );
      setDeleteModalOpen(false);
      setDeletingStaff(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      showToast('Delete Failed', msg, 'error');
    } finally {
      setSubmittingDelete(false);
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

  const activeStaffCount = (staff || []).filter((s) => s.status === 'active' || s.is_active === true).length;
  const suspendedStaffCount = (staff || []).length - activeStaffCount;

  const filteredStaff = (staff || []).filter((s) => {
    const isActive = s.status === 'active' || s.is_active === true;
    if (staffStatusFilter === 'active' && !isActive) return false;
    if (staffStatusFilter === 'suspended' && isActive) return false;
    return (
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.username && s.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.full_name && s.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const filteredInvitations = (invitations || []).filter(
    (i) =>
      (i.email && i.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.full_name && i.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.role?.name && i.role.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.role?.code && i.role.code.toLowerCase().includes(searchQuery.toLowerCase()))
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
              onClick={() => setProvisionModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-lg shadow-brand-primary/20 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Provision User</span>
            </button>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md transition border border-white/10"
            >
              <Mail className="w-4 h-4" />
              <span>Invite Link</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total University Users</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{staff.length}</div>
            <div className="flex items-center space-x-2 mt-1.5">
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                {activeStaffCount} Active
              </span>
              <span className="text-slate-300 text-xs">•</span>
              <span className="inline-flex items-center text-[11px] font-semibold text-rose-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>
                {suspendedStaffCount} Suspended
              </span>
            </div>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStaffStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    staffStatusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All ({staff.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1 ${
                    staffStatusFilter === 'active'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Active ({activeStaffCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStaffStatusFilter('suspended')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1 ${
                    staffStatusFilter === 'suspended'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>Suspended ({suspendedStaffCount})</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setProvisionModalOpen(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-md transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Provision User</span>
              </button>
              <button
                onClick={() => setInviteModalOpen(true)}
                className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Invite Link</span>
              </button>
            </div>
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
                        {loading ? 'Loading staff records...' : 'No staff members match the criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((s) => {
                      const isActive = s.status === 'active' || s.is_active === true;
                      const staffRoles = s.roles || s.role_assignments || [];
                      const isSelf = backendUser && (backendUser.id === s.id || backendUser.email === s.email);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                              <span>{s.full_name || s.username || s.email.split('@')[0]}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 font-mono text-[11px]">{s.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {staffRoles.length === 0 ? (
                                <span className="text-slate-400 text-[10px]">No roles</span>
                              ) : (
                                staffRoles.map((r) => (
                                  <span
                                    key={r.id || r.role_code}
                                    className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  >
                                    {r.role_code || r.role_name}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center justify-end space-x-1.5">
                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEditModal(s)}
                                title="Edit user details, roles, or reset password"
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                              >
                                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                                <span>Edit</span>
                              </button>

                              {/* Suspend / Reactivate Button */}
                              <button
                                onClick={() => handleToggleStaffStatus(s)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                                  isActive
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {isActive ? 'Suspend' : 'Reactivate'}
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleOpenDeleteModal(s)}
                                disabled={Boolean(isSelf)}
                                title={isSelf ? 'Cannot delete your own account' : 'Remove user from university'}
                                className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                                  isSelf
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
                            {inv.role?.name || inv.role?.code || 'Staff'}
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
                          {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : 'N/A'}
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

      {/* Modal: Provision Staff User */}
      {provisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn my-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Provision Staff User Account</h3>
                  <p className="text-xs text-slate-500">
                    Directly create an account with custom email, password, and authorized role.
                  </p>
                </div>
              </div>
            </div>

            {/* Allowed Domains Badge Box */}
            <div className="p-3 my-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                Authorized Domains for this University:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {authorizedDomains.length === 0 ? (
                  <span className="text-xs text-emerald-700">Loading authorized domains...</span>
                ) : (
                  authorizedDomains.map((dom) => (
                    <span
                      key={dom}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white text-emerald-700 border border-emerald-300 shadow-2xs"
                    >
                      @{dom}
                    </span>
                  ))
                )}
              </div>
              <p className="text-[10px] text-emerald-600/90 mt-1">
                The username and password are not fixed — you specify them directly. The domain is verified against your authorized domains above.
              </p>
            </div>

            <form onSubmit={handleProvisionStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={provisionForm.full_name}
                  onChange={(e) => setProvisionForm({ ...provisionForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Staff Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder={`e.g. rsharma@${authorizedDomains[0] || 'bca.hod.in'}`}
                  value={provisionForm.email}
                  onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Initial Password
                  </label>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="text-[11px] font-bold text-brand-primary hover:underline flex items-center space-x-1"
                  >
                    <Key className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showProvisionPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter custom password (min 8 chars)"
                    value={provisionForm.password}
                    onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-brand-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProvisionPassword(!showProvisionPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showProvisionPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Delegated Role
                </label>
                <select
                  required
                  value={provisionForm.role_code}
                  onChange={(e) => setProvisionForm({ ...provisionForm, role_code: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                >
                  {delegableRoles.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Campus (Optional)
                  </label>
                  <select
                    value={provisionForm.institution_id}
                    onChange={(e) => setProvisionForm({ ...provisionForm, institution_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                  >
                    <option value="">-- All Campuses --</option>
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Department {provisionForm.role_code === 'DEPARTMENT_ADMIN' && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={provisionForm.department_id}
                    onChange={(e) => setProvisionForm({ ...provisionForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProvisionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProvision}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md disabled:opacity-50 transition flex items-center space-x-2"
                >
                  {submittingProvision ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning Account...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Provision User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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

      {/* Modal: Edit Staff User */}
      {editModalOpen && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn my-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Academic Staff Member</h3>
                  <p className="text-xs text-slate-500">
                    Modify profile details, reassign role &amp; scope, or reset password.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Allowed Domains Badge Box */}
            <div className="p-3 my-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                Authorized Domains for this University:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {authorizedDomains.length === 0 ? (
                  <span className="text-xs text-emerald-700">Loading authorized domains...</span>
                ) : (
                  authorizedDomains.map((dom) => (
                    <span
                      key={dom}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white text-emerald-700 border border-emerald-300 shadow-2xs"
                    >
                      @{dom}
                    </span>
                  ))
                )}
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Staff Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rsharma@bca.hod.in"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Delegated Role</label>
                  <select
                    required
                    value={editForm.role_code}
                    onChange={(e) => setEditForm({ ...editForm, role_code: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                  >
                    {delegableRoles.map((r) => (
                      <option key={r.id} value={r.code}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="disabled">Suspended (Access Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Campus (Optional)</label>
                  <select
                    value={editForm.institution_id}
                    onChange={(e) => setEditForm({ ...editForm, institution_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                  >
                    <option value="">-- All Campuses --</option>
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Department {editForm.role_code === 'DEPARTMENT_ADMIN' && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={editForm.department_id}
                    onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reset Password Section */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Reset Password (Optional)
                    </label>
                    <p className="text-[11px] text-slate-500">Leave blank to keep existing password</p>
                  </div>
                  <button
                    type="button"
                    onClick={generateEditStrongPassword}
                    className="text-[11px] font-bold text-brand-primary hover:underline flex items-center space-x-1"
                  >
                    <Key className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min 8 chars) or leave empty"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md disabled:opacity-50 transition flex items-center space-x-2"
                >
                  {submittingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Staff Member Confirmation */}
      {deleteModalOpen && deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Remove Staff Member?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove this user from <span className="font-bold text-slate-700">{university?.name}</span>?
            </p>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 my-4 space-y-1">
              <div className="font-bold text-slate-900 text-sm">
                {deletingStaff.full_name || deletingStaff.username || deletingStaff.email}
              </div>
              <div className="text-xs font-mono text-slate-500">{deletingStaff.email}</div>
              <div className="flex flex-wrap gap-1 pt-1.5">
                {(deletingStaff.roles || deletingStaff.role_assignments || []).map((r) => (
                  <span
                    key={r.id || r.role_code}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700"
                  >
                    {r.role_code || r.role_name}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 space-y-1 mb-5">
              <span className="font-bold block">Security Notice:</span>
              <p>
                This action will instantly terminate all active sessions and revoke permissions for this user.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submittingDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 disabled:opacity-50 transition flex items-center space-x-1.5"
              >
                {submittingDelete ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
