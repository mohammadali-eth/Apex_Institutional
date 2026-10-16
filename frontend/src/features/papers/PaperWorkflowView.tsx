'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { PreviousPaper, PaperStatus, User } from '@/types';
import { paperService } from '@/lib/services/paperService';
import { questionService } from '@/lib/services/questionService';
import { loadDemoState } from '@/data/demoState';
import { permissionService } from '@/lib/permissions/permissionService';
import { useDepartment } from '@/hooks/useDepartment';
import { CheckCircle2, FileText, Plus, Search, Send, Eye, Clock3, ShieldCheck } from 'lucide-react';

type Page = 'dashboard' | 'all' | 'mine' | 'create' | 'review' | 'changes' | 'approved' | 'final' | 'published' | 'archived';
const pages: { id: Page; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' }, { id: 'all', label: 'All Papers' }, { id: 'mine', label: 'My Drafts' }, { id: 'create', label: 'Create Paper' },
  { id: 'review', label: 'Review Queue' }, { id: 'changes', label: 'Changes Requested' }, { id: 'approved', label: 'Approved' }, { id: 'final', label: 'Final Papers' }, { id: 'published', label: 'Published' }, { id: 'archived', label: 'Archived' },
];
const labelStatus = (s?: PaperStatus) => (s || 'DRAFT').replace(/_/g, ' ');
const newId = () => `QP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`;
const verifyCriticalAction = (message:string) => window.confirm(`${message}\n\nThis is a high security demo action and will be recorded in the audit log.`) && window.prompt('Demo MFA code (246810)') === '246810';

