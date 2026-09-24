# ADR-001: Multi-Institution Multi-Tenancy Architecture

## Purpose
Define the multi-tenancy architectural strategy to support independent educational institutions, universities, and colleges within the QPMS platform.

## Scope
Governs tenant boundary isolation, data storage partitioning, administrative delegation, and cross-college exam federation.

## Current State
The existing prototype has basic `institutionId` string fields on users and departments, but in-memory services do not enforce physical isolation, query filtering, or tenant boundaries.

## Proposed State
A shared-database, shared-schema multi-tenant architecture enforced via PostgreSQL Row-Level Security (RLS) and cryptographic tenant context injection.

---

## Context
Educational institutions require strict isolation: an affiliated engineering college must never see exam questions or draft papers created by an arts college or rival institution. However, a parent University Examination Board must be capable of generating common centralized board examination papers administered simultaneously across 50 constituent colleges.

## Problem
How should multi-tenancy be architected to balance rigorous data security, tenant isolation, operational simplicity, cost efficiency, and optional central university federation?

## Options Considered
1. **Database-per-Tenant (Isolated Databases):**
   - *Pros:* Complete physical isolation; easy tenant-level backups and deletion.
   - *Cons:* Heavy operational overhead; expensive resource utilization for 50+ colleges; complex schema migration across dozens of databases; prohibits centralized university paper generation.
2. **Schema-per-Tenant (Separate PostgreSQL Schemas):**
   - *Pros:* Logical isolation within one database; lower compute overhead.
   - *Cons:* Schema migration complexity grows linearly ($50 \times N$ migrations); connection pooling issues with PgBouncer; cross-schema queries for board exams are awkward.
3. **Shared Database, Shared Schema with PostgreSQL Row-Level Security (RLS) (Selected):**
   - *Pros:* High resource efficiency; single unified schema migration; native kernel-enforced RLS policies prevent accidental developer query leaks; seamless support for hierarchical university-college relationships.
   - *Cons:* Requires rigorous testing of RLS policies and strict session context setting (`SET LOCAL app.current_tenant_id`).

## Decision
Adopt **Shared Database with PostgreSQL Row-Level Security (RLS)** as the primary multi-tenancy model. Every domain table will carry an immutable `institution_id` UUID column indexed and bounded by an RLS policy:
```sql
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY question_tenant_isolation ON questions
  USING (institution_id = current_setting('app.current_tenant_id', true)::uuid);
```

## Reasoning
RLS guarantees that even if a developer omits a `WHERE institution_id = :id` clause in application code, the PostgreSQL query engine automatically constrains the query to the tenant set in the database session. Furthermore, central board exams can be modeled cleanly by having questions tagged with the parent university's `institution_id` and authorized for constituent institutions via institutional grant tables.

## Consequences
- **Positive:** Maximum operational efficiency, zero duplicate schema management, bulletproof isolation, and low infrastructure costs.
- **Negative:** Every database transaction must initialize the tenant session context via middleware before executing queries.

## Status
**Approved**

## Open Questions
- None.

## Related Documents
- [ARCHITECTURE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/ARCHITECTURE.md)
- [ADR-007-database-strategy.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/adr/ADR-007-database-strategy.md)
- [SECURITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SECURITY.md)
