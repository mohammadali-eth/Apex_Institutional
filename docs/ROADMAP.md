# Engineering Implementation Roadmap (Phase 0 to Phase 13): QPMS

## Purpose
This document establishes the multi-phase implementation roadmap for the **University Question Paper Management & Generation System**, organizing engineering deliverables into 14 structured, sequential milestones.

## Scope
Covers the journey from architecture initialization (Phase 0) through backend foundations, security hardening, algorithmic engine development, and final production deployment.

---

## 1. Roadmap Overview & Timeline Phasing

```mermaid
gantt
    title QPMS 14-Phase Implementation Roadmap
    dateFormat  YYYY-MM-DD
    section Discovery & Foundations
    Phase 0: Architecture & Documentation     :done, p0, 2026-09-24, 2026-10-01
    Phase 1: Database & Backend Foundation     :active, p1, 2026-10-02, 2026-10-23
    Phase 2: Auth, RBAC & Department Scopes   :p2, 2026-10-24, 2026-11-14
    section Academic & Question Bank
    Phase 3: Academic Hierarchy & Curriculum   :p3, 2026-11-15, 2026-12-05
    Phase 4: Question Bank & Taxonomy          :p4, 2026-12-06, 2026-12-26
    Phase 5: Question Review & Moderation      :p5, 2026-12-27, 2027-01-16
    section Paper Generation & Exams
    Phase 6: Paper Management & Blueprints     :p6, 2027-01-17, 2027-02-06
    Phase 7: Constraint Generation Engine     :p7, 2027-02-07, 2027-02-27
    Phase 8: Exam Administration & Timetables  :p8, 2027-02-28, 2027-03-20
    section Export, Security & DevOps
    Phase 9: PDF Engine & Dynamic Watermarks   :p9, 2027-03-21, 2027-04-10
    Phase 10: Audit Trail, KMS & Hardening     :p10, 2027-04-11, 2027-05-01
    Phase 11: End-to-End Testing & Pilot       :p11, 2027-05-02, 2027-05-22
    Phase 12: Production Deployment            :p12, 2027-05-23, 2027-06-12
    Phase 13: Production Optimization & Scale  :p13, 2027-06-13, 2027-07-03
```

---

## 2. Phase-by-Phase Deliverables Matrix

### Phase 0: Discovery, Architecture & Documentation Initialization (Current Phase)
- **Objectives:** Inspect existing repository, analyze gaps, establish authoritative documentation baseline, and ratify ADRs.
- **Deliverables:** `/docs/` portal (35+ files), 10 ADRs, Requirements baseline, Data models, Backlog, and Project Analysis Summary.
- **Exit Criteria:** Documentation approved as single source of truth for engineering.

### Phase 1: Database & Backend Foundation
- **Objectives:** Stand up PostgreSQL 16+ database, configure ORM, establish Docker Compose, and build base REST API gateway.
- **Database:** Deploy schema DDL (17 tables), indexes, and basic RLS policies.
- **Backend:** Initialize NestJS / FastAPI project, configuration loader, and database connection pooling.
- **Deliverables:** Functioning local development environment via `docker-compose up`.

### Phase 2: Authentication, RBAC & Department Scope Resolution
- **Objectives:** Replace mock login with secure JWT/HttpOnly cookie authentication and department context resolution.
- **Features:** Password hashing (Argon2id), refresh token rotation, TOTP MFA, active department context switcher.
- **Frontend Work:** Connect `LoginPage`, `NoDepartmentPage`, and `SelectDepartmentPage` to live auth endpoints.

### Phase 3: Academic Hierarchy & Curriculum Management
- **Objectives:** Support multi-institution academic structures, departments, programs, and curriculum schemes.
- **Features:** Curriculum scheme versioning, course catalog, syllabus units, and credit configuration.
- **Frontend Work:** Connect `AcademicStructureView` to live REST APIs.

