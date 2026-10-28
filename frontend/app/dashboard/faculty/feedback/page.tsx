"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { FacultyFeedbackItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  MessageSquare,
  Search,
  Filter,
  ArrowRight,
  HelpCircle,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink
} from "lucide-react";

export default function FacultyFeedbackPage() {
  const toast = useToast();
  const [feedback, setFeedback] = useState<FacultyFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await api.get<FacultyFeedbackItem[]>("/faculty/feedback");
      setFeedback(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load review feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const filteredItems = feedback.filter((item) => {
    if (typeFilter && item.entity_type !== typeFilter) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(s);
      const matchComments = item.feedback_comments?.toLowerCase().includes(s);
      const matchSubject = item.subject_name?.toLowerCase().includes(s) || item.subject_code?.toLowerCase().includes(s);
      return matchTitle || matchComments || matchSubject;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Moderation Feedback & Decisions"
        subtitle="Review peer comments, revision requests, and approval decisions on questions and examination papers authored by you."
      />

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[var(--paragraph-color)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search feedback or comments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Submission Types</option>
            <option value="QUESTION">Questions</option>
            <option value="PAPER">Examination Papers</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Statuses</option>
            <option value="REVISION_REQUIRED">Revision Required</option>
            <option value="REJECTED">Rejected</option>
            <option value="APPROVED">Approved</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] text-[var(--paragraph-color)] space-y-2">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-[var(--title-color)]">No moderation feedback items found</h3>
          <p className="text-xs">There are no reviewer comments or pending revision notices matching your selection.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={`${item.entity_type}-${item.id}`}
              className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-5 shadow-[var(--shadow-sm)] hover:border-[#82c341] transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    item.entity_type === "QUESTION" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                  }`}>
                    {item.entity_type}
                  </span>
                  <StatusBadge status={item.status} />
                  {item.subject_code && (
                    <span className="font-mono text-xs font-bold text-gray-600">
                      {item.subject_code}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[var(--paragraph-color)]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {item.updated_at ? new Date(item.updated_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                  </span>
                  <span>• Evaluated by <strong>{item.reviewer_name || "Academic Reviewer"}</strong></span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[var(--title-color)]">
                  {item.title}
                </h4>
              </div>

              {item.feedback_comments && (
                <div className={`p-3 rounded-[var(--radius-md)] text-xs border ${
                  item.status === "REVISION_REQUIRED"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : item.status === "REJECTED"
                    ? "bg-red-50 border-red-200 text-red-900"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                }`}>
                  <div className="font-bold mb-0.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Reviewer Notes:</span>
                  </div>
                  <p className="italic whitespace-pre-wrap">{item.feedback_comments}</p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-gray-100">
                {item.entity_type === "QUESTION" ? (
                  <Link
                    href={`/dashboard/faculty/questions`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[#82c341] text-black font-semibold text-xs hover:bg-[#72b035] transition-colors"
                  >
                    <span>Manage in Questions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/faculty/papers`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--secondary-color)] text-white font-semibold text-xs hover:opacity-90 transition-opacity"
                  >
                    <span>View Exam Paper</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#82c341]" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
