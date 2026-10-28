"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FacultyCoordinationItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  Users,
  Search,
  Mail,
  Send,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Clock,
  BookOpen,
} from "lucide-react";

export default function FacultyCoordinationPage() {
  const [roster, setRoster] = useState<FacultyCoordinationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Communication modal
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyCoordinationItem | null>(null);
  const [commSubject, setCommSubject] = useState("");
  const [commMessage, setCommMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRoster = () => {
    setLoading(true);
    api
      .get<FacultyCoordinationItem[]>("/coordinator/faculty")
      .then((data) => setRoster(data || []))
      .catch((err) => console.error("Error loading faculty coordination:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const openCommModal = (item: FacultyCoordinationItem) => {
    setSelectedFaculty(item);
    setCommSubject(`Examination Instructions: ${item.subject_code} (${item.exam_name})`);
    setCommMessage(
      `Dear ${item.faculty_name},\n\nPlease review the blueprint requirements and submission timeline for ${item.subject_code} - ${item.subject_name}.\nDeadline: ${
        item.paper_deadline ? new Date(item.paper_deadline).toLocaleDateString([], { month: "short", day: "numeric" }) : "Scheduled"
      }.\n\nBest regards,\nExam Coordination Committee`
    );
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleSendComm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;
    setSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post("/coordinator/notifications/remind", {
        recipient_id: selectedFaculty.faculty_id,
        examination_id: selectedFaculty.examination_id,
        subject: commSubject.trim(),
        message: commMessage.trim(),
        notification_type: "DEADLINE_REMINDER",
      });

      setSuccessMsg("Instructions dispatched successfully to the faculty member's portal.");
      setTimeout(() => {
        setSelectedFaculty(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to send instructions");
    } finally {
      setSending(false);
    }
  };

  const filteredRoster = roster.filter((item) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      item.faculty_name.toLowerCase().includes(s) ||
      item.faculty_email.toLowerCase().includes(s) ||
      item.subject_code.toLowerCase().includes(s) ||
      item.subject_name.toLowerCase().includes(s) ||
      item.department_name.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty & Department Coordination"
        description="Connect with instructors and examiners assigned to your scoped examinations. Communicate syllabus guidelines, deadlines, and moderation feedback."
        actions={
          <button
            onClick={fetchRoster}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--title-color)] hover:border-[#82c341] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Search Input */}
      <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--font-color)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search faculty name, email, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>
        <span className="text-xs text-[var(--font-color)]">
          {filteredRoster.length} instructor assignment{filteredRoster.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Roster Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-[var(--font-color)] animate-pulse">
          Loading assigned faculty roster...
        </div>
      ) : filteredRoster.length === 0 ? (
        <div className="p-12 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <Users className="w-8 h-8 text-[var(--font-color)] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[var(--title-color)]">No Assigned Instructors Found</h3>
          <p className="text-xs text-[var(--paragraph-color)] mt-1 max-w-sm mx-auto">
            No faculty members have active subject assignments for the courses in your examination scope.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoster.map((item, idx) => (
            <div
              key={idx}
              className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col justify-between hover:border-[#82c341] transition group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#82c341]/15 text-[#45525b] flex items-center justify-center font-bold text-xs shrink-0">
                      {item.faculty_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[var(--title-color)]">{item.faculty_name}</h4>
                      <p className="text-[11px] text-[var(--paragraph-color)] truncate max-w-[180px]">
                        {item.faculty_email}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      item.paper_status === "APPROVED" || item.paper_status === "PUBLISHED"
                        ? "success"
                        : item.paper_status === "UNDER_REVIEW"
                        ? "warning"
                        : "default"
                    }
                  >
                    {item.paper_status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="mt-4 p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--title-color)] font-medium">
                    <BookOpen className="w-3.5 h-3.5 text-[#82c341] shrink-0" />
                    <span className="truncate">{item.subject_code} &bull; {item.subject_name}</span>
                  </div>
                  <div className="text-[11px] text-[var(--paragraph-color)] flex items-center justify-between">
                    <span>Department:</span>
                    <span className="font-semibold text-[var(--title-color)]">{item.department_name}</span>
                  </div>
                  <div className="text-[11px] text-[var(--paragraph-color)] flex items-center justify-between">
                    <span>Deadline:</span>
                    <span className="font-semibold text-[var(--title-color)]">
                      {item.paper_deadline
                        ? new Date(item.paper_deadline).toLocaleDateString([], { month: "short", day: "numeric" })
                        : "TBD"}
                    </span>
                  </div>
                </div>

                {item.outstanding_tasks.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider block mb-1">
                      Outstanding Milestone
                    </span>
                    {item.outstanding_tasks.map((task, tIdx) => (
                      <p key={tIdx} className="text-[11px] text-amber-800 bg-amber-50/50 p-1.5 rounded border border-amber-200">
                        &bull; {task}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[10px] text-[var(--font-color)]">Examination: {item.exam_name}</span>
                <button
                  onClick={() => openCommModal(item)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-sm)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition"
                >
                  <Mail className="w-3 h-3" />
                  <span>Notify</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispatch Modal */}
      {selectedFaculty && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--background-color)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--title-color)]">Dispatch Faculty Communication</h3>
                <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5">
                  To: {selectedFaculty.faculty_name} ({selectedFaculty.faculty_email})
                </p>
              </div>
              <button onClick={() => setSelectedFaculty(null)} className="p-1 text-[var(--font-color)] hover:text-[var(--title-color)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendComm} className="p-5 space-y-4 text-xs">
              {successMsg && (
                <div className="p-3 rounded-[var(--radius-md)] bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}
              {errorMsg && (
                <div className="p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={commSubject}
                  onChange={(e) => setCommSubject(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--title-color)] mb-1">
                  Communication Details *
                </label>
                <textarea
                  rows={5}
                  required
                  value={commMessage}
                  onChange={(e) => setCommMessage(e.target.value)}
                  className="w-full p-2.5 rounded-[var(--radius-md)] bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFaculty(null)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--title-color)] hover:bg-[var(--background-color)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? "Sending..." : "Dispatch Message"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
