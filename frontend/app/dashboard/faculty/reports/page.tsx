"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FacultyReportsData } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import {
  Award,
  HelpCircle,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  BarChart2,
  PieChart,
  BookOpen,
  Calendar
} from "lucide-react";

export default function FacultyReportsPage() {
  const toast = useToast();
  const [reports, setReports] = useState<FacultyReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<FacultyReportsData>("/faculty/reports")
      .then((data) => setReports(data))
      .catch((err) => toast.error(err.message || "Failed to load academic reports"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Faculty Academic Performance & Analytics"
        subtitle="Comprehensive breakdown of questions authored, paper contributions, moderation approval rates, and curriculum workload distribution."
      />

      {loading ? (
        <div className="space-y-6">
          <div className="h-40 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
            ))}
          </div>
        </div>
      ) : !reports ? (
        <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] text-[var(--paragraph-color)]">
          <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p>No academic report data available.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Banner KPI Card */}
          <div className="bg-gradient-to-r from-[var(--secondary-color)] to-[#2c363d] text-white p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-[#82c341] block mb-1">
                Faculty Portfolio
              </span>
              <h2 className="text-xl font-bold">{reports.faculty_name}</h2>
              <p className="text-xs text-gray-300 mt-0.5">
                {reports.department_name} • {reports.email}
              </p>
            </div>

            <div className="flex items-center gap-6 bg-white/10 backdrop-blur-sm px-5 py-3 rounded-[var(--radius-md)] border border-white/10">
              <div className="text-center">
                <span className="text-[10px] text-gray-300 uppercase block font-semibold">Total Questions</span>
                <strong className="text-2xl font-bold text-white">{reports.total_questions}</strong>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] text-gray-300 uppercase block font-semibold">Total Papers</span>
                <strong className="text-2xl font-bold text-white">{reports.total_papers}</strong>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] text-gray-300 uppercase block font-semibold">Approval Rate</span>
                <strong className="text-2xl font-bold text-[#82c341]">{reports.approval_rate_percent}%</strong>
              </div>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Question Status Distribution */}
            <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--paragraph-color)] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#82c341]" />
                  <span>Questions by Status</span>
                </h3>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                {Object.entries(reports.questions_by_status).map(([st, cnt]) => {
                  const pct = reports.total_questions > 0 ? Math.round((cnt / reports.total_questions) * 100) : 0;
                  return (
                    <div key={st} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold text-[var(--title-color)]">{st.replace(/_/g, " ")}</span>
                        <span className="text-[var(--paragraph-color)]">{cnt} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#82c341]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Questions by Type */}
            <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--paragraph-color)] flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-blue-600" />
                  <span>Questions by Type</span>
                </h3>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                {Object.entries(reports.questions_by_type).map(([tp, cnt]) => {
                  const pct = reports.total_questions > 0 ? Math.round((cnt / reports.total_questions) * 100) : 0;
                  return (
                    <div key={tp} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold text-[var(--title-color)]">{tp.replace(/_/g, " ")}</span>
                        <span className="text-[var(--paragraph-color)]">{cnt} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Difficulty Balance */}
            <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--paragraph-color)] flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-purple-600" />
                  <span>Cognitive Difficulty Balance</span>
                </h3>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                {Object.entries(reports.questions_by_difficulty).map(([diff, cnt]) => {
                  const pct = reports.total_questions > 0 ? Math.round((cnt / reports.total_questions) * 100) : 0;
                  const barColor = diff === "EASY" ? "bg-emerald-500" : diff === "MEDIUM" ? "bg-amber-500" : "bg-red-500";
                  return (
                    <div key={diff} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold text-[var(--title-color)]">{diff}</span>
                        <span className="text-[var(--paragraph-color)]">{cnt} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Subject Workload Breakdown Table */}
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--paragraph-color)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#82c341]" />
              <span>Assigned Subject Workload Activity</span>
            </h3>

            {reports.subject_workload.length === 0 ? (
              <p className="text-xs text-[var(--paragraph-color)] italic">No subject workload records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Subject Code</th>
                      <th className="py-2.5 px-3">Subject Title</th>
                      <th className="py-2.5 px-3 text-center">Authored Questions</th>
                      <th className="py-2.5 px-3 text-center">Authored Papers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reports.subject_workload.map((sw) => (
                      <tr key={sw.subject_id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-800">{sw.subject_code}</td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{sw.subject_name}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-800">{sw.questions_authored}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-800">{sw.papers_authored}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
