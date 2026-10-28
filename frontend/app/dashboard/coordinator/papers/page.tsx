"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { PaperTrackingItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  FileSpreadsheet,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Bell,
  RefreshCw,
  X,
  Send,
  Flag,
} from "lucide-react";

export default function PaperTrackingPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "ALL";
  const initialOverdue = searchParams.get("overdue") === "true";

  const [papers, setPapers] = useState<PaperTrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [overdueOnly, setOverdueOnly] = useState(initialOverdue);
  const [search, setSearch] = useState("");

  // Reminder Modal State
  const [remindTarget, setRemindTarget] = useState<PaperTrackingItem | null>(null);
  const [remindMessage, setRemindMessage] = useState("");
  const [remindSubmitting, setRemindSubmitting] = useState(false);
  const [remindSuccess, setRemindSuccess] = useState<string | null>(null);
  const [remindError, setRemindError] = useState<string | null>(null);

  // Flag Delay Modal State
  const [flagTarget, setFlagTarget] = useState<PaperTrackingItem | null>(null);
  const [flagDescription, setFlagDescription] = useState("");
  const [flagSubmitting, setFlagSubmitting] = useState(false);

  const fetchPapers = () => {
    setLoading(true);
    let url = "/coordinator/papers";
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.append("status", statusFilter);
    if (overdueOnly) params.append("overdue_only", "true");
    if (params.toString()) url += `?${params.toString()}`;

    api
      .get<PaperTrackingItem[]>(url)
      .then((data) => setPapers(data || []))
      .catch((err) => console.error("Error loading paper tracking:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPapers();
  }, [statusFilter, overdueOnly]);

  const openRemindModal = (p: PaperTrackingItem) => {
    setRemindTarget(p);
    setRemindSuccess(null);
    setRemindError(null);
    setRemindMessage(
      `Dear ${p.faculty_name || "Faculty Member"}, please be reminded that the question paper preparation deadline for ${p.subject_code} - ${p.subject_name} is ${
        p.submission_deadline ? new Date(p.submission_deadline).toLocaleDateString([], { month: "short", day: "numeric" }) : "approaching"
      }. Kindly ensure submission on the QPMS portal.`
    );
  };

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remindTarget || !remindTarget.faculty_id) return;
    setRemindSubmitting(true);
    setRemindError(null);
    setRemindSuccess(null);

    try {
      await api.post("/coordinator/notifications/remind", {
        recipient_id: remindTarget.faculty_id,
        examination_id: remindTarget.examination_id,
        subject: `Paper Submission Reminder: ${remindTarget.subject_code}`,
        message: remindMessage.trim(),
        notification_type: "DEADLINE_REMINDER",
      });

      setRemindSuccess("Reminder dispatched successfully via In-App notification.");
      setTimeout(() => {
        setRemindTarget(null);
      }, 1500);
    } catch (err: any) {
      setRemindError(err?.message || "Failed to dispatch reminder");
    } finally {
      setRemindSubmitting(false);
    }
  };

  const handleFlagDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagTarget) return;
    setFlagSubmitting(true);

    try {
      await api.post("/coordinator/issues", {
        examination_id: flagTarget.examination_id,
        subject_id: flagTarget.subject_id,
        title: `Delayed Paper Submission: ${flagTarget.subject_code} (${flagTarget.faculty_name})`,
        description: flagDescription.trim(),
        category: "DELAYED_SUBMISSION",
        severity: "HIGH",
      });

      setFlagTarget(null);
      setFlagDescription("");
      alert("Operational issue logged and routed for examination tracking.");
    } catch (err: any) {
      alert(err?.message || "Failed to flag delay");
    } finally {
      setFlagSubmitting(false);
    }
  };

  const filteredPapers = papers.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      p.exam_name.toLowerCase().includes(s) ||
      p.subject_code.toLowerCase().includes(s) ||
      p.subject_name.toLowerCase().includes(s) ||
      (p.faculty_name && p.faculty_name.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Paper Preparation Tracking"
        description="Monitor question paper progress across all assigned examination courses. Track authoring, HOD review, Controller approvals, and submission deadlines."
        actions={
          <button
            onClick={fetchPapers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--title-color)] hover:border-[#82c341] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--font-color)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subject, exam, or faculty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Preparation Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="DRAFT">Draft in Progress</option>
            <option value="SUBMITTED">Submitted for Review</option>
            <option value="UNDER_REVIEW">Under HOD Review</option>
            <option value="APPROVED">Approved & Ready</option>
            <option value="REVISION_REQUIRED">Revision Requested</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-[var(--title-color)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded text-[#82c341] focus:ring-0"
            />
            <span>Overdue Only</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--font-color)] animate-pulse">
            Loading question paper status tracking...
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-8 h-8 text-[var(--font-color)] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[var(--title-color)]">No Question Papers Found</h3>
            <p className="text-xs text-[var(--paragraph-color)] mt-1">
              No examination papers matching the current filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--background-color)] border-b border-[var(--border-color)] text-[var(--font-color)] uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Examination & Subject</th>
                  <th className="px-4 py-3">Assigned Faculty</th>
                  <th className="px-4 py-3">Deadline & Remaining</th>
                  <th className="px-4 py-3">Preparation Lifecycle</th>
                  <th className="px-4 py-3">Approval Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredPapers.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[var(--title-color)]">
                        {p.subject_code} &bull; {p.subject_name}
                      </div>
                      <div className="text-[11px] text-[var(--paragraph-color)] mt-0.5">
                        {p.exam_name} ({p.exam_code})
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--title-color)]">
                        {p.faculty_name || "Unassigned"}
                      </div>
                      <div className="text-[10px] text-[var(--font-color)] mt-0.5">
                        {p.program_name} ({p.semester_name})
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--title-color)] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--font-color)]" />
                        <span>
                          {p.submission_deadline
                            ? new Date(p.submission_deadline).toLocaleDateString([], { month: "short", day: "numeric" })
                            : "No deadline"}
                        </span>
                      </div>
                      <div className="text-[10px] mt-0.5">
                        {p.is_overdue ? (
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Overdue!
                          </span>
                        ) : p.days_remaining !== null && p.days_remaining !== undefined ? (
                          <span className="text-emerald-600 font-medium">{p.days_remaining} days remaining</span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          p.paper_status === "APPROVED" || p.paper_status === "PUBLISHED"
                            ? "success"
                            : p.paper_status === "UNDER_REVIEW" || p.paper_status === "SUBMITTED"
                            ? "warning"
                            : "default"
                        }
                      >
                        {p.paper_status.replace("_", " ")}
                      </Badge>
                      <div className="text-[10px] text-[var(--paragraph-color)] mt-1">
                        {p.last_updated ? `Updated: ${new Date(p.last_updated).toLocaleDateString()}` : "Not initialized"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {p.approval_status === "APPROVED" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span className="font-medium text-[var(--title-color)] text-[11px]">
                          {p.approval_status}
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--font-color)] mt-0.5">
                        {p.reviewer_name ? `Rev: ${p.reviewer_name}` : "Pending Reviewer"}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.faculty_id && (
                          <button
                            onClick={() => openRemindModal(p)}
                            className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-color)] hover:border-[#82c341] text-[var(--title-color)] transition"
                            title="Send Submission Reminder"
                          >
                            <Bell className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setFlagTarget(p);
                            setFlagDescription(`Paper submission is delayed for course ${p.subject_code} - ${p.subject_name}.`);
                          }}
                          className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-color)] hover:border-amber-400 text-[var(--title-color)] transition"
                          title="Flag Operational Delay"
                        >
                          <Flag className="w-3.5 h-3.5 text-amber-600" />
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

      {/* Reminder Modal */}
      {remindTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--background-color)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">Dispatch Deadline Reminder</h3>
                <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">
                  To: {remindTarget.faculty_name} ({remindTarget.subject_code})
                </p>
              </div>
              <button onClick={() => setRemindTarget(null)} className="p-1 text-[var(--font-color)] hover:text-[var(--title-color)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendReminder} className="p-5 space-y-4 text-xs">
              {remindSuccess && (
                <div className="p-3 rounded-[var(--radius-md)] bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{remindSuccess}</span>
                </div>
              )}
              {remindError && (
                <div className="p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>{remindError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Reminder Message Content
                </label>
                <textarea
                  rows={4}
                  required
                  value={remindMessage}
                  onChange={(e) => setRemindMessage(e.target.value)}
                  className="w-full p-2.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
                <p className="text-[10px] text-[var(--font-color)] mt-1">
                  Deduplication protects recipients from repeated reminders within 2 hours. Delivery is logged in the user's notification feed.
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRemindTarget(null)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--title-color)] hover:bg-[var(--background-color)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={remindSubmitting}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{remindSubmitting ? "Dispatching..." : "Send Reminder"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flag Delay Modal */}
      {flagTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--background-color)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">Flag Operational Delay</h3>
                <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">
                  Course: {flagTarget.subject_code} - {flagTarget.subject_name}
                </p>
              </div>
              <button onClick={() => setFlagTarget(null)} className="p-1 text-[var(--font-color)] hover:text-[var(--title-color)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFlagDelay} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Delay Description & Coordination Notes *
                </label>
                <textarea
                  rows={4}
                  required
                  value={flagDescription}
                  onChange={(e) => setFlagDescription(e.target.value)}
                  className="w-full p-2.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFlagTarget(null)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--title-color)] hover:bg-[var(--background-color)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={flagSubmitting}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] bg-amber-600 text-white hover:bg-amber-700 font-semibold flex items-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{flagSubmitting ? "Logging..." : "Log Operational Issue"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
