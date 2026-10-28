"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { UniversityDepartmentItem, StaffUserResponse } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Layers,
  Users,
  BookOpen,
} from "lucide-react";

export default function UniversityDepartmentsPage() {
  const [departments, setDepartments] = useState<UniversityDepartmentItem[]>([]);
  const [hods, setHods] = useState<StaffUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignHODModal, setShowAssignHODModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<UniversityDepartmentItem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [selectedHODId, setSelectedHODId] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<UniversityDepartmentItem[]>("/university-admin/departments"),
      api.get<StaffUserResponse[]>("/university-admin/hods"),
    ])
      .then(([depts, hList]) => {
        setDepartments(depts || []);
        setHods(hList || []);
      })
      .catch((err) => {
        console.error("Error loading departments:", err);
        setMsg({ type: "error", text: "Failed to load departments" });
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
      await api.post("/university-admin/departments", {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        description: formDescription.trim() || null,
        is_active: true,
      });
      setShowAddModal(false);
      setFormName("");
      setFormCode("");
      setFormDescription("");
      setMsg({ type: "success", text: "Department created successfully" });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to create department" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.patch(`/university-admin/departments/${selectedDept.id}`, {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        description: formDescription.trim() || null,
      });
      setShowEditModal(false);
      setSelectedDept(null);
      setMsg({ type: "success", text: "Department updated successfully" });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to update department" });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignHOD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !selectedHODId) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.post(`/university-admin/departments/${selectedDept.id}/assign-hod`, {
        hod_user_id: selectedHODId,
      });
      setShowAssignHODModal(false);
      setSelectedDept(null);
      setSelectedHODId("");
      setMsg({ type: "success", text: "HOD assigned to department successfully" });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to assign HOD" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (dept: UniversityDepartmentItem) => {
    const action = dept.is_active ? "deactivate" : "activate";
    if (dept.is_active && !confirm(`Are you sure you want to deactivate ${dept.name}?`)) {
      return;
    }
    try {
      await api.post(`/university-admin/departments/${dept.id}/${action}`, {});
      setMsg({ type: "success", text: `Department ${action}d successfully` });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || `Failed to ${action} department` });
    }
  };

  const filteredDepts = departments.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.hod_name && d.hod_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments & Academic Units"
        subtitle="Manage academic departments, degree programs, curriculum scope, and appointed Department Heads."
        actions={
          <button
            onClick={() => {
              setFormName("");
              setFormCode("");
              setFormDescription("");
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Department</span>
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
          placeholder="Search by department name, code, or assigned HOD..."
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

      {/* Departments Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--background-color)] rounded animate-pulse" />
            ))}
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Building2 className="w-8 h-8 text-[var(--font-color)] mx-auto opacity-40" />
            <p className="text-xs font-bold text-[var(--title-color)]">No Departments Found</p>
            <p className="text-[11px] text-[var(--paragraph-color)]">
              {search ? "No departments matched your query." : "Click Add Department to create the first unit."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#45525b] text-white uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department Name</th>
                  <th className="py-3 px-4">Head of Department (HOD)</th>
                  <th className="py-3 px-4 text-center">Programs</th>
                  <th className="py-3 px-4 text-center">Subjects</th>
                  <th className="py-3 px-4 text-center">Faculty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredDepts.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#82c341]">
                      {d.code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[var(--title-color)]">{d.name}</p>
                      {d.description && (
                        <p className="text-[10px] text-[var(--paragraph-color)] line-clamp-1">{d.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {d.hod_name ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-[var(--title-color)]">{d.hod_name}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedDept(d);
                            setSelectedHODId("");
                            setShowAssignHODModal(true);
                          }}
                          className="text-[11px] font-bold text-amber-700 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Assign HOD</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[var(--title-color)]">
                      {d.programs_count}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[var(--title-color)]">
                      {d.subjects_count}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[var(--title-color)]">
                      {d.teachers_count}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {d.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedDept(d);
                            setFormName(d.name);
                            setFormCode(d.code);
                            setFormDescription(d.description || "");
                            setShowEditModal(true);
                          }}
                          className="p-1 text-[var(--paragraph-color)] hover:text-[var(--title-color)] hover:bg-[#dcdcdc]/40 rounded"
                          title="Edit Department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(d)}
                          className={`px-2 py-1 text-[10px] font-bold rounded border transition ${
                            d.is_active
                              ? "text-red-700 border-red-300 hover:bg-red-50"
                              : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          }`}
                        >
                          {d.is_active ? "Deactivate" : "Activate"}
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

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] max-w-md w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--title-color)]">Add Academic Department</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--paragraph-color)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Department Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Department of Mechanical Engineering"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Department Code *</label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. MECH"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of academic scope..."
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
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
                  {saving ? "Creating..." : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && selectedDept && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] max-w-md w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--title-color)]">Edit Department</h3>
              <button onClick={() => setShowEditModal(false)} className="text-[var(--paragraph-color)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Department Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Department Code *</label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
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

      {/* Assign HOD Modal */}
      {showAssignHODModal && selectedDept && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] max-w-md w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">Assign Department Head</h3>
                <p className="text-[11px] text-[var(--paragraph-color)]">{selectedDept.name}</p>
              </div>
              <button onClick={() => setShowAssignHODModal(false)} className="text-[var(--paragraph-color)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignHOD} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Select HOD Candidate *</label>
                <select
                  required
                  value={selectedHODId}
                  onChange={(e) => setSelectedHODId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                >
                  <option value="">-- Choose faculty member / HOD --</option>
                  {hods.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.full_name} ({h.email})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[var(--paragraph-color)]">
                  If the candidate is not listed, provision a new HOD account in HOD Management first.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAssignHODModal(false)}
                  className="px-3.5 py-2 text-[var(--paragraph-color)] hover:text-[var(--title-color)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedHODId}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] font-black rounded-[var(--radius-md)] uppercase disabled:opacity-50"
                >
                  {saving ? "Assigning..." : "Assign HOD"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
