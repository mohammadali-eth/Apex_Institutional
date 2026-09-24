# University Question Paper Management & Generation System (QPMS)
## Master Documentation Index & Architecture Portal

## Purpose
This documentation repository serves as the authoritative, engineering-grade single source of truth for the design, architecture, implementation, and governance of the **University-level Multi-Institution Question Paper Management & Generation System (QPMS)**.

## Scope
This portal indexes all architectural specifications, domain models, database schemas, security protocols, API contracts, frontend designs, algorithms, gap analyses, and implementation roadmaps. It covers both the current state of the existing prototype codebase and the target state of the enterprise-grade production platform.

---

## Stakeholder Navigation Matrix

| Role / Stakeholder | Recommended Reading Path | Primary Documentation Files |
| :--- | :--- | :--- |
| **Lead Architect / CTO** | Architecture & Decisions | [ARCHITECTURE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ARCHITECTURE.md), [ARCHITECTURE_DECISIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ARCHITECTURE_DECISIONS.md), [ADRs](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/), [SCALABILITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SCALABILITY.md) |
| **Product Manager / Project Lead** | Overview, Requirements & Roadmap | [PROJECT_OVERVIEW.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PROJECT_OVERVIEW.md), [FUNCTIONAL_REQUIREMENTS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/FUNCTIONAL_REQUIREMENTS.md), [ROADMAP.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ROADMAP.md), [IMPLEMENTATION_PLAN.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/IMPLEMENTATION_PLAN.md) |
| **Database Architect / Data Engineer** | Data Modeling & Storage | [DOMAIN_MODEL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DOMAIN_MODEL.md), [DATA_MODEL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DATA_MODEL.md), [DATABASE_DESIGN.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DATABASE_DESIGN.md), [ERD.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ERD.md) |
| **Backend & Algorithm Engineer** | Core Engine, APIs & Versioning | [QUESTION_PAPER_GENERATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_PAPER_GENERATION.md), [API_SPECIFICATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/API_SPECIFICATION.md), [API_CONVENTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/API_CONVENTIONS.md), [VERSIONING.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/VERSIONING.md) |
| **Frontend Engineer** | UI/UX & Client Architecture | [FRONTEND_ARCHITECTURE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/FRONTEND_ARCHITECTURE.md), [UI_UX_GUIDELINES.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/UI_UX_GUIDELINES.md), [SCREEN_MAP.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SCREEN_MAP.md), [MULTILINGUAL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/MULTILINGUAL.md) |
| **Security & Compliance Officer** | Secrecy, Auth & Auditability | [SECURITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SECURITY.md), [AUTHENTICATION_AUTHORIZATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/AUTHENTICATION_AUTHORIZATION.md), [ROLES_PERMISSIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ROLES_PERMISSIONS.md), [AUDIT_LOGGING.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/AUDIT_LOGGING.md) |
| **DevOps & QA Engineer** | Testing, Deployment & Reliability | [TESTING_STRATEGY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/TESTING_STRATEGY.md), [DEPLOYMENT.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DEPLOYMENT.md), [DEVOPS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DEVOPS.md), [PERFORMANCE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PERFORMANCE.md) |

---

## Complete Documentation Index

### 1. Product Foundations & Requirements
- [PROJECT_OVERVIEW.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PROJECT_OVERVIEW.md) — Product vision, business drivers, target personas, and scope boundaries.
- [REQUIREMENTS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/REQUIREMENTS.md) — Master requirements framework and classification index.
- [FUNCTIONAL_REQUIREMENTS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/FUNCTIONAL_REQUIREMENTS.md) — Complete inventory of functional capabilities (FR-01 to FR-12).
- [NON_FUNCTIONAL_REQUIREMENTS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/NON_FUNCTIONAL_REQUIREMENTS.md) — Performance, security, scalability, and compliance mandates.

