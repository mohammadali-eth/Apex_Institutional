import { PreviousPaper } from '@/types';

export const initialPreviousPapers: PreviousPaper[] = [
  {
    id: 'QP-2026-001',
    institutionId: 'inst-apex',
    departmentId: 'dept-cs',
    programId: 'prog-bca',
    semesterId: 'sem-3',
    subjectId: 'sub-ds',
    subjectName: 'Data Structures',
    programName: 'Bachelor of Computer Applications (BCA)',
    academicYear: '2025-26',
    generatedAt: '12 March 2026',
    totalMarks: 50,
    duration: '3 Hours',
    language: 'English',
    set: 'A',
    questionCount: 42,
    unitCount: 5,
    status: 'approved',
    createdBy: 'Prof. Sunita Sharma',
    questionVersionsUsed: [
      { questionId: 'Q-1024', version: 3 },
      { questionId: 'Q-1025', version: 1 },
    ],
    sections: [
      {
        id: 'sec-a',
        title: 'SECTION A: Objective & Conceptual Questions',
        instructions: 'Answer all questions. Each question carries 1 mark.',
        marksPerQuestion: 1,
        questions: [
          {
            id: 'pq-1',
            questionId: 'Q-1025',
            version: 1,
            text: 'Which data structure is primarily used by compilers for syntax parsing and function call recursion management?',
            marks: 1,
            unitName: 'Unit 3 — Stacks & Queues',
            difficulty: 'Easy',
            type: 'mcq',
            options: [
              { key: 'A', text: 'FIFO Queue' },
              { key: 'B', text: 'LIFO Stack' },
              { key: 'C', text: 'Binary Min-Heap' },
              { key: 'D', text: 'B-Tree' }
            ]
          },
          {
            id: 'pq-2',
            questionId: 'Q-1011',
            version: 1,
            text: 'What is the worst-case search time complexity in a balanced AVL tree with n elements?',
            marks: 1,
            unitName: 'Unit 4 — Trees',
            difficulty: 'Easy',
            type: 'mcq',
            options: [
              { key: 'A', text: 'O(1)' },
              { key: 'B', text: 'O(log n)' },
              { key: 'C', text: 'O(n)' },
              { key: 'D', text: 'O(n log n)' }
            ]
          }
        ]
      },
      {
        id: 'sec-b',
        title: 'SECTION B: Analytical & Descriptive Problems',
        instructions: 'Answer any 4 out of 6 questions. Each question carries 2 marks.',
        marksPerQuestion: 2,
        questions: [
          {
            id: 'pq-3',
            questionId: 'Q-1024',
            version: 3,
            text: 'Differentiate between a singly linked list and a doubly linked list in terms of memory overhead and traversal capabilities.',
            marks: 2,
            unitName: 'Unit 2 — Linked Lists',
            difficulty: 'Medium',
            type: 'short'
          },
          {
            id: 'pq-4',
            questionId: 'Q-1015',
            version: 1,
            text: 'Explain circular queue boundary conditions when queue is full and when empty using front and rear pointers.',
            marks: 2,
            unitName: 'Unit 3 — Stacks & Queues',
            difficulty: 'Medium',
            type: 'short'
          }
        ]
      },
      {
        id: 'sec-c',
        title: 'SECTION C: Comprehensive System Design & Implementation',
        instructions: 'Answer any 2 questions. Each question carries 5 marks.',
        marksPerQuestion: 5,
        questions: [
          {
            id: 'pq-5',
            questionId: 'Q-1026',
            version: 1,
            text: 'Explain the algorithm for deleting a node with two children in a Binary Search Tree. Provide step-by-step illustrations with an example.',
            marks: 5,
            unitName: 'Unit 4 — Trees',
            difficulty: 'Hard',
            type: 'long'
          }
        ]
      }
    ]
  },
  {
    id: 'QP-2025-004',
    institutionId: 'inst-apex',
    departmentId: 'dept-cs',
    programId: 'prog-bca',
    semesterId: 'sem-3',
    subjectId: 'sub-ds',
    subjectName: 'Data Structures',
    programName: 'Bachelor of Computer Applications (BCA)',
    academicYear: '2024-25',
    generatedAt: '18 March 2025',
    totalMarks: 50,
    duration: '3 Hours',
    language: 'English',
    set: 'B',
    questionCount: 38,
    unitCount: 5,
    status: 'approved',
    createdBy: 'Dr. Rahul Patel',
    questionVersionsUsed: [
      { questionId: 'Q-1024', version: 1 }
    ],
    sections: [
      {
        id: 'sec-25-a',
        title: 'SECTION A: Conceptual Fundamentals',
        instructions: 'Answer all questions. (10 x 1 = 10 Marks)',
        marksPerQuestion: 1,
        questions: [
          {
            id: 'pq-25-1',
            questionId: 'Q-1025',
            version: 1,
            text: 'Which data structure is primarily used by compilers for syntax parsing and function call recursion management?',
            marks: 1,
            unitName: 'Unit 3 — Stacks & Queues',
            difficulty: 'Easy',
            type: 'mcq'
          }
        ]
      },
      {
        id: 'sec-25-b',
        title: 'SECTION B: Technical Short Answers',
        instructions: 'Answer any 5 questions. (5 x 2 = 10 Marks)',
        marksPerQuestion: 2,
        questions: [
          {
            id: 'pq-25-2',
            questionId: 'Q-1024',
            version: 1,
            text: 'Explain singly linked list and its memory representation.',
            marks: 2,
            unitName: 'Unit 2 — Linked Lists',
            difficulty: 'Easy',
            type: 'short'
          }
        ]
      }
    ]
  },
  {
    id: 'QP-2024-008',
    institutionId: 'inst-apex',
    departmentId: 'dept-cs',
    programId: 'prog-bca',
    semesterId: 'sem-3',
    subjectId: 'sub-ds',
    subjectName: 'Data Structures',
    programName: 'Bachelor of Computer Applications (BCA)',
    academicYear: '2023-24',
    generatedAt: '22 March 2024',
    totalMarks: 50,
    duration: '3 Hours',
    language: 'English',
    set: 'A',
    questionCount: 40,
    unitCount: 5,
    status: 'archived',
    createdBy: 'Prof. Sunita Sharma',
    sections: [
      {
        id: 'sec-24-a',
        title: 'SECTION A: Core Definitions',
        instructions: 'All questions compulsory.',
        marksPerQuestion: 1,
        questions: []
      }
    ]
  },
  {
    id: 'QP-2023-012',
    institutionId: 'inst-apex',
    departmentId: 'dept-cs',
    programId: 'prog-bca',
    semesterId: 'sem-3',
    subjectId: 'sub-ds',
    subjectName: 'Data Structures',
    programName: 'Bachelor of Computer Applications (BCA)',
    academicYear: '2022-23',
    generatedAt: '15 March 2023',
    totalMarks: 50,
    duration: '3 Hours',
    language: 'English',
    set: 'C',
    questionCount: 35,
    unitCount: 4,
    status: 'archived',
    createdBy: 'Dr. Rahul Patel',
  },
  {
    id: 'QP-2025-019',
    institutionId: 'inst-apex',
    departmentId: 'dept-cs',
    programId: 'prog-bca',
    semesterId: 'sem-3',
    subjectId: 'sub-ds',
    subjectName: 'Data Structures',
    programName: 'Bachelor of Computer Applications (BCA)',
    academicYear: '2024-25',
    generatedAt: '25 November 2024',
    totalMarks: 50,
    duration: '3 Hours',
    language: 'English',
    set: 'D',
    questionCount: 40,
    unitCount: 5,
    status: 'approved',
    createdBy: 'Prof. Sunita Sharma',
  },
  {
    id: 'QP-2026-003',
    institutionId: 'inst-apex',
    departmentId: 'dept-cs',
    programId: 'prog-bca',
    semesterId: 'sem-3',
    subjectId: 'sub-dbms',
    subjectName: 'Database Management Systems',
    programName: 'Bachelor of Computer Applications (BCA)',
    academicYear: '2025-26',
    generatedAt: '14 March 2026',
    totalMarks: 50,
    duration: '3 Hours',
    language: 'English',
    set: 'A',
    questionCount: 36,
    unitCount: 4,
    status: 'approved',
    createdBy: 'Prof. Sunita Sharma',
  },
  {
    id: 'QP-2026-009',
    institutionId: 'inst-apex',
    departmentId: 'dept-ee',
    programId: 'prog-btech-ee',
    semesterId: 'sem-ee-3',
    subjectId: 'sub-ecn',
    subjectName: 'Electric Circuits & Networks',
    programName: 'B.Tech Electrical Engineering',
    academicYear: '2025-26',
    generatedAt: '10 March 2026',
    totalMarks: 70,
    duration: '3 Hours',
    language: 'English',
    set: 'A',
    questionCount: 25,
    unitCount: 5,
    status: 'approved',
    createdBy: 'Dr. Meera Rao',
    sections: [
      {
        id: 'sec-ee-1',
        title: 'SECTION 1: Circuit Theorems',
        instructions: 'Answer all 4 questions.',
        marksPerQuestion: 3,
        questions: [
          {
            id: 'pq-ee-1',
            questionId: 'Q-2001',
            version: 1,
            text: 'State Thevenin theorem and explain the procedure to calculate equivalent resistance (Rth)...',
            marks: 3,
            unitName: 'Unit 1 — Network Theorems',
            difficulty: 'Medium',
            type: 'short'
          }
        ]
      }
    ]
  }
];
