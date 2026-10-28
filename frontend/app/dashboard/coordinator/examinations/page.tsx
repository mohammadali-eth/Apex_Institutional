"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ExaminationItem, ExaminationDetail } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  CalendarDays,
  Search,
  Filter,
  Eye,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  CheckSquare,
  ArrowRight,
  RefreshCw,
  X,
  Building2,
  GraduationCap,
  Award,
} from "lucide-react";

export default function AssignedExaminationsPage() {
  const [exams, setExams] = useState<ExaminationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedExam, setSelectedExam] = useState<ExaminationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchExams = () => {
    setLoading(true);
    let url = "/coordinator/examinations";
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.append("status", statusFilter);
    if (search.trim()) params.append("search", search.trim());
    if (params.toString()) url += `?${params.toString()}`;

    api
      .get<ExaminationItem[]>(url)
      .then((data) => setExams(data || []))
      .catch((err) => console.error("Error loading examinations:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExams();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExams();
  };

  const handleViewDetail = (examId: string) => {
    setDetailLoading(true);
    api
      .get<ExaminationDetail>(`/coordinator/examinations/${examId}`)
      .then((data) => setSelectedExam(data))
      .catch((err) => console.error("Error loading exam detail:", err))
      .finally(() => setDetailLoading(false));
  };

  const filteredExams = exams.filter((e) => {
    if (typeFilter !== "ALL" && e.exam_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assigned Examinations"
        description="Official examinations assigned to your coordination scope. Monitor schedule fidelity, paper readiness, and venue assignments."
        actions={
          <button
            onClick={fetchExams}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--title-color)] hover:border-[#82c341] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Filters and Search Bar */}
      <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--font-color)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exam code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] placeholder:text-[var(--font-color)] focus:outline-none focus:border-[#82c341]"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[var(--font-color)]">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="POSTPONED">Postponed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Types</option>
            <option value="FINAL">Final Exam</option>
            <option value="MIDTERM">Midterm</option>
            <option value="PRACTICAL">Practical</option>
          </select>
        </div>
      </div>

      {/* Examinations Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--font-color)] animate-pulse">
            Loading assigned examinations...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--background-color)] flex items-center justify-center mx-auto mb-3 text-[var(--font-color)]">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[var(--title-color)]">No Assigned Examinations</h3>
            <p className="text-xs text-[var(--paragraph-color)] mt-1 max-w-sm mx-auto">
              You are currently not assigned to any examination schedules. Contact your University Admin or Exam Controller to assign examinations to your coordination roster.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--background-color)] border-b border-[var(--border-color)] text-[var(--font-color)] uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Examination</th>
                  <th className="px-4 py-3">Subject / Dept</th>
                  <th className="px-4 py-3">Schedule & Venue</th>
                  <th className="px-4 py-3">Paper Status</th>
                  <th className="px-4 py-3">Readiness</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-[var(--background-color)]/50 transition">
                    {/* Examination Info */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-[var(--title-color)]">{exam.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)]">
                          {exam.code}
                        </span>
                        <Badge variant="outline">{exam.exam_type}</Badge>
                      </div>
                    </td>

                    {/* Subject / Dept */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--title-color)]">
                        {exam.subject_code ? `${exam.subject_code} - ${exam.subject_name}` : "General Curriculum"}
                      </div>
                      <div className="text-[11px] text-[var(--paragraph-color)] mt-0.5">
                        {exam.program_name} &bull; {exam.semester_name}
                      </div>
                    </td>

                    {/* Schedule & Venue */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--title-color)] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--font-color)]" />
                        <span>
                          {exam.start_time
                            ? new Date(exam.start_time).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                            : "Date TBD"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--paragraph-color)] mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[var(--font-color)]" />
                        <span className="truncate max-w-[160px]">{exam.venue || "Venue not set"}</span>
                      </div>
                    </td>

                    {/* Paper Status */}
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          exam.paper_status === "APPROVED" || exam.paper_status === "PUBLISHED"
                            ? "success"
                            : exam.paper_status === "UNDER_REVIEW"
                            ? "warning"
                            : "default"
                        }
                      >
                        {exam.paper_status.replace("_", " ")}
                      </Badge>
                      <div className="text-[10px] text-[var(--paragraph-color)] mt-1 truncate">
                        {exam.faculty_name ? `Faculty: ${exam.faculty_name}` : "Pending assignment"}
                      </div>
                    </td>

                    {/* Readiness */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1 text-[10px]">
                        <span className="font-bold text-[var(--title-color)]">{exam.readiness_percentage}%</span>
                        <Badge
                          variant={
                            exam.readiness_status === "READY"
                              ? "success"
                              : exam.readiness_status === "BLOCKED"
                              ? "danger"
                              : "outline"
                          }
                        >
                          {exam.readiness_status}
                        </Badge>
                      </div>
                      <div className="w-24 h-1.5 bg-[var(--background-color)] rounded-full overflow-hidden border border-[var(--border-color)]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            exam.readiness_status === "READY"
                              ? "bg-emerald-500"
                              : exam.readiness_status === "BLOCKED"
                              ? "bg-red-500"
                              : "bg-[#82c341]"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, exam.readiness_percentage))}%` }}
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetail(exam.id)}
                          className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-color)] hover:border-[#82c341] text-[var(--title-color)] transition"
                          title="View Examination Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/dashboard/coordinator/schedule`}
                          className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-color)] hover:border-[#82c341] text-[var(--title-color)] transition"
                          title="View Schedule"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/dashboard/coordinator/checklist?examination_id=${exam.id}`}
                          className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-color)] hover:border-[#82c341] text-[var(--title-color)] transition"
                          title="Readiness Checklist"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Examination Detail Modal */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--background-color)]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[var(--title-color)]">{selectedExam.name}</h3>
                  <Badge variant="outline">{selectedExam.code}</Badge>
                </div>
                <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">
                  {selectedExam.department_name} &bull; {selectedExam.program_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="p-1 text-[var(--font-color)] hover:text-[var(--title-color)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
                <div>
                  <span className="text-[10px] text-[var(--font-color)] uppercase font-semibold">Start Time</span>
                  <p className="font-bold text-[var(--title-color)] mt-0.5">
                    {selectedExam.start_time
                      ? new Date(selectedExam.start_time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                      : "Not scheduled"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--font-color)] uppercase font-semibold">Duration & Marks</span>
                  <p className="font-bold text-[var(--title-color)] mt-0.5">
                    {selectedExam.duration_minutes} min &bull; {selectedExam.total_marks} Marks
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--font-color)] uppercase font-semibold">Venue Location</span>
                  <p className="font-medium text-[var(--title-color)] mt-0.5">
                    {selectedExam.venue || "Pending room booking"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--font-color)] uppercase font-semibold">Paper Deadline</span>
                  <p className="font-medium text-[var(--title-color)] mt-0.5">
                    {selectedExam.paper_submission_deadline
                      ? new Date(selectedExam.paper_submission_deadline).toLocaleDateString([], { dateStyle: "medium" })
                      : "No deadline set"}
                  </p>
                </div>
              </div>

              {/* Readiness Summary */}
              <div>
                <h4 className="font-bold text-[var(--title-color)] mb-2">Readiness Breakdown</h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-[var(--background-color)] rounded border border-[var(--border-color)]">
                    <div className="font-bold text-sm text-[var(--title-color)]">{selectedExam.readiness_summary.total_items}</div>
                    <div className="text-[10px] text-[var(--font-color)]">Total Items</div>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-700">
                    <div className="font-bold text-sm">{selectedExam.readiness_summary.completed}</div>
                    <div className="text-[10px]">Completed</div>
                  </div>
                  <div className="p-2 bg-amber-500/10 rounded border border-amber-500/20 text-amber-700">
                    <div className="font-bold text-sm">{selectedExam.readiness_summary.pending}</div>
                    <div className="text-[10px]">In Progress</div>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded border border-red-500/20 text-red-700">
                    <div className="font-bold text-sm">{selectedExam.readiness_summary.blocked}</div>
                    <div className="text-[10px]">Blocked</div>
                  </div>
                </div>
              </div>

              {/* Coordination Team */}
              <div>
                <h4 className="font-bold text-[var(--title-color)] mb-2">Assigned Coordinators</h4>
                <div className="space-y-1.5">
                  {selectedExam.assigned_coordinators && selectedExam.assigned_coordinators.length > 0 ? (
                    selectedExam.assigned_coordinators.map((c, idx) => (
                      <div key={idx} className="p-2 bg-[var(--background-color)] rounded border border-[var(--border-color)] flex items-center justify-between">
                        <span className="font-medium text-[var(--title-color)]">{c.name}</span>
                        <Badge variant={c.can_edit ? "success" : "outline"}>
                          {c.can_edit ? "Schedule Edit Access" : "Read-Only"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[var(--font-color)]">No other coordinators assigned.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--background-color)] flex justify-end gap-2">
              <Link
                href={`/dashboard/coordinator/checklist?examination_id=${selectedExam.id}`}
                className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition"
              >
                Open Checklist
              </Link>
              <button
                onClick={() => setSelectedExam(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--title-color)] hover:bg-[var(--background-color)] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
