import React from 'react';
import { useDepartment } from '../../contexts/DepartmentContext';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, Shield, Sliders, Building, CheckCircle2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { currentDepartment, currentInstitution } = useDepartment();
  const { currentUser } = useAuth();

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
    </div>
  );
};
