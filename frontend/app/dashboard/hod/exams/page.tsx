"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HODExamItem, HODSubjectItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Sparkles,
  Plus,
  Search,
  BookOpen,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  Power,
  Clock,
  Award,
} from "lucide-react";

export default function HODExamsPage() {
  const [exams, setExams] = useState<HODExamItem[]>([]);
  const [subjects, setSubjects] = useState<HODSubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("ALL");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<HODExamItem | null>(null);

  // Form states
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [testType, setTestType] = useState("INTERNAL_ASSESSMENT");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalMarks, setTotalMarks] = useState(50);
  const [passingMarks, setPassingMarks] = useState(20);
  const [attemptLimit, setAttemptLimit] = useState(1);
  const [isPublished, setIsPublished] = useState(false);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<HODExamItem[]>("/hod/exams"),
      api.get<HODSubjectItem[]>("/hod/subjects"),
    ])
      .then(([eList, sList]) => {
        setExams(eList || []);
        setSubjects(sList || []);
        if (sList && sList.length > 0 && !subjectId) {
          setSubjectId(sList[0].id);
        }
      })
      .catch((err) => {
        console.error("Error loading exams:", err);
        setMsg({ type: "error", text: "Failed to load department exams." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.post<HODExamItem>("/hod/exams", {
        subject_id: subjectId,
        title: title.trim(),
        description: description.trim() || null,
        test_type: testType,
        difficulty: difficulty,
        duration_minutes: durationMinutes,
        total_marks: totalMarks,
        passing_marks: passingMarks,
        attempt_limit: attemptLimit,
        is_published: isPublished,
      });
      setMsg({ type: "success", text: "Department exam scheduled successfully." });
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to schedule exam." });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.put<HODExamItem>(`/hod/exams/${selectedExam.id}`, {
        title: title.trim(),
        description: description.trim() || null,
        difficulty: difficulty,
        duration_minutes: durationMinutes,
        total_marks: totalMarks,
        passing_marks: passingMarks,
        attempt_limit: attemptLimit,
      });
      setMsg({ type: "success", text: "Exam details updated successfully." });
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to update exam." });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item: HODExamItem) => {
    try {
      await api.put(`/hod/exams/${item.id}`, {
        is_published: !item.is_published,
      });
      setMsg({
        type: "success",
        text: `Exam ${!item.is_published ? "published to students" : "unpublished"} successfully.`,
      });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to change publication status." });
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTestType("INTERNAL_ASSESSMENT");
    setDifficulty("MEDIUM");
    setDurationMinutes(60);
    setTotalMarks(50);
    setPassingMarks(20);
    setAttemptLimit(1);
    setIsPublished(false);
  };

  const openEditModal = (item: HODExamItem) => {
    setSelectedExam(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setDifficulty(item.difficulty);
    setDurationMinutes(item.duration_minutes);
    setTotalMarks(item.total_marks);
    setPassingMarks(item.passing_marks);
    setAttemptLimit(item.attempt_limit);
    setShowEditModal(true);
  };

  const filteredExams = exams.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.subject_code.toLowerCase().includes(search.toLowerCase()) ||
      e.subject_name.toLowerCase().includes(search.toLowerCase());

    if (filterSubject === "ALL") return matchesSearch;
    return matchesSearch && e.subject_id === filterSubject;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Examinations & Assessments"
        subtitle="Coordinate midterms, online tests, and student assessment benchmarks for your department."
      >
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition flex items-center gap-1.5 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Exam</span>
        </button>
      </PageHeader>

      {/* Alert Messages */}
      {msg && (
        <div
          className={`p-4 rounded-[var(--radius-md)] flex items-center justify-between text-xs font-semibold ${
            msg.type === "success"
              ? "bg-[#82c341]/15 text-[#2e5914] border border-[#82c341]/40"
              : "bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5]"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--font-color)]" />
          <input
            type="text"
            placeholder="Search exam title or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-[var(--font-color)]">
            Loading department examinations...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-[var(--font-color)]">
            No examinations scheduled in this department matching the query.
          </div>
        ) : (
          filteredExams.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-5 shadow-sm space-y-4 hover:border-[#82c341] transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#82c341]/15 text-[#2e5914] border border-[#82c341]/30">
                    {item.subject_code}
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#45525b]/10 text-[#45525b]">
                    {item.test_type?.replace(/_/g, " ")}
                  </span>
                  <h3 className="text-base font-bold text-[var(--title-color)] mt-2 line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--paragraph-color)] truncate">{item.subject_name}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    item.is_published
                      ? "bg-[#82c341]/20 text-[#2e5914]"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {item.is_published ? "Published" : "Draft"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-[var(--border-color)] text-center">
                <div className="p-2 bg-[var(--background-color)] rounded">
                  <span className="text-[10px] text-[var(--font-color)] uppercase block">Duration</span>
                  <span className="font-bold text-[var(--title-color)]">{item.duration_minutes}m</span>
                </div>
                <div className="p-2 bg-[var(--background-color)] rounded">
                  <span className="text-[10px] text-[var(--font-color)] uppercase block">Total Marks</span>
                  <span className="font-bold text-[var(--title-color)]">{item.total_marks}</span>
                </div>
                <div className="p-2 bg-[var(--background-color)] rounded">
                  <span className="text-[10px] text-[var(--font-color)] uppercase block">Pass Marks</span>
                  <span className="font-bold text-[#82c341]">{item.passing_marks}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                <button
                  onClick={() => openEditModal(item)}
                  className="px-3 py-1.5 text-xs font-semibold text-[var(--paragraph-color)] hover:text-[#45525b] hover:bg-[var(--background-color)] rounded-[var(--radius-sm)] transition flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleTogglePublish(item)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] transition flex items-center gap-1 ${
                    item.is_published
                      ? "text-[#e53e3e] hover:bg-[#fee2e2]/50"
                      : "text-[#82c341] hover:bg-[#82c341]/10"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{item.is_published ? "Unpublish" : "Publish to Students"}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Schedule Exam */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Schedule Department Exam</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Course Subject <span className="text-[#e53e3e]">*</span>
                </label>
                <select
                  required
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                >
                  <option value="" disabled>Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Exam Title <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Assessment Fall 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Exam Type
                  </label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  >
                    <option value="INTERNAL_ASSESSMENT">Internal Assessment</option>
                    <option value="OFFICIAL_EXAM">Official Semester Exam</option>
                    <option value="MOCK_TEST">Mock Test</option>
                    <option value="PRACTICE_QUIZ">Practice Quiz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Target Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={360}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(parseInt(e.target.value) || 50)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Passing Marks
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={totalMarks}
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(parseInt(e.target.value) || 20)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pubCheck"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-[var(--border-color)] text-[#82c341] focus:ring-[#82c341]"
                />
                <label htmlFor="pubCheck" className="text-xs font-semibold text-[var(--title-color)] cursor-pointer">
                  Publish immediately to enrolled students
                </label>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--paragraph-color)] hover:bg-[var(--background-color)] rounded-[var(--radius-md)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
                >
                  {saving ? "Scheduling..." : "Schedule Exam"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Exam */}
      {showEditModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Edit Exam Configuration</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateExam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Exam Title <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={360}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(parseInt(e.target.value) || 50)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Passing Marks
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={totalMarks}
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(parseInt(e.target.value) || 20)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Attempt Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={attemptLimit}
                    onChange={(e) => setAttemptLimit(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--paragraph-color)] hover:bg-[var(--background-color)] rounded-[var(--radius-md)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
