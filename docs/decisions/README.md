# Architecture Decision Records (ADRs)

This directory serves as the institutional registry of key architectural decisions for the Question Paper Management System (QPMS).

---

## Decision Log

| ID | Title | Status | Scope | Reference Document |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | Multi-Institution Architecture | Accepted | Architecture | [ADR-001](../adr/ADR-001-multi-institution-architecture.md) |
| **ADR-002** | Academic Hierarchy Model | Accepted | Domain Model | [ADR-002](../adr/ADR-002-academic-hierarchy-model.md) |
| **ADR-003** | Question Versioning Strategy | Accepted | Question Bank | [ADR-003](../adr/ADR-003-question-versioning-strategy.md) |
| **ADR-004** | Question Paper Versioning Strategy | Accepted | Papers | [ADR-004](../adr/ADR-004-question-paper-versioning-strategy.md) |
| **ADR-005** | Authentication Strategy | Accepted | Security | [ADR-005](../adr/ADR-005-authentication-strategy.md) |
| **ADR-006** | Authorization & RBAC Strategy | Accepted | Security | [ADR-006](../adr/ADR-006-authorization-strategy.md) |
| **ADR-007** | Database & Persistence Strategy | Accepted | Database | [ADR-007](../adr/ADR-007-database-strategy.md) |
| **ADR-008** | Question Paper Generation Strategy | Accepted | Generator | [ADR-008](../adr/ADR-008-question-generation-strategy.md) |
| **ADR-009** | PDF Generation & Blueprint Rendering | Accepted | Export | [ADR-009](../adr/ADR-009-pdf-generation-strategy.md) |
| **ADR-010** | Comprehensive Audit Logging Strategy | Accepted | Compliance | [ADR-010](../adr/ADR-010-audit-logging-strategy.md) |

---

## ADR Template Guidelines

When proposing a new ADR, create a markdown file following this structure:
1. **Title**: Context and Decision
2. **Status**: Proposed / Accepted / Superseded / Deprecated
3. **Context**: What problem or architectural trade-off are we addressing?
4. **Decision**: What did we choose to do?
5. **Consequences**: What positive, negative, and neutral trade-offs result?
