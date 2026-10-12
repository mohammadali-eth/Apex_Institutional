import React from 'react';
import { User } from '@/types';
import { mockUsers } from '@/data/academicData';
import { GraduationCap, BookOpen, Layers, History, ShieldCheck, UserCheck } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onUserChange: (user: User) => void;
  activeTab: 'bank' | 'generator' | 'history' | 'edit-question' | 'view-question';
  onTabChange: (tab: 'bank' | 'generator' | 'history') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  activeTab,
  onTabChange,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Banner / University Identity */}
      <div className="bg-slate-900 text-slate-100 px-6 py-2 text-xs flex flex-wrap justify-between items-center border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <GraduationCap className="h-4 w-4 text-brand-500" />
          <span className="font-semibold tracking-wide">APEX INSTITUTE OF TECHNOLOGY & SCIENCE</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Autonomous University Examination Board</span>
        </div>
        
        {/* Dynamic User / Role Switcher for Acceptance Criteria Verification */}
        <div className="flex items-center space-x-3 mt-1 sm:mt-0">
          <span className="text-slate-400 flex items-center text-xs">
            <UserCheck className="h-3.5 w-3.5 mr-1 text-emerald-400" />
            Switch Active User / Department Scope:
          </span>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const selected = mockUsers.find(u => u.id === e.target.value);
              if (selected) onUserChange(selected);
            }}
            className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2.5 py-1 focus:ring-1 focus:ring-brand-500 focus:outline-none cursor-pointer"
          >
            {mockUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.role.replace('_', ' ')} ({u.departmentName?.includes('Computer') ? 'CS' : 'General'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('bank')}>
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight block leading-tight">QPMS</span>
              <span className="text-[11px] text-slate-500 font-medium">Question Paper Management</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-200">
            <button
              onClick={() => onTabChange('bank')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition ${
                activeTab === 'bank' || activeTab === 'edit-question' || activeTab === 'view-question'
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Question Bank</span>
            </button>

            <button
              onClick={() => onTabChange('generator')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition ${
                activeTab === 'generator'
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Paper Generator</span>
            </button>

            <button
              onClick={() => onTabChange('history')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition ${
                activeTab === 'history'
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Paper History</span>
            </button>
          </nav>
        </div>

        {/* Current User Info Card */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900 flex items-center justify-end space-x-1.5">
              <span>{currentUser.name}</span>
              {currentUser.role === 'department_admin' && (
                <span title="HOD Authorization" className="inline-flex items-center">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              <span className="font-medium text-brand-700">{currentUser.departmentName}</span>
              {' • '}
              <span className="capitalize">{currentUser.role}</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow flex items-center justify-center font-bold text-slate-700 text-sm">
            {currentUser.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
          </div>
        </div>
      </div>
    </header>
  );
};
