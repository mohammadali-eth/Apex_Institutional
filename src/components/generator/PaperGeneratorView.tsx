import React, { useState } from 'react';
import { User, PaperGenerationContext } from '../../types';
import { GeneratorAcademicStep } from './GeneratorAcademicStep';
import { GeneratorDistributionStep } from './GeneratorDistributionStep';
import { GeneratorPreviewStep } from './GeneratorPreviewStep';
import { Layers, Sliders, CheckCircle2 } from 'lucide-react';

interface PaperGeneratorViewProps {
  currentUser: User;
  onNavigateHistory: () => void;
  initialReferencePaperId?: string;
  initialReferencePaperName?: string;
}

export const PaperGeneratorView: React.FC<PaperGeneratorViewProps> = ({
  currentUser,
  onNavigateHistory,
  initialReferencePaperId,
  initialReferencePaperName,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Paper Generation Context with defaults
  const [context, setContext] = useState<PaperGenerationContext>({
    institutionId: currentUser.institutionId,
    departmentId: currentUser.departmentId || 'dept-cs',
    programId: currentUser.departmentId === 'dept-cs' ? 'prog-bca' : 'prog-btech-ee',
    semesterId: currentUser.departmentId === 'dept-cs' ? 'sem-3' : 'sem-ee-3',
    subjectId: currentUser.departmentId === 'dept-cs' ? 'sub-ds' : 'sub-ecn',
    academicYear: '2026-27',
    examDuration: '3 Hours',
    totalMarks: 50,
    set: 'A',
    language: 'English',
    referencePaperId: initialReferencePaperId,
    referencePaperName: initialReferencePaperName,
    blueprint: [],
    advancedSettings: {
      excludePreviousPaperQuestions: true,
      reduceRepetitionFromRecent: true,
      excludePapersYears: 3,
      preventSimilarQuestions: true,
      autoBalanceUnits: true,
    },
  });

  const handleUpdateContext = (updates: Partial<PaperGenerationContext>) => {
    setContext(prev => ({ ...prev, ...updates }));
  };

  const handleReset = () => {
    setStep(1);
    setContext(prev => ({
      ...prev,
      referencePaperId: undefined,
      referencePaperName: undefined,
    }));
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
      {/* Wizard Progress Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {/* Step 1 */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step >= 1 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1
            </div>
            <span className={`text-xs font-semibold ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
              Academic & History
            </span>
          </div>

          <div className={`flex-1 h-0.5 mx-4 ${step >= 2 ? 'bg-brand-600' : 'bg-slate-200'}`} />

          {/* Step 2 */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step >= 2 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </div>
            <span className={`text-xs font-semibold ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
              Blueprint & Distribution
            </span>
          </div>

          <div className={`flex-1 h-0.5 mx-4 ${step === 3 ? 'bg-brand-600' : 'bg-slate-200'}`} />

          {/* Step 3 */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </div>
            <span className={`text-xs font-semibold ${step === 3 ? 'text-slate-900' : 'text-slate-400'}`}>
              Compiled Paper
            </span>
          </div>
        </div>
      </div>

      {/* Wizard Content */}
      {step === 1 && (
        <GeneratorAcademicStep
          currentUser={currentUser}
          context={context}
          onUpdateContext={handleUpdateContext}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <GeneratorDistributionStep
          context={context}
          onUpdateContext={handleUpdateContext}
          onBack={() => setStep(1)}
          onGenerate={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <GeneratorPreviewStep
          currentUser={currentUser}
          context={context}
          onReset={handleReset}
          onNavigateHistory={onNavigateHistory}
        />
      )}
    </div>
  );
};
