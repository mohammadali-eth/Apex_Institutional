"use client";

import React from "react";
import Link from "next/link";
import { CoordinatorDashboardStats } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  CalendarDays,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Bell,
  Users,
  CheckSquare,
  ShieldAlert,
  Layers,
  ChevronRight,
} from "lucide-react";

interface CoordinatorDashboardViewProps {
  stats: CoordinatorDashboardStats;
}

export function CoordinatorDashboardView({ stats }: CoordinatorDashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <PageHeader
        title="Exam Coordinator Dashboard"
        description="Comprehensive monitoring of assigned examinations, paper preparation tracking, operational checklists, and issue escalations."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/coordinator/schedule"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45] transition"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Exam Timetable</span>
            </Link>
            <Link
              href="/dashboard/coordinator/issues"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </Link>
          </div>
        }
      />

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Assigned Exams */}
        <Link
          href="/dashboard/coordinator/examinations"
          className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition group shadow-[var(--shadow-sm)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--font-color)]">Assigned Exams</span>
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[#82c341]/15 text-[#45525b] flex items-center justify-center group-hover:scale-110 transition">
              <CalendarDays className="w-4 h-4 text-[#45525b]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--title-color)]">
            {stats.total_assigned_exams}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1">
            <span>{stats.upcoming_exams} upcoming</span>
            <span className="text-[var(--font-color)]">&bull;</span>
            <span className="text-emerald-600 font-semibold">{stats.completed_exams} completed</span>
          </div>
        </Link>

        {/* Papers Awaiting Submission */}
        <Link
          href="/dashboard/coordinator/papers"
          className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition group shadow-[var(--shadow-sm)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--font-color)]">Papers In Progress</span>
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--title-color)]">
            {stats.papers_awaiting_submission}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1">
            <span>{stats.papers_pending_review} in review</span>
            <span className="text-[var(--font-color)]">&bull;</span>
            <span className="text-blue-600 font-semibold">Faculty authoring</span>
          </div>
        </Link>

        {/* Papers Ready for Exam */}
        <Link
          href="/dashboard/coordinator/papers?status=APPROVED"
          className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition group shadow-[var(--shadow-sm)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--font-color)]">Papers Approved</span>
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--title-color)]">
            {stats.papers_ready}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-medium">Ready for execution</span>
          </div>
        </Link>

        {/* Overdue Submissions Alert */}
        <Link
          href="/dashboard/coordinator/papers?overdue=true"
          className={`p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border transition group shadow-[var(--shadow-sm)] ${
            stats.overdue_submissions > 0
              ? "border-amber-400 bg-amber-50/20"
              : "border-[var(--border-color)]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--font-color)]">Overdue Deadlines</span>
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-amber-500/15 text-amber-700 flex items-center justify-center group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${stats.overdue_submissions > 0 ? "text-amber-700" : "text-[var(--title-color)]"}`}>
            {stats.overdue_submissions}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1">
            <span>{stats.incomplete_checklists} pending checklists</span>
          </div>
        </Link>
      </div>

      {/* 3. Secondary Metrics: Operational Readiness & Issues */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--font-color)]">Incomplete Checklists</p>
            <p className="text-xl font-bold text-[var(--title-color)] mt-0.5">{stats.incomplete_checklists}</p>
            <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">Operational milestones remaining</p>
          </div>
          <Link
            href="/dashboard/coordinator/checklist"
            className="p-2 rounded-[var(--radius-md)] bg-[var(--background-color)] hover:bg-[#82c341]/20 transition"
          >
            <CheckSquare className="w-5 h-5 text-[var(--secondary-color)]" />
          </Link>
        </div>

        <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--font-color)]">Open Operational Issues</p>
            <p className="text-xl font-bold text-[var(--title-color)] mt-0.5">{stats.open_issues}</p>
            <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">Reported operational discrepancies</p>
          </div>
          <Link
            href="/dashboard/coordinator/issues"
            className="p-2 rounded-[var(--radius-md)] bg-[var(--background-color)] hover:bg-[#82c341]/20 transition"
          >
            <AlertCircle className="w-5 h-5 text-[var(--secondary-color)]" />
          </Link>
        </div>

        <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--font-color)]">Critical Escalations</p>
            <p className="text-xl font-bold text-red-600 mt-0.5">{stats.critical_escalations}</p>
            <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">Escalated to Exam Controller</p>
          </div>
          <Link
            href="/dashboard/coordinator/issues?severity=CRITICAL"
            className="p-2 rounded-[var(--radius-md)] bg-[var(--background-color)] hover:bg-red-50 transition"
          >
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </Link>
        </div>
      </div>

      {/* 4. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Coordination Operations & Quick Actions (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Coordination Hub Launchpad */}
          <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
            <h3 className="text-sm font-bold text-[var(--title-color)] mb-3">Coordination Quick Launchpad</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/dashboard/coordinator/examinations"
                className="p-3.5 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] hover:border-[#82c341] transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[#82c341]/20 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-[#45525b]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--title-color)] group-hover:text-[#45525b] transition">Assigned Examinations</h4>
                    <p className="text-[11px] text-[var(--paragraph-color)]">View course schedules & status</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--font-color)] group-hover:text-[#82c341] transition" />
              </Link>

              <Link
                href="/dashboard/coordinator/papers"
                className="p-3.5 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] hover:border-[#82c341] transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-blue-500/15 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--title-color)] group-hover:text-[#45525b] transition">Paper Tracking</h4>
                    <p className="text-[11px] text-[var(--paragraph-color)]">Monitor submission deadlines</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--font-color)] group-hover:text-[#82c341] transition" />
              </Link>

              <Link
                href="/dashboard/coordinator/faculty"
                className="p-3.5 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] hover:border-[#82c341] transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-purple-500/15 flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--title-color)] group-hover:text-[#45525b] transition">Faculty Coordination</h4>
                    <p className="text-[11px] text-[var(--paragraph-color)]">Send reminders & instructions</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--font-color)] group-hover:text-[#82c341] transition" />
              </Link>

              <Link
                href="/dashboard/coordinator/checklist"
                className="p-3.5 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] hover:border-[#82c341] transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-emerald-500/15 flex items-center justify-center">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--title-color)] group-hover:text-[#45525b] transition">Readiness Checklist</h4>
                    <p className="text-[11px] text-[var(--paragraph-color)]">Track operational pre-flight</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--font-color)] group-hover:text-[#82c341] transition" />
              </Link>
            </div>
          </div>

          {/* Recent Operational Issues & Escalations */}
          <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-4">
              <h3 className="text-sm font-bold text-[var(--title-color)]">Recent Operational Issues</h3>
              <Link
                href="/dashboard/coordinator/issues"
                className="text-xs font-semibold text-[#45525b] hover:text-[#82c341] transition flex items-center gap-1"
              >
                <span>View All Issues</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {stats.recent_activity && stats.recent_activity.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_activity.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[var(--title-color)]">{act.title}</p>
                      <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">{act.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          act.severity === "CRITICAL"
                            ? "danger"
                            : act.severity === "HIGH"
                            ? "warning"
                            : "outline"
                        }
                      >
                        {act.severity}
                      </Badge>
                      <Badge
                        variant={act.status === "RESOLVED" ? "success" : "default"}
                      >
                        {act.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--font-color)] text-center py-6">
                No recent operational issues logged. All systems nominal.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Notifications & Alerts (1 Col) */}
        <div className="space-y-6">
          <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-4">
              <h3 className="text-sm font-bold text-[var(--title-color)] flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#82c341]" />
                <span>Recent Notifications</span>
              </h3>
              <Link
                href="/dashboard/coordinator/notifications"
                className="text-xs font-semibold text-[#45525b] hover:text-[#82c341] transition"
              >
                All
              </Link>
            </div>

            {stats.recent_notifications && stats.recent_notifications.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-[var(--radius-md)] border text-xs ${
                      n.is_read
                        ? "bg-[var(--background-color)] border-[var(--border-color)] text-[var(--paragraph-color)]"
                        : "bg-blue-50/30 border-blue-200 text-[var(--title-color)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] truncate">{n.title}</span>
                      <span className="text-[10px] text-[var(--font-color)]">
                        {n.created_at ? new Date(n.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--paragraph-color)] leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--font-color)] text-center py-8">
                No new notifications.
              </p>
            )}

            <div className="pt-4 mt-4 border-t border-[var(--border-color)]">
              <Link
                href="/dashboard/coordinator/reports"
                className="text-xs font-semibold text-[var(--title-color)] hover:text-[#82c341] flex items-center justify-center gap-1 transition"
              >
                <span>View Full Examination Reports</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
