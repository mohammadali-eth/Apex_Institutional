# Backend Development Setup Guide

This guide details the procedure for setting up, running, and maintaining the QPMS backend platform locally.

---

## 1. System Requirements

- **Operating System**: Windows 10/11, macOS, or Linux.
- **Python**: Version 3.12 or higher.
- **Docker & Docker Compose**: For running the local PostgreSQL container.
- **Git**: For version control.

---

## 2. Setting Up Python Virtual Environment

From the project root:

```bash
cd backend
```

### Windows (PowerShell)
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
*Note: If PowerShell complains about script execution policy, run:*
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Linux / macOS (Bash)
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

## 3. Installing Dependencies

Install core dependencies and development tooling in editable mode:

```bash
pip install --upgrade pip
pip install -e ".[dev]"
```

Verify installed packages:
```bash
pip list
```

---

## 4. Configuring Environment Variables

Create your local `.env` file from the development template:

```bash
cp .env.development.example .env
```

Ensure `.env` matches your local PostgreSQL settings:
```env
APP_NAME="QPMS Backend"
APP_ENV=development
APP_DEBUG=true
API_V1_STR=/api/v1

DATABASE_URL=postgresql+asyncpg://qpms_user:qpms_dev_password@localhost:5432/qpms_db
DB_ECHO=false
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30

LOG_LEVEL=DEBUG
LOG_FORMAT=console

CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
```

---

## 5. Starting PostgreSQL with Docker Compose

A pre-configured `docker-compose.yml` is provided in the repository:

```bash
# Start PostgreSQL service in background
docker compose up -d postgres

# Verify container health
docker compose ps
```

---

## 6. Running Database Migrations

Once PostgreSQL is accessible:

```bash
# Apply pending migrations
alembic upgrade head

# Check current revision
alembic current
```

---

## 7. Starting the Development Server

Start Uvicorn with auto-reload:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Access:
- **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Documentation (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Liveness Probe**: [http://localhost:8000/health/live](http://localhost:8000/health/live)
- **Readiness Probe**: [http://localhost:8000/health/ready](http://localhost:8000/health/ready)

---

## 8. Development Commands & Quality Gates

Run quality checks before committing any code:

```bash
# 1. Pytest suite
pytest -v

# 2. Ruff linter
ruff check .

# 3. Ruff code formatter check
ruff format --check .

# 4. Mypy type validation
mypy app
```
