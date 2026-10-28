"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Program, UniversityDepartmentItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  GraduationCap,
  Plus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

export default function UniversityProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<UniversityDepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("ALL");

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("UG");
  const [totalSemesters, setTotalSemesters] = useState(6);
  const [departmentId, setDepartmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<Program[]>("/academic/programs"),
      api.get<UniversityDepartmentItem[]>("/university-admin/departments"),
    ])
      .then(([pList, dList]) => {
        setPrograms(pList || []);
        setDepartments(dList || []);
      })
      .catch((err) => {
        console.error("Error loading programs:", err);
        setMsg({ type: "error", text: "Failed to load academic degree programs." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.post("/academic/programs", {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        department_id: departmentId,
        degree_level: degreeLevel,
        total_semesters: Number(totalSemesters),
      });
      setShowAddModal(false);
      setName("");
      setCode("");
      setDepartmentId("");
      setMsg({ type: "success", text: "Degree Program & Semesters created successfully!" });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to create program." });
    } finally {
      setSaving(false);
    }
  };

  const filteredPrograms = programs.filter((p) => {
    if (selectedDeptId !== "ALL" && p.department_id !== selectedDeptId) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Programs & Degrees"
        subtitle="Configure undergraduate, postgraduate, and diploma degree programs across your academic departments."
        actions={
          <button
            onClick={() => {
              setName("");
              setCode("");
              setDepartmentId(departments[0]?.id || "");
              setDegreeLevel("UG");
              setTotalSemesters(6);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Program</span>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface-color)] p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-[var(--font-color)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search programs by name or degree code..."
            className="bg-transparent text-xs w-full text-[var(--title-color)] placeholder:text-[var(--font-color)] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--paragraph-color)] shrink-0 font-bold">Department:</span>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-[var(--background-color)] border border-[var(--border-color)] rounded-[var(--radius-md)] text-[var(--title-color)]"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          ))
        ) : filteredPrograms.length === 0 ? (
          <div className="col-span-full bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-2">
            <GraduationCap className="w-8 h-8 text-[var(--font-color)] mx-auto opacity-40" />
            <p className="text-xs font-bold text-[var(--title-color)]">No Programs Found</p>
            <p className="text-[11px] text-[var(--paragraph-color)]">
              {search || selectedDeptId !== "ALL"
                ? "No programs matched the selected filters."
                : "Click Add Program to register the first curriculum program."}
            </p>
          </div>
        ) : (
          filteredPrograms.map((p) => (
            <div
              key={p.id}
              className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-color)]">
                  <span className="font-mono text-xs font-black text-[#82c341] uppercase tracking-wider">
                    {p.code}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#45525b] text-white">
                    {p.degree_level}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[var(--title-color)] mt-2">
                  {p.name}
                </h3>
                <p className="text-[11px] text-[var(--paragraph-color)] mt-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[var(--font-color)]" />
                  <span>{p.department_name || "Department"}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--paragraph-color)]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[var(--font-color)]" />
                  <span>{p.total_semesters} Semesters</span>
                </span>
                <span className="text-[11px] font-bold text-[#82c341]">
                  Active Curriculum
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Program Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-color)] max-w-md w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--title-color)]">Create Academic Degree Program</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--paragraph-color)] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Program Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bachelor of Computer Applications"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Program Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. BCA"
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--title-color)]">Host Department *</label>
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                >
                  <option value="">-- Choose department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--title-color)]">Degree Level</label>
                  <select
                    value={degreeLevel}
                    onChange={(e) => setDegreeLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                  >
                    <option value="UG">Undergraduate (UG)</option>
                    <option value="PG">Postgraduate (PG)</option>
                    <option value="DIPLOMA">Diploma</option>
                    <option value="PH_D">Doctorate (Ph.D)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--title-color)]">Total Semesters</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={totalSemesters}
                    onChange={(e) => setTotalSemesters(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
                  />
                </div>
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
                  disabled={saving || !departmentId}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] font-black rounded-[var(--radius-md)] uppercase disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
