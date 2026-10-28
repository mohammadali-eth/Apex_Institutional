"use client";

import React from "react";
import Link from "next/link";
import { FacultyDashboardStats } from "@/lib/types";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import {
  BookOpen,
  HelpCircle,
  FileText,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronRight,
  Calendar,
  MessageSquare,
  TrendingUp,
  Award,
  Plus
} from "lucide-react";

interface FacultyDashboardViewProps {
  stats: FacultyDashboardStats;
}

export function FacultyDashboardView({ stats }: FacultyDashboardViewProps) {
  const approvalRate = stats.total_questions_created > 0
    ? Math.round((stats.approved_questions_count / stats.total_questions_created) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-gradient-to-r from-[var(--secondary-color)] to-[#2c363d] p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-sm mb-2 text-[#82c341]">
              <Award className="w-3.5 h-3.5" />
              <span>Faculty Member / Academic Instructor</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome, {stats.faculty_name}
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              {stats.department_name || "Academic Department"} • {stats.assigned_subjects_count} Assigned Course Subject{stats.assigned_subjects_count !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/faculty/questions"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[#82c341] text-black font-semibold text-xs hover:bg-[#72b035] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Question</span>
            </Link>
            <Link
              href="/dashboard/faculty/paper-generator"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-white/15 text-white font-semibold text-xs hover:bg-white/25 transition-colors backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4 text-[#82c341]" />
              <span>Build Exam Paper</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assigned Subjects */}
        <Link
          href="/dashboard/faculty/subjects"
          className="group p-5 rounded-[var(--radius-lg)] bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-[#82c341] shadow-[var(--shadow-sm)] hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--paragraph-color)] uppercase tracking-wider">
              Assigned Subjects
            </span>
            <div className="p-2.5 rounded-lg bg-[#82c341]/10 text-[#82c341] group-hover:bg-[#82c341] group-hover:text-black transition-colors">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--title-color)]">
            {stats.assigned_subjects_count}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-[var(--paragraph-color)]">
            <span>Curriculum active</span>
            <span className="text-[#82c341] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              View syllabus <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

        {/* Card 2: Questions Created */}
        <Link
          href="/dashboard/faculty/questions"
          className="group p-5 rounded-[var(--radius-lg)] bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-[#82c341] shadow-[var(--shadow-sm)] hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--paragraph-color)] uppercase tracking-wider">
              Authored Questions
            </span>
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--title-color)]">
            {stats.total_questions_created}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-emerald-600 font-medium">{stats.approved_questions_count} Approved</span>
            <span className="text-amber-600 font-medium">{stats.pending_review_questions_count} In Review</span>
            <span className="text-gray-500">{stats.draft_questions_count} Drafts</span>
          </div>
        </Link>

        {/* Card 3: Question Papers */}
        <Link
          href="/dashboard/faculty/papers"
          className="group p-5 rounded-[var(--radius-lg)] bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-[#82c341] shadow-[var(--shadow-sm)] hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--paragraph-color)] uppercase tracking-wider">
              Exam Papers
            </span>
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--title-color)]">
            {stats.draft_papers_count + stats.pending_review_papers_count + stats.approved_papers_count}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-emerald-600 font-medium">{stats.approved_papers_count} Approved</span>
            <span className="text-amber-600 font-medium">{stats.pending_review_papers_count} In Review</span>
            <span className="text-gray-500">{stats.draft_papers_count} Drafts</span>
          </div>
        </Link>

        {/* Card 4: Upcoming Exams / Deadlines */}
        <Link
          href="/dashboard/faculty/schedule"
          className="group p-5 rounded-[var(--radius-lg)] bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-[#82c341] shadow-[var(--shadow-sm)] hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--paragraph-color)] uppercase tracking-wider">
              Exam Deadlines
            </span>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--title-color)]">
            {stats.upcoming_deadlines_count}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-[var(--paragraph-color)]">
            <span>Approval Rate: <strong className="text-[var(--title-color)]">{approvalRate}%</strong></span>
            <span className="text-[#82c341] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Schedule <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>
      </div>

      {/* Quick Access Action Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/dashboard/faculty/questions"
          className="p-3.5 rounded-[var(--radius-md)] bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-[#82c341] flex items-center gap-3 transition-colors shadow-sm"
        >
          <div className="w-9 h-9 rounded-lg bg-[#82c341]/15 text-[#82c341] flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--title-color)]">My Questions</div>
            <div className="text-[11px] text-[var(--paragraph-color)]">Manage drafts & items</div>
          </div>
        </Link>

        <Link
          href="/dashboard/faculty/question-bank"
          className="p-3.5 rounded-[var(--radius-md)] bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-[#82c341] flex items-center gap-3 transition-colors shadow-sm"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--title-color)]">Question Bank</div>
            <div className="text-[11px] text-[var(--paragraph-color)]">Browse approved pool</div>
          </div>
        </Link>

        <Link
          href="/dashboard/faculty/paper-generator"
          className="p-3.5 rounded-[var(--radius-md)] bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-[#82c341] flex items-center gap-3 transition-colors shadow-sm"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--title-color)]">Paper Generator</div>
            <div className="text-[11px] text-[var(--paragraph-color)]">Manual & Auto builder</div>
          </div>
        </Link>

        <Link
          href="/dashboard/faculty/feedback"
          className="p-3.5 rounded-[var(--radius-md)] bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-[#82c341] flex items-center gap-3 transition-colors shadow-sm"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--title-color)]">Review Feedback</div>
            <div className="text-[11px] text-[var(--paragraph-color)]">Moderation comments</div>
          </div>
        </Link>
      </div>

      {/* Two Column Layout: Feedback & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Reviewer Feedback */}
        <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-5 shadow-[var(--shadow-sm)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#82c341]" />
                <h2 className="text-sm font-bold text-[var(--title-color)]">
                  Recent Moderation Feedback
                </h2>
              </div>
              <Link
                href="/dashboard/faculty/feedback"
                className="text-xs text-[#82c341] hover:underline font-semibold flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {stats.recent_feedback.length === 0 ? (
              <div className="text-center py-10 text-[var(--paragraph-color)] text-xs">
                <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No moderation feedback or pending revision requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent_feedback.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)]/30 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-200 text-gray-700">
                          {item.entity_type}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                      <span className="text-[11px] text-[var(--paragraph-color)]">
                        {item.reviewer_name || "Academic Reviewer"}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[var(--title-color)] line-clamp-1">
                      {item.title}
                    </h4>

                    {item.feedback_comments && (
                      <p className="text-xs text-[var(--paragraph-color)] mt-1.5 italic bg-white/70 p-2 rounded border border-gray-100 line-clamp-2">
                        "{item.feedback_comments}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--border-color)] mt-4">
            <Link
              href="/dashboard/faculty/questions"
              className="text-xs text-[var(--paragraph-color)] hover:text-[#82c341] flex items-center justify-between"
            >
              <span>Have revisions to fix?</span>
              <span className="font-semibold text-[#82c341] flex items-center gap-1">
                Open My Questions <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>

        {/* Right Column: Upcoming Exam Schedules & Activity */}
        <div className="space-y-6">
          {/* Upcoming Exams Card */}
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#82c341]" />
                <h2 className="text-sm font-bold text-[var(--title-color)]">
                  Upcoming Subject Assessments
                </h2>
              </div>
              <Link
                href="/dashboard/faculty/schedule"
                className="text-xs text-[#82c341] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Full schedule</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {stats.upcoming_exams.length === 0 ? (
              <div className="text-center py-6 text-[var(--paragraph-color)] text-xs">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No exams currently scheduled for your subjects.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.upcoming_exams.slice(0, 3).map((exam) => (
                  <div
                    key={exam.id}
                    className="p-3 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)]/30 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          {exam.subject_code}
                        </span>
                        <h4 className="text-xs font-bold text-[var(--title-color)] line-clamp-1">
                          {exam.title}
                        </h4>
                      </div>
                      <div className="text-[11px] text-[var(--paragraph-color)] mt-0.5">
                        {exam.duration_minutes} mins • {exam.total_marks} Marks • Passing: {exam.passing_marks}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      exam.is_published ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                    }`}>
                      {exam.is_published ? "Active" : "Draft"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Card */}
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#82c341]" />
                <h2 className="text-sm font-bold text-[var(--title-color)]">
                  My Recent Activity
                </h2>
              </div>
            </div>

            {stats.recent_activity.length === 0 ? (
              <div className="text-center py-4 text-[var(--paragraph-color)] text-xs">
                No recent actions recorded.
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recent_activity.slice(0, 4).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#82c341]" />
                      <span className="font-medium text-[var(--title-color)]">
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-[var(--paragraph-color)] font-mono">
                        ({log.entity_type})
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--paragraph-color)]">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
