'use client';
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { AlertOctagon, LogOut, RefreshCw } from 'lucide-react';

interface NoDepartmentPageProps {
  onLogout: () => void;
  onRetry: () => void;
}

export const NoDepartmentPage: React.FC<NoDepartmentPageProps> = ({ onLogout, onRetry }) => {
  const { currentUser } = useAuth();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
          <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
            <AlertOctagon className="h-7 w-7" />
          </div>

          <h2 className="text-xl font-bold text-brand-title">
            {t('auth.noDepartment')}
          </h2>

          <p className="mt-3 text-xs text-brand-paragraph leading-relaxed">
            {t('auth.noDeptDesc')}
          </p>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-brand-font text-left">
            <div>User: <strong className="text-slate-800">{currentUser?.name}</strong></div>
            <div>Role: <strong className="text-slate-800 capitalize">{currentUser?.role}</strong></div>
            <div>Institution: <strong className="text-slate-800">{currentUser?.institutionName}</strong></div>
            <div>Status: <span className="text-rose-600 font-bold">Unassigned</span></div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-semibold text-brand-title bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Assignment</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-secondary hover:bg-brand-secondary-dark rounded-lg transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t('auth.signOut')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

