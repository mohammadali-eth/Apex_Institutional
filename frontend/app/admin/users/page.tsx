"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { User, Department, Organization } from "@/lib/types";
import {
  Users,
  Plus,
  Shield,
  CheckCircle2,
  XCircle,
  Search,
  Mail,
  Building,
  KeyRound,
  Copy,
  ExternalLink,
  Lock,
} from "lucide-react";

interface ProvisionResult {
  email: string;
  full_name: string;
  role_name: string;
  temporary_password?: string;
  setup_token?: string;
  setup_url?: string;
}

export default function UserManagementPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [creatableRoles, setCreatableRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [provisionSuccessModalOpen, setProvisionSuccessModalOpen] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(null);

  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role_name: "TEACHER",
    organization_id: "",
    department_id: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [uData, dData, oData, rolesData] = await Promise.all([
        api.get<User[]>("/users"),
        api.get<Department[]>("/departments"),
        api.get<Organization[]>("/organizations"),
        api.get<string[]>("/users/creatable-roles").catch(() => []),
      ]);
      setUsers(uData);
      setDepartments(dData);
      setOrganizations(oData);
      setCreatableRoles(rolesData || []);

      const defaultRole = rolesData && rolesData.length > 0 ? rolesData[0] : "TEACHER";
      const defaultOrg = currentUser?.organization_id || (oData.length > 0 ? oData[0].id : "");
      const defaultDept = currentUser?.department_id || "";

      setNewUser((prev) => ({
        ...prev,
        role_name: defaultRole,
        organization_id: defaultOrg,
        department_id: defaultDept,
      }));
    } catch (err: any) {
      toast.error(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.full_name) {
      toast.error("Please fill in email and full name");
      return;
    }

    if (!autoGeneratePassword && (!newUser.password || newUser.password.length < 6)) {
      toast.error("Please enter a password of at least 6 characters");
      return;
    }

    try {
      const payload = {
        email: newUser.email.trim(),
        full_name: newUser.full_name.trim(),
        role_name: newUser.role_name,
        organization_id: newUser.organization_id || undefined,
        department_id: newUser.department_id || undefined,
        password: autoGeneratePassword ? undefined : newUser.password,
        must_change_password: true,
      };

      const res = await api.post<any>("/users", payload);
      toast.success(`Account for ${newUser.full_name} (${newUser.role_name}) provisioned successfully!`);
      setCreateModalOpen(false);

      if (res?.temporary_password || res?.setup_token) {
        setProvisionResult(res);
        setProvisionSuccessModalOpen(true);
      }

      setNewUser({
        email: "",
        password: "",
        full_name: "",
        role_name: creatableRoles[0] || "TEACHER",
        organization_id: currentUser?.organization_id || organizations[0]?.id || "",
        department_id: currentUser?.department_id || "",
      });
      setAutoGeneratePassword(true);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to provision user account");
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await api.put(`/users/${user.id}`, { is_active: !user.is_active });
      toast.success(`User ${user.email} status updated!`);
      fetchUsers();
    } catch (err: any) {
      toast.error("Failed to update user status");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      u.role_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & Access Management"
        subtitle="Hierarchical account provisioning, multi-tenant role assignments, and credential governance."
        actions={
          hasPermission("user.create") && creatableRoles.length > 0 && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>Provision User</span>
            </button>
          )
        }
      />

      {/* FILTER & SEARCH BAR */}
      <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--font-color)] w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-theme pl-9 py-2 text-sm w-full"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--paragraph-color)]">
          <Users className="w-4 h-4 text-[var(--secondary-color)]" />
          <span>Total: <strong>{filteredUsers.length}</strong> accounts</span>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-title-color)] text-[var(--title-color)] text-xs uppercase font-bold border-b border-[var(--border-color)]">
            <tr>
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">University / Dept</th>
              <th className="px-5 py-3.5">Security Status</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[var(--font-color)]">
                  Loading user records...
                </td>
              </tr>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--background-color)]/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-[var(--title-color)]">{u.full_name}</div>
                    <div className="text-xs text-[var(--font-color)] flex items-center gap-1.5 mt-0.5">
                      <Mail size={12} />
                      <span>{u.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="badge-theme-blue text-xs font-mono font-medium">
                      {u.role_name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs font-medium text-[var(--title-color)]">
                      {u.organization_name || "Apex University System"}
                    </div>
                    {u.department_name && (
                      <div className="text-[11px] text-[var(--paragraph-color)] mt-0.5 flex items-center gap-1">
                        <Building size={11} />
                        <span>{u.department_name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {(u as any).must_change_password ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Lock size={10} />
                        <span>Pending Password Setup</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={10} />
                        <span>Password Established</span>
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <CheckCircle2 size={14} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
                        <XCircle size={14} /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {hasPermission("user.update") && (
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`text-xs px-2.5 py-1 rounded-[var(--radius-sm)] border font-medium transition-colors ${
                          u.is_active
                            ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[var(--font-color)]">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Provision New User Account"
        subtitle="Scoped hierarchical account creation following enterprise RBAC rules"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="Dr. Grace Hopper"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                required
                className="input-theme"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">
                Email Address *
              </label>
              <input
                type="email"
                placeholder="grace@university.in"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
                className="input-theme"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">
                Assign Role *
              </label>
              <select
                value={newUser.role_name}
                onChange={(e) => setNewUser({ ...newUser, role_name: e.target.value })}
                className="input-theme font-bold text-[var(--title-color)]"
              >
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[var(--font-color)] mt-1">
                Restricted to roles permitted under your authority.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">
                University Scope
              </label>
              <select
                value={newUser.organization_id}
                onChange={(e) => setNewUser({ ...newUser, organization_id: e.target.value })}
                className="input-theme"
                disabled={currentUser?.role_name !== "SUPER_ADMIN"}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">
              Department Assignment
            </label>
            <select
              value={newUser.department_id}
              onChange={(e) => setNewUser({ ...newUser, department_id: e.target.value })}
              className="input-theme"
              disabled={currentUser?.role_name === "HOD"}
            >
              <option value="">General / None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
            {currentUser?.role_name === "HOD" && (
              <p className="text-[10px] text-[var(--font-color)] mt-1">
                Locked to your assigned department.
              </p>
            )}
          </div>

          {/* CREDENTIAL INITIALIZATION OPTION */}
          <div className="bg-[var(--background-color)] p-3 rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--title-color)] flex items-center gap-1.5">
                <KeyRound size={14} className="text-[var(--primary-color)]" />
                <span>Credential Setup Strategy</span>
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--paragraph-color)]">
                <input
                  type="checkbox"
                  checked={autoGeneratePassword}
                  onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                  className="rounded text-[var(--primary-color)]"
                />
                <span>Generate secure setup token / temp password</span>
              </label>
            </div>

            {!autoGeneratePassword && (
              <div>
                <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">
                  Specify Initial Password *
                </label>
                <input
                  type="text"
                  placeholder="Min 6 characters"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required={!autoGeneratePassword}
                  className="input-theme font-mono"
                />
                <p className="text-[10px] text-[var(--font-color)] mt-1">
                  User will still be prompted to change their password on first login.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Provision Account
            </button>
          </div>
        </form>
      </Modal>

      {/* PROVISION SUCCESS MODAL */}
      <Modal
        isOpen={provisionSuccessModalOpen}
        onClose={() => setProvisionSuccessModalOpen(false)}
        title="Account Provisioned Successfully"
        subtitle="Secure credential token and one-time access details"
        maxWidth="md"
      >
        {provisionResult && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-[var(--radius-md)] flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-800">
                <p className="font-bold">
                  Account created for {provisionResult.full_name} ({provisionResult.role_name})
                </p>
                <p className="mt-0.5">
                  Share these initial credentials or setup link with the user. They must establish their own password upon first access.
                </p>
              </div>
            </div>

            {provisionResult.temporary_password && (
              <div>
                <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">
                  Temporary Initial Password
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={provisionResult.temporary_password}
                    className="input-theme font-mono font-bold text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(provisionResult.temporary_password!, "Temporary Password")
                    }
                    className="btn-secondary px-3 py-2 flex items-center gap-1"
                  >
                    <Copy size={14} />
                    <span className="text-xs">Copy</span>
                  </button>
                </div>
              </div>
            )}

            {provisionResult.setup_token && (
              <div>
                <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">
                  One-Time Setup Token
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={provisionResult.setup_token}
                    className="input-theme font-mono text-xs bg-white text-[var(--paragraph-color)]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(provisionResult.setup_token!, "Setup Token")
                    }
                    className="btn-secondary px-3 py-2 flex items-center gap-1"
                  >
                    <Copy size={14} />
                    <span className="text-xs">Copy</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setProvisionSuccessModalOpen(false)}
                className="btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
