import { User, Institution, Department, Program, Semester, Subject, Unit, Chapter } from '../types';

export const mockInstitutions: Institution[] = [
  {
    id: 'inst-apex',
    name: 'Apex Institute of Technology & Science',
    code: 'AITS-042',
    type: 'College',
    status: 'active',
  },
  {
    id: 'inst-univ',
    name: 'Gujarat Technological Apex University',
    code: 'GTAU-MAIN',
    type: 'University',
    status: 'active',
  }
];

export const mockDepartments: Department[] = [
  {
    id: 'dept-cs',
    name: 'Department of Computer Science & Engineering',
    code: 'CSE',
    institutionId: 'inst-apex',
    hodName: 'Prof. Sunita Sharma',
    status: 'active',
  },
  {
    id: 'dept-ai',
    name: 'Department of Artificial Intelligence & Data Science',
    code: 'AIDS',
    institutionId: 'inst-apex',
    hodName: 'Dr. Vikram Sarabhai',
    status: 'active',
  },
  {
    id: 'dept-ee',
    name: 'Department of Electrical Engineering',
    code: 'EE',
    institutionId: 'inst-apex',
    hodName: 'Prof. K. Swaminathan',
    status: 'active',
  }
];

export const mockPrograms: Program[] = [
  {
    id: 'prog-bca',
    name: 'Bachelor of Computer Applications (BCA)',
    code: 'BCA',
    departmentId: 'dept-cs',
    durationYears: 3,
    status: 'active',
  },
  {
    id: 'prog-btech-cs',
    name: 'B.Tech Computer Science & Engineering',
    code: 'BTECH-CSE',
    departmentId: 'dept-cs',
    durationYears: 4,
    status: 'active',
  },
  {
    id: 'prog-btech-ai',
    name: 'B.Tech Artificial Intelligence & Machine Learning',
    code: 'BTECH-AIML',
    departmentId: 'dept-ai',
    durationYears: 4,
    status: 'active',
  },
  {
    id: 'prog-btech-ee',
    name: 'B.Tech Electrical Engineering',
    code: 'BTECH-EE',
    departmentId: 'dept-ee',
    durationYears: 4,
    status: 'active',
  }
];

export const mockSemesters: Semester[] = [
  { id: 'sem-1', number: 1, label: 'Semester 1', programId: 'prog-bca' },
  { id: 'sem-2', number: 2, label: 'Semester 2', programId: 'prog-bca' },
  { id: 'sem-3', number: 3, label: 'Semester 3', programId: 'prog-bca' },
  { id: 'sem-4', number: 4, label: 'Semester 4', programId: 'prog-bca' },
  { id: 'sem-5', number: 5, label: 'Semester 5', programId: 'prog-bca' },
  { id: 'sem-6', number: 6, label: 'Semester 6', programId: 'prog-bca' },
  { id: 'sem-ai-3', number: 3, label: 'Semester 3', programId: 'prog-btech-ai' },
  { id: 'sem-ee-3', number: 3, label: 'Semester 3', programId: 'prog-btech-ee' },
];

export const mockSubjects: Subject[] = [
  {
    id: 'sub-ds',
    name: 'Data Structures',
    code: 'CS-301',
    departmentId: 'dept-cs',
    programId: 'prog-bca',
    semesterId: 'sem-3',
    credits: 4,
    language: 'English',
    unitCount: 5,
    questionCount: 48,
    status: 'active',
  },
  {
    id: 'sub-dbms',
    name: 'Database Management Systems',
    code: 'CS-302',
    departmentId: 'dept-cs',
    programId: 'prog-bca',
    semesterId: 'sem-3',
    credits: 4,
    language: 'English',
    unitCount: 5,
    questionCount: 42,
    status: 'active',
  },
  {
    id: 'sub-os',
    name: 'Operating Systems',
    code: 'CS-401',
    departmentId: 'dept-cs',
    programId: 'prog-bca',
    semesterId: 'sem-4',
    credits: 4,
    language: 'English',
    unitCount: 5,
    questionCount: 35,
    status: 'active',
  },
  {
    id: 'sub-algo',
    name: 'Design & Analysis of Algorithms',
    code: 'CS-402',
    departmentId: 'dept-cs',
    programId: 'prog-bca',
    semesterId: 'sem-4',
    credits: 4,
    language: 'English',
    unitCount: 5,
    questionCount: 39,
    status: 'active',
  },
  {
    id: 'sub-ml',
    name: 'Machine Learning Fundamentals',
    code: 'AI-301',
    departmentId: 'dept-ai',
    programId: 'prog-btech-ai',
    semesterId: 'sem-ai-3',
    credits: 4,
    language: 'English',
    unitCount: 5,
    questionCount: 30,
    status: 'active',
  },
  {
    id: 'sub-ecn',
    name: 'Electric Circuits & Networks',
    code: 'EE-301',
    departmentId: 'dept-ee',
    programId: 'prog-btech-ee',
    semesterId: 'sem-ee-3',
    credits: 4,
    language: 'English',
    unitCount: 5,
    questionCount: 28,
    status: 'active',
  }
];

