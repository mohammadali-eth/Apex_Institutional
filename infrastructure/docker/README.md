# Container Infrastructure Documentation

This directory provides container image definitions and container orchestration guidelines for the QPMS monorepo.

---

## 1. Container Images

| Service | Dockerfile Location | Base Image | Multi-Stage | Non-Root User |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API** | `backend/Dockerfile` | `python:3.12-slim` | Yes (builder, runner) | Yes (`appuser`: uid 1001) |
| **Frontend Web** | `infrastructure/docker/Dockerfile.frontend` | `node:20-alpine` | Yes (deps, builder, runner) | Yes (`nextjs`: uid 1001) |
| **Database** | `compose.yaml` | `postgres:16-alpine` | Official | Yes (`postgres`) |

---

## 2. Local Compose Orchestration

The root `compose.yaml` coordinates local development infrastructure:

```bash
# Start PostgreSQL container in background:
docker compose up -d db

# Verify database healthcheck:
docker compose ps

# (Optional) Start full-stack with containerized backend:
docker compose --profile full-stack up -d
```

---

## 3. Best Practices

1. **Security**: All runtime containers execute under dedicated non-root service users.
2. **Lean Images**: Build tooling (compiler, build-essential, devDependencies) is discarded in final production stages.
3. **Healthchecks**: Every container specifies explicit liveness/readiness healthchecks with appropriate intervals.
