# Implementation Plan, Backlog & Traceability Matrix: QPMS

## Purpose
This document provides the operational engineering backlog, work breakdown structure (WBS), project-wide Definition of Done (DoD), and end-to-end Requirements Traceability Matrix for the **University Question Paper Management & Generation System**.

## Scope
Serves as the primary task management baseline for software engineers, QA leads, and technical project managers implementing the platform across all phases.

---

## 1. Project-Wide Definition of Done (DoD)

A feature or backlog ticket in the QPMS is considered **"Done"** ONLY when all of the following criteria are satisfied:

1. **Database Schema:** Tables, foreign keys, unique constraints, and Row-Level Security policies are applied via migration scripts and verified against Testcontainers.
2. **Backend API:** Endpoint implemented adhering strictly to OpenAPI 3.1 specification, returning standardized response envelopes, and validating inputs via Zod/class-validator.
3. **Authorization & Tenant Isolation:** Scoped RBAC/ABAC guards verify both role permissions and active department boundaries. Cross-tenant access is tested and strictly blocked.
4. **Validation & Error Handling:** Domain invariants, arithmetic checks, and boundary conditions handled with specific HTTP status codes and actionable error envelopes.
5. **Frontend UI Integration:** Components connected to live API endpoints via React Query hooks with loading spinners, empty states, and error toasts.
6. **Accessibility (WCAG 2.1 AA):** High-contrast color compliance (4.5:1), visible focus indicators, and keyboard navigation verified.
7. **Automated Testing:** Unit and integration tests achieving $\ge 85\%$ code coverage. Property tests passing for generation algorithms. Zero regression in CI.
8. **Audit Trail:** Mutating operations record structured events in the append-only audit trail with actor ID, IP address, and payload diff.
9. **Documentation:** API contracts, domain models, or schemas updated in `/docs` if altered during implementation.

---

## 2. Engineering Backlog & Work Breakdown Structure (WBS)

### Epic 1: Authentication & Tenant Identity (`AUTH`)
| Ticket ID | Feature Title | Priority | Dependencies | Acceptance Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **AUTH-001** | User Credential Auth API | **P0** | None | `POST /api/v1/auth/login` verifies Argon2id password hash; issues JWT access and refresh cookies. | Ready |
| **AUTH-002** | Department Scope Resolver | **P0** | AUTH-001 | Enforces 0-dept block, 1-dept auto-resolve, and >1-dept prompt. Re-issues token on context switch. | Ready |
| **AUTH-003** | TOTP Multi-Factor Auth | **P1** | AUTH-001 | Generates QR code secret; verifies 6-digit TOTP code for HOD, Admin, and Exam Cell roles. | Ready |
| **AUTH-004** | Token Rotation in Redis | **P1** | AUTH-001 | Refresh token family tracking in Redis. Immediate revocation of token family upon reuse detection. | Ready |

### Epic 2: Multi-Tenancy & Academic Hierarchy (`ACAD`)
| Ticket ID | Feature Title | Priority | Dependencies | Acceptance Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **ACAD-001** | Multi-Tenant DDL & RLS | **P0** | None | Schema migration script creating `institutions`, `departments`, and kernel RLS policies on `institution_id`. | Ready |
| **ACAD-002** | Academic Program & Terms | **P0** | ACAD-001 | CRUD endpoints for Programs supporting semesters, trimesters, and annual terms. | Ready |
| **ACAD-003** | Curriculum Scheme Versioning| **P0** | ACAD-002 | Supports coexisting curriculum schemes (e.g., 2022 vs 2025 scheme) mapped to course offerings. | Ready |
| **ACAD-004** | Syllabus Units & Weightage | **P1** | ACAD-003 | Units table with percentage weightage validation summing to 100% per course. | Ready |

