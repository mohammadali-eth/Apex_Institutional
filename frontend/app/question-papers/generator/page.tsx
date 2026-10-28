"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Subject, QuestionPaper } from "@/lib/types";
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Calculator,
  Sliders,
} from "lucide-react";

interface DistributionRow {
  id: string;
  type: "MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "DESCRIPTIVE";
  label: string;
  marks: number;
  count: number;
}

export default function PaperGeneratorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [title, setTitle] = useState("End Semester Examination 2026-27");
  const [examName, setExamName] = useState("University Main Examination");
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [totalMarksTarget, setTotalMarksTarget] = useState(70);
  const [instructions, setInstructions] = useState(
    "1. Section A is compulsory.\n2. In Section B and C, answer questions following the indicated choice.\n3. Draw neat diagrams wherever necessary."
  );

  // Difficulty Distribution percentages
  const [diffEasy, setDiffEasy] = useState(30);
  const [diffMedium, setDiffMedium] = useState(50);
  const [diffHard, setDiffHard] = useState(20);

  // Distribution matrix items
  const [distribution, setDistribution] = useState<DistributionRow[]>([
    { id: "1", type: "MCQ", label: "Multiple Choice Questions", marks: 1, count: 10 },
    { id: "2", type: "TRUE_FALSE", label: "True / False Questions", marks: 1, count: 5 },
    { id: "3", type: "FILL_BLANK", label: "Fill in the Blanks", marks: 1, count: 5 },
    { id: "4", type: "DESCRIPTIVE", label: "Short Answer Questions", marks: 2, count: 5 },
    { id: "5", type: "DESCRIPTIVE", label: "Descriptive Analytical Questions", marks: 5, count: 4 },
    { id: "6", type: "DESCRIPTIVE", label: "Long / Essay Questions", marks: 10, count: 2 },
  ]);

  useEffect(() => {
    api.get<Subject[]>("/academic/subjects").then((data) => {
      setSubjects(data);
      if (data.length > 0) {
        setSelectedSubjectId(data[0].id);
      }
    });
  }, []);

  // Calculate live running marks
  const currentCalculatedMarks = distribution.reduce((acc, row) => acc + row.marks * row.count, 0);
  const totalQuestionsConfigured = distribution.reduce((acc, row) => acc + row.count, 0);
  const marksMatch = currentCalculatedMarks === totalMarksTarget;

  const handleRowChange = (id: string, field: "marks" | "count", val: number) => {
    setDistribution((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: Math.max(0, val) } : r))
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) {
      toast.error("Please select a subject");
      return;
    }

    if (!marksMatch) {
      toast.error(
        `Distribution marks (${currentCalculatedMarks}) do not match target total marks (${totalMarksTarget}). Adjust your counts or target.`
      );
      return;
    }

    setLoading(true);

    const payload = {
      subject_id: selectedSubjectId,
      title,
      exam_name: examName,
      duration_minutes: durationMinutes,
      total_marks: totalMarksTarget,
      instructions,
      distribution: distribution
        .filter((r) => r.count > 0)
        .map((r) => ({
          question_type: r.type,
          marks: r.marks,
          count: r.count,
        })),
      difficulty: {
        easy: diffEasy,
        medium: diffMedium,
        hard: diffHard,
      },
      source_ratio: {
        bank_percentage: 50,
        ai_percentage: 50,
      },
      bloom_taxonomy: {
        remember: 20,
        understand: 30,
        apply: 25,
        analyze: 15,
        evaluate: 5,
        create: 5,
      },
    };

    try {
      const generated = await api.post<QuestionPaper>("/question-papers/generate", payload);
      toast.success("Examination paper generated successfully!");
      router.push(`/question-papers/${generated.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate question paper");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Question Papers", href: "/question-papers" },
          { label: "Paper Generator" },
        ]}
        title="Automated Question Paper Generator"
        description="Configure institutional blueprint specifications. The engine deterministically selects approved questions balancing your marks matrix, unit coverage, and Bloom's difficulty taxonomy."
      />

      {/* Main Generator Form */}
      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Blueprint Overview Slate Banner */}
        <div className="bg-[#45525b] rounded-[8px] p-6 text-white border border-[#374249] shadow-sm">
          <div className="flex items-center gap-2 text-[#82c341] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Deterministic Question Paper Generator</span>
          </div>
          <h2 className="text-lg font-bold text-white">Configure Examination Paper Blueprint</h2>
          <p className="text-[#dce1e4] text-xs mt-1 max-w-2xl leading-relaxed">
            The algorithmic engine selects approved questions from the verified question bank to meet curriculum standards without manual question hunting.
          </p>
        </div>

        {/* Academic & General Settings */}
        <div className="bg-white p-6 rounded-[8px] border border-[#dcdcdc] shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#44535b] flex items-center gap-2 border-b border-[#dcdcdc] pb-3 uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-[#82c341]" />
            <span>1. Academic Course & Exam Specifications</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1">Subject *</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                required
                className="input-theme"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name} ({s.program_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1">Paper Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input-theme font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1">Exam Name *</label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                required
                className="input-theme font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1">Target Total Marks *</label>
              <input
                type="number"
                min={10}
                max={200}
                value={totalMarksTarget}
                onChange={(e) => setTotalMarksTarget(parseInt(e.target.value) || 70)}
                required
                className="input-theme font-bold text-[#44535b] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1">Duration (Minutes)</label>
              <input
                type="number"
                min={30}
                max={360}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 180)}
                required
                className="input-theme font-medium"
              />
            </div>
          </div>
        </div>

        {/* Question Distribution Matrix */}
        <div className="bg-white p-6 rounded-[8px] border border-[#dcdcdc] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#dcdcdc] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#44535b] flex items-center gap-2 uppercase tracking-wider">
                <Calculator className="w-4 h-4 text-[#82c341]" />
                <span>2. Question Distribution Matrix</span>
              </h3>
              <p className="text-xs text-[#676767] mt-0.5">
                Configure question types and marks. Subtotals and grand totals update dynamically.
              </p>
            </div>

            {/* Live Marks Counter Badge */}
            <div
              className={`px-3 py-1.5 rounded-[6px] border flex items-center gap-2 text-xs font-bold self-start sm:self-auto ${
                marksMatch
                  ? "bg-[#eaf5de] border-[#82c341] text-[#2d5016]"
                  : "bg-amber-50 border-amber-300 text-amber-800"
              }`}
            >
              {marksMatch ? (
                <CheckCircle2 className="w-4 h-4 text-[#82c341]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span>
                Configured: {currentCalculatedMarks} / {totalMarksTarget} Marks ({totalQuestionsConfigured} Questions)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f6f6f7] text-[#44535b] font-bold uppercase tracking-wider border-b border-[#dcdcdc]">
                <tr>
                  <th className="px-4 py-2.5">Category / Type</th>
                  <th className="px-4 py-2.5 text-center">Marks / Question</th>
                  <th className="px-4 py-2.5 text-center">Quantity (Count)</th>
                  <th className="px-4 py-2.5 text-right">Subtotal Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dcdcdc]/70 text-[#44535b]">
                {distribution.map((row) => (
                  <tr key={row.id} className="hover:bg-[#f6f6f7]/60 transition">
                    <td className="px-4 py-3">
                      <p className="font-bold text-[#44535b]">{row.label}</p>
                      <span className="text-[10px] text-[#838383] uppercase font-semibold">{row.type}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={row.marks}
                        onChange={(e) => handleRowChange(row.id, "marks", parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-center border border-[#dcdcdc] rounded-[4px] text-xs font-bold bg-[#f6f6f7] text-[#44535b] focus:outline-none focus:border-[#82c341]"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.count}
                        onChange={(e) => handleRowChange(row.id, "count", parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-center border border-[#dcdcdc] rounded-[4px] text-xs font-bold bg-[#f6f6f7] text-[#44535b] focus:outline-none focus:border-[#82c341]"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#44535b]">
                      {row.marks * row.count} M
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[#dcdcdc] bg-[#f6f6f7] font-bold text-xs text-[#44535b]">
                <tr>
                  <td className="px-4 py-3 uppercase">Total Running Matrix</td>
                  <td className="px-4 py-3 text-center">-</td>
                  <td className="px-4 py-3 text-center text-[#44535b]">{totalQuestionsConfigured} Qs</td>
                  <td
                    className={`px-4 py-3 text-right text-sm font-bold ${
                      marksMatch ? "text-[#2d5016]" : "text-amber-800"
                    }`}
                  >
                    {currentCalculatedMarks} M
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {!marksMatch && (
            <div className="p-3 rounded-[6px] bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Difference of <b>{Math.abs(totalMarksTarget - currentCalculatedMarks)} Marks</b> detected. Adjust question quantities to equal exactly {totalMarksTarget} Marks before generating.
              </span>
            </div>
          )}
        </div>

        {/* Difficulty Distribution Sliders */}
        <div className="bg-white p-6 rounded-[8px] border border-[#dcdcdc] shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#44535b] flex items-center gap-2 border-b border-[#dcdcdc] pb-3 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-[#82c341]" />
            <span>3. Bloom's Difficulty Taxonomy Balance</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-[#2d5016]">Easy Questions</span>
                <span className="font-bold text-[#44535b]">{diffEasy}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={diffEasy}
                onChange={(e) => setDiffEasy(parseInt(e.target.value) || 0)}
                className="w-full accent-[#82c341] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-amber-700">Medium Questions</span>
                <span className="font-bold text-[#44535b]">{diffMedium}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={diffMedium}
                onChange={(e) => setDiffMedium(parseInt(e.target.value) || 0)}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-rose-700">Hard Questions</span>
                <span className="font-bold text-[#44535b]">{diffHard}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={diffHard}
                onChange={(e) => setDiffHard(parseInt(e.target.value) || 0)}
                className="w-full accent-rose-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Generate Button Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !marksMatch}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#000000] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Examination Paper</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}