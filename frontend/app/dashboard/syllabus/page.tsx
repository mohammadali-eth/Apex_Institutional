"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { StudentSubjectSyllabus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  GraduationCap,
  Layers,
} from "lucide-react";

export default function StudentSyllabusPage() {
  const searchParams = useSearchParams();
  const initialSubjectId = searchParams.get("subject");

  const [syllabi, setSyllabi] = useState<StudentSubjectSyllabus[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<StudentSubjectSyllabus[]>("/student/syllabus")
      .then((data) => {
        setSyllabi(data || []);
        if (data && data.length > 0) {
          const defaultSub = initialSubjectId && data.some((s) => s.subject_id === initialSubjectId)
            ? initialSubjectId
            : data[0].subject_id;
          setSelectedSubjectId(defaultSub);

          // Expand all units initially for quick access
          const expanded: Record<string, boolean> = {};
          data.forEach((s) => {
            s.units.forEach((u) => {
              expanded[u.unit_id] = true;
            });
          });
          setExpandedUnits(expanded);
        }
      })
      .catch((err) => console.error("Error loading syllabus:", err))
      .finally(() => setLoading(false));
  }, [initialSubjectId]);

  const activeSyllabus = syllabi.find((s) => s.subject_id === selectedSubjectId);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const handleToggleTopic = async (topicId: string, currentStatus: boolean) => {
    setUpdatingTopicId(topicId);
    try {
      await api.post("/student/syllabus/progress", {
        topic_id: topicId,
        is_completed: !currentStatus,
      });

      // Update state in memory
      setSyllabi((prevList) =>
        prevList.map((s) => {
          if (s.subject_id !== selectedSubjectId) return s;

          let totalCompleted = 0;
          let totalTopics = 0;

          const updatedUnits = s.units.map((unit) => {
            let unitCompleted = 0;
            const updatedTopics = unit.topics.map((t) => {
              const isComp = t.topic_id === topicId ? !currentStatus : t.is_completed;
              if (isComp) unitCompleted++;
              return { ...t, is_completed: isComp };
            });

            totalCompleted += unitCompleted;
            totalTopics += unit.topics.length;
            const pct = unit.topics.length > 0 ? Math.round((unitCompleted / unit.topics.length) * 100) : 0;

            return {
              ...unit,
              topics: updatedTopics,
              completed_topics_count: unitCompleted,
              progress_percent: pct,
            };
          });

          const overallPct = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

          return {
            ...s,
            completed_topics: totalCompleted,
            overall_progress_percent: overallPct,
            units: updatedUnits,
          };
        })
      );
    } catch (err) {
      console.error("Error saving topic progress:", err);
    } finally {
      setUpdatingTopicId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Syllabus & Learning Progress"
        subtitle="Track curriculum units, verify topic completion, and organize your revision for upcoming examinations."
      />

      {loading ? (
        <div className="space-y-4">
          <div className="h-14 bg-[var(--surface-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] animate-pulse" />
          <div className="h-64 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
        </div>
      ) : syllabi.length === 0 ? (
        <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
          <BookOpen className="w-10 h-10 text-[var(--font-color)] mx-auto opacity-50" />
          <p className="text-sm font-bold text-[var(--title-color)]">No Syllabus Found</p>
          <p className="text-xs text-[var(--paragraph-color)]">
            No active course syllabus is associated with your student enrollment.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subject Switcher Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {syllabi.map((s) => {
              const isSelected = s.subject_id === selectedSubjectId;
              return (
                <button
                  key={s.subject_id}
                  onClick={() => setSelectedSubjectId(s.subject_id)}
                  className={`px-4 py-2 text-xs font-bold rounded-[var(--radius-md)] border transition shrink-0 flex items-center gap-2 ${
                    isSelected
                      ? "bg-[#45525b] text-white border-[#45525b] shadow-[var(--shadow-sm)]"
                      : "bg-[var(--surface-color)] text-[var(--paragraph-color)] border-[var(--border-color)] hover:bg-[#dcdcdc]/40"
                  }`}
                >
                  <span className="font-mono">{s.subject_code}</span>
                  <span className="truncate max-w-[200px]">{s.subject_name}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded text-[10px] ${
                      isSelected ? "bg-[#82c341] text-[#000000]" : "bg-[var(--background-color)] text-[var(--title-color)]"
                    }`}
                  >
                    {s.overall_progress_percent}%
                  </span>
                </button>
              );
            })}
          </div>

          {activeSyllabus && (
            <>
              {/* Progress Summary Card */}
              <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#82c341]/20 text-[#325816] uppercase">
                      {activeSyllabus.subject_code}
                    </span>
                    <h2 className="text-xl font-bold text-[var(--title-color)] mt-1">
                      {activeSyllabus.subject_name}
                    </h2>
                    <p className="text-xs text-[var(--paragraph-color)] mt-0.5">
                      {activeSyllabus.total_units} Units &bull; {activeSyllabus.total_topics} Topics in curriculum
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-3xl font-black text-[#82c341]">
                      {activeSyllabus.overall_progress_percent}%
                    </span>
                    <p className="text-xs font-bold text-[var(--title-color)]">
                      {activeSyllabus.completed_topics} of {activeSyllabus.total_topics} Topics Finished
                    </p>
                  </div>
                </div>

                <div className="w-full bg-[var(--background-color)] h-3 rounded-full overflow-hidden border border-[var(--border-color)]">
                  <div
                    className="bg-[#82c341] h-full rounded-full transition-all duration-300"
                    style={{ width: `${activeSyllabus.overall_progress_percent}%` }}
                  />
                </div>
              </div>

              {/* Topic Search */}
              <div className="flex items-center gap-3 bg-[var(--surface-color)] p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
                <Search className="w-4 h-4 text-[var(--font-color)] shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter topics in this course..."
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

              {/* Units & Topics List */}
              <div className="space-y-4">
                {activeSyllabus.units.map((unit) => {
                  const filteredTopics = unit.topics.filter((t) =>
                    t.title.toLowerCase().includes(search.toLowerCase())
                  );

                  if (search && filteredTopics.length === 0) return null;

                  const isExpanded = !!expandedUnits[unit.unit_id];

                  return (
                    <div
                      key={unit.unit_id}
                      className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]"
                    >
                      {/* Unit Header */}
                      <button
                        onClick={() => toggleUnit(unit.unit_id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-[var(--background-color)]/50 transition text-left"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#45525b] text-white">
                              Unit {unit.unit_number}
                            </span>
                            <h3 className="text-sm font-bold text-[var(--title-color)]">{unit.title}</h3>
                          </div>
                          <p className="text-xs text-[var(--paragraph-color)]">
                            {unit.completed_topics_count} of {unit.topics_count} topics completed ({unit.progress_percent}%)
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-[var(--background-color)] h-2 rounded-full overflow-hidden border border-[var(--border-color)] hidden sm:block">
                            <div
                              className="bg-[#82c341] h-full rounded-full transition-all"
                              style={{ width: `${unit.progress_percent}%` }}
                            />
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[var(--font-color)]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[var(--font-color)]" />
                          )}
                        </div>
                      </button>

                      {/* Topics List */}
                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-[var(--border-color)] bg-[var(--background-color)]/30 space-y-2">
                          {filteredTopics.map((t) => (
                            <div
                              key={t.topic_id}
                              onClick={() => handleToggleTopic(t.topic_id, t.is_completed)}
                              className={`p-3 rounded-[var(--radius-md)] border flex items-center justify-between cursor-pointer transition ${
                                t.is_completed
                                  ? "bg-[#82c341]/10 border-[#82c341]/40 text-[var(--title-color)]"
                                  : "bg-[var(--surface-color)] border-[var(--border-color)] hover:border-[var(--primary-color)] text-[var(--paragraph-color)]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 rounded-[var(--radius-sm)] flex items-center justify-center border transition ${
                                    t.is_completed
                                      ? "bg-[#82c341] border-[#82c341] text-[#000000]"
                                      : "border-[var(--font-color)] bg-white"
                                  }`}
                                >
                                  {t.is_completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <span
                                  className={`text-xs font-semibold ${
                                    t.is_completed ? "line-through text-[var(--font-color)]" : "text-[var(--title-color)]"
                                  }`}
                                >
                                  {t.title}
                                </span>
                              </div>

                              {updatingTopicId === t.topic_id && (
                                <span className="text-[10px] text-[var(--font-color)] animate-pulse">Saving...</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
