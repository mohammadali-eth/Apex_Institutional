"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  FacultySubjectItem,
  QuestionPaperResponse,
  PaperValidationResult,
  Question,
  QuestionPaperQuestion,
  QuestionPaperTemplate
} from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, DifficultyBadge, TypeBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  Sparkles,
  FileText,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Download,
  Send,
  HelpCircle,
  Layers,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Clock,
  RefreshCw,
  Edit3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Key,
  Copy,
  Sliders,
  Check,
  CheckSquare,
  Info,
  ExternalLink,
  Split,
  Eye,
  Settings,
  AlertCircle
} from "lucide-react";

interface SyllabusCheckData {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  status: "AVAILABLE" | "INCOMPLETE" | "PROCESSING" | "UNAVAILABLE";
  syllabus_id?: string | null;
  syllabus_version?: number | null;
  units_count: number;
  topics_count: number;
  questions_count: number;
  message: string;
  units: Array<{
    id: string;
    unit_number: number;
    title: string;
    topics_count: number;
    topics: Array<{ id: string; title: string }>;
  }>;
  allow_fallback_required: boolean;
}

interface ProviderStatusData {
  provider: string;
  model: string;
  is_configured: boolean;
  has_api_key: boolean;
  status: "ACTIVE" | "STANDBY_SYNTHESIZER";
  timeout_seconds: number;
  rate_limit_policy: string;
  message: string;
}

interface DistributionItem {
  question_type: string;
  marks: number;
  count: number;
  section_name: string;
  instructions?: string;
  selection_rule: string;
  required_attempts?: number;
  has_or_alternative: boolean;
  or_question_type?: string;
  or_marks?: number;
}

export default function FacultyPaperGeneratorPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subject_id") || "";

  // 6-Step Wizard navigation
  // Step 1: Course & Syllabus Scope
  // Step 2: Configure Layout & Marks (Auto-Balance)
  // Step 3: Source Readiness Audit
  // Step 4: Generation Progress
  // Step 5: Question Paper Studio
  // Step 6: Validate & Multi-Artifact Export
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Subject & Syllabus Data
  const [subjects, setSubjects] = useState<FacultySubjectItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectId, setSubjectId] = useState(initialSubject);
  const [syllabusCheck, setSyllabusCheck] = useState<SyllabusCheckData | null>(null);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [allowFallback, setAllowFallback] = useState(false);

  // Provider Status Data
  const [providerStatus, setProviderStatus] = useState<ProviderStatusData | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(false);

  // Layout Templates
  const [templates, setTemplates] = useState<QuestionPaperTemplate[]>([]);

  // Paper Settings
  const [title, setTitle] = useState("Midterm Examination 2026");
  const [examName, setExamName] = useState("Mid Semester Examination");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [totalMarks, setTotalMarks] = useState(50);
  const [instructions, setInstructions] = useState(
    "1. Section A is compulsory.\n2. In Section B and C, answer all required questions clearly following choice rules.\n3. Draw neat diagrams wherever necessary."
  );

  // Advanced Blueprint Tuning
  const [bankRatio, setBankRatio] = useState(50);
  const [easyPercent, setEasyPercent] = useState(30);
  const [mediumPercent, setMediumPercent] = useState(50);
  const [hardPercent, setHardPercent] = useState(20);

  const [bloomRemember, setBloomRemember] = useState(20);
  const [bloomUnderstand, setBloomUnderstand] = useState(30);
  const [bloomApply, setBloomApply] = useState(25);
  const [bloomAnalyze, setBloomAnalyze] = useState(15);
  const [bloomEvaluate, setBloomEvaluate] = useState(5);
  const [bloomCreate, setBloomCreate] = useState(5);

  const [showAdvancedTuning, setShowAdvancedTuning] = useState(false);

  // Auto-generation blueprint distribution matrix
  const [distribution, setDistribution] = useState<DistributionItem[]>([
    { question_type: "MCQ", marks: 1, count: 10, section_name: "Section A", selection_rule: "SINGLE", has_or_alternative: false },
    { question_type: "DESCRIPTIVE", marks: 5, count: 4, section_name: "Section B", selection_rule: "OR_PAIR", has_or_alternative: true, or_question_type: "DESCRIPTIVE", or_marks: 5 },
    { question_type: "DESCRIPTIVE", marks: 10, count: 2, section_name: "Section C", selection_rule: "OR_PAIR", has_or_alternative: true, or_question_type: "DESCRIPTIVE", or_marks: 10 }
  ]);

  // Active Generated Paper & Validation
  const [activePaper, setActivePaper] = useState<QuestionPaperResponse | null>(null);
  const [validation, setValidation] = useState<PaperValidationResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generationStepsDone, setGenerationStepsDone] = useState<number>(0);
  const [regeneratingQId, setRegeneratingQId] = useState<string | null>(null);
  const [regeneratingSecId, setRegeneratingSecId] = useState<string | null>(null);

  // Expandable question details tracker
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  // Modals State
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<{
    id: string;
    text: string;
    marks: number;
    difficulty: string;
    bloom_level: string;
    expected_answer: string;
    marking_scheme: string;
    options: { option_key: string; option_text: string; is_correct: boolean }[];
  } | null>(null);

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

  const [altModalOpen, setAltModalOpen] = useState(false);
  const [targetQuestionForAlt, setTargetQuestionForAlt] = useState<QuestionPaperQuestion | null>(null);
  const [altSourceMode, setAltSourceMode] = useState<"AI" | "BANK">("AI");
  const [altQuestionType, setAltQuestionType] = useState("SHORT");
  const [altQuestionText, setAltQuestionText] = useState("");
  const [altDifficulty, setAltDifficulty] = useState("MEDIUM");
  const [altBloom, setAltBloom] = useState("UNDERSTAND");
  const [altExpectedAnswer, setAltExpectedAnswer] = useState("");
  const [altMarkingScheme, setAltMarkingScheme] = useState("");
  const [altSelectedBankId, setAltSelectedBankId] = useState("");
  const [addingAlt, setAddingAlt] = useState(false);

  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // 1. Initial Load: Faculty Subjects & Layout Templates
  useEffect(() => {
    api.get<FacultySubjectItem[]>("/faculty/subjects").then((data) => {
      setSubjects(data || []);
      if (!subjectId && data && data.length > 0) {
        setSubjectId(data[0].id);
      }
      setLoadingSubjects(false);
    });

    api.get<QuestionPaperTemplate[]>("/question-papers/templates").then((res) => {
      setTemplates(res || []);
    }).catch(() => {});

    fetchProviderStatus();
  }, []);

  // 2. Fetch Syllabus & Readiness when subjectId changes
  useEffect(() => {
    if (subjectId) {
      fetchSyllabusCheck(subjectId);
    }
  }, [subjectId]);

  const fetchProviderStatus = async () => {
    setLoadingProvider(true);
    try {
      const res = await api.get<ProviderStatusData>("/question-papers/provider-status");
      setProviderStatus(res);
    } catch {
      // Graceful fallback display
      setProviderStatus({
        provider: "synthesizer",
        model: "academic-deterministic",
        is_configured: false,
        has_api_key: false,
        status: "STANDBY_SYNTHESIZER",
        timeout_seconds: 25,
        rate_limit_policy: "exponential_backoff_max_2",
        message: "Academic rule-based engine active"
      });
    } finally {
      setLoadingProvider(false);
    }
  };

  const fetchSyllabusCheck = async (sId: string) => {
    setLoadingSyllabus(true);
    try {
      const res = await api.get<SyllabusCheckData>(`/question-papers/syllabus-check?subject_id=${sId}`);
      setSyllabusCheck(res);
      if (res.status === "AVAILABLE") {
        setAllowFallback(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to check subject syllabus");
    } finally {
      setLoadingSyllabus(false);
    }
  };

  // Calculated Attempt Marks vs Displayed Marks
  const totalCalculatedAttemptMarks = useMemo(() => {
    return distribution.reduce((acc, curr) => {
      if (curr.selection_rule === "ATTEMPT_ANY_N" && curr.required_attempts) {
        return acc + (curr.marks * curr.required_attempts);
      }
      return acc + (curr.marks * curr.count);
    }, 0);
  }, [distribution]);

  const totalCalculatedDisplayedMarks = useMemo(() => {
    return distribution.reduce((acc, curr) => {
      if (curr.has_or_alternative || curr.selection_rule === "OR_PAIR") {
        return acc + (curr.marks * curr.count * 2);
      }
      return acc + (curr.marks * curr.count);
    }, 0);
  }, [distribution]);

  // Auto-Balance Distribution Engine
  const autoBalanceDistribution = (targetMarksValue: number) => {
    let balanced: DistributionItem[] = [];
    if (targetMarksValue === 50) {
      balanced = [
        { question_type: "MCQ", marks: 1, count: 10, section_name: "Section A", selection_rule: "SINGLE", has_or_alternative: false },
        { question_type: "DESCRIPTIVE", marks: 5, count: 4, section_name: "Section B", selection_rule: "OR_PAIR", has_or_alternative: true, or_question_type: "DESCRIPTIVE", or_marks: 5 },
        { question_type: "DESCRIPTIVE", marks: 10, count: 2, section_name: "Section C", selection_rule: "OR_PAIR", has_or_alternative: true, or_question_type: "DESCRIPTIVE", or_marks: 10 }
      ];
    } else if (targetMarksValue === 70) {
      balanced = [
        { question_type: "MCQ", marks: 1, count: 10, section_name: "Section A", selection_rule: "SINGLE", has_or_alternative: false },
        { question_type: "DESCRIPTIVE", marks: 5, count: 6, section_name: "Section B", selection_rule: "OR_PAIR", has_or_alternative: true, or_question_type: "DESCRIPTIVE", or_marks: 5 },
        { question_type: "DESCRIPTIVE", marks: 10, count: 3, section_name: "Section C", selection_rule: "OR_PAIR", has_or_alternative: true, or_question_type: "DESCRIPTIVE", or_marks: 10 }
      ];
    } else if (targetMarksValue === 100) {
      balanced = [
        { question_type: "MCQ", marks: 1, count: 20, section_name: "Section A", selection_rule: "SINGLE", has_or_alternative: false },
        { question_type: "DESCRIPTIVE", marks: 5, count: 8, section_name: "Section B", selection_rule: "OR_PAIR", has_or_alternative: true, or_question_type: "DESCRIPTIVE", or_marks: 5 },
        { question_type: "DESCRIPTIVE", marks: 10, count: 4, section_name: "Section C", selection_rule: "OR_PAIR", has_or_alternative: true, or_question_type: "DESCRIPTIVE", or_marks: 10 }
      ];
    } else {
      // Generic optimal balancing
      const partA = Math.round(targetMarksValue * 0.2); // 20%
      const partC = Math.floor((targetMarksValue * 0.4) / 10) * 10; // 40% in 10M
      const partB = targetMarksValue - partA - partC; // remainder in 5M
      const countA = partA;
      const countB = Math.floor(partB / 5);
      const countC = Math.floor(partC / 10);
      const remainder = targetMarksValue - (countA * 1 + countB * 5 + countC * 10);

      balanced = [];
      if (countA + remainder > 0) {
        balanced.push({ question_type: "MCQ", marks: 1, count: countA + remainder, section_name: "Section A", selection_rule: "SINGLE", has_or_alternative: false });
      }
      if (countB > 0) {
        balanced.push({ question_type: "DESCRIPTIVE", marks: 5, count: countB, section_name: "Section B", selection_rule: "OR_PAIR", has_or_alternative: true, or_question_type: "DESCRIPTIVE", or_marks: 5 });
      }
      if (countC > 0) {
        balanced.push({ question_type: "DESCRIPTIVE", marks: 10, count: countC, section_name: "Section C", selection_rule: "OR_PAIR", has_or_alternative: true, or_question_type: "DESCRIPTIVE", or_marks: 10 });
      }
    }
    setDistribution(balanced);
    toast.success(`Blueprint auto-balanced for exactly ${targetMarksValue} Candidate Attempt Marks!`);
  };

  const handleSelectPresetMarks = (marksVal: number, titlePreset: string) => {
    setTotalMarks(marksVal);
    setTitle(`${titlePreset} 2026`);
    autoBalanceDistribution(marksVal);
  };

  const handleApplyTemplate = (tmpl: QuestionPaperTemplate) => {
    setTotalMarks(tmpl.max_marks);
    setDurationMinutes(tmpl.duration_minutes);
    if (tmpl.instructions_template) {
      setInstructions(tmpl.instructions_template);
    }
    if (tmpl.sections_config && tmpl.sections_config.length > 0) {
      const newDist: DistributionItem[] = [];
      tmpl.sections_config.forEach((sc) => {
        const secMarks = sc.total_marks || 20;
        newDist.push({
          question_type: "DESCRIPTIVE",
          marks: secMarks > 10 ? 10 : 5,
          count: secMarks > 10 ? Math.ceil(secMarks / 10) : Math.ceil(secMarks / 5) || 1,
          section_name: sc.name,
          instructions: sc.instructions || "Answer required questions.",
          selection_rule: sc.selection_rule || "ALL",
          required_attempts: sc.required_attempts || undefined,
          has_or_alternative: false
        });
      });
      setDistribution(newDist);
      toast.success(`Loaded Layout Template '${tmpl.name}'!`);
    }
  };

  // Execution: Start AI Question Paper Generation
  const handleStartGeneration = async () => {
    if (!subjectId) {
      toast.error("Please select a subject in Step 1.");
      setCurrentStep(1);
      return;
    }

    if (totalCalculatedAttemptMarks !== Number(totalMarks)) {
      toast.error(`Candidate attempt marks (${totalCalculatedAttemptMarks}) must match target total marks (${totalMarks}). Please auto-balance in Step 2.`);
      setCurrentStep(2);
      return;
    }

    if (syllabusCheck?.status !== "AVAILABLE" && !allowFallback) {
      toast.error("Syllabus unavailable. You must acknowledge and enable Fallback Mode in Step 1.");
      setCurrentStep(1);
      return;
    }

    setCurrentStep(4);
    setGenerating(true);
    setGenerationStepsDone(1);

    const stepInterval = setInterval(() => {
      setGenerationStepsDone((prev) => (prev < 5 ? prev + 1 : prev));
    }, 450);

    try {
      const payload = {
        subject_id: subjectId,
        title,
        exam_name: examName,
        duration_minutes: Number(durationMinutes),
        total_marks: Number(totalMarks),
        instructions,
        distribution,
        allow_fallback: allowFallback,
        difficulty: {
          easy: Number(easyPercent),
          medium: Number(mediumPercent),
          hard: Number(hardPercent)
        },
        bloom_taxonomy: {
          remember: Number(bloomRemember),
          understand: Number(bloomUnderstand),
          apply: Number(bloomApply),
          analyze: Number(bloomAnalyze),
          evaluate: Number(bloomEvaluate),
          create: Number(bloomCreate)
        },
        source_ratio: {
          bank_percentage: Number(bankRatio),
          ai_percentage: 100 - Number(bankRatio)
        },
        seed: Math.floor(Math.random() * 10000)
      };

      const res = await api.post<QuestionPaperResponse>("/question-papers/generator/generate", payload);
      clearInterval(stepInterval);
      setGenerationStepsDone(6);
      setActivePaper(res);
      toast.success("Question paper generated successfully with verified marks reconciliation!");
      
      // Auto run validation check
      handleValidate(res.id);
      setTimeout(() => {
        setCurrentStep(5);
      }, 700);
    } catch (err: any) {
      clearInterval(stepInterval);
      toast.error(err.message || "Failed to generate paper. Please check blueprint settings.");
      setCurrentStep(3);
    } finally {
      setGenerating(false);
    }
  };

  const handleValidate = async (paperId?: string) => {
    const pId = paperId || activePaper?.id;
    if (!pId) return;

    setValidating(true);
    try {
      const res = await api.get<PaperValidationResult>(`/question-papers/${pId}/validate`);
      setValidation(res);
    } catch (err: any) {
      toast.error(err.message || "Validation check failed");
    } finally {
      setValidating(false);
    }
  };

  const handleRegenerateQuestion = async (pqId: string) => {
    if (!activePaper) return;
    setRegeneratingQId(pqId);
    try {
      const res = await api.post<QuestionPaperResponse>(
        `/question-papers/${activePaper.id}/regenerate-question/${pqId}`,
        { preference: "ANY" }
      );
      setActivePaper(res);
      toast.success("Question regenerated successfully!");
      handleValidate(activePaper.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate question");
    } finally {
      setRegeneratingQId(null);
    }
  };

  const handleRegenerateSection = async (secId: string) => {
    if (!activePaper) return;
    setRegeneratingSecId(secId);
    try {
      const res = await api.post<QuestionPaperResponse>(
        `/question-papers/${activePaper.id}/regenerate-section/${secId}`,
        { preference: "ANY" }
      );
      setActivePaper(res);
      toast.success("Section regenerated successfully!");
      handleValidate(activePaper.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate section");
    } finally {
      setRegeneratingSecId(null);
    }
  };

  const openEditModal = (pq: QuestionPaperQuestion) => {
    const q = pq.question;
    setEditingQuestion({
      id: q.id,
      text: q.question_text,
      marks: pq.marks,
      difficulty: q.difficulty,
      bloom_level: pq.bloom_level || q.bloom_level || "UNDERSTAND",
      expected_answer: pq.expected_answer || q.expected_answer || "",
      marking_scheme: pq.marking_scheme || q.marking_rubric || "",
      options: q.options ? q.options.map((opt: any) => ({
        option_key: opt.option_key,
        option_text: opt.option_text,
        is_correct: opt.is_correct
      })) : []
    });
    setEditModalOpen(true);
  };

  const handleSaveQuestionEdit = async () => {
    if (!activePaper || !editingQuestion) return;
    try {
      const payload = {
        question_id: editingQuestion.id,
        question_text: editingQuestion.text,
        marks: Number(editingQuestion.marks),
        difficulty: editingQuestion.difficulty,
        bloom_level: editingQuestion.bloom_level,
        expected_answer: editingQuestion.expected_answer,
        marking_scheme: editingQuestion.marking_scheme,
        options: editingQuestion.options
      };
      const res = await api.put<QuestionPaperResponse>(`/question-papers/${activePaper.id}/content`, payload);
      setActivePaper(res);
      setEditModalOpen(false);
      toast.success("Question updated successfully!");
      handleValidate(activePaper.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to update question content");
    }
  };

  const handleRemoveQuestion = async (pqId: string) => {
    if (!activePaper) return;
    try {
      const res = await api.delete<QuestionPaperResponse>(`/question-papers/${activePaper.id}/questions/${pqId}`);
      setActivePaper(res);
      toast.success("Question removed from paper");
      handleValidate(activePaper.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove question");
    }
  };

  const openBankForSection = async (sectionId: string) => {
    setTargetSectionId(sectionId);
    setBankModalOpen(true);
    setBankLoading(true);
    try {
      const res = await api.get<any>(`/questions?subject_id=${subjectId}&status=APPROVED&limit=50`);
      setBankQuestions(res.items || res || []);
    } catch {
      toast.error("Failed to load approved bank questions");
    } finally {
      setBankLoading(false);
    }
  };

  const handleAddQuestionFromBank = async (qId: string) => {
    if (!activePaper || !targetSectionId) return;
    try {
      const res = await api.post<QuestionPaperResponse>(
        `/question-papers/${activePaper.id}/sections/${targetSectionId}/questions`,
        { question_id: qId, is_compulsory: false }
      );
      setActivePaper(res);
      setBankModalOpen(false);
      toast.success("Question successfully added to section!");
      handleValidate(activePaper.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to add question to section");
    }
  };

  const openAddAlternativeModal = (pq: QuestionPaperQuestion) => {
    setTargetQuestionForAlt(pq);
    setAltQuestionType(pq.question?.question_type || "SHORT");
    setAltDifficulty(pq.question?.difficulty || "MEDIUM");
    setAltBloom(pq.bloom_level || "UNDERSTAND");
    setAltQuestionText("");
    setAltExpectedAnswer("");
    setAltMarkingScheme("");
    setAltSelectedBankId("");
    setAltSourceMode("AI");
    setAltModalOpen(true);
  };

  const handleAddAlternativeSubmit = async () => {
    if (!activePaper || !targetQuestionForAlt) return;
    setAddingAlt(true);
    try {
      const payload: any = {
        primary_paper_question_id: targetQuestionForAlt.id,
        source_type: altSourceMode,
        marks: targetQuestionForAlt.marks,
        question_type: altQuestionType,
        difficulty: altDifficulty,
        bloom_level: altBloom,
        question_text: altQuestionText,
        expected_answer: altExpectedAnswer,
        marking_scheme: altMarkingScheme
      };

      if (altSourceMode === "BANK" && altSelectedBankId) {
        payload.bank_question_id = altSelectedBankId;
      }

      const res = await api.post<QuestionPaperResponse>(`/question-papers/${activePaper.id}/add-alternative`, payload);
      setActivePaper(res);
      setAltModalOpen(false);
      toast.success("OR alternative question successfully paired!");
      handleValidate(activePaper.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to add alternative question");
    } finally {
      setAddingAlt(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!activePaper) return;

    setSubmitting(true);
    try {
      const res = await api.post<QuestionPaperResponse>(`/question-papers/${activePaper.id}/action`, {
        action: "SUBMIT_FOR_REVIEW",
        comments: `Submitted with verified syllabus alignment (${activePaper.is_syllabus_grounded ? "Syllabus Grounded" : "Fallback Mode"}).`
      });
      setActivePaper(res);
      toast.success("Question paper submitted to HOD moderation queue!");
      router.push("/dashboard/faculty/papers");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit paper for review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = (type: "paper" | "solution" | "answer-key" | "marking-scheme") => {
    if (!activePaper) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("qpms_token") : "";
    let endpoint = `/question-papers/${activePaper.id}/pdf`;
    if (type === "solution") endpoint = `/question-papers/${activePaper.id}/pdf/solution`;
    if (type === "answer-key") endpoint = `/question-papers/${activePaper.id}/pdf/answer-key`;
    if (type === "marking-scheme") endpoint = `/question-papers/${activePaper.id}/pdf/marking-scheme`;

    const fullUrl = `http://localhost:8000/api/v1${endpoint}?token=${token}`;
    window.open(fullUrl, "_blank");
    toast.success(`Generating ${type.toUpperCase()} PDF download...`);
  };

  const selectedSubjectObj = subjects.find((s) => s.id === subjectId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <PageHeader
        title="AI Question Paper Generator"
        description="Curriculum-grounded examination generator with strict syllabus provenance, deterministic marks balancing, and university OR-choice architecture."
        actions={
          <div className="flex items-center gap-3">
            {activePaper && (
              <button
                onClick={() => setCurrentStep(6)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 flex items-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                Export PDFs
              </button>
            )}
            <button
              onClick={() => router.push("/dashboard/faculty/papers")}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Paper Archive
            </button>
          </div>
        }
      />

      {/* 6-Step Guided Stepper Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { num: 1, label: "Scope & Syllabus", desc: "Select Course" },
            { num: 2, label: "Layout & Marks", desc: "Auto-Balance" },
            { num: 3, label: "Readiness Audit", desc: "Pre-Flight Check" },
            { num: 4, label: "AI Generation", desc: "Engine Pipeline" },
            { num: 5, label: "Paper Studio", desc: "Review & OR Pairs" },
            { num: 6, label: "Validate & Export", desc: "Artifacts & Review" },
          ].map((step) => {
            const isCurrent = currentStep === step.num;
            const isPassed = currentStep > step.num;
            return (
              <button
                key={step.num}
                onClick={() => {
                  if (step.num < currentStep || (activePaper && step.num <= 6)) {
                    setCurrentStep(step.num);
                  }
                }}
                disabled={step.num > currentStep && !activePaper}
                className={`flex flex-col items-start p-3 rounded-lg text-left transition border ${
                  isCurrent
                    ? "bg-indigo-600/15 border-indigo-500 text-indigo-300"
                    : isPassed
                    ? "bg-slate-800/60 border-emerald-500/30 text-emerald-400 hover:bg-slate-800"
                    : "bg-slate-950/40 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isCurrent
                        ? "bg-indigo-500 text-white"
                        : isPassed
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : step.num}
                  </span>
                  <span>{step.label}</span>
                </div>
                <span className="text-[11px] text-slate-400 truncate w-full">{step.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: SELECT SUBJECT & SYLLABUS SCOPE                                   */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Step 1: Academic Scope & Syllabus Verification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subject Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Assigned Subject / Course <span className="text-rose-400">*</span>
                </label>
                {loadingSubjects ? (
                  <div className="h-10 bg-slate-800 animate-pulse rounded-lg" />
                ) : (
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code ? `[${sub.code}] ` : ""}
                        {sub.name} {sub.department_name ? `(${sub.department_name})` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {selectedSubjectObj && (
                  <p className="text-xs text-slate-400 mt-1.5">
                    Course Code: <span className="text-slate-200 font-mono">{selectedSubjectObj.code}</span> | 
                    Department: <span className="text-slate-200">{selectedSubjectObj.department_name || "General"}</span>
                  </p>
                )}
              </div>

              {/* Examination Title & Preset */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Paper Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Examination 2026"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Exam Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Examination Name
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. Mid Semester Examination"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Exam Duration (Minutes)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    min={15}
                    max={360}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 pl-9"
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Live Syllabus Verification Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                University Syllabus Grounding Verification
              </h3>
              <button
                onClick={() => fetchSyllabusCheck(subjectId)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSyllabus ? "animate-spin" : ""}`} />
                Re-verify
              </button>
            </div>

            {loadingSyllabus ? (
              <div className="py-6 flex items-center justify-center text-sm text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin mr-2 text-indigo-400" />
                Auditing curriculum grounding...
              </div>
            ) : syllabusCheck ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    syllabusCheck.status === "AVAILABLE"
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                      : "bg-amber-950/20 border-amber-500/30 text-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {syllabusCheck.status === "AVAILABLE" ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <span>Status: {syllabusCheck.status}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 font-mono">
                          {syllabusCheck.units_count} Units | {syllabusCheck.topics_count} Topics
                        </span>
                      </div>
                      <p className="text-xs opacity-80 mt-0.5">{syllabusCheck.message}</p>
                    </div>
                  </div>

                  {syllabusCheck.status === "AVAILABLE" ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Certified Grounding v{syllabusCheck.syllabus_version || 1}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Fallback Mode Required
                    </span>
                  )}
                </div>

                {/* If Syllabus is AVAILABLE, show unit summary */}
                {syllabusCheck.status === "AVAILABLE" && syllabusCheck.units && (
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Verified Curriculum Units to be 100% Assessed:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {syllabusCheck.units.map((u) => (
                        <div key={u.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                          <span className="text-xs font-medium text-indigo-300 block truncate">
                            Unit {u.unit_number}: {u.title}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {u.topics_count} verified curriculum topics
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* If Syllabus is UNAVAILABLE / INCOMPLETE, require consent for Fallback */}
                {syllabusCheck.status !== "AVAILABLE" && (
                  <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 text-slate-300 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-sm font-semibold text-rose-300 block">
                          No Official University Syllabus Detected
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          This subject has no uploaded or approved syllabus records. The system cannot certify questions as officially syllabus-compliant. To generate a preliminary paper, you must explicitly authorize Academic Fallback Mode.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 p-3 bg-slate-900/80 border border-slate-700/60 rounded-lg cursor-pointer hover:bg-slate-800/60 transition">
                      <input
                        type="checkbox"
                        checked={allowFallback}
                        onChange={(e) => setAllowFallback(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-0"
                      />
                      <span className="text-xs text-slate-200">
                        I acknowledge and authorize <strong className="text-amber-300">Academic Fallback Mode</strong>. Questions will be generated from standard academic subject principles and explicitly tagged as Fallback.
                      </span>
                    </label>
                  </div>
                )}
              </div>
            ) : null}

            {/* Step 1 Actions */}
            <div className="flex justify-end pt-4 mt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  if (syllabusCheck?.status !== "AVAILABLE" && !allowFallback) {
                    toast.error("Please enable Fallback Mode checkbox to proceed without an official syllabus.");
                    return;
                  }
                  setCurrentStep(2);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition"
              >
                Proceed to Layout & Marks
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: CONFIGURE PAPER LAYOUT & MARKS (WITH AUTO-BALANCE)                */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Preset Selector & Total Marks */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  Step 2: Paper Layout, Marks & Blueprint Architecture
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure maximum marks, section distributions, and university OR-choice questions with zero marks discrepancy.
                </p>
              </div>

              {/* Layout Templates */}
              {templates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Load Template:</span>
                  <select
                    onChange={(e) => {
                      const tmpl = templates.find((t) => t.id === e.target.value);
                      if (tmpl) handleApplyTemplate(tmpl);
                    }}
                    defaultValue=""
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="" disabled>Choose layout...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.max_marks}M)</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* University Marks Presets */}
            <div className="mb-6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
                Quick Preset Maximum Marks:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { marks: 50, label: "50 Marks", sub: "Mid-Term Exam", desc: "Sec A (10M) + Sec B (20M) + Sec C (20M)" },
                  { marks: 70, label: "70 Marks", sub: "End-Semester Exam", desc: "Sec A (10M) + Sec B (30M) + Sec C (30M)" },
                  { marks: 100, label: "100 Marks", sub: "Comprehensive Exam", desc: "Sec A (20M) + Sec B (40M) + Sec C (40M)" },
                  { marks: 30, label: "30 Marks", sub: "Unit Assessment", desc: "Sec A (10M) + Sec B (20M)" },
                ].map((preset) => (
                  <button
                    key={preset.marks}
                    type="button"
                    onClick={() => handleSelectPresetMarks(preset.marks, preset.sub)}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      totalMarks === preset.marks
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-100">{preset.label}</span>
                      {totalMarks === preset.marks && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <span className="text-xs font-medium text-indigo-400 block mt-0.5">{preset.sub}</span>
                    <span className="text-[11px] text-slate-500 block mt-1 truncate">{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Marks Input & Auto-Balance Button */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Paper Maximum Marks
                  </label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    min={10}
                    max={200}
                    className="w-32 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => autoBalanceDistribution(Number(totalMarks))}
                  className="px-4 py-2 mt-4 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-Balance Blueprint
                </button>
              </div>

              {/* Real-time Marks Reconciliation Badge */}
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <span className="text-slate-400 block">Candidate Attempt Marks:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      totalCalculatedAttemptMarks === Number(totalMarks)
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {totalCalculatedAttemptMarks} / {totalMarks} M
                  </span>
                </div>

                <div className="text-right border-l border-slate-800 pl-4">
                  <span className="text-slate-400 block">Total Displayed Marks:</span>
                  <span className="font-mono font-bold text-sm text-indigo-300">
                    {totalCalculatedDisplayedMarks} M
                  </span>
                  <span className="text-[10px] text-slate-500 block">(Includes OR choices)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section Distribution Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Section & Question Distribution Matrix
              </h3>

              <button
                type="button"
                onClick={() => {
                  setDistribution((prev) => [
                    ...prev,
                    {
                      question_type: "DESCRIPTIVE",
                      marks: 5,
                      count: 2,
                      section_name: `Section ${String.fromCharCode(65 + prev.length)}`,
                      selection_rule: "SINGLE",
                      has_or_alternative: false
                    }
                  ]);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Distribution Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Question Type</th>
                    <th className="py-2.5 px-3">Marks/Q</th>
                    <th className="py-2.5 px-3">Questions Count</th>
                    <th className="py-2.5 px-3">OR / Choice Rule</th>
                    <th className="py-2.5 px-3">Attempt Marks</th>
                    <th className="py-2.5 px-3">Displayed Marks</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {distribution.map((item, idx) => {
                    const rowAttempt = item.selection_rule === "ATTEMPT_ANY_N" && item.required_attempts
                      ? item.marks * item.required_attempts
                      : item.marks * item.count;
                    const rowDisplayed = item.has_or_alternative || item.selection_rule === "OR_PAIR"
                      ? item.marks * item.count * 2
                      : item.marks * item.count;

                    return (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        {/* Section Name */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.section_name}
                            onChange={(e) => {
                              const newD = [...distribution];
                              newD[idx].section_name = e.target.value;
                              setDistribution(newD);
                            }}
                            className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
                          />
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3">
                          <select
                            value={item.question_type}
                            onChange={(e) => {
                              const newD = [...distribution];
                              newD[idx].question_type = e.target.value;
                              setDistribution(newD);
                            }}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
                          >
                            <option value="MCQ">MCQ (1M)</option>
                            <option value="FILL_BLANK">Fill in Blank (1M)</option>
                            <option value="TRUE_FALSE">True / False (1M)</option>
                            <option value="SHORT">Short Answer (2-3M)</option>
                            <option value="DESCRIPTIVE">Descriptive (5-10M)</option>
                          </select>
                        </td>

                        {/* Marks */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            value={item.marks}
                            min={1}
                            max={50}
                            onChange={(e) => {
                              const newD = [...distribution];
                              newD[idx].marks = Number(e.target.value);
                              setDistribution(newD);
                            }}
                            className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                          />
                        </td>

                        {/* Count */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            value={item.count}
                            min={1}
                            max={50}
                            onChange={(e) => {
                              const newD = [...distribution];
                              newD[idx].count = Number(e.target.value);
                              setDistribution(newD);
                            }}
                            className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                          />
                        </td>

                        {/* Choice Rule */}
                        <td className="py-2.5 px-3">
                          <select
                            value={item.selection_rule}
                            onChange={(e) => {
                              const newD = [...distribution];
                              newD[idx].selection_rule = e.target.value;
                              newD[idx].has_or_alternative = e.target.value === "OR_PAIR";
                              setDistribution(newD);
                            }}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                          >
                            <option value="SINGLE">Compulsory (Single)</option>
                            <option value="OR_PAIR">Internal OR Pair (Q a OR b)</option>
                            <option value="ATTEMPT_ANY_N">Attempt Any N</option>
                          </select>
                        </td>

                        {/* Attempt Marks */}
                        <td className="py-2.5 px-3 font-mono font-semibold text-emerald-400">
                          {rowAttempt} M
                        </td>

                        {/* Displayed Marks */}
                        <td className="py-2.5 px-3 font-mono text-indigo-300">
                          {rowDisplayed} M
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (distribution.length <= 1) {
                                toast.error("Paper must have at least one question row.");
                                return;
                              }
                              setDistribution(distribution.filter((_, i) => i !== idx));
                            }}
                            className="text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Advance Tuning Toggle */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAdvancedTuning(!showAdvancedTuning)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                {showAdvancedTuning ? "Hide Advanced Tuning" : "Show Advanced Tuning (Bloom's Taxonomy, Source Ratio, Difficulty)"}
              </button>
            </div>

            {/* Advanced Tuning Panel */}
            {showAdvancedTuning && (
              <div className="mt-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Source Ratio */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Hybrid Source Composition
                    </label>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Bank ({bankRatio}%)</span>
                      <span>AI Engine ({100 - bankRatio}%)</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={bankRatio}
                      onChange={(e) => setBankRatio(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Difficulty Distribution */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Difficulty Split ({easyPercent}% / {mediumPercent}% / {hardPercent}%)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400">Easy %</span>
                        <input
                          type="number"
                          value={easyPercent}
                          onChange={(e) => setEasyPercent(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Med %</span>
                        <input
                          type="number"
                          value={mediumPercent}
                          onChange={(e) => setMediumPercent(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Hard %</span>
                        <input
                          type="number"
                          value={hardPercent}
                          onChange={(e) => setHardPercent(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloom Taxonomy Targets */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Bloom's Taxonomy Weights
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      <div>
                        <span className="text-slate-400 truncate block">Remember</span>
                        <input
                          type="number"
                          value={bloomRemember}
                          onChange={(e) => setBloomRemember(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 truncate block">Understand</span>
                        <input
                          type="number"
                          value={bloomUnderstand}
                          onChange={(e) => setBloomUnderstand(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 truncate block">Apply</span>
                        <input
                          type="number"
                          value={bloomApply}
                          onChange={(e) => setBloomApply(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 truncate block">Analyze</span>
                        <input
                          type="number"
                          value={bloomAnalyze}
                          onChange={(e) => setBloomAnalyze(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 truncate block">Evaluate</span>
                        <input
                          type="number"
                          value={bloomEvaluate}
                          onChange={(e) => setBloomEvaluate(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 truncate block">Create</span>
                        <input
                          type="number"
                          value={bloomCreate}
                          onChange={(e) => setBloomCreate(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2 Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Step 1
            </button>

            <button
              onClick={() => {
                if (totalCalculatedAttemptMarks !== Number(totalMarks)) {
                  toast.error(`Attempt marks (${totalCalculatedAttemptMarks}) does not match target (${totalMarks}). Please click Auto-Balance Blueprint.`);
                  return;
                }
                setCurrentStep(3);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition"
            >
              Proceed to Readiness Audit
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: SOURCE READINESS AUDIT                                            */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Step 3: Pre-Flight Academic Readiness Audit
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Reviewing syllabus coverage, question bank availability, and configured AI generation provider before execution.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Syllabus Grounding Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">1. Syllabus Grounding</span>
                    {syllabusCheck?.status === "AVAILABLE" ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                        AVAILABLE
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                        FALLBACK MODE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {syllabusCheck?.status === "AVAILABLE"
                      ? `Full coverage guaranteed across ${syllabusCheck.units_count} syllabus units and ${syllabusCheck.topics_count} verified curriculum topics.`
                      : "Operating in authorized Fallback Academic mode. Questions will be synthesized from core subject taxonomy."}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                  Grounding Mode: <strong className="text-slate-300">{syllabusCheck?.status === "AVAILABLE" ? "SYLLABUS_GROUNDED" : "FALLBACK_ACADEMIC"}</strong>
                </div>
              </div>

              {/* 2. Question Bank Inventory */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">2. Question Bank</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30">
                      APPROVED
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Targeted ratio: {bankRatio}% Bank questions, {100 - bankRatio}% AI generated questions. Approved items ready for selection.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                  Deduplication: <strong className="text-slate-300">Token similarity &lt; 0.85</strong>
                </div>
              </div>

              {/* 3. AI Provider Engine */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">3. AI Provider Engine</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                        providerStatus?.status === "ACTIVE"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      }`}
                    >
                      {providerStatus?.status || "STANDBY"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Active Provider: <strong className="text-slate-200 capitalize">{providerStatus?.provider || "Synthesizer"}</strong> ({providerStatus?.model || "Academic"}). 
                    Protected with bounded 25s timeout and rate-limit retry guards.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                  Security: <strong className="text-emerald-400">No Raw Credentials Exposed</strong>
                </div>
              </div>
            </div>

            {/* Blueprint Reconciliation Summary Box */}
            <div className="mt-6 p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-300 block">Blueprint Reconciliation</span>
                <span className="text-xs text-slate-400">
                  Subject: <strong className="text-slate-200">{selectedSubjectObj?.name}</strong> | 
                  Title: <strong className="text-slate-200">{title}</strong> | 
                  Candidate Attempt: <strong className="text-emerald-400">{totalCalculatedAttemptMarks} Marks</strong> | 
                  Total Displayed: <strong className="text-indigo-400">{totalCalculatedDisplayedMarks} Marks</strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-emerald-400">Ready to Generate</span>
              </div>
            </div>
          </div>

          {/* Step 3 Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Layout
            </button>

            <button
              onClick={handleStartGeneration}
              disabled={generating}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <Sparkles className="w-4 h-4" />
              Generate Question Paper
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: GENERATION PROGRESS                                               */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-2xl mx-auto my-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-100">
              Generating Examination Paper
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Executing Grounded Hybrid AI Pipeline for <span className="text-slate-200">{selectedSubjectObj?.name}</span>...
            </p>
          </div>

          <div className="space-y-3 text-left bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            {[
              { idx: 1, label: "Verifying syllabus curriculum grounding & units..." },
              { idx: 2, label: "Cycling syllabus units for balanced 100% curriculum coverage..." },
              { idx: 3, label: "Fetching approved questions from Question Bank..." },
              { idx: 4, label: "Generating AI questions via structured schema provider..." },
              { idx: 5, label: "Synthesizing university OR alternative choices..." },
              { idx: 6, label: "Performing deterministic marks audit & token deduplication..." },
            ].map((step) => {
              const done = generationStepsDone >= step.idx;
              const current = generationStepsDone === step.idx - 1;
              return (
                <div key={step.idx} className="flex items-center gap-3 text-xs">
                  {done ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : current ? (
                    <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                  )}
                  <span className={done ? "text-slate-200 font-medium" : current ? "text-indigo-300 font-semibold" : "text-slate-500"}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {activePaper && (
            <div className="pt-2">
              <button
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 mx-auto transition"
              >
                Open Question Paper Studio
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: QUESTION PAPER STUDIO (REVIEW, EDIT, OR PAIRS)                    */}
      {/* ========================================================================= */}
      {currentStep === 5 && activePaper && (
        <div className="space-y-6">
          {/* Active Paper Top Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-100">{activePaper.title}</h2>
                <StatusBadge status={activePaper.status} />
                {activePaper.is_syllabus_grounded ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                    Syllabus Grounded (v{activePaper.syllabus_version || 1})
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium">
                    Fallback Academic Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Subject: <span className="text-slate-200">{activePaper.subject_name || selectedSubjectObj?.name}</span> | 
                Candidate Attempt: <span className="text-emerald-400 font-mono font-bold">{activePaper.total_marks} Marks</span> | 
                Displayed: <span className="text-indigo-300 font-mono font-bold">{activePaper.displayed_marks || activePaper.total_marks} Marks</span> | 
                Duration: <span className="text-slate-200">{activePaper.duration_minutes} Mins</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition"
              >
                <Sliders className="w-3.5 h-3.5" />
                Adjust Blueprint
              </button>
              <button
                onClick={() => setCurrentStep(6)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
              >
                Validate & Export
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Paper Sections View */}
          <div className="space-y-6">
            {activePaper.sections?.map((sec, secIdx) => {
              // Group questions by group_id for OR pairs
              const orGroups: Record<string, QuestionPaperQuestion[]> = {};
              const standaloneQuestions: QuestionPaperQuestion[] = [];

              sec.questions.forEach((pq) => {
                const gid = pq.group_id || pq.or_group_id;
                if (gid) {
                  if (!orGroups[gid]) orGroups[gid] = [];
                  orGroups[gid].push(pq);
                } else {
                  standaloneQuestions.push(pq);
                }
              });

              return (
                <div key={sec.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  {/* Section Header */}
                  <div className="bg-slate-950/60 p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{sec.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {sec.selection_rule === "ATTEMPT_ANY_N"
                            ? `Attempt Any ${sec.required_attempts}`
                            : "Standard Section"}
                        </span>
                        <span className="text-xs font-semibold text-emerald-400">
                          {sec.total_marks} Marks
                        </span>
                      </div>
                      {sec.instructions && (
                        <p className="text-xs text-slate-400 mt-0.5">{sec.instructions}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openBankForSection(sec.id)}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Question
                      </button>
                      <button
                        onClick={() => handleRegenerateSection(sec.id)}
                        disabled={regeneratingSecId === sec.id}
                        className="px-2.5 py-1 text-xs bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded flex items-center gap-1 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSecId === sec.id ? "animate-spin" : ""}`} />
                        Regenerate Section
                      </button>
                    </div>
                  </div>

                  {/* Section Content: Questions and OR Pairs */}
                  <div className="p-4 space-y-4">
                    {/* 1. OR Groups Rendering */}
                    {Object.entries(orGroups).map(([gid, groupQuestions], gIdx) => {
                      const firstQ = groupQuestions[0];
                      return (
                        <div key={gid} className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/10 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                              <Split className="w-3.5 h-3.5" />
                              OR Group #{gIdx + 1} (Attempt 1 of {groupQuestions.length})
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {firstQ.marks} Marks
                            </span>
                          </div>

                          <div className="space-y-3">
                            {groupQuestions.map((pq, subIdx) => (
                              <React.Fragment key={pq.id}>
                                {subIdx > 0 && (
                                  <div className="relative flex py-1 items-center justify-center">
                                    <div className="flex-grow border-t border-indigo-500/20"></div>
                                    <span className="flex-shrink mx-4 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                                      OR
                                    </span>
                                    <div className="flex-grow border-t border-indigo-500/20"></div>
                                  </div>
                                )}

                                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-300">
                                          Q{pq.order_index}({pq.alternative_label || (subIdx === 0 ? "a" : "b")})
                                        </span>
                                        <TypeBadge type={pq.question?.question_type || "DESCRIPTIVE"} />
                                        <DifficultyBadge difficulty={pq.question?.difficulty || "MEDIUM"} />
                                        {pq.bloom_level && (
                                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                            {pq.bloom_level}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-200">{pq.question?.question_text}</p>
                                      
                                      {/* Provenance Badge */}
                                      {pq.syllabus_provenance && (
                                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                                          <BookOpen className="w-3 h-3 text-indigo-400" />
                                          <span>
                                            {pq.syllabus_provenance.unit_title
                                              ? `Unit ${pq.syllabus_provenance.unit_number || ""}: ${pq.syllabus_provenance.unit_title}`
                                              : "Grounded Curriculum"}
                                          </span>
                                          {pq.syllabus_provenance.source && (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                              {pq.syllabus_provenance.source}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => openEditModal(pq)}
                                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition"
                                        title="Edit Question"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleRegenerateQuestion(pq.id)}
                                        disabled={regeneratingQId === pq.id}
                                        className="p-1.5 text-slate-400 hover:text-indigo-400 rounded hover:bg-slate-800 transition"
                                        title="Regenerate"
                                      >
                                        <RefreshCw className={`w-3.5 h-3.5 ${regeneratingQId === pq.id ? "animate-spin" : ""}`} />
                                      </button>
                                      <button
                                        onClick={() => handleRemoveQuestion(pq.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* 2. Standalone Questions Rendering */}
                    {standaloneQuestions.map((pq) => (
                      <div key={pq.id} className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-300">
                                Q{pq.order_index}
                              </span>
                              <TypeBadge type={pq.question?.question_type || "DESCRIPTIVE"} />
                              <DifficultyBadge difficulty={pq.question?.difficulty || "MEDIUM"} />
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                {pq.marks} Marks
                              </span>
                              {pq.bloom_level && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                  {pq.bloom_level}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-200">{pq.question?.question_text}</p>

                            {/* Provenance Badge */}
                            {pq.syllabus_provenance && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                                <BookOpen className="w-3 h-3 text-indigo-400" />
                                <span>
                                  {pq.syllabus_provenance.unit_title
                                    ? `Unit ${pq.syllabus_provenance.unit_number || ""}: ${pq.syllabus_provenance.unit_title}`
                                    : "Grounded Curriculum"}
                                </span>
                                {pq.syllabus_provenance.source && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                    {pq.syllabus_provenance.source}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openAddAlternativeModal(pq)}
                              className="px-2 py-1 text-[11px] bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 rounded flex items-center gap-1 transition"
                            >
                              <Split className="w-3 h-3" />
                              Add OR Choice
                            </button>
                            <button
                              onClick={() => openEditModal(pq)}
                              className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition"
                              title="Edit Question"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRegenerateQuestion(pq.id)}
                              disabled={regeneratingQId === pq.id}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 rounded hover:bg-slate-800 transition"
                              title="Regenerate"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingQId === pq.id ? "animate-spin" : ""}`} />
                            </button>
                            <button
                              onClick={() => handleRemoveQuestion(pq.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 5 Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Layout Setup
            </button>

            <button
              onClick={() => setCurrentStep(6)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition"
            >
              Proceed to Validation & Multi-Artifact Export
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: VALIDATE & MULTI-ARTIFACT EXPORT                                  */}
      {/* ========================================================================= */}
      {currentStep === 6 && activePaper && (
        <div className="space-y-6">
          {/* Validation Report Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Step 6: Deterministic Validation & Multi-Artifact Export
              </h2>
              <button
                onClick={() => handleValidate(activePaper.id)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${validating ? "animate-spin" : ""}`} />
                Re-validate
              </button>
            </div>

            {validation && (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                    validation.is_valid
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-950/20 border-rose-500/30 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {validation.is_valid ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <span className="text-sm font-bold">
                        {validation.is_valid
                          ? "Academic Validation Passed: Marks & Syllabus Reconciled"
                          : "Validation Warning Detected"}
                      </span>
                      <p className="text-xs opacity-80 mt-0.5">
                        Candidate Attempt Marks: {validation.total_marks_actual} / {validation.total_marks_expected} M | 
                        Total Questions: {validation.total_questions} | Duplicate Index: {validation.duplicate_count}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-900 border border-slate-700">
                    {validation.status || (validation.is_valid ? "PASSED" : "FAILED")}
                  </span>
                </div>

                {/* Detailed Errors or Warnings */}
                {validation.errors && validation.errors.length > 0 && (
                  <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-lg text-xs text-rose-300 space-y-1">
                    <span className="font-semibold block">Validation Issues:</span>
                    {validation.errors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Multi-Artifact Export Cards */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-400" />
              Multi-Artifact PDF Downloads
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Student Exam Paper PDF */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3">
                <div>
                  <FileText className="w-6 h-6 text-indigo-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-100 block">Student Exam Paper</span>
                  <p className="text-xs text-slate-400 mt-1">
                    Formatted exam paper with instructions, sections, and OR choices. Confidential answers omitted.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadPDF("paper")}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Paper PDF
                </button>
              </div>

              {/* Teacher Master Copy */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3">
                <div>
                  <BookOpen className="w-6 h-6 text-emerald-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-100 block">Teacher Master Copy</span>
                  <p className="text-xs text-slate-400 mt-1">
                    Full paper with expected answers, Bloom&apos;s mappings, syllabus units, and solution hints.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadPDF("solution")}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Master PDF
                </button>
              </div>

              {/* Answer Key & Rubrics */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3">
                <div>
                  <Key className="w-6 h-6 text-amber-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-100 block">Answer Key & Rubrics</span>
                  <p className="text-xs text-slate-400 mt-1">
                    Step-by-step points breakdown, objective keys, and scoring criteria for examiners.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadPDF("answer-key")}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Key PDF
                </button>
              </div>

              {/* Marking Scheme */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3">
                <div>
                  <ShieldCheck className="w-6 h-6 text-purple-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-100 block">Moderation Scheme</span>
                  <p className="text-xs text-slate-400 mt-1">
                    Official evaluation scheme formatted for HOD and external moderation verification.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadPDF("marking-scheme")}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Scheme PDF
                </button>
              </div>
            </div>
          </div>

          {/* Workflow Submission Card */}
          <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-sm font-bold text-slate-100 block">
                Submit Question Paper for Formal Moderation
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Submits the paper into the official HOD approval workflow. Changes status to <code className="text-indigo-300">UNDER_REVIEW</code>.
              </p>
            </div>

            <button
              onClick={handleSubmitForReview}
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition shrink-0"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Submitting..." : "Submit to HOD Moderation"}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* 1. Edit Question Modal */}
      {editModalOpen && editingQuestion && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Question Content & Rubrics"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Question Text
              </label>
              <textarea
                value={editingQuestion.text}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Marks</label>
                <input
                  type="number"
                  value={editingQuestion.marks}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Difficulty</label>
                <select
                  value={editingQuestion.difficulty}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bloom Level</label>
                <select
                  value={editingQuestion.bloom_level}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, bloom_level: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                >
                  <option value="REMEMBER">REMEMBER</option>
                  <option value="UNDERSTAND">UNDERSTAND</option>
                  <option value="APPLY">APPLY</option>
                  <option value="ANALYZE">ANALYZE</option>
                  <option value="EVALUATE">EVALUATE</option>
                  <option value="CREATE">CREATE</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Expected Answer / Solution
              </label>
              <textarea
                value={editingQuestion.expected_answer}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, expected_answer: e.target.value })}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Marking Scheme / Step Rubric
              </label>
              <textarea
                value={editingQuestion.marking_scheme}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, marking_scheme: e.target.value })}
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestionEdit}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Add Alternative OR Question Modal */}
      {altModalOpen && targetQuestionForAlt && (
        <Modal
          isOpen={altModalOpen}
          onClose={() => setAltModalOpen(false)}
          title={`Add OR Alternative to Q${targetQuestionForAlt.order_index} (${targetQuestionForAlt.marks} Marks)`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
              <span className="text-slate-400 block mb-1">Existing Alternative A:</span>
              <p className="text-slate-200 font-medium">{targetQuestionForAlt.question?.question_text}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Alternative Creation Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAltSourceMode("AI")}
                  className={`py-2 px-3 text-xs font-semibold rounded border transition ${
                    altSourceMode === "AI"
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  Generate via AI Provider
                </button>
                <button
                  type="button"
                  onClick={() => setAltSourceMode("BANK")}
                  className={`py-2 px-3 text-xs font-semibold rounded border transition ${
                    altSourceMode === "BANK"
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  Manual / Custom Text
                </button>
              </div>
            </div>

            {altSourceMode === "BANK" && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Alternative B Question Text
                </label>
                <textarea
                  value={altQuestionText}
                  onChange={(e) => setAltQuestionText(e.target.value)}
                  rows={3}
                  placeholder="Enter the alternative question text..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setAltModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAlternativeSubmit}
                disabled={addingAlt}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded"
              >
                {addingAlt ? "Pairing..." : "Confirm OR Alternative"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Question Bank Selection Modal */}
      {bankModalOpen && (
        <Modal
          isOpen={bankModalOpen}
          onClose={() => setBankModalOpen(false)}
          title="Add Question from Approved Question Bank"
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {bankLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading approved questions...</div>
            ) : bankQuestions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No approved questions found for this subject.</div>
            ) : (
              <div className="space-y-2">
                {bankQuestions.map((q) => (
                  <div key={q.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between gap-3">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <TypeBadge type={q.question_type} />
                        <DifficultyBadge difficulty={q.difficulty} />
                        <span className="font-mono text-emerald-400 font-bold">{q.marks} Marks</span>
                      </div>
                      <p className="text-slate-200">{q.question_text}</p>
                    </div>
                    <button
                      onClick={() => handleAddQuestionFromBank(q.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded shrink-0 transition"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
