"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StudentClassSummary } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { PracticeTestModal } from "@/components/student/PracticeTestModal";
import {
  GraduationCap,
  BookOpen,
  CheckSquare,
  FileText,
  Search,
  Sparkles,
  ArrowRight,
  User,
  Layers,
} from "lucide-react";

const CLASS_PALETTES = [
  { headerBg: "bg-[#45525b]", accent: "#82c341", textColor: "text-white" },
  { headerBg: "bg-[#2d4654]", accent: "#9cd655", textColor: "text-white" },
  { headerBg: "bg-[#3e5667]", accent: "#82c341", textColor: "text-white" },
  { headerBg: "bg-[#4f6758]", accent: "#a3dc62", textColor: "text-white" },
];

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<StudentClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  useEffect(() => {
    api
      .get<StudentClassSummary[]>("/student/classes")
      .then((data) => setClasses(data || []))
      .catch((err) => console.error("Error loading classes:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredClasses = classes.filter((cls) => {
    const q = search.toLowerCase();
    return (
      cls.subject_name.toLowerCase().includes(q) ||
      cls.subject_code.toLowerCase().includes(q) ||
      cls.teacher_name.toLowerCase().includes(q)
    );
  });

  const handleOpenPractice = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setPracticeModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Classes"
        subtitle="Active semester academic courses, faculty instructors, and curriculum progress."
        actions={
          <button
            onClick={() => {
              setSelectedSubjectId(classes[0]?.subject_id || "");
              setPracticeModalOpen(true);
            }}
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Practice Test</span>
          </button>
        }
      />

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-[var(--surface-color)] p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
        <Search className="w-4 h-4 text-[var(--font-color)] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by course code, title, or instructor..."
          className="bg-transparent text-xs w-full text-[var(--title-color)] placeholder:text-[var(--font-color)] focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-[var(--paragraph-color)] hover:text-[var(--title-color)] px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse"
            />
          ))}
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
          <GraduationCap className="w-10 h-10 text-[var(--font-color)] mx-auto opacity-50" />
          <p className="text-sm font-semibold text-[var(--title-color)]">No enrolled classes found</p>
          <p className="text-xs text-[var(--paragraph-color)]">
            {search ? "No courses matched your search query." : "You do not have any active course enrollments."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls, idx) => {
            const theme = CLASS_PALETTES[idx % CLASS_PALETTES.length];
            return (
              <div
                key={cls.subject_id}
                className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition flex flex-col group"
              >
                {/* Header Banner */}
                <div className={`${theme.headerBg} p-5 ${theme.textColor} relative`}>
                  <div className="flex items-start justify-between">
                    <div className="truncate pr-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20 uppercase tracking-wider mb-1.5">
                        {cls.subject_code} &bull; {cls.credits} Credits
                      </span>
                      <h3 className="text-base font-bold truncate leading-tight group-hover:underline">
                        <Link href={`/dashboard/classes/${cls.subject_id}`}>
                          {cls.subject_name}
                        </Link>
                      </h3>
                      <p className="text-xs text-[#dce1e4] mt-1 truncate flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{cls.teacher_name}</span>
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                      <BookOpen className="w-4 h-4 text-[#82c341]" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[var(--paragraph-color)]">Syllabus Covered</span>
                      <span className="font-bold text-[var(--title-color)]">{cls.progress_percent}%</span>
                    </div>
                    <div className="w-full bg-[var(--background-color)] h-2 rounded-full overflow-hidden border border-[var(--border-color)]">
                      <div
                        className="bg-[#82c341] h-full rounded-full transition-all duration-300"
                        style={{ width: `${cls.progress_percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--font-color)] mt-1.5">
                      <span>{cls.completed_topics_count} of {cls.topics_count} topics finished</span>
                      <span>{cls.units_count} Units</span>
                    </div>
                  </div>

                  {/* Resource counts */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-color)] text-xs">
                    <Link
                      href={`/dashboard/classes/${cls.subject_id}?tab=tests`}
                      className="bg-[var(--background-color)] p-2 rounded-[var(--radius-sm)] text-center hover:bg-[#dcdcdc]/50 transition"
                    >
                      <p className="text-[10px] font-bold text-[var(--font-color)] uppercase">Online Tests</p>
                      <p className="font-bold text-[var(--title-color)] mt-0.5">{cls.available_tests_count}</p>
                    </Link>
                    <Link
                      href={`/dashboard/classes/${cls.subject_id}?tab=papers`}
                      className="bg-[var(--background-color)] p-2 rounded-[var(--radius-sm)] text-center hover:bg-[#dcdcdc]/50 transition"
                    >
                      <p className="text-[10px] font-bold text-[var(--font-color)] uppercase">Past Papers</p>
                      <p className="font-bold text-[var(--title-color)] mt-0.5">{cls.published_papers_count}</p>
                    </Link>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3 bg-[var(--background-color)] border-t border-[var(--border-color)] flex items-center justify-between text-xs font-semibold">
                  <Link
                    href={`/dashboard/classes/${cls.subject_id}`}
                    className="text-[var(--title-color)] hover:text-[#82c341] flex items-center gap-1 transition"
                  >
                    <span>Classroom Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => handleOpenPractice(cls.subject_id)}
                    className="text-[#325816] hover:text-[#000000] font-bold flex items-center gap-1 bg-[#82c341]/20 hover:bg-[#82c341] px-2.5 py-1 rounded transition"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Practice</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Practice Test Modal */}
      <PracticeTestModal
        isOpen={practiceModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        classes={classes}
        defaultSubjectId={selectedSubjectId}
      />
    </div>
  );
}