### Epic 3: Question Bank & Taxonomy (`QBNK`)
| Ticket ID | Feature Title | Priority | Dependencies | Acceptance Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **QBNK-001** | Question Versioning Root | **P0** | ACAD-004 | Normalized dual-table schema (`question_roots` + `question_versions`) with incremental version numbers. | Ready |
| **QBNK-002** | 14+ Question Type Schemas | **P0** | QBNK-001 | JSONB schema validation for MCQs, Short, Long, Numerical, Coding, Match, and Assertion/Reason. | Ready |
| **QBNK-003** | Bloom's Taxonomy & CLO | **P1** | QBNK-001 | Mandatory classification across Bloom levels (L1-L6) and Course Outcome tagging. | Ready |
| **QBNK-004** | KaTeX Math & LaTeX Input | **P1** | QBNK-002 | Rich Markdown editor with real-time KaTeX mathematical equation preview. | Ready |
| **QBNK-005** | GIN Full-Text Search | **P1** | QBNK-001 | Sub-second keyword and tag searching across 500,000+ questions using PostgreSQL `tsvector`. | Ready |

### Epic 4: Moderation & Approval Workflow (`REV`)
| Ticket ID | Feature Title | Priority | Dependencies | Acceptance Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **REV-001** | Question State Machine | **P0** | QBNK-001 | State transitions (`Draft` $\rightarrow$ `Submitted` $\rightarrow$ `Approved`/`Rejected`). Role-based transition guards. | Ready |
| **REV-002** | Rejection Feedback Flow | **P1** | REV-001 | Mandatory feedback notes required upon question rejection; notifies author. | Ready |
| **REV-003** | Version Bumping on Edit | **P0** | REV-001 | Editing an Approved question automatically generates version $vN+1$ in Draft status; locks $vN$. | Ready |
| **REV-004** | Visual Version Diffing | **P2** | REV-003 | UI modal highlighting additions and deletions between any two version snapshots. | Ready |

### Epic 5: Visual Blueprinting & Generation Engine (`PGEN`)
| Ticket ID | Feature Title | Priority | Dependencies | Acceptance Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **PGEN-001** | Blueprint Data Schema | **P0** | ACAD-004 | Sectional rules, question quotas, and marks-per-question configuration with real-time arithmetic checks. | Ready |
| **PGEN-002** | Backtracking CSP Solver | **P0** | PGEN-001, QBNK-001| Solves constraint satisfaction problem: unit balancing, difficulty distribution, and mark totals. | Ready |
| **PGEN-003** | Lookback Anti-Repetition | **P0** | PGEN-002 | Filters out questions used in approved papers over the last 1 to 5 academic years. | Ready |
| **PGEN-004** | Multi-Set Permutations | **P1** | PGEN-002 | Synthesizes Sets A, B, C, and D with identical difficulty profiles and permuted item sequences. | Ready |
| **PGEN-005** | Deficit Diagnostic Matrix | **P1** | PGEN-002 | Terminates in $< 500$ ms if pool is insufficient, returning exact shortfall matrix by unit and type. | Ready |

### Epic 6: Exam Administration & PDF Print Engine (`EXAM` & `PDF`)
| Ticket ID | Feature Title | Priority | Dependencies | Acceptance Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **EXAM-001** | Exam Sessions & Timetables | **P1** | ACAD-002 | Binds generated papers to official exam dates, start times, and paper codes. | Ready |
| **PDF-001** | Headless Chromium Worker | **P0** | PGEN-002 | Dedicated Puppeteer worker compiling high-contrast academic A4 examination PDFs. | Ready |
| **PDF-002** | Forensic Watermarking | **P0** | PDF-001 | Injects non-removable diagonal watermark with custodian name, user ID, IP, and timestamp. | Ready |
| **PDF-003** | Verification QR Code Tag | **P1** | PDF-001 | Stamps HMAC-SHA256 signed 2D verification QR code in paper header. | Ready |

### Epic 7: Security Vault & Audit Logging (`AUDIT` & `SEC`)
| Ticket ID | Feature Title | Priority | Dependencies | Acceptance Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **SEC-001** | Paper Secrecy Vault Locking| **P0** | PGEN-002, AUTH-001 | Transitions paper to `LOCKED`; encrypts payload with AES-256 envelope encryption. | Ready |
| **SEC-002** | Time-Gated Decryption API | **P0** | SEC-001 | Restricts paper decryption to authorized print officers within 2 hours of exam start time. | Ready |
| **AUDIT-001**| Cryptographic Hash Chain | **P0** | None | Append-only partitioned audit table with SHA-256 Merkle hash chaining and trigger locks. | Ready |
| **AUDIT-002**| Print Custody Logging | **P0** | AUDIT-001, PDF-002 | Captures every paper preview, export, and print event with copy numbers. | Ready |

---

## 3. Requirements Traceability Matrix

