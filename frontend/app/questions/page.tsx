"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, DifficultyBadge, TypeBadge } from "@/components/ui/Badge";
import { Question, Subject, Unit } from "@/lib/types";
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function QuestionsPage() {
  const { user, hasPermission } = useAuth();
  const toast = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedMarks, setSelectedMarks] = useState<number | "">("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Preview Modal
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Review / Approval Action Modal
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [targetQuestion, setTargetQuestion] = useState<Question | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "SUBMIT">("APPROVE");
  const [reviewComments, setReviewComments] = useState("");

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };
      if (search) params.search = search;
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedType) params.question_type = selectedType;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedDifficulty) params.difficulty = selectedDifficulty;
      if (selectedMarks) params.marks = selectedMarks;

      const res = await api.get<{
        items: Question[];
        meta: { total: number; page: number; page_size: number; total_pages: number };
      }>("/questions", params);

      setQuestions(res.items);
      setTotalPages(res.meta.total_pages);
      setTotalCount(res.meta.total);
    } catch (err: any) {
      toast.error(err.message || "Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get<Subject[]>("/academic/subjects").then((data) => setSubjects(data));
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [page, selectedSubject, selectedType, selectedStatus, selectedDifficulty, selectedMarks]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  const handleStatusAction = async () => {
    if (!targetQuestion) return;
    try {
      await api.post(`/questions/${targetQuestion.id}/action`, {
        action: actionType,
        comments: reviewComments,
      });
      toast.success(`Question status updated to ${actionType}!`);
      setActionModalOpen(false);
      setReviewComments("");
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.message || "Failed to transition question status");
    }
  };

  const isReviewer = ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD", "MODERATOR", "REVIEWER"].includes(
    user?.role_name || ""
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Question Bank" },
        ]}
        title="Question Bank Repository"
        description="Vetted repository of institutional exam questions across MCQs, True/False, Fill in the blanks, and Descriptive types."
        actions={
          hasPermission("question.create") && user?.role_name !== "STUDENT" ? (
            <Link href="/questions/create" className="btn-primary flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Create Question</span>
            </Link>
          ) : undefined
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[8px] border border-[#dcdcdc] shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#838383] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search question text, tags, or explanations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#dcdcdc] rounded-[6px] text-xs text-[#44535b] placeholder:text-[#838383] focus:outline-none focus:border-[#82c341] focus:ring-1 focus:ring-[#82c341]"
            />
          </div>
          <button type="submit" className="btn-secondary text-xs">
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-[#dcdcdc] rounded-[6px] bg-[#f6f6f7] text-[#44535b] font-medium focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-[#dcdcdc] rounded-[6px] bg-[#f6f6f7] text-[#44535b] font-medium focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="FILL_BLANK">Fill Blank</option>
            <option value="DESCRIPTIVE">Descriptive</option>
          </select>

          {/* Marks Filter */}
          <select
            value={selectedMarks}
            onChange={(e) => {
              setSelectedMarks(e.target.value ? parseInt(e.target.value) : "");
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-[#dcdcdc] rounded-[6px] bg-[#f6f6f7] text-[#44535b] font-medium focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Marks</option>
            <option value="1">1 Mark</option>
            <option value="2">2 Marks</option>
            <option value="5">5 Marks</option>
            <option value="8">8 Marks</option>
            <option value="10">10 Marks</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => {
              setSelectedDifficulty(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-[#dcdcdc] rounded-[6px] bg-[#f6f6f7] text-[#44535b] font-medium focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-[#dcdcdc] rounded-[6px] bg-[#f6f6f7] text-[#44535b] font-medium focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="DRAFT">Draft</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-[8px] border border-[#dcdcdc] overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f6f6f7] border-b border-[#dcdcdc] text-[#44535b] font-bold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Question</th>
              <th className="px-5 py-3">Subject / Unit</th>
              <th className="px-5 py-3 text-center">Type</th>
              <th className="px-5 py-3 text-center">Marks</th>
              <th className="px-5 py-3 text-center">Difficulty</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dcdcdc]/70">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[#838383]">
                  <div className="w-6 h-6 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading question repository...
                </td>
              </tr>
            ) : questions.length > 0 ? (
              questions.map((q) => (
                <tr key={q.id} className="hover:bg-[#f6f6f7]/80 transition">
                  <td className="px-5 py-3.5 max-w-md">
                    <p className="font-semibold text-[#44535b] line-clamp-2">{q.question_text}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {q.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded-[4px] bg-[#f6f6f7] border border-[#dcdcdc] text-[#676767] text-[10px]"
                        >
                          #{tag}
                        </span>
                      ))}
                      {q.tags.length > 3 && (
                        <span className="text-[10px] text-[#838383]">+{q.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#676767]">
                    <p className="font-bold text-[#44535b]">{q.subject_code}</p>
                    <p className="text-[11px] text-[#838383] truncate max-w-[150px]">
                      {q.unit_title || "General Unit"}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <TypeBadge type={q.question_type} />
                  </td>
                  <td className="px-5 py-3.5 text-center font-bold text-[#44535b]">
                    {q.marks} M
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <DifficultyBadge difficulty={q.difficulty} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setPreviewQuestion(q)}
                        className="p-1.5 text-[#676767] hover:text-[#000000] hover:bg-[#eaf5de] rounded-[4px] transition"
                        title="Preview question"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Submit for review button (if draft) */}
                      {q.status === "DRAFT" && (
                        <button
                          onClick={() => {
                            setTargetQuestion(q);
                            setActionType("SUBMIT");
                            setActionModalOpen(true);
                          }}
                          className="p-1.5 text-[#676767] hover:text-[#d97706] hover:bg-amber-50 rounded-[4px] transition"
                          title="Submit for review"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}

                      {/* Approve / Reject buttons for Reviewers */}
                      {isReviewer && q.status !== "APPROVED" && (
                        <button
                          onClick={() => {
                            setTargetQuestion(q);
                            setActionType("APPROVE");
                            setActionModalOpen(true);
                          }}
                          className="p-1.5 text-[#676767] hover:text-[#2d5016] hover:bg-[#eaf5de] rounded-[4px] transition"
                          title="Approve Question"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      {isReviewer && q.status !== "REJECTED" && (
                        <button
                          onClick={() => {
                            setTargetQuestion(q);
                            setActionType("REJECT");
                            setActionModalOpen(true);
                          }}
                          className="p-1.5 text-[#676767] hover:text-[#991b1b] hover:bg-rose-50 rounded-[4px] transition"
                          title="Reject Question"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[#838383]">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 text-[#dcdcdc]" />
                  <p className="font-semibold text-xs text-[#44535b]">No questions found matching criteria.</p>
                  <p className="text-[11px] text-[#676767] mt-1">Try adjusting your filters or author a new question.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="px-5 py-3 bg-[#f6f6f7] border-t border-[#dcdcdc] flex items-center justify-between text-xs text-[#676767]">
          <span>
            Showing <b>{questions.length}</b> of <b>{totalCount}</b> questions
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-[4px] border border-[#dcdcdc] bg-white hover:bg-[#f6f6f7] text-[#44535b] disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page <b>{page}</b> of <b>{totalPages}</b>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-[4px] border border-[#dcdcdc] bg-white hover:bg-[#f6f6f7] text-[#44535b] disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* QUESTION PREVIEW MODAL */}
      <Modal
        isOpen={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
        title="Question Details"
        subtitle={`ID: ${previewQuestion?.id.substring(0, 8)}... • ${previewQuestion?.subject_name}`}
        maxWidth="lg"
      >
        {previewQuestion && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#dcdcdc]">
              <div className="flex items-center gap-2">
                <TypeBadge type={previewQuestion.question_type} />
                <DifficultyBadge difficulty={previewQuestion.difficulty} />
                <StatusBadge status={previewQuestion.status} />
              </div>
              <span className="font-bold text-sm text-[#44535b]">{previewQuestion.marks} Marks</span>
            </div>

            <div>
              <p className="text-[#838383] font-bold uppercase text-[10px] tracking-wider mb-1">Question Text</p>
              <p className="text-sm font-semibold text-[#44535b] bg-[#f6f6f7] p-3 rounded-[6px] border border-[#dcdcdc]">
                {previewQuestion.question_text}
              </p>
            </div>

            {/* MCQ Options */}
            {previewQuestion.question_type === "MCQ" && (
              <div>
                <p className="text-[#838383] font-bold uppercase text-[10px] tracking-wider mb-1.5">Options</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {previewQuestion.options.map((opt) => (
                    <div
                      key={opt.option_key}
                      className={`p-3 rounded-[6px] border flex items-center justify-between ${
                        opt.is_correct
                          ? "bg-[#eaf5de] border-[#82c341] text-[#2d5016] font-bold"
                          : "bg-white border-[#dcdcdc] text-[#44535b]"
                      }`}
                    >
                      <span><b>({opt.option_key})</b> {opt.option_text}</span>
                      {opt.is_correct && <CheckCircle className="w-4 h-4 text-[#82c341] shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expected Answer / Explanation */}
            {(previewQuestion.expected_answer || previewQuestion.explanation) && (
              <div className="space-y-2 pt-2 border-t border-[#dcdcdc]">
                {previewQuestion.expected_answer && (
                  <div>
                    <p className="text-[#838383] font-bold uppercase text-[10px] tracking-wider mb-0.5">Expected Answer / Solution</p>
                    <p className="text-[#44535b] bg-[#f6f6f7] p-2.5 rounded-[6px] border border-[#dcdcdc]">
                      {previewQuestion.expected_answer}
                    </p>
                  </div>
                )}
                {previewQuestion.explanation && (
                  <div>
                    <p className="text-[#838383] font-bold uppercase text-[10px] tracking-wider mb-0.5">Explanation</p>
                    <p className="text-[#676767] italic bg-[#f6f6f7] p-2.5 rounded-[6px] border border-[#dcdcdc]">
                      {previewQuestion.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* APPROVAL / REJECTION / SUBMIT ACTION MODAL */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={`${actionType === "APPROVE" ? "Approve" : actionType === "REJECT" ? "Reject" : "Submit"} Question`}
        subtitle="Manage question bank lifecycle transition"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#676767]">
            Are you sure you want to transition question <b className="text-[#44535b]">"{targetQuestion?.question_text.slice(0, 60)}..."</b> to{" "}
            <b className="text-[#44535b]">{actionType}</b>?
          </p>
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">
              Reviewer Feedback / Comments
            </label>
            <textarea
              rows={3}
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              placeholder="e.g. Verified against syllabus unit standards."
              className="input-theme"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#dcdcdc]">
            <button
              onClick={() => setActionModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleStatusAction}
              className={
                actionType === "APPROVE"
                  ? "btn-primary"
                  : actionType === "REJECT"
                  ? "btn-danger"
                  : "btn-primary"
              }
            >
              Confirm {actionType}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}