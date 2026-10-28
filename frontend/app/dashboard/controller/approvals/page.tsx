"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ControllerPaperApprovalItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Eye,
  Lock,
  ArrowRight,
  X,
  BookOpen,
  CalendarDays,
  UserCheck,
} from "lucide-react";

export default function ControllerApprovalsPage() {
  const [papers, setPapers] = useState<ControllerPaperApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Decision Modal
  const [selectedPaper, setSelectedPaper] = useState<ControllerPaperApprovalItem | null>(null);
  const [decisionAction, setDecisionAction] = useState<"APPROVE" | "RETURN_REVISION" | "REJECT">("APPROVE");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Paper Preview Modal
  const [previewPaper, setPreviewPaper] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchApprovals = () => {
    setLoading(true);
    let url = "/controller/approvals";
    if (statusFilter !== "ALL") {
      url += `?status=${statusFilter}`;
    }
    api
      .get<ControllerPaperApprovalItem[]>(url)
      .then((data) => setPapers(data || []))
      .catch((err) => console.error("Error loading approvals:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApprovals();
  }, [statusFilter]);

  const handleOpenDecision = (paper: ControllerPaperApprovalItem, action: "APPROVE" | "RETURN_REVISION" | "REJECT") => {
    setSelectedPaper(paper);
    setDecisionAction(action);
    setComments("");
  };

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaper) return;
    setSubmitting(true);
    try {
      await api.post(`/controller/approvals/${selectedPaper.id}/decision`, {
        action: decisionAction,
        comments: comments.trim() || undefined,
        rejection_reason: decisionAction === "REJECT" ? comments.trim() : undefined,
      });
      setSelectedPaper(null);
      fetchApprovals();
    } catch (err: any) {
      alert(err.message || "Failed to submit approval decision.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = (paperId: string) => {
    setPreviewLoading(true);
    api
      .get<any>(`/question-papers/${paperId}`)
      .then((res) => setPreviewPaper(res))
      .catch((err) => console.error("Error loading paper preview:", err))
      .finally(() => setPreviewLoading(false));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Paper Approvals"
        description="Controller review and final authorization of examination papers. Enforces mandatory prior department review and syllabus integrity."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchApprovals()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--font-color)] hover:text-[var(--title-color)] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <Link
              href="/dashboard/controller/finalized"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45] transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Finalized Papers</span>
            </Link>
          </div>
        }
      />

      {/* Filter tabs */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-[var(--radius-md)] font-semibold transition ${
              statusFilter === "ALL"
                ? "bg-[#82c341] text-[#000000]"
                : "text-[var(--font-color)] hover:text-[var(--title-color)]"
            }`}
          >
            Awaiting Decision
          </button>
          <button
            onClick={() => setStatusFilter("APPROVED")}
            className={`px-3 py-1.5 rounded-[var(--radius-md)] font-semibold transition ${
              statusFilter === "APPROVED"
                ? "bg-[#82c341] text-[#000000]"
                : "text-[var(--font-color)] hover:text-[var(--title-color)]"
            }`}
          >
            Approved (Ready to Finalize)
          </button>
          <button
            onClick={() => setStatusFilter("UNDER_REVIEW")}
            className={`px-3 py-1.5 rounded-[var(--radius-md)] font-semibold transition ${
              statusFilter === "UNDER_REVIEW"
                ? "bg-[#82c341] text-[#000000]"
                : "text-[var(--font-color)] hover:text-[var(--title-color)]"
            }`}
          >
            Under Review
          </button>
        </div>
        <div className="text-xs text-[var(--font-color)]">
          Total in view: <span className="font-bold text-[var(--title-color)]">{papers.length}</span>
        </div>
      </div>

      {/* Papers List */}
      {loading ? (
        <div className="p-8 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <div className="w-8 h-8 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--font-color)]">Loading question papers...</p>
        </div>
      ) : papers.length === 0 ? (
        <div className="p-12 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <FileCheck className="w-10 h-10 text-[var(--font-color)] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[var(--title-color)] mb-1">No Question Papers Awaiting Approval</h3>
          <p className="text-xs text-[var(--font-color)]">All submitted examination papers have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {papers.map((paper) => (
            <div
              key={paper.id}
              className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition shadow-[var(--shadow-sm)] space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={paper.status === "APPROVED" ? "success" : "warning"} size="sm">
                      {paper.status}
                    </Badge>
                    <span className="font-bold text-sm text-[var(--title-color)]">{paper.title}</span>
                    <Badge variant="outline" size="sm">v{paper.version}</Badge>
                  </div>
                  <div className="text-xs text-[var(--font-color)] flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--title-color)]">{paper.exam_name}</span>
                    <span>&bull;</span>
                    <span>{paper.subject_code} - {paper.subject_name}</span>
                    <span>&bull;</span>
                    <span>{paper.department_name || "Institution"}</span>
                    <span>&bull;</span>
                    <span>{paper.total_marks} Marks</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(paper.id)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] hover:border-[#82c341] transition flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>

                  {paper.status !== "APPROVED" && (
                    <>
                      <button
                        onClick={() => handleOpenDecision(paper, "APPROVE")}
                        className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition flex items-center gap-1 font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleOpenDecision(paper, "RETURN_REVISION")}
                        className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-md)] bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revision</span>
                      </button>
                      <button
                        onClick={() => handleOpenDecision(paper, "REJECT")}
                        className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-md)] bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20 transition flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {paper.status === "APPROVED" && (
                    <Link
                      href="/dashboard/controller/finalized"
                      className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45] transition flex items-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock & Finalize &rarr;</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Integrity & Prior Review Status Line */}
              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--font-color)]">Prior Review Stage:</span>
                  {paper.has_prior_review ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Verified by HOD ({paper.reviewed_by_name || "Department Reviewer"})</span>
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Pending Initial HOD Review</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[var(--font-color)]">Validation Integrity:</span>
                  {paper.validation_passed ? (
                    <span className="text-emerald-600 font-semibold">100% Passed</span>
                  ) : (
                    <span className="text-red-500 font-semibold">
                      {paper.validation_errors.length} Issue(s)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DECISION MODAL */}
      {selectedPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md p-6 shadow-[var(--shadow-lg)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">
                  {decisionAction === "APPROVE"
                    ? "Authorize Question Paper"
                    : decisionAction === "RETURN_REVISION"
                    ? "Request Revisions"
                    : "Reject Question Paper"}
                </h3>
                <p className="text-xs text-[var(--font-color)]">{selectedPaper.title}</p>
              </div>
              <button onClick={() => setSelectedPaper(null)} className="text-[var(--font-color)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {decisionAction === "APPROVE" && !selectedPaper.has_prior_review && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Notice: Prior HOD review has not been formally recorded on this paper.</span>
              </div>
            )}

            <form onSubmit={handleSubmitDecision} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">
                  {decisionAction === "APPROVE"
                    ? "Approval Comments (Optional)"
                    : decisionAction === "RETURN_REVISION"
                    ? "Specific Revision Instructions *"
                    : "Rejection Justification *"}
                </label>
                <textarea
                  required={decisionAction !== "APPROVE"}
                  rows={3}
                  placeholder={
                    decisionAction === "APPROVE"
                      ? "e.g. Paper conforms to syllabus blueprint and Bloom's taxonomy standards."
                      : "e.g. Please rebalance Section B difficulty and replace duplicate question 4."
                  }
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaper(null)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--font-color)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-1.5 rounded-[var(--radius-md)] font-bold transition disabled:opacity-50 ${
                    decisionAction === "APPROVE"
                      ? "bg-[#82c341] text-[#000000] hover:bg-[#72ad38]"
                      : decisionAction === "RETURN_REVISION"
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {submitting
                    ? "Processing..."
                    : decisionAction === "APPROVE"
                    ? "Confirm Approval"
                    : decisionAction === "RETURN_REVISION"
                    ? "Send Revision Request"
                    : "Reject Paper"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW PAPER MODAL */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-3xl p-6 shadow-[var(--shadow-lg)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">{previewPaper.title}</h3>
                <p className="text-xs text-[var(--font-color)]">
                  {previewPaper.exam_name} &bull; Total Marks: {previewPaper.total_marks} &bull; Duration: {previewPaper.duration_minutes} min
                </p>
              </div>
              <button onClick={() => setPreviewPaper(null)} className="text-[var(--font-color)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {previewPaper.sections?.map((sec: any) => (
                <div key={sec.id} className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-2">
                  <div className="flex items-center justify-between font-bold text-[var(--title-color)]">
                    <span>{sec.name}</span>
                    <span>{sec.total_marks} Marks</span>
                  </div>
                  {sec.instructions && (
                    <p className="text-[11px] text-[var(--font-color)] italic">{sec.instructions}</p>
                  )}
                  <div className="space-y-2 pt-2">
                    {sec.questions?.map((qItem: any, idx: number) => (
                      <div key={qItem.id} className="p-2 bg-[var(--surface-color)] rounded border border-[var(--border-color)] flex items-start justify-between gap-3">
                        <div>
                          <span className="font-bold mr-2 text-[var(--title-color)]">Q{idx + 1}.</span>
                          <span className="text-[var(--title-color)]">{qItem.question?.question_text || "Question content"}</span>
                        </div>
                        <span className="font-bold text-[var(--title-color)] shrink-0">{qItem.marks}M</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end">
              <button
                onClick={() => setPreviewPaper(null)}
                className="px-4 py-1.5 rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