### Phase 4: Question Bank & Pedagogical Taxonomy
- **Objectives:** Support 14+ question types, LaTeX math input, diagrams, and Bloom's cognitive taxonomy tagging.
- **Features:** Rich Markdown/LaTeX editor with KaTeX preview, GIN-indexed full-text search, and tagging.
- **Frontend Work:** Upgrade `QuestionEditForm` and `QuestionBankView`.

### Phase 5: Question Review & Moderation Workflow
- **Objectives:** Implement question state machine (`Draft` $\rightarrow$ `Submitted` $\rightarrow$ `Approved`/`Rejected` $\rightarrow$ `Archived`).
- **Features:** Mandatory rejection comments, automated version bumping ($vN \rightarrow vN+1$), side-by-side visual diffing.
- **Frontend Work:** Connect `ApprovalsView`, `VersionHistoryTimeline`, and `VersionCompareModal`.

### Phase 6: Paper Management & Visual Blueprint Designer
- **Objectives:** Implement visual blueprint configuration with real-time arithmetic marks validation.
- **Features:** Sectional rules, question quotas, internal choice modeling, and reusable institutional master templates.
- **Frontend Work:** Upgrade Stage 4 of `PaperGeneratorWizard`.

### Phase 7: Algorithmic Constraint Paper Generation Engine
- **Objectives:** Build server-side deterministic CSP solver with heuristic backtracking.
- **Features:** Unit weightage balancing, Bloom taxonomy distribution, 1-5 year lookback exclusion, deficit diagnostics, and Sets A-D generation.
- **Testing:** 1,000+ property-based invariant test runs (`fast-check`).

### Phase 8: Exam Administration & Timetables
- **Objectives:** Bind generated papers to official academic exam sessions, timetables, course codes, and centers.
- **Features:** Exam session calendar, paper code registry, center quota management.

### Phase 9: Server-Side PDF Engine & Secure Printing
- **Objectives:** Dedicated headless Chromium worker generating high-contrast academic examination PDFs.
- **Features:** Dynamic user/IP watermarking, 2D verification QR codes, password-protected PDF exports, companion answer keys.

### Phase 10: Forensic Audit Logging, Secrecy Vault & Hardening
- **Objectives:** Implement append-only audit trail with SHA-256 hash chaining and envelope encryption on locked papers.
- **Features:** AWS KMS / Vault key integration, time-gated decryption APIs, trigger locks on audit tables, OWASP hardening.

### Phase 11: End-to-End Testing & Institutional Pilot
- **Objectives:** Comprehensive integration testing, penetration testing, and pilot deployment with a partner engineering college.
- **Features:** Full Playwright E2E suites, load testing via k6 (1,000 concurrent setters), faculty acceptance testing.

### Phase 12: Production Deployment & Zero-Downtime Infrastructure
- **Objectives:** Deploy to multi-AZ production Kubernetes cluster with automated CI/CD and disaster recovery.
- **Features:** Blue/Green deployment pipelines, automated WAL backups to S3, Prometheus/Grafana alerts.

### Phase 13: Production Optimization & Scaling
- **Objectives:** Advanced performance tuning for multi-university federation.
- **Features:** Redis L2 cache optimization, read-replica scaling, WORM 10-year archival tiering.

---

## Current State vs. Proposed State

* **Current State:** No formal roadmap or phasing plan existed. All features were mingled in a single client-side prototype.
* **Proposed State:** A structured 14-phase roadmap with explicit objectives, deliverables, dependencies, and exit criteria.

## Decisions
1. Execute backend and database foundational phases before refactoring frontend components.
2. Complete full property-based testing of the generation engine (Phase 7) before proceeding to official exam scheduling (Phase 8).

## Open Questions
- None.

## Related Documents
- [IMPLEMENTATION_PLAN.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/IMPLEMENTATION_PLAN.md)
- [GAP_ANALYSIS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/GAP_ANALYSIS.md)
- [TESTING_STRATEGY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/TESTING_STRATEGY.md)
