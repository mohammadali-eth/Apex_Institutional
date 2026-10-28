"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { StudentClassSummary } from "@/lib/types";
import { Sparkles, X, AlertCircle, Clock, BookOpen, Layers } from "lucide-react";

interface PracticeTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: StudentClassSummary[];
  defaultSubjectId?: string;
}

export function PracticeTestModal({
  isOpen,
  onClose,
  classes,
  defaultSubjectId,
}: PracticeTestModalProps) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(defaultSubjectId || (classes[0]?.subject_id || ""));
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [difficulty, setDifficulty] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setError("Please select a course to generate a practice test.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post<{ test_id: string; message: string }>("/student/tests/practice", {
        subject_id: subjectId,
        question_count: questionCount,
        duration_minutes: durationMinutes,
        difficulty: difficulty === "ALL" ? "MIXED" : difficulty,
      });

      onClose();
      // Redirect to test instructions
      router.push(`/dashboard/tests/${res.test_id}`);
    } catch (err: any) {
      console.error("Practice test creation error:", err);
      setError(err?.message || "Failed to create practice test. Ensure the question bank has approved questions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[var(--white-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#45525b] text-white px-6 py-4 flex items-center justify-between border-b border-[#3c474f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[#82c341] flex items-center justify-center text-[#000000]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">Create AI Practice Test</h3>
              <p className="text-[11px] text-[#dce1e4]">Instant self-assessment from approved university bank</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#dce1e4] hover:text-white p-1 rounded hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)] flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Subject selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--title-color)] uppercase tracking-wider mb-1.5">
              Select Subject Course
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[var(--primary-color)]"
              required
            >
              {classes.map((cls) => (
                <option key={cls.subject_id} value={cls.subject_id}>
                  {cls.subject_code} &mdash; {cls.subject_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Number of questions */}
            <div>
              <label className="block text-xs font-bold text-[var(--title-color)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--secondary-color)]" />
                Questions
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[var(--primary-color)]"
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions</option>
              </select>
            </div>

            {/* Time limit */}
            <div>
              <label className="block text-xs font-bold text-[var(--title-color)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--secondary-color)]" />
                Time Limit
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[var(--primary-color)]"
              >
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
              </select>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-bold text-[var(--title-color)] uppercase tracking-wider mb-1.5">
              Difficulty Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "ALL", label: "Mixed" },
                { id: "EASY", label: "Easy" },
                { id: "MEDIUM", label: "Medium" },
                { id: "HARD", label: "Hard" },
              ].map((diff) => (
                <button
                  type="button"
                  key={diff.id}
                  onClick={() => setDifficulty(diff.id)}
                  className={`py-2 text-xs font-bold rounded-[var(--radius-md)] border transition ${
                    difficulty === diff.id
                      ? "bg-[#82c341] text-[#000000] border-[#82c341] shadow-[var(--shadow-sm)]"
                      : "bg-[var(--background-color)] text-[var(--paragraph-color)] border-[var(--border-color)] hover:bg-[#dcdcdc]/40"
                  }`}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#f6f6f7] p-3 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[11px] text-[var(--paragraph-color)] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#82c341] shrink-0" />
            <span>Questions are randomly sampled from your curriculum with auto-grading for immediate feedback.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-[var(--paragraph-color)] hover:text-[var(--title-color)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-[#82c341] hover:bg-[#72b036] text-[#000000] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? "Generating Test..." : "Generate & Start Test"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
