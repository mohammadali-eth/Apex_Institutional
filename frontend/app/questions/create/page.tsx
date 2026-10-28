"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Subject, Unit, Topic } from "@/lib/types";
import {
  HelpCircle,
  Save,
  Send,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  Eye,
  AlertCircle
} from "lucide-react";

export default function CreateQuestionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [questionType, setQuestionType] = useState<"MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "DESCRIPTIVE">("MCQ");
  const [marks, setMarks] = useState<number>(1);
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [questionText, setQuestionText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // MCQ Options
  const [options, setOptions] = useState([
    { option_key: "A", option_text: "", is_correct: true },
    { option_key: "B", option_text: "", is_correct: false },
    { option_key: "C", option_text: "", is_correct: false },
    { option_key: "D", option_text: "", is_correct: false },
  ]);

  // True/False state
  const [tfAnswer, setTfAnswer] = useState<"True" | "False">("True");

  // Fill Blank state
  const [blankAnswer, setBlankAnswer] = useState("");

  // Load subjects on mount
  useEffect(() => {
    api.get<Subject[]>("/academic/subjects").then((data) => {
      setSubjects(data);
      if (data.length > 0) {
        setSubjectId(data[0].id);
      }
    });
  }, []);

  // Load units when subject changes
  useEffect(() => {
    if (!subjectId) return;
    api.get<any[]>("/syllabus", { subject_id: subjectId }).then((syllabi) => {
      if (syllabi.length > 0 && syllabi[0].units) {
        setUnits(syllabi[0].units);
        if (syllabi[0].units.length > 0) {
          setUnitId(syllabi[0].units[0].id);
          setTopics(syllabi[0].units[0].topics || []);
        } else {
          setUnitId("");
          setTopics([]);
        }
      } else {
        setUnits([]);
        setUnitId("");
        setTopics([]);
      }
    });
  }, [subjectId]);

  // Load topics when unit changes
  useEffect(() => {
    const u = units.find((item) => item.id === unitId);
    if (u) {
      setTopics(u.topics || []);
      if (u.topics && u.topics.length > 0) {
        setTopicId(u.topics[0].id);
      } else {
        setTopicId("");
      }
    }
  }, [unitId, units]);

  // Handle MCQ correct option change
  const handleMcqCorrect = (key: string) => {
    setOptions((prev) =>
      prev.map((opt) => ({
        ...opt,
        is_correct: opt.option_key === key,
      }))
    );
  };

  const handleOptionTextChange = (key: string, text: string) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.option_key === key ? { ...opt, option_text: text } : opt))
    );
  };

  // Adjust default marks when question type changes
  const handleTypeChange = (newType: "MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "DESCRIPTIVE") => {
    setQuestionType(newType);
    if (newType === "MCQ" || newType === "TRUE_FALSE" || newType === "FILL_BLANK") {
      setMarks(1);
    } else {
      setMarks(5);
    }
  };

  const handleSubmit = async (submitStatus: "DRAFT" | "SUBMITTED") => {
    if (!subjectId || !questionText.trim()) {
      toast.error("Please enter the question text and select a subject");
      return;
    }

    if (questionType === "MCQ") {
      const emptyOpt = options.find((opt) => !opt.option_text.trim());
      if (emptyOpt) {
        toast.error(`Please provide text for Option ${emptyOpt.option_key}`);
        return;
      }
    }

    setLoading(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    let expAnswer = expectedAnswer;
    if (questionType === "TRUE_FALSE") {
      expAnswer = tfAnswer;
    } else if (questionType === "FILL_BLANK") {
      expAnswer = blankAnswer;
    }

    const payload = {
      subject_id: subjectId,
      unit_id: unitId || null,
      topic_id: topicId || null,
      question_text: questionText,
      question_type: questionType,
      marks: Number(marks),
      difficulty,
      language: "English",
      explanation: explanation || null,
      expected_answer: expAnswer || null,
      tags,
      options: questionType === "MCQ" ? options : [],
      status: submitStatus,
    };

    try {
      await api.post("/questions", payload);
      toast.success(
        submitStatus === "DRAFT"
          ? "Question saved as draft successfully!"
          : "Question submitted for review successfully!"
      );
      router.push("/questions");
    } catch (err: any) {
      toast.error(err.message || "Failed to create question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Bar with Page Header & Action Controls */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Question Bank", href: "/questions" },
          { label: "Author Question" },
        ]}
        title="Author Assessment Question"
        description="Craft standardized exam questions linked to syllabus units and cognitive difficulty taxonomy."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit("DRAFT")}
              className="btn-secondary flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit("SUBMITTED")}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Submit for Review</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Editor (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white p-6 rounded-[8px] border border-[#dcdcdc] shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-[#44535b] border-b border-[#dcdcdc] pb-3 uppercase tracking-wider">
              1. Academic Classification & Mapping
            </h3>

            {/* Academic Classification Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#44535b] mb-1">Subject *</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="input-theme"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44535b] mb-1">Curriculum Unit</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="input-theme"
                >
                  <option value="">General / All Units</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44535b] mb-1">Syllabus Topic</label>
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className="input-theme"
                >
                  <option value="">General Topic</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h3 className="text-sm font-bold text-[#44535b] border-b border-[#dcdcdc] pt-2 pb-3 uppercase tracking-wider">
              2. Format & Taxonomy
            </h3>

            {/* Question Type Selector: 4 cards */}
            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-2">Question Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { key: "MCQ", label: "Multiple Choice", desc: "1 Correct of 4" },
                  { key: "TRUE_FALSE", label: "True / False", desc: "Binary Choice" },
                  { key: "FILL_BLANK", label: "Fill Blank", desc: "Exact Keywords" },
                  { key: "DESCRIPTIVE", label: "Descriptive", desc: "Long / Short Form" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleTypeChange(item.key as any)}
                    className={`p-3 rounded-[6px] text-left border transition ${
                      questionType === item.key
                        ? "bg-[#eaf5de] border-[#82c341] text-[#000000] ring-1 ring-[#82c341]"
                        : "bg-[#f6f6f7] border-[#dcdcdc] text-[#44535b] hover:bg-white"
                    }`}
                  >
                    <p className="font-bold text-xs">{item.label}</p>
                    <p className="text-[10px] text-[#676767] mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Marks Selector */}
            {questionType === "DESCRIPTIVE" && (
              <div>
                <label className="block text-xs font-semibold text-[#44535b] mb-1.5">Marks Presets</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 8, 10, 15, 20].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMarks(m)}
                      className={`w-9 h-9 rounded-[6px] text-xs font-bold border transition ${
                        marks === m
                          ? "bg-[#82c341] border-[#82c341] text-[#000000] shadow-xs"
                          : "bg-[#f6f6f7] border-[#dcdcdc] text-[#44535b] hover:bg-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Difficulty Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1.5">Cognitive Difficulty (Taxonomy)</label>
              <div className="grid grid-cols-3 gap-2">
                {(["EASY", "MEDIUM", "HARD"] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`py-2 px-3 rounded-[6px] text-xs font-bold border transition ${
                      difficulty === diff
                        ? diff === "EASY"
                          ? "bg-[#eaf5de] border-[#82c341] text-[#2d5016]"
                          : diff === "MEDIUM"
                          ? "bg-amber-50 border-amber-400 text-amber-900"
                          : "bg-rose-50 border-rose-400 text-rose-900"
                        : "bg-[#f6f6f7] border-[#dcdcdc] text-[#44535b] hover:bg-white"
                    }`}
                  >
                    {diff.charAt(0) + diff.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <h3 className="text-sm font-bold text-[#44535b] border-b border-[#dcdcdc] pt-2 pb-3 uppercase tracking-wider">
              3. Question Content
            </h3>

            {/* Question Text */}
            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1">Question Prompt *</label>
              <textarea
                rows={3}
                placeholder="State the examination question clearly and unambiguously..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="input-theme leading-relaxed"
              />
            </div>

            {/* DYNAMIC TYPE FIELDS */}
            {/* MCQ Options */}
            {questionType === "MCQ" && (
              <div className="space-y-3 pt-2 border-t border-[#dcdcdc]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#44535b]">Multiple Choice Options</label>
                  <span className="text-[11px] text-[#838383]">Click radio circle to designate correct key</span>
                </div>
                <div className="space-y-2">
                  {options.map((opt) => (
                    <div key={opt.option_key} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mcq_correct"
                        checked={opt.is_correct}
                        onChange={() => handleMcqCorrect(opt.option_key)}
                        className="w-4 h-4 accent-[#82c341] cursor-pointer"
                        title="Mark as correct answer"
                      />
                      <span className="font-bold text-xs text-[#44535b] w-4">{opt.option_key}.</span>
                      <input
                        type="text"
                        placeholder={`Option ${opt.option_key} text...`}
                        value={opt.option_text}
                        onChange={(e) => handleOptionTextChange(opt.option_key, e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-[6px] text-xs focus:outline-none transition ${
                          opt.is_correct
                            ? "border-[#82c341] bg-[#eaf5de]/40 text-[#44535b] font-semibold"
                            : "border-[#dcdcdc] text-[#44535b] focus:border-[#82c341]"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* True/False */}
            {questionType === "TRUE_FALSE" && (
              <div className="space-y-2 pt-2 border-t border-[#dcdcdc]">
                <label className="block text-xs font-semibold text-[#44535b]">Designated Correct Answer</label>
                <div className="flex gap-3">
                  {(["True", "False"] as const).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setTfAnswer(choice)}
                      className={`px-6 py-2.5 rounded-[6px] text-xs font-bold border transition ${
                        tfAnswer === choice
                          ? "bg-[#eaf5de] border-[#82c341] text-[#2d5016] shadow-xs"
                          : "bg-[#f6f6f7] border-[#dcdcdc] text-[#44535b] hover:bg-white"
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fill in the Blank */}
            {questionType === "FILL_BLANK" && (
              <div className="space-y-2 pt-2 border-t border-[#dcdcdc]">
                <label className="block text-xs font-semibold text-[#44535b]">Accepted Answer(s) *</label>
                <input
                  type="text"
                  placeholder="e.g. CPU, Central Processing Unit"
                  value={blankAnswer}
                  onChange={(e) => setBlankAnswer(e.target.value)}
                  className="input-theme font-medium"
                />
                <p className="text-[11px] text-[#838383]">Comma-separated accepted text variations.</p>
              </div>
            )}

            {/* Expected Answer for Descriptive */}
            {questionType === "DESCRIPTIVE" && (
              <div className="space-y-2 pt-2 border-t border-[#dcdcdc]">
                <label className="block text-xs font-semibold text-[#44535b]">Model Answer / Key Points for Evaluator</label>
                <textarea
                  rows={3}
                  placeholder="Expected points, marking criteria, or solution steps..."
                  value={expectedAnswer}
                  onChange={(e) => setExpectedAnswer(e.target.value)}
                  className="input-theme"
                />
              </div>
            )}

            {/* Tags & Explanation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#dcdcdc]">
              <div>
                <label className="block text-xs font-semibold text-[#44535b] mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. transactions, acid, 2pl"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="input-theme"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44535b] mb-1">Explanation / Reference</label>
                <input
                  type="text"
                  placeholder="Reference textbook or syllabus citation..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="input-theme"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Card Preview */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-[8px] border border-[#dcdcdc] shadow-sm sticky top-24 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#44535b] border-b border-[#dcdcdc] pb-3">
              <Eye className="w-4 h-4 text-[#82c341]" />
              <span>Live Question Preview</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-[4px] bg-[#eaf5de] text-[#2d5016] font-bold border border-[#82c341]/30">
                  {questionType}
                </span>
                <span className="font-bold text-[#44535b]">{marks} Marks</span>
              </div>

              <div className="p-3 bg-[#f6f6f7] rounded-[6px] border border-[#dcdcdc] text-[#44535b] font-medium leading-relaxed">
                {questionText || <span className="text-[#838383] italic">Enter question prompt to see preview...</span>}
              </div>

              {questionType === "MCQ" && (
                <div className="space-y-1.5 pt-1">
                  {options.map((opt) => (
                    <div
                      key={opt.option_key}
                      className={`p-2.5 rounded-[6px] border flex items-center justify-between text-xs ${
                        opt.is_correct
                          ? "bg-[#eaf5de] border-[#82c341] text-[#2d5016] font-semibold"
                          : "bg-white border-[#dcdcdc] text-[#676767]"
                      }`}
                    >
                      <span>
                        <b>({opt.option_key})</b> {opt.option_text || `Option ${opt.option_key}`}
                      </span>
                      {opt.is_correct && <CheckCircle className="w-3.5 h-3.5 text-[#82c341]" />}
                    </div>
                  ))}
                </div>
              )}

              {questionType === "TRUE_FALSE" && (
                <p className="text-xs text-[#676767] font-semibold">
                  Correct Answer: <span className="text-[#2d5016] font-bold">{tfAnswer}</span>
                </p>
              )}

              {questionType === "FILL_BLANK" && blankAnswer && (
                <p className="text-xs text-[#676767] font-semibold">
                  Accepted Answer: <span className="text-[#2d5016] font-bold">{blankAnswer}</span>
                </p>
              )}

              {questionType === "DESCRIPTIVE" && expectedAnswer && (
                <div className="pt-2 border-t border-[#dcdcdc]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#838383] mb-1">Model Criteria</p>
                  <p className="p-2.5 bg-[#f6f6f7] rounded-[4px] border border-[#dcdcdc] text-[#676767] text-[11px] leading-relaxed">
                    {expectedAnswer}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}