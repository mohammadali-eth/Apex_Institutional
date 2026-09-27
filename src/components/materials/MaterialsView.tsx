import React, { useState, useEffect } from 'react';
import { useDepartment } from '../../contexts/DepartmentContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { materialService } from '../../services/materialService';
import { mockSubjects } from '../../mock/academicData';
import { permissionService } from '../../lib/permissions/permissionService';
import { Material, MaterialUnit } from '../../types';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  ArrowRight,
  Clock,
  Layers
} from 'lucide-react';

export const MaterialsView: React.FC = () => {
  const { currentDepartment } = useDepartment();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const deptId = currentDepartment?.id || 'dept-cs';
  const subjects = mockSubjects.filter(s => s.departmentId === deptId && currentUser && permissionService.hasSubjectAccess(currentUser, s.id));

  const [materials, setMaterials] = useState<Material[]>(() => materialService.getMaterialsByDepartment(deptId));
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || 'sub-ds');
  const [uploadType, setUploadType] = useState<'pdf' | 'scanned_image' | 'text_paste'>('pdf');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);

  useEffect(() => {
    return materialService.subscribe(() => {
      setMaterials(materialService.getMaterialsByDepartment(deptId));
    });
  }, [deptId]);

  const handleStartExtraction = async () => {
    const subject = subjects.find(s => s.id === selectedSubjectId);
    const title = fileName || (uploadType === 'text_paste' ? 'Manual_Syllabus_Paste.txt' : 'Uploaded_Curriculum_Doc.pdf');
    setIsProcessing(true);

    const mat = await materialService.simulateUploadAndExtraction(
      title,
      selectedSubjectId,
      subject?.name || 'Data Structures',
      deptId,
      uploadType,
      currentUser?.name || 'Faculty',
      pastedText
    );

    setIsProcessing(false);
    setActiveMaterial(mat);
    setFileName('');
    setPastedText('');
  };

  const handleApprove = (id: string) => {
    if (!currentUser || !permissionService.hasAnyPermission(currentUser, ['question_bank.manage', 'question.approve'])) return;
    materialService.approveMaterialStructure(id);
    if (activeMaterial && activeMaterial.id === id) {
      setActiveMaterial({ ...activeMaterial, status: 'approved' });
    }
    showToast('Syllabus Approved', 'The curriculum structure has been synchronized with the question bank.', 'success');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-brand-primary" />
            <h1 className="text-2xl font-bold text-brand-title">Materials & Syllabus Ingestion</h1>
          </div>
          <p className="text-xs text-brand-paragraph mt-1">
            Simulated OCR & structure extraction. Extracted units/chapters require faculty verification before syncing with question bank.
          </p>
        </div>
      </div>

      {/* Ingestion Console */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-brand-title flex items-center space-x-2 border-b border-slate-100 pb-3">
          <UploadCloud className="h-4 w-4 text-brand-primary" />
          <span>Upload Syllabus Document or Paste Text</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
              Select Subject Target
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-brand-title focus:ring-2 focus:ring-brand-primary"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
              Ingestion Source Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pdf', label: 'PDF Upload', icon: FileText },
                { id: 'scanned_image', label: 'OCR Image', icon: ImageIcon },
                { id: 'text_paste', label: 'Text Paste', icon: Edit2 },
              ].map(m => {
                const Icon = m.icon;
                const isSelected = uploadType === m.id;
                return (
            <button
                    key={m.id}
                    type="button"
                    onClick={() => setUploadType(m.id as any)}
                    className={`py-2 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1 transition ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary-light text-slate-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Source Input */}
        {uploadType === 'text_paste' ? (
          <div>
            <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
              Paste Syllabus Content
            </label>
            <textarea
              rows={4}
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Paste raw curriculum text, unit definitions, topic headings..."
              className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-brand-primary bg-slate-50/50 transition cursor-pointer">
            <UploadCloud className="h-8 w-8 text-brand-font mx-auto mb-2" />
            <span className="text-xs font-semibold text-brand-title block">
              Click to browse or drop {uploadType === 'pdf' ? 'Syllabus PDF' : 'Scanned Exam/Curriculum Image'} here
            </span>
            <span className="text-[11px] text-brand-font mt-1 block">
              Simulated optical character recognition & structural tree parsing
            </span>
            <input
              type="file"
              onChange={e => {
                const file = e.target.files?.[0];
                setFileName(file?.name || '');
                if (file && file.type.startsWith('text/')) file.text().then(setPastedText);
              }}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="mt-3 inline-block px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-brand-title cursor-pointer hover:bg-slate-50 shadow-sm">
              {fileName || 'Select File from Device'}
            </label>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleStartExtraction}
            disabled={isProcessing}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isProcessing ? 'Extracting Structure...' : 'Extract Syllabus Hierarchy'}</span>
          </button>
        </div>
      </div>

      {/* Extracted Tree / Verification Workspace (Requirement #15) */}
      {activeMaterial && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center space-x-1.5 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold mb-1">
                <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                <span>Generated / Detected — Review Required (Requirement #15)</span>
              </div>
              <h3 className="text-base font-bold text-brand-title">{activeMaterial.title}</h3>
              <p className="text-xs text-brand-font">{activeMaterial.subjectName} • Uploaded by {activeMaterial.uploadedBy}</p>
            </div>

            <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleApprove(activeMaterial.id)}
              hidden={!currentUser || !permissionService.hasAnyPermission(currentUser, ['question_bank.manage', 'question.approve'])}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Approve & Sync with Question Bank</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {activeMaterial.extractedUnits.map((u) => (
              <div key={u.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-title">{u.name}</span>
                  <span className="text-[11px] font-semibold text-brand-font bg-white px-2 py-0.5 rounded border">
                    {u.topics.length} Detected Topics
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {u.topics.map(t => (
                    <div key={t.id} className="p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                      <span className="text-slate-800">{t.name}</span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        {t.confidenceScore}% match
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Repository List */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-brand-title">Department Syllabus Repository</h3>
        <div className="space-y-3">
          {materials.map(m => (
            <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-brand-title">{m.title}</h4>
                <div className="flex items-center space-x-2 text-[11px] text-brand-font mt-0.5">
                  <span>{m.subjectName}</span>
                  <span>•</span>
                  <span>Uploaded {m.uploadedAt} by {m.uploadedBy}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  m.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {m.status === 'approved' ? 'Approved' : 'Review Required'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveMaterial(m)}
                  className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover"
                >
                  Inspect Hierarchy →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
