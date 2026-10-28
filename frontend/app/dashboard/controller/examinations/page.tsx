"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ControllerExamItem } from "@/lib/types";
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
  Plus,
  Building2,
  GraduationCap,
  Users,
} from "lucide-react";

export default function ControllerExaminationsPage() {
  const [exams, setExams] = useState<ControllerExamItem[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Create Exam Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newExam, setNewExam] = useState({
    code: "",
    name: "",
    exam_type: "FINAL",
    subject_id: "",
    department_id: "",
    start_time: "",
    end_time: "",
    duration_minutes: 180,
    total_marks: 100,
    venue: "Main Examination Hall A",
    paper_submission_deadline: "",
    status: "SCHEDULED"
  });

  // Detail Modal
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchExams = () => {
    setLoading(true);
    let url = "/controller/examinations";
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.append("status", statusFilter);
    if (search.trim()) params.append("search", search.trim());
    if (params.toString()) url += `?${params.toString()}`;

    api
      .get<ControllerExamItem[]>(url)
      .then((data) => setExams(data || []))
      .catch((err) => console.error("Error loading examinations:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExams();
    api.get<any[]>("/academic/subjects").then((res) => setSubjects(res || [])).catch(() => {});
    api.get<any[]>("/departments").then((res) => setDepartments(res || [])).catch(() => {});
  }, [statusFilter]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.code.trim() || !newExam.name.trim()) return;
    setCreating(true);
    try {
      await api.post("/controller/examinations", {
        code: newExam.code.trim(),
        name: newExam.name.trim(),
        exam_type: newExam.exam_type,
        subject_id: newExam.subject_id || undefined,
        department_id: newExam.department_id || undefined,
        start_time: newExam.start_time ? new Date(newExam.start_time).toISOString() : undefined,
        end_time: newExam.end_time ? new Date(newExam.end_time).toISOString() : undefined,
        duration_minutes: Number(newExam.duration_minutes),
        total_marks: Number(newExam.total_marks),
        venue: newExam.venue || undefined,
        paper_submission_deadline: newExam.paper_submission_deadline ? new Date(newExam.paper_submission_deadline).toISOString() : undefined,
        status: newExam.status
      });
      setCreateModalOpen(false);
      setNewExam({
        code: "",
        name: "",
        exam_type: "FINAL",
        subject_id: "",
        department_id: "",
        start_time: "",
        end_time: "",
        duration_minutes: 180,
        total_marks: 100,
        venue: "Main Examination Hall A",
        paper_submission_deadline: "",
        status: "SCHEDULED"
      });
      fetchExams();
    } catch (err: any) {
      alert(err.message || "Failed to create examination.");
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetail = (examId: string) => {
    setDetailLoading(true);
    api
      .get<any>(`/controller/examinations/${examId}`)
      .then((data) => setSelectedExam(data))
      .catch((err) => console.error("Error loading exam detail:", err))
      .finally(() => setDetailLoading(false));
  };

  const handleUpdateStatus = async (examId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await api.patch(`/controller/examinations/${examId}/status`, { status: newStatus });
      if (selectedExam && selectedExam.id === examId) {
        setSelectedExam({ ...selectedExam, status: newStatus });
      }
      fetchExams();
    } catch (err: any) {
      alert(err.message || "Failed to update exam status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredExams = exams.filter((e) => {
    if (typeFilter !== "ALL" && e.exam_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination Management"
        description="Oversee, create, and govern official institutional examinations. Track schedule fidelity, paper readiness, and supervisor assignments."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchExams()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--font-color)] hover:text-[var(--title-color)] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition shadow-[var(--shadow-sm)]"
            >
              <Plus className="w-4 h-4" />
              <span>New Examination</span>
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col md:flex-row gap-3 items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchExams();
          }}
          className="relative w-full md:w-96"
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--font-color)]" />
          <input
            type="text"
            placeholder="Search by exam title or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--font-color)]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="POSTPONED">Postponed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--font-color)]">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
            >
              <option value="ALL">All Types</option>
              <option value="FINAL">Final Exam</option>
              <option value="MIDTERM">Midterm</option>
              <option value="SUPPLEMENTARY">Supplementary</option>
              <option value="PRACTICAL">Practical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Examinations Table / Grid */}
      {loading ? (
        <div className="p-8 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <div className="w-8 h-8 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--font-color)]">Loading examinations...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="p-12 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <CalendarDays className="w-10 h-10 text-[var(--font-color)] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[var(--title-color)] mb-1">No Examinations Found</h3>
          <p className="text-xs text-[var(--font-color)] max-w-sm mx-auto mb-4">
            No examinations match the selected search criteria or filters.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000]"
          >
            Create Examination
          </button>
        </div>
      ) : (
        <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--background-color)] text-[var(--font-color)] font-semibold">
                  <th className="p-3.5">Code & Title</th>
                  <th className="p-3.5">Subject / Department</th>
                  <th className="p-3.5">Date & Venue</th>
                  <th className="p-3.5 text-center">Readiness</th>
                  <th className="p-3.5 text-center">Paper Status</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredExams.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-[var(--title-color)]">{e.code}</div>
                      <div className="text-[11px] text-[var(--font-color)] line-clamp-1">{e.name}</div>
                      <span className="inline-block mt-1 text-[10px] uppercase font-bold text-[var(--font-color)]/80 tracking-wider">
                        {e.exam_type} &bull; {e.duration_minutes}m &bull; {e.total_marks} Marks
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-[var(--title-color)]">
                        {e.subject_code ? `${e.subject_code} - ${e.subject_name}` : "General / Multi-Subject"}
                      </div>
                      <div className="text-[11px] text-[var(--font-color)]">
                        {e.department_name || "Institutional"}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-[var(--title-color)]">
                        <Clock className="w-3.5 h-3.5 text-[var(--font-color)] shrink-0" />
                        <span>
                          {e.start_time
                            ? new Date(e.start_time).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "TBD"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--font-color)] mt-0.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{e.venue || "Hall Not Assigned"}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="text-xs font-bold text-[var(--title-color)]">
                          {e.readiness_percentage}%
                        </div>
                        <div className="w-16 h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full ${
                              e.readiness_percentage >= 80
                                ? "bg-emerald-500"
                                : e.readiness_percentage >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${e.readiness_percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge
                        variant={
                          e.paper_status === "FINALIZED" || e.paper_status === "PUBLISHED"
                            ? "default"
                            : e.paper_status === "APPROVED"
                            ? "success"
                            : e.paper_status === "UNDER_REVIEW" || e.paper_status === "REVIEWED"
                            ? "warning"
                            : "outline"
                        }
                        size="sm"
                      >
                        {e.paper_status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge
                        variant={
                          e.status === "COMPLETED"
                            ? "success"
                            : e.status === "IN_PROGRESS"
                            ? "warning"
                            : e.status === "CANCELLED"
                            ? "danger"
                            : "outline"
                        }
                        size="sm"
                      >
                        {e.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetail(e.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--title-color)] hover:border-[#82c341] transition"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-xl p-6 shadow-[var(--shadow-lg)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">Schedule New Examination</h3>
                <p className="text-xs text-[var(--font-color)]">Provision university examination instance and operational checklist.</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[var(--title-color)] mb-1">Exam Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EXAM-2026-DBMS"
                    value={newExam.code}
                    onChange={(e) => setNewExam({ ...newExam, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--title-color)] mb-1">Exam Type</label>
                  <select
                    value={newExam.exam_type}
                    onChange={(e) => setNewExam({ ...newExam, exam_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  >
                    <option value="FINAL">Final Exam</option>
                    <option value="MIDTERM">Midterm</option>
                    <option value="SUPPLEMENTARY">Supplementary</option>
                    <option value="PRACTICAL">Practical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Examination Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End Semester Exam - Database Management Systems"
                  value={newExam.name}
                  onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[var(--title-color)] mb-1">Department</label>
                  <select
                    value={newExam.department_id}
                    onChange={(e) => setNewExam({ ...newExam, department_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[var(--title-color)] mb-1">Subject</label>
                  <select
                    value={newExam.subject_id}
                    onChange={(e) => setNewExam({ ...newExam, subject_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  >
                    <option value="">Select Subject...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[var(--title-color)] mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={newExam.start_time}
                    onChange={(e) => setNewExam({ ...newExam, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--title-color)] mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={newExam.end_time}
                    onChange={(e) => setNewExam({ ...newExam, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[var(--title-color)] mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    value={newExam.duration_minutes}
                    onChange={(e) => setNewExam({ ...newExam, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--title-color)] mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={newExam.total_marks}
                    onChange={(e) => setNewExam({ ...newExam, total_marks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--title-color)] mb-1">Venue</label>
                  <input
                    type="text"
                    value={newExam.venue}
                    onChange={(e) => setNewExam({ ...newExam, venue: e.target.value })}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Paper Submission Deadline</label>
                <input
                  type="datetime-local"
                  value={newExam.paper_submission_deadline}
                  onChange={(e) => setNewExam({ ...newExam, paper_submission_deadline: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--font-color)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] font-bold hover:bg-[#72ad38] disabled:opacity-50"
                >
                  {creating ? "Scheduling..." : "Create Examination"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-2xl p-6 shadow-[var(--shadow-lg)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" size="sm">{selectedExam.code}</Badge>
                  <h3 className="text-base font-bold text-[var(--title-color)]">{selectedExam.name}</h3>
                </div>
                <p className="text-xs text-[var(--font-color)] mt-0.5">
                  {selectedExam.department_name} &bull; {selectedExam.subject_name || "General"}
                </p>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[var(--background-color)] p-3 rounded-[var(--radius-md)]">
              <div>
                <span className="text-[var(--font-color)] block">Schedule:</span>
                <span className="font-semibold text-[var(--title-color)]">
                  {selectedExam.start_time ? new Date(selectedExam.start_time).toLocaleString() : "TBD"}
                </span>
              </div>
              <div>
                <span className="text-[var(--font-color)] block">Venue:</span>
                <span className="font-semibold text-[var(--title-color)]">{selectedExam.venue || "TBD"}</span>
              </div>
              <div>
                <span className="text-[var(--font-color)] block">Duration / Marks:</span>
                <span className="font-semibold text-[var(--title-color)]">{selectedExam.duration_minutes}m / {selectedExam.total_marks}M</span>
              </div>
              <div>
                <span className="text-[var(--font-color)] block">Current Status:</span>
                <select
                  disabled={updatingStatus}
                  value={selectedExam.status}
                  onChange={(e) => handleUpdateStatus(selectedExam.id, e.target.value)}
                  className="mt-1 font-bold text-xs bg-[var(--surface-color)] border border-[var(--border-color)] rounded px-1.5 py-0.5"
                >
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="POSTPONED">POSTPONED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {/* Readiness Checklist Items */}
            <div>
              <h4 className="text-xs font-bold text-[var(--title-color)] uppercase tracking-wider mb-2">
                Operational Readiness Checklist
              </h4>
              <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
                {selectedExam.readiness_items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-[var(--title-color)]">{item.title}</div>
                      <div className="text-[11px] text-[var(--font-color)]">{item.description}</div>
                    </div>
                    <Badge
                      variant={
                        item.status === "COMPLETED"
                          ? "success"
                          : item.status === "BLOCKED"
                          ? "danger"
                          : item.status === "IN_PROGRESS"
                          ? "warning"
                          : "outline"
                      }
                      size="sm"
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned Coordinators */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-[var(--title-color)] uppercase tracking-wider">
                  Assigned Exam Coordinators
                </h4>
                <Link
                  href="/dashboard/controller/coordinators"
                  className="text-xs text-[#82c341] font-semibold hover:underline"
                >
                  Manage Coordinators &rarr;
                </Link>
              </div>
              {selectedExam.assigned_coordinators?.length > 0 ? (
                <div className="space-y-1.5 text-xs">
                  {selectedExam.assigned_coordinators.map((c: any) => (
                    <div key={c.assignment_id} className="p-2 bg-[var(--background-color)] rounded flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-[var(--title-color)]">{c.name}</span>
                        <span className="text-[var(--font-color)] ml-2">({c.email})</span>
                      </div>
                      <Badge variant="outline" size="sm">
                        {c.can_edit_schedule ? "Can Edit Schedule" : "Read-Only"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--font-color)] italic">No coordinators assigned to this exam yet.</p>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end">
              <button
                onClick={() => setSelectedExam(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45]"
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
