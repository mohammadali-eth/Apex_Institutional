'use client';
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { academicService } from '@/lib/services/academicService';
import { loadDemoState } from '@/data/demoState';
import { University, Institution, Department, Program, Subject } from '@/types';
import { permissionService } from '@/lib/permissions/permissionService';

type Kind = 'universities' | 'institutions' | 'institution' | 'departments' | 'department' | 'programs' | 'program' | 'subjects' | 'subject';
export const OrganizationBrowser: React.FC<{ kind: Kind; id?: string }> = ({ kind, id }) => {
  const { currentUser } = useAuth();
  const state = loadDemoState();
  const institutions = academicService.getInstitutions();
  const departments = academicService.getDepartments();
  const programs = academicService.getPrograms();
  const subjects = academicService.getSubjects();
  const visibleDepartments = departments.filter(department => currentUser && permissionService.hasDepartmentAccess(currentUser, department.id));
  const visibleSubjects = subjects.filter(subject => currentUser && permissionService.hasSubjectAccess(currentUser, subject.id));
  const items: Array<University | Institution | Department | Program | Subject> = ({
    universities: state.universities,
    institutions,
    departments: visibleDepartments,
    programs: programs.filter(program => visibleDepartments.some(department => department.id === program.departmentId)),
    subjects: visibleSubjects,
  } as Partial<Record<Kind, Array<University | Institution | Department | Program | Subject>>>)[kind] || [];
  const item = items.find(entry => entry.id === id) || institutions.find(entry => entry.id === id) || departments.find(entry => entry.id === id) || programs.find(entry => entry.id === id) || subjects.find(entry => entry.id === id);
  const title = kind === 'institution' ? 'Institution Details' : kind === 'department' ? 'Department Details' : kind === 'program' ? 'Program Details' : kind === 'subject' ? 'Subject Details' : kind[0].toUpperCase() + kind.slice(1);
  const href = (path: string) => `#/${path}`;
  const subjectsForDepartment = (departmentId: string) => subjects.filter(subject => subject.departmentId === departmentId);

  return <div className="mx-auto max-w-7xl space-y-6 p-6">
    <header className="border-b border-slate-200 pb-4"><p className="text-xs text-slate-500">University › Institution › Department › Program › Subject</p><h1 className="mt-1 text-2xl font-bold text-brand-title">{title}</h1><p className="mt-1 text-xs text-slate-600">Browse the academic hierarchy and subject question banks.</p><nav className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-brand-primary"><a href={href('universities')}>Universities</a><a href={href('institutions')}>Institutions</a><a href={href('departments')}>Departments</a><a href={href('programs')}>Programs</a><a href={href('subjects')}>Subjects</a></nav></header>
    {id && item ? <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-900">{('name' in item && item.name) || item.id}</h2><p className="mt-1 text-xs text-slate-500">{item.id} {('code' in item && item.code) ? `• ${item.code}` : ''} {('status' in item && item.status) ? `• ${item.status}` : ''}</p>
      {kind === 'institution' && <div className="mt-5 space-y-2">{departments.filter(department => department.institutionId === item.id && currentUser && permissionService.hasDepartmentAccess(currentUser, department.id)).map(department => <a key={department.id} className="block rounded-lg border p-3 text-sm hover:bg-slate-50" href={href(`departments/${department.id}`)}>{department.name} <span className="text-xs text-slate-500">({department.code})</span></a>)}</div>}
      {kind === 'universities' && <div className="mt-5 space-y-2">{institutions.filter(institution => institution.universityId === item.id).map(institution => <a key={institution.id} className="block rounded-lg border p-3 text-sm hover:bg-slate-50" href={href(`institutions/${institution.id}`)}>{institution.name} <span className="text-xs text-slate-500">({institution.code})</span></a>)}</div>}
      {kind === 'department' && <div className="mt-5 grid gap-2 sm:grid-cols-2">{programs.filter(program => program.departmentId === item.id).map(program => <a key={program.id} className="rounded-lg border p-3 text-sm hover:bg-slate-50" href={href(`programs/${program.id}`)}>{program.name}</a>)}{subjectsForDepartment(item.id).map(subject => <a key={subject.id} className="rounded-lg border p-3 text-sm hover:bg-slate-50" href={href(`subjects/${subject.id}`)}>{subject.name} • {subject.code}</a>)}</div>}
      {kind === 'program' && <div className="mt-5 space-y-2">{subjects.filter(subject => subject.programId === item.id && currentUser && permissionService.hasSubjectAccess(currentUser, subject.id)).map(subject => <a key={subject.id} className="block rounded-lg border p-3 text-sm hover:bg-slate-50" href={href(`subjects/${subject.id}`)}>{subject.name} • {subject.code}</a>)}</div>}
      {kind === 'subject' && <div className="mt-5 space-y-2 text-sm text-slate-600"><p>Question bank: {state.questionBanks.find(bank => bank.subjectId === item.id)?.name || `${item.name} Question Bank`}</p><p>Units: {state.units.filter(unit => unit.subjectId === item.id).map(unit => unit.name).join(', ') || 'No syllabus units yet'}</p><a className="inline-flex rounded-lg bg-brand-primary px-4 py-2 text-white" href={href('question-bank')}>Open Question Bank</a></div>}
      <div className="mt-5"><a className="text-xs font-semibold text-brand-primary" href={href(kind === 'institution' ? 'institutions' : kind === 'department' ? 'departments' : kind === 'program' ? 'programs' : kind === 'subject' ? 'subjects' : 'universities')}>← Back to {kind === 'institution' ? 'institutions' : kind === 'department' ? 'departments' : kind === 'program' ? 'programs' : kind === 'subject' ? 'subjects' : 'directory'}</a></div>
    </div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(entry => <a key={entry.id} href={href(`${kind}/${entry.id}`)} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-primary"><h2 className="font-bold text-slate-900">{('name' in entry && entry.name) || entry.id}</h2><p className="mt-1 text-xs text-slate-500">{entry.id} {('code' in entry && entry.code) ? `• ${entry.code}` : ''}</p></a>)}</div>}
  </div>;
};

