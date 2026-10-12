# Local Development Guide
**Question Paper Management System (QPMS)**  
*Onboarding, Toolchain Setup, Local Execution & Troubleshooting*

---

## 1. Prerequisites

Ensure your host workstation has the following toolchains installed:

| Toolchain | Recommended Version | Verification Command |
| :--- | :--- | :--- |
| **Node.js** | `v20.x LTS` (or v18.17+) | `node --version` |
| **npm** | `v10.x` | `npm --version` |
| **Python** | `v3.12.x` | `python --version` |
| **Docker & Compose** | `Docker v24+` / Compose v2 | `docker compose version` |
| **Git** | `v2.40+` | `git --version` |

---

## 2. Quickstart: Full-Stack Local Execution

You can run the environment using local host processes or Docker Compose.

### Approach A: Local Native Processes (Recommended for active coding)

#### Step 1: Start PostgreSQL via Compose
```bash
# From project root:
docker compose up -d db

# Verify PostgreSQL is running and healthy:
docker compose ps
```

#### Step 2: Set up and Start Backend
```bash
cd backend

# Create virtual environment:
python -m venv .venv

# Activate virtual environment:
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies in editable mode with dev tooling:
pip install -e .[dev]

# Configure environment:
cp .env.development.example .env

# Run database migrations:
alembic upgrade head

# Start FastAPI development server:
uvicorn app.main:create_application --factory --reload --port 8000
```
Backend API will be live at: [http://localhost:8000](http://localhost:8000)  
Interactive OpenAPI Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)  
Health Check: [http://localhost:8000/health](http://localhost:8000/health)

#### Step 3: Set up and Start Frontend
In a new terminal window:
```bash
cd frontend

# Install Node dependencies:
npm install

# Configure environment:
cp .env.example .env.local

# Start Next.js development server:
npm run dev
```
Frontend Web Application will be live at: [http://localhost:3000](http://localhost:3000)

---

### Approach B: Monorepo Root Delegation Commands

From the monorepo root directory, convenience scripts are available:

```bash
# Start frontend from root:
npm run dev

# Build frontend bundle from root:
npm run build

# Run frontend lint from root:
npm run lint
```

---

## 3. Database Management & Alembic Migrations

All schema changes are version-controlled using Alembic. Never run raw DDL scripts against shared environments.

```bash
cd backend

# Run all pending migrations:
alembic upgrade head

# Check current revision status:
alembic current

# Check migration history:
alembic history --verbose

# Create a new migration revision:
alembic revision --autogenerate -m "describe_schema_change"

# Rollback one migration step:
alembic downgrade -1
```

---

## 4. Quality Assurance, Testing & Validation

### 4.1 Frontend Quality Checks
```bash
cd frontend

# Run ESLint validation:
npm run lint

# Run TypeScript type check (no emit):
npx tsc --noEmit

# Run Next.js production build:
npm run build
```

### 4.2 Backend Quality Checks
```bash
cd backend

# Run Ruff formatting verification:
ruff format --check .

# Run Ruff linter:
ruff check .

# Run Mypy strict type checking:
mypy app

# Execute Pytest suite:
pytest -v
```

---

## 5. Troubleshooting & FAQ

### Port 5432 Conflict (PostgreSQL already running on host)
If another local PostgreSQL instance is running on port 5432:
1. Update `POSTGRES_PORT=5433` in root `.env`.
2. Start compose: `docker compose up -d db`.
3. Update `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/qpms_dev` in `backend/.env`.

### Database Connection Refused (`ConnectionRefusedError`)
Ensure the database container is fully initialized and reports `healthy`:
```bash
docker compose ps
docker compose logs db
```

### Windows Execution Policy Error with PowerShell Scripts
If PowerShell blocks virtual environment activation or npx:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
Or execute Python binaries directly:
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:create_application --factory --reload --port 8000
```
