"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { TestResultSummary } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  HelpCircle,
  CheckSquare,
  Search,
  Sparkles,
} from "lucide-react";

export default function StudentResultsPage() {
  const [results, setResults] = useState<TestResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<TestResultSummary[]>("/student/results")
      .then((data) => setResults(data || []))
      .catch((err) => console.error("Error loading test results:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredResults = results.filter((res) => {
    const q = search.toLowerCase();
    return (
      res.test_title.toLowerCase().includes(q) ||
      res.subject_name.toLowerCase().includes(q) ||
      res.subject_code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Results & Performance Reports"
        subtitle="Review scores, question-by-question answer keys, and academic explanations for your completed tests."
        actions={
          <Link
            href="/dashboard/tests"
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Take Another Test</span>
          </Link>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-3 bg-[var(--surface-color)] p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
        <Search className="w-4 h-4 text-[var(--font-color)] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter results by test title, subject code, or course name..."
          className="bg-transparent text-xs w-full text-[var(--title-color)] placeholder:text-[var(--font-color)] focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-[var(--paragraph-color)] hover:text-[var(--title-color)] px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse"
            />
          ))}
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
          <Award className="w-10 h-10 text-[var(--font-color)] mx-auto opacity-50" />
          <p className="text-sm font-bold text-[var(--title-color)]">No Test Submissions Found</p>
          <p className="text-xs text-[var(--paragraph-color)]">
            {search ? "No test results matched your filter query." : "You have not completed any online examinations or practice quizzes yet."}
          </p>
          <Link
            href="/dashboard/tests"
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explore Online Tests</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResults.map((res) => {
            const timeTakenMins = res.time_taken_seconds ? Math.round(res.time_taken_seconds / 60) : 0;

            return (
              <div
                key={res.attempt_id}
                className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[var(--primary-color)] transition shadow-[var(--shadow-sm)] flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left Information */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        res.is_passed ? "bg-[#82c341]/20 text-[#325816]" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {res.percentage}% &bull; {res.is_passed ? "PASSED" : "FAILED"}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[var(--font-color)]">
                      {res.subject_code} &bull; {res.subject_name}
                    </span>
                    <span className="text-[10px] text-[var(--font-color)]">
                      {new Date(res.started_at).toLocaleDateString()} at{" "}
                      {new Date(res.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--title-color)]">
                    {res.test_title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--paragraph-color)]">
                    <span>
                      Score: <strong className="text-[var(--title-color)]">{res.obtained_marks}</strong> / {res.total_marks} Marks
                    </span>
                    <span>&bull;</span>
                    <span>
                      {res.correct_count} of {res.total_questions} Objective Correct
                    </span>
                    {res.pending_eval_count > 0 && (
                      <>
                        <span>&bull;</span>
                        <span className="text-amber-700 font-semibold">
                          {res.pending_eval_count} Descriptive Pending Faculty Evaluation
                        </span>
                      </>
                    )}
                    {timeTakenMins > 0 && (
                      <>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeTakenMins} min{timeTakenMins > 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Action */}
                <div className="shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border-color)]">
                  <Link
                    href={`/dashboard/tests/results/${res.attempt_id}`}
                    className="px-4 py-2 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5"
                  >
                    <span>Review Solutions</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#82c341]" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
