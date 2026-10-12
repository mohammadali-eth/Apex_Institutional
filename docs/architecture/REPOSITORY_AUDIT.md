# Repository Audit & Standardization Baseline
**Question Paper Management System (QPMS) — Enterprise Monorepo**  
*Document Version: 1.0.0 | Date: October 2026 | Author: Staff Software Architect & Platform Engineering*

---

## 1. Executive Summary

This audit assesses the state of the repository for the **Question Paper Management System (QPMS)**. The repository comprises:
1. **`frontend/`**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS.
2. **`backend/`**: FastAPI (Python 3.12+), SQLAlchemy 2.0 (asyncio + asyncpg), Alembic, Pydantic v2.
3. **`docs/`**: Comprehensive product requirements, domain models, ADRs, and migration documentation.
4. **`.github/`**: GitHub Actions workflow (`nextjs.yml`).
5. **Infrastructure**: Initial `docker-compose.yml` for PostgreSQL 16.

The project demonstrates high-quality UI modeling and modern asynchronous Python design. However, prior to standardizing, the repository suffered from monorepo configuration drift, missing root onboarding documentation, lack of unified developer tooling (`.editorconfig`, `.gitattributes`), missing issue/PR templates, and split Compose conventions.

This document details the exact inventory, identified issues, and migration roadmap according to enterprise monorepo standards.

---

## 2. Current Repository Inventory

### 2.1 Directory Structure Breakdown

| Path | Purpose / Technology | Tracking Status |
| :--- | :--- | :--- |
| `frontend/` | Next.js 14 App Router, TypeScript, Tailwind CSS | Tracked (93 source & config files) |
| `backend/` | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic | Tracked (37 foundation & doc files) |
| `docs/` | Requirements, specs, ADRs, architectural guides | Tracked (50 markdown files) |
| `.github/` | Workflows (`nextjs.yml`) | Tracked (1 workflow file) |
| `docker-compose.yml` | PostgreSQL 16 local service | Tracked (Root file) |
| `package.json` | Monorepo workspace runner scripts | Tracked (Root file) |
| `PROJECT_ANALYSIS_SUMMARY.md`| Initial product & UI analysis report | Tracked (Root file) |

### 2.2 Git Status & Tracked Artifacts

- **Branch**: `main` (synchronized with `origin/main`).
- **History Hygiene**: No active untracked files or binary leaks.
- **Node Modules & Venvs**: `.venv/` and `node_modules/` are strictly excluded from git tracking.
- **Git Rename Fidelity**: Previous migration to `frontend/` preserved 100% rename history without file destruction.

---

## 3. Detailed Component Audits

### 3.1 Frontend (`frontend/`)

- **Runtime & Framework**: Next.js 14.2.15, React 18.3.1, TypeScript 5.6.3.
- **Build Output**: Standard Next.js server/static build (`.next/`). Static export tested and identified that dynamic routes (`[id]`, `[slug]`) lack `generateStaticParams()`, meaning standard server mode or Next.js App Runner is active.
- **Configuration Files**:
  - `next.config.mjs`: StrictMode enabled, SWC minification enabled.
  - `tsconfig.json`: Path alias `@/*` -> `./src/*` configured properly.
  - `tailwind.config.js`: Institutional green palette (`#80c343`) and slate typography configured.
  - `postcss.config.js`: Tailwind & Autoprefixer configured.
  - `.eslintrc.json`: Newly added extending `next/core-web-vitals`.
- **Identified Frontend Issues**:
  - `next lint` discovered JSX quote entity warnings (`'` and `"`) in `ReferenceConfirmationModal.tsx` and `VersionHistoryTimeline.tsx`.
  - Missing `frontend/README.md` and `frontend/.env.example`.
  - Root `next-env.d.ts` previously leaked to root; now contained in `frontend/`.

### 3.2 Backend (`backend/`)