### 2. System Architecture & Decisions
- [ARCHITECTURE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ARCHITECTURE.md) — High-level architecture, C4 component diagrams, and runtime topologies.
- [ARCHITECTURE_DECISIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ARCHITECTURE_DECISIONS.md) — Architecture Decision Records (ADR) index and overview.
- **Architecture Decision Records (ADRs):**
  - [ADR-001: Multi-Institution Multi-Tenancy Architecture](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-001-multi-institution-architecture.md)
  - [ADR-002: Flexible Academic Hierarchy & Curriculum Versioning](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-002-academic-hierarchy-model.md)
  - [ADR-003: Immutable Question Versioning & Translation Model](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-003-question-versioning-strategy.md)
  - [ADR-004: Question Paper Versioning & Snapshotting](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-004-question-paper-versioning-strategy.md)
  - [ADR-005: Authentication & Session Security](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-005-authentication-strategy.md)
  - [ADR-006: Fine-Grained Role & Scope-Based Authorization](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-006-authorization-strategy.md)
  - [ADR-007: Database Strategy (PostgreSQL with RLS)](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-007-database-strategy.md)
  - [ADR-008: Deterministic Constraint-Satisfaction Paper Generation](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-008-question-generation-strategy.md)
  - [ADR-009: Server-Side PDF & Print Engine with Dynamic Watermarking](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-009-pdf-generation-strategy.md)
  - [ADR-010: Cryptographic Tamper-Evident Audit Logging](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-010-audit-logging-strategy.md)

### 3. Domain Modeling & Database Design
- [DOMAIN_MODEL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DOMAIN_MODEL.md) — DDD aggregates, entities, value objects, and domain events.
- [DATA_MODEL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DATA_MODEL.md) — Conceptual and logical data models, cardinality, and keys.
- [DATABASE_DESIGN.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DATABASE_DESIGN.md) — Physical PostgreSQL schema, indexes, partitioning, and RLS policies.
- [ERD.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ERD.md) — Visual Entity Relationship Diagrams in Mermaid syntax.

### 4. Identity, Security & Access Control
- [AUTHENTICATION_AUTHORIZATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/AUTHENTICATION_AUTHORIZATION.md) — Auth protocols, JWT/cookie lifecycle, and department resolution.
- [ROLES_PERMISSIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ROLES_PERMISSIONS.md) — 12-role taxonomy, permission matrix, and scope boundaries.
- [SECURITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SECURITY.md) — Threat model, examination paper confidentiality, and encryption specifications.

