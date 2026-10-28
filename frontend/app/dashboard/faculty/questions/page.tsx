"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Question, FacultySubjectItem, FacultySubjectDetail, FacultyUnitDetail } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, DifficultyBadge, TypeBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Send,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles
} from "lucide-react";

interface OptionFormItem {
  option_key: string;
  option_text: string;
  is_correct: boolean;
}

export default function FacultyQuestionsPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subject_id") || "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<FacultySubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Preview Modal
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Create / Edit Modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formUnitId, setFormUnitId] = useState("");
  const [formTopicId, setFormTopicId] = useState("");
  const [formText, setFormText] = useState("");
  const [formType, setFormType] = useState("MCQ");
  const [formMarks, setFormMarks] = useState(1);
  const [formDifficulty, setFormDifficulty] = useState("MEDIUM");
  const [formExplanation, setFormExplanation] = useState("");
  const [formExpectedAnswer, setFormExpectedAnswer] = useState("");
  const [formOptions, setFormOptions] = useState<OptionFormItem[]>([
    { option_key: "A", option_text: "", is_correct: true },
    { option_key: "B", option_text: "", is_correct: false },
    { option_key: "C", option_text: "", is_correct: false },
    { option_key: "D", option_text: "", is_correct: false },
  ]);
  const [formUnits, setFormUnits] = useState<FacultyUnitDetail[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Modal
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

      const res = await api.get<{
        items: Question[];
        meta: { total: number; page: number; page_size: number; total_pages: number };
      }>("/faculty/questions", params);

      setQuestions(res.items || []);
      setTotalPages(res.meta?.total_pages || 1);
      setTotalCount(res.meta?.total || 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get<FacultySubjectItem[]>("/faculty/subjects").then((data) => {
      setSubjects(data || []);
      if (!formSubjectId && data && data.length > 0) {
        setFormSubjectId(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [page, selectedSubject, selectedType, selectedStatus, selectedDifficulty]);

  // Load units when formSubjectId changes in create modal
  useEffect(() => {
    if (formSubjectId) {
      api.get<FacultySubjectDetail>(`/faculty/subjects/${formSubjectId}`)
        .then((res) => {
          setFormUnits(res?.units || []);
        })
        .catch(() => setFormUnits([]));
    } else {
      setFormUnits([]);
    }
  }, [formSubjectId]);

  const handleOpenCreateModal = () => {
    setEditingQuestion(null);
    setFormSubjectId(subjects.length > 0 ? subjects[0].id : "");
    setFormUnitId("");
    setFormTopicId("");
    setFormText("");
    setFormType("MCQ");
    setFormMarks(1);
    setFormDifficulty("MEDIUM");
    setFormExplanation("");
    setFormExpectedAnswer("");
    setFormOptions([
      { option_key: "A", option_text: "", is_correct: true },
      { option_key: "B", option_text: "", is_correct: false },
      { option_key: "C", option_text: "", is_correct: false },
      { option_key: "D", option_text: "", is_correct: false },
    ]);
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (q: Question) => {
    setEditingQuestion(q);
    setFormSubjectId(q.subject_id);
    setFormUnitId(q.unit_id || "");
    setFormTopicId(q.topic_id || "");
    setFormText(q.question_text);
    setFormType(q.question_type);
    setFormMarks(q.marks);
    setFormDifficulty(q.difficulty);
    setFormExplanation(q.explanation || "");
    setFormExpectedAnswer(q.expected_answer || "");

    if (q.options && q.options.length > 0) {
      setFormOptions(q.options.map(o => ({
        option_key: o.option_key,
        option_text: o.option_text,
        is_correct: o.is_correct
      })));
    } else {
      setFormOptions([
        { option_key: "A", option_text: "", is_correct: true },
        { option_key: "B", option_text: "", is_correct: false },
      ]);
    }
    setFormModalOpen(true);
  };

  const handleSaveQuestion = async (isSubmit: boolean) => {
    if (!formSubjectId) {
      toast.error("Please select an assigned subject.");
      return;
    }
    if (!formText.trim()) {
      toast.error("Question text is required.");
      return;
    }
    if (formMarks <= 0) {
      toast.error("Marks must be greater than zero.");
      return;
    }

    if (formType === "MCQ") {
      const validOptions = formOptions.filter(o => o.option_text.trim() !== "");
      if (validOptions.length < 2) {
        toast.error("MCQs require at least two option choices.");
        return;
      }
      if (!validOptions.some(o => o.is_correct)) {
        toast.error("At least one option must be marked as the correct answer.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        subject_id: formSubjectId,
        unit_id: formUnitId || null,
        topic_id: formTopicId || null,
        question_text: formText.trim(),
        question_type: formType,
        marks: Number(formMarks),
        difficulty: formDifficulty,
        explanation: formExplanation.trim() || null,
        expected_answer: formExpectedAnswer.trim() || null,
        tags: [],
        is_submitted: isSubmit
      };

      if (formType === "MCQ") {
        payload.options = formOptions.filter(o => o.option_text.trim() !== "");
      }

      if (editingQuestion) {
        await api.put(`/faculty/questions/${editingQuestion.id}`, payload);
        toast.success(isSubmit ? "Question updated and submitted for review!" : "Question updated successfully!");
      } else {
        await api.post("/faculty/questions", payload);
        toast.success(isSubmit ? "Question created and submitted for review!" : "Question draft saved!");
      }

      setFormModalOpen(false);
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.message || "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async (questionId: string) => {
    try {
      await api.post(`/faculty/questions/${questionId}/submit`);
      toast.success("Question submitted to HOD moderation queue!");
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit question");
    }
  };

  const handleDuplicate = async (questionId: string) => {
    try {
      await api.post(`/faculty/questions/${questionId}/duplicate`);
      toast.success("Question duplicated into a new draft!");
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate question");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/faculty/questions/${deleteId}`);
      toast.success("Draft question deleted.");
      setDeleteId(null);
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete question");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="My Authored Questions"
        subtitle="Create, edit, and manage question bank items across your assigned course subjects. Submit drafts for departmental moderation."
        action={
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[#82c341] text-black font-semibold text-xs hover:bg-[#72b035] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Question</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--paragraph-color)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search question text..."
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

          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REVISION_REQUIRED">Revision Required</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-[var(--paragraph-color)] text-xs space-y-2">
            <HelpCircle className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-semibold text-[var(--title-color)]">No questions found</p>
            <p>You haven't created questions matching these filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-[var(--border-color)] text-[11px] font-bold text-[var(--paragraph-color)] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Question Text</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Difficulty</th>
                  <th className="py-3 px-2 text-center">Marks</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {questions.map((q) => {
                  const isLocked = q.status === "APPROVED";
                  const canEdit = ["DRAFT", "REVISION_REQUIRED", "REJECTED"].includes(q.status);

                  return (
                    <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-bold text-[var(--title-color)] line-clamp-2">
                          {q.question_text}
                        </div>
                        {q.review_feedback && (
                          <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 shrink-0" />
                            <span className="line-clamp-1">Review feedback: {q.review_feedback}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[var(--paragraph-color)] whitespace-nowrap">
                        {q.subject_code || "—"}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <TypeBadge type={q.question_type} />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <DifficultyBadge difficulty={q.difficulty} />
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-[var(--title-color)]">
                        {q.marks}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Preview Action */}
                          <button
                            onClick={() => setPreviewQuestion(q)}
                            title="Preview Question"
                            className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Submit for Review Action */}
                          {canEdit && (
                            <button
                              onClick={() => handleSubmitForReview(q.id)}
                              title="Submit for Moderation"
                              className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Action */}
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEditModal(q)}
                              title="Edit Question"
                              className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Duplicate Action */}
                          <button
                            onClick={() => handleDuplicate(q.id)}
                            title="Duplicate into Draft"
                            className="p-1.5 rounded hover:bg-purple-100 text-purple-600 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete Action */}
                          {!isLocked && (
                            <button
                              onClick={() => setDeleteId(q.id)}
                              title="Delete Draft"
                              className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--border-color)] bg-gray-50 text-xs">
            <span className="text-[var(--paragraph-color)]">
              Showing page {page} of {totalPages} ({totalCount} total)
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

      {/* Question Details Preview Modal */}
      <Modal
        isOpen={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
        title="Question Details & Review Information"
      >
        {previewQuestion && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-100">
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-100 text-blue-800">
                {previewQuestion.subject_code}
              </span>
              <TypeBadge type={previewQuestion.question_type} />
              <DifficultyBadge difficulty={previewQuestion.difficulty} />
              <StatusBadge status={previewQuestion.status} />
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
            {previewQuestion.question_type === "MCQ" && previewQuestion.options && previewQuestion.options.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Choices:</span>
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

            {/* Explanation & Answer */}
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

            {/* Reviewer Feedback */}
            {previewQuestion.review_feedback && (
              <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Reviewer Feedback:</span>
                </div>
                <p className="italic">"{previewQuestion.review_feedback}"</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create / Edit Question Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingQuestion ? "Edit Question Item" : "Create New Question"}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--title-color)] mb-1">
                Assigned Subject *
              </label>
              <select
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--title-color)] mb-1">
                Syllabus Unit
              </label>
              <select
                value={formUnitId}
                onChange={(e) => setFormUnitId(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
              >
                <option value="">Select Unit (Optional)</option>
                {formUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.unit_number}: {u.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--title-color)] mb-1">
                Question Type *
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
              >
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="FILL_BLANK">Fill in Blank</option>
                <option value="DESCRIPTIVE">Descriptive</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--title-color)] mb-1">
                Marks *
              </label>
              <input
                type="number"
                min="1"
                value={formMarks}
                onChange={(e) => setFormMarks(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--title-color)] mb-1">
                Difficulty Level *
              </label>
              <select
                value={formDifficulty}
                onChange={(e) => setFormDifficulty(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--title-color)] mb-1">
              Question Text / Statement *
            </label>
            <textarea
              rows={3}
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="Enter clear, concise question prompt..."
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
            />
          </div>

          {/* MCQ Options Configuration */}
          {formType === "MCQ" && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--title-color)] text-[11px]">
                  Multiple Choice Options (Check the correct answer)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextKey = String.fromCharCode(65 + formOptions.length);
                    setFormOptions([...formOptions, { option_key: nextKey, option_text: "", is_correct: false }]);
                  }}
                  className="text-[11px] font-bold text-[#82c341] hover:underline"
                >
                  + Add Choice
                </button>
              </div>

              <div className="space-y-2">
                {formOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 font-bold text-center text-gray-500">{opt.option_key}</span>
                    <input
                      type="text"
                      placeholder={`Choice ${opt.option_key} text...`}
                      value={opt.option_text}
                      onChange={(e) => {
                        const updated = [...formOptions];
                        updated[idx].option_text = e.target.value;
                        setFormOptions(updated);
                      }}
                      className="flex-1 px-3 py-1.5 rounded border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                      <input
                        type="radio"
                        name="correct_option"
                        checked={opt.is_correct}
                        onChange={() => {
                          const updated = formOptions.map((o, i) => ({
                            ...o,
                            is_correct: i === idx
                          }));
                          setFormOptions(updated);
                        }}
                      />
                      <span>Correct</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[var(--title-color)] mb-1">
              Explanation / Reference
            </label>
            <textarea
              rows={2}
              value={formExplanation}
              onChange={(e) => setFormExplanation(e.target.value)}
              placeholder="Reference explanation, justification, or source citation..."
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--title-color)] mb-1">
              Model Expected Answer
            </label>
            <textarea
              rows={2}
              value={formExpectedAnswer}
              onChange={(e) => setFormExpectedAnswer(e.target.value)}
              placeholder="Model key answer for evaluators..."
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setFormModalOpen(false)}
              className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] text-xs text-[var(--paragraph-color)] hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveQuestion(false)}
              className="px-4 py-2 rounded-[var(--radius-md)] bg-gray-200 text-gray-800 font-semibold text-xs hover:bg-gray-300 disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveQuestion(true)}
              className="px-4 py-2 rounded-[var(--radius-md)] bg-[#82c341] text-black font-semibold text-xs hover:bg-[#72b035] disabled:opacity-50"
            >
              {saving ? "Submitting..." : "Submit for Moderation"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirm Question Deletion"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[var(--paragraph-color)]">
            Are you sure you want to permanently delete this draft question? This operation cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteId(null)}
              className="px-3 py-1.5 rounded border border-gray-300 text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 rounded bg-red-600 text-white font-bold"
            >
              Delete Question
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
