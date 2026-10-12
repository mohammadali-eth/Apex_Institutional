'use client';
import React from 'react';
import { useDepartment } from '@/hooks/useDepartment';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { resetDemoState } from '@/data/demoState';
import { Settings, Shield, Sliders, Building, CheckCircle2, RefreshCcw, Download, Database } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { currentDepartment, currentInstitution } = useDepartment();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const handleResetDemoData = () => {
    const shouldReset = window.confirm('Reset the demo data and local app state to the default institutional dataset?');
    if (!shouldReset) return;

    resetDemoState();
    window.localStorage.removeItem('qpms_active_user');
    showToast('Demo Reset', 'The demo state has been restored to the default academic dataset.', 'success');
    window.setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleExportSummary = () => {
    const summary = [
      'APEX QPMS Demo Summary',
      `Institution: ${currentInstitution?.name || 'N/A'}`,
      `Department: ${currentDepartment?.name || 'N/A'}`,
      `Current User: ${currentUser?.name || 'N/A'}`,
      `Role: ${currentUser?.role || 'N/A'}`,
      `Status: Demo configuration synced`,
      '',
      'This summary was generated from the static demo session state.'
    ].join('\n');

    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'qpms-demo-summary.txt';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Export Ready', 'The institutional demo summary download has started.', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6 text-brand-primary" />
          <h1 className="text-2xl font-bold text-brand-title">Examination System Settings</h1>
        </div>
        <p className="text-xs text-brand-paragraph mt-1">
          Institutional parameters, department isolation policies, and paper blueprint defaults.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-brand-title flex items-center space-x-2 border-b pb-3">
            <Building className="h-4 w-4 text-brand-primary" />
            <span>Active Institutional Profile</span>
          </h3>
          <div className="space-y-2 text-xs text-slate-700">
            <div>Institution: <strong>{currentInstitution?.name}</strong></div>
            <div>Code: <strong>{currentInstitution?.code}</strong></div>
            <div>Department: <strong>{currentDepartment?.name}</strong></div>
            <div>HOD: <strong>{currentDepartment?.hodName}</strong></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-brand-title flex items-center space-x-2 border-b pb-3">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span>Security & Isolation Status</span>
          </h3>
          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex items-center text-emerald-700 font-semibold">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              <span>Department Boundary Enforcement: ACTIVE</span>
            </div>
            <div className="flex items-center text-emerald-700 font-semibold">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              <span>Question Version Immutability: ENABLED</span>
            </div>
            <div className="flex items-center text-emerald-700 font-semibold">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              <span>Historical Paper Integrity Guard: ENFORCED</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-brand-title flex items-center space-x-2 border-b pb-3">
          <Database className="h-4 w-4 text-brand-primary" />
          <span>Operational Demo Controls</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleResetDemoData}
            className="flex items-center justify-center space-x-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100 transition"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Reset Demo Data</span>
          </button>

          <button
            type="button"
            onClick={handleExportSummary}
            className="flex items-center justify-center space-x-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700 hover:bg-brand-100 transition"
          >
            <Download className="h-4 w-4" />
            <span>Export Demo Summary</span>
          </button>
        </div>
      </div>
    </div>
  );
};

