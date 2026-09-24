# API Specification (OpenAPI / REST): QPMS

## Purpose
This document provides the definitive REST API specification for the **University Question Paper Management & Generation System**. It details endpoint contracts, request payloads, response schemas, authentication requirements, and status codes.

## Scope
Covers all public and internal RESTful API endpoints across Authentication, Academic Structure, Question Bank, Blueprints, Paper Generation, Approvals, and Audit Logs.

---

## 1. Authentication & Session Endpoints

### 1.1 `POST /api/v1/auth/login`
- **Purpose:** Authenticate user credentials and establish session cookies.
- **Auth:** None (Public).
- **Request Body:**
  ```json
  {
    "email": "sunita.sharma@apexuniversity.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "status": "SUCCESS",
    "data": {
      "user": {
        "id": "u-sunita-9921",
        "name": "Prof. Sunita Sharma",
        "email": "sunita.sharma@apexuniversity.edu",
        "institutionId": "inst-apex",
        "institutionName": "Apex Institute of Technology & Science",
        "activeDepartmentId": "dept-cs",
        "activeDepartmentName": "Department of Computer Science & Engineering",
        "assignedDepartments": [
          { "id": "dept-cs", "name": "Department of Computer Science & Engineering", "code": "CSE" }
        ]
      },
      "departmentResolution": "RESOLVED"
    }
  }
  ```

### 1.2 `POST /api/v1/auth/switch-department`
- **Purpose:** Switch active department context for users teaching across multiple departments.
- **Auth:** Requires valid `qpms_at` session cookie.
- **Request Body:** `{ "departmentId": "dept-ai" }`
- **Response `200 OK`:** Re-issues updated session cookie bound to `dept-ai`.

---

## 2. Academic Hierarchy Endpoints

### 2.1 `GET /api/v1/academic/programs`
- **Query Params:** `?departmentId=dept-cs`
- **Response `200 OK`:** List of programs belonging to the department.

### 2.2 `GET /api/v1/academic/courses`
- **Query Params:** `?departmentId=dept-cs&programId=prog-bca&termNumber=3`
- **Response `200 OK`:** List of courses offered in that term, including syllabus unit counts.

### 2.3 `GET /api/v1/academic/courses/:courseId/units`
- **Response `200 OK`:** Ordered syllabus units with weightage percentages.

---

## 3. Question Bank Endpoints

### 3.1 `GET /api/v1/questions`
- **Query Params:**
  - `courseId` (UUID, required)
  - `unitId` (UUID, optional)
  - `status` (`Draft`, `Submitted`, `Approved`, `Rejected`, `Archived`)
  - `difficulty` (`Easy`, `Medium`, `Hard`)
  - `bloomLevel` (`Remember`, `Understand`, `Apply`, `Analyze`, `Evaluate`, `Create`)
  - `search` (string, full-text search)
  - `page` (int, default 1), `limit` (int, default 20)
- **Response `200 OK`:**
  ```json
  {
    "status": "SUCCESS",
    "data": {
      "items": [
        {
          "id": "Q-1025",
          "rootId": "qr-9921-1025",
          "version": 1,
          "courseId": "sub-ds",
          "unitId": "unit-ds-3",
          "unitName": "Unit 3 — Stacks & Queues",
          "type": "mcq",
          "text": "Which data structure is primarily used by compilers for syntax parsing and recursion management?",
          "marks": 1,
          "difficulty": "Easy",
          "bloomLevel": "Remember",
          "status": "Approved",
          "options": [
            { "key": "A", "text": "FIFO Queue" },
            { "key": "B", "text": "LIFO Stack" },
            { "key": "C", "text": "Binary Min-Heap" },
            { "key": "D", "text": "B-Tree" }
          ],
          "correctOption": "B",
          "createdBy": "Prof. Sunita Sharma",
          "createdAt": "2026-03-12"
        }
      ],
      "pagination": { "totalItems": 48, "totalPages": 3, "currentPage": 1 }
    }
  }
  ```

### 3.2 `POST /api/v1/questions`
- **Purpose:** Create a new draft question.
- **Auth:** `qbank:question:create`

### 3.3 `PUT /api/v1/questions/:id`
- **Purpose:** Update question. If current version is Approved, automatically generates version $vN+1$.
- **Auth:** `qbank:question:update_own` or `qbank:question:update_any`

### 3.4 `POST /api/v1/questions/:id/approve`
- **Purpose:** Formally approve a question version.
- **Auth:** `qbank:question:approve`

### 3.5 `POST /api/v1/questions/:id/reject`
- **Purpose:** Reject a question version with mandatory feedback.
- **Request Body:** `{ "reason": "Option D is factually ambiguous; revise with standard terminology." }`

---

## 4. Question Paper Generation Endpoints

### 4.1 `POST /api/v1/papers/generate`
- **Purpose:** Execute the algorithmic constraint-satisfaction paper generator.
- **Auth:** `paper:generator:execute`
- **Request Body:**
  ```json
  {
    "courseId": "sub-ds",
    "academicYear": "2026-27",
    "termName": "Semester 3 Regular Examinations",
    "totalMarks": 50,
    "examDuration": "3 Hours",
    "blueprint": [
      { "questionType": "mcq", "questionCount": 10, "marksPerQuestion": 1 },
      { "questionType": "short", "questionCount": 5, "marksPerQuestion": 2 },
      { "questionType": "long", "questionCount": 4, "marksPerQuestion": 5 },
      { "questionType": "essay", "questionCount": 1, "marksPerQuestion": 10 }
    ],
    "constraints": {
      "excludePreviousPaperQuestions": true,
      "excludePapersYears": 3,
      "reduceRepetitionFromRecent": true,
      "autoBalanceUnits": true,
      "generateSets": ["A", "B", "C", "D"]
    }
  }
  ```
- **Response `200 OK`:** Generated paper payload with Sets A, B, C, D and question breakdown.
- **Response `422 Unprocessable Entity` (Pool Insufficient):** Deficit diagnostic matrix explaining shortfalls.

### 4.2 `GET /api/v1/papers/history`
- **Purpose:** Retrieve previously generated examination papers for subject and department.
- **Auth:** `paper:history:view`

### 4.3 `POST /api/v1/papers/:id/lock`
- **Purpose:** Controller of Examinations seals paper in secrecy vault.
- **Auth:** `paper:secrecy:lock`

### 4.4 `GET /api/v1/papers/:id/export-pdf`
- **Purpose:** Render and stream watermarked PDF.
- **Auth:** `paper:custody:print`
- **Response:** `application/pdf` binary stream with dynamic watermark.

---

## Current State vs. Proposed State

* **Current State:** Zero REST API endpoints exist. All operations are simulated by direct function calls to in-memory/localStorage stores in `src/services/`.
* **Proposed State:** A complete OpenAPI 3.1 REST API specification covering authentication, academics, question banking, paper generation, and PDF streaming.

## Decisions
1. Follow standard REST conventions: nouns for resources, HTTP verbs for actions, standard HTTP status codes.
2. Return a standardized JSON envelope with `status`, `data`, and `error` across all responses.

## Open Questions
- None.

## Related Documents
- [API_CONVENTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/API_CONVENTIONS.md)
- [AUTHENTICATION_AUTHORIZATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/AUTHENTICATION_AUTHORIZATION.md)
- [QUESTION_PAPER_GENERATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_PAPER_GENERATION.md)
