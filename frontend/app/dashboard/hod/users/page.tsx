"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HODFacultyItem, StaffCredentialResetResponse } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  UserCheck,
  Plus,
  Search,
  Key,
  CheckCircle2,
  AlertTriangle,
  X,
  Power,
  Copy,
  Check,
  ShieldAlert,
} from "lucide-react";

export default function HODUsersPage() {
  const [users, setUsers] = useState<HODFacultyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [credResetData, setCredResetData] = useState<StaffCredentialResetResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    api
      .get<HODFacultyItem[]>("/hod/users")
      .then((data) => setUsers(data || []))
      .catch((err) => {
        console.error("Error loading department users:", err);
        setMsg({ type: "error", text: "Failed to load department users." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.post("/hod/users", {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || null,
        employee_code: employeeCode.trim() || null,
      });
      setMsg({ type: "success", text: "Faculty user created in department successfully." });
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to create user." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: HODFacultyItem) => {
    if (!confirm(`Are you sure you want to ${item.is_active ? "deactivate" : "activate"} ${item.full_name}?`)) {
      return;
    }
    try {
      await api.put(`/hod/users/${item.id}/status`, {
        is_active: !item.is_active,
      });
      setMsg({
        type: "success",
        text: `User ${!item.is_active ? "activated" : "deactivated"} successfully.`,
      });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to update status." });
    }
  };

  const handleResetPassword = async (item: HODFacultyItem) => {
    if (!confirm(`Reset credentials for ${item.full_name}? A temporary password will be generated.`)) {
      return;
    }
    try {
      const res = await api.post<StaffCredentialResetResponse>(`/hod/users/${item.id}/reset-password`, {});
      setCredResetData(res);
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to reset password." });
    }
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setEmployeeCode("");
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.employee_code && u.employee_code.toLowerCase().includes(search.toLowerCase()));

    if (filterRole === "ALL") return matchesSearch;
    return matchesSearch && u.role_name === filterRole;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Users & Staff Access"
        subtitle="Manage user accounts, roles, access statuses, and credential resets within your department."
      >
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition flex items-center gap-1.5 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>Provision User</span>
        </button>
      </PageHeader>

      {/* Alert Messages */}
      {msg && (
        <div
          className={`p-4 rounded-[var(--radius-md)] flex items-center justify-between text-xs font-semibold ${
            msg.type === "success"
              ? "bg-[#82c341]/15 text-[#2e5914] border border-[#82c341]/40"
              : "bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5]"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--font-color)]" />
          <input
            type="text"
            placeholder="Search by name, email, employee code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Roles</option>
            <option value="FACULTY">Faculty / Teacher</option>
            <option value="HOD">Head of Department</option>
            <option value="STUDENT">Student</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#45525b] text-white border-b border-[#3c474f]">
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">User Account</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Role</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Employee Code</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Enrolled / Created</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    Loading department users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    No department users found matching the query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--background-color)]/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[var(--title-color)]">{item.full_name}</div>
                      <div className="text-[11px] text-[var(--font-color)] font-mono">{item.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#45525b]/10 text-[#45525b]">
                        {item.role_name?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--paragraph-color)] font-mono">
                      {item.employee_code || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.is_active
                            ? "bg-[#82c341]/20 text-[#2e5914]"
                            : "bg-[#fee2e2] text-[#991b1b]"
                        }`}
                      >
                        {item.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--paragraph-color)]">
                      {new Date(item.created_at || "").toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleResetPassword(item)}
                          title="Reset Password"
                          className="p-1.5 text-[var(--paragraph-color)] hover:text-[#d97706] hover:bg-[var(--background-color)] rounded-[var(--radius-sm)] transition"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item)}
                          title={item.is_active ? "Deactivate User" : "Activate User"}
                          className={`p-1.5 rounded-[var(--radius-sm)] transition ${
                            item.is_active
                              ? "text-[var(--paragraph-color)] hover:text-[#e53e3e] hover:bg-[var(--background-color)]"
                              : "text-[#82c341] hover:bg-[var(--background-color)]"
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Provision Department User</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Full Name <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Alex Mercer"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Email Address <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. amercer@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Employee Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CS-FAC-019"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    placeholder="Default: Admin@12345"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--paragraph-color)] hover:bg-[var(--background-color)] rounded-[var(--radius-md)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
                >
                  {saving ? "Provisioning..." : "Provision User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Password Reset Display */}
      {credResetData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Credentials Reset</h3>
              </div>
              <button onClick={() => setCredResetData(null)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[var(--paragraph-color)]">
                A temporary password has been generated for{" "}
                <span className="font-bold text-[var(--title-color)]">{credResetData.full_name}</span>. Provide this password to the faculty member.
              </p>

              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[var(--font-color)] uppercase font-mono">Temporary Password</div>
                  <div className="font-mono text-base font-bold text-[var(--title-color)]">
                    {credResetData.temporary_password}
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(credResetData.temporary_password);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] flex items-center gap-1 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
                <button
                  onClick={() => setCredResetData(null)}
                  className="px-4 py-2 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
