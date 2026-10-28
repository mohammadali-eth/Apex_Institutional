"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ScheduleItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  Clock,
  Calendar,
  MapPin,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  X,
  Send,
  HelpCircle,
} from "lucide-react";

export default function ExamSchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null);
  const [requestItem, setRequestItem] = useState<ScheduleItem | null>(null);

  // Form states for schedule edit
  const [newDate, setNewDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venue, setVenue] = useState("");
  const [reason, setReason] = useState("");
  const [conflictReport, setConflictReport] = useState<{ has_conflict: boolean; conflicts: any[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Request change state
  const [requestReason, setRequestReason] = useState("");

  const fetchSchedules = () => {
    setLoading(true);
    api
      .get<ScheduleItem[]>("/coordinator/schedule")
      .then((data) => setSchedules(data || []))
      .catch((err) => console.error("Error loading schedule:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const openEditModal = (item: ScheduleItem) => {
    setEditItem(item);
    setActionError(null);
    setActionSuccess(null);
    setConflictReport(null);

    if (item.start_time) {
      const dt = new Date(item.start_time);
      setNewDate(dt.toISOString().split("T")[0]);
      setStartTime(dt.toTimeString().slice(0, 5));
    } else {
      setNewDate("");
      setStartTime("09:00");
    }

    if (item.end_time) {
      const dtEnd = new Date(item.end_time);
      setEndTime(dtEnd.toTimeString().slice(0, 5));
    } else {
      setEndTime("12:00");
    }

    setVenue(item.venue || "");
    setReason("Adjusting venue capacity and timetable slot");
  };

  const handleValidateConflicts = async () => {
    if (!editItem || !newDate || !startTime || !endTime) return;
    setSubmitting(true);
    setActionError(null);

    const startIso = new Date(`${newDate}T${startTime}:00Z`).toISOString();
    const endIso = new Date(`${newDate}T${endTime}:00Z`).toISOString();

    try {
      const res = await api.post<any>("/coordinator/schedule/validate-conflicts", {
        examination_id: editItem.examination_id,
        start_time: startIso,
        end_time: endIso,
        venue: venue.trim() || undefined,
      });

      setConflictReport(res);
    } catch (err: any) {
      setActionError(err?.message || "Failed to validate conflicts");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !newDate || !startTime || !endTime) return;
    setSubmitting(true);
    setActionError(null);

    const startIso = new Date(`${newDate}T${startTime}:00Z`).toISOString();
    const endIso = new Date(`${newDate}T${endTime}:00Z`).toISOString();

    try {
      await api.put(`/coordinator/schedule/${editItem.examination_id}`, {
        start_time: startIso,
        end_time: endIso,
        venue: venue.trim(),
        duration_minutes: editItem.duration_minutes,
        reason: reason.trim() || "Timetable coordination adjustment",
      });

      setActionSuccess("Examination schedule updated successfully with audit trail.");
      setTimeout(() => {
        setEditItem(null);
        fetchSchedules();
      }, 1200);
    } catch (err: any) {
      setActionError(err?.message || "Failed to update timetable");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestItem || !requestReason.trim()) return;
    setSubmitting(true);
    setActionError(null);

    try {
      await api.post("/coordinator/issues", {
        examination_id: requestItem.examination_id,
        title: `Schedule Adjustment Request for ${requestItem.code}`,
        description: requestReason.trim(),
        category: "SCHEDULING_CONFLICT",
        severity: "MEDIUM",
      });

      setActionSuccess("Change request submitted to the Exam Controller.");
      setTimeout(() => {
        setRequestItem(null);
        setRequestReason("");
      }, 1200);
    } catch (err: any) {
      setActionError(err?.message || "Failed to file schedule change request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Schedule & Timetables"
        description="View and coordinate examination timetables. Authorized coordinators can execute vetted schedule adjustments with automatic collision detection."
        actions={
          <button
            onClick={fetchSchedules}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--title-color)] hover:border-[#82c341] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Schedule Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--font-color)] animate-pulse">
            Loading timetable schedules...
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-8 h-8 text-[var(--font-color)] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[var(--title-color)]">No Scheduled Examinations</h3>
            <p className="text-xs text-[var(--paragraph-color)] mt-1">
              There are no examinations with scheduled timetables in your coordination scope.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--background-color)] border-b border-[var(--border-color)] text-[var(--font-color)] uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Course / Exam</th>
                  <th className="px-4 py-3">Cohort</th>
                  <th className="px-4 py-3">Date & Time Slot</th>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Submission Deadline</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Coordination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[var(--title-color)]">{s.name}</div>
                      <div className="text-[11px] text-[var(--paragraph-color)] mt-0.5">
                        {s.subject_code} &bull; {s.subject_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--title-color)]">{s.program_name}</div>
                      <div className="text-[11px] text-[var(--paragraph-color)]">{s.semester_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--title-color)] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#82c341]" />
                        <span>
                          {s.start_time
                            ? new Date(s.start_time).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                            : "TBD"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--paragraph-color)] mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[var(--font-color)]" />
                        <span>
                          {s.start_time && s.end_time
                            ? `${new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${s.duration_minutes}m)`
                            : "Time slot pending"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-[var(--title-color)]">
                        <MapPin className="w-3.5 h-3.5 text-[var(--font-color)] shrink-0" />
                        <span className="truncate max-w-[150px]">{s.venue || "Unassigned"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[var(--title-color)]">
                        {s.paper_deadline
                          ? new Date(s.paper_deadline).toLocaleDateString([], { month: "short", day: "numeric" })
                          : "None"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.can_edit ? (
                        <button
                          onClick={() => openEditModal(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-sm)] bg-[#82c341]/15 text-[#45525b] hover:bg-[#82c341]/25 transition"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Slot</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setRequestItem(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--font-color)] hover:text-[var(--title-color)] transition"
                          title="You do not have direct schedule write permissions. Click to request change."
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>Request Change</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Schedule Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--background-color)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">Edit Examination Timetable</h3>
                <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">
                  {editItem.code} &bull; {editItem.name}
                </p>
              </div>
              <button
                onClick={() => setEditItem(null)}
                className="p-1 text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-5 space-y-4 text-xs">
              {actionSuccess && (
                <div className="p-3 rounded-[var(--radius-md)] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {actionError && (
                <div className="p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                    Exam Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Examination Venue / Room Allocation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hall A - Main Auditorium, Ground Floor"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Reason for Timetable Change (Audit Log Required) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="State the academic or operational justification for modifying this examination schedule..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              {/* Conflict Verification Button & Report */}
              <div className="pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={handleValidateConflicts}
                  disabled={submitting || !newDate || !startTime || !endTime}
                  className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] hover:border-[#82c341] text-[var(--title-color)] transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${submitting ? "animate-spin" : ""}`} />
                  <span>Check Schedule Conflicts</span>
                </button>

                {conflictReport && (
                  <div className="mt-3">
                    {conflictReport.has_conflict ? (
                      <div className="p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-red-800 space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5 text-red-700">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>Schedule Collision Detected!</span>
                        </div>
                        {conflictReport.conflicts.map((c: any, idx: number) => (
                          <p key={idx} className="text-[11px] text-red-700 leading-relaxed">
                            &bull; {c.message}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-[var(--radius-md)] bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>No conflicts detected! Student cohort and room availability confirmed.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--title-color)] hover:bg-[var(--background-color)] transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition font-semibold"
                >
                  {submitting ? "Updating..." : "Save Timetable Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Change Modal (for Read-Only Coordinators) */}
      {requestItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--background-color)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">Request Timetable Change</h3>
                <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">
                  Send request to Exam Controller for {requestItem.code}
                </p>
              </div>
              <button
                onClick={() => setRequestItem(null)}
                className="p-1 text-[var(--font-color)] hover:text-[var(--title-color)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendChangeRequest} className="p-5 space-y-4 text-xs">
              {actionSuccess && (
                <div className="p-3 rounded-[var(--radius-md)] bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>{actionError}</span>
                </div>
              )}

              <p className="text-[11px] text-[var(--paragraph-color)]">
                You do not have direct edit rights for this examination. Submitting this request creates an operational issue with the Exam Controller office for official rescheduling.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Proposed Changes & Justification *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the requested date/time shift or venue change and the reasons..."
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full p-2.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRequestItem(null)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--title-color)] hover:bg-[var(--background-color)] transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45] transition font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Sending..." : "Submit to Controller"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
