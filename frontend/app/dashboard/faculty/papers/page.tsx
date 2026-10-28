"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { QuestionPaperResponse, FacultySubjectItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  FileText,
  Search,
  Filter,
  Plus,
  Eye,
  Download,
  Send,
  Sparkles,
  Lock,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function FacultyPapersPage() {
  const toast = useToast();
  const [papers, setPapers] = useState<QuestionPaperResponse[]>([]);
  const [subjects, setSubjects] = useState<FacultySubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [search, setSearch] = useState("");

  // Inspect Modal
  const [inspectPaper, setInspectPaper] = useState<QuestionPaperResponse | null>(null);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedStatus) params.status = selectedStatus;

      const res = await api.get<QuestionPaperResponse[]>("/faculty/papers", params);
      setPapers(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load examination papers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get<FacultySubjectItem[]>("/faculty/subjects").then((data) => {
      setSubjects(data || []);
    });
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [selectedSubject, selectedStatus]);

  const handleSubmitPaper = async (paperId: string) => {
    try {
      await api.post(`/faculty/papers/${paperId}/submit`);
      toast.success("Question paper submitted for HOD review!");
      fetchPapers();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit paper for review");
    }
  };

  const filteredPapers = papers.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(s) ||
      p.exam_name?.toLowerCase().includes(s) ||
      p.subject_name?.toLowerCase().includes(s) ||
      p.subject_code?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="My Examination Papers"
        subtitle="Manage official examination question papers created for your courses. Track moderation status, download PDF proofs, and submit drafts."
        action={
          <Link
            href="/dashboard/faculty/paper-generator"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[#82c341] text-black font-semibold text-xs hover:bg-[#72b035] transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create New Exam Paper</span>
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[var(--paragraph-color)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search papers by title or exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-xs text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REVISION_REQUIRED">Revision Required</option>
            <option value="REJECTED">Rejected</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
      </div>

      {/* Papers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          ))}
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="bg-[var(--surface-color)] p-12 text-center rounded-[var(--radius-lg)] border border-[var(--border-color)] text-[var(--paragraph-color)] space-y-2">
          <FileText className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-[var(--title-color)]">No examination papers found</h3>
          <p className="text-xs">You haven't created any question papers matching these filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPapers.map((paper) => {
            const isDraft = ["DRAFT", "REVISION_REQUIRED"].includes(paper.status);
            const isLocked = ["APPROVED", "PUBLISHED", "FINALIZED"].includes(paper.status);

            return (
              <div
                key={paper.id}
                className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-5 shadow-[var(--shadow-sm)] hover:border-[#82c341] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-100 text-blue-800">
                      {paper.subject_code}
                    </span>
                    <StatusBadge status={paper.status} />
                  </div>

                  <h3 className="text-sm font-bold text-[var(--title-color)] line-clamp-2">
                    {paper.title}
                  </h3>

                  <p className="text-xs text-[var(--paragraph-color)] mt-1">
                    {paper.exam_name}
                  </p>

                  <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-gray-100 text-center text-xs">
                    <div className="p-2 rounded bg-gray-50">
                      <span className="text-[10px] text-gray-400 block">Marks</span>
                      <strong className="text-[var(--title-color)]">{paper.total_marks}</strong>
                    </div>
                    <div className="p-2 rounded bg-gray-50">
                      <span className="text-[10px] text-gray-400 block">Duration</span>
                      <strong className="text-[var(--title-color)]">{paper.duration_minutes}m</strong>
                    </div>
                    <div className="p-2 rounded bg-gray-50">
                      <span className="text-[10px] text-gray-400 block">Sections</span>
                      <strong className="text-[var(--title-color)]">{paper.sections?.length || 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInspectPaper(paper)}
                      className="flex-1 py-1.5 px-3 rounded-[var(--radius-md)] border border-gray-300 hover:bg-gray-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-600" />
                      <span>Inspect</span>
                    </button>

                    <a
                      href={`/api/v1/question-papers/${paper.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 rounded-[var(--radius-md)] border border-gray-300 hover:bg-gray-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-600" />
                      <span>PDF</span>
                    </a>
                  </div>

                  {isDraft && (
                    <button
                      onClick={() => handleSubmitPaper(paper.id)}
                      className="w-full py-1.5 px-3 rounded-[var(--radius-md)] bg-[#82c341] text-black font-semibold text-xs hover:bg-[#72b035] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit for Moderation</span>
                    </button>
                  )}

                  {isLocked && (
                    <div className="text-[11px] text-center text-emerald-700 font-semibold py-1 bg-emerald-50 rounded border border-emerald-100 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Paper Approved & Locked</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Paper Modal */}
      <Modal
        isOpen={!!inspectPaper}
        onClose={() => setInspectPaper(null)}
        title="Examination Paper Blueprint & Items"
      >
        {inspectPaper && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded border border-gray-200">
              <div>
                <span className="text-gray-500">Subject:</span>{" "}
                <strong className="text-gray-900">{inspectPaper.subject_code} — {inspectPaper.subject_name}</strong>
              </div>
              <StatusBadge status={inspectPaper.status} />
            </div>

            <div className="space-y-3">
              {inspectPaper.sections?.map((sec) => (
                <div key={sec.id} className="p-3 rounded border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 font-bold text-gray-900">
                    <span>{sec.name}</span>
                    <span className="text-gray-500">{sec.total_marks} Marks</span>
                  </div>

                  {sec.questions.length === 0 ? (
                    <p className="text-gray-400 italic">No questions added to this section.</p>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {sec.questions.map((pq, idx) => (
                        <div key={pq.id} className="p-2 bg-gray-50 rounded text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-700">Q{idx + 1}. [{pq.marks} pts]</span>
                            <span className="text-[10px] text-gray-500">{pq.question.question_type}</span>
                          </div>
                          <p className="text-gray-800">{pq.question.question_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
