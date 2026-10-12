# QPMS Backend — Enterprise Foundation

Question Paper Management System (QPMS) enterprise-grade Python backend platform built with **FastAPI**, **SQLAlchemy 2.x (async)**, **PostgreSQL (asyncpg)**, **Alembic**, and **Pydantic v2**.

---

## 🏛️ Architectural Overview

The backend uses a clean, layered enterprise architecture designed for high scalability, separation of concerns, and maintainability.

```
backend/
├── app/
│   ├── api/v1/          # Route handlers & API versioning
│   ├── core/            # Configuration, logging, security, custom exceptions
│   ├── db/              # Async database engine, session lifecycle, base model, health
│   ├── middleware/      # Request correlation ID, logging, error handling
│   ├── models/          # Declarative SQLAlchemy ORM models (reserved for future domain entities)
│   ├── repositories/    # Data access layer abstractions
│   ├── schemas/         # Pydantic v2 request & response contracts
│   ├── services/        # Business logic layer
│   └── main.py          # FastAPI application factory & lifespan
├── alembic/             # Async database schema migrations
├── tests/               # Pytest test suite (unit & integration)
├── docs/                # Comprehensive architectural and operational documentation
├── pyproject.toml       # Dependencies, packaging, Ruff & Mypy configurations
├── Dockerfile           # Production container configuration
└── docker-compose.yml   # Multi-service local development environment (Postgres + Backend)
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Python 3.12+**
- **Docker & Docker Compose** (for local PostgreSQL)

### 2. Virtual Environment Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies (editable mode + dev tools)
pip install -e ".[dev]"
```

### 3. Environment Configuration
```bash
# Copy development environment template
cp .env.development.example .env
```
Default connection string: `postgresql+asyncpg://qpms_user:qpms_dev_password@localhost:5432/qpms_db`

### 4. Start Local Database via Docker Compose
From repository root or `backend`:
```bash
# Run postgres container
docker compose up -d postgres
```

### 5. Run Database Migrations
```bash
alembic upgrade head
```

### 6. Run Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Base URL: `http://localhost:8000`
- Swagger UI Documentation: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
- Liveness Probe: `http://localhost:8000/health/live`
- Readiness Probe (DB Check): `http://localhost:8000/health/ready`

---

## 🧪 Testing & Code Quality

### Run Pytest
```bash
pytest -v
```

### Run Ruff (Lint & Formatting)
```bash
# Check code style & lints
ruff check .

# Check formatting
ruff format --check .

# Auto-format
ruff format .
```

### Run Mypy (Type Safety)
```bash
mypy app
```

---

## 📚 Detailed Documentation

Comprehensive architectural and engineering guides are located in `docs/`:
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Layered architecture, design principles, and boundaries.
- [`docs/ARCHITECTURE_DECISIONS.md`](docs/ARCHITECTURE_DECISIONS.md) — Architecture Decision Records (ADRs) explaining technical selections.
- [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md) — Step-by-step developer environment setup.
- [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) — Environment variables specification and configuration hierarchy.
- [`docs/DATABASE.md`](docs/DATABASE.md) — Async SQLAlchemy engine, session management, and Alembic workflow.
- [`docs/API_GUIDELINES.md`](docs/API_GUIDELINES.md) — Standards for routes, schemas, status codes, and error envelopes.
- [`docs/FOUNDATION_SETUP_COMPLETE.md`](docs/FOUNDATION_SETUP_COMPLETE.md) — Verification checklist and foundation sign-off.
