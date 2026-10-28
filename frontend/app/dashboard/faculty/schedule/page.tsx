"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { FacultyExamItem, FacultySubjectItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import {
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Sparkles,
  BookOpen,
  ArrowRight
} from "lucide-react";

export default function FacultySchedulePage() {
  const toast = useToast();
  const [exams, setExams] = useState<FacultyExamItem[]>([]);
  const [subjects, setSubjects] = useState<FacultySubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState("");
  const [search, setSearch] = useState("");

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await api.get<FacultyExamItem[]>("/faculty/schedule");
      setExams(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load examination schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get<FacultySubjectItem[]>("/faculty/subjects").then((data) => {
      setSubjects(data || []);
    });
    fetchSchedule();
  }, []);

  const filteredExams = exams.filter((exam) => {
    if (selectedSubject && exam.subject_id !== selectedSubject) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        exam.title?.toLowerCase().includes(s) ||
        exam.subject_name?.toLowerCase().includes(s) ||
        exam.subject_code?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Departmental Examination Schedule"
        subtitle="Track upcoming assessments, examination schedules, paper generation deadlines, and assessment durations for your assigned course subjects."
      />

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[var(--paragraph-color)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exam by title or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Assigned Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Examinations Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] text-[var(--paragraph-color)] space-y-2">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-[var(--title-color)]">No examination schedules found</h3>
          <p className="text-xs">There are no assessments currently scheduled for your selected course subjects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-5 shadow-[var(--shadow-sm)] hover:border-[#82c341] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-100 text-blue-800">
                    {exam.subject_code}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    exam.is_published ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                  }`}>
                    {exam.is_published ? "Published / Active" : "Draft Schedule"}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[var(--title-color)] line-clamp-2">
                  {exam.title}
                </h3>

                <p className="text-xs text-[var(--paragraph-color)] mt-1 line-clamp-1">
                  {exam.subject_name}
                </p>

                {exam.description && (
                  <p className="text-[11px] text-[var(--paragraph-color)] mt-2 line-clamp-2 italic bg-gray-50 p-2 rounded">
                    "{exam.description}"
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-gray-100 text-center text-xs">
                  <div className="p-2 rounded bg-gray-50">
                    <span className="text-[10px] text-gray-400 block">Duration</span>
                    <strong className="text-[var(--title-color)]">{exam.duration_minutes}m</strong>
                  </div>
                  <div className="p-2 rounded bg-gray-50">
                    <span className="text-[10px] text-gray-400 block">Total Marks</span>
                    <strong className="text-[var(--title-color)]">{exam.total_marks}</strong>
                  </div>
                  <div className="p-2 rounded bg-gray-50">
                    <span className="text-[10px] text-gray-400 block">Passing</span>
                    <strong className="text-[var(--title-color)]">{exam.passing_marks}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/dashboard/faculty/paper-generator?subject_id=${exam.subject_id}`}
                  className="w-full py-2 px-3 rounded-[var(--radius-md)] bg-[#82c341] text-black font-semibold text-xs hover:bg-[#72b035] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Build Question Paper</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
