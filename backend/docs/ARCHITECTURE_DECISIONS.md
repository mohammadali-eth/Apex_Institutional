# Architecture Decision Records (ADRs)

This document records the foundational architecture decisions for the QPMS backend platform.

---

## ADR 001: Independent Backend Directory (`backend/`)

- **Status**: Accepted
- **Context**: The existing Next.js frontend is located at the repository root (`src/`, `public/`, `package.json`). We needed to decide where the Python backend should reside without disrupting the Next.js setup.
- **Decision**: Keep the frontend at the root and establish the backend in an isolated `backend/` directory with its own virtual environment, dependencies (`pyproject.toml`), configuration, and test suite.
- **Consequences**:
  - Frontend remains untouched and fully functional.
  - Backend can be containerized, tested, and deployed independently or as a monorepo.
  - Zero collision between JavaScript/Node and Python toolchains.

---

## ADR 002: Framework Selection — FastAPI

- **Status**: Accepted
- **Context**: The university QPMS requires high concurrency, automatic API documentation, schema validation, and asynchronous execution for complex document generation workflows.
- **Decision**: Use FastAPI over Django or Flask.
- **Consequences**:
  - Native asynchronous async/await support with Uvicorn.
  - Automatic OpenAPI / Swagger UI generation directly from code models.
  - High serialization performance powered by Pydantic v2 core (Rust engine).

---

## ADR 003: Database ORM and Driver — SQLAlchemy 2.0 + asyncpg

- **Status**: Accepted
- **Context**: Enterprise applications require reliable connection pooling, type-safe query construction, and asynchronous non-blocking I/O.
- **Decision**: Use SQLAlchemy 2.0 with the async extension (`asyncpg` driver and `greenlet`).
- **Consequences**:
  - Clean separation between models and database sessions.
  - True non-blocking PostgreSQL operations under high loads.
  - Safe connection pooling with pool pre-ping to detect dropped connections.

---

## ADR 004: Configuration via Pydantic Settings

- **Status**: Accepted
- **Context**: Secrets and environment configurations must be strictly validated at application startup.
- **Decision**: Use `pydantic-settings` with `.env` hierarchy support (`.env`, `.env.development`, `.env.test`).
- **Consequences**:
  - Type-safe access to environment variables across the app (`settings.database_url`, `settings.cors_origins`).
  - Startup fails immediately with informative validation errors if required variables are missing or misconfigured.

---

## ADR 005: Request Correlation & Observability Middleware

- **Status**: Accepted
- **Context**: University-scale systems require end-to-end traceability of incoming requests across microservices and log aggregators.
- **Decision**: Implement `RequestIdMiddleware` which extracts or generates an `X-Request-ID` UUID for every HTTP transaction.
- **Consequences**:
  - Injected into response headers and logging contexts.
  - Enables correlation between frontend API errors and backend server logs.

---

## ADR 006: Separation of Foundation from Business Logic

- **Status**: Accepted
- **Context**: Developing a massive multi-module university platform requires establishing the platform baseline before adding features.
- **Decision**: Complete platform setup (DB connectivity, health endpoints, migration scaffolding, testing harness) strictly before adding business models (Users, Papers, Questions).
- **Consequences**:
  - Eliminates premature coupling.
  - Ensures reliable foundations before creating schemas and migrations.
