"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HODReportsData } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Award,
  Users,
  HelpCircle,
  FileText,
  BarChart3,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

export default function HODReportsPage() {
  const [reports, setReports] = useState<HODReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"WORKLOAD" | "HEALTH" | "READINESS">("WORKLOAD");

  useEffect(() => {
    setLoading(true);
    api
      .get<HODReportsData>("/hod/reports")
      .then((data) => setReports(data))
      .catch((err) => console.error("Error loading reports:", err))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Academic Reports & Analytics"
        subtitle={`Analytical breakdown of faculty workloads, question bank coverage, and exam paper readiness${reports?.department_name ? ` for ${reports.department_name}` : ""}.`}
      >
        <button
          onClick={handlePrint}
          className="px-3.5 py-2 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] transition flex items-center gap-1.5 no-print"
        >
          <Download className="w-3.5 h-3.5 text-[#82c341]" />
          <span>Print / Export PDF</span>
        </button>
      </PageHeader>

      {/* Report Tab Selector */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3 no-print">
        <button
          onClick={() => setActiveTab("WORKLOAD")}
          className={`px-3.5 py-2 rounded-[var(--radius-md)] text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "WORKLOAD"
              ? "bg-[#82c341] text-[#000000] shadow-sm"
              : "text-[var(--paragraph-color)] hover:bg-[var(--surface-color)]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Faculty Workload & Reviews</span>
        </button>

        <button
          onClick={() => setActiveTab("HEALTH")}
          className={`px-3.5 py-2 rounded-[var(--radius-md)] text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "HEALTH"
              ? "bg-[#82c341] text-[#000000] shadow-sm"
              : "text-[var(--paragraph-color)] hover:bg-[var(--surface-color)]"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Question Bank Health by Course</span>
        </button>

        <button
          onClick={() => setActiveTab("READINESS")}
          className={`px-3.5 py-2 rounded-[var(--radius-md)] text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "READINESS"
              ? "bg-[#82c341] text-[#000000] shadow-sm"
              : "text-[var(--paragraph-color)] hover:bg-[var(--surface-color)]"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Paper Readiness Matrix</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-[var(--font-color)] bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          Generating departmental analytics...
        </div>
      ) : !reports ? (
        <div className="p-16 text-center text-xs text-[#e53e3e] bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          Failed to load academic reports data.
        </div>
      ) : (
        <>
          {/* TAB 1: Faculty Workload */}
          {activeTab === "WORKLOAD" && (
            <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Faculty Academic Contribution & Workload</h3>
                  <p className="text-xs text-[#dce1e4] mt-0.5">Authoring, assignment coverage, and peer review metrics</p>
                </div>
                <Users className="w-5 h-5 text-[#82c341]" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--background-color)] border-b border-[var(--border-color)] text-[var(--title-color)]">
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Faculty Member</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Courses Assigned</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Questions Authored</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Questions Approved</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Reviews Conducted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {reports.faculty_workload.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[var(--font-color)]">
                          No faculty records found.
                        </td>
                      </tr>
                    ) : (
                      reports.faculty_workload.map((f) => (
                        <tr key={f.faculty_id} className="hover:bg-[var(--background-color)]/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[var(--title-color)]">{f.faculty_name}</div>
                            <div className="text-[10px] text-[var(--font-color)] font-mono">{f.email}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[var(--title-color)]">
                            {f.assigned_subjects} Courses
                          </td>
                          <td className="py-3 px-4 font-bold text-[var(--title-color)]">
                            {f.questions_submitted}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#82c341]">
                            {f.questions_approved}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#2563eb]">
                            {f.reviews_completed} Reviews
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Question Health */}
          {activeTab === "HEALTH" && (
            <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Question Bank Health & Balance</h3>
                  <p className="text-xs text-[#dce1e4] mt-0.5">Item counts, difficulty spread (Easy/Med/Hard), and moderation ratios</p>
                </div>
                <HelpCircle className="w-5 h-5 text-[#82c341]" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--background-color)] border-b border-[var(--border-color)] text-[var(--title-color)]">
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Subject Course</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Total Banked</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Easy / Med / Hard</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Approved</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Pending Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {reports.question_health.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[var(--font-color)]">
                          No course questions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      reports.question_health.map((q) => (
                        <tr key={q.subject_code} className="hover:bg-[var(--background-color)]/60 transition">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-xs text-[#82c341]">{q.subject_code}</span>
                            <span className="font-semibold text-[var(--title-color)] block">{q.subject_name}</span>
                          </td>
                          <td className="py-3 px-4 font-black text-sm text-[var(--title-color)]">
                            {q.total_questions}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[#82c341] font-bold">{q.easy} E</span>
                            {" • "}
                            <span className="text-[#d97706] font-bold">{q.medium} M</span>
                            {" • "}
                            <span className="text-[#e53e3e] font-bold">{q.hard} H</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-[#82c341]">
                            {q.approved} ({q.total_questions > 0 ? Math.round((q.approved / q.total_questions) * 100) : 0}%)
                          </td>
                          <td className="py-3 px-4 font-bold text-[#d97706]">
                            {q.pending}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Paper Readiness Matrix */}
          {activeTab === "READINESS" && (
            <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Question Paper Examination Readiness Matrix</h3>
                  <p className="text-xs text-[#dce1e4] mt-0.5">Verification status of department exam papers</p>
                </div>
                <FileText className="w-5 h-5 text-[#82c341]" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--background-color)] border-b border-[var(--border-color)] text-[var(--title-color)]">
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Paper Title</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Course</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Marks & Questions</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {reports.paper_readiness.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[var(--font-color)]">
                          No question papers generated in this department.
                        </td>
                      </tr>
                    ) : (
                      reports.paper_readiness.map((p, idx) => (
                        <tr key={idx} className="hover:bg-[var(--background-color)]/60 transition">
                          <td className="py-3 px-4 font-bold text-[var(--title-color)]">
                            {p.paper_title}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-xs text-[#82c341]">{p.subject_code}</span>
                            <span className="text-[11px] text-[var(--paragraph-color)] block">{p.subject_name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-[var(--title-color)]">{p.total_marks} Marks</span>
                            <span className="text-[11px] text-[var(--paragraph-color)] block">{p.questions_count} Questions</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === "PUBLISHED"
                                  ? "bg-[#82c341]/20 text-[#2e5914]"
                                  : p.status === "APPROVED"
                                  ? "bg-[#dbeafe] text-[#1e40af]"
                                  : "bg-[#fef3c7] text-[#92400e]"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-[var(--title-color)]">
                            {p.approved_by || "Pending Sign-off"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
