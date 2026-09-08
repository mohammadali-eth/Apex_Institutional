import { Material, MaterialUnit } from '../types';

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

let materialsStore: Material[] = [...mockInitialMaterials];
const listeners: Array<() => void> = [];

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
    author: string
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
        listeners.forEach(fn => fn());
        resolve(newMat);
      }, 800);
    });
  },

  approveMaterialStructure(id: string) {
    const mat = materialsStore.find(m => m.id === id);
    if (mat) {
      mat.status = 'approved';
      listeners.forEach(fn => fn());
    }
  },

  updateUnits(materialId: string, units: MaterialUnit[]) {
    const mat = materialsStore.find(m => m.id === materialId);
    if (mat) {
      mat.extractedUnits = units;
      mat.status = 'reviewed';
      listeners.forEach(fn => fn());
    }
  }
};
