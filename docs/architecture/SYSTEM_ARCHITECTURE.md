# QPMS System Architecture Specification
**University Question Paper Management System**  
*Document Version: 1.0.0 | Architecture Tier: Enterprise Monorepo*

---

## 1. High-Level Architectural Topology

The Question Paper Management System (QPMS) is architected as an enterprise monorepo with strict separation of concerns between client presentation, stateless business API, and relational persistence.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER                               │
│                                                                        │
│   Next.js 14 App Router (React 18 + TypeScript + Tailwind CSS)         │
│   • Persona-Driven Portals (Admin, HOD, Faculty, QB Manager, Reviewer) │
│   • Client Cache & State Providers (Auth, Department, Toast, I18n)     │
│   • Interactive Wizards (Paper Generator, Taxonomy Tagging, Diff View) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / HTTPS (REST API)
                                    │ JSON Payload (v1 Specification)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION API TIER                           │
│                                                                        │
│   FastAPI (Python 3.12+ Async Engine)                                  │
│   • Core Middleware (Request ID tracing, CORS, Security headers)       │
│   • Global Exception Handling & RFC 7807 Error Responses               │
│   • Pydantic v2 Settings & Request/Response Contract Validation        │
│   • Versioned Routing (/api/v1)                                        │
│   • Service & Repository Architecture                                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ asyncpg (Non-blocking I/O)
                                    │ SQLAlchemy 2.0 AsyncSession
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCE TIER                              │
│                                                                        │
│   PostgreSQL 16 Relational Database Engine                             │
│   • Connection Pool (pool_size=10, max_overflow=20)                    │
│   • Schema Versioning via Alembic Async Migrations                     │
│   • Academic Hierarchy, Version History, Audit Log Partitioning        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structural Boundaries

| Layer | Directory | Responsibilities | Forbidden Patterns |
| :--- | :--- | :--- | :--- |
| **Presentation** | `frontend/` | UI components, routing, user input validation, client state, internationalization. | Must NOT access database directly or bypass API contracts. |
| **Business Logic** | `backend/` | Domain validation, blueprint randomization, audit logging, RBAC enforcement. | Must NOT serve HTML/SSR or couple to frontend UI structures. |
| **Infrastructure** | `infrastructure/` & `compose.yaml` | Container orchestration, Dockerfiles, environment variables, health checks. | Must NOT contain production secrets or business rules. |
| **Documentation** | `docs/` | System specifications, architecture records, standards, audit reports. | Must NOT duplicate code or drift from actual implementations. |

---

## 3. Core Subsystem Architectures

### 3.1 Academic Hierarchy & Multi-Tenancy
The system implements a structured institutional hierarchy:
`Institution -> Faculty / College -> Department -> Program (Degree) -> Course / Subject -> Semester / Term`.
- User identities and questions are scoped strictly to academic units.
- Role permissions are context-sensitive based on active department persona.

### 3.2 Question Bank & Immutability Lifecycle
Questions undergo a rigorous state machine:
`Draft -> Submitted -> Under Review -> Approved / Rejected -> Archived`.
- **Versioning Strategy**: Once a question is approved or used in a generated paper, it is immutable. Edits spawn a new revision linked to the parent UUID, maintaining full cryptographic and academic auditability.

### 3.3 Question Paper Generation Engine
Paper generation follows deterministic blueprint specifications:
1. **Curriculum Blueprint**: Defines Bloom's taxonomy distribution, module/unit weightage, and difficulty ratios.
2. **Repetition Exclusion**: Cross-checks questions against past examinations within configurable cooldown windows.
3. **Randomized Selection**: Assembles candidate sets satisfying all constraint equations before human reviewer approval.

### 3.4 Security & Observability
- **Request Tracing**: `RequestIdMiddleware` injects an `X-Request-ID` header into every request and propagates it to all logs.
- **Audit Logging**: Every sensitive action (question approval, paper generation, permission change) emits structured audit telemetry.
- **Health System**: `/health` (liveness) and `/health/ready` (database connectivity readiness) endpoints enable zero-downtime container monitoring.
