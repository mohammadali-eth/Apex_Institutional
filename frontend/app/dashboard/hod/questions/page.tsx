"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Question, HODSubjectItem, PaginatedResult } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  HelpCircle,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  X,
} from "lucide-react";

export default function HODQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<HODSubjectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState("");

  // Preview modal
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  const loadSubjects = () => {
    api
      .get<HODSubjectItem[]>("/hod/subjects")
      .then((data) => setSubjects(data || []))
      .catch((err) => console.error("Error loading subjects:", err));
  };

  const loadQuestions = () => {
    setLoading(true);
    api
      .get<PaginatedResult<Question>>("/hod/questions", {
        subject_id: subjectId || undefined,
        question_type: questionType || undefined,
        difficulty: difficulty || undefined,
        status: status || undefined,
        search: search.trim() || undefined,
        page,
        page_size: pageSize,
      })
      .then((res) => {
        setQuestions(res.items || []);
        setTotal(res.total ?? res.meta?.total ?? 0);
        setTotalPages(res.pages ?? res.meta?.total_pages ?? 1);
      })
      .catch((err) => {
        console.error("Error loading questions:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [page, subjectId, questionType, difficulty, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadQuestions();
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "APPROVED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#82c341]/20 text-[#2e5914]">APPROVED</span>;
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef3c7] text-[#92400e]">PENDING REVIEW</span>;
      case "REVISION_REQUIRED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ede9fe] text-[#5b21b6]">REVISION</span>;
      case "REJECTED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fee2e2] text-[#991b1b]">REJECTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">{st}</span>;
    }
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case "EASY":
        return <span className="font-semibold text-[#82c341]">Easy</span>;
      case "MEDIUM":
        return <span className="font-semibold text-[#d97706]">Medium</span>;
      case "HARD":
        return <span className="font-semibold text-[#e53e3e]">Hard</span>;
      default:
        return <span>{diff}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Question Bank"
        subtitle="Comprehensive oversight of curriculum items, question metadata, difficulty distributions, and faculty authorship."
      >
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/hod/review-questions"
            className="px-3.5 py-2 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] transition flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-[#82c341]" />
            <span>Review Queue</span>
          </Link>
          <Link
            href="/questions/create"
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Create Question</span>
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
              placeholder="Search question text, tags..."
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-color)]">
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
            value={questionType}
            onChange={(e) => {
              setQuestionType(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Question Types</option>
            <option value="MCQ">Multiple Choice (MCQ)</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="FILL_BLANK">Fill in Blank</option>
            <option value="DESCRIPTIVE">Descriptive / Essay</option>
          </select>

          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="SUBMITTED">Submitted / Pending</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="REVISION_REQUIRED">Revision Required</option>
            <option value="REJECTED">Rejected</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#45525b] text-white border-b border-[#3c474f]">
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Question Prompt</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Type / Marks</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Difficulty</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Author</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    Loading department question bank items...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--font-color)]">
                    No questions found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id} className="hover:bg-[var(--background-color)]/60 transition">
                    <td className="py-3 px-4 max-w-md">
                      <p className="font-semibold text-[var(--title-color)] line-clamp-2">
                        {q.question_text}
                      </p>
                      {q.tags && q.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {q.tags.slice(0, 3).map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] px-1 py-0.2 rounded bg-[var(--background-color)] text-[var(--font-color)] border border-[var(--border-color)]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[var(--title-color)]">{q.question_type}</span>
                      <span className="text-[11px] text-[var(--paragraph-color)] block">{q.marks} Marks</span>
                    </td>
                    <td className="py-3 px-4">{getDifficultyBadge(q.difficulty)}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-[var(--title-color)] block">{q.creator_name || "Faculty"}</span>
                      <span className="text-[10px] text-[var(--font-color)]">
                        {new Date(q.created_at || "").toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(q.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          title="Preview Question"
                          className="p-1.5 text-[var(--paragraph-color)] hover:text-[#82c341] hover:bg-[var(--background-color)] rounded-[var(--radius-sm)] transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(q.status === "SUBMITTED" || q.status === "UNDER_REVIEW") && (
                          <Link
                            href="/dashboard/hod/review-questions"
                            title="Go to Review Queue"
                            className="px-2 py-1 bg-[#82c341] text-[#000000] font-bold text-[10px] rounded-[var(--radius-sm)] transition uppercase"
                          >
                            Review
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
            Showing <span className="font-bold text-[var(--title-color)]">{questions.length}</span> of{" "}
            <span className="font-bold text-[var(--title-color)]">{total}</span> questions
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

      {/* Modal: Question Details Preview */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Question Details</h3>
              </div>
              <button onClick={() => setPreviewQuestion(null)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs px-2 py-0.5 bg-[#45525b]/10 text-[#45525b] rounded">
                    {previewQuestion.question_type}
                  </span>
                  <span className="font-bold text-xs px-2 py-0.5 bg-[#82c341]/15 text-[#2e5914] rounded">
                    {previewQuestion.marks} Marks
                  </span>
                  {getDifficultyBadge(previewQuestion.difficulty)}
                </div>
                {getStatusBadge(previewQuestion.status)}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--font-color)]">Question Prompt</label>
                <p className="text-sm font-semibold text-[var(--title-color)] mt-1 whitespace-pre-line">
                  {previewQuestion.question_text}
                </p>
              </div>

              {previewQuestion.options && previewQuestion.options.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--font-color)]">Answer Options</label>
                  <div className="space-y-1.5 mt-1.5">
                    {previewQuestion.options.map((opt) => (
                      <div
                        key={opt.option_key}
                        className={`p-2.5 rounded-[var(--radius-md)] text-xs border flex items-center justify-between ${
                          opt.is_correct
                            ? "bg-[#82c341]/15 border-[#82c341] text-[#2e5914] font-bold"
                            : "bg-[var(--background-color)] border-[var(--border-color)] text-[var(--paragraph-color)]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/60 flex items-center justify-center font-bold text-[10px]">
                            {opt.option_key}
                          </span>
                          <span>{opt.option_text}</span>
                        </div>
                        {opt.is_correct && <CheckCircle2 className="w-4 h-4 text-[#82c341]" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewQuestion.expected_answer && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--font-color)]">Expected Answer</label>
                  <p className="text-xs text-[var(--paragraph-color)] mt-1 bg-[var(--background-color)] p-2.5 rounded border border-[var(--border-color)] whitespace-pre-line">
                    {previewQuestion.expected_answer}
                  </p>
                </div>
              )}

              {previewQuestion.explanation && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--font-color)]">Pedagogical Rationale / Solution</label>
                  <p className="text-xs text-[var(--paragraph-color)] mt-1 bg-[var(--background-color)] p-2.5 rounded border border-[var(--border-color)] whitespace-pre-line">
                    {previewQuestion.explanation}
                  </p>
                </div>
              )}

              {previewQuestion.review_feedback && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#d97706]">Reviewer Feedback</label>
                  <p className="text-xs text-[#92400e] mt-1 bg-[#fffbeb] p-2.5 rounded border border-[#fef3c7] whitespace-pre-line">
                    {previewQuestion.review_feedback}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
                <button
                  onClick={() => setPreviewQuestion(null)}
                  className="px-4 py-2 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
