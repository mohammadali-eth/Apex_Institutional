"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ControllerRevisionQueueItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  RotateCcw,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  CalendarDays,
  User,
  ArrowRight,
  X,
  FileText,
} from "lucide-react";

export default function ControllerRevisionsPage() {
  const [revisions, setRevisions] = useState<ControllerRevisionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [previewPaper, setPreviewPaper] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchRevisions = () => {
    setLoading(true);
    api
      .get<ControllerRevisionQueueItem[]>("/controller/revisions")
      .then((data) => setRevisions(data || []))
      .catch((err) => console.error("Error loading revision queue:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRevisions();
  }, []);

  const handlePreview = (paperId: string) => {
    setPreviewLoading(true);
    api
      .get<any>(`/question-papers/${paperId}`)
      .then((res) => setPreviewPaper(res))
      .catch((err) => console.error("Error loading preview:", err))
      .finally(() => setPreviewLoading(false));
  };

  const filteredRevisions = revisions.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.exam_name.toLowerCase().includes(q) ||
        item.subject_code.toLowerCase().includes(q) ||
        item.subject_name.toLowerCase().includes(q) ||
        (item.created_by_name && item.created_by_name.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revision & Rejection Queue"
        description="Monitor question papers returned for syllabus alignment, difficulty rebalancing, or rejected during Controller governance review."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRevisions()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--font-color)] hover:text-[var(--title-color)] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>
            <Link
              href="/dashboard/controller/approvals"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition font-bold"
            >
              <span>Back to Approvals</span>
            </Link>
          </div>
        }
      />

      {/* Search Bar */}
      <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--font-color)]" />
          <input
            type="text"
            placeholder="Search revision queue by paper or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>
        <div className="text-xs text-[var(--font-color)]">
          Total items: <span className="font-bold text-[var(--title-color)]">{filteredRevisions.length}</span>
        </div>
      </div>

      {/* Revisions List */}
      {loading ? (
        <div className="p-8 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <div className="w-8 h-8 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--font-color)]">Loading revisions...</p>
        </div>
      ) : filteredRevisions.length === 0 ? (
        <div className="p-12 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <RotateCcw className="w-10 h-10 text-[var(--font-color)] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[var(--title-color)] mb-1">Queue Clear</h3>
          <p className="text-xs text-[var(--font-color)]">
            No question papers currently require revision or are in rejected status.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRevisions.map((item) => (
            <div
              key={item.id}
              className={`p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border transition shadow-[var(--shadow-sm)] space-y-3 ${
                item.status === "REJECTED"
                  ? "border-red-500/30 bg-red-50/5"
                  : "border-amber-500/30 bg-amber-50/5"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === "REJECTED" ? "danger" : "warning"} size="sm">
                      {item.status}
                    </Badge>
                    <span className="font-bold text-sm text-[var(--title-color)]">{item.title}</span>
                    <Badge variant="outline" size="sm">v{item.version}</Badge>
                  </div>
                  <div className="text-xs text-[var(--font-color)] flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--title-color)]">{item.exam_name}</span>
                    <span>&bull;</span>
                    <span>{item.subject_code} - {item.subject_name}</span>
                    <span>&bull;</span>
                    <span>{item.department_name || "Institution"}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{item.created_by_name || "Faculty Author"}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(item.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--title-color)] hover:border-[#82c341] transition flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Paper</span>
                  </button>
                </div>
              </div>

              {/* Justification Box */}
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-xs">
                <span className="font-bold text-[var(--title-color)] block mb-0.5">
                  {item.status === "REJECTED" ? "Rejection Reason:" : "Controller Revision Feedback:"}
                </span>
                <p className="text-[var(--font-color)] italic">
                  {item.rejection_reason || item.revision_comments || "No explicit comments recorded."}
                </p>
                <div className="mt-2 text-[10px] text-[var(--paragraph-color)]">
                  Last updated: {item.updated_at ? new Date(item.updated_at).toLocaleString() : "Recently"}
                </div>
              </div>
            </div>
          ))}
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
