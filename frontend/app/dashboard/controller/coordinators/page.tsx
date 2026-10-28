"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ControllerCoordinatorAssignmentItem, ControllerExamItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  Users,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  CalendarDays,
  Clock,
  ShieldCheck,
  X,
  Building2,
  UserCheck,
} from "lucide-react";

export default function ControllerCoordinatorsPage() {
  const [coordinators, setCoordinators] = useState<ControllerCoordinatorAssignmentItem[]>([]);
  const [examinations, setExaminations] = useState<ControllerExamItem[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignForm, setAssignForm] = useState({
    user_id: "",
    examination_id: "",
    department_id: "",
    can_edit_schedule: false,
  });

  const fetchCoordinators = () => {
    setLoading(true);
    api
      .get<ControllerCoordinatorAssignmentItem[]>("/controller/coordinators")
      .then((data) => setCoordinators(data || []))
      .catch((err) => console.error("Error loading coordinators:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCoordinators();
    api.get<ControllerExamItem[]>("/controller/examinations").then((res) => setExaminations(res || [])).catch(() => {});
    api.get<any[]>("/departments").then((res) => setDepartments(res || [])).catch(() => {});
  }, []);

  const openAssignModal = (prefillUserId?: string) => {
    setAssignForm({
      user_id: prefillUserId || (coordinators[0]?.user_id || ""),
      examination_id: examinations[0]?.id || "",
      department_id: "",
      can_edit_schedule: false,
    });
    setAssignModalOpen(true);
  };

  const handleAssignCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.user_id) return;
    setSubmitting(true);
    try {
      await api.post("/controller/coordinators/assign", {
        user_id: assignForm.user_id,
        examination_id: assignForm.examination_id || undefined,
        department_id: assignForm.department_id || undefined,
        can_edit_schedule: assignForm.can_edit_schedule,
      });
      setAssignModalOpen(false);
      fetchCoordinators();
    } catch (err: any) {
      alert(err.message || "Failed to assign coordinator.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to deactivate this coordinator assignment?")) return;
    try {
      await api.delete(`/controller/coordinators/${assignmentId}`);
      fetchCoordinators();
    } catch (err: any) {
      alert(err.message || "Failed to remove assignment.");
    }
  };

  // Distinct users for dropdown
  const distinctUsers = Array.from(
    new Map(coordinators.map((c) => [c.user_id, { id: c.user_id, name: c.user_name, email: c.user_email }])).values()
  );

  const filteredCoordinators = coordinators.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        c.user_name.toLowerCase().includes(q) ||
        c.user_email.toLowerCase().includes(q) ||
        (c.examination_name && c.examination_name.toLowerCase().includes(q)) ||
        (c.department_name && c.department_name.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Coordinator Management"
        description="Assign and supervise departmental exam coordinators. Delegate timetable modification rights and operational checklist supervision."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchCoordinators()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--font-color)] hover:text-[var(--title-color)] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => openAssignModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition font-bold shadow-[var(--shadow-sm)]"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Scope</span>
            </button>
          </div>
        }
      />

      {/* Search Bar */}
      <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--font-color)]" />
          <input
            type="text"
            placeholder="Search coordinators by name, email, or exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>
        <div className="text-xs text-[var(--font-color)]">
          Total active records: <span className="font-bold text-[var(--title-color)]">{filteredCoordinators.length}</span>
        </div>
      </div>

      {/* Coordinators List / Table */}
      {loading ? (
        <div className="p-8 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <div className="w-8 h-8 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--font-color)]">Loading coordinators...</p>
        </div>
      ) : filteredCoordinators.length === 0 ? (
        <div className="p-12 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <Users className="w-10 h-10 text-[var(--font-color)] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[var(--title-color)] mb-1">No Coordinators Found</h3>
          <p className="text-xs text-[var(--font-color)] max-w-sm mx-auto mb-4">
            Provision or assign coordinator roles to delegate examination management.
          </p>
          <button
            onClick={() => openAssignModal()}
            className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000]"
          >
            Assign Scope
          </button>
        </div>
      ) : (
        <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--background-color)] text-[var(--font-color)] font-semibold">
                  <th className="p-3.5">Coordinator</th>
                  <th className="p-3.5">Assigned Examination / Scope</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5 text-center">Schedule Privilege</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredCoordinators.map((c) => {
                  const isUnassignedPlaceholder = c.id.startsWith("unassigned-");
                  return (
                    <tr key={c.id} className="hover:bg-[var(--background-color)]/50 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-[var(--title-color)]">{c.user_name}</div>
                        <div className="text-[11px] text-[var(--font-color)]">{c.user_email}</div>
                      </td>
                      <td className="p-3.5">
                        {c.examination_name ? (
                          <div>
                            <span className="font-semibold text-[var(--title-color)]">
                              {c.examination_code}: {c.examination_name}
                            </span>
                            <span className="block text-[10px] text-[var(--font-color)]">Examination Scope</span>
                          </div>
                        ) : c.department_name ? (
                          <div>
                            <span className="font-semibold text-[var(--title-color)]">{c.department_name}</span>
                            <span className="block text-[10px] text-[var(--font-color)]">Full Department Scope</span>
                          </div>
                        ) : (
                          <span className="text-[var(--font-color)] italic">No specific exam assigned</span>
                        )}
                      </td>
                      <td className="p-3.5 text-[var(--font-color)]">
                        {c.department_name || "General"}
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge variant={c.can_edit_schedule ? "success" : "outline"} size="sm">
                          {c.can_edit_schedule ? "Can Edit Timetable" : "Read-Only"}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge variant={isUnassignedPlaceholder ? "outline" : "default"} size="sm">
                          {isUnassignedPlaceholder ? "Available" : "Active Assignment"}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        {isUnassignedPlaceholder ? (
                          <button
                            onClick={() => openAssignModal(c.user_id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38]"
                          >
                            Assign Scope
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRemoveAssignment(c.id)}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition"
                            title="Deactivate Assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ASSIGN COORDINATOR MODAL */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md p-6 shadow-[var(--shadow-lg)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">Assign Coordinator Scope</h3>
                <p className="text-xs text-[var(--font-color)]">Link a coordinator to an examination or department.</p>
              </div>
              <button onClick={() => setAssignModalOpen(false)} className="text-[var(--font-color)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignCoordinator} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Select Coordinator User *</label>
                <select
                  required
                  value={assignForm.user_id}
                  onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                >
                  {distinctUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Examination Scope</label>
                <select
                  value={assignForm.examination_id}
                  onChange={(e) => setAssignForm({ ...assignForm, examination_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                >
                  <option value="">None (Assign to Entire Department)</option>
                  {examinations.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.code} - {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Department Scope (Optional)</label>
                <select
                  value={assignForm.department_id}
                  onChange={(e) => setAssignForm({ ...assignForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                >
                  <option value="">Default to Examination's Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-[var(--title-color)] font-medium">
                  <input
                    type="checkbox"
                    checked={assignForm.can_edit_schedule}
                    onChange={(e) => setAssignForm({ ...assignForm, can_edit_schedule: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border-color)] text-[#82c341] focus:ring-[#82c341]"
                  />
                  <span>Grant Timetable Modification Privileges (Can Edit Schedule)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--font-color)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] font-bold hover:bg-[#72ad38] disabled:opacity-50"
                >
                  {submitting ? "Assigning..." : "Assign Scope"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
