"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ControllerScheduleItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  Clock,
  CalendarDays,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Edit,
  X,
  Search,
  Building2,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function ControllerSchedulePage() {
  const [schedule, setSchedule] = useState<ControllerScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterConflict, setFilterConflict] = useState("ALL");

  // Edit Schedule Modal
  const [editingExam, setEditingExam] = useState<ControllerScheduleItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    start_time: "",
    end_time: "",
    venue: "",
    duration_minutes: 180,
    reason: "Institutional timetable optimization"
  });

  const fetchSchedule = () => {
    setLoading(true);
    api
      .get<ControllerScheduleItem[]>("/controller/schedule")
      .then((data) => setSchedule(data || []))
      .catch((err) => console.error("Error loading schedule:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const openEditModal = (item: ControllerScheduleItem) => {
    setEditingExam(item);
    setEditForm({
      start_time: item.start_time ? item.start_time.slice(0, 16) : "",
      end_time: item.end_time ? item.end_time.slice(0, 16) : "",
      venue: item.venue || "",
      duration_minutes: item.duration_minutes || 180,
      reason: "Institutional timetable optimization"
    });
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;
    setSubmitting(true);
    try {
      await api.put(`/controller/schedule/${editingExam.id}`, {
        start_time: editForm.start_time ? new Date(editForm.start_time).toISOString() : undefined,
        end_time: editForm.end_time ? new Date(editForm.end_time).toISOString() : undefined,
        venue: editForm.venue,
        duration_minutes: Number(editForm.duration_minutes),
        reason: editForm.reason
      });
      setEditingExam(null);
      fetchSchedule();
    } catch (err: any) {
      alert(err.message || "Failed to update schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  const conflictCount = schedule.filter((s) => s.has_conflict).length;

  const filteredSchedule = schedule.filter((item) => {
    if (filterConflict === "CONFLICTS_ONLY" && !item.has_conflict) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.subject_name && item.subject_name.toLowerCase().includes(q)) ||
        (item.venue && item.venue.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Examination Schedule"
        description="University timetable supervision with automated venue clash prevention and cohort overlap detection."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchSchedule()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--font-color)] hover:text-[var(--title-color)] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Schedule</span>
            </button>
            <Link
              href="/dashboard/controller/examinations"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition shadow-[var(--shadow-sm)]"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>New Exam Slot</span>
            </Link>
          </div>
        }
      />

      {/* Conflict Summary Banner */}
      {conflictCount > 0 ? (
        <div className="p-4 rounded-[var(--radius-lg)] border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold">{conflictCount} Schedule Conflict(s) Detected!</span>
              <p className="text-[11px] opacity-90 mt-0.5">
                Overlapping room allocations or simultaneous cohort exams require controller adjustment.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterConflict("CONFLICTS_ONLY")}
            className="px-3 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition"
          >
            View Clashes
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-[var(--radius-lg)] border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Timetable Integrity Verified: No venue clashes or cohort scheduling overlaps detected.</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--font-color)]" />
          <input
            type="text"
            placeholder="Search timetable by exam, subject, or hall..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--font-color)]">Filter:</span>
          <select
            value={filterConflict}
            onChange={(e) => setFilterConflict(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Scheduled Slots ({schedule.length})</option>
            <option value="CONFLICTS_ONLY">Clashes & Overlaps Only ({conflictCount})</option>
          </select>
        </div>
      </div>

      {/* Timetable List / Table */}
      {loading ? (
        <div className="p-8 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <div className="w-8 h-8 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--font-color)]">Compiling master timetable...</p>
        </div>
      ) : filteredSchedule.length === 0 ? (
        <div className="p-12 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <Clock className="w-10 h-10 text-[var(--font-color)] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[var(--title-color)] mb-1">No Schedule Entries Found</h3>
          <p className="text-xs text-[var(--font-color)]">Try adjusting your search or conflict filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSchedule.map((item) => (
            <div
              key={item.id}
              className={`p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border transition shadow-[var(--shadow-sm)] ${
                item.has_conflict
                  ? "border-red-500/50 bg-red-50/10"
                  : "border-[var(--border-color)] hover:border-[#82c341]"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.has_conflict ? "danger" : "outline"} size="sm">
                      {item.code}
                    </Badge>
                    <h3 className="text-sm font-bold text-[var(--title-color)]">{item.name}</h3>
                    {item.has_conflict && (
                      <Badge variant="danger" size="sm">Clash Alert</Badge>
                    )}
                  </div>
                  <div className="text-xs text-[var(--font-color)] flex items-center gap-2 flex-wrap">
                    <span>{item.subject_code ? `${item.subject_code} - ${item.subject_name}` : "General"}</span>
                    <span>&bull;</span>
                    <span>{item.department_name || "Institution"}</span>
                    <span>&bull;</span>
                    <span>{item.duration_minutes} minutes</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 text-[var(--title-color)] font-semibold">
                      <Clock className="w-3.5 h-3.5 text-[#82c341]" />
                      <span>
                        {item.start_time
                          ? new Date(item.start_time).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Unscheduled"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--font-color)] mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{item.venue || "Hall Not Assigned"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => openEditModal(item)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45] flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Adjust</span>
                  </button>
                </div>
              </div>

              {/* Conflict details if any */}
              {item.has_conflict && item.conflicts && item.conflicts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-500/20 text-xs text-red-600 dark:text-red-400 space-y-1">
                  {item.conflicts.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ADJUST SCHEDULE MODAL */}
      {editingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md p-6 shadow-[var(--shadow-lg)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">Adjust Examination Schedule</h3>
                <p className="text-xs text-[var(--font-color)]">{editingExam.code} - {editingExam.name}</p>
              </div>
              <button onClick={() => setEditingExam(null)} className="text-[var(--font-color)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Start Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">End Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={editForm.end_time}
                  onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Assigned Hall / Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Hall A - Main Block"
                  value={editForm.venue}
                  onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={editForm.duration_minutes}
                  onChange={(e) => setEditForm({ ...editForm, duration_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Audit Reason / Justification *</label>
                <textarea
                  required
                  rows={2}
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExam(null)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--font-color)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] font-bold hover:bg-[#72ad38] disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
