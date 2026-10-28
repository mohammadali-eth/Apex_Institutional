"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { OnlineTestDetail } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  Play,
  ArrowLeft,
  CheckSquare,
  HelpCircle,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";

export default function StudentTestInstructionsPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [test, setTest] = useState<OnlineTestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testId) return;

    api
      .get<OnlineTestDetail>(`/student/tests/${testId}`)
      .then((data) => setTest(data))
      .catch((err) => {
        console.error("Error loading test instructions:", err);
        setError("Unable to load test instructions. Test may not exist or has expired.");
      })
      .finally(() => setLoading(false));
  }, [testId]);

  const handleStartExam = async () => {
    if (!agreed) return;

    setStarting(true);
    setError(null);

    try {
      // 1. Request Fullscreen asynchronously without blocking navigation
      if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((fsErr) => {
          console.warn("Fullscreen permission skipped/denied:", fsErr);
        });
      }

      // 2. Start attempt in backend
      const res = await api.post<{
        attempt_id: string;
        status: string;
        message: string;
      }>(`/student/tests/${testId}/start`);

      // 3. Route to exam workspace
      router.push(`/dashboard/tests/${testId}/attempt?attempt_id=${res.attempt_id}`);
    } catch (err: any) {
      console.error("Failed to start exam:", err);
      setError(err?.message || "Failed to start exam. Please try again.");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-44 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
        <div className="h-64 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="max-w-2xl mx-auto bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-base font-bold text-[var(--title-color)]">Exam Unavailable</h2>
        <p className="text-xs text-[var(--paragraph-color)]">
          {error || "The requested assessment is not accessible."}
        </p>
        <Link href="/dashboard/tests" className="btn-secondary text-xs inline-flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Tests</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top back link */}
      <div>
        <Link
          href="/dashboard/tests"
          className="text-xs font-semibold text-[var(--paragraph-color)] hover:text-[var(--title-color)] flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tests List</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-[#45525b] text-white p-6 sm:p-8 rounded-[var(--radius-lg)] border border-[#3c474f] shadow-[var(--shadow-md)] space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#82c341] text-[#000000] uppercase tracking-wider">
            {test.subject_code}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
              test.is_practice ? "bg-purple-200 text-purple-900" : "bg-white/20 text-white"
            }`}
          >
            {test.test_type.replace("_", " ")}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {test.title}
          </h1>
          <p className="text-xs text-[#dce1e4] mt-1">
            Course: <strong className="text-white">{test.subject_name}</strong>
          </p>
        </div>

        {/* Exam Quick Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="bg-white/10 p-3 rounded-[var(--radius-md)] text-center">
            <p className="text-[10px] font-bold text-[#82c341] uppercase">Duration</p>
            <p className="text-base font-extrabold text-white mt-0.5">{test.duration_minutes} Mins</p>
          </div>
          <div className="bg-white/10 p-3 rounded-[var(--radius-md)] text-center">
            <p className="text-[10px] font-bold text-[#82c341] uppercase">Total Marks</p>
            <p className="text-base font-extrabold text-white mt-0.5">{test.total_marks}</p>
          </div>
          <div className="bg-white/10 p-3 rounded-[var(--radius-md)] text-center">
            <p className="text-[10px] font-bold text-[#82c341] uppercase">Questions</p>
            <p className="text-base font-extrabold text-white mt-0.5">{test.questions_count}</p>
          </div>
          <div className="bg-white/10 p-3 rounded-[var(--radius-md)] text-center">
            <p className="text-[10px] font-bold text-[#82c341] uppercase">Passing Mark</p>
            <p className="text-base font-extrabold text-white mt-0.5">{test.passing_percentage}%</p>
          </div>
        </div>
      </div>

      {/* Rules & Guidelines */}
      <div className="bg-[var(--surface-color)] p-6 sm:p-8 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-color)]">
          <ShieldCheck className="w-5 h-5 text-[#82c341]" />
          <h2 className="text-base font-bold text-[var(--title-color)]">
            Online Examination Instructions & Honor Code
          </h2>
        </div>

        <ul className="space-y-3.5 text-xs text-[var(--paragraph-color)] leading-relaxed">
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#82c341]/20 text-[#325816] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              1
            </span>
            <span>
              <strong className="text-[var(--title-color)]">Continuous Server Countdown:</strong> The examination timer begins immediately upon clicking the button below. Even if you refresh or lose connectivity, the timer runs continuously on the server and will auto-submit upon reaching 00:00.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#82c341]/20 text-[#325816] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              2
            </span>
            <span>
              <strong className="text-[var(--title-color)]">Proctored Window Monitoring:</strong> Leaving the examination screen, switching tabs, minimizing the browser, or exiting fullscreen is monitored. Each incident is recorded in your session audit logs.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#82c341]/20 text-[#325816] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              3
            </span>
            <span>
              <strong className="text-[var(--title-color)]">Real-Time Cloud Autosave:</strong> Every question response is automatically synchronized to the database as soon as you select an option or finish typing.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#82c341]/20 text-[#325816] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              4
            </span>
            <span>
              <strong className="text-[var(--title-color)]">Question Navigation Palette:</strong> You can move freely between questions, mark questions for review, change selected answers, or clear responses before submitting.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#82c341]/20 text-[#325816] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              5
            </span>
            <span>
              <strong className="text-[var(--title-color)]">Objective & Descriptive Questions:</strong> Multiple Choice, True/False, and Fill-in-the-Blank answers are graded automatically upon submission. Descriptive answers are submitted for faculty review.
            </span>
          </li>
        </ul>

        {test.rules && (
          <div className="bg-[#f6f6f7] p-4 rounded-[var(--radius-md)] border border-[var(--border-color)] text-xs text-[var(--paragraph-color)] space-y-1">
            <strong className="text-[var(--title-color)]">Special Course Instructions:</strong>
            <p>{test.rules}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-[var(--radius-md)] text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Academic Integrity Checkbox */}
        <div className="p-4 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-[#82c341] rounded border-[var(--border-color)] focus:ring-[#82c341]"
            />
            <span className="text-xs text-[var(--title-color)] font-medium leading-relaxed">
              I certify that I am the registered student enrolled in this course. I will take this examination independently without unauthorized assistance, external notes, browser extensions, or search engines.
            </span>
          </label>
        </div>

        {/* Start Button */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/dashboard/tests"
            className="text-xs font-semibold text-[var(--paragraph-color)] hover:text-[var(--title-color)]"
          >
            Cancel & Return
          </Link>

          <button
            onClick={handleStartExam}
            disabled={!agreed || starting}
            className="px-6 py-3 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-md transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>{starting ? "Initializing Assessment..." : "Enter Fullscreen & Begin Exam"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
