"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  StudentClassDetail,
  OnlineTestSummary,
  QuestionPaper,
  TestResultSummary,
} from "@/lib/types";
import { PracticeTestModal } from "@/components/student/PracticeTestModal";
import {
  GraduationCap,
  BookOpen,
  CheckSquare,
  FileText,
  Award,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Play,
  User,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function StudentClassDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const subjectId = params.subjectId as string;
  const initialTab = searchParams.get("tab") || "overview";

  const [activeTab, setActiveTab] = useState<"overview" | "syllabus" | "papers" | "tests" | "results">(
    (initialTab as any) || "overview"
  );
  const [classDetail, setClassDetail] = useState<StudentClassDetail | null>(null);
  const [tests, setTests] = useState<OnlineTestSummary[]>([]);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [results, setResults] = useState<TestResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;

    setLoading(true);
    Promise.all([
      api.get<StudentClassDetail>(`/student/classes/${subjectId}`),
      api.get<OnlineTestSummary[]>(`/student/tests`, { subject_id: subjectId }).catch(() => []),
      api.get<QuestionPaper[]>(`/papers`, { subject_id: subjectId, status: "PUBLISHED" }).catch(() => []),
      api.get<TestResultSummary[]>(`/student/results`, { subject_id: subjectId }).catch(() => []),
    ])
      .then(([cls, tsts, pprs, rslts]) => {
        setClassDetail(cls);
        setTests(tsts || []);
        setPapers(pprs || []);
        setResults(rslts || []);

        // Expand first unit by default
        if (cls?.units && cls.units.length > 0) {
          setExpandedUnits({ [cls.units[0].unit_id]: true });
        }
      })
      .catch((err) => console.error("Error loading class detail:", err))
      .finally(() => setLoading(false));
  }, [subjectId]);

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

      // Update local state smoothly
      if (classDetail) {
        let totalCompleted = 0;
        let totalTopics = 0;

        const updatedUnits = classDetail.units.map((unit) => {
          let unitCompleted = 0;
          const updatedTopics = unit.topics.map((t) => {
            const isCompleted = t.topic_id === topicId ? !currentStatus : t.is_completed;
            if (isCompleted) unitCompleted++;
            return { ...t, is_completed: isCompleted };
          });

          totalCompleted += unitCompleted;
          totalTopics += unit.topics.length;
          const unitPct = unit.topics.length > 0 ? Math.round((unitCompleted / unit.topics.length) * 100) : 0;

          return {
            ...unit,
            topics: updatedTopics,
            completed_topics_count: unitCompleted,
            progress_percent: unitPct,
          };
        });

        const overallPct = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

        setClassDetail({
          ...classDetail,
          units: updatedUnits,
          completed_topics_count: totalCompleted,
          progress_percent: overallPct,
        });
      }
    } catch (err) {
      console.error("Failed to update topic progress:", err);
    } finally {
      setUpdatingTopicId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
        <div className="h-64 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
      </div>
    );
  }

  if (!classDetail) {
    return (
      <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-4">
        <GraduationCap className="w-10 h-10 text-[var(--font-color)] mx-auto opacity-50" />
        <h3 className="text-base font-bold text-[var(--title-color)]">Course Not Found</h3>
        <p className="text-xs text-[var(--paragraph-color)]">
          The requested course is not available or you are not enrolled in it.
        </p>
        <Link href="/dashboard/classes" className="btn-secondary text-xs inline-flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Classes</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/classes"
          className="text-xs font-semibold text-[var(--paragraph-color)] hover:text-[var(--title-color)] flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Classes</span>
        </Link>

        <button
          onClick={() => setPracticeModalOpen(true)}
          className="px-3.5 py-1.5 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Practice Test</span>
        </button>
      </div>

      {/* Google Classroom Class Banner */}
      <div className="rounded-[var(--radius-lg)] bg-[#45525b] text-white p-6 sm:p-8 shadow-[var(--shadow-md)] relative overflow-hidden border border-[#3c474f]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#82c341] text-[#000000] uppercase tracking-wider">
                {classDetail.subject_code}
              </span>
              <span className="text-xs text-[#dce1e4] font-medium">
                {classDetail.semester_name} &bull; {classDetail.credits} Credits
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {classDetail.subject_name}
            </h1>

            <div className="flex items-center gap-4 text-xs text-[#dce1e4] pt-1">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#82c341]" />
                {classDetail.teacher_name}
              </span>
              <span>&bull;</span>
              <span>{classDetail.department_name}</span>
            </div>
          </div>

          {/* Quick Syllabus Progress Counter */}
          <div className="bg-white/10 p-4 rounded-[var(--radius-md)] border border-white/20 text-center shrink-0 min-w-[140px]">
            <span className="text-2xl font-black text-[#82c341]">
              {classDetail.progress_percent}%
            </span>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#dce1e4] mt-0.5">
              Curriculum Completed
            </p>
            <p className="text-[10px] text-[#dce1e4]/70 mt-1">
              {classDetail.completed_topics_count} of {classDetail.topics_count} topics
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] overflow-x-auto pb-px">
        {[
          { id: "overview", label: "Overview", icon: GraduationCap },
          { id: "syllabus", label: `Syllabus (${classDetail.units_count} Units)`, icon: BookOpen },
          { id: "papers", label: `Question Papers (${papers.length})`, icon: FileText },
          { id: "tests", label: `Online Tests (${tests.length})`, icon: CheckSquare },
          { id: "results", label: `My Results (${results.length})`, icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-[var(--radius-md)] transition shrink-0 border-b-2 ${
                isActive
                  ? "border-[#82c341] text-[var(--title-color)] bg-[var(--surface-color)]"
                  : "border-transparent text-[var(--font-color)] hover:text-[var(--title-color)] hover:bg-[var(--background-color)]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#82c341]" : "text-[var(--font-color)]"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
              <h3 className="text-sm font-bold text-[var(--title-color)]">Course Information</h3>
              <p className="text-xs text-[var(--paragraph-color)] leading-relaxed">
                {classDetail.description ||
                  `This course provides in-depth study of ${classDetail.subject_name}. Core theoretical principles, problem-solving methodologies, and examination objectives are structured across ${classDetail.units_count} comprehensive units.`}
              </p>
            </div>

            {/* Syllabus Snapshot */}
            <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--title-color)]">Syllabus Units Breakdown</h3>
                <button
                  onClick={() => setActiveTab("syllabus")}
                  className="text-xs font-bold text-[var(--secondary-color)] hover:text-[#82c341] flex items-center gap-1"
                >
                  <span>View All Topics</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {classDetail.units.map((unit) => (
                  <div
                    key={unit.unit_id}
                    className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)]"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-[var(--title-color)]">
                        Unit {unit.unit_number}: {unit.title}
                      </span>
                      <span className="font-semibold text-[var(--paragraph-color)]">
                        {unit.completed_topics_count}/{unit.topics_count} Topics ({unit.progress_percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-white h-1.5 rounded-full overflow-hidden border border-[var(--border-color)]">
                      <div
                        className="bg-[#82c341] h-full rounded-full transition-all"
                        style={{ width: `${unit.progress_percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Quick Stats & Instructor */}
          <div className="space-y-6">
            <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-4">
              <h3 className="text-xs font-bold text-[var(--title-color)] uppercase tracking-wider">
                Instructor & Department
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#45525b] text-white flex items-center justify-center font-bold text-sm">
                  {classDetail.teacher_name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--title-color)]">{classDetail.teacher_name}</p>
                  <p className="text-[11px] text-[var(--paragraph-color)]">Faculty Course Lead</p>
                </div>
              </div>
              <div className="text-xs space-y-1 text-[var(--paragraph-color)] pt-2 border-t border-[var(--border-color)]">
                <p>
                  <strong className="text-[var(--title-color)]">Program:</strong> {classDetail.program_name}
                </p>
                <p>
                  <strong className="text-[var(--title-color)]">Department:</strong> {classDetail.department_name}
                </p>
              </div>
            </div>

            <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
              <h3 className="text-xs font-bold text-[var(--title-color)] uppercase tracking-wider">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setPracticeModalOpen(true)}
                  className="w-full py-2 px-3 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] flex items-center justify-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Practice Assessment</span>
                </button>
                <button
                  onClick={() => setActiveTab("papers")}
                  className="w-full py-2 px-3 bg-[var(--background-color)] hover:bg-[#dcdcdc]/60 text-[var(--title-color)] text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center justify-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Browse Past Papers ({papers.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SYLLABUS & TOPIC CHECKLIST */}
      {activeTab === "syllabus" && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center justify-between text-xs">
            <span className="text-[var(--paragraph-color)]">
              Mark topics as completed to track your study preparation in real-time.
            </span>
            <span className="font-bold text-[var(--title-color)]">
              {classDetail.completed_topics_count} of {classDetail.topics_count} Topics Completed
            </span>
          </div>

          <div className="space-y-4">
            {classDetail.units.map((unit) => {
              const isExpanded = !!expandedUnits[unit.unit_id];
              return (
                <div
                  key={unit.unit_id}
                  className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]"
                >
                  {/* Unit Accordion Header */}
                  <button
                    onClick={() => toggleUnit(unit.unit_id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-[var(--background-color)]/50 transition text-left"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#45525b] text-white">
                          Unit {unit.unit_number}
                        </span>
                        <h4 className="text-sm font-bold text-[var(--title-color)]">{unit.title}</h4>
                      </div>
                      <p className="text-xs text-[var(--paragraph-color)]">
                        {unit.completed_topics_count} of {unit.topics_count} topics completed ({unit.progress_percent}%)
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-[var(--background-color)] h-2 rounded-full overflow-hidden border border-[var(--border-color)] hidden sm:block">
                        <div
                          className="bg-[#82c341] h-full rounded-full"
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
                      {unit.topics.length === 0 ? (
                        <p className="text-xs text-[var(--font-color)] py-2">No individual topics listed for this unit.</p>
                      ) : (
                        unit.topics.map((t) => (
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
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: QUESTION PAPERS */}
      {activeTab === "papers" && (
        <div className="space-y-4">
          {papers.length === 0 ? (
            <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-2">
              <FileText className="w-10 h-10 text-[var(--font-color)] mx-auto opacity-50" />
              <h3 className="text-sm font-bold text-[var(--title-color)]">No Published Question Papers</h3>
              <p className="text-xs text-[var(--paragraph-color)]">
                The examination board has not published papers for this subject yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {papers.map((paper) => (
                <div
                  key={paper.id}
                  className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[var(--primary-color)] transition shadow-[var(--shadow-sm)] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#82c341]/20 text-[#325816]">
                      OFFICIAL PAPER
                    </span>
                    <h3 className="text-sm font-bold text-[var(--title-color)]">{paper.title}</h3>
                    <p className="text-xs text-[var(--paragraph-color)]">
                      {paper.exam_name} &bull; {paper.duration_minutes} Mins &bull; {paper.total_marks} Marks
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--font-color)]">
                      Published by {paper.creator_name || "Academic Board"}
                    </span>
                    <Link
                      href={`/question-papers/${paper.id}`}
                      className="px-3 py-1.5 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] flex items-center gap-1.5 transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#82c341]" />
                      <span>View & Download</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ONLINE TESTS */}
      {activeTab === "tests" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--title-color)]">Available Assessments</h3>
            <button
              onClick={() => setPracticeModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Practice Quiz</span>
            </button>
          </div>

          {tests.length === 0 ? (
            <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
              <CheckSquare className="w-10 h-10 text-[var(--font-color)] mx-auto opacity-50" />
              <p className="text-sm font-bold text-[var(--title-color)]">No Tests Available Yet</p>
              <p className="text-xs text-[var(--paragraph-color)]">
                You can create an instant AI practice test using questions from the question bank.
              </p>
              <button
                onClick={() => setPracticeModalOpen(true)}
                className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] inline-flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Practice Test</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[var(--shadow-sm)]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          test.is_practice ? "bg-purple-100 text-purple-800" : "bg-[#82c341]/20 text-[#325816]"
                        }`}
                      >
                        {test.test_type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-[var(--paragraph-color)]">
                        {test.duration_minutes} Mins &bull; {test.total_marks} Marks &bull; {test.questions_count} Questions
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--title-color)]">{test.title}</h4>
                    {test.description && (
                      <p className="text-xs text-[var(--paragraph-color)] line-clamp-1">{test.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      href={`/dashboard/tests/${test.id}`}
                      className="px-4 py-2 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] flex items-center gap-1.5 transition"
                    >
                      <Play className="w-3.5 h-3.5 text-[#82c341]" />
                      <span>{test.attempts_count > 0 ? "Re-take Test" : "Start Test"}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MY RESULTS */}
      {activeTab === "results" && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
              <Award className="w-10 h-10 text-[var(--font-color)] mx-auto opacity-50" />
              <p className="text-sm font-bold text-[var(--title-color)]">No Test Submissions Yet</p>
              <p className="text-xs text-[var(--paragraph-color)]">
                Take an online test or generate a practice quiz to view graded results and question explanations.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((res) => (
                <div
                  key={res.attempt_id}
                  className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[var(--shadow-sm)]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          res.is_passed ? "bg-[#82c341]/20 text-[#325816]" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {res.percentage}% &bull; {res.is_passed ? "PASSED" : "FAILED"}
                      </span>
                      <span className="text-[11px] text-[var(--font-color)]">
                        {new Date(res.started_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--title-color)]">{res.test_title}</h4>
                    <p className="text-xs text-[var(--paragraph-color)]">
                      Score: <strong className="text-[var(--title-color)]">{res.obtained_marks}</strong> / {res.total_marks} Marks ({res.correct_count} correct)
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/tests/results/${res.attempt_id}`}
                    className="px-4 py-2 bg-[var(--background-color)] hover:bg-[#dcdcdc]/60 text-[var(--title-color)] text-xs font-bold rounded-[var(--radius-md)] border border-[var(--border-color)] transition flex items-center gap-1.5"
                  >
                    <span>Review Solutions</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Practice Test Modal */}
      <PracticeTestModal
        isOpen={practiceModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        classes={[classDetail]}
        defaultSubjectId={classDetail.subject_id}
      />
    </div>
  );
}
