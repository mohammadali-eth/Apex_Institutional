"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Question, HODEligibleReviewer } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserCheck,
  AlertTriangle,
  X,
  Eye,
  Clock,
  ShieldAlert,
} from "lucide-react";

export default function HODReviewQuestionsPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reviewers, setReviewers] = useState<HODEligibleReviewer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | "REQUEST_REVISION" | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadQueue = () => {
    setLoading(true);
    Promise.all([
      api.get<Question[]>("/hod/review-questions"),
      api.get<HODEligibleReviewer[]>("/hod/eligible-reviewers"),
    ])
      .then(([qList, rList]) => {
        setQuestions(qList || []);
        setReviewers(rList || []);
      })
      .catch((err) => {
        console.error("Error loading review queue:", err);
        setMsg({ type: "error", text: "Failed to load review queue." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !reviewAction) return;

    if ((reviewAction === "REJECT" || reviewAction === "REQUEST_REVISION") && !reviewComments.trim()) {
      alert("A specific reason or comment is required for rejections and revision requests.");
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      await api.post(`/hod/review-questions/${activeQuestion.id}/review`, {
        action: reviewAction,
        comments: reviewComments.trim() || null,
      });
      setMsg({
        type: "success",
        text: `Question successfully marked as ${reviewAction.replace("_", " ")}.`,
      });
      setActiveQuestion(null);
      setReviewAction(null);
      setReviewComments("");
      loadQueue();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to submit review." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignReviewerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !selectedReviewerId) return;

    setSubmitting(true);
    setMsg(null);
    try {
      await api.post("/hod/assign-reviewers", {
        entity_type: "QUESTION",
        entity_id: activeQuestion.id,
        reviewer_id: selectedReviewerId,
      });
      setMsg({ type: "success", text: "Peer reviewer assigned successfully." });
      setShowAssignModal(false);
      setActiveQuestion(null);
      setSelectedReviewerId("");
      loadQueue();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to assign reviewer." });
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (q: Question, action: "APPROVE" | "REJECT" | "REQUEST_REVISION") => {
    setActiveQuestion(q);
    setReviewAction(action);
    setReviewComments("");
  };

  const openAssignModal = (q: Question) => {
    setActiveQuestion(q);
    setSelectedReviewerId(q.reviewer_id || "");
    setShowAssignModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Review & Moderation Queue"
        subtitle="Review faculty question submissions, enforce anti-self-approval standards, request revisions, and delegate peer reviews."
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
              Pending Submissions ({questions.length})
            </h3>
          </div>
          <span className="text-xs text-[#dce1e4]">
            Actionable items requiring departmental decision
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--background-color)] border-b border-[var(--border-color)] text-[var(--title-color)]">
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Question Prompt</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Type / Marks</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Author</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Assigned Reviewer</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    Loading review queue...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    All caught up! No questions are currently awaiting moderation.
                  </td>
                </tr>
              ) : (
                questions.map((q) => {
                  const isAuthor = user && q.created_by === user.id;

                  return (
                    <tr key={q.id} className="hover:bg-[var(--background-color)]/60 transition">
                      <td className="py-3 px-4 max-w-sm">
                        <p className="font-semibold text-[var(--title-color)] line-clamp-2">
                          {q.question_text}
                        </p>
                        {isAuthor && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#d97706] bg-[#fef3c7] px-1.5 py-0.5 rounded mt-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Your submission (Anti-self-approval rule applies)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[var(--title-color)]">{q.question_type}</span>
                        <span className="text-[11px] text-[var(--paragraph-color)] block">{q.marks} Marks • {q.difficulty}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-[var(--title-color)] block">{q.creator_name || "Faculty"}</span>
                        <span className="text-[10px] text-[var(--font-color)]">
                          {new Date(q.created_at || "").toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => openAssignModal(q)}
                          className="text-xs font-semibold text-[#82c341] hover:underline flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{q.reviewer_id ? "Change Reviewer" : "Assign Reviewer"}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef3c7] text-[#92400e]">
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openReviewModal(q, "APPROVE")}
                            disabled={Boolean(isAuthor)}
                            title={isAuthor ? "Cannot approve your own submission" : "Approve Question"}
                            className="px-2.5 py-1 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-sm)] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => openReviewModal(q, "REQUEST_REVISION")}
                            title="Request Revision"
                            className="px-2.5 py-1 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-sm)] transition flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Revision</span>
                          </button>
                          <button
                            onClick={() => openReviewModal(q, "REJECT")}
                            title="Reject Question"
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

      {/* Modal: Review Decision */}
      {activeQuestion && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">
                  {reviewAction === "APPROVE"
                    ? "Approve Question"
                    : reviewAction === "REJECT"
                    ? "Reject Question"
                    : "Request Question Revision"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveQuestion(null);
                  setReviewAction(null);
                }}
                className="text-[#dce1e4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] text-xs space-y-1">
                <span className="font-bold text-[var(--title-color)]">Question:</span>
                <p className="text-[var(--paragraph-color)]">{activeQuestion.question_text}</p>
                <div className="pt-2 flex items-center gap-2 text-[10px] text-[var(--font-color)]">
                  <span>Author: {activeQuestion.creator_name || "Faculty"}</span>
                  <span>•</span>
                  <span>{activeQuestion.marks} Marks</span>
                  <span>•</span>
                  <span>{activeQuestion.difficulty}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  {reviewAction === "APPROVE"
                    ? "Moderator Feedback / Notes (Optional)"
                    : "Mandatory Reason / Revision Instructions *"}
                </label>
                <textarea
                  rows={3}
                  required={reviewAction !== "APPROVE"}
                  placeholder={
                    reviewAction === "APPROVE"
                      ? "Optional praise or alignment confirmation..."
                      : "Clearly articulate required fixes (e.g. clarify wording, fix distractor options, verify key)..."
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
                    setActiveQuestion(null);
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
                      ? "bg-[#82c341] hover:bg-[#72b036] text-[#000000]"
                      : reviewAction === "REJECT"
                      ? "bg-[#e53e3e] hover:bg-[#c53030] text-white"
                      : "bg-[#45525b] hover:bg-[#3c474f] text-white"
                  }`}
                >
                  {submitting ? "Processing..." : `Confirm ${reviewAction.replace("_", " ")}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delegate Peer Reviewer */}
      {showAssignModal && activeQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Assign Peer Reviewer</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignReviewerSubmit} className="p-6 space-y-4">
              <p className="text-xs text-[var(--paragraph-color)]">
                Select a department faculty member to perform technical peer review on this question. The author cannot be assigned.
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
                    .filter((r) => r.id !== activeQuestion.created_by)
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