- **Runtime & Framework**: Python 3.12, FastAPI 0.115.0, SQLAlchemy 2.0.35, asyncpg 0.29.0, Alembic 1.13.3.
- **Packaging & Dependency Tooling**: `pyproject.toml` (PEP 517 / 621 compliant) using setuptools build backend.
- **Testing & Quality Tools**:
  - `pytest` & `pytest-asyncio` with 4 passing unit/integration tests (`tests/unit/test_config.py`, `tests/integration/test_health.py`).
  - `ruff` (linter & formatter) configured in `pyproject.toml`; passes with 0 violations.
  - `mypy` strict mode with `pydantic.mypy` plugin; passes with 0 violations across 20 source files.
- **Alembic Database Migrations**:
  - `alembic.ini` and `alembic/env.py` configured with `async_engine_from_config`.
  - Database metadata sourced dynamically from `app.db.base.Base`.
  - No business tables exist yet; only baseline foundation is initialized (complying strictly with constraints).
- **Identified Backend Issues**:
  - Missing `backend/scripts/` directory for automated developer tasks (format, lint, test, migrate).
  - Lack of root-level compose unification.

### 3.3 Infrastructure & Docker Compose

- **Current Config**: `docker-compose.yml` (legacy naming convention) provisioning `postgres:16-alpine`.
- **Strengths**:
  - Persistent volume `postgres_data` configured.
  - Robust healthcheck (`pg_isready -U postgres -d qpms_dev`).
  - Port `5432:5432` mapped.
