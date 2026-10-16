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

---

## 3. Technology Stack

| Layer                 | Technologies                                                                         |
| :-------------------- | :----------------------------------------------------------------------------------- |
| **Frontend**          | Next.js 14 (App Router), React 18, TypeScript 5 (Strict), Tailwind CSS, Lucide React |
| **Backend API**       | Python 3.12+, FastAPI 0.115+, SQLAlchemy 2.0 (Async), asyncpg, Pydantic v2           |
| **Database**          | PostgreSQL 16 Alpine, Alembic (Async migrations)                                     |
| **Quality & Tooling** | Ruff (lint & format), Mypy (strict typing), Pytest, ESLint, TypeScript compiler      |
| **Orchestration**     | Docker & Compose specification (`compose.yaml`), GitHub Actions CI                   |

---

## 4. Repository Structure

```text
Apex_Institutional/
├── .github/                       # CI/CD workflows
│   └── workflows/
│       ├── frontend-ci.yml        # Next.js lint, typecheck & build pipeline
│       ├── backend-ci.yml         # Python ruff, mypy & pytest pipeline
│       └── nextjs.yml             # GitHub Pages deployment pipeline
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
│   └── README.md                  # Frontend setup guide
│
├── backend/                       # Application API Tier (FastAPI Python)
│   ├── app/                       # Application source (core, db, api/v1, middleware, services)
│   ├── alembic/                   # Database migration environment & versions
│   ├── tests/                     # Unit and integration test suites
│   ├── scripts/                   # Developer execution helper scripts
│   ├── .env.development.example   # Backend development environment template
│   ├── alembic.ini                # Alembic migration configuration
│   ├── pyproject.toml             # Project metadata, dependencies & tool configs
│   ├── Dockerfile                 # Multi-stage production container definition
│   └── README.md                  # Backend setup guide
│
├── infrastructure/                # Platform & Deployment Artifacts
│   └── docker/                    # Dockerfiles & container orchestration
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

_Alternatively, from the project root directory you can run:_

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

## 11. Database Migrations & Initial Administrator Bootstrap

### Running Migrations

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

### Initial Administrator Setup

The backend provides a secure, idempotent CLI command to initialize institutional administrators without hardcoding passwords into source code or seeding routines:

```bash
cd backend

# Initialize default University Admin (default: username=admin, password=admin123, university=APEX-UNIV)
python -m app.commands.bootstrap --role university_admin