| Requirement ID | Backlog Ticket | API Endpoint | Database Entities | UI Screen / Component | Automated Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-ORG-01** | ACAD-001 | `/api/v1/institutions` | `institutions` | System Settings | Integration: `tenant_rls_test.ts` |
| **REQ-ACAD-01** | ACAD-002 | `/api/v1/academic/programs` | `departments`, `programs` | `AcademicStructureView.tsx` | Unit: `academic_service_test.ts` |
| **REQ-ACAD-02** | ACAD-003 | `/api/v1/academic/curriculum` | `curriculum_schemes` | `AcademicStructureView.tsx` | Unit: `curriculum_test.ts` |
| **REQ-USER-01** | AUTH-002 | `/api/v1/auth/switch-department` | `user_department_roles` | `SelectDepartmentPage.tsx` | E2E: `department_flow_e2e.ts` |
| **REQ-USER-02** | AUTH-001 | `/api/v1/auth/login` | `users` | `LoginPage.tsx` | Integration: `auth_jwt_test.ts` |
| **REQ-QBNK-01** | QBNK-002 | `/api/v1/questions` | `question_versions` | `QuestionEditForm.tsx` | Unit: `qtypes_validation_test.ts` |
| **REQ-QBNK-02** | QBNK-004 | `/api/v1/questions` | `question_versions.text`| `QuestionEditForm.tsx` | Unit: `katex_math_test.ts` |
| **REQ-QLIFE-01** | REV-003 | `/api/v1/questions/:id` | `question_versions` | `VersionHistoryTimeline.tsx` | Unit: `version_bump_test.ts` |
| **REQ-QLIFE-02** | REV-001 | `/api/v1/questions/:id/approve` | `question_versions` | `ApprovalsView.tsx` | Integration: `approval_flow_test.ts` |
| **REQ-PGEN-01** | PGEN-001 | `/api/v1/blueprints` | `blueprints`, `sections`| `PaperGeneratorWizard.tsx` | Unit: `blueprint_math_test.ts` |
| **REQ-PGEN-02** | PGEN-002 | `/api/v1/papers/generate` | `question_papers` | `PaperGeneratorWizard.tsx` | Property: `generator_csp_test.ts` |
| **REQ-PGEN-03** | PGEN-003 | `/api/v1/papers/generate` | `paper_questions` | `GeneratorDistributionStep.tsx` | Property: `lookback_exclusion_test.ts`|
| **REQ-PGEN-04** | PGEN-004 | `/api/v1/papers/generate` | `question_papers` | `PaperGeneratorWizard.tsx` | Unit: `multi_set_permutation_test.ts`|
| **REQ-PLIFE-01** | SEC-001 | `/api/v1/papers/:id/lock` | `paper_snapshots` | `PaperHistoryView.tsx` | Integration: `secrecy_vault_test.ts` |
| **REQ-PDF-01** | PDF-001 | `/api/v1/papers/:id/export-pdf`| `paper_snapshots` | `PaperPreviewModal.tsx` | Visual: `pdf_typography_test.ts` |
| **REQ-PDF-02** | PDF-002 | `/api/v1/papers/:id/export-pdf`| S3 Object Vault | Printed Document | Integration: `watermark_stamp_test.ts` |
| **REQ-AUDIT-01** | AUDIT-001| `/api/v1/audit/logs` | `audit_logs` | Audit Inspection Table | Property: `merkle_hash_chain_test.ts` |

---

## Current State vs. Proposed State

* **Current State:** Tasks were not tracked; no formal backlog existed; Definition of Done was undefined; no requirements traceability matrix existed.
* **Proposed State:** An actionable engineering backlog categorized by Epics, MoSCoW priorities, clear acceptance criteria, a project-wide Definition of Done, and unbroken traceability from requirement to code and automated test suites.

## Decisions
1. Mandate that every sprint deliverable satisfy all 9 criteria of the Definition of Done before being accepted.
2. Require every code commit to reference a ticket ID (e.g., `git commit -m "feat(auth): implement department scope resolver [AUTH-002]"`).

## Open Questions
- None.

## Related Documents
- [REQUIREMENTS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/REQUIREMENTS.md)
- [ROADMAP.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ROADMAP.md)
- [TESTING_STRATEGY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/TESTING_STRATEGY.md)
