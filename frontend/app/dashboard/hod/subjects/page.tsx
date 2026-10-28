"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HODSubjectItem, HODProgramItem, HODFacultyItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  BookOpen,
  Plus,
  Search,
  Users,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  Power,
  Layers,
} from "lucide-react";
import Link from "next/link";

export default function HODSubjectsPage() {
  const [subjects, setSubjects] = useState<HODSubjectItem[]>([]);
  const [programs, setPrograms] = useState<HODProgramItem[]>([]);
  const [faculty, setFaculty] = useState<HODFacultyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProgram, setFilterProgram] = useState("ALL");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<HODSubjectItem | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [programId, setProgramId] = useState("");
  const [semesterNumber, setSemesterNumber] = useState(1);
  const [credits, setCredits] = useState(3);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<HODSubjectItem[]>("/hod/subjects"),
      api.get<HODProgramItem[]>("/hod/programs"),
      api.get<HODFacultyItem[]>("/hod/faculty"),
    ])
      .then(([sList, pList, fList]) => {
        setSubjects(sList || []);
        setPrograms(pList || []);
        setFaculty(fList || []);
        if (pList && pList.length > 0 && !programId) {
          setProgramId(pList[0].id);
        }
      })
      .catch((err) => {
        console.error("Error loading subjects:", err);
        setMsg({ type: "error", text: "Failed to load department courses." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.post<HODSubjectItem>("/hod/subjects", {
        program_id: programId,
        semester_number: semesterNumber,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        credits: credits,
        description: description.trim() || null,
        is_active: true,
      });
      setMsg({ type: "success", text: "Course subject created successfully." });
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to create subject." });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.put<HODSubjectItem>(`/hod/subjects/${selectedSubject.id}`, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        credits: credits,
        description: description.trim() || null,
      });
      setMsg({ type: "success", text: "Course subject updated successfully." });
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to update subject." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAssignments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    setSaving(true);
    setMsg(null);
    try {
      // For each faculty, update their subject list
      await api.post(`/hod/subjects/${selectedSubject.id}/assign-teachers`, {
        faculty_ids: selectedTeacherIds,
      });
      setMsg({ type: "success", text: "Teacher assignments updated successfully." });
      setShowAssignModal(false);
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to update assignments." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: HODSubjectItem) => {
    if (!confirm(`Are you sure you want to ${item.is_active ? "deactivate" : "activate"} ${item.name}?`)) {
      return;
    }
    try {
      await api.put(`/hod/subjects/${item.id}`, {
        is_active: !item.is_active,
      });
      setMsg({
        type: "success",
        text: `Subject ${!item.is_active ? "activated" : "deactivated"} successfully.`,
      });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to update status." });
    }
  };

  const resetForm = () => {
    setName("");
    setCode("");
    setSemesterNumber(1);
    setCredits(3);
    setDescription("");
  };

  const openEditModal = (item: HODSubjectItem) => {
    setSelectedSubject(item);
    setName(item.name);
    setCode(item.code);
    setCredits(item.credits);
    setDescription(item.description || "");
    setShowEditModal(true);
  };

  const openAssignModal = (item: HODSubjectItem) => {
    setSelectedSubject(item);
    setSelectedTeacherIds(item.assigned_teachers?.map((t) => t.id) || []);
    setShowAssignModal(true);
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.program_name && s.program_name.toLowerCase().includes(search.toLowerCase()));

    if (filterProgram === "ALL") return matchesSearch;
    return matchesSearch && s.program_id === filterProgram;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Courses & Subjects"
        subtitle="Manage curriculum courses, credit weights, semester placements, and faculty teaching assignments."
      >
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition flex items-center gap-1.5 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>New Subject</span>
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
            placeholder="Search by course code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Degree Programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#45525b] text-white border-b border-[#3c474f]">
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Course Code & Title</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Degree Program</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Semester / Credits</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Syllabus Units</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Assigned Teachers</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--font-color)]">
                    Loading department course catalog...
                  </td>
                </tr>
              ) : filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--font-color)]">
                    No course subjects found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--background-color)]/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#82c341] bg-[#82c341]/10 px-1.5 py-0.5 rounded border border-[#82c341]/20">
                          {item.code}
                        </span>
                        <span className="font-bold text-[var(--title-color)]">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-[var(--paragraph-color)]">
                      {item.program_name || "—"}
                    </td>
                    <td className="py-3 px-4 text-[var(--paragraph-color)]">
                      Sem {item.semester_number || 1} • {item.credits} Cr
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/hod/syllabus?subject_id=${item.id}`}
                        className="font-bold text-[#82c341] hover:underline flex items-center gap-1"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{item.units_count} Units</span>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      {item.assigned_teachers && item.assigned_teachers.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.assigned_teachers.map((t) => (
                            <span
                              key={t.id}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-[#45525b]/10 text-[#45525b] font-medium"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--font-color)] italic">None assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.is_active
                            ? "bg-[#82c341]/20 text-[#2e5914]"
                            : "bg-[#fee2e2] text-[#991b1b]"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openAssignModal(item)}
                          title="Assign Faculty Teachers"
                          className="p-1.5 text-[var(--paragraph-color)] hover:text-[#82c341] hover:bg-[var(--background-color)] rounded-[var(--radius-sm)] transition"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          title="Edit Course Subject"
                          className="p-1.5 text-[var(--paragraph-color)] hover:text-[#45525b] hover:bg-[var(--background-color)] rounded-[var(--radius-sm)] transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item)}
                          title={item.is_active ? "Deactivate Subject" : "Activate Subject"}
                          className={`p-1.5 rounded-[var(--radius-sm)] transition ${
                            item.is_active
                              ? "text-[var(--paragraph-color)] hover:text-[#e53e3e] hover:bg-[var(--background-color)]"
                              : "text-[#82c341] hover:bg-[var(--background-color)]"
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Subject */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Add Course Subject</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Degree Program <span className="text-[#e53e3e]">*</span>
                </label>
                <select
                  required
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                >
                  <option value="" disabled>Select Degree Program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Subject Code <span className="text-[#e53e3e]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS102"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Semester Number <span className="text-[#e53e3e]">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={semesterNumber}
                    onChange={(e) => setSemesterNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Course Title <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Object Oriented Programming with Java"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Credits
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={credits}
                  onChange={(e) => setCredits(parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Course Description / Objectives
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief synopsis of course curriculum..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
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
                  {saving ? "Adding..." : "Add Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Subject */}
      {showEditModal && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Edit Course Subject</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Subject Code <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Course Title <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Credits
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={credits}
                  onChange={(e) => setCredits(parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
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

      {/* Modal: Assign Faculty to Subject */}
      {showAssignModal && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Assign Faculty: {selectedSubject.code}</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignments} className="p-6 space-y-4">
              <p className="text-xs text-[var(--paragraph-color)]">
                Select teachers from your department authorized to teach and submit questions for{" "}
                <span className="font-bold text-[var(--title-color)]">{selectedSubject.name}</span>.
              </p>

              <div className="max-h-56 overflow-y-auto border border-[var(--border-color)] rounded-[var(--radius-md)] p-2 space-y-1 bg-[var(--background-color)]">
                {faculty.length === 0 ? (
                  <p className="text-[11px] text-[var(--font-color)]">No faculty members found in department.</p>
                ) : (
                  faculty.map((f) => {
                    const isChecked = selectedTeacherIds.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        className="flex items-center gap-2 p-1.5 text-xs hover:bg-[var(--surface-color)] rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeacherIds([...selectedTeacherIds, f.id]);
                            } else {
                              setSelectedTeacherIds(selectedTeacherIds.filter((id) => id !== f.id));
                            }
                          }}
                          className="rounded border-[var(--border-color)] text-[#82c341] focus:ring-[#82c341]"
                        />
                        <div>
                          <div className="font-bold text-[11px] text-[var(--title-color)]">{f.full_name}</div>
                          <div className="text-[10px] text-[var(--font-color)] font-mono">{f.email}</div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--paragraph-color)] hover:bg-[var(--background-color)] rounded-[var(--radius-md)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
                >
                  {saving ? "Saving..." : "Save Assignments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
