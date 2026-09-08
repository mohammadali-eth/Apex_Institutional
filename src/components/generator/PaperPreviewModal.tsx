import React from 'react';
import { PreviousPaper } from '../../types';
import { Modal } from '../common/Modal';
import { BookmarkCheck, Printer, FileDown, ShieldAlert } from 'lucide-react';

interface PaperPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper?: PreviousPaper;
  onUseAsReference?: (paper: PreviousPaper) => void;
}

export const PaperPreviewModal: React.FC<PaperPreviewModalProps> = ({
  isOpen,
  onClose,
  paper,
  onUseAsReference,
}) => {
  if (!isOpen || !paper) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
            {paper.id}
          </span>
          <span>Question Paper Master Preview</span>
        </div>
      }
      subtitle="Read-only Examination Paper Archive Copy"
      maxWidth="5xl"
    >
      <div className="space-y-6">
        {/* Historical Non-editable Warning Banner (Requirement #13) */}
        <div className="bg-slate-100 border-l-4 border-slate-500 p-3 rounded-r-lg text-xs text-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <span>
              <strong>Historical Master Archive:</strong> This paper is an official university examination document and cannot be modified directly.
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Preview</span>
            </button>
          </div>
        </div>

        {/* Paper Container Designed to resemble realistic printed University Question Paper */}
        <div className="bg-white border-2 border-slate-800 rounded-lg p-8 shadow-inner font-serif text-slate-900 paper-preview-watermark">
          {/* Paper Header (Requirement #13) */}
          <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
            <div className="text-xs uppercase font-sans tracking-widest text-slate-500 font-bold">
              Autonomous Examination Assessment Board
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wider text-slate-950 font-serif">
              Apex Institute of Technology & Science
            </h2>
            <div className="text-sm font-semibold text-slate-700">
              Department of {paper.departmentId === 'dept-cs' ? 'Computer Science & Engineering' : 'Electrical Engineering'}
            </div>
            <div className="text-sm text-slate-800 font-medium">
              {paper.programName} — Semester {paper.semesterId?.replace('sem-', '') || '3'} Regular Examinations
            </div>
          </div>

          {/* Paper Key Metadata Grid (Requirement #13) */}
          <div className="py-4 border-b border-slate-800 text-xs font-sans grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
            <div>
              <span className="text-slate-500 block font-normal">Subject & Code:</span>
              <strong className="text-slate-900 font-semibold text-sm">{paper.subjectName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block font-normal">Academic Year:</span>
              <strong className="text-slate-900 font-semibold text-sm">{paper.academicYear}</strong>
            </div>
            <div>
              <span className="text-slate-500 block font-normal">Time Allowed:</span>
              <strong className="text-slate-900 font-semibold text-sm">{paper.duration}</strong>
            </div>
            <div>
              <span className="text-slate-500 block font-normal">Maximum Marks:</span>
              <strong className="text-slate-900 font-semibold text-sm">{paper.totalMarks}</strong>
            </div>
            <div>
              <span className="text-slate-500 block font-normal">Paper Set:</span>
              <strong className="text-slate-900 font-semibold text-sm">SET {paper.set}</strong>
            </div>
            <div>
              <span className="text-slate-500 block font-normal">Generated Date:</span>
              <strong className="text-slate-900 font-semibold text-sm">{paper.generatedAt}</strong>
            </div>
            <div>
              <span className="text-slate-500 block font-normal">Language:</span>
              <strong className="text-slate-900 font-semibold text-sm">{paper.language}</strong>
            </div>
            <div>
              <span className="text-slate-500 block font-normal">Approved By:</span>
              <strong className="text-slate-900 font-semibold text-sm">{paper.createdBy}</strong>
            </div>
          </div>

          {/* General Instructions */}
          <div className="py-3 border-b border-dashed border-slate-400 text-xs font-sans text-slate-600 space-y-1">
            <strong className="text-slate-800 uppercase tracking-wider block font-bold">General Instructions to Candidates:</strong>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Check that the question paper contains the designated number of questions and sections.</li>
              <li>Figures to the right indicate full marks allocated to each sub-question.</li>
              <li>Assume suitable data wherever necessary and state assumptions clearly.</li>
            </ol>
          </div>

          {/* Sections & Questions Content (Requirement #13) */}
          <div className="pt-6 space-y-8 font-serif">
            {paper.sections && paper.sections.length > 0 ? (
              paper.sections.map((section, sIdx) => (
                <div key={section.id} className="space-y-4">
                  {/* Section Title */}
                  <div className="border-b border-slate-400 pb-1 flex justify-between items-baseline">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
                      {section.title}
                    </h3>
                    <span className="text-xs font-sans font-semibold text-slate-600">
                      [{section.marksPerQuestion} Mark Each]
                    </span>
                  </div>
                  <p className="text-xs italic font-sans text-slate-600">{section.instructions}</p>

                  {/* Section Questions */}
                  <div className="space-y-4 pl-2">
                    {section.questions.map((q, qIdx) => (
                      <div key={q.id} className="text-sm leading-relaxed">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                            <span className="font-bold mr-2">Q{qIdx + 1}.</span>
                            <span>{q.text}</span>
                            <span className="text-[10px] font-sans text-slate-400 ml-2">
                              [{q.questionId} • v{q.version}]
                            </span>
                          </div>
                          <span className="font-sans font-bold text-xs whitespace-nowrap">
                            [{q.marks}]
                          </span>
                        </div>

                        {/* MCQ Options */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mt-2 pl-6 font-sans text-xs text-slate-700">
                            {q.options.map(opt => (
                              <div key={opt.key} className="flex items-center space-x-1.5">
                                <span className="font-bold text-slate-900">({opt.key})</span>
                                <span>{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider border-b border-slate-400 pb-1 font-sans">
                    SECTION A: Objective Concepts & Definitions (10 x 1 = 10 Marks)
                  </h3>
                  <p className="text-sm py-3 pl-2">
                    1. Define asymptotic notations Big-O, Big-Omega, and Theta with standard mathematical bounds. [2]
                    <br />
                    2. State advantages of header linked lists over traditional single linked lists. [2]
                    <br />
                    3. Calculate the address of element A[3][4] in a row-major 2D array of base address 1000. [2]
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider border-b border-slate-400 pb-1 font-sans">
                    SECTION B: Detailed Algorithmic Questions (4 x 5 = 20 Marks)
                  </h3>
                  <p className="text-sm py-3 pl-2">
                    4. Write an algorithm to convert an infix mathematical expression to postfix using a stack. [5]
                    <br />
                    5. Construct an AVL tree by inserting elements: 45, 20, 60, 15, 25, 50, 70, 22. Illustrate rotations. [5]
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 text-center text-xs font-sans text-slate-400 tracking-widest uppercase">
            *** End of Question Paper ***
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Close
          </button>

          {onUseAsReference && (
            <button
              type="button"
              onClick={() => {
                onUseAsReference(paper);
                onClose();
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition"
            >
              <BookmarkCheck className="h-4 w-4" />
              <span>Use as Reference</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
