# Documentation & Architecture Changelog: QPMS

## Purpose
This document maintains the version history, architectural revisions, and change records for all documentation and engineering specifications of the **University Question Paper Management & Generation System**.

## Scope
Tracks revisions across `/docs/` and root architectural assets.

---

## Change Log

### [1.0.0] — 2026-09-24: Initial Architecture & Documentation Baseline
**Lead Architect & Senior Engineering Team**

#### Added
- **Project Discovery & Foundations:**
  - Created [README.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/README.md) as the central documentation portal and stakeholder reading matrix.
  - Created [PROJECT_OVERVIEW.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PROJECT_OVERVIEW.md) defining vision, business drivers, problem statement, and 9 target personas.
  - Created [REQUIREMENTS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/REQUIREMENTS.md) establishing master requirements baseline and MoSCoW prioritization.
  - Created [FUNCTIONAL_REQUIREMENTS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/FUNCTIONAL_REQUIREMENTS.md) detailing modules FR-01 through FR-12.
  - Created [NON_FUNCTIONAL_REQUIREMENTS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/NON_FUNCTIONAL_REQUIREMENTS.md) defining latency budgets, security, and 10-year archival retention.
- **System Architecture & ADRs:**
  - Created [ARCHITECTURE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ARCHITECTURE.md) documenting modular monolith / microservices-ready topology and C4 diagrams.
  - Created [ARCHITECTURE_DECISIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ARCHITECTURE_DECISIONS.md) indexing ADR-001 through ADR-010.
  - Ratified 10 Architectural Decision Records:
    - `ADR-001`: Multi-Institution Multi-Tenancy Architecture (Shared Database with PostgreSQL RLS).
    - `ADR-002`: Flexible Academic Hierarchy & Curriculum Scheme Versioning.
    - `ADR-003`: Immutable Question Versioning & Translation Model.
    - `ADR-004`: Question Paper Versioning & Cryptographic Snapshotting.
    - `ADR-005`: Authentication & Session Security (HttpOnly Cookies + JWT + MFA).
    - `ADR-006`: Fine-Grained Role & Scope-Based Authorization (RBAC + ABAC).
    - `ADR-007`: Database Strategy (PostgreSQL 16+ with RLS and JSONB).
    - `ADR-008`: Constraint-Satisfaction Paper Generation Engine (Backtracking CSP Solver).
    - `ADR-009`: Server-Side Headless Chromium PDF Engine with Dynamic Watermarking.
    - `ADR-010`: Cryptographic Tamper-Evident Forensic Audit Logging (Merkle Hash Chaining).
- **Domain Modeling & Database Design:**
  - Created [DOMAIN_MODEL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DOMAIN_MODEL.md) detailing Ubiquitous Language, Bounded Contexts, Aggregates, and Domain Events.
  - Created [DATA_MODEL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DATA_MODEL.md) defining logical data model, entities, and cardinality.
  - Created [DATABASE_DESIGN.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DATABASE_DESIGN.md) providing complete physical PostgreSQL 16+ DDL script (17 tables), indexes, and RLS policies.
  - Created [ERD.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ERD.md) with visual Mermaid diagrams.
- **Identity, Security & Question Bank:**
  - Created [AUTHENTICATION_AUTHORIZATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/AUTHENTICATION_AUTHORIZATION.md) specifying token lifecycles and department context resolution flows.
  - Created [ROLES_PERMISSIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ROLES_PERMISSIONS.md) with a 12-role functional permission matrix.
  - Created [SECURITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SECURITY.md) detailing STRIDE threat model, AES-256 envelope encryption, and secrecy custody handover.
  - Created [QUESTION_BANK.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_BANK.md) specifying Bloom's taxonomy and KaTeX mathematical formula rendering.
  - Created [QUESTION_LIFECYCLE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_LIFECYCLE.md) specifying the question state machine and immutable version bumping.
  - Created [QUESTION_TYPES.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_TYPES.md) detailing schemas and rubrics for 15 question types.
