'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Layers,
  FileText,
  CheckSquare,
  Building2,
  CalendarDays,
  Shield,
  ArrowRight,
  School,
  User,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function WorkspacePortalPage() {
  const { backendUser, currentUser } = useAuth();
  const router = useRouter();

  // Active role can be primary role or user selected
  const roleAssignments = backendUser?.role_assignments || [];
  const primaryRoleCode = backendUser?.primary_role || 'GENERAL_USER';
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>(primaryRoleCode);

  const activeAssignment = roleAssignments.find((r: { role_code: string }) => r.role_code === selectedRoleCode) || roleAssignments[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Identity Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-2xl font-black shadow-inner">
              {backendUser?.full_name?.charAt(0) || backendUser?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold backdrop-blur-md mb-1.5 border border-white/10">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Identity</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {backendUser?.full_name || currentUser?.name || backendUser?.username || 'Academic Member'}
              </h1>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {backendUser?.email || currentUser?.email}
              </p>
            </div>
          </div>

          {/* Quick Stats or Scope */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 flex flex-col space-y-1 text-xs">
            <span className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
              Assigned University
            </span>
            <div className="font-extrabold text-white text-sm flex items-center space-x-1.5">
              <School className="w-4 h-4 text-amber-400" />
              <span>
                {activeAssignment?.university_id
                  ? 'Maktabah Jafariyah University'
                  : 'Platform General Scope'}
              </span>
            </div>
            <span className="text-[11px] text-slate-300">
              Role: <strong className="text-amber-300">{selectedRoleCode}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Role Switching Selector (if multiple roles assigned) */}
      {roleAssignments.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-brand-primary" />
              <span>Switch Active Role Context</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {roleAssignments.length} authorized roles assigned
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {roleAssignments.map((ra: { id: string; role_code: string }) => {
              const isSelected = selectedRoleCode === ra.role_code;
              return (
                <button
                  key={ra.id}
                  onClick={() => setSelectedRoleCode(ra.role_code)}
                  className={`p-3 rounded-xl border text-left transition ${
                    isSelected
                      ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{ra.role_code}</div>
                  <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                    Active Assignment
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Role-Specific Workspaces */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Authorized Workspace Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Module 1: Question Bank & Materials */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Question Authoring</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Contribute questions, taxonomy classifications, and syllabus-aligned problem sets.
              </p>
            </div>
            <button
              onClick={() => router.push('/questions')}
              className="mt-4 inline-flex items-center space-x-1.5 text-xs font-bold text-brand-primary hover:text-brand-primary-hover group"
            >
              <span>Open Question Bank</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          {/* Module 2: Paper Generator */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Paper Generator</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Configure blueprints, difficulty distributions, and compile formatted examination drafts.
              </p>
            </div>
            <button
              onClick={() => router.push('/generator')}
              className="mt-4 inline-flex items-center space-x-1.5 text-xs font-bold text-brand-primary hover:text-brand-primary-hover group"
            >
              <span>Open Generator</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          {/* Module 3: Approvals & Reviews */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Review &amp; Moderation</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Perform quality checks, syllabus coverage validation, and submit paper feedback.
              </p>
            </div>
            <button
              onClick={() => router.push('/approvals')}
              className="mt-4 inline-flex items-center space-x-1.5 text-xs font-bold text-brand-primary hover:text-brand-primary-hover group"
            >
              <span>View Review Queue</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>
      </div>

      {/* Security Governance Card */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
              Server-Enforced Authorization Boundary
            </h4>
            <p className="text-xs text-slate-500">
              Your actions are securely authorized at the API gateway against active session tokens.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {backendUser?.primary_role === 'SUPER_ADMIN' && (
            <button
              onClick={() => router.push('/super-admin')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              Super Admin Portal
            </button>
          )}
          {(backendUser?.primary_role === 'UNIVERSITY_ADMIN' ||
            backendUser?.primary_role === 'SUPER_ADMIN') && (
            <button
              onClick={() => router.push('/university-admin')}
              className="px-3.5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm transition"
            >
              University Admin Portal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
