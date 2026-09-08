import React, { useState } from 'react';
import { Question, QuestionVersion, User } from '../../types';
import { Badge } from '../common/Badge';
import { VersionHistoryTimeline } from './VersionHistoryTimeline';
import { VersionCompareModal } from './VersionCompareModal';
import { Modal } from '../common/Modal';
import { canUserEditQuestion, canUserReviewQuestion } from '../../services/permissionService';
import { questionService } from '../../services/questionService';
import {
  ArrowLeft,
  Edit3,
  Copy,
  Archive,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  UserCheck,
  Building,
  Tag,
  BookOpen,
  HelpCircle
} from 'lucide-react';

interface QuestionDetailsViewProps {
  questionId: string;
  currentUser: User;
  onBack: () => void;
  onEdit: (questionId: string) => void;
  onQuestionUpdated: () => void;
}

export const QuestionDetailsView: React.FC<QuestionDetailsViewProps> = ({
  questionId,
  currentUser,
  onBack,
  onEdit,
  onQuestionUpdated,
}) => {
  const [question, setQuestion] = useState<Question | undefined>(() => questionService.getQuestionById(questionId));
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [selectedVersionForView, setSelectedVersionForView] = useState<QuestionVersion | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  if (!question) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-6 text-center">
        <HelpCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Question Not Found</h2>
        <p className="text-slate-500 mt-1 mb-6">The requested question ID could not be loaded.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
        >
          Return to Question Bank
        </button>
      </div>
    );
  }

  const editPermission = canUserEditQuestion(currentUser, question);
  const canReview = canUserReviewQuestion(currentUser, question);

  const handleDuplicate = () => {
    const dup = questionService.duplicateQuestion(question.id, currentUser);
    if (dup) {
      alert(`Question duplicated as new draft: ${dup.id}`);
      onQuestionUpdated();
      onBack();
    }
  };

  const handleArchive = () => {
    if (window.confirm(`Archive question ${question.id}?`)) {
      questionService.archiveQuestion(question.id);
      setQuestion(questionService.getQuestionById(question.id));
      onQuestionUpdated();
    }
  };

  const handleSubmitForReview = () => {
    questionService.submitForReview(question.id, currentUser);
    setQuestion(questionService.getQuestionById(question.id));
    onQuestionUpdated();
  };

  const handleApprove = () => {
    questionService.approveQuestion(question.id, currentUser);
    setQuestion(questionService.getQuestionById(question.id));
    onQuestionUpdated();
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) return;
    questionService.rejectQuestion(question.id, currentUser, rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
    setQuestion(questionService.getQuestionById(question.id));
    onQuestionUpdated();
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-8">
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            title="Back to Questions"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{question.id}</h1>
              <Badge status={question.status}>{question.status}</Badge>
              <Badge difficulty={question.difficulty}>{question.difficulty}</Badge>
              <span className="text-xs bg-brand-secondary/10 text-brand-secondary font-semibold px-2 py-0.5 rounded border border-brand-secondary/20">
                {question.marks} {question.marks === 1 ? 'Mark' : 'Marks'}
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                v{question.version}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {question.subjectName} • {question.unitName}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Edit Button with Permission Protection */}
          {editPermission.allowed ? (
            <button
              type="button"
              onClick={() => onEdit(question.id)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg shadow-sm transition"
            >
              <Edit3 className="h-4 w-4" />
              <span>{question.status === 'Approved' ? 'Edit (New Version)' : 'Edit Question'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-slate-400 bg-slate-100 rounded-lg border border-slate-200 cursor-not-allowed"
              title={editPermission.reason}
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit (Locked)</span>
            </button>
          )}

          {/* Duplicate Button */}
          <button
            type="button"
            onClick={handleDuplicate}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition"
          >
            <Copy className="h-4 w-4 text-slate-500" />
            <span>Duplicate</span>
          </button>

          {/* Submit for Review (if Draft or Rejected) */}
          {(question.status === 'Draft' || question.status === 'Rejected') && editPermission.allowed && (
            <button
              type="button"
              onClick={handleSubmitForReview}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-brand-secondary bg-brand-secondary/10 border border-brand-secondary/30 hover:bg-brand-secondary/20 rounded-lg transition"
            >
              <Send className="h-4 w-4" />
              <span>Submit for Review</span>
            </button>
          )}

          {/* Reviewer Actions (if Submitted and Authorized) */}
          {question.status === 'Submitted' && canReview && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={handleApprove}
                className="inline-flex items-center space-x-1 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Approve</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="inline-flex items-center space-x-1 px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 rounded-lg transition"
              >
                <XCircle className="h-4 w-4" />
                <span>Reject</span>
              </button>
            </div>
          )}

          {/* Archive */}
          {question.status !== 'Archived' && editPermission.allowed && (
            <button
              type="button"
              onClick={handleArchive}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              title="Archive Question"
            >
              <Archive className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Permission Explanation Banner if restricted */}
      {!editPermission.allowed && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center space-x-2">
          <Building className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span><strong>Permission Notice:</strong> {editPermission.reason}</span>
        </div>
      )}

      {/* Versioning Banner if approved */}
      {question.status === 'Approved' && editPermission.allowed && (
        <div className="p-4 bg-brand-primary-light border border-brand-primary/30 rounded-xl text-xs text-brand-title flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-brand-primary flex-shrink-0" />
          <span>
            <strong>Production Approved Question:</strong> Editing this question will automatically create a <strong>New Draft Version (v{question.version + 1})</strong> for review without disrupting historical question papers.
          </span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Question Content & Solutions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question Text Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <FileText className="h-4 w-4 text-brand-600" />
              <span>Question Content ({question.type.toUpperCase()})</span>
            </h3>
            <div className="text-base text-slate-900 leading-relaxed font-serif bg-slate-50/60 p-4 rounded-lg border border-slate-100">
              {question.text}
            </div>

            {/* MCQ Options Display if applicable */}
            {question.type === 'mcq' && question.options && (
              <div className="mt-4 space-y-2">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Options:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {question.options.map((opt) => {
                    const isCorrect = opt.key === question.correctAnswer;
                    return (
                      <div
                        key={opt.key}
                        className={`p-3 rounded-lg border text-sm flex items-start space-x-2.5 ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {opt.key}
                        </span>
                        <div className="flex-1">
                          <span>{opt.text}</span>
                          {isCorrect && (
                            <span className="block text-[10px] text-emerald-700 uppercase font-bold mt-0.5">
                              Correct Key
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Model Answer / Solution */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Model Answer / Marking Scheme
            </h3>
            <div className="text-sm text-slate-700 leading-relaxed bg-emerald-50/30 p-4 rounded-lg border border-emerald-100">
              {question.answer}
            </div>
          </div>

          {/* Version History Component */}
          <VersionHistoryTimeline
            versions={question.versionHistory}
            onCompareVersions={() => setIsCompareOpen(true)}
            onViewVersion={(v) => setSelectedVersionForView(v)}
          />
        </div>

        {/* Right 1 Col: Metadata & Audit Trail */}
        <div className="space-y-6">
          {/* Academic Context Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <BookOpen className="h-4 w-4 text-brand-600" />
              <span>Academic Context</span>
            </h3>

            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold block">Subject</span>
              <span className="text-sm font-medium text-slate-800">{question.subjectName}</span>
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold block">Department</span>
              <span className="text-sm font-medium text-slate-800">
                {question.departmentId === 'dept-cs' ? 'Computer Science & Engineering' : 'Electrical Engineering'}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold block">Unit</span>
              <span className="text-sm text-slate-700">{question.unitName}</span>
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold block">Chapter</span>
              <span className="text-sm text-slate-700">{question.chapterName}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold block">Language</span>
                <span className="text-sm font-medium text-slate-800">{question.language}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold block">Type</span>
                <span className="text-sm font-medium text-slate-800 capitalize">{question.type}</span>
              </div>
            </div>

            {/* Tags */}
            {question.tags && question.tags.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400 uppercase font-semibold block mb-1.5 flex items-center space-x-1">
                  <Tag className="h-3 w-3" />
                  <span>Tags</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {question.tags.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Audit Trail Card (Requirement #27) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span>Audit Information</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Created By:</span>
                <span className="font-semibold text-slate-800">{question.createdBy}</span>
                <span className="text-slate-500 block text-[11px]">{question.createdAt}</span>
              </div>

              {question.updatedBy && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block font-medium">Last Modified By:</span>
                  <span className="font-semibold text-slate-800">{question.updatedBy}</span>
                  <span className="text-slate-500 block text-[11px]">{question.updatedAt}</span>
                </div>
              )}

              {question.approvedBy && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block font-medium">Approved By:</span>
                  <span className="font-semibold text-emerald-700">{question.approvedBy}</span>
                  <span className="text-slate-500 block text-[11px]">{question.approvedAt}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-slate-500">
                <span>Current Active Version:</span>
                <span className="font-bold text-slate-900">v{question.version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Version Comparison Modal */}
      <VersionCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        question={question}
      />

      {/* Single Version View Modal */}
      {selectedVersionForView && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVersionForView(null)}
          title={`Version ${selectedVersionForView.version} Snapshot`}
          subtitle={`Edited by ${selectedVersionForView.editedBy} on ${selectedVersionForView.editedAt}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center space-x-2">
              <Badge status={selectedVersionForView.status}>{selectedVersionForView.status}</Badge>
              <Badge difficulty={selectedVersionForView.difficulty}>{selectedVersionForView.difficulty}</Badge>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                {selectedVersionForView.marks} Marks
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase text-xs block mb-1">Question Text:</span>
              <p className="p-3 bg-slate-50 rounded border text-slate-800">{selectedVersionForView.text}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase text-xs block mb-1">Answer:</span>
              <p className="p-3 bg-slate-50 rounded border text-slate-700">{selectedVersionForView.answer}</p>
            </div>
            {selectedVersionForView.comments && (
              <div>
                <span className="font-bold text-slate-500 uppercase text-xs block mb-1">Review Notes:</span>
                <p className="p-2 bg-amber-50 text-amber-900 rounded border border-amber-200 text-xs">
                  {selectedVersionForView.comments}
                </p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedVersionForView(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowRejectModal(false)}
          title="Reject Question Revision"
          subtitle="Provide detailed feedback so the author can address deficiencies."
          maxWidth="md"
        >
          <div className="space-y-4">
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain reasons for rejection..."
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 rounded hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
