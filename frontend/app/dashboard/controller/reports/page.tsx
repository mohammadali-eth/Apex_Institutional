"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ControllerReportsData } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Building2,
  ShieldAlert,
  FileCheck,
  CheckSquare,
  Lock,
} from "lucide-react";

export default function ControllerReportsPage() {
  const [reports, setReports] = useState<ControllerReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = () => {
    setLoading(true);
    api
      .get<ControllerReportsData>("/controller/reports")
      .then((data) => setReports(data))
      .catch((err) => console.error("Error loading controller reports:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination Analytics & Institutional Reports"
        description="Comprehensive metrics on question paper review turnaround, departmental readiness indices, and operational security incident logs."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchReports()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--font-color)] hover:text-[var(--title-color)] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Reports</span>
            </button>
          </div>
        }
      />

      {loading || !reports ? (
        <div className="p-8 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <div className="w-8 h-8 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--font-color)]">Compiling metrics...</p>
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
              <span className="text-xs font-medium text-[var(--font-color)]">Total Examinations</span>
              <div className="text-2xl font-bold text-[var(--title-color)] mt-1">
                {reports.total_examinations}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                Institutional Scope
              </div>
            </div>

            <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
              <span className="text-xs font-medium text-[var(--font-color)]">Approval Turnaround</span>
              <div className="text-2xl font-bold text-[var(--title-color)] mt-1">
                {reports.avg_turnaround_hours} hrs
              </div>
              <div className="text-[11px] text-[var(--font-color)] mt-1">
                Average Review Time
              </div>
            </div>

            <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
              <span className="text-xs font-medium text-[var(--font-color)]">Incident Resolution</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {reports.resolved_issues_total} / {reports.security_incidents_total}
              </div>
              <div className="text-[11px] text-[var(--font-color)] mt-1">
                Operational Issues
              </div>
            </div>

            <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
              <span className="text-xs font-medium text-[var(--font-color)]">Active Critical Issues</span>
              <div className="text-2xl font-bold text-red-500 mt-1">
                {reports.open_critical_issues_total}
              </div>
              <div className="text-[11px] text-[var(--font-color)] mt-1">
                Requires Controller Action
              </div>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Examination Status Breakdown */}
            <div className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#82c341]" />
                <h3 className="text-sm font-bold text-[var(--title-color)]">Examination Lifecycle Distribution</h3>
              </div>
              <div className="space-y-2 text-xs pt-1">
                {Object.entries(reports.examinations_by_status).map(([st, cnt]) => (
                  <div key={st} className="flex items-center justify-between p-2 rounded bg-[var(--background-color)]">
                    <span className="font-semibold text-[var(--title-color)]">{st}</span>
                    <Badge variant={st === "COMPLETED" ? "success" : st === "IN_PROGRESS" ? "warning" : "outline"} size="sm">
                      {cnt}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Question Paper Lifecycle Breakdown */}
            <div className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#82c341]" />
                <h3 className="text-sm font-bold text-[var(--title-color)]">Question Paper Governance Pipeline</h3>
              </div>
              <div className="space-y-2 text-xs pt-1">
                {Object.entries(reports.papers_by_status).map(([st, cnt]) => (
                  <div key={st} className="flex items-center justify-between p-2 rounded bg-[var(--background-color)]">
                    <span className="font-semibold text-[var(--title-color)]">{st}</span>
                    <Badge
                      variant={
                        st === "FINALIZED" || st === "PUBLISHED"
                          ? "default"
                          : st === "APPROVED"
                          ? "success"
                          : st === "REVISION_REQUIRED" || st === "REJECTED"
                          ? "danger"
                          : "warning"
                      }
                      size="sm"
                    >
                      {cnt}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Department Performance Table */}
          <div className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#82c341]" />
              <h3 className="text-sm font-bold text-[var(--title-color)]">Departmental Readiness & Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--background-color)] text-[var(--font-color)] font-semibold">
                    <th className="p-3">Department</th>
                    <th className="p-3 text-center">Total Exams</th>
                    <th className="p-3 text-center">Completed</th>
                    <th className="p-3 text-center">Readiness Index</th>
                    <th className="p-3 text-right">Operational Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {reports.department_performance.map((d) => (
                    <tr key={d.department_id} className="hover:bg-[var(--background-color)]/50">
                      <td className="p-3 font-semibold text-[var(--title-color)]">{d.department_name}</td>
                      <td className="p-3 text-center text-[var(--title-color)]">{d.total_examinations}</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">{d.completed_exams}</td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-bold text-[var(--title-color)]">{d.readiness_rate}%</span>
                          <div className="w-16 h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${d.readiness_rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Badge variant={d.readiness_rate >= 80 ? "success" : "warning"} size="sm">
                          {d.readiness_rate >= 80 ? "Operational" : "Attention Required"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
