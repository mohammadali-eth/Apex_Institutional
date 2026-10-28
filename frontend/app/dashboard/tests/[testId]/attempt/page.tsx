"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { TestAttemptDetail, StudentTestQuestion } from "@/lib/types";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Flag,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Maximize2,
  X,
  FileText,
  HelpCircle,
  LogOut,
  Save,
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

export default function TestAttemptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const testId = params.testId as string;
  const initialAttemptId = searchParams.get("attempt_id");

  const [attempt, setAttempt] = useState<TestAttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active question index (0-based)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Student local answers map: snapshotId -> answer string
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Review flags: snapshotId -> boolean
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});

  // Sync status
  const [syncStatus, setSyncStatus] = useState<"SAVED" | "SAVING" | "ERROR">("SAVED");

  // Timer
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Proctored warning counter
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarningBanner, setShowWarningBanner] = useState(false);

  // Timer ref for countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load attempt data
  useEffect(() => {
    async function loadAttempt() {
      try {
        let attemptId = initialAttemptId;

        // If no attempt_id in query, check or start one
        if (!attemptId) {
          const startRes = await api.post<{ attempt_id: string }>(`/student/tests/${testId}/start`);
          attemptId = startRes.attempt_id;
        }

        const data = await api.get<TestAttemptDetail>(`/student/attempts/${attemptId}`);
        setAttempt(data);
        setRemainingSeconds(data.remaining_seconds);

        // Populate initial answers and flags
        const initialAnswers: Record<string, string> = {};
        const initialFlags: Record<string, boolean> = {};

        if (data.saved_answers && typeof data.saved_answers === "object") {
          Object.entries(data.saved_answers).forEach(([snapId, ans]: [string, any]) => {
            if (ans && typeof ans === "object") {
              if (ans.selected_option_key) {
                initialAnswers[snapId] = ans.selected_option_key;
              } else if (ans.answer_text) {
                initialAnswers[snapId] = ans.answer_text;
              }
              if (ans.is_marked_for_review) {
                initialFlags[snapId] = true;
              }
            }
          });
        }

        if (Array.isArray(data.questions)) {
          data.questions.forEach((q) => {
            if (q.current_answer && !initialAnswers[q.snapshot_id]) {
              initialAnswers[q.snapshot_id] = q.current_answer;
            }
            if (q.is_marked_for_review) {
              initialFlags[q.snapshot_id] = true;
            }
          });
        }
        setAnswers(initialAnswers);
        setReviewFlags(initialFlags);
      } catch (err: any) {
        console.error("Error loading exam attempt:", err);
        setError(err?.message || "Failed to load examination workspace.");
      } finally {
        setLoading(false);
      }
    }

    loadAttempt();
  }, [testId, initialAttemptId]);

  // Toggle Fullscreen helper
  const toggleFullscreen = async () => {
    try {
      if (typeof document === "undefined") return;
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle skipped/denied:", err);
    }
  };

  // Countdown Timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remainingSeconds]);

  // Proctored tab switch & visibility change listeners
  useEffect(() => {
    if (!attempt) return;

    const handleVisibilityChange = () => {
      try {
        if (typeof document !== "undefined" && document.hidden) {
          setTabSwitchCount((c) => c + 1);
          setShowWarningBanner(true);
          api.post(`/student/attempts/${attempt.attempt_id}/event`, {
            event_type: "TAB_SWITCH",
            details: { hidden: true, timestamp: new Date().toISOString() },
          }).catch(() => {});
        }
      } catch (err) {
        console.warn("Visibility event error:", err);
      }
    };

    const handleFullscreenChange = () => {
      try {
        if (typeof document !== "undefined" && !document.fullscreenElement) {
          setShowWarningBanner(true);
          api.post(`/student/attempts/${attempt.attempt_id}/event`, {
            event_type: "FULLSCREEN_EXIT",
            details: { fullscreen: false, timestamp: new Date().toISOString() },
          }).catch(() => {});
        }
      } catch (err) {
        console.warn("Fullscreen event error:", err);
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      document.addEventListener("fullscreenchange", handleFullscreenChange);
    }

    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
      }
    };
  }, [attempt]);

  // Autosave function
  const saveAnswerToServer = useCallback(
    async (snapshotId: string, answerText: string, isMarked: boolean) => {
      if (!attempt) return;
      setSyncStatus("SAVING");
      try {
        await api.put(`/student/attempts/${attempt.attempt_id}/answers/${snapshotId}`, {
          answer_text: answerText || null,
          is_marked_for_review: isMarked,
        });
        setSyncStatus("SAVED");
      } catch (err) {
        console.error("Autosave error:", err);
        setSyncStatus("ERROR");
      }
    },
    [attempt]
  );

  // Update answer for current question
  const handleSelectAnswer = (value: string) => {
    if (!currentQuestion) return;
    const snapshotId = currentQuestion.snapshot_id;
    const isMarked = !!reviewFlags[snapshotId];

    setAnswers((prev) => ({ ...prev, [snapshotId]: value }));
    saveAnswerToServer(snapshotId, value, isMarked);
  };

  // Toggle review flag
  const handleToggleReview = () => {
    if (!currentQuestion) return;
    const snapshotId = currentQuestion.snapshot_id;
    const newFlag = !reviewFlags[snapshotId];
    const currentVal = answers[snapshotId] || "";

    setReviewFlags((prev) => ({ ...prev, [snapshotId]: newFlag }));
    saveAnswerToServer(snapshotId, currentVal, newFlag);
  };

  // Clear answer
  const handleClearAnswer = () => {
    if (!currentQuestion) return;
    const snapshotId = currentQuestion.snapshot_id;
    const isMarked = !!reviewFlags[snapshotId];

    setAnswers((prev) => {
      const next = { ...prev };
      delete next[snapshotId];
      return next;
    });
    saveAnswerToServer(snapshotId, "", isMarked);
  };

  // Auto-submit when time runs out
  const handleAutoSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/student/attempts/${attempt.attempt_id}/submit`);
      router.push(`/dashboard/tests/results/${attempt.attempt_id}`);
    } catch (err) {
      console.error("Auto submit failed:", err);
      router.push(`/dashboard/tests/results`);
    }
  };

  // Student manual submit
  const handleConfirmSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/student/attempts/${attempt.attempt_id}/submit`);
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      router.push(`/dashboard/tests/results/${attempt.attempt_id}`);
    } catch (err: any) {
      console.error("Submit failed:", err);
      alert(err?.message || "Failed to submit exam. Please try again.");
      setSubmitting(false);
    }
  };

  // Student quit exam early
  const handleQuitExam = async () => {
    if (!attempt) return;
    try {
      await api.post(`/student/attempts/${attempt.attempt_id}/quit`);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      router.push(`/dashboard/tests`);
    } catch (err) {
      console.error("Quit exam error:", err);
      router.push(`/dashboard/tests`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] flex items-center justify-center p-4">
        <div className="bg-[var(--surface-color)] p-8 rounded-[var(--radius-lg)] border border-[var(--border-color)] text-center space-y-4 max-w-sm">
          <div className="w-10 h-10 border-4 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-[var(--title-color)]">Setting up Examination Workspace...</p>
          <p className="text-xs text-[var(--paragraph-color)]">Synchronizing question bank and secure session</p>
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] flex items-center justify-center p-4">
        <div className="bg-[var(--surface-color)] p-8 rounded-[var(--radius-lg)] border border-[var(--border-color)] text-center space-y-4 max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-base font-bold text-[var(--title-color)]">Examination Error</h2>
          <p className="text-xs text-[var(--paragraph-color)]">{error || "Assessment attempt not found."}</p>
          <button
            onClick={() => router.push("/dashboard/tests")}
            className="px-4 py-2 bg-[#45525b] text-white text-xs font-bold rounded-[var(--radius-md)]"
          >
            Return to Online Tests
          </button>
        </div>
      </div>
    );
  }

  const questions = attempt.questions;
  const currentQuestion: StudentTestQuestion | undefined = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).filter((k) => answers[k] && answers[k].trim().length > 0).length;
  const markedCount = Object.keys(reviewFlags).filter((k) => reviewFlags[k]).length;
  const unansweredCount = totalQuestions - answeredCount;

  // Format Timer
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const isTimeCritical = remainingSeconds <= 300; // < 5 mins
  const isTimeUrgent = remainingSeconds <= 60; // < 1 min

  return (
    <div className="min-h-screen bg-[var(--background-color)] text-[var(--font-color)] flex flex-col select-none">
      {/* Top Floating Proctor Warning Banner */}
      {showWarningBanner && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md z-50 animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              Academic Integrity Warning: Window or fullscreen defocus detected ({tabSwitchCount} time{tabSwitchCount > 1 ? "s" : ""}). This activity is recorded in your session audit logs.
            </span>
          </div>
          <button
            onClick={() => setShowWarningBanner(false)}
            className="text-white/80 hover:text-white p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Examination Top Bar */}
      <header className="h-16 bg-[#45525b] text-white px-4 sm:px-6 flex items-center justify-between border-b border-[#3c474f] shrink-0 sticky top-0 z-40 shadow-sm">
        {/* Left: Test Details */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#82c341] flex items-center justify-center text-[#000000] font-black text-sm">
            Q
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#82c341] uppercase tracking-wider">
                {attempt.subject_code}
              </span>
              <span className="text-[10px] text-[#dce1e4]/70">&bull;</span>
              <span className="text-[10px] text-[#dce1e4] truncate max-w-[140px] sm:max-w-xs">
                {attempt.subject_name}
              </span>
            </div>
            <h1 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[200px] sm:max-w-md">
              {attempt.test_title}
            </h1>
          </div>
        </div>

        {/* Center: Autosave Status */}
        <div className="hidden md:flex items-center gap-2 text-xs text-[#dce1e4]">
          {syncStatus === "SAVED" && (
            <span className="flex items-center gap-1.5 text-[#82c341] text-[11px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Answers Synced</span>
            </span>
          )}
          {syncStatus === "SAVING" && (
            <span className="flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold animate-pulse">
              <Save className="w-3.5 h-3.5" />
              <span>Saving...</span>
            </span>
          )}
          {syncStatus === "ERROR" && (
            <span className="flex items-center gap-1.5 text-red-400 text-[11px] font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Sync Error</span>
            </span>
          )}
        </div>

        {/* Right: Countdown Timer & Submit Action */}
        <div className="flex items-center gap-3">
          {/* Server Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] font-mono font-bold text-xs border ${
              isTimeUrgent
                ? "bg-red-600 text-white border-red-500 animate-pulse"
                : isTimeCritical
                ? "bg-amber-600 text-white border-amber-500"
                : "bg-white/10 text-white border-white/20"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#82c341]" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen Mode"
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-[var(--radius-md)] border border-white/20 transition flex items-center justify-center"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#82c341]" />
          </button>

          {/* Submit Exam Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Submit Exam</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left / Center: Question Panel */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentQuestion ? (
            <div className="max-w-3xl w-full mx-auto space-y-6 flex-1 flex flex-col justify-between">
              {/* Question Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-[var(--radius-sm)] bg-[#45525b] text-white text-xs font-bold font-mono">
                      Question {currentIndex + 1} of {totalQuestions}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#82c341]/20 text-[#325816]">
                      {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? "s" : ""}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--background-color)] text-[var(--title-color)] border border-[var(--border-color)]">
                      {currentQuestion.question_type.replace("_", " ")}
                    </span>
                  </div>

                  <button
                    onClick={handleToggleReview}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border transition flex items-center gap-1.5 ${
                      reviewFlags[currentQuestion.snapshot_id]
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-[var(--surface-color)] text-[var(--paragraph-color)] border-[var(--border-color)] hover:border-amber-400"
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {reviewFlags[currentQuestion.snapshot_id] ? "Marked for Review" : "Mark for Review"}
                    </span>
                  </button>
                </div>

                {/* Question Prompt */}
                <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
                  <p className="text-sm sm:text-base font-semibold text-[var(--title-color)] leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.question_text}
                  </p>
                </div>

                {/* Interactive Answer Input based on type */}
                <div className="space-y-3 pt-2">
                  {/* 1. MCQ */}
                  {currentQuestion.question_type === "MCQ" && (
                    <div className="space-y-2.5">
                      {(currentQuestion.options && currentQuestion.options.length > 0
                        ? currentQuestion.options
                        : ["Option A", "Option B", "Option C", "Option D"]
                      ).map((rawOpt, optIdx) => {
                        const opt = parseOption(rawOpt, optIdx);
                        const isSelected = answers[currentQuestion.snapshot_id] === opt.key;

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectAnswer(opt.key)}
                            className={`p-4 rounded-[var(--radius-md)] border flex items-center gap-3.5 cursor-pointer transition select-none ${
                              isSelected
                                ? "bg-[#82c341]/15 border-[#82c341] shadow-[var(--shadow-sm)]"
                                : "bg-[var(--surface-color)] border-[var(--border-color)] hover:border-[var(--primary-color)] hover:bg-[#dcdcdc]/20"
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border transition shrink-0 ${
                                isSelected
                                  ? "bg-[#82c341] border-[#82c341] text-[#000000]"
                                  : "border-[var(--font-color)] text-[var(--paragraph-color)] bg-[var(--background-color)]"
                              }`}
                            >
                              {opt.key}
                            </div>
                            <span
                              className={`text-xs sm:text-sm font-medium ${
                                isSelected ? "text-[var(--title-color)] font-bold" : "text-[var(--paragraph-color)]"
                              }`}
                            >
                              {opt.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. TRUE_FALSE */}
                  {currentQuestion.question_type === "TRUE_FALSE" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {["TRUE", "FALSE"].map((tfVal) => {
                        const isSelected = answers[currentQuestion.snapshot_id] === tfVal;
                        return (
                          <div
                            key={tfVal}
                            onClick={() => handleSelectAnswer(tfVal)}
                            className={`p-5 rounded-[var(--radius-lg)] border text-center cursor-pointer transition select-none flex flex-col items-center gap-2 ${
                              isSelected
                                ? "bg-[#82c341]/15 border-[#82c341] shadow-[var(--shadow-sm)]"
                                : "bg-[var(--surface-color)] border-[var(--border-color)] hover:border-[var(--primary-color)]"
                            }`}
                          >
                            <span
                              className={`text-base font-extrabold tracking-wider ${
                                isSelected ? "text-[#325816]" : "text-[var(--title-color)]"
                              }`}
                            >
                              {tfVal}
                            </span>
                            <span className="text-[11px] text-[var(--paragraph-color)]">
                              Click to select this answer
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. FILL_BLANK */}
                  {currentQuestion.question_type === "FILL_BLANK" && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[var(--title-color)] uppercase tracking-wider">
                        Enter your answer:
                      </label>
                      <input
                        type="text"
                        value={answers[currentQuestion.snapshot_id] || ""}
                        onChange={(e) => handleSelectAnswer(e.target.value)}
                        placeholder="Type the exact missing term or answer..."
                        className="w-full px-4 py-3 text-sm bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[var(--radius-md)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341] focus:ring-1 focus:ring-[#82c341]"
                      />
                      <p className="text-[11px] text-[var(--paragraph-color)]">
                        Answer will be automatically normalized and evaluated upon submission.
                      </p>
                    </div>
                  )}

                  {/* 4. DESCRIPTIVE */}
                  {currentQuestion.question_type === "DESCRIPTIVE" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-[var(--title-color)] uppercase tracking-wider">
                          Write your descriptive response:
                        </label>
                        <span className="text-[11px] text-[var(--font-color)]">
                          {(answers[currentQuestion.snapshot_id] || "").trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <textarea
                        rows={8}
                        value={answers[currentQuestion.snapshot_id] || ""}
                        onChange={(e) => handleSelectAnswer(e.target.value)}
                        placeholder="Structure your answer clearly with key definitions, explanations, formulas, or diagrams..."
                        className="w-full px-4 py-3 text-xs sm:text-sm bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[var(--radius-md)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341] focus:ring-1 focus:ring-[#82c341] leading-relaxed resize-y"
                      />
                      <p className="text-[11px] text-[var(--paragraph-color)]">
                        Descriptive answers are saved continuously and routed to academic faculty evaluators upon exam conclusion.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Navigation Buttons */}
              <div className="pt-6 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    className="px-3.5 py-2 text-xs font-bold bg-[var(--surface-color)] hover:bg-[#dcdcdc]/40 text-[var(--title-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  {answers[currentQuestion.snapshot_id] && (
                    <button
                      onClick={handleClearAnswer}
                      className="px-3 py-2 text-xs font-semibold text-[var(--paragraph-color)] hover:text-red-600 transition"
                    >
                      Clear Answer
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {currentIndex < totalQuestions - 1 ? (
                    <button
                      onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                      className="px-4 py-2 text-xs font-bold bg-[#45525b] hover:bg-[#3c474f] text-white rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5"
                    >
                      <span>Save & Next</span>
                      <ChevronRight className="w-4 h-4 text-[#82c341]" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="px-4 py-2 text-xs font-black bg-[#82c341] hover:bg-[#72b036] text-[#000000] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5 uppercase"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Review & Submit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">Question not available.</div>
          )}
        </main>

        {/* Right Sidebar: Question Navigation Palette */}
        <aside className="w-full lg:w-80 bg-[var(--surface-color)] border-t lg:border-t-0 lg:border-l border-[var(--border-color)] p-5 flex flex-col justify-between shrink-0 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <h3 className="text-xs font-bold text-[var(--title-color)] uppercase tracking-wider">
                Question Palette
              </h3>
              <span className="text-[11px] text-[var(--font-color)]">
                {answeredCount}/{totalQuestions} Answered
              </span>
            </div>

            {/* Counters Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-2 bg-[var(--background-color)] p-2 rounded">
                <span className="w-3 h-3 rounded-full bg-[#82c341]" />
                <span className="font-semibold text-[var(--paragraph-color)]">Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--background-color)] p-2 rounded">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="font-semibold text-[var(--paragraph-color)]">Review ({markedCount})</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--background-color)] p-2 rounded">
                <span className="w-3 h-3 rounded-full bg-[#dcdcdc] border border-[var(--border-color)]" />
                <span className="font-semibold text-[var(--paragraph-color)]">Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--background-color)] p-2 rounded">
                <span className="w-3 h-3 rounded-full border-2 border-[#000000]" />
                <span className="font-semibold text-[var(--paragraph-color)]">Current</span>
              </div>
            </div>

            {/* Question Buttons Grid */}
            <div className="grid grid-cols-5 gap-2 pt-2 max-h-[300px] overflow-y-auto">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = !!answers[q.snapshot_id] && answers[q.snapshot_id].trim().length > 0;
                const isMarked = !!reviewFlags[q.snapshot_id];

                let btnBg = "bg-[var(--background-color)] text-[var(--title-color)] border-[var(--border-color)]";
                if (isAnswered && isMarked) {
                  btnBg = "bg-purple-600 text-white border-purple-700 font-bold";
                } else if (isAnswered) {
                  btnBg = "bg-[#82c341] text-[#000000] border-[#82c341] font-bold";
                } else if (isMarked) {
                  btnBg = "bg-amber-500 text-white border-amber-600 font-bold";
                }

                return (
                  <button
                    key={q.snapshot_id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-[var(--radius-md)] text-xs font-mono border transition flex items-center justify-center relative ${btnBg} ${
                      isCurrent ? "ring-2 ring-black scale-105 shadow-md z-10" : "hover:opacity-80"
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isMarked && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions: Quit / Submit */}
          <div className="space-y-2 pt-4 border-t border-[var(--border-color)]">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 px-4 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-md transition flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Send className="w-4 h-4" />
              <span>Submit Assessment</span>
            </button>

            <button
              onClick={() => setShowQuitModal(true)}
              className="w-full py-2 text-xs font-semibold text-[var(--paragraph-color)] hover:text-red-600 transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Quit & Abandon Exam</span>
            </button>
          </div>
        </aside>
      </div>

      {/* CONFIRM SUBMISSION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[var(--white-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-[var(--title-color)]">
              <div className="w-10 h-10 rounded-full bg-[#82c341]/20 flex items-center justify-center text-[#325816]">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">Submit Examination?</h3>
                <p className="text-xs text-[var(--paragraph-color)]">Review your status before final submission</p>
              </div>
            </div>

            {/* Submission Status Summary */}
            <div className="grid grid-cols-3 gap-2 bg-[var(--background-color)] p-3 rounded-[var(--radius-md)] text-center text-xs">
              <div>
                <span className="block font-bold text-[#325816] text-base">{answeredCount}</span>
                <span className="text-[10px] text-[var(--paragraph-color)]">Answered</span>
              </div>
              <div>
                <span className="block font-bold text-amber-600 text-base">{markedCount}</span>
                <span className="text-[10px] text-[var(--paragraph-color)]">Review Flag</span>
              </div>
              <div>
                <span className="block font-bold text-red-600 text-base">{unansweredCount}</span>
                <span className="text-[10px] text-[var(--paragraph-color)]">Unanswered</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                You have {unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""}. You cannot edit your answers once submitted.
              </p>
            )}

            <p className="text-xs text-[var(--paragraph-color)]">
              Objective questions will be graded immediately, and your score card with full explanations will be displayed.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-[var(--paragraph-color)] hover:text-[var(--title-color)]"
              >
                Back to Exam
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="px-5 py-2 text-xs font-black bg-[#82c341] hover:bg-[#72b036] text-[#000000] rounded-[var(--radius-md)] shadow-sm uppercase tracking-wider"
              >
                {submitting ? "Grading..." : "Yes, Submit Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM QUIT MODAL */}
      {showQuitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[var(--white-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">Quit Examination?</h3>
                <p className="text-xs text-[var(--paragraph-color)]">Are you sure you want to abandon this exam session?</p>
              </div>
            </div>

            <p className="text-xs text-[var(--paragraph-color)] leading-relaxed">
              If you quit now, your current answers will be discarded and this attempt will be closed as cancelled.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowQuitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[var(--paragraph-color)] hover:text-[var(--title-color)]"
              >
                Continue Exam
              </button>
              <button
                type="button"
                onClick={handleQuitExam}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-[var(--radius-md)] shadow-sm"
              >
                Quit & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
