# QPMS Backend Architecture Document

## 1. Executive Summary

The Question Paper Management System (QPMS) backend is an enterprise-grade RESTful API built on **FastAPI**, **SQLAlchemy 2.0 (async)**, **PostgreSQL (via asyncpg)**, **Alembic**, and **Pydantic v2**.

This platform foundation provides high-throughput asynchronous execution, type safety, modular layered separation of concerns, structured error handling, and robust database connection lifecycle management.

---

## 2. System Architecture & Layers

The backend follows clean layered architecture principles. Each layer has strict, unidirectional dependencies:

```
[ HTTP Clients (Next.js Frontend / External Integrations) ]
                         │
                         ▼
             [ Middleware Pipeline ]
     (RequestIdMiddleware, Logging, CORS)
                         │
                         ▼
             [ API Layer: app/api/v1 ]
           (Routing, Dependencies, Schema Validation)
                         │
                         ▼
            [ Service Layer: app/services ]
           (Business Workflows, Domain Rules)
                         │
                         ▼
        [ Repository Layer: app/repositories ]
          (Data Access Patterns & Queries)
                         │
                         ▼
         [ Database Layer: app/db & app/models ]
          (AsyncSession, Declarative ORM Models)
                         │
                         ▼
                [ PostgreSQL 16+ ]
```

### Layer Responsibilities

1. **`app/core/` (Cross-Cutting Concerns)**:
   - Central configuration with `pydantic-settings`.
   - Structured JSON/Console logging via standard Python logging.
   - Global custom exceptions and HTTP exception handlers.
   - Security primitives (password hashing, future token utilities).

2. **`app/db/` (Database Core)**:
   - Async engine and session factory (`create_async_engine`, `async_sessionmaker`).
   - Declarative base (`Base`) with common mixins (`TimestampMixin`, `UUIDPrimaryKeyMixin`).
   - Database health check probe (`check_database_health`) executing `SELECT 1`.
   - Session lifecycle dependency (`get_db_session`).

3. **`app/middleware/` (Request Lifecycle)**:
   - `RequestIdMiddleware`: Generates or propagates `X-Request-ID` across logs and HTTP response headers for request correlation and traceability.

4. **`app/api/v1/` (API Transport)**:
   - Versioned route tree mounted under `/api/v1`.
   - Request serialization, parameter parsing, and schema validation with Pydantic.
   - Status codes and structured error responses conforming to standard envelopes.

5. **`app/schemas/` (Data Contracts)**:
   - Pydantic models separating inputs, query parameters, and output contracts.
   - Excludes internal database-specific attributes.

6. **`app/models/` (Domain Entities - Reserved)**:
   - SQLAlchemy Declarative ORM models representing database tables and foreign keys.

7. **`app/repositories/` (Data Access Layer - Reserved)**:
   - Encapsulates database queries, isolates ORM logic from business rules.

8. **`app/services/` (Domain Services - Reserved)**:
   - Orchestrates multi-step business transactions, policy enforcement, and domain operations.

---

## 3. Technology Stack & Rationale

| Component | Choice | Rationale |
|---|---|---|
| Language | Python 3.12 | Modern type hinting, native async performance, pattern matching. |
| Framework | FastAPI | Asynchronous native ASGI, OpenAPI/Swagger auto-generation, rapid serialisation with Pydantic v2. |
| Database Engine | PostgreSQL 16+ | ACID compliance, JSONB capabilities, enterprise indexing, row-level locking. |
| ORM | SQLAlchemy 2.0 (Async) | Industry standard Python ORM with modern 2.0 type safety and async query execution. |
| Driver | asyncpg | High-performance asynchronous PostgreSQL driver with binary protocol support. |
| Migrations | Alembic | Version-controlled schema evolutions compatible with SQLAlchemy declarative metadata. |
| Settings | Pydantic Settings | Environment-driven configuration with typed validations and fail-fast guarantees. |
| Quality Tools | Ruff & Mypy | Fast linting, code formatting, and static type checking. |
| Testing | Pytest & pytest-asyncio | Mature asynchronous testing framework with fixtures and coverage reporting. |

---

## 4. Operational Boundaries

- **Separation of Concerns**: Route handlers do NOT execute raw SQL or handle low-level transactions.
- **Fail Fast**: Missing critical settings (such as malformed database URLs) stop application startup immediately.
- **Statelessness**: The API is completely stateless to support horizontal scaling behind container orchestrators (Docker Swarm, Kubernetes, ECS).
