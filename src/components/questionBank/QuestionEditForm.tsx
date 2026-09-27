import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Question, User, QuestionType, DifficultyLevel, QuestionLanguage, McqOption, BloomLevel } from '../../types';
import { questionService } from '../../services/questionService';
import { loadDemoState } from '../../store/demoState';
import { UnsavedChangesModal } from '../common/UnsavedChangesModal';
import { Badge } from '../common/Badge';
import {
  Save,
  Send,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';

interface QuestionEditFormProps {
  questionId?: string; // If undefined, creating a new question
  currentUser: User;
  onCancel: () => void;
  onSaved: (questionId: string) => void;
}

export const QuestionEditForm: React.FC<QuestionEditFormProps> = ({
  questionId,
  currentUser,
  onCancel,
  onSaved,
}) => {
  const { showToast } = useToast();
  const isEditMode = Boolean(questionId);
  const existingQuestion = questionId ? questionService.getQuestionById(questionId) : undefined;
  const academic = loadDemoState();

  // Form State
  const permittedSubjects = academic.subjects.filter(s => currentUser.role === 'super_admin' || currentUser.role === 'university_admin' || currentUser.role === 'institution_admin' || (currentUser.subjectIds || []).includes(s.id));
  const [subjectId, setSubjectId] = useState(existingQuestion?.subjectId || permittedSubjects[0]?.id || 'sub-ds');
  const [unitId, setUnitId] = useState(existingQuestion?.unitId || 'unit-ds-2');
  const [topicId, setTopicId] = useState(existingQuestion?.topicId || academic.topics.find(topic => topic.unitId === (existingQuestion?.unitId || 'unit-ds-2'))?.id || '');
  const [bloomLevel, setBloomLevel] = useState<BloomLevel>(existingQuestion?.bloomLevel || 'UNDERSTAND');
  const [explanation, setExplanation] = useState(existingQuestion?.explanation || '');
  const [chapterId, setChapterId] = useState(existingQuestion?.chapterId || 'ch-ds-2-1');
  const [type, setType] = useState<QuestionType>(existingQuestion?.type || 'short');
  const [language, setLanguage] = useState<QuestionLanguage>(existingQuestion?.language || 'English');
  const [marks, setMarks] = useState<number>(existingQuestion?.marks || 2);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(existingQuestion?.difficulty || 'Medium');
  const [text, setText] = useState(existingQuestion?.text || '');
  const [answer, setAnswer] = useState(existingQuestion?.answer || '');
  const [tagsInput, setTagsInput] = useState((existingQuestion?.tags || ['data-structures']).join(', '));
  
  // MCQ state
  const [options, setOptions] = useState<McqOption[]>(
    existingQuestion?.options || [
      { key: 'A', text: '' },
      { key: 'B', text: '' },
      { key: 'C', text: '' },
      { key: 'D', text: '' }
    ]
  );
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>(existingQuestion?.correctAnswer || 'A');

  // Dirty Tracking for Unsaved Changes Protection (Requirement #4)
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setIsDirty(true);
  };

  const filteredSubjects = permittedSubjects;
  const filteredUnits = academic.units.filter(u => u.subjectId === subjectId);
  const filteredChapters = academic.chapters.filter(c => c.unitId === unitId);
  const filteredTopics = academic.topics.filter(topic => topic.unitId === unitId);

  useEffect(() => {
    const units = academic.units.filter(u => u.subjectId === subjectId);
    if (units.length > 0 && !units.some(u => u.id === unitId)) {
      setUnitId(units[0].id);
    }
    const nextTopics = academic.topics.filter(topic => topic.unitId === unitId);
    if (nextTopics.length && !nextTopics.some(topic => topic.id === topicId)) setTopicId(nextTopics[0].id);
  }, [subjectId, unitId, topicId]);

  const handleCancelClick = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onCancel();
    }
  };

  const handleMcqOptionChange = (key: 'A' | 'B' | 'C' | 'D', value: string) => {
    setOptions(prev => prev.map(opt => opt.key === key ? { ...opt, text: value } : opt));
    setIsDirty(true);
  };

  const handleSave = (submitImmediately: boolean) => {
    const subject = academic.subjects.find(item => item.id === subjectId);
    const selectedUnit = academic.units.find(item => item.id === unitId);
    const topic = academic.topics.find(item => item.id === topicId);
    if (!subject || !selectedUnit || selectedUnit.subjectId !== subject.id || !topic || topic.unitId !== selectedUnit.id || !text.trim() || !type || !difficulty || !bloomLevel || !Number.isFinite(marks) || marks < 1) {
      showToast('Validation Required', 'Choose a subject, unit, topic, question type, marks, difficulty, and Bloom level; enter question text.', 'warning');
      return;
    }

    const selectedSubject = subject;
    const selectedChapter = academic.chapters.find(c => c.id === chapterId);

    const questionToSave: Question = {
      id: existingQuestion ? existingQuestion.id : `Q-${Math.floor(1030 + Math.random() * 8000)}`,
      questionText: text.trim(),
      questionType: ({ mcq: 'MCQ', short: 'SHORT_ANSWER', long: 'LONG_ANSWER', essay: 'ESSAY', numerical: 'NUMERICAL', DESCRIPTIVE: 'DESCRIPTIVE' } as Record<string, any>)[type] || 'SHORT_ANSWER',
      subjectId,
      subjectName: selectedSubject?.name || 'Data Structures',
      unitId,
      unitName: selectedUnit?.name || 'Unit 2 — Linked Lists',
      topicId,
      topicName: topic.name,
      programId: subject.programId,
      programName: academic.programs.find(program => program.id === subject.programId)?.name,
      chapterId,
      chapterName: selectedChapter?.name || 'General Concepts',
      departmentId: subject.departmentId,
      institutionId: subject.institutionId || academic.departments.find(department => department.id === subject.departmentId)?.institutionId || currentUser.institutionId,
      universityId: currentUser.universityId,
      type,
      language,
      marks,
      difficulty,
      bloomLevel,
      text,
      explanation,
      answer,
      answerKey: type === 'mcq' ? correctAnswer : answer,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      status: existingQuestion ? existingQuestion.status : 'Draft',
      version: existingQuestion ? existingQuestion.version : 1,
      versionHistory: existingQuestion ? existingQuestion.versionHistory : [],
      createdBy: existingQuestion?.createdBy || currentUser?.name || 'Faculty',
      createdAt: existingQuestion?.createdAt || new Date().toLocaleDateString('en-GB'),
      options: type === 'mcq' ? options : undefined,
      correctAnswer: type === 'mcq' ? correctAnswer : undefined,
    };

    const { question: saved, isNewVersion } = questionService.saveQuestion(questionToSave, currentUser, submitImmediately);
    setIsDirty(false);

    if (isNewVersion) {
      showToast(
        'Version Update',
        `A new draft version (v${saved.version}) was created for approved question ${saved.id}.`,
        'info'
      );
    } else {
      showToast(
        'Question Saved',
        `Question ${saved.id} was ${submitImmediately ? 'submitted for review' : 'saved'} successfully.`,
        'success'
      );
    }

    onSaved(saved.id);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-brand-title">
              {isEditMode ? 'Edit Question' : 'Create Question'}
            </h1>
            {isEditMode && existingQuestion && (
              <>
                <span className="font-mono text-xs font-bold bg-slate-100 text-brand-title px-2.5 py-1 rounded border border-slate-300">
                  Question ID: {existingQuestion.id}
                </span>
                <Badge status={existingQuestion.status}>{existingQuestion.status}</Badge>
                <span className="text-xs bg-slate-100 text-brand-font px-2 py-0.5 rounded font-medium">
                  Active v{existingQuestion.version}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-paragraph mt-1">
            {isEditMode
              ? 'Update question parameters, grading criteria, and marking schemes.'
              : 'Add a new question into the departmental question bank repository.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCancelClick}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          title="Cancel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Versioning Alert if Approved (Requirement #5 & #18) */}
      {isEditMode && existingQuestion?.status === 'Approved' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-900 shadow-sm">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold block mb-0.5">Approved Question Versioning Workflow</strong>
            <span>
              This is a live approved question (v{existingQuestion.version}). Saving updates will automatically generate a <strong>New Draft Version (v{existingQuestion.version + 1})</strong>. Historical examination papers generated using v{existingQuestion.version} will continue to reference their original snapshot.
            </span>
          </div>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* Row 1: Subject, Unit, Chapter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
              Subject <span className="text-rose-500">*</span>
            </label>
            <select
              value={subjectId}
              onChange={e => handleInputChange(setSubjectId, e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title focus:ring-2 focus:ring-brand-primary"
            >
              {filteredSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">Topic <span className="text-rose-500">*</span></label>
            <select value={topicId} onChange={e => handleInputChange(setTopicId, e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title">
              {filteredTopics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
              Unit <span className="text-rose-500">*</span>
            </label>
            <select
              value={unitId}
              onChange={e => handleInputChange(setUnitId, e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title focus:ring-2 focus:ring-brand-primary"
            >
              {filteredUnits.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
              Chapter
            </label>
            <select
              value={chapterId}
              onChange={e => handleInputChange(setChapterId, e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title focus:ring-2 focus:ring-brand-primary"
            >
              {filteredChapters.length > 0 ? (
                filteredChapters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              ) : (
                <option value="ch-general">General Unit Concepts</option>
              )}
            </select>
          </div>
        </div>

        {/* Row 2: Configurable Question Types (Requirement #16), Language, Marks, Difficulty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
              Question Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={type}
              onChange={e => handleInputChange(setType, e.target.value as QuestionType)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title focus:ring-2 focus:ring-brand-primary"
            >
              <option value="mcq">MCQ</option><option value="short">Short Answer</option><option value="long">Long Answer</option><option value="essay">Essay</option><option value="numerical">Numerical</option><option value="DESCRIPTIVE">Descriptive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
              Question Language <span className="text-rose-500">*</span>
            </label>
            <select
              value={language}
              onChange={e => handleInputChange(setLanguage, e.target.value as QuestionLanguage)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title focus:ring-2 focus:ring-brand-primary"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Gujarati">Gujarati (ગુજરાતી)</option>
              <option value="Regional">Regional</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">Bloom level <span className="text-rose-500">*</span></label>
            <select value={bloomLevel} onChange={e => handleInputChange(setBloomLevel, e.target.value as BloomLevel)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title">
              {(['REMEMBER','UNDERSTAND','APPLY','ANALYZE','EVALUATE','CREATE'] as BloomLevel[]).map(level => <option key={level} value={level}>{level[0] + level.slice(1).toLowerCase()}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
              Marks <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={25}
              value={marks}
              onChange={e => handleInputChange(setMarks, parseInt(e.target.value, 10) || 1)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
              Difficulty <span className="text-rose-500">*</span>
            </label>
            <select
              value={difficulty}
              onChange={e => handleInputChange(setDifficulty, e.target.value as DifficultyLevel)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title focus:ring-2 focus:ring-brand-primary"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Question Statement */}
        <div>
          <label className="block text-xs font-bold uppercase text-brand-font mb-1.5 flex items-center justify-between">
            <span>Question Statement <span className="text-rose-500">*</span></span>
            <span className="text-[11px] font-normal text-slate-400">Clear academic terminology</span>
          </label>
          <textarea
            rows={4}
            value={text}
            onChange={e => handleInputChange(setText, e.target.value)}
            placeholder="Type or paste question statement here..."
            className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-primary font-serif leading-relaxed text-slate-900"
          />
        </div>

        {/* MCQ Options Block */}
        {type === 'mcq' && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-brand-title">Multiple Choice Options & Correct Key</span>
              <span className="text-xs text-brand-font">Select radio for correct answer</span>
            </div>
            {(['A', 'B', 'C', 'D'] as const).map(key => {
              const opt = options.find(o => o.key === key) || { key, text: '' };
              const isChecked = correctAnswer === key;
              return (
                <div key={key} className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="correctKey"
                      checked={isChecked}
                      onChange={() => handleInputChange(setCorrectAnswer, key)}
                      className="w-4 h-4 text-brand-primary focus:ring-brand-primary"
                    />
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isChecked ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {key}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => handleMcqOptionChange(key, e.target.value)}
                    placeholder={`Option ${key} text...`}
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Answer / Solution */}
        <div>
          <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
            Model Answer / Scoring Rubric <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={answer}
            onChange={e => handleInputChange(setAnswer, e.target.value)}
            placeholder="Provide key scoring points, derivation steps, or expected answers..."
            className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-primary text-slate-800"
          />
        </div>

        <div><label className="block text-xs font-bold uppercase text-brand-font mb-1.5">Explanation</label><textarea rows={2} value={explanation} onChange={e => handleInputChange(setExplanation, e.target.value)} placeholder="Optional teaching explanation" className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-primary text-slate-800" /></div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
            Tags (comma separated)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={e => handleInputChange(setTagsInput, e.target.value)}
            placeholder="e.g. linked-list, memory, pointers"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handleCancelClick}
          className="px-5 py-2.5 text-xs font-semibold text-brand-paragraph bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
        >
          Cancel
        </button>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-brand-title bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition"
          >
            <Save className="h-4 w-4 text-brand-font" />
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover rounded-xl shadow-md transition"
          >
            <Send className="h-4 w-4" />
            <span>Submit for Review</span>
          </button>
        </div>
      </div>

      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onStay={() => setShowUnsavedModal(false)}
        onLeave={() => {
          setShowUnsavedModal(false);
          setIsDirty(false);
          onCancel();
        }}
      />
    </div>
  );
};
