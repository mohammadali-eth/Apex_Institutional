"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { ReadinessItem, ExaminationItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  CheckSquare,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Edit2,
  RefreshCw,
  X,
  FileCheck,
} from "lucide-react";

export default function ReadinessChecklistPage() {
  const searchParams = useSearchParams();
  const initialExamId = searchParams.get("examination_id") || "ALL";

  const [items, setItems] = useState<ReadinessItem[]>([]);
  const [exams, setExams] = useState<ExaminationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState(initialExamId);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Edit modal
  const [editingItem, setEditingItem] = useState<ReadinessItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>("COMPLETED");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const examList = await api.get<ExaminationItem[]>("/coordinator/examinations");
      setExams(examList || []);

      let url = "/coordinator/checklist";
      const params = new URLSearchParams();
      if (examFilter !== "ALL") params.append("examination_id", examFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const checklistData = await api.get<ReadinessItem[]>(url);
      setItems(checklistData || []);
    } catch (err) {
      console.error("Error loading checklist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [examFilter, categoryFilter]);

  const openEditModal = (item: ReadinessItem) => {
    setEditingItem(item);
    setNewStatus(item.status);
    setNotes(item.notes || "");
    setActionError(null);
    setActionSuccess(null);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await api.put(`/coordinator/checklist/${editingItem.id}`, {
        status: newStatus,
        notes: notes.trim() || undefined,
      });

      setActionSuccess("Checklist item updated successfully.");
      setTimeout(() => {
        setEditingItem(null);
        fetchData();
      }, 1000);
    } catch (err: any) {
      setActionError(err?.message || "Failed to update checklist item. Please check prerequisites.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalRequired = items.filter((i) => i.is_required).length;
  const completedRequired = items.filter((i) => i.is_required && i.status === "COMPLETED").length;
  const blockedCount = items.filter((i) => i.status === "BLOCKED").length;
  const pct = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination Readiness Checklist"
        description="Verify pre-flight milestones across paper approvals, venue logistics, seating charts, and chief superintendent sign-offs."
        actions={
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--title-color)] hover:border-[#82c341] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Overview Metric Banner */}
      <div className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--title-color)]">Operational Readiness Progress</h3>
            <Badge variant={pct === 100 && blockedCount === 0 ? "success" : blockedCount > 0 ? "danger" : "outline"}>
              {pct === 100 && blockedCount === 0 ? "READY FOR EXAMINATION" : blockedCount > 0 ? "BLOCKED ITEMS DETECTED" : "MILESTONES IN PROGRESS"}
            </Badge>
          </div>
          <p className="text-xs text-[var(--paragraph-color)]">
            {completedRequired} of {totalRequired} mandatory requirements fulfilled ({pct}% complete)
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-64">
          <div className="flex-1 h-3 bg-[var(--background-color)] rounded-full overflow-hidden border border-[var(--border-color)]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                blockedCount > 0 ? "bg-red-500" : pct === 100 ? "bg-emerald-500" : "bg-[#82c341]"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-bold text-[var(--title-color)]">{pct}%</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[var(--font-color)]" />
          <span className="text-xs font-medium text-[var(--font-color)]">Exam:</span>
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Assigned Examinations</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.code} - {ex.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-[var(--font-color)]">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Categories</option>
            <option value="QUESTION_PAPER">Question Paper Readiness</option>
            <option value="SCHEDULING">Scheduling Readiness</option>
            <option value="OPERATIONAL">Operational Readiness</option>
            <option value="FINAL">Final Superintendent Sign-off</option>
          </select>
        </div>
      </div>

      {/* Checklist Items Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--font-color)] animate-pulse">
            Loading checklist milestones...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="w-8 h-8 text-[var(--font-color)] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[var(--title-color)]">No Checklist Items</h3>
            <p className="text-xs text-[var(--paragraph-color)] mt-1">
              No checklist records found for the selected examination and category.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--background-color)] border-b border-[var(--border-color)] text-[var(--font-color)] uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Milestone Requirement</th>
                  <th className="px-4 py-3">Mandatory</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Updated</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="px-4 py-3">
                      <Badge variant="outline">{it.category.replace("_", " ")}</Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-[var(--title-color)]">{it.title}</div>
                      {it.description && (
                        <div className="text-[11px] text-[var(--paragraph-color)] mt-0.5 max-w-md">
                          {it.description}
                        </div>
                      )}
                      {it.notes && (
                        <div className="text-[10px] text-amber-800 bg-amber-50/50 px-2 py-0.5 rounded mt-1 border border-amber-200 inline-block">
                          Note: {it.notes}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {it.is_required ? (
                        <span className="font-bold text-red-600 text-[10px] uppercase">Mandatory</span>
                      ) : (
                        <span className="text-[var(--font-color)] text-[10px] uppercase">Optional</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          it.status === "COMPLETED"
                            ? "success"
                            : it.status === "BLOCKED"
                            ? "danger"
                            : it.status === "IN_PROGRESS"
                            ? "warning"
                            : "default"
                        }
                      >
                        {it.status.replace("_", " ")}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-[11px] text-[var(--paragraph-color)]">
                      {it.updated_at ? (
                        <div>
                          <span>{new Date(it.updated_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                          {it.updated_by_name && <div className="text-[10px] text-[var(--font-color)]">{it.updated_by_name}</div>}
                        </div>
                      ) : (
                        "Pending review"
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(it)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--background-color)] border border-[var(--border-color)] hover:border-[#82c341] text-[var(--title-color)] transition"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Update</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--background-color)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">Update Checklist Milestone</h3>
                <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">{editingItem.title}</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="p-1 text-[var(--font-color)] hover:text-[var(--title-color)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="p-5 space-y-4 text-xs">
              {actionSuccess && (
                <div className="p-3 rounded-[var(--radius-md)] bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>{actionError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Checklist Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="NOT_APPLICABLE">Not Applicable</option>
                </select>
                <p className="text-[10px] text-[var(--font-color)] mt-1">
                  Note: Pre-flight validation prevents marking official question paper approvals complete if the paper has not been signed off by the Exam Controller.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Verification Notes / Evidence
                </label>
                <textarea
                  rows={3}
                  placeholder="Record verification notes, room inspection, or blockers..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--title-color)] hover:bg-[var(--background-color)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] font-semibold"
                >
                  {submitting ? "Saving..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