export const mockUnits: Unit[] = [
  { id: 'unit-ds-1', number: 1, name: 'Unit 1 — Arrays & Algorithmic Complexity', subjectId: 'sub-ds', weightagePercent: 20 },
  { id: 'unit-ds-2', number: 2, name: 'Unit 2 — Linked Lists & Variations', subjectId: 'sub-ds', weightagePercent: 20 },
  { id: 'unit-ds-3', number: 3, name: 'Unit 3 — Stacks & Queues Applications', subjectId: 'sub-ds', weightagePercent: 20 },
  { id: 'unit-ds-4', number: 4, name: 'Unit 4 — Trees & Binary Search Trees', subjectId: 'sub-ds', weightagePercent: 20 },
  { id: 'unit-ds-5', number: 5, name: 'Unit 5 — Graphs, Traversals & Hashing', subjectId: 'sub-ds', weightagePercent: 20 },
  
  { id: 'unit-dbms-1', number: 1, name: 'Unit 1 — ER Modeling & Relational Schema', subjectId: 'sub-dbms', weightagePercent: 25 },
  { id: 'unit-dbms-2', number: 2, name: 'Unit 2 — SQL & Normalization', subjectId: 'sub-dbms', weightagePercent: 25 },
  
  { id: 'unit-ai-1', number: 1, name: 'Unit 1 — Linear Regression & Gradient Descent', subjectId: 'sub-ml', weightagePercent: 25 },
  { id: 'unit-ee-1', number: 1, name: 'Unit 1 — Network Theorems & Circuit Laws', subjectId: 'sub-ecn', weightagePercent: 30 },
];

export const mockChapters: Chapter[] = [
  { id: 'ch-ds-2-1', name: 'Singly Linked Lists Operations', unitId: 'unit-ds-2' },
  { id: 'ch-ds-2-2', name: 'Doubly and Circular Linked Lists', unitId: 'unit-ds-2' },
  { id: 'ch-ds-3-1', name: 'Stack Implementation & Infix to Postfix', unitId: 'unit-ds-3' },
  { id: 'ch-ds-4-1', name: 'BST Insert, Delete and Traversals', unitId: 'unit-ds-4' },
];

/**
 * 6 Realistic Personas Covering Critical Login -> Department Flow (Requirements #5, #6, #10)
 */
export const mockUsers: User[] = [
  {
    id: 'u-rahul',
    name: 'Dr. Rahul Patel',
    email: 'rahul.patel@apexuniversity.edu',
    role: 'teacher',
    institutionId: 'inst-apex',
    institutionName: 'Apex Institute of Technology & Science',
    departmentId: 'dept-cs',
    departmentName: 'Department of Computer Science & Engineering',
    assignedDepartments: [
      {
        id: 'dept-cs',
        name: 'Department of Computer Science & Engineering',
        code: 'CSE',
        institutionId: 'inst-apex',
        institutionName: 'Apex Institute of Technology & Science',
        programCount: 2,
        subjectCount: 4,
      }
    ]
  },
  {
    id: 'u-amit',
    name: 'Prof. Amit Shah',
    email: 'amit.shah@apexuniversity.edu',
    role: 'teacher',
    institutionId: 'inst-apex',
    institutionName: 'Apex Institute of Technology & Science',
    assignedDepartments: [
      {
        id: 'dept-cs',
        name: 'Department of Computer Science & Engineering',
        code: 'CSE',
        institutionId: 'inst-apex',
        institutionName: 'Apex Institute of Technology & Science',
        programCount: 2,
        subjectCount: 4,
      },
      {
        id: 'dept-ai',
        name: 'Department of Artificial Intelligence & Data Science',
        code: 'AIDS',
        institutionId: 'inst-apex',
        institutionName: 'Apex Institute of Technology & Science',
        programCount: 1,
        subjectCount: 1,
      }
    ]
  },
  {
    id: 'u-neha',
    name: 'Dr. Neha Sharma',
    email: 'neha.sharma@apexuniversity.edu',
    role: 'teacher',
    institutionId: 'inst-apex',
    institutionName: 'Apex Institute of Technology & Science',
    assignedDepartments: [] // No department assigned scenario
  },
  {
    id: 'u-sunita',
    name: 'Prof. Sunita Sharma',
    email: 'sunita.sharma@apexuniversity.edu',
    role: 'hod',
    institutionId: 'inst-apex',
    institutionName: 'Apex Institute of Technology & Science',
    departmentId: 'dept-cs',
    departmentName: 'Department of Computer Science & Engineering',
    assignedDepartments: [
      {
        id: 'dept-cs',
        name: 'Department of Computer Science & Engineering',
        code: 'CSE',
        institutionId: 'inst-apex',
        institutionName: 'Apex Institute of Technology & Science',
        programCount: 2,
        subjectCount: 4,
      }
    ]
  },
  {
    id: 'u-rajesh',
    name: 'Prof. Rajesh Joshi',
    email: 'rajesh.joshi@apexuniversity.edu',
    role: 'coordinator',
    institutionId: 'inst-apex',
    institutionName: 'Apex Institute of Technology & Science',
    departmentId: 'dept-cs',
    departmentName: 'Department of Computer Science & Engineering',
    assignedDepartments: [
      {
        id: 'dept-cs',
        name: 'Department of Computer Science & Engineering',
        code: 'CSE',
        institutionId: 'inst-apex',
        institutionName: 'Apex Institute of Technology & Science',
        programCount: 2,
        subjectCount: 4,
      },
      {
        id: 'dept-ai',
        name: 'Department of Artificial Intelligence & Data Science',
        code: 'AIDS',
        institutionId: 'inst-apex',
        institutionName: 'Apex Institute of Technology & Science',
        programCount: 1,
        subjectCount: 1,
      },
      {
        id: 'dept-ee',
        name: 'Department of Electrical Engineering',
        code: 'EE',
        institutionId: 'inst-apex',
        institutionName: 'Apex Institute of Technology & Science',
        programCount: 1,
        subjectCount: 1,
      }
    ]
  },
  {
    id: 'u-mehta',
    name: 'Dr. V. K. Mehta',
    email: 'vk.mehta@gtau.ac.in',
    role: 'university_admin',
    institutionId: 'inst-univ',
    institutionName: 'Gujarat Technological Apex University',
    assignedDepartments: []
  }
];
