"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { OnlineTestSummary, StudentClassSummary } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { PracticeTestModal } from "@/components/student/PracticeTestModal";
import {
  CheckSquare,
  Clock,
  Sparkles,
  Award,
  Play,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function StudentTestsPage() {
  const [tests, setTests] = useState<OnlineTestSummary[]>([]);
  const [classes, setClasses] = useState<StudentClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"ALL" | "OFFICIAL" | "PRACTICE">("ALL");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<OnlineTestSummary[]>("/student/tests"),
      api.get<StudentClassSummary[]>("/student/classes"),
    ])
      .then(([tsts, clss]) => {
        setTests(tsts || []);
        setClasses(clss || []);
      })
      .catch((err) => console.error("Error loading tests:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredTests = tests.filter((test) => {
    // Subject filter
    if (selectedSubjectId !== "ALL" && test.subject_id !== selectedSubjectId) {
      return false;
    }
    // Type filter
    if (filterType === "OFFICIAL" && test.is_practice) return false;
    if (filterType === "PRACTICE" && !test.is_practice) return false;
    // Search
    if (search) {
      const q = search.toLowerCase();
      return (
        test.title.toLowerCase().includes(q) ||
        test.subject_name.toLowerCase().includes(q) ||
        test.subject_code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Online Tests & Examinations"
        subtitle="Attempt official university assessments and generate instant practice quizzes from the question bank."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/tests/results"
              className="px-3.5 py-2 bg-[var(--surface-color)] hover:bg-[#dcdcdc]/60 text-[var(--title-color)] text-xs font-bold rounded-[var(--radius-md)] border border-[var(--border-color)] transition flex items-center gap-1.5"
            >
              <Award className="w-4 h-4 text-[var(--secondary-color)]" />
              <span>Past Results</span>
            </Link>
            <button
              onClick={() => setPracticeModalOpen(true)}
              className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Practice Test</span>
            </button>
          </div>
        }
      />

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface-color)] p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
        {/* Type tabs */}
        <div className="flex items-center gap-1 bg-[var(--background-color)] p-1 rounded-[var(--radius-md)] border border-[var(--border-color)]">
          {[
            { id: "ALL", label: "All Tests" },
            { id: "OFFICIAL", label: "Official Exams" },
            { id: "PRACTICE", label: "Practice Quizzes" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-[var(--radius-sm)] transition ${
                filterType === tab.id
                  ? "bg-[#45525b] text-white shadow-sm"
                  : "text-[var(--paragraph-color)] hover:text-[var(--title-color)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Subject selector + Search */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[var(--primary-color)]"
          >
            <option value="ALL">All Subjects</option>
            {classes.map((c) => (
              <option key={c.subject_id} value={c.subject_id}>
                {c.subject_code} - {c.subject_name}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[var(--font-color)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tests..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[var(--primary-color)]"
            />
          </div>
        </div>
      </div>

      {/* Tests Grid */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse"
            />
          ))}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
          <CheckSquare className="w-10 h-10 text-[var(--font-color)] mx-auto opacity-50" />
          <p className="text-sm font-bold text-[var(--title-color)]">No Tests Found</p>
          <p className="text-xs text-[var(--paragraph-color)]">
            {search || selectedSubjectId !== "ALL" || filterType !== "ALL"
              ? "No tests matched the selected filters."
              : "No tests are currently assigned to your semester."}
          </p>
          <button
            onClick={() => setPracticeModalOpen(true)}
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create AI Practice Test</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTests.map((test) => {
            const hasAttempts = test.attempts_count > 0;
            const isInProgress = test.latest_status === "IN_PROGRESS";

            return (
              <div
                key={test.id}
                className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[var(--primary-color)] transition shadow-[var(--shadow-sm)] flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left test info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        test.is_practice
                          ? "bg-purple-100 text-purple-800"
                          : "bg-[#82c341]/20 text-[#325816]"
                      }`}
                    >
                      {test.test_type.replace("_", " ")}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[var(--font-color)]">
                      {test.subject_code} &bull; {test.subject_name}
                    </span>
                    {hasAttempts && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--background-color)] text-[var(--paragraph-color)] font-semibold">
                        {test.attempts_count} attempt{test.attempts_count > 1 ? "s" : ""} &bull; Best: {test.best_score || 0}/{test.total_marks}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[var(--title-color)]">
                    {test.title}
                  </h3>

                  {test.description && (
                    <p className="text-xs text-[var(--paragraph-color)] line-clamp-2">
                      {test.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--paragraph-color)] pt-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[var(--font-color)]" />
                      {test.duration_minutes} Minutes
                    </span>
                    <span>&bull;</span>
                    <span>{test.total_marks} Total Marks</span>
                    <span>&bull;</span>
                    <span>{test.questions_count} Questions</span>
                    <span>&bull;</span>
                    <span>Pass: {test.passing_percentage}%</span>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border-color)]">
                  {hasAttempts && test.latest_attempt_id && (
                    <Link
                      href={`/dashboard/tests/results/${test.latest_attempt_id}`}
                      className="px-3.5 py-2 bg-[var(--background-color)] hover:bg-[#dcdcdc]/60 text-[var(--title-color)] text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] transition flex items-center gap-1"
                    >
                      <span>Past Solution</span>
                    </Link>
                  )}

                  {isInProgress && test.latest_attempt_id ? (
                    <Link
                      href={`/dashboard/tests/${test.id}/attempt?attempt_id=${test.latest_attempt_id}`}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5 animate-pulse"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Resume In-Progress</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/tests/${test.id}`}
                      className="px-4 py-2 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 text-[#82c341]" />
                      <span>{hasAttempts ? "Re-take Exam" : "Start Exam"}</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Practice Test Generator Modal */}
      <PracticeTestModal
        isOpen={practiceModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        classes={classes}
        defaultSubjectId={selectedSubjectId !== "ALL" ? selectedSubjectId : undefined}
      />
    </div>
  );
}
