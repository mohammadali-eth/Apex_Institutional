"use client";

import React from "react";
import Link from "next/link";
import { ControllerDashboardStats } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  CalendarDays,
  FileCheck,
  RotateCcw,
  Lock,
  Send,
  Users,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronRight,
  ShieldAlert,
  Layers,
  Sparkles,
} from "lucide-react";

interface ControllerDashboardViewProps {
  stats: ControllerDashboardStats;
}

export function ControllerDashboardView({ stats }: ControllerDashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <PageHeader
        title="Examination Controller Portal"
        description="Institutional governance of university examinations, question paper approvals, tamper-evident finalization, and confidential release."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/controller/examinations"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45] transition shadow-[var(--shadow-sm)]"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Manage Exams</span>
            </Link>
            <Link
              href="/dashboard/controller/approvals"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition shadow-[var(--shadow-sm)]"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Review Approvals ({stats.papers_awaiting_approval})</span>
            </Link>
          </div>
        }
      />

      {/* 2. Urgent Alerts */}
      {stats.urgent_alerts && stats.urgent_alerts.length > 0 && (
        <div className="space-y-2">
          {stats.urgent_alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-[var(--radius-lg)] border flex items-center justify-between text-xs font-medium ${
                alert.severity === "CRITICAL"
                  ? "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
                  : alert.severity === "HIGH"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{alert.message}</span>
              </div>
              <Link
                href={
                  alert.type === "CRITICAL_ISSUES"
                    ? "/dashboard/controller/examinations"
                    : alert.type === "OVERDUE_PAPERS"
                    ? "/dashboard/controller/schedule"
                    : "/dashboard/controller/approvals"
                }
                className="inline-flex items-center gap-1 underline font-semibold hover:opacity-80"
              >
                <span>Take Action</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* 3. Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Examinations */}
        <Link
          href="/dashboard/controller/examinations"
          className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition group shadow-[var(--shadow-sm)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--font-color)]">Total Examinations</span>
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[#82c341]/15 text-[#45525b] flex items-center justify-center group-hover:scale-110 transition">
              <CalendarDays className="w-4 h-4 text-[#45525b]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--title-color)]">
            {stats.total_examinations}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1">
            <span>{stats.scheduled_examinations} scheduled</span>
            <span className="text-[var(--font-color)]">&bull;</span>
            <span className="text-emerald-600 font-semibold">{stats.completed_examinations} done</span>
          </div>
        </Link>

        {/* Papers Awaiting Controller Approval */}
        <Link
          href="/dashboard/controller/approvals"
          className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition group shadow-[var(--shadow-sm)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--font-color)]">Awaiting Approval</span>
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--title-color)]">
            {stats.papers_awaiting_approval}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1">
            <span>{stats.papers_pending_prior_review} pending HOD</span>
            <span className="text-[var(--font-color)]">&bull;</span>
            <span className="text-blue-600 font-semibold">Review queue</span>
          </div>
        </Link>

        {/* Finalized & Locked Papers */}
        <Link
          href="/dashboard/controller/finalized"
          className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition group shadow-[var(--shadow-sm)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--font-color)]">Finalized & Locked</span>
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--title-color)]">
            {stats.finalized_papers_count}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1">
            <span className="text-purple-600 font-semibold">{stats.released_papers_count} released</span>
            <span className="text-[var(--font-color)]">&bull;</span>
            <span>SHA-256 secure</span>
          </div>
        </Link>

        {/* Revision Queue & Operational Issues */}
        <Link
          href="/dashboard/controller/revisions"
          className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341] transition group shadow-[var(--shadow-sm)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--font-color)]">Revisions & Issues</span>
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--title-color)]">
            {stats.revision_queue_count}
          </div>
          <div className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1">
            <span className="text-red-500 font-semibold">{stats.open_critical_issues} critical</span>
            <span className="text-[var(--font-color)]">&bull;</span>
            <span>{stats.overdue_submissions} overdue</span>
          </div>
        </Link>
      </div>

      {/* 4. Quick Governance Navigation Grid */}
      <div>
        <h2 className="text-sm font-bold text-[var(--title-color)] uppercase tracking-wider mb-3">
          Controller Workflows & Operations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Exam Operations */}
          <div className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#45525b]/10 text-[#45525b] flex items-center justify-center">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">Exam Administration</h3>
                <p className="text-[11px] text-[var(--font-color)]">Schedules, venues, and conflict checks</p>
              </div>
            </div>
            <div className="pt-2 space-y-1.5 border-t border-[var(--border-color)] text-xs">
              <Link
                href="/dashboard/controller/examinations"
                className="flex items-center justify-between p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-color)] transition text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <span>All Institutional Examinations</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/controller/schedule"
                className="flex items-center justify-between p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-color)] transition text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <span>Master Timetable & Conflict Audits</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/controller/coordinators"
                className="flex items-center justify-between p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-color)] transition text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <span>Coordinator Assignments</span>
                <Badge variant="outline" size="sm">{stats.active_coordinators} Active</Badge>
              </Link>
            </div>
          </div>

          {/* Card 2: Question Paper Governance */}
          <div className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#82c341]/20 text-[#343e45] flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-[#45525b]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">Paper Governance</h3>
                <p className="text-[11px] text-[var(--font-color)]">Review, final approval & secure releases</p>
              </div>
            </div>
            <div className="pt-2 space-y-1.5 border-t border-[var(--border-color)] text-xs">
              <Link
                href="/dashboard/controller/approvals"
                className="flex items-center justify-between p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-color)] transition text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <span>Pending Final Approvals</span>
                <Badge variant="warning" size="sm">{stats.papers_awaiting_approval}</Badge>
              </Link>
              <Link
                href="/dashboard/controller/revisions"
                className="flex items-center justify-between p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-color)] transition text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <span>Revision & Rejection Queue</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/controller/finalized"
                className="flex items-center justify-between p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-color)] transition text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <span>Finalized & Locked Papers</span>
                <Badge variant="default" size="sm">{stats.finalized_papers_count}</Badge>
              </Link>
              <Link
                href="/dashboard/controller/releases"
                className="flex items-center justify-between p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-color)] transition text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <span>Secure Paper Release Windows</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Analytics & Audit Trail */}
          <div className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">Oversight & Compliance</h3>
                <p className="text-[11px] text-[var(--font-color)]">Institutional reports and audit logs</p>
              </div>
            </div>
            <div className="pt-2 space-y-1.5 border-t border-[var(--border-color)] text-xs">
              <Link
                href="/dashboard/controller/reports"
                className="flex items-center justify-between p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-color)] transition text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <span>Examination Metrics & Analytics</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/controller/audit"
                className="flex items-center justify-between p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-color)] transition text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <span>Security & Schedule Audit Trail</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <div className="p-2 rounded-[var(--radius-md)] bg-[var(--background-color)] flex items-center justify-between text-[11px] text-[var(--paragraph-color)]">
                <span>Tamper-evident verification</span>
                <span className="font-semibold text-emerald-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Recent System Activities & Audit Stream */}
      <div className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#82c341]" />
            <h3 className="text-sm font-bold text-[var(--title-color)]">Recent System & Audit Trail</h3>
          </div>
          <Link
            href="/dashboard/controller/audit"
            className="text-xs text-[#82c341] hover:underline font-semibold flex items-center gap-1"
          >
            <span>View Full Log</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats.recent_activities && stats.recent_activities.length > 0 ? (
          <div className="divide-y divide-[var(--border-color)]">
            {stats.recent_activities.map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Badge variant="outline" size="sm">
                    {act.action}
                  </Badge>
                  <span className="text-[var(--title-color)] font-medium">
                    {act.entity_type} {act.entity_id ? `(${act.entity_id.slice(0, 8)})` : ""}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--font-color)]">
                  {act.created_at ? new Date(act.created_at).toLocaleString() : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--font-color)] italic py-2">No recent audit records.</p>
        )}
      </div>
    </div>
  );
}
