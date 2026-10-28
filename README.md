# QPMS Apex — University Question Paper Management & Generation System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com)

A complete, production-ready **Multi-University Question Paper Management & Generation Platform** designed for higher-education universities, autonomous institutions, and examination boards.

---

## 🏛️ System Architecture: Dual Portal Topology

```text
       ┌────────────────────────────────────────────────────────┐
       │               Super Admin Portal (Port 3002)           │
       │   Dedicated control plane exclusively for SUPER_ADMIN  │
       │   - Multi-university provisioning & atomic onboarding  │
       │   - University suspension & immediate lockout          │
       │   - Global platform users & audit trails               │
       └──────────────────────────┬─────────────────────────────┘
                                  │
┌─────────────────────────────────┴─────────────────────────────────┐
│               University & User Portal (Port 3000)                │
│   Dedicated academic interface for all operational roles:         │
│   - UNIVERSITY_ADMIN, INSTITUTION_ADMIN, HOD, TEACHER, STUDENT     │
│   - Syllabus & units management, question bank & authoring        │
│   - Question paper blueprinting, matrix calculator & PDF print    │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼  REST API (JWT Bearer Auth)
       ┌────────────────────────────────────────────────────────┐
       │               Backend API (FastAPI / Port 8000)        │
       │   - Python 3.12 / Pydantic v2 / SQLAlchemy 2.0         │
       │   - Multi-tenant suspension enforcement filter         │
       │   - Deterministic question engine & paper generator    │
       │   - ReportLab PDF generator & document management      │
       └──────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │               PostgreSQL Database (Port 5432)          │
       │   - Database name: qpms_db                             │
       │   - Shared relational store with relational integrity  │
       └────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

1. **Dedicated Super Admin Application (Port 3002)**:
   - Exclusively isolated for `SUPER_ADMIN`.
   - Access control redirects non-super-admins to `/access-denied` with links back to Port 3000.
   - Dual university creation: Standard University or Atomic "Quick Create with Admin" (`/universities/with-admin`).
   - University suspension and reactivation with immediate token rejection across all endpoints.
   - Cross-university user directory and immutable audit log viewer.

2. **University & User Portal (Port 3000)**:
   - Six strict role-based dashboards (`SUPER_ADMIN`, `UNIVERSITY_ADMIN`, `INSTITUTION_ADMIN`, `HOD`, `TEACHER`, `STUDENT`).
   - University theme engine matching the mandatory QPMS Apex palette (`--primary-color: #82c341`, `--secondary-color: #45525b`).

3. **Academic Structure & Hierarchy**:
   - Multi-tenant model: University ➔ Affiliated Colleges ➔ Departments ➔ Programs ➔ Semesters ➔ Subjects.

4. **Curriculum & Question Bank**:
   - Upload syllabus documents (`.pdf`, `.docx`, `.doc`, `.txt`) with interactive units hierarchy.
   - Four Question Types: MCQ (single/multiple correct), True/False, Fill-in-the-Blank, Descriptive (`1` to `10` Marks).
   - Bloom's difficulty taxonomy (`EASY`, `MEDIUM`, `HARD`), taxonomy tags, and syllabus unit linkage.

5. **Question Paper Generator & PDF Printing**:
   - Deterministic rule-based engine balancing types, units, and difficulty ratios.
   - Live mark validation matrix and ReportLab PDF export.

---

## 🔑 Pre-Seeded Accounts

All demo accounts use the default password: **`Admin@12345`**

| Role | Email | Portal Port | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `apex@superadmin.com` | **3002** (or 3000) | Root Platform Control Plane |
| **University Admin** | `john@universityadmin.in` | **3000** | Apex Central University |
| **Institution Admin** | `principal@acet.edu.in` | **3000** | Apex College of Engineering |
| **Head of Department (HOD)** | `hod@bca.university.in` | **3000** | BCA / CS Department |
| **Teacher / Author** | `teacher@university.in` | **3000** | Course Instructor |
| **Student** | `student@gmail.com` | **3000** | Academic Student |

---

## 🐳 Quick Start with Docker Compose

Run the entire platform (PostgreSQL, FastAPI Backend, University Portal, and Super Admin Portal) with:

```bash
docker compose up --build -d
```

- **Super Admin Portal**: [http://localhost:3002](http://localhost:3002)
- **University & User Portal**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database**: `localhost:5432` (`qpms_db`)

---

## 💻 Local Workspace Scripts

Run individual frontend services from the root directory:

```bash
# Run University Portal on Port 3000
npm run dev:frontend

# Run Super Admin Portal on Port 3002
npm run dev:admin

# Production builds
npm run build:frontend
npm run build:admin
```

---

## 🧪 Automated Test Suite

Run the full pytest suite (31 tests covering authentication, RBAC, hierarchical provisioning, university suspension, atomic onboarding, and paper generation):

```bash
docker exec qpms_backend pytest -v
```

---

## 📂 Repository Structure

```text
QPMS_Apex/
├── admin/                     # NEW: Super Admin Portal (Port 3002)
│   ├── app/                   # App Router: login, dashboard, universities, users, audit, settings
│   ├── components/            # Admin layout, sidebar, header, modal, badge, toast
│   ├── lib/                   # API client, Auth Context (SUPER_ADMIN guard), types
│   ├── middleware.ts          # Edge routing guard
│   ├── Dockerfile             # Multi-stage runner on Port 3002
│   └── package.json           # Port 3002 configuration
├── frontend/                  # University & User Portal (Port 3000)
│   ├── app/                   # App Router: login, dashboard, questions, papers, syllabus
│   ├── components/            # Layout, sidebar, navbar, UI components
│   ├── lib/                   # Auth context, theme context, API client
│   ├── Dockerfile             # Multi-stage runner on Port 3000
│   └── package.json           # Port 3000 configuration
├── backend/                   # Python FastAPI Backend (Port 8000)
│   ├── app/
│   │   ├── api/v1/            # Auth, universities, organizations, questions, papers, audit...
│   │   ├── core/              # Security, JWT, RBAC permissions, config
│   │   ├── database/          # Session, models, seed data
│   │   ├── models/            # SQLAlchemy 2.0 ORM models
│   │   ├── schemas/           # Pydantic v2 schemas
│   │   └── services/          # Generation engine, validator, PDF engine
│   └── tests/                 # 31 Pytest tests
├── docker-compose.yml         # 4-tier orchestration: postgres, backend, frontend, admin
├── package.json               # Root scripts: dev:frontend, dev:admin, build:frontend, build:admin
├── .env.example
└── README.md
```

---

## 📜 License
Apache-2.0 License. Designed for higher-education institutions and university examination boards.
