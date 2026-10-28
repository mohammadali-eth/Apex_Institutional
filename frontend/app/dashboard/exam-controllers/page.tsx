"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StaffUserResponse, StaffCredentialResetResponse } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  UserCog,
  Plus,
  Search,
  Key,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";

export default function UniversityExamControllersPage() {
  const [controllers, setControllers] = useState<StaffUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedController, setSelectedController] = useState<StaffUserResponse | null>(null);
  const [credResetData, setCredResetData] = useState<StaffCredentialResetResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    api
      .get<StaffUserResponse[]>("/university-admin/exam-controllers")
      .then((data) => setControllers(data || []))
      .catch((err) => {
        console.error("Error loading exam controllers:", err);
        setMsg({ type: "error", text: "Failed to load Exam Controllers." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await api.post<StaffUserResponse>("/university-admin/exam-controllers", {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || null,
        is_active: true,
      });
      setShowAddModal(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setMsg({ type: "success", text: `Exam Controller ${res.full_name} created successfully!` });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to create Exam Controller." });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedController) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.patch(`/university-admin/exam-controllers/${selectedController.id}`, {
        full_name: fullName.trim(),
      });
      setShowEditModal(false);
      setSelectedController(null);
      setMsg({ type: "success", text: "Exam Controller updated successfully." });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to update Exam Controller." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (ctrl: StaffUserResponse) => {
    const action = ctrl.is_active ? "deactivate" : "activate";
    if (ctrl.is_active && !confirm(`Deactivate Exam Controller ${ctrl.full_name}?`)) {
      return;
    }
    try {
      await api.post(`/university-admin/exam-controllers/${ctrl.id}/${action}`, {});
      setMsg({ type: "success", text: `Controller ${action}d successfully.` });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || `Failed to ${action} account.` });
    }
  };

  const handleResetPassword = async (ctrl: StaffUserResponse) => {
    if (!confirm(`Reset credentials for ${ctrl.full_name}?`)) return;
    try {
      const res = await api.post<StaffCredentialResetResponse>(`/university-admin/exam-controllers/${ctrl.id}/reset-credentials`, {});
      setCredResetData(res);
      setCopied(false);
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to reset credentials." });
    }
  };

  const copyCreds = () => {
    if (!credResetData) return;
    const txt = `Email: ${credResetData.email}\nTemporary Password: ${credResetData.temporary_password}`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const filteredControllers = controllers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination Controller Governance"
        subtitle="Manage designated University Examination Controllers authorized to finalize exam blueprints and publish live question papers."
        actions={
          <button
            onClick={() => {
              setFullName("");
              setEmail("");
              setPassword("");
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Exam Controller</span>
          </button>
        }
      />

      {msg && (
        <div
          className={`p-4 rounded-[var(--radius-md)] text-xs flex items-center justify-between ${
            msg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="p-0.5 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-[var(--surface-color)] p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
        <Search className="w-4 h-4 text-[var(--font-color)] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by controller full name or university email address..."
          className="bg-transparent text-xs w-full text-[var(--title-color)] placeholder:text-[var(--font-color)] focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-[var(--paragraph-color)] hover:text-[var(--title-color)] px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Controllers Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--background-color)] rounded animate-pulse" />
            ))}
          </div>
        ) : filteredControllers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <UserCog className="w-8 h-8 text-[var(--font-color)] mx-auto opacity-40" />
            <p className="text-xs font-bold text-[var(--title-color)]">No Exam Controllers Found</p>
            <p className="text-[11px] text-[var(--paragraph-color)]">
              {search
                ? "No exam controllers matched your query."
                : "Click Add Exam Controller to authorize your first examination official."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#45525b] text-white uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Official Name</th>
                  <th className="py-3 px-4">Official Email</th>
                  <th className="py-3 px-4">Executive Scope</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredControllers.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
                          {c.full_name?.charAt(0) || "C"}
                        </div>
                        <span className="font-bold text-[var(--title-color)]">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[var(--paragraph-color)]">
                      {c.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#45525b] text-white">
                        University Board
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[var(--paragraph-color)] font-mono">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedController(c);
                            setFullName(c.full_name);
                            setShowEditModal(true);
                          }}
                          className="p-1 text-[var(--paragraph-color)] hover:text-[var(--title-color)] hover:bg-[#dcdcdc]/40 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(c)}
                          className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(c)}
                          className={`px-2 py-1 text-[10px] font-bold rounded border transition ${
                            c.is_active
                              ? "text-red-700 border-red-300 hover:bg-red-50"
                              : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          }`}
                        >
                          {c.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Controller Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] max-w-md w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--title-color)]">Authorize Exam Controller</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--paragraph-color)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Thomas Sterling"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Official Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="controller@university.edu"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Initial Password (Optional)</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for auto-generated temporary key"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-[var(--paragraph-color)] hover:text-[var(--title-color)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] font-black rounded-[var(--radius-md)] uppercase"
                >
                  {saving ? "Authorizing..." : "Authorize Controller"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Controller Modal */}
      {showEditModal && selectedController && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] max-w-md w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--title-color)]">Edit Controller Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-[var(--paragraph-color)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-2 text-[var(--paragraph-color)] hover:text-[var(--title-color)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] font-black rounded-[var(--radius-md)] uppercase"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credential Reset Dialog */}
      {credResetData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] max-w-md w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">New Credentials Issued</h3>
                <p className="text-[11px] text-[var(--paragraph-color)]">{credResetData.full_name}</p>
              </div>
            </div>

            <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-[var(--font-color)] block uppercase">Email</span>
                <span className="font-bold text-[var(--title-color)]">{credResetData.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--font-color)] block uppercase">Temporary Password</span>
                <span className="font-bold text-[#82c341] text-sm">{credResetData.temporary_password}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={copyCreds}
                className="px-3.5 py-2 bg-[var(--background-color)] hover:bg-[#dcdcdc]/40 text-[var(--title-color)] text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy Credentials"}</span>
              </button>
              <button
                onClick={() => setCredResetData(null)}
                className="px-4 py-2 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
