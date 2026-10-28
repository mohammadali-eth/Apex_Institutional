"use client";

import React from "react";
import Link from "next/link";
import { HODDashboardStats } from "@/lib/types";
import {
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  HelpCircle,
  FileText,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Plus,
  ShieldCheck,
  Award,
  UserCheck,
} from "lucide-react";

interface Props {
  stats: HODDashboardStats;
}

export function HODDashboardView({ stats }: Props) {
  const pendingReview = stats.question_stats?.pending_review || 0;
  const pendingApproval = stats.paper_stats?.pending_approval || 0;
  const totalQuestions = stats.question_stats?.total_questions || 0;
  const approvedQuestions = stats.question_stats?.approved_questions || 0;
  const questionApprovalRate = totalQuestions > 0 ? Math.round((approvedQuestions / totalQuestions) * 100) : 0;

  const totalPapers = stats.paper_stats?.total_papers || 0;
  const publishedPapers = stats.paper_stats?.published_papers || 0;
  const paperPublishRate = totalPapers > 0 ? Math.round((publishedPapers / totalPapers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* HOD Department Hero Banner */}
      <div className="bg-[#45525b] text-white p-6 sm:p-8 rounded-[var(--radius-lg)] border border-[#3c474f] shadow-[var(--shadow-md)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-[var(--radius-lg)] bg-[#82c341] text-[#000000] font-black text-2xl flex items-center justify-center shrink-0 shadow-md">
              {stats.department_code?.substring(0, 3) || "HOD"}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#82c341] text-[#000000] uppercase tracking-wider">
                  {stats.department_code}
                </span>
                <span className="text-xs text-[#dce1e4]">{stats.university_name}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {stats.department_name}
              </h1>
              <p className="text-xs text-[#dce1e4] max-w-xl">
                Head of Department Academic Console: Oversee faculty assignments, syllabus coverage, peer reviews, and question paper approvals.
              </p>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/hod/faculty"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-[var(--radius-md)] border border-white/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#82c341]" />
              <span>Add Faculty</span>
            </Link>
            <Link
              href="/dashboard/hod/review-questions"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-[var(--radius-md)] border border-white/20 transition flex items-center gap-1.5 relative"
            >
              <CheckCircle className="w-3.5 h-3.5 text-[#82c341]" />
              <span>Review Queue</span>
              {pendingReview > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-[#e53e3e] text-white">
                  {pendingReview}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/hod/approve-papers"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-[var(--radius-md)] border border-white/20 transition flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#82c341]" />
              <span>Approve Papers</span>
              {pendingApproval > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-[#e53e3e] text-white">
                  {pendingApproval}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/hod/exams"
              className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-md transition flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Exams</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Priority Action Alerts if Pending Items */}
      {(pendingReview > 0 || pendingApproval > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingReview > 0 && (
            <div className="bg-[#fffbeb] border border-[#fef3c7] p-4 rounded-[var(--radius-lg)] flex items-start justify-between shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#fef3c7] text-[#d97706] shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#92400e]">
                    {pendingReview} Question{pendingReview > 1 ? "s" : ""} Pending HOD / Peer Review
                  </h4>
                  <p className="text-xs text-[#b45309] mt-0.5">
                    Faculty submissions await quality verification, syllabus alignment, and moderation.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/hod/review-questions"
                className="px-3 py-1.5 bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold rounded-[var(--radius-md)] shrink-0 transition flex items-center gap-1"
              >
                <span>Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {pendingApproval > 0 && (
            <div className="bg-[#eff6ff] border border-[#dbeafe] p-4 rounded-[var(--radius-lg)] flex items-start justify-between shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#dbeafe] text-[#2563eb] shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1e40af]">
                    {pendingApproval} Question Paper{pendingApproval > 1 ? "s" : ""} Awaiting Final Approval
                  </h4>
                  <p className="text-xs text-[#1d4ed8] mt-0.5">
                    Blueprinted exam papers generated and ready for departmental sign-off.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/hod/approve-papers"
                className="px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-[var(--radius-md)] shrink-0 transition flex items-center gap-1"
              >
                <span>Approve</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Faculty */}
        <Link
          href="/dashboard/hod/faculty"
          className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition shadow-sm group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--font-color)] uppercase tracking-wider">Faculty</span>
            <div className="p-2 rounded-lg bg-[#82c341]/10 text-[#82c341] group-hover:scale-110 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--title-color)]">
            {stats.faculty_stats?.total_faculty || 0}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1">
            <span className="text-[#82c341] font-bold">{stats.faculty_stats?.active_faculty || 0}</span> active in department
          </div>
        </Link>

        {/* Programs */}
        <Link
          href="/dashboard/hod/programs"
          className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition shadow-sm group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--font-color)] uppercase tracking-wider">Programs</span>
            <div className="p-2 rounded-lg bg-[#45525b]/10 text-[#45525b] group-hover:scale-110 transition">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--title-color)]">
            {stats.curriculum_stats?.total_programs || 0}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1">
            Degree programs managed
          </div>
        </Link>

        {/* Subjects & Units */}
        <Link
          href="/dashboard/hod/subjects"
          className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition shadow-sm group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--font-color)] uppercase tracking-wider">Subjects</span>
            <div className="p-2 rounded-lg bg-[#82c341]/10 text-[#82c341] group-hover:scale-110 transition">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--title-color)]">
            {stats.curriculum_stats?.total_subjects || 0}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1">
            {stats.curriculum_stats?.total_syllabus_units || 0} syllabus units
          </div>
        </Link>

        {/* Question Bank */}
        <Link
          href="/dashboard/hod/questions"
          className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition shadow-sm group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--font-color)] uppercase tracking-wider">Questions</span>
            <div className="p-2 rounded-lg bg-[#45525b]/10 text-[#45525b] group-hover:scale-110 transition">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--title-color)]">
            {stats.question_stats?.total_questions || 0}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1">
            <span className="text-[#82c341] font-bold">{stats.question_stats?.approved_questions || 0}</span> approved ({questionApprovalRate}%)
          </div>
        </Link>

        {/* Question Papers */}
        <Link
          href="/dashboard/hod/papers"
          className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition shadow-sm group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--font-color)] uppercase tracking-wider">Exam Papers</span>
            <div className="p-2 rounded-lg bg-[#82c341]/10 text-[#82c341] group-hover:scale-110 transition">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--title-color)]">
            {stats.paper_stats?.total_papers || 0}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1">
            <span className="text-[#2563eb] font-bold">{stats.paper_stats?.approved_papers || 0}</span> approved
          </div>
        </Link>
      </div>

      {/* Curriculum Health & Paper Pipeline Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Bank Distribution */}
        <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#82c341]" />
              <h3 className="font-bold text-[var(--title-color)] text-base">Question Bank Governance</h3>
            </div>
            <Link
              href="/dashboard/hod/questions"
              className="text-xs font-bold text-[#82c341] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase text-[var(--font-color)]">Pending</p>
              <p className="text-lg font-black text-[#d97706] mt-1">{stats.question_stats?.pending_review || 0}</p>
            </div>
            <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase text-[var(--font-color)]">Approved</p>
              <p className="text-lg font-black text-[#82c341] mt-1">{stats.question_stats?.approved_questions || 0}</p>
            </div>
            <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase text-[var(--font-color)]">Rejected</p>
              <p className="text-lg font-black text-[#e53e3e] mt-1">{stats.question_stats?.rejected_questions || 0}</p>
            </div>
            <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase text-[var(--font-color)]">Revision</p>
              <p className="text-lg font-black text-[#6366f1] mt-1">{stats.question_stats?.revision_required || 0}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-[var(--paragraph-color)]">
              <span>Approved Questions Ratio</span>
              <span className="font-bold text-[var(--title-color)]">{questionApprovalRate}%</span>
            </div>
            <div className="w-full bg-[var(--border-color)] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#82c341] h-2 rounded-full transition-all duration-500"
                style={{ width: `${questionApprovalRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question Paper Lifecycle */}
        <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#45525b]" />
              <h3 className="font-bold text-[var(--title-color)] text-base">Question Paper Lifecycle</h3>
            </div>
            <Link
              href="/dashboard/hod/papers"
              className="text-xs font-bold text-[#82c341] hover:underline flex items-center gap-1"
            >
              <span>Monitor Papers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase text-[var(--font-color)]">Total</p>
              <p className="text-lg font-black text-[var(--title-color)] mt-1">{stats.paper_stats?.total_papers || 0}</p>
            </div>
            <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase text-[var(--font-color)]">Pending HOD</p>
              <p className="text-lg font-black text-[#d97706] mt-1">{stats.paper_stats?.pending_approval || 0}</p>
            </div>
            <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase text-[var(--font-color)]">HOD Approved</p>
              <p className="text-lg font-black text-[#2563eb] mt-1">{stats.paper_stats?.approved_papers || 0}</p>
            </div>
            <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase text-[var(--font-color)]">Published</p>
              <p className="text-lg font-black text-[#82c341] mt-1">{stats.paper_stats?.published_papers || 0}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-[var(--paragraph-color)]">
              <span>Published Papers Ratio</span>
              <span className="font-bold text-[var(--title-color)]">{paperPublishRate}%</span>
            </div>
            <div className="w-full bg-[var(--border-color)] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#2563eb] h-2 rounded-full transition-all duration-500"
                style={{ width: `${paperPublishRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Online Examinations & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exams Quick Panel */}
        <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#82c341]" />
              <h3 className="font-bold text-[var(--title-color)] text-base">Department Exams</h3>
            </div>
            <Link
              href="/dashboard/hod/exams"
              className="text-xs font-bold text-[#82c341] hover:underline"
            >
              Manage
            </Link>
          </div>
          <p className="text-xs text-[var(--paragraph-color)]">
            Coordinate mock tests, midterms, and student online assessment schedules.
          </p>
          <div className="p-4 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--title-color)]">Total Configured Tests</p>
              <p className="text-2xl font-black text-[var(--title-color)] mt-0.5">
                {stats.exam_stats?.total_exams || 0}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-[#82c341]">Published</p>
              <p className="text-2xl font-black text-[#82c341] mt-0.5">
                {stats.exam_stats?.upcoming_exams || 0}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/hod/exams"
            className="w-full py-2.5 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#82c341]" />
            <span>Create New Department Exam</span>
          </Link>
        </div>

        {/* Department Audit & Recent Activity */}
        <div className="lg:col-span-2 bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#45525b]" />
              <h3 className="font-bold text-[var(--title-color)] text-base">Department Workflow Activity</h3>
            </div>
            <Link
              href="/dashboard/hod/audit"
              className="text-xs font-bold text-[#82c341] hover:underline flex items-center gap-1"
            >
              <span>Full Audit Trail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats.recent_activity && stats.recent_activity.length > 0 ? (
            <div className="divide-y divide-[var(--border-color)] max-h-72 overflow-y-auto">
              {stats.recent_activity.slice(0, 7).map((act) => (
                <div key={act.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-[var(--title-color)] truncate">
                      {act.action?.replace(/_/g, " ")}
                    </p>
                    <p className="text-[11px] text-[var(--paragraph-color)] truncate">
                      By <span className="font-medium text-[var(--title-color)]">{act.user_name || act.user_email}</span> • {act.entity_type}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--font-color)] shrink-0 font-mono">
                    {new Date(act.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[var(--font-color)]">
              No recent departmental activity recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
