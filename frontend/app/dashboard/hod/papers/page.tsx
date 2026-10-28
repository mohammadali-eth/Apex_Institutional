"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { QuestionPaper, HODSubjectItem, PaginatedResult } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Eye,
  ChevronLeft,
  ChevronRight,
  Printer,
  ShieldCheck,
} from "lucide-react";

export default function HODPapersPage() {
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [subjects, setSubjects] = useState<HODSubjectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState("");

  const loadSubjects = () => {
    api
      .get<HODSubjectItem[]>("/hod/subjects")
      .then((data) => setSubjects(data || []))
      .catch((err) => console.error("Error loading subjects:", err));
  };

  const loadPapers = () => {
    setLoading(true);
    api
      .get<PaginatedResult<QuestionPaper>>("/hod/papers", {
        subject_id: subjectId || undefined,
        status: status || undefined,
        search: search.trim() || undefined,
        page,
        page_size: pageSize,
      })
      .then((res: any) => {
        if (Array.isArray(res)) {
          setPapers(res);
          setTotal(res.length);
          setTotalPages(1);
        } else {
          setPapers(res.items || []);
          setTotal(res.total ?? res.meta?.total ?? 0);
          setTotalPages(res.pages ?? res.meta?.total_pages ?? 1);
        }
      })
      .catch((err) => console.error("Error loading papers:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    loadPapers();
  }, [page, subjectId, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPapers();
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "PUBLISHED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#82c341]/20 text-[#2e5914]">PUBLISHED</span>;
      case "APPROVED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#dbeafe] text-[#1e40af]">HOD APPROVED</span>;
      case "GENERATED":
      case "UNDER_REVIEW":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef3c7] text-[#92400e]">PENDING APPROVAL</span>;
      case "REJECTED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fee2e2] text-[#991b1b]">REJECTED</span>;
      case "DRAFT":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">DRAFT</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Question Papers"
        subtitle="Monitor generated examination papers, blueprint coverage, approval pipelines, and official publications."
      >
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/hod/approve-papers"
            className="px-3.5 py-2 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#82c341]" />
            <span>Approval Queue</span>
          </Link>
          <Link
            href="/question-papers/generator"
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Paper</span>
          </Link>
        </div>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--font-color)]" />
            <input
              type="text"
              placeholder="Search paper title, exam name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] transition"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-color)]">
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Course Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Paper Statuses</option>
            <option value="GENERATED">Generated / Awaiting HOD</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">HOD Approved</option>
            <option value="PUBLISHED">Published</option>
            <option value="REJECTED">Rejected</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Papers Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#45525b] text-white border-b border-[#3c474f]">
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Paper Title & Exam</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Subject Course</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Marks / Duration</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Created By</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    Loading question papers...
                  </td>
                </tr>
              ) : papers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    No question papers found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                papers.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--background-color)]/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[var(--title-color)]">{p.title}</div>
                      <div className="text-[11px] text-[var(--font-color)]">{p.exam_name}</div>
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
                    <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/question-papers/${p.id}`}
                          title="Preview Question Paper"
                          className="p-1.5 text-[var(--paragraph-color)] hover:text-[#82c341] hover:bg-[var(--background-color)] rounded-[var(--radius-sm)] transition"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {(p.status === "GENERATED" || p.status === "UNDER_REVIEW") && (
                          <Link
                            href="/dashboard/hod/approve-papers"
                            title="Go to Approval Queue"
                            className="px-2 py-1 bg-[#2563eb] text-white font-bold text-[10px] rounded-[var(--radius-sm)] transition uppercase"
                          >
                            Approve
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--paragraph-color)]">
          <div>
            Showing <span className="font-bold text-[var(--title-color)]">{papers.length}</span> of{" "}
            <span className="font-bold text-[var(--title-color)]">{total}</span> papers
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-color)] hover:bg-[var(--background-color)] disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-[var(--title-color)]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-color)] hover:bg-[var(--background-color)] disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
