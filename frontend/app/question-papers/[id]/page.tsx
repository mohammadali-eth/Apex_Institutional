"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, TypeBadge, DifficultyBadge } from "@/components/ui/Badge";
import { QuestionPaper, PaperValidationResult, Question, QuestionPaperQuestion } from "@/lib/types";
import {
  FileText,
  ArrowLeft,
  Eye,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertTriangle,
  Send,
  Download,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Split,
  Sparkles,
  Database,
  BookmarkCheck,
  Edit3,
  Layers,
  HelpCircle,
} from "lucide-react";

export default function PaperBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.id as string;
  const { user } = useAuth();
  const toast = useToast();

  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [validation, setValidation] = useState<PaperValidationResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Question Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState("");
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");

  // Dynamic Section Modal state
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<{
    id?: string;
    name: string;
    instructions: string;
    section_type: string;
    total_marks: number;
    required_attempts?: number | null;
    selection_rule: string;
  } | null>(null);

  // Add Alternative Modal state
  const [altModalOpen, setAltModalOpen] = useState(false);
  const [targetQuestionForAlt, setTargetQuestionForAlt] = useState<QuestionPaperQuestion | null>(null);
  const [altSourceMode, setAltSourceMode] = useState<"AI" | "BANK">("BANK");
  const [altQuestionType, setAltQuestionType] = useState("SHORT");
  const [altQuestionText, setAltQuestionText] = useState("");
  const [altDifficulty, setAltDifficulty] = useState("MEDIUM");
  const [altBloom, setAltBloom] = useState("UNDERSTAND");
  const [altExpectedAnswer, setAltExpectedAnswer] = useState("");
  const [altMarkingScheme, setAltMarkingScheme] = useState("");
  const [altBankQuestions, setAltBankQuestions] = useState<Question[]>([]);
  const [altSelectedBankId, setAltSelectedBankId] = useState("");
  const [addingAlt, setAddingAlt] = useState(false);

  // Save Template Modal state
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Action status modal
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"SUBMIT_FOR_REVIEW" | "APPROVE" | "REJECT" | "PUBLISH">("SUBMIT_FOR_REVIEW");
  const [comments, setComments] = useState("");

  const fetchPaperAndValidation = async () => {
    setLoading(true);
    try {
      const [pData, vData] = await Promise.all([
        api.get<QuestionPaper>(`/question-papers/${paperId}`),
        api.get<PaperValidationResult>(`/question-papers/${paperId}/validate`),
      ]);
      setPaper(pData);
      setValidation(vData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load question paper");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paperId) {
      fetchPaperAndValidation();
    }
  }, [paperId]);

  const handleOpenAddQuestion = async (sectionId: string) => {
    if (!paper) return;
    setTargetSectionId(sectionId);
    try {
      const res = await api.get<{ items: Question[] }>("/questions", {
        subject_id: paper.subject_id,
        page_size: 50,
      });
      setAvailableQuestions(res.items);
      if (res.items.length > 0) {
        setSelectedQuestionId(res.items[0].id);
      }
      setAddModalOpen(true);
    } catch (err: any) {
      toast.error("Failed to load questions");
    }
  };

  const handleAddQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionId || !targetSectionId) return;

    try {
      await api.post(`/question-papers/${paperId}/questions`, {
        question_id: selectedQuestionId,
        section_id: targetSectionId,
      });
      toast.success("Question added to section!");
      setAddModalOpen(false);
      fetchPaperAndValidation();
    } catch (err: any) {
      toast.error(err.message || "Failed to add question to paper");
    }
  };

  const handleRemoveQuestion = async (pqId: string) => {
    if (!confirm("Are you sure you want to remove this question from the paper?")) return;
    try {
      await api.delete(`/question-papers/${paperId}/questions/${pqId}`);
      toast.success("Question removed from paper");
      fetchPaperAndValidation();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove question");
    }
  };

  const handleMoveQuestion = async (sectionId: string, pqIndex: number, direction: "UP" | "DOWN") => {
    if (!paper) return;
    const sec = paper.sections.find((s) => s.id === sectionId);
    if (!sec) return;

    const targetIndex = direction === "UP" ? pqIndex - 1 : pqIndex + 1;
    if (targetIndex < 0 || targetIndex >= sec.questions.length) return;

    const q1 = sec.questions[pqIndex];
    const q2 = sec.questions[targetIndex];

    try {
      await api.post(`/question-papers/${paperId}/reorder`, {
        reordered_questions: [
          { question_paper_question_id: q1.id, new_order_index: q2.order_index },
          { question_paper_question_id: q2.id, new_order_index: q1.order_index },
        ],
      });
      fetchPaperAndValidation();
    } catch (err: any) {
      toast.error("Failed to update question order");
    }
  };

  // Section Management Handlers
  const handleOpenCreateSection = () => {
    setEditingSection({
      name: `Section ${String.fromCharCode(65 + (paper?.sections.length || 0))}`,
      instructions: "Answer all questions from this section.",
      section_type: "STANDARD",
      total_marks: 20,
      required_attempts: null,
      selection_rule: "ALL",
    });
    setSectionModalOpen(true);
  };

  const handleOpenEditSection = (sec: any) => {
    setEditingSection({
      id: sec.id,
      name: sec.name,
      instructions: sec.instructions || "",
      section_type: sec.section_type || "STANDARD",
      total_marks: sec.total_marks,
      required_attempts: sec.required_attempts || null,
      selection_rule: sec.selection_rule || "ALL",
    });
    setSectionModalOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection || !paper) return;

    try {
      if (editingSection.id) {
        // Update section
        await api.put(`/question-papers/${paperId}/sections/${editingSection.id}`, {
          name: editingSection.name,
          instructions: editingSection.instructions,
          section_type: editingSection.section_type,
          total_marks: Number(editingSection.total_marks),
          required_attempts: editingSection.selection_rule === "ATTEMPT_ANY_N" && editingSection.required_attempts ? Number(editingSection.required_attempts) : null,
          selection_rule: editingSection.selection_rule,
        });
        toast.success(`Section '${editingSection.name}' updated`);
      } else {
        // Create section
        await api.post(`/question-papers/${paperId}/sections`, {
          name: editingSection.name,
          instructions: editingSection.instructions,
          order_index: paper.sections.length + 1,
          section_type: editingSection.section_type,
          total_marks: Number(editingSection.total_marks),
          required_attempts: editingSection.selection_rule === "ATTEMPT_ANY_N" && editingSection.required_attempts ? Number(editingSection.required_attempts) : null,
          selection_rule: editingSection.selection_rule,
        });
        toast.success(`Section '${editingSection.name}' created`);
      }
      setSectionModalOpen(false);
      fetchPaperAndValidation();
    } catch (err: any) {
      toast.error(err.message || "Failed to save section");
    }
  };

  const handleDeleteSection = async (sectionId: string, sectionName: string) => {
    if (!confirm(`Are you sure you want to delete '${sectionName}' and all questions inside it?`)) return;
    try {
      await api.delete(`/question-papers/${paperId}/sections/${sectionId}`);
      toast.success(`Section '${sectionName}' deleted`);
      fetchPaperAndValidation();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete section");
    }
  };

  // Alternative Management Handlers
  const handleOpenAddAlternative = async (pq: QuestionPaperQuestion) => {
    setTargetQuestionForAlt(pq);
    setAltQuestionText("");
    setAltExpectedAnswer("");
    setAltMarkingScheme("");
    setAltQuestionType(pq.question.question_type || "SHORT");
    setAltDifficulty(pq.question.difficulty || "MEDIUM");
    setAltBloom(pq.bloom_level || "UNDERSTAND");
    setAltSelectedBankId("");

    try {
      const res = await api.get<{ items: Question[] }>("/questions", {
        subject_id: paper?.subject_id,
        marks: pq.marks,
        page_size: 50,
      });
      const eligible = (res.items || []).filter((q) => q.id !== pq.question_id && q.marks === pq.marks);
      setAltBankQuestions(eligible);
      if (eligible.length > 0) {
        setAltSelectedBankId(eligible[0].id);
        setAltSourceMode("BANK");
      } else {
        setAltSourceMode("AI");
      }
    } catch {
      setAltBankQuestions([]);
      setAltSourceMode("AI");
    }

    setAltModalOpen(true);
  };

  const handleAddAlternativeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetQuestionForAlt || !paper) return;

    setAddingAlt(true);
    try {
      const payload: any = {
        marks: targetQuestionForAlt.marks,
      };

      if (altSourceMode === "BANK") {
        if (!altSelectedBankId) {
          toast.error("Please select a question from the bank");
          setAddingAlt(false);
          return;
        }
        payload.question_id = altSelectedBankId;
        payload.source_type = "QUESTION_BANK";
      } else {
        if (!altQuestionText.trim()) {
          toast.error("Please enter question text for the alternative");
          setAddingAlt(false);
          return;
        }
        payload.question_text = altQuestionText;
        payload.question_type = altQuestionType;
        payload.difficulty = altDifficulty;
        payload.bloom_level = altBloom;
        payload.expected_answer = altExpectedAnswer || "Comprehensive solution demonstration.";
        payload.marking_scheme = altMarkingScheme || `${targetQuestionForAlt.marks} Marks awarded for correct solution.`;
        payload.source_type = "AI_GENERATED";
      }

      await api.post(`/question-papers/${paperId}/questions/${targetQuestionForAlt.id}/add-alternative`, payload);
      toast.success("OR Alternative added successfully with exact mark parity!");
      setAltModalOpen(false);
      fetchPaperAndValidation();
    } catch (err: any) {
      toast.error(err.message || "Failed to add alternative");
    } finally {
      setAddingAlt(false);
    }
  };

  const handleUnlinkAlternative = async (pqId: string) => {
    if (!confirm("Unlink this question from its OR group? It will become an independent compulsory question.")) return;
    try {
      await api.post(`/question-papers/${paperId}/questions/${pqId}/unlink-alternative`);
      toast.success("Question unlinked from OR group");
      fetchPaperAndValidation();
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink alternative");
    }
  };

  // Save Layout as Template
  const handleSaveAsTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paper) return;

    setSavingTemplate(true);
    try {
      await api.post(
        `/question-papers/${paperId}/save-as-template?template_name=${encodeURIComponent(
          templateName || `${paper.title} Layout`
        )}`
      );
      toast.success("Paper layout saved as reusable institutional template!");
      setSaveTemplateModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleStatusAction = async () => {
    try {
      await api.post(`/question-papers/${paperId}/action`, {
        action: actionType,
        comments,
      });
      toast.success(`Question paper status transitioned to ${actionType.replace(/_/g, " ")}`);
      setActionModalOpen(false);
      setComments("");
      fetchPaperAndValidation();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleDownloadPdf = async () => {
    if (!paper) return;
    try {
      const blob = await api.downloadBlob(`/question-papers/${paper.id}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${paper.title.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF generated and downloaded!");
    } catch (err: any) {
      toast.error("Failed to download PDF");
    }
  };

  const isLocked = paper?.status === "PUBLISHED" || user?.role_name === "STUDENT";
  const isApprover =
    ["SUPER_ADMIN", "UNIVERSITY_ADMIN", "HOD", "EXAM_CONTROLLER", "MODERATOR"].includes(
      user?.role_name || ""
    ) && user?.role_name !== "STUDENT";

  const attemptMarks = paper?.current_marks ?? 0;
  const displayedMarks = paper?.displayed_marks ?? attemptMarks;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Question Papers", href: "/question-papers" },
          { label: "Paper Builder" },
        ]}
        title={paper ? paper.title : "Question Paper Builder"}
        description="Review question sequences, edit dynamic sections, manage OR alternatives, and execute moderation actions."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/question-papers/${paperId}/preview`}
              className="px-3.5 py-2 bg-[#f6f6f7] hover:bg-[#eaf5de] border border-[#dcdcdc] text-[#44535b] text-xs font-semibold rounded-[6px] transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-[#82c341]" />
              <span>Official Exam Preview</span>
            </Link>

            <button
              onClick={() => {
                setTemplateName(paper ? `${paper.title} Layout` : "Exam Layout Template");
                setSaveTemplateModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#f6f6f7] hover:bg-[#eaf5de] border border-[#dcdcdc] text-[#44535b] text-xs font-semibold rounded-[6px] transition flex items-center gap-1.5"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-[#2d5016]" />
              <span>Save as Template</span>
            </button>

            <button onClick={handleDownloadPdf} className="btn-secondary flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            {/* Workflow Status Action Buttons */}
            {(paper?.status === "DRAFT" || paper?.status === "GENERATED") && (
              <button
                onClick={() => {
                  setActionType("SUBMIT_FOR_REVIEW");
                  setActionModalOpen(true);
                }}
                className="btn-primary flex items-center gap-1.5 text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Moderation</span>
              </button>
            )}

            {isApprover && paper?.status === "UNDER_REVIEW" && (
              <>
                <button
                  onClick={() => {
                    setActionType("APPROVE");
                    setActionModalOpen(true);
                  }}
                  className="btn-primary flex items-center gap-1.5 text-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approve Paper</span>
                </button>
                <button
                  onClick={() => {
                    setActionType("REJECT");
                    setActionModalOpen(true);
                  }}
                  className="btn-danger flex items-center gap-1.5 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Paper</span>
                </button>
              </>
            )}

            {isApprover && paper?.status === "APPROVED" && (
              <button
                onClick={() => {
                  setActionType("PUBLISH");
                  setActionModalOpen(true);
                }}
                className="btn-primary flex items-center gap-1.5 text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Publish Paper</span>
              </button>
            )}
          </div>
        }
      />

      {loading || !paper ? (
        <div className="h-64 bg-[#f6f6f7] animate-pulse rounded-[8px] border border-[#dcdcdc]" />
      ) : (
        <div className="space-y-6">
          {/* Paper Information Banner */}
          <div className="bg-white p-6 rounded-[8px] border border-[#dcdcdc] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-[#2d5016] bg-[#eaf5de] px-2 py-0.5 rounded-[4px] border border-[#82c341]/30">
                  {paper.subject_code}
                </span>
                <span className="text-xs text-[#838383]">• {paper.semester_name}</span>
                <StatusBadge status={paper.status} />
              </div>
              <h2 className="text-lg font-bold text-[#44535b]">{paper.title}</h2>
              <p className="text-xs text-[#676767] mt-0.5">
                {paper.exam_name} • Duration: {paper.duration_minutes} Mins
              </p>
            </div>

            {/* Centralized Marks Accounting Panel */}
            <div className="flex items-center gap-6 border-t lg:border-t-0 lg:border-l border-[#dcdcdc] pt-3 lg:pt-0 lg:pl-6 text-xs">
              <div>
                <span className="text-[10px] text-[#838383] block font-semibold uppercase">TARGET MARKS</span>
                <span className="text-lg font-bold text-[#44535b]">{paper.total_marks} M</span>
              </div>
              <div>
                <span className="text-[10px] text-[#838383] block font-semibold uppercase">ATTEMPT MARKS</span>
                <span
                  className={`text-lg font-bold ${
                    attemptMarks === paper.total_marks ? "text-[#2d5016]" : "text-amber-700"
                  }`}
                >
                  {attemptMarks} M
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#838383] block font-semibold uppercase">DISPLAYED MARKS</span>
                <span className="text-lg font-bold text-[#44535b]">{displayedMarks} M</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-[10px] text-[#838383] block font-semibold uppercase">BALANCE</span>
                {attemptMarks === paper.total_marks ? (
                  <span className="text-xs font-bold text-[#2d5016] bg-[#eaf5de] px-2 py-0.5 rounded border border-[#82c341]/30">
                    BALANCED
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                    {attemptMarks - paper.total_marks > 0
                      ? `+${attemptMarks - paper.total_marks}M`
                      : `${attemptMarks - paper.total_marks}M`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Validation Status Card */}
          {validation && (
            <div
              className={`p-4 rounded-[8px] border ${
                validation.is_valid
                  ? "bg-[#eaf5de]/60 border-[#82c341]/40 text-[#2d5016]"
                  : "bg-amber-50/70 border-amber-300 text-amber-950"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs">
                  {validation.is_valid ? (
                    <CheckCircle2 className="w-4 h-4 text-[#82c341]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span>
                    {validation.is_valid
                      ? "Paper Validation Passed: Meets all marks, structure, and curriculum requirements"
                      : "Validation Notices & Discrepancies"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold">
                  <span>Questions: <b>{validation.total_questions}</b></span>
                  <span>Duplicates: <b>{validation.duplicate_count}</b></span>
                </div>
              </div>

              {validation.errors.length > 0 && (
                <ul className="mt-2.5 space-y-1 text-xs text-rose-700 list-disc list-inside">
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}

              {validation.warnings.length > 0 && (
                <ul className="mt-1.5 space-y-1 text-xs text-amber-700 list-disc list-inside">
                  {validation.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Sections Header with Add Section Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2d5016]" />
              <h3 className="font-bold text-sm text-[#44535b]">Examination Sections ({paper.sections.length})</h3>
            </div>
            {!isLocked && (
              <button
                onClick={handleOpenCreateSection}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Dynamic Section</span>
              </button>
            )}
          </div>

          {/* Sections and Questions Builder */}
          <div className="space-y-6">
            {paper.sections.map((section) => {
              // Group consecutive questions by group_id
              const groupedQuestions: QuestionPaperQuestion[][] = [];
              let currentGroupId: string | null = null;
              let currentGroup: QuestionPaperQuestion[] = [];

              section.questions.forEach((pq) => {
                const gid = pq.group_id || pq.or_group_id;
                if (gid) {
                  if (gid === currentGroupId) {
                    currentGroup.push(pq);
                  } else {
                    if (currentGroup.length > 0) groupedQuestions.push(currentGroup);
                    currentGroupId = gid;
                    currentGroup = [pq];
                  }
                } else {
                  if (currentGroup.length > 0) {
                    groupedQuestions.push(currentGroup);
                    currentGroupId = null;
                    currentGroup = [];
                  }
                  groupedQuestions.push([pq]);
                }
              });
              if (currentGroup.length > 0) groupedQuestions.push(currentGroup);

              return (
                <div
                  key={section.id}
                  className="bg-white rounded-[8px] border border-[#dcdcdc] shadow-sm overflow-hidden"
                >
                  {/* Section Header */}
                  <div className="bg-[#f6f6f7] px-6 py-4 border-b border-[#dcdcdc] flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-[#44535b] uppercase tracking-wider">
                          {section.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-[#eaf5de] text-[#2d5016] border border-[#82c341]/30">
                          {section.total_marks} Marks
                        </span>
                        {section.selection_rule === "ATTEMPT_ANY_N" && (
                          <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            Attempt Any {section.required_attempts}
                          </span>
                        )}
                        {section.section_type && section.section_type !== "STANDARD" && (
                          <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#e8edeb] text-[#44535b]">
                            {section.section_type}
                          </span>
                        )}
                      </div>
                      {section.instructions && (
                        <p className="text-xs text-[#676767] italic mt-0.5">{section.instructions}</p>
                      )}
                    </div>

                    {!isLocked && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditSection(section)}
                          className="p-1.5 text-[#676767] hover:text-[#44535b] hover:bg-[#e8edeb] rounded transition"
                          title="Edit Section Configuration"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(section.id, section.name)}
                          className="p-1.5 text-[#838383] hover:text-rose-700 hover:bg-rose-50 rounded transition"
                          title="Delete Section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenAddQuestion(section.id)}
                          className="btn-secondary text-xs flex items-center gap-1.5 ml-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Question</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Section Questions Body */}
                  <div className="divide-y divide-[#dcdcdc]/70">
                    {groupedQuestions.length > 0 ? (
                      groupedQuestions.map((group, groupIdx) => {
                        const isOrGroup = group.length > 1;

                        if (isOrGroup) {
                          // Render OR Group with dashed border and OR divider
                          return (
                            <div key={`group-${groupIdx}`} className="p-4 bg-amber-50/20">
                              <div className="border border-dashed border-[#82c341]/80 rounded-[8px] bg-white p-4 space-y-4">
                                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#dcdcdc]/50">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#2d5016] text-xs">
                                      Question {groupIdx + 1} Choice Group
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eaf5de] text-[#2d5016] border border-[#82c341]/30">
                                      Candidate Choice (1 of {group.length})
                                    </span>
                                  </div>
                                  <span className="font-bold text-xs text-[#44535b]">
                                    Contributes {group[0].marks} M to total
                                  </span>
                                </div>

                                {group.map((pq, subIdx) => {
                                  const realIdx = section.questions.findIndex((q) => q.id === pq.id);
                                  return (
                                    <React.Fragment key={pq.id}>
                                      {subIdx > 0 && (
                                        <div className="relative my-3">
                                          <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t-2 border-dashed border-[#82c341]/60" />
                                          </div>
                                          <div className="relative flex justify-center text-xs">
                                            <span className="bg-[#2d5016] text-white px-3 py-0.5 rounded-full font-bold shadow-xs">
                                              — OR —
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                          <span className="font-bold text-[#2d5016] text-xs w-8 shrink-0 pt-0.5">
                                            Q{groupIdx + 1}({pq.alternative_label || (subIdx === 0 ? "a" : "b")})
                                          </span>
                                          <div className="space-y-2 flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap text-xs">
                                              <span className="text-[10px] font-bold text-[#2d5016] bg-[#eaf5de] px-1.5 py-0.5 rounded border border-[#82c341]/30">
                                                Alternative {pq.alternative_label ? pq.alternative_label.toUpperCase() : (subIdx === 0 ? "A" : "B")}
                                              </span>
                                              <TypeBadge type={pq.question.question_type} />
                                              <DifficultyBadge difficulty={pq.question.difficulty} />
                                              {pq.question.unit_title && (
                                                <span className="text-[10px] font-semibold text-[#838383] bg-[#f6f6f7] px-2 py-0.5 rounded-[4px] border border-[#dcdcdc]">
                                                  {pq.question.unit_title}
                                                </span>
                                              )}
                                            </div>

                                            <p className="text-xs font-semibold text-[#44535b] leading-relaxed">
                                              {pq.question.question_text}
                                            </p>

                                            {/* MCQ Options Display */}
                                            {pq.question.question_type === "MCQ" && pq.question.options && (
                                              <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-[#676767]">
                                                {pq.question.options.map((opt) => (
                                                  <div
                                                    key={opt.option_key}
                                                    className={`p-2 rounded-[4px] border text-[11px] ${
                                                      opt.is_correct
                                                        ? "bg-[#eaf5de] border-[#82c341] font-bold text-[#2d5016]"
                                                        : "border-[#dcdcdc] bg-[#f6f6f7] text-[#44535b]"
                                                    }`}
                                                  >
                                                    <b>({opt.option_key})</b> {opt.option_text}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Marks & Controls */}
                                        <div className="flex items-center gap-3 shrink-0">
                                          <span className="font-bold text-xs text-[#44535b] bg-[#f6f6f7] border border-[#dcdcdc] px-2.5 py-1 rounded-[4px]">
                                            {pq.marks} M
                                          </span>

                                          {!isLocked && (
                                            <div className="flex items-center gap-1">
                                              <button
                                                onClick={() => handleUnlinkAlternative(pq.id)}
                                                className="p-1 text-[#838383] hover:text-[#2d5016] hover:bg-[#eaf5de] rounded-[4px] transition text-[11px]"
                                                title="Unlink from OR pair"
                                              >
                                                <Split className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => handleRemoveQuestion(pq.id)}
                                                className="p-1 text-[#838383] hover:text-[#991b1b] hover:bg-rose-50 rounded-[4px] transition"
                                                title="Remove alternative"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        // Standalone question
                        const pq = group[0];
                        const realIdx = section.questions.findIndex((q) => q.id === pq.id);

                        return (
                          <div
                            key={pq.id}
                            className="p-5 flex items-start justify-between gap-4 hover:bg-[#f6f6f7]/50 transition group"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <span className="font-bold text-[#838383] text-xs w-6 shrink-0 pt-0.5">
                                Q{groupIdx + 1}.
                              </span>
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                  <TypeBadge type={pq.question.question_type} />
                                  <DifficultyBadge difficulty={pq.question.difficulty} />
                                  {pq.question.unit_title && (
                                    <span className="text-[10px] font-semibold text-[#838383] bg-[#f6f6f7] px-2 py-0.5 rounded-[4px] border border-[#dcdcdc]">
                                      {pq.question.unit_title}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-semibold text-[#44535b] leading-relaxed">
                                  {pq.question.question_text}
                                </p>

                                {/* MCQ Options Display */}
                                {pq.question.question_type === "MCQ" && pq.question.options && (
                                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-[#676767]">
                                    {pq.question.options.map((opt) => (
                                      <div
                                        key={opt.option_key}
                                        className={`p-2 rounded-[4px] border text-[11px] ${
                                          opt.is_correct
                                            ? "bg-[#eaf5de] border-[#82c341] font-bold text-[#2d5016]"
                                            : "border-[#dcdcdc] bg-[#f6f6f7] text-[#44535b]"
                                        }`}
                                      >
                                        <b>({opt.option_key})</b> {opt.option_text}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Marks & Row Controls */}
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-bold text-xs text-[#44535b] bg-[#f6f6f7] border border-[#dcdcdc] px-2.5 py-1 rounded-[4px]">
                                {pq.marks} M
                              </span>

                              {!isLocked && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenAddAlternative(pq)}
                                    className="px-2 py-1 text-[11px] font-semibold text-[#2d5016] bg-[#eaf5de] hover:bg-[#82c341]/20 border border-[#82c341]/40 rounded-[4px] transition flex items-center gap-1"
                                    title="Add an OR alternative question"
                                  >
                                    <Split className="w-3 h-3" />
                                    <span>Add OR</span>
                                  </button>

                                  <button
                                    onClick={() => handleMoveQuestion(section.id, realIdx, "UP")}
                                    disabled={realIdx === 0}
                                    className="p-1 text-[#838383] hover:text-[#44535b] hover:bg-[#f6f6f7] rounded-[4px] disabled:opacity-20 transition"
                                    title="Move question up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveQuestion(section.id, realIdx, "DOWN")}
                                    disabled={realIdx === section.questions.length - 1}
                                    className="p-1 text-[#838383] hover:text-[#44535b] hover:bg-[#f6f6f7] rounded-[4px] disabled:opacity-20 transition"
                                    title="Move question down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveQuestion(pq.id)}
                                    className="p-1 text-[#838383] hover:text-[#991b1b] hover:bg-rose-50 rounded-[4px] transition ml-1"
                                    title="Remove question from paper"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-[#838383] text-xs">
                        No questions in this section. Click "Add Question" to curate questions manually.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DYNAMIC SECTION MODAL */}
      <Modal
        isOpen={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={editingSection?.id ? "Edit Examination Section" : "Create New Dynamic Section"}
        subtitle="Configure section rules, attempt limits, and marks allocation"
        maxWidth="lg"
      >
        {editingSection && (
          <form onSubmit={handleSaveSection} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#44535b] mb-1">Section Name *</label>
                <input
                  type="text"
                  required
                  value={editingSection.name}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                  placeholder="e.g. Section B, Part 2 - Analytical"
                  className="input-theme"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44535b] mb-1">Total Marks *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editingSection.total_marks}
                  onChange={(e) => setEditingSection({ ...editingSection, total_marks: Number(e.target.value) })}
                  className="input-theme"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#44535b] mb-1">Section Type</label>
                <select
                  value={editingSection.section_type}
                  onChange={(e) => setEditingSection({ ...editingSection, section_type: e.target.value })}
                  className="select-theme"
                >
                  <option value="STANDARD">Standard Compulsory</option>
                  <option value="CHOICE_SECTION">Internal Choice Section</option>
                  <option value="OVERALL_CHOICE">Overall Choice Section</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44535b] mb-1">Selection Rule</label>
                <select
                  value={editingSection.selection_rule}
                  onChange={(e) => setEditingSection({ ...editingSection, selection_rule: e.target.value })}
                  className="select-theme"
                >
                  <option value="ALL">Attempt All Questions</option>
                  <option value="ATTEMPT_ANY_N">Attempt Any N Questions</option>
                </select>
              </div>
            </div>

            {editingSection.selection_rule === "ATTEMPT_ANY_N" && (
              <div>
                <label className="block text-xs font-semibold text-[#44535b] mb-1">
                  Required Attempts (e.g. 5 if "Attempt any 5 of 8") *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editingSection.required_attempts || ""}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, required_attempts: Number(e.target.value) })
                  }
                  className="input-theme"
                  placeholder="5"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1">Candidate Instructions</label>
              <textarea
                rows={2}
                value={editingSection.instructions}
                onChange={(e) => setEditingSection({ ...editingSection, instructions: e.target.value })}
                placeholder="e.g. Answer any five questions. Each question carries 4 marks."
                className="input-theme"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#dcdcdc]">
              <button
                type="button"
                onClick={() => setSectionModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingSection.id ? "Update Section" : "Create Section"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ADD OR ALTERNATIVE MODAL */}
      <Modal
        isOpen={altModalOpen}
        onClose={() => setAltModalOpen(false)}
        title="Add OR / Alternative Question"
        subtitle={`Pairing alternative with Question for exact ${targetQuestionForAlt?.marks} Marks`}
        maxWidth="lg"
      >
        {targetQuestionForAlt && (
          <form onSubmit={handleAddAlternativeSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-[#f6f6f7] rounded-[6px] border border-[#dcdcdc]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[#44535b]">Primary Question (Option A)</span>
                <span className="font-bold text-[#2d5016] bg-[#eaf5de] px-2 py-0.5 rounded border border-[#82c341]/30">
                  {targetQuestionForAlt.marks} Marks
                </span>
              </div>
              <p className="text-[#676767] line-clamp-2">{targetQuestionForAlt.question.question_text}</p>
            </div>

            {/* Source Mode Toggle */}
            <div className="flex items-center gap-2 border-b border-[#dcdcdc] pb-2">
              <button
                type="button"
                onClick={() => setAltSourceMode("BANK")}
                className={`px-3 py-1.5 rounded-[4px] font-semibold text-xs transition flex items-center gap-1.5 ${
                  altSourceMode === "BANK"
                    ? "bg-[#2d5016] text-white"
                    : "bg-[#f6f6f7] text-[#44535b] hover:bg-[#e8edeb]"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Select from Question Bank ({altBankQuestions.length} Available)</span>
              </button>
              <button
                type="button"
                onClick={() => setAltSourceMode("AI")}
                className={`px-3 py-1.5 rounded-[4px] font-semibold text-xs transition flex items-center gap-1.5 ${
                  altSourceMode === "AI"
                    ? "bg-[#2d5016] text-white"
                    : "bg-[#f6f6f7] text-[#44535b] hover:bg-[#e8edeb]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create / Synthesize Alternative</span>
              </button>
            </div>

            {altSourceMode === "BANK" ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#44535b]">
                  Available Questions with Exact {targetQuestionForAlt.marks} Marks Parity
                </label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {altBankQuestions.length > 0 ? (
                    altBankQuestions.map((q) => (
                      <label
                        key={q.id}
                        className={`block p-2.5 rounded-[6px] border cursor-pointer text-xs transition ${
                          altSelectedBankId === q.id
                            ? "border-[#82c341] bg-[#eaf5de]/40"
                            : "border-[#dcdcdc] hover:bg-[#f6f6f7]"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="alt_bank_radio"
                            checked={altSelectedBankId === q.id}
                            onChange={() => setAltSelectedBankId(q.id)}
                            className="mt-0.5 accent-[#82c341]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <TypeBadge type={q.question_type} />
                              <DifficultyBadge difficulty={q.difficulty} />
                              <span className="font-bold text-[#44535b]">{q.marks} Marks</span>
                            </div>
                            <p className="font-medium text-[#44535b] line-clamp-2">{q.question_text}</p>
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-center py-6 text-[#838383] text-xs">
                      No repository questions found with exact {targetQuestionForAlt.marks} Marks. Please switch to "Create / Synthesize Alternative".
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44535b] mb-1">
                    Alternative Question Text *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={altQuestionText}
                    onChange={(e) => setAltQuestionText(e.target.value)}
                    placeholder="Enter question text for Alternative (b)..."
                    className="input-theme"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#44535b] mb-1">Question Type</label>
                    <select
                      value={altQuestionType}
                      onChange={(e) => setAltQuestionType(e.target.value)}
                      className="select-theme"
                    >
                      <option value="SHORT">Short Answer</option>
                      <option value="DESCRIPTIVE">Descriptive</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="MCQ">Multiple Choice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#44535b] mb-1">Difficulty</label>
                    <select
                      value={altDifficulty}
                      onChange={(e) => setAltDifficulty(e.target.value)}
                      className="select-theme"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#44535b] mb-1">Bloom Level</label>
                    <select
                      value={altBloom}
                      onChange={(e) => setAltBloom(e.target.value)}
                      className="select-theme"
                    >
                      <option value="REMEMBER">Remember</option>
                      <option value="UNDERSTAND">Understand</option>
                      <option value="APPLY">Apply</option>
                      <option value="ANALYZE">Analyze</option>
                      <option value="EVALUATE">Evaluate</option>
                      <option value="CREATE">Create</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#44535b] mb-1">
                    Confidential Expected Answer
                  </label>
                  <textarea
                    rows={2}
                    value={altExpectedAnswer}
                    onChange={(e) => setAltExpectedAnswer(e.target.value)}
                    placeholder="Key concepts, definitions, or steps expected..."
                    className="input-theme"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#44535b] mb-1">
                    Marking Scheme / Step Rubric
                  </label>
                  <input
                    type="text"
                    value={altMarkingScheme}
                    onChange={(e) => setAltMarkingScheme(e.target.value)}
                    placeholder={`e.g. 2 Marks for concept definition + ${targetQuestionForAlt.marks - 2} Marks for example`}
                    className="input-theme"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#dcdcdc]">
              <button
                type="button"
                onClick={() => setAltModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingAlt || (altSourceMode === "BANK" && !altSelectedBankId)}
                className="btn-primary"
              >
                {addingAlt ? "Linking Alternative..." : "Link as OR Alternative"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* SAVE TEMPLATE MODAL */}
      <Modal
        isOpen={saveTemplateModalOpen}
        onClose={() => setSaveTemplateModalOpen(false)}
        title="Save Paper Layout as Reusable Template"
        subtitle="Institutions can reuse this dynamic section structure and rules for future exams"
        maxWidth="md"
      >
        <form onSubmit={handleSaveAsTemplateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Template Name *</label>
            <input
              type="text"
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Mid-Term 50M Standard Engineering Pattern"
              className="input-theme"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Description</label>
            <textarea
              rows={3}
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="e.g. Includes Part A compulsory MCQs and Part B with 3-mark OR alternatives."
              className="input-theme"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#dcdcdc]">
            <button
              type="button"
              onClick={() => setSaveTemplateModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={savingTemplate} className="btn-primary">
              {savingTemplate ? "Saving..." : "Save Template"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD QUESTION MODAL */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Question to Section"
        subtitle="Select an eligible question from the Question Bank repository"
        maxWidth="xl"
      >
        <form onSubmit={handleAddQuestionSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-2">Available Questions</label>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {availableQuestions.length > 0 ? (
                availableQuestions.map((q) => (
                  <label
                    key={q.id}
                    className={`block p-3 rounded-[6px] border cursor-pointer text-xs transition ${
                      selectedQuestionId === q.id
                        ? "border-[#82c341] bg-[#eaf5de]/40"
                        : "border-[#dcdcdc] hover:bg-[#f6f6f7]"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="add_question_radio"
                        checked={selectedQuestionId === q.id}
                        onChange={() => setSelectedQuestionId(q.id)}
                        className="mt-0.5 accent-[#82c341]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeBadge type={q.question_type} />
                          <DifficultyBadge difficulty={q.difficulty} />
                          <span className="font-bold text-[#44535b]">{q.marks} Marks</span>
                        </div>
                        <p className="font-semibold text-[#44535b] line-clamp-2">{q.question_text}</p>
                      </div>
                    </div>
                  </label>
                ))
              ) : (
                <p className="text-center py-6 text-[#838383] text-xs">No questions found in repository.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#dcdcdc]">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedQuestionId}
              className="btn-primary"
            >
              Insert into Paper
            </button>
          </div>
        </form>
      </Modal>

      {/* STATUS ACTION MODAL */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={`${actionType.replace(/_/g, " ")} Question Paper`}
        subtitle="Process paper governance and verification workflow"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#676767]">
            Confirm execution of action <b>{actionType.replace(/_/g, " ")}</b> for paper "<b>{paper?.title}</b>".
          </p>
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">
              Comments / Audit Statement
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Verified syllabus coverage, dynamic sections, and marks distribution."
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
              className={actionType === "REJECT" ? "btn-danger" : "btn-primary"}
            >
              Confirm Status Update
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
