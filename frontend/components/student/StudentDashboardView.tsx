"use client";

import React, { useState } from "react";
import Link from "next/link";
import { StudentDashboardData, StudentClassSummary } from "@/lib/types";
import { PracticeTestModal } from "./PracticeTestModal";
import {
  GraduationCap,
  BookOpen,
  CheckSquare,
  Award,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
} from "lucide-react";

interface StudentDashboardViewProps {
  data: StudentDashboardData;
  userName: string;
}

const CLASS_PALETTES = [
  { headerBg: "bg-[#45525b]", accent: "#82c341", textColor: "text-white" },
  { headerBg: "bg-[#2d4654]", accent: "#9cd655", textColor: "text-white" },
  { headerBg: "bg-[#3e5667]", accent: "#82c341", textColor: "text-white" },
  { headerBg: "bg-[#4f6758]", accent: "#a3dc62", textColor: "text-white" },
];

export function StudentDashboardView({ data, userName }: StudentDashboardViewProps) {
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  const { enrolled_classes, upcoming_tests, recent_results, published_papers, overall_syllabus_percent } = data;

  const handleOpenPracticeForSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setPracticeModalOpen(true);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Google Classroom Style Hero Banner */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[#45525b] text-white p-6 sm:p-8 shadow-[var(--shadow-md)] border border-[#3c474f]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-full)] bg-[#82c341]/20 border border-[#82c341]/40 text-[#82c341] text-xs font-semibold">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Academic Hub &bull; Semester 4</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {userName}!
            </h1>
            <p className="text-xs sm:text-sm text-[#dce1e4] leading-relaxed">
              Track course syllabi, prepare with verified university question papers, and take practice assessments.
            </p>

            {/* Quick syllabus completion meter */}
            <div className="pt-2 flex items-center gap-3">
              <div className="w-48 bg-white/20 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#82c341] h-full rounded-full transition-all duration-500"
                  style={{ width: `${overall_syllabus_percent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-[#82c341]">
                {overall_syllabus_percent}% Syllabus Completed
              </span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
            <button
              onClick={() => {
                setSelectedSubjectId("");
                setPracticeModalOpen(true);
              }}
              className="px-4 py-2.5 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-md transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>New Practice Test</span>
            </button>
            <Link
              href="/dashboard/tests"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-[var(--radius-md)] border border-white/20 transition flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4 text-[#82c341]" />
              <span>View Online Tests</span>
            </Link>
          </div>
        </div>

        {/* Decorative background geometry */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-[#82c341]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Enrolled Classes ("Google Classroom" style Grid) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[#82c341]/20 flex items-center justify-center text-[#45525b]">
              <GraduationCap className="w-4 h-4 text-[#45525b]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--title-color)]">My Enrolled Classes</h2>
              <p className="text-xs text-[var(--paragraph-color)]">Courses and academic subjects for your active semester</p>
            </div>
          </div>
          <Link
            href="/dashboard/classes"
            className="text-xs font-bold text-[var(--secondary-color)] hover:text-[#82c341] flex items-center gap-1 transition"
          >
            <span>View All ({enrolled_classes.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {enrolled_classes.length === 0 ? (
          <div className="bg-[var(--surface-color)] p-8 rounded-[var(--radius-lg)] border border-[var(--border-color)] text-center text-xs text-[var(--paragraph-color)]">
            No active class enrollments found. Please contact your department coordinator.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolled_classes.map((cls, idx) => {
              const theme = CLASS_PALETTES[idx % CLASS_PALETTES.length];
              return (
                <div
                  key={cls.subject_id}
                  className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition flex flex-col group"
                >
                  {/* Google Classroom Banner */}
                  <div className={`${theme.headerBg} p-5 ${theme.textColor} relative`}>
                    <div className="flex items-start justify-between">
                      <div className="truncate pr-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20 uppercase tracking-wider mb-1.5">
                          {cls.subject_code}
                        </span>
                        <h3 className="text-base font-bold truncate leading-tight group-hover:underline">
                          <Link href={`/dashboard/classes/${cls.subject_id}`}>
                            {cls.subject_name}
                          </Link>
                        </h3>
                        <p className="text-xs text-[#dce1e4] mt-1 truncate">
                          {cls.teacher_name}
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                        <BookOpen className="w-4 h-4 text-[#82c341]" />
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {/* Syllabus progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-[var(--paragraph-color)]">Syllabus Progress</span>
                        <span className="font-bold text-[var(--title-color)]">{cls.progress_percent}%</span>
                      </div>
                      <div className="w-full bg-[var(--background-color)] h-2 rounded-full overflow-hidden border border-[var(--border-color)]">
                        <div
                          className="bg-[#82c341] h-full rounded-full transition-all duration-300"
                          style={{ width: `${cls.progress_percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[var(--font-color)] mt-1.5">
                        <span>{cls.completed_topics_count} of {cls.topics_count} topics</span>
                        <span>{cls.units_count} Units</span>
                      </div>
                    </div>

                    {/* Resources Counters */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-color)] text-xs">
                      <div className="bg-[var(--background-color)] p-2 rounded-[var(--radius-sm)] text-center">
                        <p className="text-[10px] font-bold text-[var(--font-color)] uppercase">Online Tests</p>
                        <p className="font-bold text-[var(--title-color)] mt-0.5">{cls.available_tests_count}</p>
                      </div>
                      <div className="bg-[var(--background-color)] p-2 rounded-[var(--radius-sm)] text-center">
                        <p className="text-[10px] font-bold text-[var(--font-color)] uppercase">Past Papers</p>
                        <p className="font-bold text-[var(--title-color)] mt-0.5">{cls.published_papers_count}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="px-5 py-3 bg-[var(--background-color)] border-t border-[var(--border-color)] flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/syllabus?subject=${cls.subject_id}`}
                        className="text-[var(--paragraph-color)] hover:text-[var(--title-color)] transition flex items-center gap-1"
                        title="View Syllabus"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Syllabus</span>
                      </Link>
                      <Link
                        href={`/dashboard/classes/${cls.subject_id}?tab=papers`}
                        className="text-[var(--paragraph-color)] hover:text-[var(--title-color)] transition flex items-center gap-1"
                        title="View Question Papers"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Papers</span>
                      </Link>
                    </div>

                    <button
                      onClick={() => handleOpenPracticeForSubject(cls.subject_id)}
                      className="text-[#325816] hover:text-[#000000] font-bold flex items-center gap-1 bg-[#82c341]/20 hover:bg-[#82c341] px-2.5 py-1 rounded transition"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Practice</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Online Tests & Upcoming Assessments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Available Tests */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[var(--secondary-color)]" />
              <h2 className="text-sm font-bold text-[var(--title-color)]">Available Online Tests</h2>
            </div>
            <Link
              href="/dashboard/tests"
              className="text-xs font-bold text-[var(--secondary-color)] hover:text-[#82c341] transition flex items-center gap-1"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcoming_tests.length === 0 ? (
            <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] text-center text-xs text-[var(--paragraph-color)] space-y-3">
              <p>No formal tests scheduled right now.</p>
              <button
                onClick={() => setPracticeModalOpen(true)}
                className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] inline-flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Practice Quiz</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming_tests.slice(0, 3).map((test) => (
                <div
                  key={test.id}
                  className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-md)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--primary-color)] transition shadow-[var(--shadow-sm)]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          test.is_practice
                            ? "bg-purple-100 text-purple-800"
                            : "bg-[#82c341]/20 text-[#325816]"
                        }`}
                      >
                        {test.test_type.replace("_", " ")}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--font-color)]">
                        {test.subject_code}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[var(--title-color)]">
                      {test.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-[var(--paragraph-color)]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[var(--font-color)]" />
                        {test.duration_minutes} Mins
                      </span>
                      <span>&bull;</span>
                      <span>{test.total_marks} Marks</span>
                      <span>&bull;</span>
                      <span>{test.questions_count} Questions</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/dashboard/tests/${test.id}`}
                      className="px-4 py-2 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] transition flex items-center gap-1.5 shadow-[var(--shadow-sm)]"
                    >
                      <Play className="w-3.5 h-3.5 text-[#82c341]" />
                      <span>{test.attempts_count > 0 ? "Re-take Exam" : "Start Exam"}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Published Papers Section */}
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--secondary-color)]" />
                <h2 className="text-sm font-bold text-[var(--title-color)]">Published Examination Papers</h2>
              </div>
              <Link
                href="/question-papers"
                className="text-xs font-bold text-[var(--secondary-color)] hover:text-[#82c341] transition flex items-center gap-1"
              >
                <span>View Library</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {published_papers.length === 0 ? (
              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-xs text-[var(--paragraph-color)] text-center">
                No published question papers released yet for this semester.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {published_papers.slice(0, 4).map((paper) => (
                  <Link
                    key={paper.id}
                    href={`/question-papers/${paper.id}`}
                    className="p-3.5 bg-[var(--surface-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] hover:border-[var(--primary-color)] transition group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[#82c341]/10 flex items-center justify-center shrink-0 group-hover:bg-[#82c341] transition">
                      <FileText className="w-4 h-4 text-[#45525b] group-hover:text-black transition" />
                    </div>
                    <div className="truncate flex-1">
                      <p className="text-xs font-bold text-[var(--title-color)] truncate group-hover:text-[#325816]">
                        {paper.title}
                      </p>
                      <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5 truncate">
                        {paper.exam_name} &bull; {paper.total_marks} Marks
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Recent Results & Quick Links */}
        <div className="space-y-6">
          {/* Recent Test Results */}
          <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[var(--secondary-color)]" />
                <h3 className="text-xs font-bold text-[var(--title-color)] uppercase tracking-wider">
                  Recent Results
                </h3>
              </div>
              <Link
                href="/dashboard/tests/results"
                className="text-[11px] font-semibold text-[var(--secondary-color)] hover:text-[#82c341]"
              >
                All Results
              </Link>
            </div>

            {recent_results.length === 0 ? (
              <div className="text-center py-6 text-xs text-[var(--paragraph-color)] space-y-2">
                <p>No tests submitted yet.</p>
                <button
                  onClick={() => setPracticeModalOpen(true)}
                  className="text-xs font-bold text-[#325816] hover:underline"
                >
                  Take your first practice quiz &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_results.slice(0, 4).map((res) => (
                  <Link
                    key={res.attempt_id}
                    href={`/dashboard/tests/results/${res.attempt_id}`}
                    className="block p-3 rounded-[var(--radius-md)] bg-[var(--background-color)] hover:bg-[#dcdcdc]/40 border border-[var(--border-color)] transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--title-color)] truncate max-w-[160px]">
                        {res.test_title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          res.is_passed
                            ? "bg-[#82c341]/20 text-[#325816]"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {res.percentage}% {res.is_passed ? "PASS" : "FAIL"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--paragraph-color)] mt-1.5">
                      <span>{res.subject_code}</span>
                      <span>
                        {res.obtained_marks} / {res.total_marks} Marks
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Learning Tips & Rules */}
          <div className="bg-[#45525b] text-white p-5 rounded-[var(--radius-lg)] space-y-3 border border-[#3c474f]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#82c341] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Exam Integrity Guide</span>
            </h4>
            <p className="text-xs text-[#dce1e4] leading-relaxed">
              Official university tests run in locked fullscreen mode. Switching tabs or exiting fullscreen is recorded in your session audit logs.
            </p>
            <div className="pt-1">
              <Link
                href="/dashboard/syllabus"
                className="text-xs font-bold text-[#82c341] hover:underline flex items-center gap-1"
              >
                <span>Track your topic completion</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Practice Test Modal */}
      <PracticeTestModal
        isOpen={practiceModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        classes={enrolled_classes}
        defaultSubjectId={selectedSubjectId}
      />
    </div>
  );
}
