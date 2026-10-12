# Deployment Architecture & Environment Topologies

This guide documents the enterprise deployment topologies and platform infrastructure principles for the Question Paper Management System.

---

## 1. Architecture Topology

```text
[ Client Browsers / Mobile ]
             │
             ▼
   [ Reverse Proxy / CDN / Edge ]
             │
     ┌───────┴───────────────────┐
     ▼                           ▼
[ Next.js Frontend ]     [ FastAPI Backend ]
(Port 3000 / SSR)        (Port 8000 / REST API)
                                 │
                                 ▼
                     [ PostgreSQL Database ]
                     (Managed Engine v16)
```

---

## 2. Recommended Hosting Targets

### Frontend (Next.js 14)
- **Target Options**:
  - Container runtime (Kubernetes / Cloud Run / AWS ECS) using `infrastructure/docker/Dockerfile.frontend`.
  - Edge/Serverless platform (Vercel) connected via repository root with Root Directory set to `frontend`.
- **Environment**: Configured via `NEXT_PUBLIC_*` environment variables injected during build/runtime.

### Backend (FastAPI Python)
- **Target Options**:
  - Container platform (AWS ECS Fargate, GCP Cloud Run, Azure Container Apps) using `backend/Dockerfile`.
- **Scaling**: Stateless horizontal scaling behind a Load Balancer with SSL termination.
- **Worker Configuration**: Standard Uvicorn workers scaled according to CPU cores.

### Database (PostgreSQL 16)
- **Target Options**:
  - Managed PostgreSQL instance (AWS RDS Aurora Postgres, GCP Cloud SQL, Azure Database for PostgreSQL Flexible Server).
- **Connection Management**: Connection pooling enabled via backend SQLAlchemy AsyncEngine with `pool_size=10` and `max_overflow=20`.

---

## 3. Secrets & Environment Management

- **Zero Hardcoded Secrets**: No secret keys, credentials, or private certificates may be baked into images or stored in repository files.
- **Production Injection**: Production environments utilize centralized secrets managers (AWS Secrets Manager, HashiCorp Vault, or Google Secret Manager).
- **Environment Variable Mapping**:
  - `DATABASE_URL`: Injected from cloud secret.
  - `APP_SECRET_KEY`: High-entropy generated token.
  - `ALLOWED_ORIGINS`: Restricted explicitly to institutional frontend domains.
