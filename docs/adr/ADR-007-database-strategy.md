# ADR-007: Database Strategy: PostgreSQL with Row-Level Security

## Purpose
Define the primary database technology, data modeling paradigms, and relational isolation strategy for the QPMS platform.

## Scope
Governs data persistence, relational integrity, JSONB semi-structured pedagogical data, indexing, and connection management.

## Current State
No real database exists. Data is held in in-memory JavaScript objects in `src/mock/` and persisted to browser `localStorage` as serialized JSON strings.

## Proposed State
PostgreSQL 16+ as the single unified relational persistence engine, utilizing Row-Level Security (RLS) for tenant isolation and JSONB for rich question options, mathematical formulas, and blueprint rules.

---

## Context
The QPMS platform requires:
1. Strong ACID transaction safety for question approvals, paper generation, and audit logging.
2. Complex relational joins across academic hierarchies (Institution $\rightarrow$ Department $\rightarrow$ Program $\rightarrow$ Course $\rightarrow$ Unit).
3. Flexible semi-structured storage for diverse question schemas (e.g., MCQ options, match pairs, coding test cases).
4. Full-text search across large question banks.
5. Strict tenant isolation to ensure zero data leakage between independent educational institutions.

## Problem
Should the system use a NoSQL document database (MongoDB), a purely relational database (PostgreSQL/MySQL), or a multi-model database?

## Options Considered
1. **NoSQL Document Database (MongoDB):**
   - *Pros:* Flexible schema for varied question types.
   - *Cons:* Weak multi-table relational integrity; difficult to enforce complex academic foreign keys; lacks native database kernel Row-Level Security for enterprise multi-tenancy.
2. **Standard Relational Database (MySQL 8):**
   - *Pros:* Strong relational support.
   - *Cons:* Less mature native Row-Level Security compared to PostgreSQL; inferior JSONB indexing and manipulation capabilities.
3. **PostgreSQL 16+ with Native Row-Level Security & JSONB (Selected):**
   - *Pros:* Enterprise-grade ACID compliance; native kernel RLS; powerful JSONB indexing (GIN indexes); built-in full-text search (`tsvector`); advanced partitioning for audit logs.
   - *Cons:* Requires connection pooling (e.g., PgBouncer) to handle large numbers of concurrent connections efficiently.

## Decision
Adopt **PostgreSQL 16+** as the core database engine with:
1. Native Row-Level Security (RLS) for tenant isolation on all domain tables.
2. Normalized relational tables for core academic and workflow structures.
3. JSONB columns for polymorphic question parameters, option lists, and blueprint criteria.
4. GIN indexing on question text and JSONB columns for sub-second keyword and tag searching.
5. Table partitioning on `audit_logs` by month (`created_at`).

## Reasoning
PostgreSQL provides the ideal convergence of rigid relational consistency (essential for academic records, grades, and audit trails) and document flexibility (essential for 14+ different question type schemas).

## Consequences
- **Positive:** Single, battle-tested operational database; zero impedance mismatch between relational and polymorphic question data; kernel-level tenant isolation.
- **Negative:** Database administration requires tuning connection pools and vacuuming partitioned audit tables.

## Status
**Approved**

## Open Questions
- None.

## Related Documents
- [DATABASE_DESIGN.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DATABASE_DESIGN.md)
- [DATA_MODEL.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DATA_MODEL.md)
- [ERD.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ERD.md)
- [ADR-001-multi-institution-architecture.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-001-multi-institution-architecture.md)
