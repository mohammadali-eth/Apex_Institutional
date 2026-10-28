"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { QuestionPaper } from "@/lib/types";
import { ArrowLeft, Printer, Download, FileCheck, ShieldAlert } from "lucide-react";

export default function ExamPaperPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.id as string;
  const toast = useToast();

  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  useEffect(() => {
    if (paperId) {
      api
        .get<QuestionPaper>(`/question-papers/${paperId}`)
        .then((data) => setPaper(data))
        .catch((err) => toast.error(err.message || "Failed to load examination paper"))
        .finally(() => setLoading(false));
    }
  }, [paperId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async (type: "paper" | "solution" | "marking_scheme") => {
    if (!paper) return;
    setDownloadingType(type);
    try {
      let endpoint = `/question-papers/${paper.id}/pdf`;
      let filePrefix = "Exam_Paper";

      if (type === "solution") {
        endpoint = `/question-papers/${paper.id}/pdf/solution`;
        filePrefix = "CONFIDENTIAL_AnswerKey";
      } else if (type === "marking_scheme") {
        endpoint = `/question-papers/${paper.id}/marking-scheme-pdf`;
        filePrefix = "MarkingScheme";
      }

      const blob = await api.downloadBlob(endpoint);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanTitle = (paper.title || "Examination_Paper").replace(/\s+/g, "_");
      a.download = `${filePrefix}_${cleanTitle}_${paper.id.slice(0, 6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`${type === "paper" ? "Examination paper" : type === "solution" ? "Confidential answer key" : "Marking scheme"} downloaded successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download PDF artifact");
    } finally {
      setDownloadingType(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-[#838383]">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-serif font-semibold text-black">Formatting official university examination sheet...</p>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-black font-serif text-sm">
        Examination paper record not found.
      </div>
    );
  }

  const hours = Math.floor(paper.duration_minutes / 60);
  const mins = paper.duration_minutes % 60;
  const durationStr = mins === 0 ? `${hours} Hours` : `${hours}h ${mins}m`;

  const formatMarks = (m: number) => (m < 10 ? `0${m}` : `${m}`);

  // University Header Metadata
  const univName = (paper.university_name || "KADI SARVA VISHWAVIDYALAYA").toUpperCase();
  const semStr = paper.semester_name || "";
  const progStr = paper.program_name || "";
  const subtitleLine = progStr && semStr 
    ? `[${progStr} - ${semStr} / ${paper.exam_name}]`
    : semStr 
    ? `[${semStr} / ${paper.exam_name}]`
    : `[${paper.exam_name}]`;

  // Standard university instructions
  const defaultInstructions = [
    "Make suitable assumptions wherever necessary.",
    "Figures to the right indicate full marks."
  ];
  const extraInstructions = (paper.instructions || "")
    .split("\n")
    .map((l) => l.replace(/^(?:\d+[\.\)]|\-|\*|•)\s*/, "").trim())
    .filter((l) => l.length > 0 && !defaultInstructions.some((d) => l.toLowerCase().includes(d.toLowerCase())));
  const allInstructions = [...defaultInstructions, ...extraInstructions];

  let globalQuestionNumber = 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Print-specific style overrides */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: "Times New Roman", Times, Georgia, serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Controls Bar (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm no-print">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-black transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Paper Builder</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-800 rounded border border-gray-300 hover:bg-gray-200 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Examination Paper</span>
          </button>

          <button
            onClick={() => handleDownloadPdf("paper")}
            disabled={downloadingType === "paper"}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-black text-white rounded hover:bg-gray-800 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingType === "paper" ? "Generating..." : "Download Official PDF"}</span>
          </button>

          <button
            onClick={() => handleDownloadPdf("solution")}
            disabled={downloadingType === "solution"}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-800 text-white rounded hover:bg-red-900 transition disabled:opacity-50"
            title="Download confidential model answer key & solutions for evaluators"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{downloadingType === "solution" ? "Generating..." : "Answer Key PDF"}</span>
          </button>

          <button
            onClick={() => handleDownloadPdf("marking_scheme")}
            disabled={downloadingType === "marking_scheme"}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-700 text-white rounded hover:bg-gray-800 transition disabled:opacity-50"
            title="Download step-wise evaluation marking scheme"
          >
            <FileCheck className="w-4 h-4" />
            <span>{downloadingType === "marking_scheme" ? "Generating..." : "Marking Scheme PDF"}</span>
          </button>
        </div>
      </div>

      {/* Official Exam Paper Sheet (Authentic KSV University Layout) */}
      <div className="bg-white p-8 sm:p-12 border border-gray-300 shadow-sm print-sheet text-black font-serif">
        {/* University Header */}
        <div className="text-center space-y-1">
          <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-black font-serif">
            {univName}
          </h1>
          <p className="text-xs sm:text-sm font-bold uppercase text-black font-serif">
            {subtitleLine}
          </p>
        </div>

        {/* Candidate Number Box */}
        <div className="mt-4 text-xs font-serif text-black">
          <span className="font-bold">Candidate No.:</span> ______________________________
        </div>

        {/* Metadata Table (Subject Code, Name, Date, Time, Total Marks) */}
        <div className="mt-3 border-t border-b border-black py-2 text-xs font-serif space-y-1.5 text-black">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-bold">Subject Code:</span> {paper.subject_code || "N/A"}
            </div>
            <div>
              <span className="font-bold">Subject Name:</span> {paper.subject_name || paper.title}
            </div>
          </div>
          <div className="flex justify-between items-center pt-0.5 border-t border-gray-200">
            <div>
              <span className="font-bold">Date:</span> ______________
            </div>
            <div className="text-center">
              <span className="font-bold">Time:</span> {durationStr}
            </div>
            <div className="text-right">
              <span className="font-bold">Total Marks:</span> {paper.total_marks}
            </div>
          </div>
        </div>

        {/* Numbered Instructions Block */}
        <div className="mt-3 text-xs font-serif leading-relaxed text-black">
          <p className="font-bold">Instructions:</p>
          <ol className="list-decimal pl-5 space-y-0.5 mt-0.5 text-[11.5px]">
            {allInstructions.map((inst, idx) => (
              <li key={idx}>{inst}</li>
            ))}
          </ol>
        </div>

        <div className="border-b border-black mt-2.5 mb-5" />

        {/* Paper Sections */}
        <div className="space-y-6">
          {paper.sections.map((section) => {
            const secQuestions = section.questions || [];
            if (secQuestions.length === 0) return null;

            // Group consecutive questions by group_id or or_group_id
            const grouped: typeof section.questions[] = [];
            let curGid: string | null = null;
            let curGroup: typeof section.questions = [];

            secQuestions.forEach((pq) => {
              const gid = pq.group_id || pq.or_group_id;
              if (gid) {
                if (gid === curGid) {
                  curGroup.push(pq);
                } else {
                  if (curGroup.length > 0) grouped.push(curGroup);
                  curGid = gid;
                  curGroup = [pq];
                }
              } else {
                if (curGroup.length > 0) {
                  grouped.push(curGroup);
                  curGid = null;
                  curGroup = [];
                }
                grouped.push([pq]);
              }
            });
            if (curGroup.length > 0) grouped.push(curGroup);

            // Determine if this section is an objective block:
            // 3+ questions, all marks <= 2, none are OR groups
            const isObjectiveBlock =
              secQuestions.length >= 3 &&
              secQuestions.every((pq) => pq.marks <= 2) &&
              grouped.every((g) => g.length === 1);

            return (
              <div key={section.id} className="space-y-3">
                {/* Section Header */}
                {(paper.sections.length > 1 || !["DEFAULT", "MAIN"].includes(section.name.toUpperCase())) && (
                  <div className="text-center font-bold text-xs uppercase tracking-wider text-black font-serif my-3">
                    --- {section.name} ---
                    {section.instructions && (
                      <div className="text-[11px] font-normal italic lowercase mt-0.5">
                        ({section.instructions})
                      </div>
                    )}
                  </div>
                )}

                {/* Objective Block Rendering */}
                {isObjectiveBlock ? (
                  (() => {
                    const qNum = globalQuestionNumber++;
                    const secAttemptMarks = section.total_marks || secQuestions.reduce((acc, q) => acc + q.marks, 0);

                    return (
                      <div className="space-y-2.5 break-inside-avoid">
                        {/* Parent Objective Question */}
                        <div className="flex justify-between items-start text-xs font-serif">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="font-bold shrink-0 min-w-[34px]">Q-{qNum}.</span>
                            <div>
                              <span className="font-bold">Answer the following objective questions.</span>
                              {section.instructions && (
                                <div className="text-[11px] italic font-normal">({section.instructions})</div>
                              )}
                            </div>
                          </div>
                          <span className="font-bold shrink-0 pl-2">
                            [{formatMarks(secAttemptMarks)}]
                          </span>
                        </div>

                        {/* Objective Sub-items (1, 2, 3...) */}
                        <div className="space-y-2 pl-4">
                          {secQuestions.map((pq, subIdx) => (
                            <div key={pq.id} className="space-y-1 text-xs font-serif break-inside-avoid">
                              <div className="flex items-start gap-2">
                                <span className="font-bold shrink-0 min-w-[20px]">{subIdx + 1}.</span>
                                <span className="flex-1 leading-relaxed">{pq.question.question_text}</span>
                                {pq.marks > 1 && (
                                  <span className="font-bold shrink-0 pl-2">[{formatMarks(pq.marks)}]</span>
                                )}
                              </div>

                              {/* MCQ Options in 2 Columns */}
                              {pq.question.question_type === "MCQ" && pq.question.options && (
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1 pl-7 text-[11px] font-serif">
                                  {pq.question.options.map((opt) => (
                                    <div key={opt.option_key}>
                                      <span className="font-bold">({opt.option_key})</span> {opt.option_text}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* Standard Questions & OR Alternative Pairs */
                  <div className="space-y-4">
                    {grouped.map((qGroup) => {
                      const qNum = globalQuestionNumber++;
                      const isOrGroup = qGroup.length > 1;

                      return (
                        <div key={qGroup[0].id} className="space-y-2 break-inside-avoid">
                          {qGroup.map((pq, altIdx) => (
                            <React.Fragment key={pq.id}>
                              {altIdx > 0 && (
                                <div className="text-center font-bold text-xs uppercase tracking-widest text-black my-2 font-serif">
                                  OR
                                </div>
                              )}

                              <div className="flex justify-between items-start text-xs font-serif">
                                <div className="flex items-start gap-2 flex-1">
                                  {altIdx === 0 ? (
                                    <span className="font-bold shrink-0 min-w-[34px]">Q-{qNum}.</span>
                                  ) : (
                                    <span className="shrink-0 min-w-[34px]" />
                                  )}

                                  <div className="flex-1 space-y-1.5">
                                    <p className="leading-relaxed text-black">
                                      {pq.question.question_text}
                                    </p>

                                    {/* MCQ Options */}
                                    {pq.question.question_type === "MCQ" && pq.question.options && (
                                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 pl-2 text-[11px] font-serif">
                                        {pq.question.options.map((opt) => (
                                          <div key={opt.option_key}>
                                            <span className="font-bold">({opt.option_key})</span> {opt.option_text}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <span className="font-bold shrink-0 pl-3">
                                  [{formatMarks(pq.marks)}]
                                </span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Paper Footer */}
        <div className="text-center font-serif font-bold text-xs mt-12 pt-4 border-t border-black">
          *** END OF QUESTION PAPER ***
        </div>
      </div>
    </div>
  );
}
