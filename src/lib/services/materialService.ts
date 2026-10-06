import { Material, MaterialUnit } from '@/types';
import { loadDemoState, saveDemoState } from '@/data/demoState';

const mockInitialMaterials: Material[] = [
  {
    id: 'mat-001',
    title: 'CS301_Data_Structures_Syllabus_2026.pdf',
    subjectId: 'sub-ds',
    subjectName: 'Data Structures',
    departmentId: 'dept-cs',
    sourceType: 'pdf',
    uploadedBy: 'Dr. Rahul Patel',
    uploadedAt: '10 March 2026',
    status: 'detected',
    extractedUnits: [
      {
        id: 'mu-1',
        unitNumber: 1,
        name: 'Unit 1 — Arrays & Algorithmic Complexity Analysis',
        topics: [
          { id: 't-1', name: 'Asymptotic Notations (Big-O, Omega, Theta)', confidenceScore: 96 },
          { id: 't-2', name: 'Multi-dimensional Array Address Calculation', confidenceScore: 92 },
          { id: 't-3', name: 'Sparse Matrix Representation & Transpose', confidenceScore: 89 }
        ]
      },
      {
        id: 'mu-2',
        unitNumber: 2,
        name: 'Unit 2 — Linked Lists & Dynamic Storage Allocation',
        topics: [
          { id: 't-4', name: 'Singly Linked List Insertion & Deletion', confidenceScore: 98 },
          { id: 't-5', name: 'Doubly Linked List & Circular Linked Lists', confidenceScore: 94 },
          { id: 't-6', name: 'Polynomial Addition using Linked Lists', confidenceScore: 91 }
        ]
      },
      {
        id: 'mu-3',
        unitNumber: 3,
        name: 'Unit 3 — Linear Data Structures: Stacks and Queues',
        topics: [
          { id: 't-7', name: 'Infix to Postfix Conversion and Evaluation', confidenceScore: 95 },
          { id: 't-8', name: 'Circular Queue and Double Ended Queue (Deque)', confidenceScore: 93 }
        ]
      }
    ]
  }
];

const MATERIAL_KEY = 'qpms_materials_v1';
const readMaterials = () => {
  try {
    const stored = localStorage.getItem(MATERIAL_KEY);
    if (stored) return JSON.parse(stored) as Material[];
  } catch { /* use demo seed */ }
  const centralized = loadDemoState().materials;
  return centralized.length ? centralized : [...mockInitialMaterials];
};
let materialsStore: Material[] = readMaterials();
const listeners: Array<() => void> = [];
const persist = (action: string) => {
  try { localStorage.setItem(MATERIAL_KEY, JSON.stringify(materialsStore)); } catch { /* storage is optional */ }
  const state = loadDemoState();
  state.materials = [...materialsStore];
  const actor=state.users.find(user=>user.id===state.activeUserId);
  const occurredAt=new Date().toISOString();
  state.auditEvents = [{ id: `audit-${Date.now()}`, action: 'MATERIAL_UPDATED', actorId: state.activeUserId || 'system', occurredAt, timestamp: occurredAt, userId: state.activeUserId || 'system', userName: actor?.name || 'System', resource: 'material', description: action, severity: 'INFO' as const }, ...state.auditEvents].slice(0, 100);
  state.notifications = [{ id: `notification-${Date.now()}`, title: 'Syllabus updated', message: action, read: false }, ...state.notifications].slice(0, 100);
  saveDemoState(state);
};

export const materialService = {
  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  getMaterialsByDepartment(deptId: string): Material[] {
    return materialsStore.filter(m => m.departmentId === deptId);
  },

  simulateUploadAndExtraction(
    title: string,
    subjectId: string,
    subjectName: string,
    deptId: string,
    sourceType: 'pdf' | 'scanned_image' | 'text_paste',
    author: string,
    rawText = ''
  ): Promise<Material> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newMat: Material = {
          id: `mat-${Date.now()}`,
          title,
          subjectId,
          subjectName,
          departmentId: deptId,
          sourceType,
          uploadedBy: author,
          uploadedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          status: 'detected',
          rawText,
          extractedUnits: [
            {
              id: `mu-${Date.now()}-1`,
              unitNumber: 1,
              name: 'Detected Unit 1 — Foundational Principles',
              topics: [
                { id: `t-${Date.now()}-1`, name: 'Core Definition and Mathematical Proofs', confidenceScore: 94 },
                { id: `t-${Date.now()}-2`, name: 'Complexity Characterization', confidenceScore: 91 }
              ]
            },
            {
              id: `mu-${Date.now()}-2`,
              unitNumber: 2,
              name: 'Detected Unit 2 — Application & Algorithm Design',
              topics: [
                { id: `t-${Date.now()}-3`, name: 'Implementation Patterns & Edge Conditions', confidenceScore: 88 }
              ]
            }
          ]
        };
        materialsStore.unshift(newMat);
        persist(`Material ${newMat.title} extracted for subject ${subjectName}.`);
        listeners.forEach(fn => fn());
        resolve(newMat);
      }, 800);
    });
  },

  approveMaterialStructure(id: string) {
    const mat = materialsStore.find(m => m.id === id);
    if (mat) {
      mat.status = 'approved';
      const state = loadDemoState();
      for (const extracted of mat.extractedUnits) {
        let unitId = extracted.id;
        const existing = state.units.find(unit => unit.id === unitId || (unit.subjectId === mat.subjectId && unit.number === extracted.unitNumber));
        if (existing) unitId = existing.id;
        else state.units.push({ id: unitId, number: extracted.unitNumber, name: extracted.name, subjectId: mat.subjectId });
        for (const extractedTopic of extracted.topics) {
          if (!state.topics.some(topic => topic.id === extractedTopic.id)) state.topics.push({ id: extractedTopic.id, name: extractedTopic.name, subjectId: mat.subjectId, unitId, status: 'active' });
        }
      }
      saveDemoState(state);
      persist(`Approved syllabus structure ${mat.title}.`);
      listeners.forEach(fn => fn());
    }
  },

  updateUnits(materialId: string, units: MaterialUnit[]) {
    const mat = materialsStore.find(m => m.id === materialId);
    if (mat) {
      mat.extractedUnits = units;
      mat.status = 'reviewed';
      persist(`Updated detected syllabus structure ${mat.title}.`);
      listeners.forEach(fn => fn());
    }
  }
};
