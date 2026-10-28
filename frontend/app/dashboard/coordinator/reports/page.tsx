"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CoordinatorReportsData } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  BarChart3,
  Download,
  CalendarDays,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ShieldAlert,
} from "lucide-react";

export default function CoordinatorReportsPage() {
  const [report, setReport] = useState<CoordinatorReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = () => {
    setLoading(true);
    api
      .get<CoordinatorReportsData>("/coordinator/reports")
      .then((data) => setReport(data))
      .catch((err) => console.error("Error loading reports:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const exportProgressCSV = () => {
    if (!report || !report.exam_progress_rows.length) return;
    const headers = ["Exam Code", "Exam Name", "Subject Code", "Subject Name", "Paper Status", "Submission Deadline", "Is Overdue"];
    const rows = report.exam_progress_rows.map((r) => [
      `"${r.exam_code}"`,
      `"${r.exam_name}"`,
      `"${r.subject_code}"`,
      `"${r.subject_name}"`,
      `"${r.paper_status}"`,
      `"${r.submission_deadline}"`,
      r.is_overdue ? "YES" : "NO",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `exam_coordination_progress_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination Progress & Operational Reports"
        description="Audited analytics across assigned examination cohorts, paper readiness milestones, and operational resolution turnaround."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportProgressCSV}
              disabled={!report || !report.exam_progress_rows.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45] transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchReports}
              className="p-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--title-color)] hover:border-[#82c341] transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="p-8 text-center text-xs text-[var(--font-color)] animate-pulse bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          Compiling coordinated examination metrics from database records...
        </div>
      ) : !report ? (
        <div className="p-12 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <BarChart3 className="w-8 h-8 text-[var(--font-color)] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[var(--title-color)]">No Analytics Available</h3>
          <p className="text-xs text-[var(--paragraph-color)] mt-1">
            Ensure you have assigned examinations to generate reporting metrics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--font-color)] font-semibold uppercase">Total Examinations</span>
              <p className="text-2xl font-bold text-[var(--title-color)] mt-1">{report.total_exams}</p>
            </div>
            <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--font-color)] font-semibold uppercase">Total Papers</span>
              <p className="text-2xl font-bold text-[var(--title-color)] mt-1">{report.total_papers}</p>
            </div>
            <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--font-color)] font-semibold uppercase">Approved Papers</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{report.papers_approved}</p>
            </div>
            <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--font-color)] font-semibold uppercase">Overdue Papers</span>
              <p className={`text-2xl font-bold mt-1 ${report.papers_overdue > 0 ? "text-amber-700" : "text-[var(--title-color)]"}`}>
                {report.papers_overdue}
              </p>
            </div>
            <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--font-color)] font-semibold uppercase">Readiness Fulfillment</span>
              <p className="text-2xl font-bold text-[#45525b] mt-1">{report.readiness_rate}%</p>
            </div>
          </div>

          {/* Section 1: Examination Preparation Progress */}
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] p-5">
            <h3 className="text-sm font-bold text-[var(--title-color)] mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#82c341]" />
              <span>Examination Course Progress Status</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--background-color)] border-b border-[var(--border-color)] text-[var(--font-color)] uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Exam Code</th>
                    <th className="px-3 py-2.5">Examination Title</th>
                    <th className="px-3 py-2.5">Subject</th>
                    <th className="px-3 py-2.5">Paper Preparation Status</th>
                    <th className="px-3 py-2.5">Deadline</th>
                    <th className="px-3 py-2.5">Fulfillment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {report.exam_progress_rows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-[var(--background-color)]/50">
                      <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-[var(--title-color)]">{r.exam_code}</td>
                      <td className="px-3 py-2.5 font-medium text-[var(--title-color)]">{r.exam_name}</td>
                      <td className="px-3 py-2.5 text-[var(--paragraph-color)]">{r.subject_code} - {r.subject_name}</td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={
                            r.paper_status === "APPROVED" || r.paper_status === "PUBLISHED"
                              ? "success"
                              : r.paper_status === "UNDER_REVIEW"
                              ? "warning"
                              : "outline"
                          }
                        >
                          {r.paper_status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-[var(--paragraph-color)]">{r.submission_deadline}</td>
                      <td className="px-3 py-2.5">
                        {r.is_overdue ? (
                          <span className="text-red-600 font-bold text-[10px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Overdue
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            On Track
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Readiness Breakdown & Operational Issues */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Readiness Fulfillment by Category */}
            <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] p-5">
              <h3 className="text-sm font-bold text-[var(--title-color)] mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#82c341]" />
                <span>Readiness Breakdown by Category</span>
              </h3>
              <div className="space-y-3">
                {report.readiness_rows.map((row, idx) => {
                  const pctCat = row.total_items > 0 ? Math.round((row.completed / row.total_items) * 100) : 0;
                  return (
                    <div key={idx} className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-[var(--title-color)]">{row.category.replace("_", " ")}</span>
                        <span className="text-[11px] font-semibold text-[var(--paragraph-color)]">
                          {row.completed}/{row.total_items} ({pctCat}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[var(--surface-color)] rounded-full overflow-hidden border border-[var(--border-color)]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            row.blocked > 0 ? "bg-red-500" : pctCat === 100 ? "bg-emerald-500" : "bg-[#82c341]"
                          }`}
                          style={{ width: `${pctCat}%` }}
                        />
                      </div>
                      {row.blocked > 0 && (
                        <p className="text-[10px] text-red-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {row.blocked} blocked milestone(s) require intervention.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operational Issues Summary */}
            <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)] mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>Operational Issue Summary</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-[var(--background-color)] rounded border border-[var(--border-color)]">
                    <p className="text-[10px] text-[var(--font-color)] uppercase font-semibold">Total Logged</p>
                    <p className="text-xl font-bold text-[var(--title-color)] mt-0.5">{report.issue_summary.total_issues}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded border border-amber-200">
                    <p className="text-[10px] text-amber-700 uppercase font-semibold">Open / In Progress</p>
                    <p className="text-xl font-bold text-amber-800 mt-0.5">
                      {report.issue_summary.open + report.issue_summary.in_progress}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded border border-red-200">
                    <p className="text-[10px] text-red-700 uppercase font-semibold">Escalated to Controller</p>
                    <p className="text-xl font-bold text-red-700 mt-0.5">{report.issue_summary.escalated}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                    <p className="text-[10px] text-emerald-700 uppercase font-semibold">Resolved / Closed</p>
                    <p className="text-xl font-bold text-emerald-800 mt-0.5">{report.issue_summary.resolved}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--border-color)] text-[11px] text-[var(--paragraph-color)] leading-relaxed">
                All operational metrics are directly aggregated from verified PostgreSQL records and respect coordinator tenant boundaries.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
