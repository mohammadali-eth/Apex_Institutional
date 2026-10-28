"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { TestResultDetail } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  RotateCcw,
  Check,
  X,
  BookOpen,
  HelpCircle,
  Sparkles,
} from "lucide-react";

function parseOption(opt: any, index: number): { key: string; text: string } {
  if (!opt) {
    const letter = String.fromCharCode(65 + index);
    return { key: letter, text: `Option ${letter}` };
  }
  if (typeof opt === "string") {
    try {
      const parsed = JSON.parse(opt);
      if (typeof parsed === "object" && parsed !== null) {
        return {
          key: String(parsed.key || parsed.option_key || String.fromCharCode(65 + index)),
          text: String(parsed.text || parsed.option_text || "")
        };
      }
    } catch {}
    return { key: String.fromCharCode(65 + index), text: opt };
  }
  if (typeof opt === "object") {
    return {
      key: String(opt.key || opt.option_key || String.fromCharCode(65 + index)),
      text: String(opt.text || opt.option_text || "")
    };
  }
  return { key: String.fromCharCode(65 + index), text: String(opt) };
}

export default function StudentSingleResultPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;

  const [result, setResult] = useState<TestResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;

    api
      .get<TestResultDetail>(`/student/results/${attemptId}`)
      .then((data) => setResult(data))
      .catch((err) => {
        console.error("Error loading test result:", err);
        setError("Failed to load test results or attempt does not exist.");
      })
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-44 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
        <div className="h-64 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-md mx-auto bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
        <h2 className="text-base font-bold text-[var(--title-color)]">Result Not Found</h2>
        <p className="text-xs text-[var(--paragraph-color)]">{error || "Could not retrieve scorecard."}</p>
        <Link href="/dashboard/tests/results" className="btn-secondary text-xs inline-flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Results</span>
        </Link>
      </div>
    );
  }

  const timeTakenMins = result.time_taken_seconds ? Math.round(result.time_taken_seconds / 60) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/tests/results"
          className="text-xs font-semibold text-[var(--paragraph-color)] hover:text-[var(--title-color)] flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Results</span>
        </Link>

        <Link
          href={`/dashboard/tests/${result.test_id}`}
          className="px-3.5 py-1.5 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Re-take Assessment</span>
        </Link>
      </div>

      {/* Scorecard Hero Banner */}
      <div className="bg-[#45525b] text-white p-6 sm:p-8 rounded-[var(--radius-lg)] border border-[#3c474f] shadow-[var(--shadow-md)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#82c341] text-[#000000] uppercase">
                {result.subject_code}
              </span>
              <span className="text-xs text-[#dce1e4] font-medium">
                {result.subject_name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {result.test_title}
            </h1>
            <p className="text-xs text-[#dce1e4]">
              Submitted on {new Date(result.submitted_at || result.started_at).toLocaleDateString()} at{" "}
              {new Date(result.submitted_at || result.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Big Score Box */}
          <div className="bg-white/10 p-5 rounded-[var(--radius-lg)] border border-white/20 text-center shrink-0 min-w-[160px]">
            <span
              className={`inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider mb-2 ${
                result.is_passed ? "bg-[#82c341] text-[#000000]" : "bg-red-500 text-white"
              }`}
            >
              {result.is_passed ? "PASSED" : "FAILED"}
            </span>
            <div className="text-3xl font-black text-white">
              {result.obtained_marks}
              <span className="text-base font-normal text-[#dce1e4]"> / {result.total_marks}</span>
            </div>
            <p className="text-xs font-bold text-[#82c341] mt-1">{result.percentage}% Score</p>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/10 text-xs text-center">
          <div className="bg-white/5 p-2.5 rounded">
            <p className="text-[10px] text-[#82c341] uppercase font-bold">Total Questions</p>
            <p className="text-sm font-bold text-white mt-0.5">{result.total_questions}</p>
          </div>
          <div className="bg-white/5 p-2.5 rounded">
            <p className="text-[10px] text-[#82c341] uppercase font-bold">Correct Answers</p>
            <p className="text-sm font-bold text-white mt-0.5">{result.correct_count}</p>
          </div>
          <div className="bg-white/5 p-2.5 rounded">
            <p className="text-[10px] text-[#82c341] uppercase font-bold">Pending Review</p>
            <p className="text-sm font-bold text-white mt-0.5">{result.pending_eval_count}</p>
          </div>
          <div className="bg-white/5 p-2.5 rounded">
            <p className="text-[10px] text-[#82c341] uppercase font-bold">Time Taken</p>
            <p className="text-sm font-bold text-white mt-0.5">
              {timeTakenMins > 0 ? `${timeTakenMins} Mins` : `${result.time_taken_seconds || 0} Secs`}
            </p>
          </div>
        </div>
      </div>

      {/* Question by Question Detailed Solutions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
          <h2 className="text-base font-bold text-[var(--title-color)]">
            Detailed Question Review & Explanations
          </h2>
          <span className="text-xs text-[var(--paragraph-color)]">
            {result.questions.length} Questions Evaluated
          </span>
        </div>

        <div className="space-y-4">
          {result.questions.map((q, idx) => {
            const hasAnswered = !!q.student_answer && q.student_answer.trim().length > 0;
            const isCorrect = q.is_correct;
            const isDescriptive = q.question_type === "DESCRIPTIVE";

            return (
              <div
                key={q.snapshot_id}
                className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-4"
              >
                {/* Question Item Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-[#45525b] text-white">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-[var(--paragraph-color)]">
                      {q.question_type.replace("_", " ")} &bull; {q.marks} Mark{q.marks > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div>
                    {isDescriptive ? (
                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800">
                        Pending Faculty Evaluation
                      </span>
                    ) : isCorrect ? (
                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#82c341]/20 text-[#325816] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Correct (+{q.obtained_marks})</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Incorrect ({q.obtained_marks} Marks)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Prompt */}
                <p className="text-sm font-semibold text-[var(--title-color)] leading-relaxed whitespace-pre-wrap">
                  {q.question_text}
                </p>

                {/* MCQ Options Display (if applicable) */}
                {q.question_type === "MCQ" && q.options && (
                  <div className="space-y-1.5 pt-1">
                    {q.options.map((rawOpt, optIdx) => {
                      const opt = parseOption(rawOpt, optIdx);
                      const isStudentPick = q.student_answer === opt.key;
                      const isCorrectAnswer = q.correct_answer_key === opt.key;

                      let style = "bg-[var(--background-color)] border-[var(--border-color)] text-[var(--paragraph-color)]";
                      if (isCorrectAnswer) {
                        style = "bg-[#82c341]/15 border-[#82c341] text-[#325816] font-bold";
                      } else if (isStudentPick && !isCorrect) {
                        style = "bg-red-50 border-red-300 text-red-700 font-bold";
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-[var(--radius-md)] border text-xs flex items-center justify-between ${style}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-xs border border-inherit">
                              {opt.key}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                          {isCorrectAnswer && (
                            <span className="text-[10px] font-bold text-[#325816] uppercase">
                              Correct Answer
                            </span>
                          )}
                          {isStudentPick && !isCorrectAnswer && (
                            <span className="text-[10px] font-bold text-red-700 uppercase">
                              Your Selection
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Answer Summary Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-[var(--background-color)] p-3 rounded-[var(--radius-md)] border border-[var(--border-color)]">
                    <p className="text-[10px] font-bold text-[var(--font-color)] uppercase">Your Submitted Response:</p>
                    <p className={`mt-1 font-semibold ${hasAnswered ? "text-[var(--title-color)]" : "text-amber-700 italic"}`}>
                      {hasAnswered ? q.student_answer : "(Not Answered / Left Blank)"}
                    </p>
                  </div>

                  <div className="bg-[var(--background-color)] p-3 rounded-[var(--radius-md)] border border-[var(--border-color)]">
                    <p className="text-[10px] font-bold text-[var(--font-color)] uppercase">Official Correct Key:</p>
                    <p className="mt-1 font-bold text-[#325816]">
                      {q.correct_answer_key || "Under Faculty Moderation"}
                    </p>
                  </div>
                </div>

                {/* Academic Explanation */}
                {q.explanation && (
                  <div className="bg-[#f6f6f7] p-4 rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-1">
                    <p className="text-[11px] font-bold text-[var(--secondary-color)] uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#82c341]" />
                      <span>Academic Rationale & Solution Note:</span>
                    </p>
                    <p className="text-xs text-[var(--paragraph-color)] leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
