'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';
import {
  superAdminService,
  PlatformStatsResponse,
  UniversityResponse,
  UniversityAdminUserResponse,
  AuditEventResponse,
  DomainMappingItem,
  RoleItem,
} from '@/lib/services/superAdminService';
import {
  Building2,
  Users,
  ShieldAlert,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  School,
  UserCheck,
  AlertTriangle,
  Lock,
  Globe,
  Trash2,
} from 'lucide-react';

export function SuperAdminDashboard() {
  const { backendUser, currentUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const isSuperAdmin =
    backendUser?.primary_role === 'SUPER_ADMIN' ||
    backendUser?.role_assignments?.some((r: { role_code: string }) => r.role_code === 'SUPER_ADMIN') ||
    currentUser?.role === 'super_admin';

  const [stats, setStats] = useState<PlatformStatsResponse | null>(null);
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [admins, setAdmins] = useState<UniversityAdminUserResponse[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEventResponse[]>([]);
  const [domainMappings, setDomainMappings] = useState<DomainMappingItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'universities' | 'admins' | 'domains' | 'audit'>('universities');

  // Modals state
  const [createUnivOpen, setCreateUnivOpen] = useState(false);
  const [univForm, setUnivForm] = useState({ name: '', code: '', domain: '' });
  const [submittingUniv, setSubmittingUniv] = useState(false);

  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    university_id: '',
  });
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  const [createDomainOpen, setCreateDomainOpen] = useState(false);
  const [domainForm, setDomainForm] = useState({
    domain_pattern: '',
    role_id: '',
    university_id: '',
    institution_id: '',
    department_id: '',
    description: '',
    is_active: true,
  });
  const [submittingDomain, setSubmittingDomain] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, univsRes, adminsRes, auditRes, domainsRes, rolesRes] = await Promise.allSettled([
        superAdminService.getPlatformStats(),
        superAdminService.listUniversities(),
        superAdminService.listUniversityAdmins(),
        superAdminService.getAuditEvents(50),
        superAdminService.listDomainMappings(),
        superAdminService.listRoles(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (univsRes.status === 'fulfilled') setUniversities(univsRes.value);
      if (adminsRes.status === 'fulfilled') setAdmins(adminsRes.value);
      if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value);
      if (domainsRes.status === 'fulfilled') setDomainMappings(domainsRes.value);
      if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value);
    } catch {
      showToast('Error', 'Failed to synchronize platform data with server', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAllData();
    }
  }, [isSuperAdmin, loadAllData]);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-600 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Super Admin Privilege Required</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
          Your active session does not possess platform-level Super Administrator credentials.
          Access to platform governance and multi-tenant provisioning is strictly server-enforced.
        </p>
        <button
          onClick={() => router.push(backendUser?.portal_route || '/workspace')}
          className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow-md hover:bg-brand-primary-hover transition"
        >
          Return to Authorized Workspace
        </button>
      </div>
    );
  }

  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!univForm.name.trim() || !univForm.code.trim()) {
      showToast('Validation Error', 'University name and unique code are required', 'warning');
      return;
    }
    try {
      setSubmittingUniv(true);
      await superAdminService.createUniversity({
        name: univForm.name.trim(),
        code: univForm.code.trim().toUpperCase(),
        region: univForm.domain.trim() || undefined,
      });
      showToast('University Registered', `${univForm.name} successfully registered.`, 'success');
      setCreateUnivOpen(false);
      setUnivForm({ name: '', code: '', domain: '' });
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      showToast('Error', msg, 'error');
    } finally {
      setSubmittingUniv(false);
    }
  };

  const handleToggleUnivStatus = async (univ: UniversityResponse) => {
    const nextStatus = univ.status === 'active' ? 'suspended' : 'active';
    try {
      await superAdminService.updateUniversityStatus(univ.id, nextStatus);
      showToast(
        'Status Updated',
        `${univ.name} is now ${nextStatus.toLowerCase()}.`,
        'success'
      );
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      showToast('Error', msg, 'error');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.email.trim() || !adminForm.username.trim() || !adminForm.password.trim() || !adminForm.university_id) {
      showToast('Validation Error', 'All fields including university selection are required', 'warning');
      return;
    }
    try {
      setSubmittingAdmin(true);
      await superAdminService.provisionUniversityAdmin({
        email: adminForm.email.trim(),
        username: adminForm.username.trim(),
        full_name: adminForm.full_name.trim() || undefined,
        password: adminForm.password,
        university_id: adminForm.university_id,
      });
      showToast('Admin Provisioned', `University Admin account created for ${adminForm.email}.`, 'success');
      setCreateAdminOpen(false);
      setAdminForm({ email: '', username: '', full_name: '', password: '', university_id: '' });
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Provisioning failed';
      showToast('Error', msg, 'error');
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleToggleAdminStatus = async (admin: UniversityAdminUserResponse) => {
    try {
      const nextStatus = admin.status === 'active' ? 'disabled' : 'active';
      await superAdminService.updateAdminStatus(admin.id, nextStatus);
      showToast(
        'Admin Status Updated',
        `Account ${admin.email} is now ${nextStatus}.`,
        'success'
      );
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      showToast('Error', msg, 'error');
    }
  };

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainForm.domain_pattern.trim() || !domainForm.role_id) {
      showToast('Validation Error', 'Domain pattern and Role are required', 'warning');
      return;
    }
    try {
      setSubmittingDomain(true);
      await superAdminService.createDomainMapping({
        domain_pattern: domainForm.domain_pattern.trim(),
        role_id: domainForm.role_id,
        university_id: domainForm.university_id || undefined,
        institution_id: domainForm.institution_id || undefined,
        department_id: domainForm.department_id || undefined,
        is_active: domainForm.is_active,
        description: domainForm.description.trim() || undefined,
      });
      showToast('Domain Mapping Configured', `Domain ${domainForm.domain_pattern} successfully registered.`, 'success');
      setCreateDomainOpen(false);
      setDomainForm({
        domain_pattern: '',
        role_id: '',
        university_id: '',
        institution_id: '',
        department_id: '',
        description: '',
        is_active: true,
      });
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Configuration failed';
      showToast('Error', msg, 'error');
    } finally {
      setSubmittingDomain(false);
    }
  };

  const handleToggleDomainStatus = async (item: DomainMappingItem) => {
    try {
      await superAdminService.updateDomainMapping(item.id, {
        is_active: !item.is_active,
      });
      showToast(
        'Domain Status Updated',
        `Domain pattern ${item.domain_pattern} is now ${!item.is_active ? 'active' : 'inactive'}.`,
        'success'
      );
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      showToast('Error', msg, 'error');
    }
  };

  const handleDeleteDomain = async (item: DomainMappingItem) => {
    if (!confirm(`Are you sure you want to remove domain mapping for ${item.domain_pattern}?`)) {
      return;
    }
    try {
      await superAdminService.deleteDomainMapping(item.id);
      showToast('Domain Mapping Deleted', `Mapping for ${item.domain_pattern} has been removed.`, 'success');
      loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed';
      showToast('Error', msg, 'error');
    }
  };

  const filteredUniversities = (universities || []).filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDomains = (domainMappings || []).filter(
    (d) =>
      d.domain_pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.role_code && d.role_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.role_name && d.role_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredAdmins = (admins || []).filter(
    (a) =>
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.full_name && a.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Platform Governance Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Super Admin Portal</h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Cross-institutional tenant provisioning, institution administration scoping, and platform security oversight.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadAllData()}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md transition border border-white/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setCreateUnivOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-lg shadow-brand-primary/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New University</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Universities</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{stats?.total_universities ?? universities.length}</div>
            <span className="text-[11px] text-emerald-600 font-semibold">Active Tenants</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <School className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campuses &amp; Colleges</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{stats?.total_institutions ?? 0}</div>
            <span className="text-[11px] text-slate-500 font-semibold">Constituent Units</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Identities</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{stats?.total_users ?? 0}</div>
            <span className="text-[11px] text-slate-500 font-semibold">Registered Accounts</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Invitations</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{stats?.pending_invitations ?? 0}</div>
            <span className="text-[11px] text-amber-600 font-semibold">Awaiting Activation</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('universities')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'universities'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Universities ({universities.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'admins'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>University Admins ({admins.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('domains')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'domains'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Domain Access ({domainMappings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'audit'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Platform Audit Trail</span>
        </button>
      </div>

      {/* Tab 1: Universities */}
      {activeTab === 'universities' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search universities by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <button
              onClick={() => setCreateUnivOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register University</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">University Name &amp; Code</th>
                    <th className="py-3.5 px-4">Domain</th>
                    <th className="py-3.5 px-4">Constituent Campuses</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUniversities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                        {loading ? 'Synchronizing with server...' : 'No universities registered.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUniversities.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-600 font-bold">
                            {u.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {u.region || <span className="text-slate-400 italic">None</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-700">{u.institutions_count ?? 0}</span> campuses
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleUnivStatus(u)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              u.status === 'active'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Reactivate'}
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

      {/* Tab 2: University Admins */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search admins by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <button
              onClick={() => setCreateAdminOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-md transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Provision University Admin</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Administrator</th>
                    <th className="py-3.5 px-4">Assigned University</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                        {loading ? 'Synchronizing with server...' : 'No University Administrators provisioned yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAdmins.map((a) => {
                      const assignedUnivId = a.roles?.[0]?.university_id;
                      const assignedUniv = universities.find((u) => u.id === assignedUnivId);
                      const isActive = a.status === 'active';
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{a.full_name || a.email}</div>
                            <div className="text-slate-500 font-mono text-[11px]">{a.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{a.roles?.[0]?.university_name || assignedUniv?.name || 'Assigned University'}</div>
                            <span className="font-mono text-[10px] text-slate-400">{assignedUnivId || '-'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleToggleAdminStatus(a)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                isActive
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {isActive ? 'Suspend' : 'Activate'}
                            </button>
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

      {/* Tab 3: Domain-Based Access Control Mappings */}
      {activeTab === 'domains' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search domain patterns or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <button
              onClick={() => setCreateDomainOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Configure Domain Mapping</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Configured Domain-to-Role Mappings
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Controls role and organizational scope assigned upon first verified domain authentication.
                </p>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Database Enforced
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Domain Pattern</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Institutional Scope</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDomains.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        {loading ? 'Loading domain mappings...' : 'No domain mappings configured yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredDomains.map((dm) => (
                      <tr key={dm.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {dm.domain_pattern}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {dm.role_name || dm.role_code || 'Role'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-semibold text-slate-800">
                            {dm.university_name || 'Apex University'}
                          </div>
                          {dm.department_name && (
                            <div className="text-[10px] text-slate-500">
                              Dept: {dm.department_name}
                            </div>
                          )}
                          {dm.institution_name && !dm.department_name && (
                            <div className="text-[10px] text-slate-500">
                              Campus: {dm.institution_name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              dm.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dm.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{dm.is_active ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                          {dm.description || '-'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleDomainStatus(dm)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                              dm.is_active
                                ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                            }`}
                          >
                            {dm.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteDomain(dm)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete domain mapping"
                          >
                            <Trash2 className="w-4 h-4 inline" />
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

      {/* Tab 4: Platform Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Immutable Platform Security Audit Trail (Last 50 Events)
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Server-enforced audit log</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Timestamp (UTC)</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Target / Resource</th>
                  <th className="py-3.5 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                      {loading ? 'Loading audit records...' : 'No audit records logged.'}
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 font-mono text-[11px]">
                      <td className="py-2.5 px-4 text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {log.actor_user_id ? log.actor_user_id.slice(0, 8) + '...' : 'SYSTEM'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {log.target_user_id ? log.target_user_id.slice(0, 8) + '...' : 'Platform'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">
                        {log.metadata ? JSON.stringify(log.metadata) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Register University */}
      {createUnivOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Register New University</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a university tenant to the Question Paper Management System.
            </p>
            <form onSubmit={handleCreateUniversity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">University Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maktabah Jafariyah University"
                  value={univForm.name}
                  onChange={(e) => setUnivForm({ ...univForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unique Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MJU"
                  value={univForm.code}
                  onChange={(e) => setUnivForm({ ...univForm, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Institutional Domain (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. maktabah.edu"
                  value={univForm.domain}
                  onChange={(e) => setUnivForm({ ...univForm, domain: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateUnivOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUniv}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md disabled:opacity-50 transition"
                >
                  {submittingUniv ? 'Registering...' : 'Register University'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Provision University Admin */}
      {createAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Provision University Administrator</h3>
            <p className="text-xs text-slate-500 mb-4">
              Assign an administrative account with scoped authority over a specific university.
            </p>
            <form onSubmit={handleCreateAdmin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target University</label>
                <select
                  required
                  value={adminForm.university_id}
                  onChange={(e) => setAdminForm({ ...adminForm, university_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                >
                  <option value="">-- Select University --</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="admin@maktabah.edu"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="univadmin"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="Prof. Administrator"
                    value={adminForm.full_name}
                    onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateAdminOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdmin}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md disabled:opacity-50 transition"
                >
                  {submittingAdmin ? 'Provisioning...' : 'Provision Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Configure Domain Mapping */}
      {createDomainOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Configure Domain Mapping</h3>
            <p className="text-xs text-slate-500 mb-4">
              Map an institutional email domain pattern to a role and organizational scope.
            </p>
            <form onSubmit={handleCreateDomain} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email Domain Pattern
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. universityadmin.in or bca.hod.in"
                  value={domainForm.domain_pattern}
                  onChange={(e) => setDomainForm({ ...domainForm, domain_pattern: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Role
                </label>
                <select
                  required
                  value={domainForm.role_id}
                  onChange={(e) => setDomainForm({ ...domainForm, role_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                >
                  <option value="">-- Select Role --</option>
                  {roles
                    .filter((r) => r.code !== 'SUPER_ADMIN')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Super Admin role cannot be mapped to email domains.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Target University (Optional)
                </label>
                <select
                  value={domainForm.university_id}
                  onChange={(e) => setDomainForm({ ...domainForm, university_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary font-medium"
                >
                  <option value="">-- No Specific University --</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Description / Department Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. BCA HOD Departmental Access"
                  value={domainForm.description}
                  onChange={(e) => setDomainForm({ ...domainForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="domain_is_active"
                  checked={domainForm.is_active}
                  onChange={(e) => setDomainForm({ ...domainForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-brand-primary accent-brand-primary focus:ring-brand-primary w-4 h-4"
                />
                <label htmlFor="domain_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Activate domain mapping immediately
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateDomainOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDomain}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md disabled:opacity-50 transition"
                >
                  {submittingDomain ? 'Configuring...' : 'Save Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminDashboard;