### 5. Question Bank Management
- [QUESTION_BANK.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_BANK.md) — Classification, taxonomy (Bloom's), tagging, and CLO mapping.
- [QUESTION_LIFECYCLE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_LIFECYCLE.md) — State machine, transitions, approval guards, and revision cycles.
- [QUESTION_TYPES.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_TYPES.md) — Schema and evaluation rules for 14+ supported question types.

### 6. Paper Generation Engine & Blueprinting
- [QUESTION_PAPER_GENERATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_PAPER_GENERATION.md) — Algorithmic constraint satisfaction, balancing, and randomization.
- [QUESTION_PAPER_LIFECYCLE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/QUESTION_PAPER_LIFECYCLE.md) — Paper state progression from draft to locking and publishing.
- [PAPER_BLUEPRINT.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PAPER_BLUEPRINT.md) — Visual blueprint structure, sectional rules, and weightage distribution.

### 7. Exam Management, Workflow, Audit & Versioning
- [EXAM_MANAGEMENT.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/EXAM_MANAGEMENT.md) — Examination sessions, exam centers, paper codes, and secrecy custody.
- [WORKFLOW.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/WORKFLOW.md) — Multi-role collaborative approval and moderation workflows.
- [AUDIT_LOGGING.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/AUDIT_LOGGING.md) — Immutable audit trail, hash chaining, and forensic logging.
- [VERSIONING.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/VERSIONING.md) — Bitemporal versioning, immutable snapshots, and historical reproduction.

### 8. API & Interface Specifications
- [API_SPECIFICATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/API_SPECIFICATION.md) — Comprehensive OpenAPI/REST endpoint specifications.
- [API_CONVENTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/API_CONVENTIONS.md) — Standardized status codes, error envelopes, pagination, and headers.

### 9. Frontend Architecture & UI/UX
- [FRONTEND_ARCHITECTURE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/FRONTEND_ARCHITECTURE.md) — React/Vite/TS component architecture and state management audit.
- [UI_UX_GUIDELINES.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/UI_UX_GUIDELINES.md) — Typography, color tokens, dark/light contrast, accessibility, and form UX.
- [SCREEN_MAP.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SCREEN_MAP.md) — Complete screen inventory, route mappings, and navigation flows.

### 10. Multilingual & PDF Generation
- [MULTILINGUAL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/MULTILINGUAL.md) — Unicode, Indic language scripts, font bundling, and bilingual papers.
- [PDF_GENERATION.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PDF_GENERATION.md) — Server-side headless print engine, dynamic watermarking, and barcodes.

### 11. Testing, DevOps, Performance & Scalability
- [TESTING_STRATEGY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/TESTING_STRATEGY.md) — Unit, integration, property-based generation tests, and security testing.
- [DEPLOYMENT.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DEPLOYMENT.md) — Infrastructure topology, Docker containers, Kubernetes, and environments.
- [DEVOPS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DEVOPS.md) — CI/CD pipelines, migration strategy, monitoring, and backup/DR plans.
- [PERFORMANCE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PERFORMANCE.md) — Latency SLAs, generation benchmarks, and caching strategy.
- [SCALABILITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SCALABILITY.md) — Multi-university scale-out, read replicas, and long-term archival.

### 12. Gap Analysis, Risks, Assumptions & Planning
- [GAP_ANALYSIS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/GAP_ANALYSIS.md) — Detailed gap analysis between existing prototype and target architecture.
- [RISKS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/RISKS.md) — Architectural, operational, and security risks with concrete mitigations.
- [ASSUMPTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ASSUMPTIONS.md) — Explicit technical and business assumptions.
- [OPEN_QUESTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/OPEN_QUESTIONS.md) — Unresolved questions and architectural tradeoffs requiring user decisions.
- [ROADMAP.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ROADMAP.md) — 14-phase evolutionary roadmap (Phase 0 to Phase 13).
- [IMPLEMENTATION_PLAN.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/IMPLEMENTATION_PLAN.md) — Structured backlog, ticket IDs, acceptance criteria, and traceability matrix.
- [CHANGELOG.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/CHANGELOG.md) — Version tracking and documentation change log.

### 13. Executive Analysis Summary
- [PROJECT_ANALYSIS_SUMMARY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/PROJECT_ANALYSIS_SUMMARY.md) — Root-level master synthesis answering all prompt deliverables.

---

## Current State vs. Proposed State

* **Current State:** The repository contains a single client-side React 18 + Vite 5 + TypeScript prototype with mock data stores in `src/mock/` and browser `localStorage`. No real backend, database, automated tests, or CI/CD exist.
* **Proposed State:** A production-grade multi-tenant enterprise system with a decoupled API backend (Node.js/NestJS or Python/FastAPI), PostgreSQL relational database with Row-Level Security, Redis cache, Puppeteer PDF generation service, and an upgraded React frontend connected via strict OpenAPI contracts.

## Decisions
1. All documents must strictly preserve cross-linking and adhere to the standardized documentation schema.
2. The `/docs` directory is organized into logical functional modules to enable rapid onboarding for specialized engineering teams.

## Open Questions
* Refer to [OPEN_QUESTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/OPEN_QUESTIONS.md) for unresolved domain decisions.

## Related Documents
* [PROJECT_OVERVIEW.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PROJECT_OVERVIEW.md)
* [PROJECT_ANALYSIS_SUMMARY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/PROJECT_ANALYSIS_SUMMARY.md)