# Or explicitly customize credentials:
python -m app.commands.bootstrap --role university_admin --username admin --password admin123 --university APEX-UNIV
```

**Security & Operational Guarantees:**

- **Idempotent**: Re-running the command verifies existing accounts without duplicating records or resetting passwords.
- **Argon2id Hashing**: Passwords are never stored in plaintext.
- **Mandatory First-Login Password Change**: Flags `password_changed_at = NULL` and `must_change_password = true` to force an immediate password rotation.
- **Strict Role Scoping**: Assigns only `UNIVERSITY_ADMIN` role scoped to the specified university institution; Super Admin privileges are never granted.
- **Production Guardrails**: Weak passwords (e.g., `admin123`) are rejected automatically when `APP_ENV=production`.
- **Super Admin Separation**: Super Administrator accounts must be created separately via `--role super_admin` with strong dedicated credentials.

---

## 12. Environment Variable Configuration Reference

The application centralizes and validates all configuration via Pydantic (`backend/app/core/config.py`) and TypeScript (`frontend/src/lib/env.ts`).

### A. Root / Docker Compose (`.env.example` -> `.env`)

| Variable            | Purpose                         | Required | Default / Example       |
| :------------------ | :------------------------------ | :------- | :---------------------- |
| `POSTGRES_USER`     | PostgreSQL superuser username   | Yes      | `qpms_admin`            |
| `POSTGRES_PASSWORD` | PostgreSQL superuser password   | Yes      | `qpms_secure_pass_2026` |
| `POSTGRES_DB`       | PostgreSQL database name        | Yes      | `qpms_db`               |
| `POSTGRES_PORT`     | PostgreSQL exposed host port    | No       | `5432`                  |
| `BACKEND_PORT`      | FastAPI backend container port  | No       | `8000`                  |
| `FRONTEND_PORT`     | Next.js frontend container port | No       | `3000`                  |

### B. Backend API (`backend/.env.development.example` -> `backend/.env`)

| Variable                                | Purpose                                                              | Required        | Default / Example                                            |
| :-------------------------------------- | :------------------------------------------------------------------- | :-------------- | :----------------------------------------------------------- |
| `APP_NAME`                              | Name of the backend application                                      | No              | `Apex QPMS Backend`                                          |
| `APP_ENV`                               | Runtime environment (`development`, `test`, `staging`, `production`) | Yes             | `development`                                                |
| `APP_SECRET_KEY`                        | Master secret key used for session signing and auth                  | Yes (≥32 chars) | `dev-only-secret-key-replace-in-production-min32`            |
| `APP_BASE_URL`                          | Canonical backend service URL                                        | No              | `http://localhost:8000`                                      |
| `API_BASE_URL`                          | Canonical API prefix URL                                             | No              | `http://localhost:8000/api/v1`                               |
| `FRONTEND_APP_URL`                      | Frontend URL for CORS origins and redirects                          | No              | `http://localhost:3000`                                      |
| `ALLOWED_ORIGINS`                       | JSON list of allowed CORS origins                                    | Yes             | `["http://localhost:3000"]`                                  |
| `LOG_LEVEL`                             | Application logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`)      | No              | `INFO`                                                       |
| `DEBUG`                                 | Enable debug logs and detailed error reports                         | No              | `false`                                                      |
| `DATABASE_URL`                          | Async PostgreSQL connection string                                   | Yes             | `postgresql+asyncpg://qpms_admin:...@localhost:5432/qpms_db` |
| `STORAGE_PROVIDER`                      | Document storage provider (`local` or `s3`)                          | No              | `local`                                                      |
| `STORAGE_LOCAL_ROOT`                    | Local filesystem directory for uploaded exam documents               | No              | `data/uploads`                                               |
| `MAX_UPLOAD_SIZE_BYTES`                 | Maximum allowed file upload size in bytes (e.g. 25MB)                | No              | `26214400`                                                   |
| `ALLOWED_UPLOAD_EXTENSIONS`             | JSON list of approved file extensions                                | No              | `[".pdf", ".docx", ".png", ".jpg", ".jpeg"]`                 |
| `EMAIL_DELIVERY_METHOD`                 | Email sink (`disabled`, `console`, or `smtp`)                        | No              | `console`                                                    |
| `SMTP_HOST`                             | Outgoing SMTP server hostname                                        | When smtp       | `smtp.example.com`                                           |
| `SMTP_PORT`                             | Outgoing SMTP server port                                            | When smtp       | `587`                                                        |
| `SMTP_USER`                             | Outgoing SMTP username                                               | When smtp       | `smtp_user`                                                  |
| `SMTP_PASSWORD`                         | Outgoing SMTP password                                               | When smtp       | `smtp_password`                                              |
| `SMTP_FROM_EMAIL`                       | Sender email address for outgoing notifications                      | When smtp       | `notifications@apex.edu`                                     |
| `AUTH_MAX_LOGIN_ATTEMPTS`               | Maximum failed logins before account lock                            | No              | `5`                                                          |
| `AUTH_ACCOUNT_LOCKOUT_DURATION_MINUTES` | Account lockout duration in minutes                                  | No              | `15`                                                         |
| `DEFAULT_LANGUAGE`                      | Default ISO language code                                            | No              | `en`                                                         |
| `MAX_PAPER_MARKS`                       | Ceiling for total question paper marks                               | No              | `100`                                                        |
| `AUDIT_LOG_RETENTION_DAYS`              | Retention policy window for security audit logs                      | No              | `365`                                                        |

### C. Frontend Web (`frontend/.env.example` -> `frontend/.env.local`)

