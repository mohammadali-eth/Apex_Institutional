"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { QuestionPaper, Subject } from "@/lib/types";
import {
  FileText,
  Plus,
  Sparkles,
  Search,
  Eye,
  Edit,
  Download,
  CheckCircle,
  Clock,
  Printer,
} from "lucide-react";

export default function QuestionPapersPage() {
  const { user, hasPermission } = useAuth();
  const toast = useToast();

  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Create Manual Paper Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    subject_id: "",
    title: "Mid-Term Examination",
    exam_name: "End Semester Examination 2026-27",
    total_marks: 70,
    duration_minutes: 180,
    instructions: "1. Answer all questions in Section A.\n2. In Section B and C, answer required questions.",
  });

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedStatus) params.status = selectedStatus;

      const data = await api.get<QuestionPaper[]>("/question-papers", params);
      setPapers(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load examination papers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get<Subject[]>("/academic/subjects").then((data) => {
      setSubjects(data);
      if (data.length > 0 && !manualForm.subject_id) {
        setManualForm((prev) => ({ ...prev, subject_id: data[0].id }));
      }
    });
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [selectedSubject, selectedStatus]);

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.subject_id || !manualForm.title) {
      toast.error("Please fill in title and subject");
      return;
    }
    try {
      const res = await api.post<QuestionPaper>("/question-papers", manualForm);
      toast.success("Draft question paper initialized!");
      setManualModalOpen(false);
      fetchPapers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create paper");
    }
  };

  const handleDownloadPdf = async (paperId: string, title: string) => {
    try {
      const blob = await api.downloadBlob(`/question-papers/${paperId}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Exam paper PDF downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to generate PDF");
    }
  };

  const isStudent = user?.role_name === "STUDENT";

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Question Papers" },
        ]}
        title="Question Papers Repository"
        description="Manage official question paper lifecycles, automated blueprints, visual builders, and print outputs."
        actions={
          !isStudent ? (
            <div className="flex items-center gap-2">
              <Link
                href="/question-papers/generator"
                className="btn-primary flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Automated Generator</span>
              </Link>
              <button
                onClick={() => setManualModalOpen(true)}
                className="btn-secondary flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Draft Paper</span>
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[8px] border border-[#dcdcdc] shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="w-full sm:w-64 px-3 py-1.5 border border-[#dcdcdc] rounded-[6px] text-xs bg-[#f6f6f7] text-[#44535b] font-medium focus:outline-none focus:border-[#82c341]"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} - {s.name}
            </option>
          ))}
        </select>

        {!isStudent && (
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-48 px-3 py-1.5 border border-[#dcdcdc] rounded-[6px] text-xs bg-[#f6f6f7] text-[#44535b] font-medium focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="GENERATED">Generated</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="PUBLISHED">Published</option>
          </select>
        )}
      </div>

      {/* Papers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-[#f6f6f7] animate-pulse rounded-[8px] border border-[#dcdcdc]" />
          ))}
        </div>
      ) : papers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map((p) => {
            const totalQuestionsInPaper = p.sections.reduce((acc, s) => acc + s.questions.length, 0);

            return (
              <div
                key={p.id}
                className="bg-white rounded-[8px] border border-[#dcdcdc] p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#2d5016] bg-[#eaf5de] px-2 py-0.5 rounded-[4px] border border-[#82c341]/30">
                      {p.subject_code}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>

                  <h3 className="font-bold text-[#44535b] text-sm">{p.title}</h3>
                  <p className="text-xs text-[#676767] mt-0.5">{p.exam_name}</p>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#dcdcdc] text-xs">
                    <div>
                      <span className="text-[10px] text-[#838383] block font-semibold uppercase">MAX MARKS</span>
                      <span className="font-bold text-[#44535b]">{p.total_marks} M</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#838383] block font-semibold uppercase">CURRENT</span>
                      <span
                        className={`font-bold ${
                          p.current_marks === p.total_marks ? "text-[#2d5016]" : "text-amber-700"
                        }`}
                      >
                        {p.current_marks} M
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#838383] block font-semibold uppercase">QUESTIONS</span>
                      <span className="font-bold text-[#44535b]">{totalQuestionsInPaper} Qs</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#dcdcdc] gap-2">
                  <Link
                    href={`/question-papers/${p.id}/preview`}
                    className="px-3 py-1.5 bg-[#f6f6f7] hover:bg-[#eaf5de] border border-[#dcdcdc] text-[#44535b] text-xs font-semibold rounded-[6px] transition flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#82c341]" />
                    <span>Preview</span>
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {!isStudent && (
                      <Link
                        href={`/question-papers/${p.id}`}
                        className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Builder</span>
                      </Link>
                    )}

                    <button
                      onClick={() => handleDownloadPdf(p.id, p.title)}
                      className="p-1.5 bg-white border border-[#dcdcdc] hover:bg-[#f6f6f7] text-[#44535b] rounded-[6px] transition"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-[#82c341]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-[8px] border border-[#dcdcdc] text-center space-y-3 shadow-sm">
          <FileText className="w-10 h-10 text-[#dcdcdc] mx-auto" />
          <h3 className="font-bold text-[#44535b] text-sm">No Examination Papers Found</h3>
          <p className="text-xs text-[#676767] max-w-sm mx-auto">
            {isStudent
              ? "No published examination papers are currently available for review."
              : "Generate an automated question paper blueprint or initialize a draft paper."}
          </p>
          {!isStudent && (
            <Link
              href="/question-papers/generator"
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Paper Generator</span>
            </Link>
          )}
        </div>
      )}

      {/* CREATE MANUAL DRAFT MODAL */}
      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Create Draft Examination Paper"
        subtitle="Initialize a blank question paper for manual question curation"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateManual} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Subject *</label>
            <select
              value={manualForm.subject_id}
              onChange={(e) => setManualForm({ ...manualForm, subject_id: e.target.value })}
              required
              className="input-theme"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1">Paper Title *</label>
              <input
                type="text"
                placeholder="e.g. End Semester Examination - DBMS"
                value={manualForm.title}
                onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                required
                className="input-theme"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1">Exam Name *</label>
              <input
                type="text"
                placeholder="e.g. End Semester Examination 2026-27"
                value={manualForm.exam_name}
                onChange={(e) => setManualForm({ ...manualForm, exam_name: e.target.value })}
                required
                className="input-theme"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1">Total Marks</label>
              <input
                type="number"
                value={manualForm.total_marks}
                onChange={(e) => setManualForm({ ...manualForm, total_marks: parseInt(e.target.value) || 70 })}
                className="input-theme"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44535b] mb-1">Duration (Minutes)</label>
              <input
                type="number"
                value={manualForm.duration_minutes}
                onChange={(e) =>
                  setManualForm({ ...manualForm, duration_minutes: parseInt(e.target.value) || 180 })
                }
                className="input-theme"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44535b] mb-1">Candidate Instructions</label>
            <textarea
              rows={3}
              value={manualForm.instructions}
              onChange={(e) => setManualForm({ ...manualForm, instructions: e.target.value })}
              className="input-theme"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#dcdcdc]">
            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Initialize Paper
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}