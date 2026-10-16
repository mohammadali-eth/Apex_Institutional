# Apex Question Paper Management System (QPMS)
**Enterprise Institutional Monorepo**

[![Frontend CI](https://github.com/mohammadali-eth/Apex_Institutional/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/mohammadali-eth/Apex_Institutional/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/mohammadali-eth/Apex_Institutional/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/mohammadali-eth/Apex_Institutional/actions/workflows/backend-ci.yml)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-blue.svg)](LICENSE)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Node: 20](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)

---

## 1. Project Overview

The **Apex Question Paper Management System (QPMS)** is an institutional software platform designed for universities and academic colleges to manage the end-to-end examination lifecycle:
- **Academic Hierarchy Management**: University, Faculty, Department, Program, and Course structures.
- **Secure Question Bank Authoring**: Strict taxonomy tagging (Bloom's Revised Taxonomy, difficulty levels, course outcomes, unit weightage).
- **Multi-Stage Approval Workflow**: Multi-tier peer review (Setter -> HOD -> Subject Reviewer -> Question Bank Manager).
- **Automated Blueprint Paper Generation**: Deterministic, randomized constraint-solving engine preventing question repetition and balancing course unit distribution.
- **Comprehensive Audit Trail & Compliance**: Tamper-evident logging and immutable question version history.

---

## 2. System Architecture

QPMS is structured as an enterprise monorepo with distinct separation between client presentation, stateless business API, and relational persistence:

```text
┌────────────────────────────────┐         ┌────────────────────────────────┐
│      Next.js 14 Frontend       │  HTTP   │       FastAPI Backend          │
│   (React 18 + TS + Tailwind)   │────────>│   (Python 3.12 + SQLAlchemy)   │
│      http://localhost:3000     │  REST   │      http://localhost:8000     │
└────────────────────────────────┘         └────────────────┬───────────────┘
                                                            │ asyncpg
                                                            ▼
                                           ┌────────────────────────────────┐
                                           │      PostgreSQL 16 Engine      │
                                           │      Port 5432 (compose.yaml)  │
                                           └────────────────────────────────┘
```

For complete architectural details, see [System Architecture Specification](docs/architecture/SYSTEM_ARCHITECTURE.md).

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript 5 (Strict), Tailwind CSS, Lucide React |
| **Backend API** | Python 3.12+, FastAPI 0.115+, SQLAlchemy 2.0 (Async), asyncpg, Pydantic v2 |
| **Database** | PostgreSQL 16 Alpine, Alembic (Async migrations) |
| **Quality & Tooling** | Ruff (lint & format), Mypy (strict typing), Pytest, ESLint, TypeScript compiler |
| **Orchestration** | Docker & Compose specification (`compose.yaml`), GitHub Actions CI |

---

## 4. Repository Structure

```text
Apex_Institutional/
├── .github/                       # CI/CD workflows, PR and Issue templates
│   ├── workflows/
│   │   ├── frontend-ci.yml        # Next.js lint, typecheck & build pipeline
│   │   ├── backend-ci.yml         # Python ruff, mypy & pytest pipeline
│   │   └── nextjs.yml             # GitHub Pages deployment pipeline
│   ├── ISSUE_TEMPLATE/            # Standardized issue templates
│   └── PULL_REQUEST_TEMPLATE.md   # Enterprise PR verification template
│
├── frontend/                      # Presentation Tier (Next.js 14 App Router)
│   ├── src/                       # App Router pages, components, features, providers
│   ├── public/                    # Static assets, institutional icons, logos
│   ├── .eslintrc.json             # ESLint configuration
│   ├── .env.example               # Frontend environment template
│   ├── next.config.mjs            # Next.js compiler settings
│   ├── package.json               # Frontend dependencies & npm scripts
│   ├── tailwind.config.js         # Design system tokens & palette
│   ├── tsconfig.json              # Strict TypeScript configuration
│   └── README.md                  # Scoped frontend documentation
│
├── backend/                       # Application API Tier (FastAPI Python)
│   ├── app/                       # Application source (core, db, api/v1, middleware)
│   ├── alembic/                   # Database migration environment & versions
│   ├── tests/                     # Unit and integration test suites
│   ├── scripts/                   # Developer execution helper scripts
│   ├── docs/                      # Backend-specific architecture & API guidelines
│   ├── .env.development.example   # Backend development environment template
│   ├── alembic.ini                # Alembic migration configuration
│   ├── pyproject.toml             # Project metadata, dependencies & tool configs
│   ├── Dockerfile                 # Multi-stage production container definition
│   └── README.md                  # Scoped backend documentation
│
├── infrastructure/                # Platform & Deployment Artifacts
│   ├── docker/                    # Dockerfiles & container orchestration notes
│   └── deployment/                # Environment topologies & production guide
│
├── docs/                          # Institutional Documentation Base
│   ├── architecture/              # System architecture, audit reports & baseline
│   ├── development/               # Local developer onboarding & troubleshooting
│   ├── standards/                 # Coding standards, Git conventions & DoD
│   ├── decisions/                 # Architecture Decision Records (ADRs) registry
│   └── adr/                       # Individual Architecture Decision Records (ADR-001 - 010)
│
├── .editorconfig                  # Cross-editor formatting rules
├── .gitattributes                 # Cross-platform line ending normalization (LF)
├── .gitignore                     # Monorepo artifact & secret exclusions
├── .env.example                   # Root compose environment template
├── compose.yaml                   # Standard Docker Compose specification
└── package.json                   # Root monorepo workspace runner
```

---

## 5. Prerequisites

Before starting, verify you have the following installed:

1. **Node.js**: v20.x LTS (or v18.17+) — `node -v`
2. **npm**: v10.x — `npm -v`
3. **Python**: v3.12+ — `python --version`
4. **Docker & Compose**: Docker v24+ / Compose v2 — `docker compose version`
5. **Git**: v2.40+ — `git --version`

---

## 6. How to Start PostgreSQL

Start the PostgreSQL 16 database using the root Compose specification:

```bash
# Start PostgreSQL container in background:
docker compose up -d db

# Verify database health:
docker compose ps
```

The database will be accessible on `localhost:5432` with credentials defined in `.env.example`.

---

## 7. How to Start the Backend

```bash
cd backend

# 1. Create and activate Python virtual environment:
python -m venv .venv

# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# 2. Install dependencies with development tooling:
pip install -e .[dev]

# 3. Configure development environment:
cp .env.development.example .env

# 4. Start the development server:
uvicorn app.main:create_application --factory --reload --port 8000
```

- **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Liveness Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 8. How to Start the Frontend

In a separate terminal:

```bash
cd frontend

# 1. Install dependencies:
npm install

# 2. Configure environment:
cp .env.example .env.local

# 3. Start Next.js development server:
npm run dev
```

- **Web Application Portal**: [http://localhost:3000](http://localhost:3000)

*Alternatively, from the project root directory you can run:*
```bash
npm run dev
```

---

## 9. How to Run Tests and Linting

### Frontend Verification
```bash
cd frontend

# Run ESLint:
npm run lint

# Run TypeScript type check:
npx tsc --noEmit

# Run production build:
npm run build
```

### Backend Verification
```bash
cd backend

# Run Ruff formatting check:
ruff format --check .

# Run Ruff linter:
ruff check .

# Run Mypy strict type analysis:
mypy app

# Run Pytest suite:
pytest -v
```

---

## 10. How to Run Alembic Migrations

Schema migrations are managed with Alembic using SQLAlchemy's async engine:

```bash
cd backend

# Apply all migrations:
alembic upgrade head

# Check current database revision:
alembic current

# Revert previous migration:
alembic downgrade -1
```

---

## 11. Environment Variable Setup

| Service | Template File | Local Active File | Key Variables |
| :--- | :--- | :--- | :--- |
| **Root (Compose)** | `.env.example` | `.env` | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` |
| **Backend API** | `backend/.env.development.example` | `backend/.env` | `DATABASE_URL`, `APP_ENV`, `ALLOWED_ORIGINS`, `APP_SECRET_KEY` |
| **Frontend Web** | `frontend/.env.example` | `frontend/.env.local` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_ENV` |

*Never commit `.env` or `.env.local` files containing real credentials to version control.*

---

## 12. Troubleshooting

- **Port 5432 In Use**: If PostgreSQL is already running locally on port 5432, change `POSTGRES_PORT=5433` in root `.env` and update the port in `backend/.env`.
- **Database Connection Refused**: Run `docker compose ps` to ensure the `db` service is `healthy`. If it failed to start, check `docker compose logs db`.
- **Windows PowerShell Script Execution**: If PowerShell restricts script activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.

---

## 13. Documentation Index

- **[System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)** — Architectural topology, security, and multi-tenancy model.
- **[Phase 2 Authentication Report](docs/architecture/PHASE_2_AUTHENTICATION_COMPLETE.md)** — Phase 2 Authentication, user identity, and session management architecture.
- **[Repository Audit Baseline](docs/architecture/REPOSITORY_AUDIT.md)** — Pre-standardization inspection, findings, and migration map.
- **[Local Development Guide](docs/development/LOCAL_DEVELOPMENT.md)** — Detailed multi-service onboarding and workflow instructions.
- **[Coding Standards & DoD](docs/standards/CODING_STANDARDS.md)** — Code quality, Conventional Commits, and PR checklist.
- **[Architecture Decision Records](docs/decisions/README.md)** — Registry of all 10 accepted ADRs.
- **[Backend Architecture Guidelines](backend/docs/ARCHITECTURE.md)** — FastAPI design, repositories, and exception handling.
- **[Container & Deployment Topology](infrastructure/deployment/README.md)** — Cloud deployment guidelines and container strategies.
