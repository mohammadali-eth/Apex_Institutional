"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Building2,
  Shield,
  KeyRound,
  Eye,
  Mail,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleBadge, Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { User } from "@/lib/types";

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const { success, error } = useToast();

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<User[]>("/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      error(err?.message || "Failed to load platform users.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userToToggle: User) => {
    setIsToggling(true);
    try {
      const updated = await api.put<User>(`/users/${userToToggle.id}`, {
        is_active: !userToToggle.is_active,
      });
      success(`User account "${userToToggle.full_name}" is now ${updated.is_active ? "active" : "deactivated"}.`);
      setSelectedUser(updated);
      loadUsers();
    } catch (err: any) {
      error(err?.message || "Failed to update user status.");
    } finally {
      setIsToggling(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.organization_name && u.organization_name.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = roleFilter === "ALL" || u.role_name === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Users Directory"
        subtitle="Cross-tenant identity and role assignment overview across all universities"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users" }]}
      />

      {/* Filter / Search Controls */}
      <div className="card-theme p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#838383]" />
          <input
            type="text"
            placeholder="Search by user name, email, or institution..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-theme w-full pl-9"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--title-color)]">
            <Filter className="w-3.5 h-3.5 text-[#838383]" />
            <span>Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-theme text-xs py-1.5"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="SUPER_ADMIN">Super Admins</option>
            <option value="UNIVERSITY_ADMIN">University Admins</option>
            <option value="INSTITUTION_ADMIN">Institution Admins</option>
            <option value="HOD">Heads of Department (HOD)</option>
            <option value="TEACHER">Teachers & Faculty</option>
            <option value="STUDENT">Students</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-theme overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-muted)] text-[var(--title-color)] uppercase tracking-wider font-bold border-b border-[var(--border-color)]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Organization / University</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted-text-color)]">
                    <div className="w-6 h-6 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading users directory...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted-text-color)]">
                    No users match your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--surface-muted)]/50 transition">
                    <td className="py-3.5 px-4 font-bold text-[var(--title-color)]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--secondary-color)] text-[#82c341] font-bold text-xs flex items-center justify-center shrink-0">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{u.full_name}</div>
                          <div className="font-mono text-[11px] text-[var(--muted-text-color)] font-normal">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <RoleBadge role={u.role_name} />
                    </td>
                    <td className="py-3.5 px-4 text-[var(--paragraph-color)]">
                      {u.organization_name ? (
                        <span className="font-medium text-[var(--title-color)]">{u.organization_name}</span>
                      ) : (
                        <span className="text-[var(--muted-text-color)] italic">Global System Scope</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--paragraph-color)]">
                      {u.department_name || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#eaf5de] text-[#325816] border border-[#82c341]">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--muted-text-color)]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title="User Account Details"
        subtitle={`System ID: ${selectedUser?.id}`}
        maxWidth="md"
      >
        {selectedUser && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
              <div className="w-10 h-10 rounded-full bg-[var(--secondary-color)] text-[#82c341] font-bold text-base flex items-center justify-center">
                {selectedUser.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--title-color)]">{selectedUser.full_name}</h4>
                <p className="font-mono text-[var(--muted-text-color)]">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded border border-[var(--border-color)]">
                <span className="text-[var(--muted-text-color)] block mb-1">Platform Role</span>
                <RoleBadge role={selectedUser.role_name} />
              </div>

              <div className="p-3 bg-white rounded border border-[var(--border-color)]">
                <span className="text-[var(--muted-text-color)] block mb-1">Status</span>
                <span className="font-bold text-[var(--title-color)]">
                  {selectedUser.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white rounded border border-[var(--border-color)] space-y-2">
              <div>
                <span className="text-[var(--muted-text-color)] block">Organization:</span>
                <span className="font-bold text-[var(--title-color)]">
                  {selectedUser.organization_name || "Platform-level Super Admin Scope"}
                </span>
              </div>
              {selectedUser.department_name && (
                <div>
                  <span className="text-[var(--muted-text-color)] block">Department:</span>
                  <span className="font-bold text-[var(--title-color)]">
                    {selectedUser.department_name}
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="font-bold text-[var(--title-color)] block mb-1.5">
                Granted Permissions ({selectedUser.permissions?.length || 0}):
              </span>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 bg-[var(--surface-muted)] rounded border border-[var(--border-color)]">
                {selectedUser.permissions?.map((p) => (
                  <span
                    key={p}
                    className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-[var(--border-color)] text-[var(--title-color)]"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              {selectedUser.role_name !== "SUPER_ADMIN" ? (
                <button
                  type="button"
                  disabled={isToggling}
                  onClick={() => handleToggleUserStatus(selectedUser)}
                  className={`text-xs px-3 py-1.5 rounded font-bold transition flex items-center gap-1.5 ${
                    selectedUser.is_active
                      ? "bg-[#fee2e2] text-[#991b1b] hover:bg-[#fca5a5]/30 border border-[#fca5a5]"
                      : "bg-[#eaf5de] text-[#325816] hover:bg-[#d5edc0] border border-[#82c341]"
                  }`}
                >
                  {isToggling ? (
                    <span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                  ) : null}
                  <span>{selectedUser.is_active ? "Deactivate Account" : "Activate Account"}</span>
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
