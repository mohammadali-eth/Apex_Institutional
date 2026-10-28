"use client";

import React from "react";
import Link from "next/link";
import { UniversityAdminDashboardStats } from "@/lib/types";
import {
  Building2,
  Users,
  UserCheck,
  UserCog,
  GraduationCap,
  BookOpen,
  Layers,
  HelpCircle,
  FileText,
  Palette,
  ShieldCheck,
  Plus,
  ArrowRight,
  ExternalLink,
  School,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Settings,
} from "lucide-react";

interface Props {
  stats: UniversityAdminDashboardStats;
}

export function UniversityAdminDashboardView({ stats }: Props) {
  const paperTotal = stats.total_papers || 1;
  const publishedPapers = stats.papers_by_status?.PUBLISHED || 0;
  const generatedPapers = stats.papers_by_status?.GENERATED || 0;
  const draftPapers = stats.papers_by_status?.DRAFT || 0;
  const reviewPapers = stats.papers_by_status?.UNDER_REVIEW || 0;

  return (
    <div className="space-y-6">
      {/* University Executive Hero Banner */}
      <div className="bg-[#45525b] text-white p-6 sm:p-8 rounded-[var(--radius-lg)] border border-[#3c474f] shadow-[var(--shadow-md)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-[var(--radius-lg)] bg-[#82c341] text-[#000000] font-black text-2xl flex items-center justify-center shrink-0 shadow-md">
              {stats.university_code?.substring(0, 2) || "UA"}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#82c341] text-[#000000] uppercase tracking-wider">
                  {stats.university_code}
                </span>
                <span className="text-xs text-[#dce1e4]">Academic Executive Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {stats.university_name}
              </h1>
              <p className="text-xs text-[#dce1e4] max-w-xl">
                Comprehensive governance of affiliated departments, faculty staff, curriculum syllabi, and question paper examinations.
              </p>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/departments"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-[var(--radius-md)] border border-white/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#82c341]" />
              <span>Department</span>
            </Link>
            <Link
              href="/dashboard/hods"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-[var(--radius-md)] border border-white/20 transition flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#82c341]" />
              <span>HOD</span>
            </Link>
            <Link
              href="/dashboard/teachers"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-[var(--radius-md)] border border-white/20 transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-[#82c341]" />
              <span>Faculty</span>
            </Link>
            <Link
              href="/dashboard/branding"
              className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-md transition flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Branding</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Core Primary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--paragraph-color)] uppercase tracking-wider">
              Departments
            </span>
            <div className="w-8 h-8 rounded-full bg-[#82c341]/15 text-[#325816] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-[var(--title-color)]">{stats.total_departments}</p>
            <Link href="/dashboard/departments" className="text-[11px] font-bold text-[#82c341] hover:underline flex items-center gap-0.5">
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-[11px] text-[var(--paragraph-color)]">
            {stats.total_institutions} Affiliated College{stats.total_institutions === 1 ? "" : "s"}
          </p>
        </div>

        <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--paragraph-color)] uppercase tracking-wider">
              Department HODs
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-[var(--title-color)]">{stats.active_hods}</p>
            <Link href="/dashboard/hods" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-[11px] text-[var(--paragraph-color)]">
            Assigned Academic Heads
          </p>
        </div>

        <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--paragraph-color)] uppercase tracking-wider">
              Active Faculty
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-[var(--title-color)]">{stats.active_teachers}</p>
            <Link href="/dashboard/teachers" className="text-[11px] font-bold text-purple-600 hover:underline flex items-center gap-0.5">
              <span>Roster</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-[11px] text-[var(--paragraph-color)]">
            Teaching & Question Setters
          </p>
        </div>

        <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--paragraph-color)] uppercase tracking-wider">
              Exam Controllers
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
              <UserCog className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-[var(--title-color)]">{stats.active_exam_controllers}</p>
            <Link href="/dashboard/exam-controllers" className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-0.5">
              <span>Configure</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-[11px] text-[var(--paragraph-color)]">
            Authorized Paper Publication
          </p>
        </div>
      </div>

      {/* Academic Curriculum & Question Bank Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[#dcdcdc]/30 text-[var(--title-color)] flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-[#82c341]" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--paragraph-color)] uppercase">Degree Programs</p>
            <p className="text-lg font-black text-[var(--title-color)]">{stats.total_programs}</p>
          </div>
        </div>

        <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[#dcdcdc]/30 text-[var(--title-color)] flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-[var(--secondary-color)]" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--paragraph-color)] uppercase">Course Subjects</p>
            <p className="text-lg font-black text-[var(--title-color)]">{stats.total_subjects}</p>
          </div>
        </div>

        <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[#dcdcdc]/30 text-[var(--title-color)] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--paragraph-color)] uppercase">Syllabus Units</p>
            <p className="text-lg font-black text-[var(--title-color)]">{stats.syllabus_units_count}</p>
          </div>
        </div>

        <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[#dcdcdc]/30 text-[var(--title-color)] flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--paragraph-color)] uppercase">Total Questions</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-[var(--title-color)]">{stats.total_questions}</span>
              {stats.questions_awaiting_review > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                  {stats.questions_awaiting_review} Pending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Examination Paper Pipeline Breakdown */}
      <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-[var(--title-color)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#82c341]" />
              <span>University Examination Paper Lifecycle</span>
            </h2>
            <p className="text-xs text-[var(--paragraph-color)]">
              Workflow progression from blueprint generation through moderation and official publication.
            </p>
          </div>
          <Link
            href="/question-papers"
            className="text-xs font-bold text-[#82c341] hover:underline flex items-center gap-1"
          >
            <span>View All Papers ({stats.total_papers})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Paper Status Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2 text-center text-xs">
          <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
            <span className="text-[10px] font-bold text-[var(--paragraph-color)] block uppercase">Draft</span>
            <span className="text-base font-extrabold text-[var(--title-color)]">{draftPapers}</span>
          </div>
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-[var(--radius-md)]">
            <span className="text-[10px] font-bold text-blue-700 block uppercase">Generated</span>
            <span className="text-base font-extrabold text-blue-900">{generatedPapers}</span>
          </div>
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-[var(--radius-md)]">
            <span className="text-[10px] font-bold text-amber-700 block uppercase">Under Review</span>
            <span className="text-base font-extrabold text-amber-900">{reviewPapers}</span>
          </div>
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-[var(--radius-md)]">
            <span className="text-[10px] font-bold text-purple-700 block uppercase">Approved</span>
            <span className="text-base font-extrabold text-purple-900">{stats.papers_by_status?.APPROVED || 0}</span>
          </div>
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-[var(--radius-md)]">
            <span className="text-[10px] font-bold text-emerald-700 block uppercase">Published</span>
            <span className="text-base font-extrabold text-emerald-900">{publishedPapers}</span>
          </div>
          <div className="p-3 bg-red-50/70 border border-red-200 rounded-[var(--radius-md)]">
            <span className="text-[10px] font-bold text-red-700 block uppercase">Rejected</span>
            <span className="text-base font-extrabold text-red-900">{stats.papers_by_status?.REJECTED || 0}</span>
          </div>
          <div className="p-3 bg-gray-100 border border-gray-200 rounded-[var(--radius-md)]">
            <span className="text-[10px] font-bold text-gray-600 block uppercase">Archived</span>
            <span className="text-base font-extrabold text-gray-800">{stats.papers_by_status?.ARCHIVED || 0}</span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Accounts & Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recently Provisioned Staff */}
        <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--secondary-color)]" />
              <h2 className="text-sm font-bold text-[var(--title-color)]">Recently Created Accounts</h2>
            </div>
            <Link href="/admin/users" className="text-xs font-bold text-[#82c341] hover:underline flex items-center gap-0.5">
              <span>All Users</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5 flex-1">
            {stats.recent_accounts && stats.recent_accounts.length > 0 ? (
              stats.recent_accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 truncate">
                    <p className="font-bold text-[var(--title-color)] truncate">{acc.full_name}</p>
                    <p className="text-[11px] text-[var(--paragraph-color)] truncate">{acc.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#45525b] text-white">
                      {acc.role_name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        acc.is_active ? "bg-emerald-500" : "bg-red-400"
                      }`}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--paragraph-color)] text-center py-6">
                No accounts created yet.
              </p>
            )}
          </div>
        </div>

        {/* Right: University Audit Events */}
        <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-[var(--title-color)]">University Audit Stream</h2>
            </div>
            <Link href="/dashboard/audit" className="text-xs font-bold text-[#82c341] hover:underline flex items-center gap-0.5">
              <span>Full Audit Logs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5 flex-1">
            {stats.recent_audit_events && stats.recent_audit_events.length > 0 ? (
              stats.recent_audit_events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 truncate">
                    <span className="font-mono text-[11px] font-bold text-[var(--title-color)]">
                      {evt.action}
                    </span>
                    <p className="text-[11px] text-[var(--paragraph-color)] truncate">
                      by <strong className="text-[var(--title-color)]">{evt.user_email}</strong> &bull; {evt.entity_type}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--paragraph-color)] shrink-0 font-mono">
                    {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--paragraph-color)] text-center py-6">
                No recent activity recorded.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
