"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Syllabus, Subject, Unit, Topic } from "@/lib/types";
import {
  BookOpen,
  Upload,
  Download,
  Plus,
  ChevronRight,
  ChevronDown,
  Layers,
  FileCheck,
  FileText,
  AlertCircle,
} from "lucide-react";

export default function SyllabusPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedSyllabus, setSelectedSyllabus] = useState<Syllabus | null>(null);
  const [loading, setLoading] = useState(true);

  // Expanded units map
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    subject_id: "",
    title: "",
    description: "",
    file: null as File | null,
  });

  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [newUnit, setNewUnit] = useState({ unit_number: 1, title: "", description: "" });

  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [activeUnitId, setActiveUnitId] = useState<string>("");
  const [newTopic, setNewTopic] = useState({ topic_number: 1, title: "", description: "" });

  const fetchSyllabi = async () => {
    setLoading(true);
    try {
      const [subjData, sylData] = await Promise.all([
        api.get<Subject[]>("/academic/subjects"),
        api.get<Syllabus[]>("/syllabus"),
      ]);
      setSubjects(subjData);
      setSyllabi(sylData);

      if (subjData.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subjData[0].id);
        const match = sylData.find((s) => s.subject_id === subjData[0].id);
        setSelectedSyllabus(match || null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load syllabus records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabi();
  }, []);

  const handleSubjectChange = (subjId: string) => {
    setSelectedSubjectId(subjId);
    const match = syllabi.find((s) => s.subject_id === subjId);
    setSelectedSyllabus(match || null);
  };

  const toggleUnit = (uId: string) => {
    setExpandedUnits((prev) => ({ ...prev, [uId]: !prev[uId] }));
  };

  const handleUploadSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.subject_id || !uploadForm.title) {
      toast.error("Please enter a title and select a subject");
      return;
    }
    const formData = new FormData();
    formData.append("subject_id", uploadForm.subject_id);
    formData.append("title", uploadForm.title);
    if (uploadForm.description) formData.append("description", uploadForm.description);
    if (uploadForm.file) formData.append("file", uploadForm.file);

    try {
      const res = await api.upload<Syllabus>("/syllabus/upload", formData);
      toast.success("Syllabus uploaded and curriculum scaffolded successfully!");
      setUploadModalOpen(false);
      setUploadForm({ subject_id: "", title: "", description: "", file: null });
      fetchSyllabi();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload syllabus");
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSyllabus) return;
    try {
      await api.post(`/syllabus/${selectedSyllabus.id}/units`, newUnit);
      toast.success("Curriculum Unit added successfully!");
      setUnitModalOpen(false);
      setNewUnit({ unit_number: (selectedSyllabus.units.length || 0) + 1, title: "", description: "" });
      fetchSyllabi();
    } catch (err: any) {
      toast.error(err.message || "Failed to add unit");
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUnitId) return;
    try {
      await api.post(`/syllabus/units/${activeUnitId}/topics`, newTopic);
      toast.success("Topic added to unit!");
      setTopicModalOpen(false);
      setNewTopic({ topic_number: 1, title: "", description: "" });
      fetchSyllabi();
    } catch (err: any) {
      toast.error(err.message || "Failed to add topic");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Syllabus Management" },
        ]}
        title="Syllabus & Curriculum Management"
        description="Maintain course outlines, upload official syllabus documents, and structure Units and Topics for automated question generation."
        actions={
          hasPermission("syllabus.upload") ? (
            <button
              onClick={() => {
                setUploadForm((prev) => ({ ...prev, subject_id: selectedSubjectId }));
                setUploadModalOpen(true);
              }}
              className="btn-primary flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Syllabus</span>
            </button>
          ) : undefined
        }
      />

      {/* Subject Selector Bar */}
      <div className="bg-white p-4 rounded-[8px] border border-[#dcdcdc] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-[#82c341]" />
          <span className="text-xs font-bold text-[#44535b]">Select Subject:</span>
          <select
            value={selectedSubjectId}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="px-3 py-1.5 border border-[#dcdcdc] rounded-[6px] text-xs font-semibold bg-[#f6f6f7] text-[#44535b] focus:outline-none focus:border-[#82c341] focus:ring-1 focus:ring-[#82c341]"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name} ({s.program_name})
              </option>
            ))}
          </select>
        </div>

        {selectedSyllabus && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#676767]">
              Curriculum Version: <b className="text-[#44535b]">v{selectedSyllabus.version}</b>
            </span>
            {selectedSyllabus.file_url && (
              <a
                href={selectedSyllabus.file_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-[#f6f6f7] hover:bg-[#eaf5de] border border-[#dcdcdc] text-[#45525b] hover:text-[#000000] text-xs font-semibold rounded-[6px] flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-[#82c341]" />
                <span>Download Document</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Main Content Pane */}
      {loading ? (
        <div className="h-64 bg-[#f6f6f7] animate-pulse rounded-[8px] border border-[#dcdcdc]" />
      ) : selectedSyllabus ? (
        <div className="space-y-4">
          {/* Syllabus Meta Header */}
          <div className="bg-white p-5 rounded-[8px] border border-[#dcdcdc] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Approved Curriculum</Badge>
                <span className="text-xs text-[#838383]">Total Units: {selectedSyllabus.units.length}</span>
              </div>
              <h3 className="text-lg font-bold text-[#44535b] mt-1.5">{selectedSyllabus.title}</h3>
              <p className="text-xs text-[#676767] mt-0.5">
                {selectedSyllabus.description || "Official university course curriculum outline."}
              </p>
            </div>

            {hasPermission("syllabus.update") && (
              <button
                onClick={() => {
                  setNewUnit({ unit_number: selectedSyllabus.units.length + 1, title: "", description: "" });
                  setUnitModalOpen(true);
                }}
                className="btn-secondary flex items-center gap-1.5 self-start md:self-auto text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Unit</span>
              </button>
            )}
          </div>

          {/* Units and Topics Accordion Tree */}
          <div className="space-y-3">
            {selectedSyllabus.units.length > 0 ? (
              selectedSyllabus.units.map((unit) => {
                const isExpanded = expandedUnits[unit.id] ?? true;
                return (
                  <div key={unit.id} className="bg-white rounded-[8px] border border-[#dcdcdc] overflow-hidden shadow-sm">
                    {/* Unit Row */}
                    <div
                      onClick={() => toggleUnit(unit.id)}
                      className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#f6f6f7] transition select-none"
                    >
                      <div className="flex items-center gap-3">
                        <button className="text-[#838383]">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div>
                          <span className="font-bold text-[#44535b] text-sm">{unit.title}</span>
                          {unit.description && (
                            <p className="text-[11px] text-[#676767] mt-0.5">{unit.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs font-semibold text-[#838383] bg-[#f6f6f7] px-2.5 py-0.5 rounded-[4px] border border-[#dcdcdc]">
                          {unit.topics.length} Topics
                        </span>
                        {hasPermission("syllabus.update") && (
                          <button
                            onClick={() => {
                              setActiveUnitId(unit.id);
                              setNewTopic({ topic_number: unit.topics.length + 1, title: "", description: "" });
                              setTopicModalOpen(true);
                            }}
                            className="p-1 text-[#45525b] hover:text-[#000000] hover:bg-[#eaf5de] rounded transition"
                            title="Add topic to this unit"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Topics Sub-tree */}
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-2 bg-[#f6f6f7]/60 border-t border-[#dcdcdc] space-y-2">
                        {unit.topics.length > 0 ? (
                          unit.topics.map((topic) => (
                            <div
                              key={topic.id}
                              className="flex items-start gap-3 p-3 rounded-[6px] bg-white border border-[#dcdcdc] text-xs shadow-xs"
                            >
                              <div className="w-2 h-2 rounded-full bg-[#82c341] mt-1.5 shrink-0" />
                              <div className="flex-1">
                                <p className="font-semibold text-[#44535b]">{topic.title}</p>
                                {topic.description && (
                                  <p className="text-[11px] text-[#676767] mt-0.5">{topic.description}</p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#838383] italic py-2">No topics mapped to this unit yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-8 rounded-[8px] border border-[#dcdcdc] text-center text-[#838383]">
                <Layers className="w-8 h-8 mx-auto mb-2 text-[#dcdcdc]" />
                <p className="text-xs font-semibold text-[#44535b]">No units found in this syllabus.</p>
                <p className="text-[11px] text-[#676767] mt-1">Click "Add Unit" or upload a syllabus document to scaffold automatically.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-[8px] border border-[#dcdcdc] text-center space-y-4 shadow-sm">
          <BookOpen className="w-10 h-10 text-[#dcdcdc] mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-[#44535b]">No Syllabus Configured</h3>
            <p className="text-xs text-[#676767] mt-1 max-w-sm mx-auto">
              This subject does not have an active curriculum uploaded yet. Upload an official document to scaffold units and topics.
            </p>
          </div>
          {hasPermission("syllabus.upload") && (
            <button
              onClick={() => {
                setUploadForm((prev) => ({ ...prev, subject_id: selectedSubjectId }));
                setUploadModalOpen(true);
              }}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Syllabus Document</span>
            </button>
          )}
        </div>
      )}

      {/* UPLOAD MODAL */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Syllabus"
        subtitle="Upload PDF, DOCX, or TXT syllabus document and scaffold units"
        maxWidth="lg"
      >
        <form onSubmit={handleUploadSyllabus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Select Subject *</label>
            <select
              value={uploadForm.subject_id}
              onChange={(e) => setUploadForm({ ...uploadForm, subject_id: e.target.value })}
              required
              className="input-theme"
            >
              <option value="">Choose Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Syllabus Title *</label>
            <input
              type="text"
              placeholder="e.g. 2026-27 Advanced DBMS Curriculum"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              required
              className="input-theme"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Description / Notes</label>
            <textarea
              rows={2}
              placeholder="Syllabus approval notes or department details..."
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              className="input-theme"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Upload File (PDF, DOCX, TXT)</label>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files ? e.target.files[0] : null })}
              className="w-full text-xs text-[#676767] file:mr-4 file:py-2 file:px-4 file:rounded-[6px] file:border-0 file:text-xs file:font-semibold file:bg-[#f6f6f7] file:text-[#44535b] hover:file:bg-[#eaf5de] cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#dcdcdc]">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Upload & Scaffold
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD UNIT MODAL */}
      <Modal
        isOpen={unitModalOpen}
        onClose={() => setUnitModalOpen(false)}
        title="Add Curriculum Unit"
        subtitle="Add a new chapter / module to the course syllabus"
        maxWidth="md"
      >
        <form onSubmit={handleAddUnit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Unit Number</label>
            <input
              type="number"
              min={1}
              value={newUnit.unit_number}
              onChange={(e) => setNewUnit({ ...newUnit, unit_number: parseInt(e.target.value) || 1 })}
              required
              className="input-theme"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Unit Title *</label>
            <input
              type="text"
              placeholder="e.g. Unit 6: Distributed Query Optimization"
              value={newUnit.title}
              onChange={(e) => setNewUnit({ ...newUnit, title: e.target.value })}
              required
              className="input-theme"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Unit Description</label>
            <textarea
              rows={2}
              placeholder="Summary of topics covered..."
              value={newUnit.description}
              onChange={(e) => setNewUnit({ ...newUnit, description: e.target.value })}
              className="input-theme"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#dcdcdc]">
            <button
              type="button"
              onClick={() => setUnitModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Save Unit
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD TOPIC MODAL */}
      <Modal
        isOpen={topicModalOpen}
        onClose={() => setTopicModalOpen(false)}
        title="Add Topic to Unit"
        subtitle="Specify a granular topic item within the curriculum unit"
        maxWidth="md"
      >
        <form onSubmit={handleAddTopic} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Topic Number</label>
            <input
              type="number"
              min={1}
              value={newTopic.topic_number}
              onChange={(e) => setNewTopic({ ...newTopic, topic_number: parseInt(e.target.value) || 1 })}
              required
              className="input-theme"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Topic Title *</label>
            <input
              type="text"
              placeholder="e.g. 6.1 Parallel Joins & Semi-join Reductions"
              value={newTopic.title}
              onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
              required
              className="input-theme"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Topic Description</label>
            <textarea
              rows={2}
              placeholder="Learning objectives..."
              value={newTopic.description}
              onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
              className="input-theme"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#dcdcdc]">
            <button
              type="button"
              onClick={() => setTopicModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Save Topic
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}