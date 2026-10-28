"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Subject, Program, Semester, UniversityDepartmentItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  BookOpen,
  Plus,
  Search,
  Layers,
  HelpCircle,
  Building2,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

export default function UniversityCoursesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<UniversityDepartmentItem[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("ALL");

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [credits, setCredits] = useState(4);
  const [description, setDescription] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<Subject[]>("/academic/subjects"),
      api.get<UniversityDepartmentItem[]>("/university-admin/departments"),
      api.get<Program[]>("/academic/programs"),
    ])
      .then(([sList, dList, pList]) => {
        setSubjects(sList || []);
        setDepartments(dList || []);
        setPrograms(pList || []);
      })
      .catch((err) => {
        console.error("Error loading courses:", err);
        setMsg({ type: "error", text: "Failed to load subjects." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProgramChange = (progId: string) => {
    setSelectedProgramId(progId);
    setSelectedSemesterId("");
    if (progId) {
      api
        .get<Semester[]>("/academic/semesters", { program_id: progId })
        .then((data) => {
          setSemesters(data || []);
          if (data && data.length > 0) setSelectedSemesterId(data[0].id);
        })
        .catch((e) => console.error("Error fetching semesters:", e));
    } else {
      setSemesters([]);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.post("/academic/subjects", {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        credits: Number(credits),
        description: description.trim() || null,
        semester_id: selectedSemesterId,
      });
      setShowAddModal(false);
      setCode("");
      setName("");
      setDescription("");
      setMsg({ type: "success", text: "Course Subject registered successfully!" });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to register subject." });
    } finally {
      setSaving(false);
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses & Academic Subjects"
        subtitle="Manage official course modules, credit allocations, and mapped question repositories across semesters."
        actions={
          <button
            onClick={() => {
              setCode("");
              setName("");
              setDescription("");
              setCredits(4);
              if (programs.length > 0) {
                handleProgramChange(programs[0].id);
              }
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course Subject</span>
          </button>
        }
      />

      {msg && (
        <div
          className={`p-4 rounded-[var(--radius-md)] text-xs flex items-center justify-between ${
            msg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="p-0.5 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-[var(--surface-color)] p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
        <Search className="w-4 h-4 text-[var(--font-color)] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by course code (e.g. BCA401) or course name..."
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

      {/* Courses Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--background-color)] rounded animate-pulse" />
            ))}
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-[var(--font-color)] mx-auto opacity-40" />
            <p className="text-xs font-bold text-[var(--title-color)]">No Course Subjects Found</p>
            <p className="text-[11px] text-[var(--paragraph-color)]">
              {search ? "No courses matched your query." : "Click Add Course Subject to register curriculum modules."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#45525b] text-white uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Subject Code</th>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4">Degree & Semester</th>
                  <th className="py-3 px-4 text-center">Credits</th>
                  <th className="py-3 px-4 text-center">Syllabus Units</th>
                  <th className="py-3 px-4 text-center">Questions</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredSubjects.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#82c341]">
                      {s.code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[var(--title-color)]">{s.name}</p>
                      {s.description && (
                        <p className="text-[10px] text-[var(--paragraph-color)] line-clamp-1">{s.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-bold text-[var(--title-color)] block">
                        {s.program_name || "Program"}
                      </span>
                      <span className="text-[10px] text-[var(--paragraph-color)]">
                        {s.semester_name || "Semester"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[var(--title-color)]">
                      {s.credits}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#dcdcdc]/40 text-[var(--title-color)]">
                        {s.units_count || 0} Units
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[var(--title-color)]">
                      {s.questions_count || 0}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] max-w-md w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--title-color)]">Register Course Subject</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--paragraph-color)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Subject Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. BCA501"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Course Subject Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Software Engineering & Agile"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--title-color)]">Program *</label>
                  <select
                    required
                    value={selectedProgramId}
                    onChange={(e) => handleProgramChange(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                  >
                    <option value="">-- Choose --</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--title-color)]">Semester *</label>
                  <select
                    required
                    value={selectedSemesterId}
                    onChange={(e) => setSelectedSemesterId(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                  >
                    <option value="">-- Choose --</option>
                    {semesters.map((sem) => (
                      <option key={sem.id} value={sem.id}>
                        {sem.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Credits Allocation</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key topics and curriculum goals..."
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-[var(--paragraph-color)] hover:text-[var(--title-color)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedSemesterId}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] font-black rounded-[var(--radius-md)] uppercase disabled:opacity-50"
                >
                  {saving ? "Registering..." : "Register Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
