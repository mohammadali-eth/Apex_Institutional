"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ControllerFinalizedPaperItem, ControllerPaperApprovalItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  Lock,
  ShieldCheck,
  Send,
  RefreshCw,
  Search,
  Eye,
  Key,
  X,
  FileCheck,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";

export default function ControllerFinalizedPapersPage() {
  const [papers, setPapers] = useState<ControllerFinalizedPaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Finalize Paper Modal
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [approvedPapers, setApprovedPapers] = useState<ControllerPaperApprovalItem[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Inspection Modal
  const [inspectedPaper, setInspectedPaper] = useState<ControllerFinalizedPaperItem | null>(null);

  const fetchFinalized = () => {
    setLoading(true);
    api
      .get<ControllerFinalizedPaperItem[]>("/controller/finalized-papers")
      .then((data) => setPapers(data || []))
      .catch((err) => console.error("Error loading finalized papers:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFinalized();
  }, []);

  const openFinalizeModal = () => {
    setFinalizeModalOpen(true);
    api
      .get<ControllerPaperApprovalItem[]>("/controller/approvals?status=APPROVED")
      .then((data) => {
        setApprovedPapers(data || []);
        if (data && data.length > 0) setSelectedPaperId(data[0].id);
      })
      .catch((err) => console.error("Error loading approved papers:", err));
  };

  const handleFinalizePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaperId) return;
    setSubmitting(true);
    try {
      await api.post(`/controller/finalized-papers/${selectedPaperId}/finalize`, {
        confirmation_notes: confirmationNotes.trim() || undefined,
      });
      setFinalizeModalOpen(false);
      setConfirmationNotes("");
      fetchFinalized();
    } catch (err: any) {
      alert(err.message || "Failed to finalize question paper.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPapers = papers.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.exam_name.toLowerCase().includes(q) ||
        p.subject_code.toLowerCase().includes(q) ||
        p.subject_name.toLowerCase().includes(q) ||
        (p.finalization_hash && p.finalization_hash.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finalized & Locked Question Papers"
        description="Immutable question paper store protected with cryptographic SHA-256 integrity hashes to prevent tampering before examination day."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchFinalized()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--font-color)] hover:text-[var(--title-color)] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={openFinalizeModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition font-bold shadow-[var(--shadow-sm)]"
            >
              <Lock className="w-4 h-4" />
              <span>Finalize Approved Paper</span>
            </button>
            <Link
              href="/dashboard/controller/releases"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45] transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Release Windows</span>
            </Link>
          </div>
        }
      />

      {/* Security Status Card */}
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[var(--radius-lg)] flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold">Cryptographic Lock & Tamper-Evident Security Active</span>
            <p className="text-[11px] opacity-90 mt-0.5">
              All finalized papers compute a SHA-256 fingerprint from sections and questions. Any unauthorized modification revokes publication.
            </p>
          </div>
        </div>
        <div className="text-right font-bold text-xs">
          <span>{papers.length} Locked Paper(s)</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--font-color)]" />
          <input
            type="text"
            placeholder="Search finalized papers by title, subject, or hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>
        <div className="text-xs text-[var(--font-color)]">
          Total in store: <span className="font-bold text-[var(--title-color)]">{filteredPapers.length}</span>
        </div>
      </div>

      {/* Table of Finalized Papers */}
      {loading ? (
        <div className="p-8 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <div className="w-8 h-8 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--font-color)]">Loading finalized repository...</p>
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="p-12 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <Lock className="w-10 h-10 text-[var(--font-color)] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[var(--title-color)] mb-1">No Finalized Papers</h3>
          <p className="text-xs text-[var(--font-color)] max-w-sm mx-auto mb-4">
            Papers must be approved by the Controller before they can be locked and stored in the secure repository.
          </p>
          <button
            onClick={openFinalizeModal}
            className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000]"
          >
            Finalize Approved Paper
          </button>
        </div>
      ) : (
        <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--background-color)] text-[var(--font-color)] font-semibold">
                  <th className="p-3.5">Title & Examination</th>
                  <th className="p-3.5">Subject</th>
                  <th className="p-3.5">Integrity Hash (SHA-256)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Release Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredPapers.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-[var(--title-color)] flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{p.title}</span>
                      </div>
                      <div className="text-[11px] text-[var(--font-color)] mt-0.5">{p.exam_name}</div>
                      <span className="inline-block mt-1 text-[10px] text-[var(--font-color)]">
                        v{p.version} &bull; {p.total_marks} Marks &bull; {p.finalized_at ? new Date(p.finalized_at).toLocaleDateString() : ""}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-[var(--title-color)]">
                        {p.subject_code} - {p.subject_name}
                      </div>
                      <div className="text-[11px] text-[var(--font-color)]">
                        {p.department_name || "Institutional"}
                      </div>
                    </td>
                    <td className="p-3.5">
                      {p.finalization_hash ? (
                        <div className="font-mono text-[11px] bg-[var(--background-color)] px-2 py-1 rounded border border-[var(--border-color)] text-emerald-700 dark:text-emerald-400 max-w-xs truncate">
                          {p.finalization_hash}
                        </div>
                      ) : (
                        <span className="text-[var(--font-color)] italic">Verified by Controller</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant="success" size="sm">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge
                        variant={
                          p.release_status === "RELEASED"
                            ? "default"
                            : p.release_status === "SCHEDULED"
                            ? "warning"
                            : "outline"
                        }
                        size="sm"
                      >
                        {p.release_status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectedPaper(p)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--title-color)] hover:border-[#82c341] transition"
                        >
                          Verify Hash
                        </button>
                        <Link
                          href="/dashboard/controller/releases"
                          className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition font-bold"
                        >
                          Release &rarr;
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FINALIZE APPROVED PAPER MODAL */}
      {finalizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md p-6 shadow-[var(--shadow-lg)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">Finalize & Lock Question Paper</h3>
                <p className="text-xs text-[var(--font-color)]">Creates an immutable snapshot and computes SHA-256 fingerprint.</p>
              </div>
              <button onClick={() => setFinalizeModalOpen(false)} className="text-[var(--font-color)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {approvedPapers.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--font-color)]">
                <p className="mb-2">There are currently no approved question papers ready for finalization.</p>
                <Link
                  href="/dashboard/controller/approvals"
                  className="font-bold text-[#82c341] hover:underline"
                >
                  Go to Approvals &rarr;
                </Link>
              </div>
            ) : (
              <form onSubmit={handleFinalizePaper} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-[var(--title-color)] mb-1">Select Approved Paper *</label>
                  <select
                    value={selectedPaperId}
                    onChange={(e) => setSelectedPaperId(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  >
                    {approvedPapers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.subject_code} - {p.total_marks} Marks)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[var(--title-color)] mb-1">Controller Confirmation Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Verified syllabus coverage, marks distribution, and anti-tamper locking."
                    value={confirmationNotes}
                    onChange={(e) => setConfirmationNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded text-xs">
                  <strong>Notice:</strong> Once locked, ordinary faculty or HOD edits are permanently prevented.
                </div>

                <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setFinalizeModalOpen(false)}
                    className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--font-color)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] font-bold hover:bg-[#72ad38] disabled:opacity-50"
                  >
                    {submitting ? "Locking..." : "Finalize & Lock Paper"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* INSPECT PAPER INTEGRITY MODAL */}
      {inspectedPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-lg p-6 shadow-[var(--shadow-lg)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">Integrity Certificate</h3>
                <p className="text-xs text-[var(--font-color)]">{inspectedPaper.title}</p>
              </div>
              <button onClick={() => setInspectedPaper(null)} className="text-[var(--font-color)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[var(--background-color)] rounded border border-[var(--border-color)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--font-color)]">Subject:</span>
                  <span className="font-semibold text-[var(--title-color)]">{inspectedPaper.subject_code} - {inspectedPaper.subject_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--font-color)]">Finalized By:</span>
                  <span className="font-semibold text-[var(--title-color)]">{inspectedPaper.finalized_by_name || "Exam Controller"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--font-color)]">Finalized At:</span>
                  <span className="font-semibold text-[var(--title-color)]">
                    {inspectedPaper.finalized_at ? new Date(inspectedPaper.finalized_at).toUTCString() : "Recorded"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--font-color)]">Lock Status:</span>
                  <span className="font-bold text-emerald-600">IMMUTABLE (LOCKED)</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">SHA-256 Cryptographic Hash:</label>
                <div className="font-mono text-[11px] p-2.5 bg-[var(--background-color)] rounded border border-[var(--border-color)] text-emerald-700 dark:text-emerald-400 break-all select-all">
                  {inspectedPaper.finalization_hash || "Calculated at lock time"}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end">
              <button
                onClick={() => setInspectedPaper(null)}
                className="px-4 py-1.5 rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45] text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
