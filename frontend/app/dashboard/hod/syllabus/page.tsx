"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { HODSyllabusOverviewItem, HODUnitItem, HODTopicItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Layers,
  Plus,
  BookOpen,
  Edit2,
  Trash2,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function HODSyllabusPage() {
  const searchParams = useSearchParams();
  const preselectedSubjectId = searchParams.get("subject_id");

  const [syllabi, setSyllabi] = useState<HODSyllabusOverviewItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showEditUnitModal, setShowEditUnitModal] = useState(false);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState<HODUnitItem | null>(null);

  // Unit Form states
  const [unitNumber, setUnitNumber] = useState(1);
  const [unitTitle, setUnitTitle] = useState("");
  const [unitDescription, setUnitDescription] = useState("");

  // Topic Form states
  const [topicTitle, setTopicTitle] = useState("");
  const [topicOrder, setTopicOrder] = useState(1);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSyllabi = () => {
    setLoading(true);
    api
      .get<HODSyllabusOverviewItem[]>("/hod/syllabus")
      .then((data) => {
        const list = data || [];
        setSyllabi(list);
        if (list.length > 0) {
          if (preselectedSubjectId && list.some((s) => s.subject_id === preselectedSubjectId)) {
            setSelectedSubjectId(preselectedSubjectId);
          } else if (!selectedSubjectId || !list.some((s) => s.subject_id === selectedSubjectId)) {
            setSelectedSubjectId(list[0].subject_id);
          }
        }
      })
      .catch((err) => {
        console.error("Error loading syllabus overview:", err);
        setMsg({ type: "error", text: "Failed to load department syllabi." });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSyllabi();
  }, []);

  const activeSyllabus = syllabi.find((s) => s.subject_id === selectedSubjectId);

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.post(`/hod/syllabus/${selectedSubjectId}/units`, {
        unit_number: unitNumber,
        title: unitTitle.trim(),
        description: unitDescription.trim() || null,
        hours: 10,
      });
      setMsg({ type: "success", text: `Unit ${unitNumber} added successfully.` });
      setShowAddUnitModal(false);
      resetUnitForm();
      loadSyllabi();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to add unit." });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.put(`/hod/syllabus/units/${selectedUnit.id}`, {
        title: unitTitle.trim(),
        description: unitDescription.trim() || null,
      });
      setMsg({ type: "success", text: "Unit updated successfully." });
      setShowEditUnitModal(false);
      loadSyllabi();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to update unit." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (unit: HODUnitItem) => {
    if (!confirm(`Are you sure you want to delete Unit ${unit.unit_number}: ${unit.title}? This action is protected against units with existing question bank items.`)) {
      return;
    }
    setMsg(null);
    try {
      await api.delete(`/hod/syllabus/units/${unit.id}`);
      setMsg({ type: "success", text: `Unit ${unit.unit_number} deleted successfully.` });
      loadSyllabi();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to delete unit." });
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.post(`/hod/syllabus/units/${selectedUnit.id}/topics`, {
        title: topicTitle.trim(),
        order_index: topicOrder,
      });
      setMsg({ type: "success", text: "Topic added successfully." });
      setShowAddTopicModal(false);
      setTopicTitle("");
      loadSyllabi();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to add topic." });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !uploadFile) return;
    setSaving(true);
    setMsg(null);

    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      await api.upload(`/hod/syllabus/${selectedSubjectId}/upload`, formData);
      setMsg({ type: "success", text: "Syllabus document uploaded and version snapshot recorded." });
      setShowUploadModal(false);
      setUploadFile(null);
      loadSyllabi();
    } catch (err: any) {
      setMsg({ type: "error", text: err.detail || err.message || "Failed to upload document." });
    } finally {
      setSaving(false);
    }
  };

  const resetUnitForm = () => {
    const nextNum = (activeSyllabus?.units.length || 0) + 1;
    setUnitNumber(nextNum);
    setUnitTitle("");
    setUnitDescription("");
  };

  const openEditUnitModal = (unit: HODUnitItem) => {
    setSelectedUnit(unit);
    setUnitNumber(unit.unit_number);
    setUnitTitle(unit.title);
    setUnitDescription(unit.description || "");
    setShowEditUnitModal(true);
  };

  const openAddTopicModal = (unit: HODUnitItem) => {
    setSelectedUnit(unit);
    setTopicOrder((unit.topics.length || 0) + 1);
    setTopicTitle("");
    setShowAddTopicModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Syllabus & Units"
        subtitle="Manage curriculum structure, module topics, safe unit deletions, and official syllabus document uploads."
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={!selectedSubjectId}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-[var(--title-color)] text-xs font-bold rounded-[var(--radius-md)] border border-[var(--border-color)] shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-[#45525b]" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={() => {
              resetUnitForm();
              setShowAddUnitModal(true);
            }}
            disabled={!selectedSubjectId}
            className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Unit</span>
          </button>
        </div>
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

      {/* Subject Selector & Syllabus Document Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Subject Picker */}
        <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm space-y-3">
          <label className="block text-xs font-bold text-[var(--title-color)]">
            Select Department Course
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341] font-semibold"
          >
            {syllabi.map((s) => (
              <option key={s.subject_id} value={s.subject_id}>
                {s.subject_code} — {s.subject_name}
              </option>
            ))}
          </select>
          {activeSyllabus && (
            <p className="text-[11px] text-[var(--font-color)]">
              Degree: <span className="font-semibold text-[var(--title-color)]">{activeSyllabus.program_name || "Department Course"}</span>
            </p>
          )}
        </div>

        {/* Syllabus Document Card */}
        <div className="lg:col-span-2 bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#82c341]/15 text-[#2e5914] border border-[#82c341]/30">
                {activeSyllabus?.version || "v1.0"}
              </span>
              <h3 className="text-sm font-bold text-[var(--title-color)]">
                {activeSyllabus ? `${activeSyllabus.subject_name} Syllabus` : "No Subject Selected"}
              </h3>
            </div>
            <p className="text-xs text-[var(--paragraph-color)]">
              {activeSyllabus?.units_count || 0} Curriculum Units configured in syllabus.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeSyllabus?.document_url ? (
              <a
                href={activeSyllabus.document_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-[#45525b] hover:bg-[#3c474f] text-white text-xs font-bold rounded-[var(--radius-md)] transition flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#82c341]" />
                <span>View Uploaded File</span>
                <ExternalLink className="w-3 h-3 text-[#dce1e4]" />
              </a>
            ) : (
              <span className="text-xs text-[var(--font-color)] italic">No document file attached</span>
            )}
          </div>
        </div>
      </div>

      {/* Units & Topics Accordion / List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--font-color)] bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
            Loading syllabus structure...
          </div>
        ) : !activeSyllabus || activeSyllabus.units.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--font-color)] bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
            <Layers className="w-8 h-8 text-[var(--font-color)] mx-auto opacity-50" />
            <p>No curriculum units configured yet for this subject.</p>
            <button
              onClick={() => {
                resetUnitForm();
                setShowAddUnitModal(true);
              }}
              className="px-3.5 py-1.5 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-bold rounded-[var(--radius-md)] inline-flex items-center gap-1.5 uppercase"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Unit</span>
            </button>
          </div>
        ) : (
          activeSyllabus.units.map((unit) => (
            <div
              key={unit.id}
              className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-sm"
            >
              {/* Unit Header */}
              <div className="p-4 bg-[var(--background-color)]/50 border-b border-[var(--border-color)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[#45525b] text-[#82c341] font-bold text-xs flex items-center justify-center shrink-0">
                    U{unit.unit_number}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--title-color)]">
                      Unit {unit.unit_number}: {unit.title}
                    </h4>
                    {unit.description && (
                      <p className="text-xs text-[var(--paragraph-color)] mt-0.5">{unit.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    onClick={() => openAddTopicModal(unit)}
                    className="px-2.5 py-1 text-xs font-bold text-[#82c341] hover:bg-[#82c341]/10 rounded-[var(--radius-sm)] transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Topic</span>
                  </button>
                  <button
                    onClick={() => openEditUnitModal(unit)}
                    className="p-1.5 text-[var(--paragraph-color)] hover:text-[#45525b] hover:bg-[var(--surface-color)] rounded-[var(--radius-sm)] transition"
                    title="Edit Unit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteUnit(unit)}
                    className="p-1.5 text-[var(--paragraph-color)] hover:text-[#e53e3e] hover:bg-[var(--surface-color)] rounded-[var(--radius-sm)] transition"
                    title="Delete Unit (Safe Guard)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Topics List */}
              <div className="p-4">
                {unit.topics.length === 0 ? (
                  <p className="text-xs text-[var(--font-color)] italic">
                    No individual topics defined for this unit. Click &quot;Add Topic&quot; to outline sub-sections.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {unit.topics.map((t, idx) => (
                      <div
                        key={t.id}
                        className="p-2.5 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center gap-2 text-xs"
                      >
                        <span className="font-mono text-[10px] font-bold text-[var(--font-color)]">
                          {unit.unit_number}.{idx + 1}
                        </span>
                        <span className="font-medium text-[var(--title-color)] truncate">{t.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Unit */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Add Curriculum Unit</h3>
              </div>
              <button onClick={() => setShowAddUnitModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUnit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Unit Number <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Unit Title <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asymptotic Analysis & Recurrences"
                  value={unitTitle}
                  onChange={(e) => setUnitTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Description / Syllabus Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Key concepts, algorithms, and practical targets covered in this unit..."
                  value={unitDescription}
                  onChange={(e) => setUnitDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--paragraph-color)] hover:bg-[var(--background-color)] rounded-[var(--radius-md)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
                >
                  {saving ? "Adding..." : "Add Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Unit */}
      {showEditUnitModal && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Edit Unit {selectedUnit.unit_number}</h3>
              </div>
              <button onClick={() => setShowEditUnitModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUnit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Unit Title <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={unitTitle}
                  onChange={(e) => setUnitTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={unitDescription}
                  onChange={(e) => setUnitDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditUnitModal(false)}
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

      {/* Modal: Add Topic */}
      {showAddTopicModal && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Add Topic to Unit {selectedUnit.unit_number}</h3>
              </div>
              <button onClick={() => setShowAddTopicModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTopic} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Topic Title <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Theorem for Divide-and-Conquer"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Topic Order Number
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={topicOrder}
                  onChange={(e) => setTopicOrder(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTopicModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--paragraph-color)] hover:bg-[var(--background-color)] rounded-[var(--radius-md)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
                >
                  {saving ? "Adding..." : "Add Topic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Syllabus Document */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#45525b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#82c341]" />
                <h3 className="font-bold text-sm">Upload Official Syllabus Document</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-[#dce1e4] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="p-6 space-y-4">
              <p className="text-xs text-[var(--paragraph-color)]">
                Upload the approved course syllabus document (PDF, DOC, DOCX up to 10 MB). This updates the syllabus revision record.
              </p>

              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                  Select Document File <span className="text-[#e53e3e]">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[var(--paragraph-color)] file:mr-3 file:py-2 file:px-3 file:rounded-[var(--radius-md)] file:border-0 file:text-xs file:font-bold file:bg-[#82c341] file:text-[#000000] hover:file:bg-[#72b036] cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--paragraph-color)] hover:bg-[var(--background-color)] rounded-[var(--radius-md)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !uploadFile}
                  className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
                >
                  {saving ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