| Variable               | Purpose                                                          | Required | Default / Example              |
| :--------------------- | :--------------------------------------------------------------- | :------- | :----------------------------- |
| `NEXT_PUBLIC_API_URL`  | Backend API base endpoint consumed by client                     | Yes      | `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_APP_ENV`  | Client runtime environment (`development`, `test`, `production`) | Yes      | `development`                  |
| `NEXT_PUBLIC_APP_NAME` | Institutional branding name displayed in UI                      | No       | `Apex QPMS`                    |

---

## 13. Security and Production Guidelines

1. **Secret Generation**: Never use default development secrets in production. Generate a cryptographically secure 64-character secret key:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
2. **Environment File Hygiene**: `.env`, `.env.local`, and all `data/uploads/` folders are strictly ignored by `.gitignore`. Never commit them to Git.
3. **Password Security**: Passwords are hashed using Argon2id (`t=2, m=65536, p=1`). Administrative bootstrapping requires immediate password change on first login.
4. **CORS & Domain Whitelisting**: Set `ALLOWED_ORIGINS` to exact production domain(s); wildcards (`*`) are disallowed by backend validation when `APP_ENV=production`.
5. **Storage Isolation**: Examination papers and answer keys are kept outside public document roots and served only via authenticated, role-authorized streaming endpoints.

---

## 14. Three Portals & Multi-Tenant Administration (Phase 3)

The Question Paper Management System implements three distinct, server-enforced portal experiences powered by a single identity and session infrastructure:

1. **Super Admin Portal (`/super-admin`)**:
   - Cross-institutional multi-tenant management: register universities, view constituent campuses, toggle operational status (`active`, `suspended`).
   - Provision University Administrator accounts with scoped university authority.
   - Platform operational KPI metrics and immutable platform security audit logs (`auth_audit_events`).
   - Server boundary: Guarded by `require_super_admin` backend dependency.

2. **University Admin Portal (`/university-admin`)**:
   - Scoped strictly to the administrator's assigned university (`university_id`).
   - Manage constituent colleges (`institutions`) and academic departments.
   - Staff directory with active role pills, scope indicators, and status toggles (`active`, `suspended`).
   - Staff Invitation Lifecycle: Issue 72-hour cryptographic invitation tokens, resend tokens, revoke pending invitations.
   - Server-enforced role delegation: Strictly permits delegable academic roles and prevents escalation to `SUPER_ADMIN`.
   - Server boundary: Guarded by `require_university_admin` backend dependency.

3. **Staff & General User Workspace (`/workspace`)**:
   - Role-specific workspace for academic staff (`FACULTY_QUESTION_SETTER`, `QUESTION_PAPER_REVIEWER`, `EXAM_CONTROLLER`, `DEPARTMENT_ADMIN`, `STUDENT`, etc.).
   - Multi-role context switching for accounts holding multiple active role assignments.
   - Direct access to question banks, blueprint generation, and approval queues.

4. **Account Activation Screen (`/activate?token=...`)**:
   - Staff redeem single-use invitation tokens to set permanent credentials.

---

## 15. Architecture & Security Documentation

Comprehensive architecture, security, and operational guides are maintained in `docs/`:

- [Identity and Access Model](docs/architecture/IDENTITY_AND_ACCESS_MODEL.md)
- [Three Portal Architecture](docs/architecture/THREE_PORTAL_ARCHITECTURE.md)
- [Admin Bootstrap Security](docs/security/ADMIN_BOOTSTRAP_SECURITY.md)
- [Role Delegation Policy](docs/security/ROLE_DELEGATION_POLICY.md)
- [Administrative Account Provisioning](docs/development/ADMIN_ACCOUNT_PROVISIONING.md)

---

## 16. Troubleshooting

- **Port 5432 In Use**: If PostgreSQL is already running locally on port 5432, change `POSTGRES_PORT=5433` in root `.env` and update the port in `backend/.env`.
- **Database Connection Refused**: Run `docker compose ps` to ensure the `db` service is `healthy`. If it failed to start, check `docker compose logs db`.
- **Windows PowerShell Script Execution**: If PowerShell restricts script activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.
- **Next.js API Connection Error**: Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local` matches the active FastAPI host and port (default `http://localhost:8000/api/v1`).
