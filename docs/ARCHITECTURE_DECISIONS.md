# Architecture Decision Records (ADR) Registry

## Purpose
This document catalogs all foundational Architectural Decision Records (ADRs) governing the **University Question Paper Management & Generation System**. It provides a quick-reference index, status tracking, and decision rationales.

## Scope
The ADRs documented here govern system-wide architectural tradeoffs, persistence choices, multi-tenancy models, cryptographic security protocols, versioning strategies, and generation algorithms.

---

## Architecture Decision Records Index

| ADR ID | Title | Status | Date | Primary Driver |
| :--- | :--- | :--- | :--- | :--- |
| [ADR-001](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-001-multi-institution-architecture.md) | Multi-Institution Multi-Tenancy Architecture | **Approved** | 2026-09-24 | Secure data isolation with cross-college federation support. |
| [ADR-002](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-002-academic-hierarchy-model.md) | Flexible Academic Hierarchy & Curriculum Versioning | **Approved** | 2026-09-24 | Avoid rigid school schemas; model real-world university topologies. |
| [ADR-003](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-003-question-versioning-strategy.md) | Immutable Question Versioning & Translation Model | **Approved** | 2026-09-24 | Protect exam paper historical integrity; zero in-place mutations. |
| [ADR-004](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-004-question-paper-versioning-strategy.md) | Question Paper Versioning & Snapshotting | **Approved** | 2026-09-24 | Ensure historic papers are 100% reproducible for 10+ years. |
| [ADR-005](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-005-authentication-strategy.md) | Authentication & Session Security Strategy | **Approved** | 2026-09-24 | HttpOnly cookies + JWT + SAML/OIDC SSO integration. |
| [ADR-006](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-006-authorization-strategy.md) | Fine-Grained Role & Scope-Based Authorization | **Approved** | 2026-09-24 | RBAC combined with Department Scope Context (ABAC). |
| [ADR-007](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-007-database-strategy.md) | Database Strategy: PostgreSQL with Row-Level Security | **Approved** | 2026-09-24 | ACID compliance, JSONB pedagogical metadata, and native RLS. |
| [ADR-008](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-008-question-generation-strategy.md) | Constraint-Satisfaction Paper Generation Engine | **Approved** | 2026-09-24 | Deterministic multi-objective constraint satisfaction. |
| [ADR-009](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-009-pdf-generation-strategy.md) | Server-Side PDF & Print Engine with Dynamic Watermarking | **Approved** | 2026-09-24 | Headless Chromium rendering with forensic dynamic watermarks. |
| [ADR-010](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-010-audit-logging-strategy.md) | Cryptographic Tamper-Evident Forensic Audit Logging | **Approved** | 2026-09-24 | Append-only audit records with cryptographic SHA-256 hash chaining. |

---

## ADR Lifecycle & Governance Process
1. **Proposed:** Decision drafted and undergoing technical review by the architecture team.
2. **Approved:** Formal decision adopted by consensus; binds implementation.
3. **Superseded:** A later ADR updates or replaces this decision (reference must be cited).
4. **Deprecated:** Architectural direction abandoned.

---

## Current State vs. Proposed State

* **Current State:** Architecture decisions were implicit, unwritten, or embedded in prototype source code.
* **Proposed State:** A formal ADR system documenting the context, evaluated options, reasoning, trade-offs, and consequences of every major engineering choice.

## Decisions
1. All future structural, algorithmic, or security shifts must be ratified via an ADR before code changes are merged.

## Open Questions
* Refer to [OPEN_QUESTIONS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/OPEN_QUESTIONS.md) for pending architectural options.

## Related Documents
- [ADR-001: Multi-Institution Architecture](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-001-multi-institution-architecture.md)
- [ADR-007: Database Strategy](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-007-database-strategy.md)
- [ADR-008: Question Generation Strategy](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-008-question-generation-strategy.md)