- **Deficiencies**:
  - Uses legacy `docker-compose.yml` name instead of modern Compose specification `compose.yaml`.
  - Lacks dedicated `infrastructure/` organization for multi-container coordination or production container guidelines.
  - Missing root-level `.env.example` defining `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

### 3.4 CI/CD Workflows (`.github/workflows/`)

- **Existing Workflow**: `nextjs.yml` (builds Next.js and deploys to GitHub Pages).
- **Status**: Updated to execute with `working-directory: ./frontend`.
- **Deficiencies**:
  - No backend CI pipeline for `ruff`, `mypy`, and `pytest`.
  - No pull request template or issue templates for collaborative enterprise governance.

### 3.5 Documentation (`docs/`)

- **Current Layout**:
  - 44 loose documentation files in root of `docs/`.
  - Subdirectories: `docs/adr/`, `docs/architecture/`, `docs/migration/`, `docs/testing/`.
- **Target Organization**:
  - `docs/architecture/`: System designs, component topology, audit reports.
  - `docs/development/`: Local setup, debugging, onboarding guides.
  - `docs/standards/`: Code quality, Git workflow, testing conventions.
  - `docs/decisions/`: ADR collection index and architecture decisions.
- **Deficiencies**:
  - Root `README.md` is missing.
  - Lack of single source of truth for developer onboarding.

---

## 4. Identified Issues & Remediation Matrix

| Category | Finding | Risk / Impact | Remediation Plan |
| :--- | :--- | :--- | :--- |
| **Monorepo Root** | Missing root `README.md` | New developers have no single point of entry | Create comprehensive enterprise `README.md` covering prerequisites, setup, test, and architecture. |
| **Monorepo Root** | Legacy `docker-compose.yml` filename | Non-standard Compose spec | Migrate to `compose.yaml` with environment fallbacks and healthchecks. |
| **Git Hygiene** | Missing `.editorconfig` & `.gitattributes` | Inconsistent CRLF/LF line endings and indentation | Add root `.editorconfig` and `.gitattributes`. |
| **Environment** | Missing root & frontend `.env.example` | Undocumented runtime configuration requirements | Add scoped `.env.example` to root, `frontend/`, and maintain `backend/`. |
| **Code Quality** | Unescaped JSX quote entities in frontend | Build warnings and ESLint failure in strict CI | Sanitize unescaped quote entities in affected files. |
| **CI / Automation** | Backend has no automated test/lint workflow | Regressions in Python types or tests can slip through | Add dedicated GitHub Actions workflow for backend linting and testing. |
| **Governance** | Missing PR and Issue templates in `.github/` | Inconsistent bug reports and untracked review requirements | Add issue forms / templates and enterprise `PULL_REQUEST_TEMPLATE.md`. |
| **Scripts** | Backend lacks uniform CLI runner scripts | Manual, error-prone shell invocations | Provide standardized scripts in `backend/scripts/`. |

---

## 5. Target Migration Map

```text
mj_question_paper_genrator/
├── .editorconfig                          [NEW] Indentation and encoding standards
├── .gitattributes                         [NEW] Consistent cross-platform line ending normalization
├── .gitignore                             [ENHANCED] Unified monorepo ignore rules
├── .env.example                           [NEW] Root compose environment template
├── compose.yaml                           [MIGRATED from docker-compose.yml]
├── package.json                           [MAINTAINED] Monorepo runner scripts
├── PROJECT_ANALYSIS_SUMMARY.md            [PRESERVED]
├── README.md                              [NEW] Comprehensive root onboarding guide
│
├── .github/
│   ├── workflows/
│   │   ├── frontend-ci.yml                [ENHANCED/ADDED] Frontend lint, typecheck, build
│   │   ├── backend-ci.yml                 [NEW] Backend ruff, mypy, pytest
│   │   └── nextjs.yml                     [PRESERVED] Existing deployment workflow
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md                  [NEW]
│   │   └── feature_request.md             [NEW]
│   └── PULL_REQUEST_TEMPLATE.md           [NEW]
│
├── frontend/
│   ├── public/                            [PRESERVED]
│   ├── src/                               [PRESERVED]
│   ├── .eslintrc.json                     [CONFIGURED]
│   ├── .gitignore                         [PRESERVED]
│   ├── .env.example                       [NEW] Scoped frontend variables
│   ├── next.config.mjs                    [PRESERVED]
│   ├── package.json                       [PRESERVED]
│   ├── package-lock.json                  [PRESERVED]
│   ├── postcss.config.js                  [PRESERVED]
│   ├── tailwind.config.js                 [PRESERVED]
│   ├── tsconfig.json                      [PRESERVED]
│   └── README.md                          [NEW] Scoped frontend development guide
│
├── backend/
│   ├── app/                               [PRESERVED] FastAPI application
│   ├── alembic/                           [PRESERVED] Alembic migrations
│   ├── tests/                             [PRESERVED] Unit and integration tests
│   ├── scripts/                           [NEW] Developer execution scripts
│   ├── docs/                              [PRESERVED] Backend-specific guides
│   ├── .env.example                       [PRESERVED]
│   ├── .env.development.example           [PRESERVED]
│   ├── .env.test.example                  [PRESERVED]
│   ├── .gitignore                         [PRESERVED]
│   ├── .python-version                    [PRESERVED]
│   ├── alembic.ini                        [PRESERVED]
│   ├── pyproject.toml                     [PRESERVED]
│   ├── Dockerfile                         [PRESERVED]
│   └── README.md                          [PRESERVED/ENHANCED]
│
├── infrastructure/
│   ├── docker/
│   │   └── Dockerfile.frontend            [NEW] Container definition for frontend
│   └── deployment/
│       └── README.md                      [NEW] Deployment topology and notes
│
└── docs/
    ├── architecture/
    │   ├── CURRENT_ARCHITECTURE.md        [PRESERVED]
    │   ├── NEXTJS_ARCHITECTURE.md         [PRESERVED]
    │   ├── REPOSITORY_AUDIT.md            [THIS FILE]
    │   ├── SYSTEM_ARCHITECTURE.md         [NEW] Complete system architecture blueprint
    │   └── REPOSITORY_STANDARDIZATION_REPORT.md [NEW in Phase 11]
    ├── development/
    │   └── LOCAL_DEVELOPMENT.md           [NEW] Complete multi-service development guide
    ├── standards/
    │   └── CODING_STANDARDS.md            [NEW] Monorepo coding, git, and testing standards
    ├── decisions/
    │   └── README.md                      [NEW] Index of Architecture Decision Records
    └── [all 44 existing spec files]       [PRESERVED]
```

---

## 6. Audit Conclusion & Approval Gate

The repository is healthy and ready for standardization. All existing Next.js UI behavior and FastAPI architecture will be strictly maintained without modification to business logic.
