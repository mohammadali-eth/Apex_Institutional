"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HODProgramItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  GraduationCap,
  Plus,
  Search,
  BookOpen,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  Power,
} from "lucide-react";

export default function HODProgramsPage() {
  const [programs, setPrograms] = useState<HODProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("ALL");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<HODProgramItem | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("UG");
  const [totalSemesters, setTotalSemesters] = useState(6);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    api
      .get<HODProgramItem[]>("/hod/programs")
      .then((data) => setPrograms(data || []))
      .catch((err) => {
        console.error("Error loading programs:", err);
        setMsg({ type: "error", text: "Failed to load department programs." });
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
      await api.post<HODProgramItem>("/hod/programs", {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        degree_level: degreeLevel,
        total_semesters: totalSemesters,
        is_active: true,
      });
      setMsg({ type: "success", text: "Degree program added successfully." });
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to create program." });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.put<HODProgramItem>(`/hod/programs/${selectedProgram.id}`, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        degree_level: degreeLevel,
        total_semesters: totalSemesters,
      });
      setMsg({ type: "success", text: "Degree program updated successfully." });
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to update program." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: HODProgramItem) => {
    if (!confirm(`Are you sure you want to ${item.is_active ? "deactivate" : "activate"} ${item.name}?`)) {
      return;
    }
    try {
      await api.put(`/hod/programs/${item.id}`, {
        is_active: !item.is_active,
      });
      setMsg({
        type: "success",
        text: `Program ${!item.is_active ? "activated" : "deactivated"} successfully.`,
      });
      loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to update status." });
    }
  };

  const resetForm = () => {
    setName("");
    setCode("");
    setDegreeLevel("UG");
    setTotalSemesters(6);
  };

  const openEditModal = (item: HODProgramItem) => {
    setSelectedProgram(item);
    setName(item.name);
    setCode(item.code);
    setDegreeLevel(item.degree_level);
    setTotalSemesters(item.total_semesters);
    setShowEditModal(true);
  };

  const filteredPrograms = programs.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());

    if (filterLevel === "ALL") return matchesSearch;
    return matchesSearch && p.degree_level === filterLevel;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Degree Programs"
        subtitle="Configure academic programs, curriculum frameworks, and semester configurations for your department."
      >
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition flex items-center gap-1.5 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>New Program</span>
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
            placeholder="Search by program name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Degree Levels</option>
            <option value="UG">Undergraduate (UG)</option>
            <option value="PG">Postgraduate (PG)</option>
            <option value="DIPLOMA">Diploma</option>
            <option value="PH_D">Doctorate (Ph.D.)</option>
          </select>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-[var(--font-color)]">
            Loading department degree programs...
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-[var(--font-color)]">
            No degree programs found matching the search.
          </div>
        ) : (
          filteredPrograms.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-5 shadow-sm space-y-4 hover:border-[#82c341] transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#82c341]/15 text-[#2e5914] border border-[#82c341]/30 uppercase">
                    {item.code}
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#45525b]/10 text-[#45525b]">
                    {item.degree_level}
                  </span>
                  <h3 className="text-base font-bold text-[var(--title-color)] mt-2">
                    {item.name}
                  </h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    item.is_active
                      ? "bg-[#82c341]/20 text-[#2e5914]"
                      : "bg-[#fee2e2] text-[#991b1b]"
                  }`}
                >
                  {item.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[var(--border-color)]">
                <div>
                  <span className="text-[10px] text-[var(--font-color)] uppercase font-semibold">Semesters</span>
                  <p className="font-bold text-[var(--title-color)]">{item.total_semesters} Semesters</p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--font-color)] uppercase font-semibold">Courses</span>
                  <p className="font-bold text-[var(--title-color)]">{item.subjects_count} Subjects</p>
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
                  onClick={() => handleToggleStatus(item)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] transition flex items-center gap-1 ${
                    item.is_active
                      ? "text-[#e53e3e] hover:bg-[#fee2e2]/50"
                      : "text-[#82c341] hover:bg-[#82c341]/10"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{item.is_active ? "Deactivate" : "Activate"}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Program */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Add Degree Program</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Program Name <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bachelor of Computer Applications"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Program Code <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BCA"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Degree Level
                  </label>
                  <select
                    value={degreeLevel}
                    onChange={(e) => setDegreeLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  >
                    <option value="UG">Undergraduate (UG)</option>
                    <option value="PG">Postgraduate (PG)</option>
                    <option value="DIPLOMA">Diploma</option>
                    <option value="PH_D">Doctorate (Ph.D.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Total Semesters
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={totalSemesters}
                    onChange={(e) => setTotalSemesters(parseInt(e.target.value) || 6)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  />
                </div>
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
                  {saving ? "Adding..." : "Add Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Program */}
      {showEditModal && selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Edit Degree Program</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProgram} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Program Name <span className="text-[#e53e3e]">*</span>
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
                  Program Code <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Degree Level
                  </label>
                  <select
                    value={degreeLevel}
                    onChange={(e) => setDegreeLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                  >
                    <option value="UG">Undergraduate (UG)</option>
                    <option value="PG">Postgraduate (PG)</option>
                    <option value="DIPLOMA">Diploma</option>
                    <option value="PH_D">Doctorate (Ph.D.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Total Semesters
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={totalSemesters}
                    onChange={(e) => setTotalSemesters(parseInt(e.target.value) || 6)}
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
