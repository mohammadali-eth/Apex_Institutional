"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { OperationalIssueItem, ExaminationItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  AlertTriangle,
  Plus,
  Filter,
  ShieldAlert,
  Clock,
  CheckCircle2,
  RefreshCw,
  X,
  Send,
  ArrowUpRight,
} from "lucide-react";

export default function IssuesAndEscalationsPage() {
  const searchParams = useSearchParams();
  const initialSeverity = searchParams.get("severity") || "ALL";

  const [issues, setIssues] = useState<OperationalIssueItem[]>([]);
  const [exams, setExams] = useState<ExaminationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState(initialSeverity);

  // New Issue Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("DELAYED_SUBMISSION");
  const [newSeverity, setNewSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Escalate Modal
  const [escalatingIssue, setEscalatingIssue] = useState<OperationalIssueItem | null>(null);
  const [escalationReason, setEscalationReason] = useState("");
  const [escalateSubmitting, setEscalateSubmitting] = useState(false);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const examList = await api.get<ExaminationItem[]>("/coordinator/examinations");
      setExams(examList || []);
      if (examList && examList.length > 0 && !selectedExamId) {
        setSelectedExamId(examList[0].id);
      }

      let url = "/coordinator/issues";
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (severityFilter !== "ALL") params.append("severity", severityFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const issueList = await api.get<OperationalIssueItem[]>(url);
      setIssues(issueList || []);
    } catch (err) {
      console.error("Error loading issues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [statusFilter, severityFilter]);

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !newTitle.trim() || !newDesc.trim()) return;
    setCreateSubmitting(true);

    try {
      await api.post("/coordinator/issues", {
        examination_id: selectedExamId,
        title: newTitle.trim(),
        description: newDesc.trim(),
        category: newCategory,
        severity: newSeverity,
      });

      setShowCreateModal(false);
      setNewTitle("");
      setNewDesc("");
      fetchIssues();
    } catch (err: any) {
      alert(err?.message || "Failed to log operational issue");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalatingIssue || !escalationReason.trim()) return;
    setEscalateSubmitting(true);

    try {
      await api.post(`/coordinator/issues/${escalatingIssue.id}/escalate`, {
        escalation_reason: escalationReason.trim(),
      });

      setEscalatingIssue(null);
      setEscalationReason("");
      fetchIssues();
    } catch (err: any) {
      alert(err?.message || "Failed to escalate issue");
    } finally {
      setEscalateSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issues & Escalations Hub"
        description="Log operational obstacles, syllabus discrepancies, or room constraints. Escalate critical delays directly to the Exam Controller."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>
            <button
              onClick={fetchIssues}
              className="p-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--title-color)] hover:border-[#82c341] transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[var(--font-color)]" />
          <span className="text-xs font-medium text-[var(--font-color)]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ESCALATED">Escalated</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-[var(--font-color)]">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--font-color)] animate-pulse">
            Loading operational issues and escalations...
          </div>
        ) : issues.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[var(--title-color)]">Zero Unresolved Issues</h3>
            <p className="text-xs text-[var(--paragraph-color)] mt-1">
              No operational disruptions currently logged in your examination scope.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--background-color)] border-b border-[var(--border-color)] text-[var(--font-color)] uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Severity & Category</th>
                  <th className="px-4 py-3">Issue Title & Details</th>
                  <th className="px-4 py-3">Examination</th>
                  <th className="px-4 py-3">Escalation Status</th>
                  <th className="px-4 py-3">Reported</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {issues.map((i) => (
                  <tr key={i.id} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <Badge
                          variant={
                            i.severity === "CRITICAL"
                              ? "danger"
                              : i.severity === "HIGH"
                              ? "warning"
                              : "outline"
                          }
                        >
                          {i.severity}
                        </Badge>
                        <div className="text-[10px] text-[var(--font-color)] font-medium">
                          {i.category.replace("_", " ")}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-[var(--title-color)]">{i.title}</div>
                      <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5 max-w-sm leading-relaxed">
                        {i.description}
                      </p>
                      {i.resolution_notes && (
                        <div className="mt-1 text-[10px] text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                          Resolution: {i.resolution_notes}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--title-color)]">{i.exam_name}</div>
                      {i.subject_name && (
                        <div className="text-[10px] text-[var(--paragraph-color)]">{i.subject_name}</div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {i.is_escalated ? (
                        <div className="space-y-0.5">
                          <span className="text-red-600 font-bold text-[10px] flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            Escalated to Controller
                          </span>
                          <span className="text-[10px] text-[var(--font-color)] block">
                            Target: {i.escalated_to_name}
                          </span>
                        </div>
                      ) : (
                        <Badge
                          variant={
                            i.status === "RESOLVED"
                              ? "success"
                              : i.status === "OPEN"
                              ? "warning"
                              : "default"
                          }
                        >
                          {i.status}
                        </Badge>
                      )}
                    </td>

                    <td className="px-4 py-3 text-[11px] text-[var(--paragraph-color)]">
                      {new Date(i.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      {i.reported_by_name && (
                        <div className="text-[10px] text-[var(--font-color)]">by {i.reported_by_name}</div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {!i.is_escalated && i.status !== "RESOLVED" && (
                        <button
                          onClick={() => {
                            setEscalatingIssue(i);
                            setEscalationReason(`Immediate intervention required by Exam Controller: ${i.title}`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-sm)] bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Escalate</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--background-color)]">
              <h3 className="text-sm font-bold text-[var(--title-color)]">Report Operational Issue</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-[var(--font-color)] hover:text-[var(--title-color)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Related Examination *
                </label>
                <select
                  required
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.code} - {ex.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                    Issue Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  >
                    <option value="DELAYED_SUBMISSION">Delayed Paper Submission</option>
                    <option value="MISSING_PAPER">Missing Question Paper</option>
                    <option value="SCHEDULING_CONFLICT">Scheduling / Venue Conflict</option>
                    <option value="INCOMPLETE_CHECKLIST">Incomplete Readiness Item</option>
                    <option value="MATERIAL_SHORTAGE">Material / Stationery Shortage</option>
                    <option value="SECURITY_CONCERN">Security / Confidentiality Incident</option>
                    <option value="OTHER">Other Operational Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                    Severity *
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Issue Summary Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Venue projector malfunction in Hall A"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Detailed Operational Description *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide precise details, steps taken, and impact on examination readiness..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--title-color)] hover:bg-[var(--background-color)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] font-semibold"
                >
                  {createSubmitting ? "Logging..." : "Log Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {escalatingIssue && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--background-color)]">
              <div>
                <h3 className="text-sm font-bold text-red-600 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Escalate Issue to Exam Controller</span>
                </h3>
                <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">{escalatingIssue.title}</p>
              </div>
              <button onClick={() => setEscalatingIssue(null)} className="p-1 text-[var(--font-color)] hover:text-[var(--title-color)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEscalate} className="p-5 space-y-4 text-xs">
              <p className="text-[11px] text-[var(--paragraph-color)] leading-relaxed">
                Escalating will transmit an urgent, audited priority notification directly to the Exam Controller office for executive resolution.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Justification & Escalation Reason *
                </label>
                <textarea
                  rows={4}
                  required
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  className="w-full p-2.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEscalatingIssue(null)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--title-color)] hover:bg-[var(--background-color)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={escalateSubmitting}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] bg-red-600 text-white hover:bg-red-700 font-semibold flex items-center gap-1.5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{escalateSubmitting ? "Escalating..." : "Confirm Escalation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