- **Generation Engine & Exam Administration:**
  - Created [QUESTION_PAPER_GENERATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_PAPER_GENERATION.md) detailing mathematical CSP formulation and deficit diagnostics.
  - Created [QUESTION_PAPER_LIFECYCLE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_PAPER_LIFECYCLE.md) defining the paper lifecycle and CoE vault locking.
  - Created [PAPER_BLUEPRINT.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PAPER_BLUEPRINT.md) specifying visual blueprint structure and real-time mark validation.
  - Created [EXAM_MANAGEMENT.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/EXAM_MANAGEMENT.md) specifying timetables, paper codes, and center print quotas.
  - Created [WORKFLOW.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/WORKFLOW.md) mapping sequence diagrams for multi-party academic workflows.
  - Created [AUDIT_LOGGING.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/AUDIT_LOGGING.md) specifying append-only audit tables and cryptographic hash chaining.
  - Created [VERSIONING.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/VERSIONING.md) specifying bitemporal versioning and frozen JSON paper manifests.
- **APIs, Frontend & DevOps:**
  - Created [API_SPECIFICATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/API_SPECIFICATION.md) defining REST endpoint contracts.
  - Created [API_CONVENTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/API_CONVENTIONS.md) standardizing envelopes, status codes, and error payloads.
  - Created [FRONTEND_ARCHITECTURE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/FRONTEND_ARCHITECTURE.md) auditing current React components and defining the target directory structure.
  - Created [UI_UX_GUIDELINES.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/UI_UX_GUIDELINES.md) specifying design tokens, serif print typography, and WCAG 2.1 AA rules.
  - Created [SCREEN_MAP.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SCREEN_MAP.md) detailing all 14 screens and modal overlays.
  - Created [MULTILINGUAL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/MULTILINGUAL.md) detailing bilingual translation pairing and Google Noto font embedding.
  - Created [PDF_GENERATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PDF_GENERATION.md) specifying server-side Chromium rendering and dynamic watermarks.
  - Created [TESTING_STRATEGY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/TESTING_STRATEGY.md) defining the testing pyramid, property-based tests, and Playwright E2E suites.
  - Created [DEPLOYMENT.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DEPLOYMENT.md) defining Docker containers, Kubernetes topologies, and environment variables.
  - Created [DEVOPS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DEVOPS.md) detailing GitHub Actions CI/CD, database migrations, and disaster recovery.
  - Created [PERFORMANCE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PERFORMANCE.md) defining latency budgets, $O(1)$ candidate bucketing, and Redis caching.
  - Created [SCALABILITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SCALABILITY.md) specifying 5-year growth capacity models and 10-year WORM archival tiering.
- **Analysis, Planning & Governance:**
  - Created [GAP_ANALYSIS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/GAP_ANALYSIS.md) identifying 23 technical debt items across Critical, High, Medium, and Low severities.
  - Created [RISKS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/RISKS.md) detailing risk scores and technical mitigations across security and operations.
  - Created [ASSUMPTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ASSUMPTIONS.md) documenting technical, product, and organizational assumptions.
  - Created [OPEN_QUESTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/OPEN_QUESTIONS.md) documenting 5 key architectural decisions requiring stakeholder alignment.
  - Created [ROADMAP.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ROADMAP.md) detailing the 14-phase implementation plan (Phase 0 to Phase 13).
  - Created [IMPLEMENTATION_PLAN.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/IMPLEMENTATION_PLAN.md) providing the engineering backlog, WBS, Definition of Done, and Requirements Traceability Matrix.
  - Created root [PROJECT_ANALYSIS_SUMMARY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/PROJECT_ANALYSIS_SUMMARY.md) summarizing the entire discovery and architecture analysis.

---

## Current State vs. Proposed State

* **Current State:** No changelog or versioning history existed for the project.
* **Proposed State:** A formal changelog maintaining complete visibility into all architectural decisions, additions, and modifications.

## Decisions
1. Maintain this changelog following the Keep a Changelog standard with Semantic Versioning.

## Open Questions
- None.

## Related Documents
- [README.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/README.md)
- [PROJECT_OVERVIEW.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PROJECT_OVERVIEW.md)
