"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Question, FacultySubjectItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, DifficultyBadge, TypeBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  Layers,
  Search,
  Filter,
  Eye,
  Copy,
  CheckCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowRight
} from "lucide-react";

export default function FacultyQuestionBankPage() {
  const toast = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<FacultySubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedMarks, setSelectedMarks] = useState<number | "">("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Preview Modal
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  const fetchQuestionBank = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };
      if (search) params.search = search;
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedType) params.question_type = selectedType;
      if (selectedDifficulty) params.difficulty = selectedDifficulty;
      if (selectedMarks) params.marks = selectedMarks;

      const res = await api.get<{
        items: Question[];
        meta: { total: number; page: number; page_size: number; total_pages: number };
      }>("/faculty/question-bank", params);

      setQuestions(res.items || []);
      setTotalPages(res.meta?.total_pages || 1);
      setTotalCount(res.meta?.total || 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to load question bank");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get<FacultySubjectItem[]>("/faculty/subjects").then((data) => {
      setSubjects(data || []);
    });
  }, []);

  useEffect(() => {
    fetchQuestionBank();
  }, [page, selectedSubject, selectedType, selectedDifficulty, selectedMarks]);

  const handleDuplicateToMyDrafts = async (questionId: string) => {
    try {
      await api.post(`/faculty/questions/${questionId}/duplicate`);
      toast.success("Question copied to your personal drafts!");
    } catch (err: any) {
      toast.error(err.message || "Failed to copy question");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Departmental Question Bank"
        subtitle="Search and explore approved, reusable academic questions across your assigned curriculum. Use approved questions to build official examination papers."
      />

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--paragraph-color)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search approved questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
            />
          </div>

          <select
            value={selectedSubject}
            onChange={(e) => { setSelectedSubject(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Assigned Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Question Types</option>
            <option value="MCQ">Multiple Choice (MCQ)</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="FILL_BLANK">Fill in Blank</option>
            <option value="DESCRIPTIVE">Descriptive</option>
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => { setSelectedDifficulty(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          <input
            type="number"
            min="1"
            placeholder="Filter by Marks..."
            value={selectedMarks}
            onChange={(e) => { setSelectedMarks(e.target.value ? Number(e.target.value) : ""); setPage(1); }}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>
      </div>

      {/* Questions Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] text-[var(--paragraph-color)] space-y-2">
          <Layers className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-[var(--title-color)]">No approved questions found</h3>
          <p className="text-xs">There are no approved questions matching the selected filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-4 shadow-[var(--shadow-sm)] hover:border-[#82c341] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-100 text-blue-800">
                    {q.subject_code}
                  </span>
                  <TypeBadge type={q.question_type} />
                  <DifficultyBadge difficulty={q.difficulty} />
                  <span className="text-[11px] font-bold text-[var(--title-color)]">
                    {q.marks} Mark{q.marks !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Unit: {q.unit_title || "General"}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-[var(--title-color)] line-clamp-2">
                  {q.question_text}
                </h4>

                {q.explanation && (
                  <p className="text-[11px] text-[var(--paragraph-color)] line-clamp-1 italic">
                    Note: {q.explanation}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setPreviewQuestion(q)}
                  className="py-1.5 px-3 rounded-[var(--radius-md)] border border-[var(--border-color)] hover:bg-gray-100 text-xs font-semibold text-[var(--title-color)] flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-gray-500" />
                  <span>Inspect</span>
                </button>
                <button
                  onClick={() => handleDuplicateToMyDrafts(q.id)}
                  className="py-1.5 px-3 rounded-[var(--radius-md)] bg-[#82c341] text-black font-semibold text-xs hover:bg-[#72b035] flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy to Drafts</span>
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] text-xs">
              <span className="text-[var(--paragraph-color)]">
                Showing page {page} of {totalPages} ({totalCount} total approved questions)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded border border-[var(--border-color)] bg-white disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded border border-[var(--border-color)] bg-white disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inspect Modal */}
      <Modal
        isOpen={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
        title="Question Bank Item Detail"
      >
        {previewQuestion && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-100">
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-100 text-blue-800">
                {previewQuestion.subject_code} — {previewQuestion.subject_name}
              </span>
              <TypeBadge type={previewQuestion.question_type} />
              <DifficultyBadge difficulty={previewQuestion.difficulty} />
              <span className="font-bold text-[var(--title-color)] ml-auto">
                {previewQuestion.marks} Mark{previewQuestion.marks !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-3 bg-gray-50 rounded-[var(--radius-md)] border border-gray-100">
              <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Question Prompt:</span>
              <p className="font-medium text-[var(--title-color)] whitespace-pre-wrap text-sm">
                {previewQuestion.question_text}
              </p>
            </div>

            {/* MCQ Options */}
            {previewQuestion.question_type === "MCQ" && previewQuestion.options && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Options:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {previewQuestion.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded border text-xs flex items-center justify-between ${
                        opt.is_correct
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      <span>
                        <strong className="mr-1.5">{opt.option_key}:</strong> {opt.option_text}
                      </span>
                      {opt.is_correct && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewQuestion.explanation && (
              <div className="p-3 bg-blue-50/50 rounded border border-blue-100">
                <span className="text-[10px] font-bold uppercase text-blue-700 block mb-0.5">Model Explanation:</span>
                <p className="text-gray-700">{previewQuestion.explanation}</p>
              </div>
            )}

            {previewQuestion.expected_answer && (
              <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <span className="text-[10px] font-bold uppercase text-gray-500 block mb-0.5">Expected Answer:</span>
                <p className="text-gray-700">{previewQuestion.expected_answer}</p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  handleDuplicateToMyDrafts(previewQuestion.id);
                  setPreviewQuestion(null);
                }}
                className="px-4 py-2 rounded-[var(--radius-md)] bg-[#82c341] text-black font-semibold text-xs hover:bg-[#72b035] flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy into My Questions</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
