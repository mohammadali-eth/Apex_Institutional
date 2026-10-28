"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { QuestionPaper, HODEligibleReviewer } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserCheck,
  AlertTriangle,
  X,
  Eye,
  Clock,
  ShieldAlert,
  FileText,
} from "lucide-react";

export default function HODApprovePapersPage() {
  const { user } = useAuth();
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [reviewers, setReviewers] = useState<HODEligibleReviewer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activePaper, setActivePaper] = useState<QuestionPaper | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | "REQUEST_REVISION" | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadQueue = () => {
    setLoading(true);
    Promise.all([
      api.get<QuestionPaper[]>("/hod/approve-papers"),
      api.get<HODEligibleReviewer[]>("/hod/eligible-reviewers"),
    ])
      .then(([pList, rList]) => {
        setPapers(pList || []);
        setReviewers(rList || []);
      })
      .catch((err) => {
        console.error("Error loading paper queue:", err);
        setMsg({ type: "error", text: "Failed to load question paper approval queue." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaper || !reviewAction) return;

    if ((reviewAction === "REJECT" || reviewAction === "REQUEST_REVISION") && !reviewComments.trim()) {
      alert("A specific reason or comment is required for rejections and revision requests.");
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      await api.post(`/hod/approve-papers/${activePaper.id}/review`, {
        action: reviewAction,
        comments: reviewComments.trim() || null,
      });
      setMsg({
        type: "success",
        text: `Question paper successfully ${reviewAction === "APPROVE" ? "approved" : reviewAction.toLowerCase().replace("_", " ")}.`,
      });
      setActivePaper(null);
      setReviewAction(null);
      setReviewComments("");
      loadQueue();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to submit paper review." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignReviewerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaper || !selectedReviewerId) return;

    setSubmitting(true);
    setMsg(null);
    try {
      await api.post("/hod/assign-reviewers", {
        entity_type: "PAPER",
        entity_id: activePaper.id,
        reviewer_id: selectedReviewerId,
      });
      setMsg({ type: "success", text: "Faculty paper reviewer assigned successfully." });
      setShowAssignModal(false);
      setActivePaper(null);
      setSelectedReviewerId("");
      loadQueue();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to assign reviewer." });
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (p: QuestionPaper, action: "APPROVE" | "REJECT" | "REQUEST_REVISION") => {
    setActivePaper(p);
    setReviewAction(action);
    setReviewComments("");
  };

  const openAssignModal = (p: QuestionPaper) => {
    setActivePaper(p);
    setSelectedReviewerId("");
    setShowAssignModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Paper Approval Queue"
        subtitle="Validate marks balances, enforce syllabus integrity, authorize departmental exam papers, and delegate peer reviews."
      />

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

      {/* Queue Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#82c341]" />
            <h3 className="font-bold text-sm">
              Papers Awaiting Departmental Approval ({papers.length})
            </h3>
          </div>
          <span className="text-xs text-[#dce1e4]">
            Validation must pass before HOD approval is granted
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--background-color)] border-b border-[var(--border-color)] text-[var(--title-color)]">
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Paper Title & Exam</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Subject Course</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Marks & Duration</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Author</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    Loading paper approval queue...
                  </td>
                </tr>
              ) : papers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    No examination papers are currently awaiting approval.
                  </td>
                </tr>
              ) : (
                papers.map((p) => {
                  const isAuthor = user && p.created_by === user.id;

                  return (
                    <tr key={p.id} className="hover:bg-[var(--background-color)]/60 transition">
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-bold text-[var(--title-color)]">{p.title}</div>
                        <div className="text-[11px] text-[var(--font-color)]">{p.exam_name}</div>
                        {isAuthor && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#d97706] bg-[#fef3c7] px-1.5 py-0.5 rounded mt-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Authored by you (Anti-self-approval rule applies)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-xs text-[#82c341]">{p.subject_code}</span>
                        <span className="text-[11px] text-[var(--paragraph-color)] block truncate max-w-xs">{p.subject_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[var(--title-color)]">{p.total_marks} Marks</span>
                        <span className="text-[11px] text-[var(--paragraph-color)] block">{p.duration_minutes} Mins</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-[var(--title-color)] block">{p.creator_name || "Faculty"}</span>
                        <span className="text-[10px] text-[var(--font-color)]">
                          {new Date(p.created_at || "").toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef3c7] text-[#92400e]">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/question-papers/${p.id}`}
                            title="Inspect Paper"
                            className="p-1.5 text-[var(--paragraph-color)] hover:text-[#82c341] hover:bg-[var(--background-color)] rounded-[var(--radius-sm)] transition"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openAssignModal(p)}
                            title="Assign Reviewer"
                            className="p-1.5 text-[var(--paragraph-color)] hover:text-[#45525b] hover:bg-[var(--background-color)] rounded-[var(--radius-sm)] transition"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openReviewModal(p, "APPROVE")}
                            disabled={Boolean(isAuthor)}
                            title={isAuthor ? "Cannot approve your own paper" : "Approve Paper"}
                            className="px-2.5 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-[var(--radius-sm)] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => openReviewModal(p, "REQUEST_REVISION")}
                            title="Request Paper Revision"
                            className="px-2.5 py-1 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-sm)] transition flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Revision</span>
                          </button>
                          <button
                            onClick={() => openReviewModal(p, "REJECT")}
                            title="Reject Paper"
                            className="px-2.5 py-1 bg-[#fee2e2] hover:bg-[#fca5a5] text-[#991b1b] text-xs font-bold rounded-[var(--radius-sm)] transition flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Paper Review Decision */}
      {activePaper && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">
                  {reviewAction === "APPROVE"
                    ? "Approve Question Paper"
                    : reviewAction === "REJECT"
                    ? "Reject Question Paper"
                    : "Request Paper Revision"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActivePaper(null);
                  setReviewAction(null);
                }}
                className="text-[#dce1e4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] text-xs space-y-1">
                <span className="font-bold text-[var(--title-color)]">{activePaper.title}</span>
                <p className="text-[var(--paragraph-color)]">
                  {activePaper.subject_code} — {activePaper.subject_name} • {activePaper.total_marks} Marks • {activePaper.duration_minutes} Mins
                </p>
                <p className="text-[10px] text-[var(--font-color)]">
                  Authored by: {activePaper.creator_name || "Faculty"}
                </p>
              </div>

              {reviewAction === "APPROVE" && (
                <div className="p-3 bg-[#eff6ff] rounded-[var(--radius-md)] border border-[#dbeafe] text-xs text-[#1e40af] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4 text-[#2563eb]" />
                    <span>Automated Blueprint Validation</span>
                  </div>
                  <p className="text-[11px] text-[#1d4ed8]">
                    Submitting approval will automatically trigger full marks balancing and question integrity verification. If any discrepancies exist, the approval will be rejected with diagnostic details.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  {reviewAction === "APPROVE"
                    ? "Approval Comments (Optional)"
                    : "Mandatory Reason / Revision Directives *"}
                </label>
                <textarea
                  rows={3}
                  required={reviewAction !== "APPROVE"}
                  placeholder={
                    reviewAction === "APPROVE"
                      ? "Optional sign-off notes..."
                      : "Explain reasons for rejection or specific sections that require re-generation..."
                  }
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActivePaper(null);
                    setReviewAction(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-[var(--paragraph-color)] hover:bg-[var(--background-color)] rounded-[var(--radius-md)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 text-xs font-black rounded-[var(--radius-md)] shadow-sm transition disabled:opacity-50 uppercase tracking-wider ${
                    reviewAction === "APPROVE"
                      ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
                      : reviewAction === "REJECT"
                      ? "bg-[#e53e3e] hover:bg-[#c53030] text-white"
                      : "bg-[#45525b] hover:bg-[#3c474f] text-white"
                  }`}
                >
                  {submitting ? "Verifying..." : `Confirm ${reviewAction.replace("_", " ")}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delegate Paper Reviewer */}
      {showAssignModal && activePaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Assign Paper Reviewer</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignReviewerSubmit} className="p-6 space-y-4">
              <p className="text-xs text-[var(--paragraph-color)]">
                Assign a department faculty member to examine this question paper before final HOD approval. The creator cannot review their own paper.
              </p>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Eligible Faculty Reviewers <span className="text-[#e53e3e]">*</span>
                </label>
                <select
                  required
                  value={selectedReviewerId}
                  onChange={(e) => setSelectedReviewerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                >
                  <option value="" disabled>Select Reviewer</option>
                  {reviewers
                    .filter((r) => r.id !== activePaper.created_by)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.email})
                      </option>
                    ))}
                </select>
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
                  disabled={submitting || !selectedReviewerId}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
                >
                  {submitting ? "Assigning..." : "Assign Reviewer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
