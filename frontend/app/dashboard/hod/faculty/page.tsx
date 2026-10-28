"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HODFacultyItem, HODSubjectItem, StaffCredentialResetResponse } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Users,
  Plus,
  Search,
  BookOpen,
  Key,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  Power,
} from "lucide-react";

export default function HODFacultyPage() {
  const [faculty, setFaculty] = useState<HODFacultyItem[]>([]);
  const [subjects, setSubjects] = useState<HODSubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("ALL");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<HODFacultyItem | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [credResetData, setCredResetData] = useState<StaffCredentialResetResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<HODFacultyItem[]>("/hod/faculty"),
      api.get<HODSubjectItem[]>("/hod/subjects"),
    ])
      .then(([fList, sList]) => {
        setFaculty(fList || []);
        setSubjects(sList || []);
      })
      .catch((err) => {
        console.error("Error loading HOD faculty:", err);
        setMsg({ type: "error", text: "Failed to load department faculty." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.post<HODFacultyItem>("/hod/faculty", {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        employee_code: employeeCode.trim() || null,
        subject_ids: selectedSubjectIds,
        password: password.trim() || null,
        is_active: true,
      });
      setMsg({ type: "success", text: "Faculty member added successfully." });
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to add faculty member." });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.put<HODFacultyItem>(`/hod/faculty/${selectedFaculty.id}`, {
        full_name: fullName.trim(),
        employee_code: employeeCode.trim() || null,
      });
      setMsg({ type: "success", text: "Faculty profile updated successfully." });
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSubjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.post(`/hod/faculty/${selectedFaculty.id}/assign-subjects`, {
        subject_ids: selectedSubjectIds,
      });
      setMsg({ type: "success", text: "Subject assignments saved successfully." });
      setShowAssignModal(false);
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to assign subjects." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: HODFacultyItem) => {
    if (!confirm(`Are you sure you want to ${item.is_active ? "deactivate" : "activate"} ${item.full_name}?`)) {
      return;
    }
    try {
      await api.put(`/hod/faculty/${item.id}`, {
        is_active: !item.is_active,
      });
      setMsg({
        type: "success",
        text: `Faculty ${!item.is_active ? "activated" : "deactivated"} successfully.`,
      });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to change status." });
    }
  };

  const handleResetPassword = async (item: HODFacultyItem) => {
    if (!confirm(`Reset credentials for ${item.full_name} (${item.email})? A temporary password will be generated.`)) {
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
    setPhone("");
    setEmployeeCode("");
    setPassword("");
    setSelectedSubjectIds([]);
  };

  const openEditModal = (item: HODFacultyItem) => {
    setSelectedFaculty(item);
    setFullName(item.full_name);
    setEmployeeCode(item.employee_code || "");
    setShowEditModal(true);
  };

  const openAssignModal = (item: HODFacultyItem) => {
    setSelectedFaculty(item);
    setSelectedSubjectIds(item.assigned_subjects?.map((s) => s.id) || []);
    setShowAssignModal(true);
  };

  const filteredFaculty = faculty.filter((f) => {
    const matchesSearch =
      f.full_name.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase()) ||
      (f.employee_code && f.employee_code.toLowerCase().includes(search.toLowerCase()));

    if (filterActive === "ACTIVE") return matchesSearch && f.is_active;
    if (filterActive === "INACTIVE") return matchesSearch && !f.is_active;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Faculty Management"
        subtitle="Provision teachers, map course assignments, oversee question authoring, and manage credentials."
      >
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition flex items-center gap-1.5 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>Add Faculty</span>
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
            placeholder="Search by name, email, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#45525b] text-white border-b border-[#3c474f]">
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Faculty Member</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Employee Code</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Assigned Courses</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Questions Banked</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    Loading department faculty roster...
                  </td>
                </tr>
              ) : filteredFaculty.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    No faculty found matching the query.
                  </td>
                </tr>
              ) : (
                filteredFaculty.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--background-color)]/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[var(--title-color)]">{item.full_name}</div>
                      <div className="text-[11px] text-[var(--font-color)] font-mono">{item.email}</div>
                    </td>
                    <td className="py-3 px-4 text-[var(--paragraph-color)] font-mono">
                      {item.employee_code || "—"}
                    </td>
                    <td className="py-3 px-4">
                      {item.assigned_subjects && item.assigned_subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.assigned_subjects.map((sub) => (
                            <span
                              key={sub.id}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#82c341]/15 text-[#2e5914] border border-[#82c341]/30 font-semibold"
                            >
                              {sub.code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--font-color)] italic">None assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--title-color)]">
                      {item.questions_count}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.is_active
                            ? "bg-[#82c341]/20 text-[#2e5914]"
                            : "bg-[#fee2e2] text-[#991b1b]"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openAssignModal(item)}
                          title="Assign Course Subjects"
                          className="p-1.5 text-[var(--paragraph-color)] hover:text-[#82c341] hover:bg-[var(--background-color)] rounded-[var(--radius-sm)] transition"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          title="Edit Faculty Info"
                          className="p-1.5 text-[var(--paragraph-color)] hover:text-[#45525b] hover:bg-[var(--background-color)] rounded-[var(--radius-sm)] transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(item)}
                          title="Reset Credentials"
                          className="p-1.5 text-[var(--paragraph-color)] hover:text-[#d97706] hover:bg-[var(--background-color)] rounded-[var(--radius-sm)] transition"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item)}
                          title={item.is_active ? "Deactivate Account" : "Activate Account"}
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

      {/* Modal: Add Faculty Member */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Add Department Faculty</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFaculty} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Full Name <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Smith"
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
                  placeholder="e.g. jsmith@university.edu"
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
                    placeholder="e.g. CS-FAC-014"
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

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Assign Course Subjects
                </label>
                <div className="max-h-36 overflow-y-auto border border-[var(--border-color)] rounded-[var(--radius-md)] p-2 space-y-1 bg-[var(--background-color)]">
                  {subjects.length === 0 ? (
                    <p className="text-[11px] text-[var(--font-color)]">No courses found in department.</p>
                  ) : (
                    subjects.map((sub) => {
                      const isChecked = selectedSubjectIds.includes(sub.id);
                      return (
                        <label
                          key={sub.id}
                          className="flex items-center gap-2 p-1 text-xs hover:bg-[var(--surface-color)] rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSubjectIds([...selectedSubjectIds, sub.id]);
                              } else {
                                setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== sub.id));
                              }
                            }}
                            className="rounded border-[var(--border-color)] text-[#82c341] focus:ring-[#82c341]"
                          />
                          <span className="font-mono font-bold text-[11px] text-[var(--title-color)]">
                            {sub.code}
                          </span>
                          <span className="text-[11px] text-[var(--paragraph-color)] truncate">
                            {sub.name}
                          </span>
                        </label>
                      );
                    })
                  )}
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
                  {saving ? "Adding..." : "Add Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Faculty */}
      {showEditModal && selectedFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Edit Faculty Profile</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateFaculty} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Full Name <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Employee Code
                </label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--paragraph-color)] hover:bg-[var(--background-color)] rounded-[var(--radius-md)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Course Subjects */}
      {showAssignModal && selectedFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Assign Subjects: {selectedFaculty.full_name}</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubjects} className="p-6 space-y-4">
              <p className="text-xs text-[var(--paragraph-color)]">
                Select courses in this department that this faculty member is authorized to manage and author questions for.
              </p>

              <div className="max-h-56 overflow-y-auto border border-[var(--border-color)] rounded-[var(--radius-md)] p-2 space-y-1 bg-[var(--background-color)]">
                {subjects.length === 0 ? (
                  <p className="text-[11px] text-[var(--font-color)]">No courses found in department.</p>
                ) : (
                  subjects.map((sub) => {
                    const isChecked = selectedSubjectIds.includes(sub.id);
                    return (
                      <label
                        key={sub.id}
                        className="flex items-center gap-2 p-1.5 text-xs hover:bg-[var(--surface-color)] rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubjectIds([...selectedSubjectIds, sub.id]);
                            } else {
                              setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== sub.id));
                            }
                          }}
                          className="rounded border-[var(--border-color)] text-[#82c341] focus:ring-[#82c341]"
                        />
                        <div>
                          <div className="font-mono font-bold text-[11px] text-[var(--title-color)]">
                            {sub.code} — {sub.name}
                          </div>
                          <div className="text-[10px] text-[var(--font-color)]">
                            {sub.credits} Credits • {sub.units_count} Units
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--paragraph-color)] hover:bg-[var(--background-color)] rounded-[var(--radius-md)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
                >
                  {saving ? "Saving..." : "Save Assignments"}
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
                <span className="font-bold text-[var(--title-color)]">{credResetData.full_name}</span>. Provide this password to the faculty member. They will be prompted to set a new password upon first sign-in.
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
