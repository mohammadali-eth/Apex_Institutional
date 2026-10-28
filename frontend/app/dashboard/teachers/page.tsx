"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StaffUserResponse, UniversityDepartmentItem, Subject, StaffCredentialResetResponse } from "@/lib/types";
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
} from "lucide-react";

export default function UniversityTeachersPage() {
  const [teachers, setTeachers] = useState<StaffUserResponse[]>([]);
  const [departments, setDepartments] = useState<UniversityDepartmentItem[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("ALL");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<StaffUserResponse | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [credResetData, setCredResetData] = useState<StaffCredentialResetResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<StaffUserResponse[]>("/university-admin/teachers"),
      api.get<UniversityDepartmentItem[]>("/university-admin/departments"),
      api.get<Subject[]>("/academic/subjects"),
    ])
      .then(([tList, dList, sList]) => {
        setTeachers(tList || []);
        setDepartments(dList || []);
        setAllSubjects(sList || []);
      })
      .catch((err) => {
        console.error("Error loading teachers:", err);
        setMsg({ type: "error", text: "Failed to load faculty roster." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await api.post<StaffUserResponse>("/university-admin/teachers", {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        department_id: departmentId,
        subject_ids: selectedSubjectIds,
        password: password.trim() || null,
        is_active: true,
      });
      setShowAddModal(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setDepartmentId("");
      setSelectedSubjectIds([]);
      setMsg({ type: "success", text: `Faculty account for ${res.full_name} created successfully!` });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to create faculty account." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSubjectAssignments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.post(`/university-admin/teachers/${selectedTeacher.id}/assign-subjects`, {
        subject_ids: selectedSubjectIds,
      });
      setShowAssignModal(false);
      setSelectedTeacher(null);
      setSelectedSubjectIds([]);
      setMsg({ type: "success", text: "Course subjects assigned successfully." });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to assign course subjects." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (teacher: StaffUserResponse) => {
    const action = teacher.is_active ? "deactivate" : "activate";
    if (teacher.is_active && !confirm(`Deactivate faculty account for ${teacher.full_name}?`)) {
      return;
    }
    try {
      await api.post(`/university-admin/teachers/${teacher.id}/${action}`, {});
      setMsg({ type: "success", text: `Account ${action}d successfully.` });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || `Failed to ${action} account.` });
    }
  };

  const handleResetPassword = async (teacher: StaffUserResponse) => {
    if (!confirm(`Reset credentials for ${teacher.full_name}?`)) return;
    try {
      const res = await api.post<StaffCredentialResetResponse>(`/university-admin/teachers/${teacher.id}/reset-credentials`, {});
      setCredResetData(res);
      setCopied(false);
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to reset credentials." });
    }
  };

  const toggleSubjectSelect = (subId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const copyCreds = () => {
    if (!credResetData) return;
    const txt = `Email: ${credResetData.email}\nTemporary Password: ${credResetData.temporary_password}`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const filteredTeachers = teachers.filter((t) => {
    if (selectedDeptId !== "ALL" && t.department_id !== selectedDeptId) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.full_name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.assigned_subjects?.some((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher & Faculty Management"
        subtitle="Provision faculty members, assign departments, and configure teaching workload and course subject mappings."
        actions={
          <button
            onClick={() => {
              setFullName("");
              setEmail("");
              setPassword("");
              setDepartmentId(departments[0]?.id || "");
              setSelectedSubjectIds([]);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Faculty Member</span>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface-color)] p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-[var(--font-color)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by faculty name, email, or assigned course code..."
            className="bg-transparent text-xs w-full text-[var(--title-color)] placeholder:text-[var(--font-color)] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--paragraph-color)] shrink-0 font-bold">Department:</span>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-[var(--background-color)] border border-[var(--border-color)] rounded-[var(--radius-md)] text-[var(--title-color)]"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--background-color)] rounded animate-pulse" />
            ))}
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-[var(--font-color)] mx-auto opacity-40" />
            <p className="text-xs font-bold text-[var(--title-color)]">No Faculty Members Found</p>
            <p className="text-[11px] text-[var(--paragraph-color)]">
              {search || selectedDeptId !== "ALL"
                ? "No faculty matched the filter criteria."
                : "Click Add Faculty Member to register your first teacher."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#45525b] text-white uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Faculty Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Assigned Course Subjects</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center shrink-0">
                          {t.full_name?.charAt(0) || "T"}
                        </div>
                        <span className="font-bold text-[var(--title-color)]">{t.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[var(--paragraph-color)]">
                      {t.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#dcdcdc]/40 text-[var(--title-color)]">
                        {t.department_name || "Unassigned"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {t.assigned_subjects && t.assigned_subjects.length > 0 ? (
                          t.assigned_subjects.map((sub) => (
                            <span
                              key={sub.id}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#82c341]/15 text-[#325816]"
                              title={sub.name}
                            >
                              {sub.code}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-[var(--font-color)] italic">None Assigned</span>
                        )}
                        <button
                          onClick={() => {
                            setSelectedTeacher(t);
                            setSelectedSubjectIds(t.assigned_subjects?.map((s) => s.id) || []);
                            setShowAssignModal(true);
                          }}
                          className="text-[10px] font-bold text-[#82c341] hover:underline ml-1"
                        >
                          + Edit
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {t.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResetPassword(t)}
                          className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(t)}
                          className={`px-2 py-1 text-[10px] font-bold rounded border transition ${
                            t.is_active
                              ? "text-red-700 border-red-300 hover:bg-red-50"
                              : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          }`}
                        >
                          {t.is_active ? "Deactivate" : "Activate"}
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

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] max-w-lg w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--title-color)]">Register Faculty Instructor</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--paragraph-color)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Alan Turing"
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
                  placeholder="aturing@university.edu"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Department *</label>
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                >
                  <option value="">-- Choose department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
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

              {/* Assign Course Subjects */}
              <div className="space-y-1 pt-1">
                <label className="font-bold text-[var(--title-color)]">Teaching Subjects</label>
                <div className="max-h-36 overflow-y-auto border border-[var(--border-color)] rounded-[var(--radius-md)] p-2 space-y-1 bg-[var(--background-color)]">
                  {allSubjects.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-[var(--surface-color)] rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjectIds.includes(s.id)}
                        onChange={() => toggleSubjectSelect(s.id)}
                        className="w-3.5 h-3.5 text-[#82c341] rounded"
                      />
                      <span className="font-mono font-bold text-[#82c341]">{s.code}</span>
                      <span className="text-[var(--title-color)] truncate">{s.name}</span>
                    </label>
                  ))}
                </div>
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
                  disabled={saving || !departmentId}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] font-black rounded-[var(--radius-md)] uppercase disabled:opacity-50"
                >
                  {saving ? "Registering..." : "Register Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Subjects Modal */}
      {showAssignModal && selectedTeacher && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] max-w-md w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">Configure Course Assignments</h3>
                <p className="text-[11px] text-[var(--paragraph-color)]">{selectedTeacher.full_name}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-[var(--paragraph-color)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubjectAssignments} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Select Authorized Subjects</label>
                <div className="max-h-52 overflow-y-auto border border-[var(--border-color)] rounded-[var(--radius-md)] p-2 space-y-1 bg-[var(--background-color)]">
                  {allSubjects.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-[var(--surface-color)] rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjectIds.includes(s.id)}
                        onChange={() => toggleSubjectSelect(s.id)}
                        className="w-3.5 h-3.5 text-[#82c341] rounded"
                      />
                      <span className="font-mono font-bold text-[#82c341]">{s.code}</span>
                      <span className="text-[var(--title-color)] truncate">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3.5 py-2 text-[var(--paragraph-color)] hover:text-[var(--title-color)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] font-black rounded-[var(--radius-md)] uppercase"
                >
                  {saving ? "Saving..." : "Save Assignments"}
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