export const PaperWorkflowView: React.FC<{ page?: Page }> = ({ page: initialPage = 'dashboard' }) => {
  const { currentUser } = useAuth();
  const { currentDepartment } = useDepartment();
  const { showToast } = useToast();
  const [page, setPage] = useState<Page>(initialPage);
  const [papers, setPapers] = useState<PreviousPaper[]>(() => paperService.getAllPapers().map(p => ({ ...p, workflowStatus: p.workflowStatus || 'DRAFT' as PaperStatus })));
  const [selectedPaper, setSelectedPaper] = useState<PreviousPaper | undefined>();
  const [query, setQuery] = useState('');
  const [formError, setFormError] = useState('');
  const state = loadDemoState();
  const user = currentUser as User | null;
  useEffect(() => setPage(initialPage), [initialPage]);
  useEffect(() => paperService.subscribe(() => { const next = paperService.getAllPapers(); setPapers(next); setSelectedPaper(prev => (prev ? next.find(p => p.id === prev.id) : undefined)); }), []);

  const scopedPapers = papers.filter(p => user && permissionService.canAccessResource(user, { departmentId: p.departmentId, subjectId: p.subjectId, examId: p.examId }) && (user.role !== 'student' || p.workflowStatus === 'PUBLISHED'));
  const visiblePapers = useMemo(() => {
    const own = scopedPapers.filter(p => p.createdBy === user?.name);
    let source = scopedPapers;
    if (page === 'mine') source = own.filter(p => ['DRAFT', 'CHANGES_REQUESTED'].includes(p.workflowStatus || 'DRAFT'));
    if (page === 'review') source = scopedPapers.filter(p => ['SUBMITTED', 'UNDER_REVIEW', 'QUALITY_REVIEW', 'QUALITY_APPROVED', 'PENDING_FINAL_APPROVAL'].includes(p.workflowStatus || 'DRAFT'));
    if (page === 'changes') source = scopedPapers.filter(p => p.workflowStatus === 'CHANGES_REQUESTED');
    if (page === 'approved') source = scopedPapers.filter(p => p.workflowStatus === 'APPROVED');
    if (page === 'final') source = scopedPapers.filter(p => p.workflowStatus === 'FINALIZED');
    if (page === 'published') source = scopedPapers.filter(p => p.workflowStatus === 'PUBLISHED');
    if (page === 'archived') source = scopedPapers.filter(p => p.workflowStatus === 'ARCHIVED');
    if (page === 'dashboard' || page === 'all' || page === 'create') source = scopedPapers;
    const term = query.toLowerCase();
    return source.filter(p => !term || `${p.id} ${p.title || ''} ${p.subjectName} ${p.createdBy}`.toLowerCase().includes(term));
  }, [scopedPapers, page, query, user?.name]);

  const canCreate = !!user && permissionService.hasPermission(user, 'paper.create');
  const canReview = !!user && permissionService.hasPermission(user, 'paper.review') && ['question_paper_reviewer','department_admin','exam_coordinator','super_admin','institution_admin','university_admin'].includes(user.role);
  const canApprove = !!user && permissionService.hasPermission(user, 'paper.approve') && (user.role === 'quality_controller' || ['super_admin', 'institution_admin', 'university_admin'].includes(user.role));
  const canFinalize = !!user && permissionService.hasPermission(user, 'paper.finalize') && (user.role === 'exam_controller' || ['super_admin', 'institution_admin', 'university_admin'].includes(user.role));
  const canPublish = !!user && permissionService.hasPermission(user, 'paper.publish');

  const openPage = (next: Page) => { setPage(next); setSelectedPaper(undefined); setFormError(''); };
  const act = (paper: PreviousPaper, status: PaperStatus, comment?: string, confirmed = false) => {
    if (!user) return;
    const updated = paperService.transitionPaper(paper.id, status, user, comment, confirmed);
    if (!updated) { showToast('Action unavailable', 'Your role, scope, or the current paper status does not allow this action.', 'error'); return; }
    setSelectedPaper(updated); showToast('Paper updated', `${updated.id} is now ${labelStatus(status)}.`, 'success');
  };

  const CreateForm = () => {
    const departments = state.departments.filter(d => permissionService.hasDepartmentAccess(user, d.id));
    const [departmentId, setDepartmentId] = useState(currentDepartment?.id || departments[0]?.id || '');
    const programs = state.programs.filter(p => p.departmentId === departmentId);
    const subjects = state.subjects.filter(s => s.departmentId === departmentId && permissionService.hasSubjectAccess(user, s.id));
    const [programId, setProgramId] = useState(programs[0]?.id || '');
    const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
    const exams = state.exams.filter(ex => (!ex.departmentId || ex.departmentId === departmentId) && permissionService.hasExamAccess(user, ex.id));
    const [examId, setExamId] = useState(exams[0]?.id || '');
    const [academicYear, setAcademicYear] = useState('2026-27');
    const [semester, setSemester] = useState('3');
    const [duration, setDuration] = useState('3 Hours');
    const [totalMarks, setTotalMarks] = useState(50);
    const [instructions, setInstructions] = useState('Answer all questions. Write clearly and show all necessary working.');
    const [title, setTitle] = useState('');
    const [questionSearch, setQuestionSearch] = useState('');
    const [filterUnit,setFilterUnit]=useState('all'); const [filterDifficulty,setFilterDifficulty]=useState('all'); const [filterBloom,setFilterBloom]=useState('all'); const [filterType,setFilterType]=useState('all'); const [filterMarks,setFilterMarks]=useState('all');
    const [chosen, setChosen] = useState<string[]>([]);
    const [sections, setSections] = useState([{ id: 'section-a', title: 'Section A', choiceRule: 'Answer all questions.' }]);
    const [activeSectionId, setActiveSectionId] = useState('section-a');
    const [questionSections, setQuestionSections] = useState<Record<string,string>>({});
    const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];
    const questions = questionService.getQuestionsByDepartment(departmentId).filter(q => q.subjectId === subjectId && q.status === 'Approved' && permissionService.hasSubjectAccess(user, q.subjectId));
    const selected = chosen.map(id => questions.find(q => q.id === id)).filter(Boolean);
    const selectedMarks = selected.reduce((sum, q) => sum + (q?.marks || 0), 0);
    const filteredQuestions = questions.filter(q => (!questionSearch || `${q.id} ${q.text} ${q.unitName} ${q.topicName || ''} ${q.difficulty} ${q.type}`.toLowerCase().includes(questionSearch.toLowerCase())) && (filterUnit==='all'||q.unitId===filterUnit) && (filterDifficulty==='all'||q.difficulty.toUpperCase()===filterDifficulty) && (filterBloom==='all'||q.bloomLevel===filterBloom) && (filterType==='all'||q.questionType===filterType||q.type.toUpperCase()===filterType) && (filterMarks==='all'||String(q.marks)===filterMarks));
    const save = (submit: boolean) => {
      setFormError('');
      if (!examId) return setFormError('Select an examination.');
      if (!departmentId || !programId || !academicYear || !semester || !duration.trim()) return setFormError('Complete the academic year, semester, department, program, and duration selections.');
      if (!subjectId) return setFormError('Select a subject.');
      if (!Number(totalMarks) || Number(totalMarks) < 1) return setFormError('Maximum marks must be greater than zero.');
      if (!chosen.length) return setFormError('Select at least one approved question.');
      if (!sections.length || sections.some(section => !section.title.trim())) return setFormError('Add a title for every section.');
      if (sections.some(section => !chosen.some(id => (questionSections[id] || sections[0].id) === section.id))) return setFormError('Every section must contain at least one question.');
      if (selectedMarks !== Number(totalMarks)) return setFormError(selectedMarks < Number(totalMarks) ? `Selected questions total ${selectedMarks} marks. ${Number(totalMarks) - selectedMarks} marks are still required.` : `Selected questions total ${selectedMarks} marks, which is ${selectedMarks - Number(totalMarks)} marks above the paper maximum.`);
      const subject = state.subjects.find(s => s.id === subjectId)!;
      const program = state.programs.find(p => p.id === programId);
      const dept = state.departments.find(d => d.id === departmentId);
      const exam = state.exams.find(e => e.id === examId)!;
      const paperSections = sections.map(section => { const sectionQuestions = selected.filter(q => (questionSections[q!.id] || sections[0].id) === section.id); return { id: section.id, title: section.title, instructions: section.choiceRule, marksPerQuestion: 0, questions: sectionQuestions.map(q => ({ id: `pq-${q!.id}`, questionId: q!.id, version: q!.version, text: q!.text, marks: q!.marks, unitName: q!.unitName, difficulty: q!.difficulty, type: q!.type })) }; });
      const created = paperService.createWorkflowPaper({ id: newId(), institutionId: dept?.institutionId || user?.institutionId || '', departmentId, programId, subjectId, subjectName: subject.name, programName: program?.name || '', academicYear, generatedAt: new Date().toLocaleDateString('en-GB'), totalMarks: Number(totalMarks), duration, language: 'English', set: 'A', questionCount: selected.length, unitCount: new Set(selected.map(q => q!.unitName)).size, status: 'draft', createdBy: user?.name || '', sections: paperSections, examId, universityId: user?.universityId, title: title || `${exam.name} — ${subject.name}`, instructions, semesterId: `sem-${semester}` }, user!);
      if (!created) return setFormError('This paper is outside your permitted scope.');
      if (submit) {
        const submitted = paperService.transitionPaper(created.id, 'SUBMITTED', user!);
        if (!submitted) return setFormError('Paper saved, but submission is not permitted.');
        showToast('Paper submitted', `${created.id} is in the review queue.`, 'success');
      } else showToast('Draft saved', `${created.id} was saved.`, 'success');
      setSelectedPaper(paperService.getPaperById(created.id)); setPage('all');
    };
    return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      <div><h2 className="text-xl font-bold text-slate-900">Create question paper</h2><p className="text-sm text-slate-500">Configure academic context, select approved questions, and build a paper preview.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Examination"><select className={input} value={examId} onChange={e => setExamId(e.target.value)}><option value="">Select examination</option>{exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
        <Field label="Academic year"><select className={input} value={academicYear} onChange={e => setAcademicYear(e.target.value)}><option>2026-27</option><option>2025-26</option></select></Field>
        <Field label="Semester"><select className={input} value={semester} onChange={e => setSemester(e.target.value)}>{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}</select></Field>
        <Field label="Department"><select className={input} value={departmentId} onChange={e => {setDepartmentId(e.target.value); setSubjectId(''); setChosen([]);}}>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Program"><select className={input} value={programId} onChange={e => setProgramId(e.target.value)}>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Subject"><select className={input} value={subjectId} onChange={e => {setSubjectId(e.target.value);setChosen([]);}}><option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></Field>
        <Field label="Title"><input className={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Optional paper title" /></Field>
        <Field label="Duration"><input className={input} value={duration} onChange={e => setDuration(e.target.value)} /></Field>
        <Field label="Maximum marks"><input className={input} type="number" min={1} value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))} /></Field>
      </div>
      <Field label="Instructions"><textarea className={input} rows={2} value={instructions} onChange={e => setInstructions(e.target.value)} /></Field>
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-slate-800">Section builder · {activeSection.title}</h3><p className="text-xs text-slate-500">Configure section rules, counts, and marks through selected questions.</p></div><button type="button" className={secondary} onClick={()=>{const id=`section-${sections.length+1}`;setSections(prev=>[...prev,{id,title:`Section ${String.fromCharCode(65+prev.length)}`,choiceRule:'Answer all questions.'}]);setActiveSectionId(id);}}>+ Add section</button></div>
        <div className="flex flex-wrap gap-2">{sections.map(section=><button type="button" key={section.id} onClick={()=>setActiveSectionId(section.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${section.id===activeSectionId?'bg-brand-600 text-white':'border border-slate-200'}`}>{section.title} · {chosen.filter(id=>(questionSections[id]||sections[0].id)===section.id).length}</button>)}</div>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Section title"><input aria-label="Section title" className={input} value={activeSection.title} onChange={e=>setSections(prev=>prev.map(s=>s.id===activeSectionId?{...s,title:e.target.value}:s))}/></Field><Field label="Choice rule"><input aria-label="Choice rule" className={input} value={activeSection.choiceRule} onChange={e=>setSections(prev=>prev.map(s=>s.id===activeSectionId?{...s,choiceRule:e.target.value}:s))}/></Field></div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{selected.length} selected · {selectedMarks} / {totalMarks} marks</span><input className={`${input} max-w-xs`} placeholder="Search questions by text, unit, topic…" value={questionSearch} onChange={e => setQuestionSearch(e.target.value)} /></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><select aria-label="Filter by unit" className={input} value={filterUnit} onChange={e=>setFilterUnit(e.target.value)}><option value="all">All units</option>{[...new Map(questions.map(q=>[q.unitId,q.unitName])).entries()].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select><select aria-label="Filter by difficulty" className={input} value={filterDifficulty} onChange={e=>setFilterDifficulty(e.target.value)}><option value="all">All difficulties</option>{['EASY','MEDIUM','HARD'].map(x=><option key={x}>{x}</option>)}</select><select aria-label="Filter by Bloom" className={input} value={filterBloom} onChange={e=>setFilterBloom(e.target.value)}><option value="all">All Bloom levels</option>{['REMEMBER','UNDERSTAND','APPLY','ANALYZE','EVALUATE','CREATE'].map(x=><option key={x}>{x}</option>)}</select><select aria-label="Filter by question type" className={input} value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="all">All types</option>{['MCQ','SHORT','LONG','ESSAY','NUMERICAL','DESCRIPTIVE'].map(x=><option key={x}>{x}</option>)}</select><select aria-label="Filter by marks" className={input} value={filterMarks} onChange={e=>setFilterMarks(e.target.value)}><option value="all">All marks</option>{[...new Set(questions.map(q=>q.marks))].sort((a,b)=>a-b).map(x=><option key={x} value={x}>{x} marks</option>)}</select></div>
        <div className="max-h-72 overflow-auto divide-y divide-slate-100">{filteredQuestions.map(q => <div key={q.id} className="flex items-start gap-3 py-3 text-sm"><input type="checkbox" checked={chosen.includes(q.id)} onChange={e => {setChosen(prev => e.target.checked ? [...prev, q.id] : prev.filter(id => id !== q.id));setQuestionSections(prev=>({...prev,[q.id]:activeSectionId}));}} /><span className="flex-1"><b>{q.id} · {q.marks} marks</b> — {q.text}<small className="block text-slate-500">{q.unitName} · {q.topicName || 'No topic'} · {q.difficulty} · {q.bloomLevel}</small></span>{chosen.includes(q.id)&&<select aria-label={`Section for ${q.id}`} className="max-w-32 rounded border px-2 py-1 text-xs" value={questionSections[q.id]||sections[0].id} onChange={e=>setQuestionSections(prev=>({...prev,[q.id]:e.target.value}))}>{sections.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select>}<button type="button" disabled={!chosen.includes(q.id)} className="rounded border px-2 disabled:opacity-30" onClick={()=>setChosen(prev=>{const idx=prev.indexOf(q.id);if(idx<=0)return prev;const copy=[...prev];[copy[idx-1],copy[idx]]=[copy[idx],copy[idx-1]];return copy;})}>↑</button><button type="button" disabled={!chosen.includes(q.id)} className="rounded border px-2 disabled:opacity-30" onClick={()=>setChosen(prev=>{const idx=prev.indexOf(q.id);if(idx<0||idx>=prev.length-1)return prev;const copy=[...prev];[copy[idx+1],copy[idx]]=[copy[idx],copy[idx+1]];return copy;})}>↓</button></div>)}{!filteredQuestions.length && <p className="py-5 text-center text-sm text-slate-500">No approved questions are available in this subject.</p>}</div>
      </div>
      {formError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>}
      <div className="flex flex-wrap justify-end gap-2"><button className={secondary} onClick={() => save(false)}>Save Draft</button><button className={primary} onClick={() => save(true)}><Send size={15}/> Save & Submit</button></div>
    </div>;
  };

  if (!user) return null;
  const counts = ['DRAFT','SUBMITTED','UNDER_REVIEW','QUALITY_REVIEW','APPROVED','FINALIZED','PUBLISHED','ARCHIVED'].map(status => ({ status, count: scopedPapers.filter(p => p.workflowStatus === status).length }));
  return <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-600">Question paper module</p><h1 className="text-2xl font-bold text-slate-900">{page === 'create' ? 'Paper Configuration & Selection' : page === 'review' ? 'Review Queue' : page === 'dashboard' ? 'Question Paper Dashboard' : pages.find(p => p.id === page)?.label}</h1><p className="mt-1 text-sm text-slate-500">Create, review, finalize, and publish papers within your academic scope.</p></div>{canCreate && <button className={primary} onClick={() => openPage('create')}><Plus size={16}/> Create Paper</button>}</div>
    <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">{pages.map(item => <button key={item.id} onClick={() => openPage(item.id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${page===item.id?'bg-brand-600 text-white':'bg-white text-slate-600 border border-slate-200'}`}>{item.label}</button>)}</nav>
    {page === 'dashboard' && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{counts.map(c => <button key={c.status} onClick={() => openPage(c.status==='DRAFT'?'mine':c.status==='SUBMITTED'||c.status==='UNDER_REVIEW'||c.status==='QUALITY_REVIEW'?'review':c.status==='APPROVED'?'approved':c.status==='FINALIZED'?'final':c.status==='PUBLISHED'?'published':'archived')} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">{labelStatus(c.status as PaperStatus)}</p><p className="mt-2 text-3xl font-bold text-slate-900">{c.count}</p></button>)}</div>}
    {page === 'create' && canCreate && <CreateForm />}
    {page === 'create' && !canCreate && <Notice>Paper creation is not available for your role.</Notice>}
    {page !== 'create' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input className={`${input} pl-9`} placeholder="Search paper, subject, or creator" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      {visiblePapers.length ? visiblePapers.map(p => <article key={p.id} className={`rounded-xl border bg-white p-4 shadow-sm ${selectedPaper?.id===p.id?'border-brand-500':'border-slate-200'}`}><div className="flex flex-wrap items-start justify-between gap-3"><button className="text-left" onClick={()=>setSelectedPaper(p)}><span className="font-mono text-xs font-bold text-brand-700">{p.id}</span><h2 className="mt-1 font-bold text-slate-900">{p.title || p.subjectName}</h2><p className="text-xs text-slate-500">{p.subjectName} · {p.programName} · {p.academicYear} · Sem {p.semesterId?.replace('sem-','')}</p></button><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{labelStatus(p.workflowStatus)}</span></div><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600"><span>{p.questionCount} questions</span><span>{p.totalMarks} marks</span><span>{p.duration}</span><span>v{p.version || 1}</span></div></article>) : <Notice>No papers found in this view.</Notice>}</section>
      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{selectedPaper ? <PaperDetail paper={selectedPaper} user={user} canReview={canReview} canApprove={canApprove} canFinalize={canFinalize} canPublish={canPublish} act={act} onSaveEdit={(changes) => { const updated = paperService.updateWorkflowPaper(selectedPaper.id, changes, user); if (updated) {setSelectedPaper(updated);showToast('New version saved',`${updated.id} saved as version ${updated.version}.`,'success');} }} /> : <div className="py-8 text-center text-sm text-slate-500"><Eye className="mx-auto mb-2 h-5 w-5"/>Select a paper to view details and available workflow actions.</div>}</aside>
    </div>}
  </main>;
};

const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500';
const primary = 'inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700';
const secondary = 'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50';
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block text-xs font-semibold text-slate-600">{label}<span className="mt-1 block">{children}</span></label>; }
function Notice({children}:{children:React.ReactNode}) { return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{children}</div>; }

function PaperDetail({paper,user,canReview,canApprove,canFinalize,canPublish,act,onSaveEdit}:{paper:PreviousPaper;user:User;canReview:boolean;canApprove:boolean;canFinalize:boolean;canPublish:boolean;act:(p:PreviousPaper,s:PaperStatus,c?:string,confirmed?:boolean)=>void;onSaveEdit:(changes:Partial<PreviousPaper>)=>void}) {
  const [comment,setComment]=useState(''); const [editing,setEditing]=useState(false); const [title,setTitle]=useState(paper.title||paper.subjectName); const [instructions,setInstructions]=useState(paper.instructions||''); const status=paper.workflowStatus||'DRAFT';
  const academic=loadDemoState(); const institution=academic.institutions.find(x=>x.id===paper.institutionId); const subject=academic.subjects.find(x=>x.id===paper.subjectId); const university=academic.universities.find(x=>x.id===(paper.universityId||institution?.universityId)); const exam=academic.exams.find(x=>x.id===paper.examId);
  const questionIds=(paper.sections||[]).flatMap(section=>section.questions.map(question=>question.questionId));
  const duplicateCount=questionIds.length-new Set(questionIds).size;
  const bankQuestions=questionIds.map(id=>questionService.getQuestionById(id)).filter(Boolean);
  const distribution=(key:'difficulty'|'bloomLevel')=>Object.entries(bankQuestions.reduce<Record<string,number>>((acc,q)=>{const value=String(q?.[key]||'Unspecified');acc[value]=(acc[value]||0)+1;return acc;},{})).map(([name,count])=>`${name}: ${count}`).join(' · ')||'No question data';
  const missingAnswers=bankQuestions.filter(q=>!q?.answer?.trim()).length;
  const btn=(label:string,onClick:()=>void,style='')=><button className={`${secondary} w-full ${style}`} onClick={onClick}>{label}</button>;
  return <div className="space-y-4"><div><p className="text-xs font-bold uppercase text-slate-500">Paper details</p><h2 className="mt-1 font-bold text-slate-900">{paper.title||paper.subjectName}</h2><p className="text-xs text-slate-500">{paper.id} · {labelStatus(status)} · v{paper.version||1}</p></div>
    <div className="grid grid-cols-2 gap-2 text-xs"><Meta label="University" value={university?.name||'—'}/><Meta label="Institution" value={institution?.name||'—'}/><Meta label="Examination" value={exam?.name||paper.examId||'—'}/><Meta label="Subject" value={`${paper.subjectName}${subject?.code?` (${subject.code})`:''}`}/><Meta label="Academic year" value={paper.academicYear}/><Meta label="Semester" value={paper.semesterId?.replace('sem-','')||'—'}/><Meta label="Duration" value={paper.duration}/><Meta label="Maximum marks" value={String(paper.totalMarks)}/></div>
    <div><h3 className="mb-2 text-xs font-bold uppercase text-slate-500">Paper preview</h3><p className="mb-2 text-xs text-slate-600">{paper.instructions}</p>{paper.sections?.map(section=><div key={section.id} className="mb-2 rounded-lg bg-slate-50 p-3"><b className="text-xs">{section.title}</b><small className="block text-slate-500">{section.instructions}</small>{section.questions.map((q,i)=><p key={q.id} className="mt-2 text-xs text-slate-700">{i+1}. {q.text} <b>({q.marks})</b></p>)}</div>)}</div>
    {status==='QUALITY_REVIEW'&&<div className="rounded-lg border border-slate-200 p-3 text-xs"><b>Quality analysis</b><p className="mt-1">Difficulty: {distribution('difficulty')}</p><p>Bloom: {distribution('bloomLevel')}</p><p>Duplicate questions: {duplicateCount}</p><p>Missing answer keys: {missingAnswers}</p></div>}
    <div><h3 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-slate-500"><Clock3 size={13}/> Timeline</h3><ol className="space-y-2">{(paper.timeline||[]).map((t,i)=><li key={i} className="border-l-2 border-brand-200 pl-3 text-xs"><b>{labelStatus(t.status)}</b> · {t.actor}<small className="block text-slate-500">{new Date(t.at).toLocaleString()}{t.comment?` · ${t.comment}`:''}</small></li>)}</ol></div>
    {(paper.history||[]).length>0&&<div className="text-xs"><b>Version history</b>{paper.history?.map(h=><p key={h.version} className="mt-1 text-slate-600">v{h.version} · {h.changedBy} · {h.summary}</p>)}</div>}
    {['SUBMITTED','UNDER_REVIEW'].includes(status)&&canReview&&<div className="space-y-2 border-t pt-3"><b className="text-sm">Reviewer checklist</b>{['Metadata complete','Questions and marks verified','Instructions and sections checked'].map(x=><label key={x} className="flex gap-2 text-xs"><input type="checkbox"/>{x}</label>)}<textarea className={input} rows={2} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Review comment (required for changes)"/>{status==='SUBMITTED'&&btn('Start Review',()=>act(paper,'UNDER_REVIEW'))}{btn('Request Changes',()=>act(paper,'CHANGES_REQUESTED',comment),'text-amber-700')}{status==='UNDER_REVIEW'&&btn('Approve Review · Send to Quality',()=>act(paper,'QUALITY_REVIEW',comment),'bg-brand-600 text-white')}</div>}
    {(status==='CHANGES_REQUESTED'||status==='DRAFT')&&paper.createdBy===user.name&&<div className="space-y-2 border-t pt-3">{status==='CHANGES_REQUESTED'&&<><b className="text-sm">Requested changes</b>{(paper.reviewComments||[]).map((c,i)=><p key={i} className="rounded bg-amber-50 p-2 text-xs text-amber-900">{c}</p>)}</>}{editing?<><Field label="Paper title"><input className={input} value={title} onChange={e=>setTitle(e.target.value)}/></Field><Field label="Instructions"><textarea className={input} value={instructions} onChange={e=>setInstructions(e.target.value)}/></Field><button className={primary+' w-full'} onClick={()=>{onSaveEdit({title,instructions});setEditing(false);}}>Save new version</button></>:btn('Edit Paper',()=>setEditing(true))}{btn(status==='CHANGES_REQUESTED'?'Resubmit for Review':'Submit for Review',()=>act(paper,'SUBMITTED'))}</div>}
    {status==='QUALITY_REVIEW'&&canApprove&&<div className="space-y-2 border-t pt-3"><b className="flex items-center gap-1 text-sm"><ShieldCheck size={14}/>Quality control checklist</b>{['Question quality','Marks verified','Question type verified','Difficulty and Bloom checked','Formatting checked','No duplicate questions'].map(x=><label key={x} className="flex gap-2 text-xs"><input type="checkbox"/>{x}</label>)}<textarea className={input} rows={2} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Quality notes or issue (required to flag)"/>{btn('Approve Quality',()=>act(paper,'QUALITY_APPROVED',comment),'bg-brand-600 text-white')}{btn('Flag Issue',()=>act(paper,'CHANGES_REQUESTED',comment),'text-amber-700')}</div>}
    {status==='QUALITY_APPROVED'&&canApprove&&btn('Send for Final Approval',()=>act(paper,'PENDING_FINAL_APPROVAL'))}
    {status==='PENDING_FINAL_APPROVAL'&&canFinalize&&<div className="space-y-2 border-t pt-3"><textarea className={input} rows={2} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Final review comment (required to return)"/>{btn('Final Approval',()=>{if(verifyCriticalAction('Grant final approval to this examination paper?'))act(paper,'APPROVED',comment,true);},'bg-brand-600 text-white')}{btn('Return for Changes',()=>act(paper,'CHANGES_REQUESTED',comment),'text-amber-700')}</div>}
    {status==='APPROVED'&&canFinalize&&btn('Finalize Paper (locks editing)',()=>{if(verifyCriticalAction('Finalize this paper? Finalized papers are locked.'))act(paper,'FINALIZED',undefined,true);},'bg-brand-600 text-white')}
    {status==='FINALIZED'&&canPublish&&btn('Publish Paper',()=>{if(verifyCriticalAction('Publish this finalized paper?'))act(paper,'PUBLISHED',undefined,true);},'bg-emerald-700 text-white')}
    {status==='DRAFT'&&permissionService.hasPermission(user,'paper.update')&&btn('Archive Draft',()=>act(paper,'ARCHIVED'))}
    {status==='PUBLISHED'&&permissionService.hasPermission(user,'paper.update')&&btn('Archive Paper',()=>act(paper,'ARCHIVED'))}
  </div>;
}
function Meta({label,value}:{label:string;value:string}) { return <div className="rounded-lg bg-slate-50 p-2"><small className="block text-slate-500">{label}</small><b className="break-all text-slate-700">{value}</b></div>; }

