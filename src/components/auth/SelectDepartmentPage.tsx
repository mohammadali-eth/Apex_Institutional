import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDepartment } from '../../contexts/DepartmentContext';
import { useI18n } from '../../lib/i18n';
import { Building2, ArrowRight, CheckCircle2, BookOpen } from 'lucide-react';

interface SelectDepartmentPageProps {
  onSelected: () => void;
}

export const SelectDepartmentPage: React.FC<SelectDepartmentPageProps> = ({ onSelected }) => {
  const { currentUser } = useAuth();
  const { setDepartment } = useDepartment();
  const { t } = useI18n();

  const assigned = currentUser?.assignedDepartments || [];
  const [selectedId, setSelectedId] = useState(assigned[0]?.id || '');

  const handleConfirm = () => {
    if (selectedId) {
      setDepartment(selectedId);
      onSelected();
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-brand-secondary flex items-center justify-center text-brand-primary shadow">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-title">{t('auth.selectDepartment')}</h2>
              <p className="text-xs text-brand-paragraph">{currentUser?.name} • {currentUser?.institutionName}</p>
            </div>
          </div>

          <p className="text-xs text-brand-paragraph mt-4 mb-6">
            {t('auth.selectDeptDesc')}
          </p>

          <div className="space-y-3 mb-6">
            {assigned.map(dept => {
              const isSelected = dept.id === selectedId;
              return (
                <div
                  key={dept.id}
                  onClick={() => setSelectedId(dept.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary-light'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-brand-primary bg-brand-primary text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-brand-title">{dept.name}</h4>
                      <div className="flex items-center space-x-3 text-xs text-brand-font mt-1">
                        <span>Code: <strong className="text-slate-800">{dept.code}</strong></span>
                        <span>•</span>
                        <span>{dept.programCount} Programs</span>
                        <span>•</span>
                        <span>{dept.subjectCount} Subjects</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedId}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition disabled:opacity-50"
            >
              <span>{t('auth.enterDashboard')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
