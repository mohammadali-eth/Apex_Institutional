"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { FacultySubjectItem, FacultySubjectDetail } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  BookOpen,
  Search,
  Layers,
  FileText,
  HelpCircle,
  Sparkles,
  Download,
  Calendar,
  CheckCircle,
  GraduationCap,
  ExternalLink,
  Plus
} from "lucide-react";

export default function FacultySubjectsPage() {
  const toast = useToast();
  const [subjects, setSubjects] = useState<FacultySubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Subject Details Modal
  const [selectedSubject, setSelectedSubject] = useState<FacultySubjectDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (search) params.search = search;
      const res = await api.get<FacultySubjectItem[]>("/faculty/subjects", params);
      setSubjects(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load assigned subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [search]);

  const openSubjectDetails = async (subjectId: string) => {
    setDetailsLoading(true);
    setDetailsModalOpen(true);
    try {
      const res = await api.get<FacultySubjectDetail>(`/faculty/subjects/${subjectId}`);
      setSelectedSubject(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load subject syllabus details");
      setDetailsModalOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="My Assigned Subjects & Curricula"
        subtitle="Manage instructional course subjects assigned to you by the Head of Department. View syllabus units, topics, and prepare questions."
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--paragraph-color)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assigned subjects by code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>
        <div className="text-xs text-[var(--paragraph-color)]">
          Total Assigned: <strong className="text-[var(--title-color)]">{subjects.length} Course Subjects</strong>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] text-[var(--paragraph-color)] space-y-2">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-[var(--title-color)]">No subjects assigned</h3>
          <p className="text-xs">You currently do not have any instructional subjects assigned by your HOD.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((s) => (
            <div
              key={s.id}
              className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-5 shadow-[var(--shadow-sm)] hover:border-[#82c341] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-blue-100 text-blue-800">
                    {s.code}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#82c341]/20 text-black">
                    {s.role_type}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[var(--title-color)] line-clamp-2">
                  {s.name}
                </h3>

                <p className="text-xs text-[var(--paragraph-color)] mt-1">
                  {s.program_name || "Academic Program"} • {s.semester_name || "Semester"}
                </p>

                <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-gray-100 text-center text-xs">
                  <div className="p-2 rounded bg-gray-50">
                    <span className="text-[10px] text-[var(--paragraph-color)] block">Credits</span>
                    <strong className="text-[var(--title-color)]">{s.credits}</strong>
                  </div>
                  <div className="p-2 rounded bg-gray-50">
                    <span className="text-[10px] text-[var(--paragraph-color)] block">Units</span>
                    <strong className="text-[var(--title-color)]">{s.units_count}</strong>
                  </div>
                  <div className="p-2 rounded bg-gray-50">
                    <span className="text-[10px] text-[var(--paragraph-color)] block">Questions</span>
                    <strong className="text-[var(--title-color)]">{s.questions_count}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => openSubjectDetails(s.id)}
                  className="w-full py-2 px-3 rounded-[var(--radius-md)] border border-[var(--border-color)] hover:border-gray-400 text-xs font-semibold text-[var(--title-color)] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-[#82c341]" />
                  <span>View Syllabus Units & Topics</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/dashboard/faculty/questions?subject_id=${s.id}`}
                    className="py-1.5 px-2.5 rounded-[var(--radius-md)] bg-[#82c341] text-black font-semibold text-[11px] text-center hover:bg-[#72b035] transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </Link>
                  <Link
                    href={`/dashboard/faculty/paper-generator?subject_id=${s.id}`}
                    className="py-1.5 px-2.5 rounded-[var(--radius-md)] bg-[var(--secondary-color)] text-white font-semibold text-[11px] text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#82c341]" />
                    <span>Build Paper</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subject Syllabus Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedSubject ? `${selectedSubject.code} — ${selectedSubject.name}` : "Syllabus Details"}
      >
        {detailsLoading || !selectedSubject ? (
          <div className="py-12 text-center text-xs text-[var(--paragraph-color)] animate-pulse">
            Loading syllabus structure...
          </div>
        ) : (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-[var(--radius-md)] border border-gray-100 text-xs">
              <div>
                <span className="text-[var(--paragraph-color)]">Curriculum Version:</span>{" "}
                <strong className="text-[var(--title-color)]">v{selectedSubject.syllabus_version}.0</strong>
              </div>
              <div>
                <span className="text-[var(--paragraph-color)]">Units:</span>{" "}
                <strong className="text-[var(--title-color)]">{selectedSubject.units.length}</strong>
              </div>
              {selectedSubject.syllabus_file_url && (
                <a
                  href={selectedSubject.syllabus_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#82c341] font-bold hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document</span>
                </a>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-[var(--paragraph-color)] tracking-wider">
                Syllabus Breakdown
              </h4>

              {selectedSubject.units.length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--paragraph-color)]">
                  No units added to this syllabus yet.
                </div>
              ) : (
                selectedSubject.units.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-[var(--title-color)]">
                        Unit {u.unit_number}: {u.title}
                      </h5>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {u.questions_count} question{u.questions_count !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {u.description && (
                      <p className="text-[11px] text-[var(--paragraph-color)]">
                        {u.description}
                      </p>
                    )}

                    {u.topics && u.topics.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-gray-400">Topics:</span>
                        <ul className="list-disc list-inside text-[11px] text-gray-700 space-y-0.5 pl-1">
                          {u.topics.map((t) => (
                            <li key={t.id}>
                              <strong>Topic {t.topic_number}:</strong> {t.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
