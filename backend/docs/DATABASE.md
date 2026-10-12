# Database & Migration Guidelines

This document details the database architecture, connection pooling, base model design, and migration management with Alembic for the QPMS backend.

---

## 1. Engine & Connection Pooling (`app/db/session.py`)

The backend interacts with PostgreSQL exclusively through an asynchronous engine constructed with SQLAlchemy 2.0 and the `asyncpg` driver:

```python
engine = create_async_engine(
    str(settings.database_url),
    echo=settings.db_echo,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
    pool_pre_ping=True,  # Automatically tests connection validity before use
)
```

### Key Connection Pool Parameters
- **`pool_pre_ping=True`**: Prevents "server closed the connection unexpectedly" errors by testing connection liveness prior to checkout.
- **`pool_recycle=1800`**: Automatically retires and recreates connections older than 30 minutes to mitigate silent TCP teardowns by cloud NAT gateways or firewalls.
- **`pool_size` & `max_overflow`**: Configured via environment variables to allow capacity tuning per deployment scale.

---

## 2. Session Lifecycle Dependency (`get_db_session`)

FastAPI routes that require database operations consume `AsyncSession` via dependency injection:

```python
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

- **Automatic Commit/Rollback**: Successful route executions automatically commit; unhandled exceptions trigger rollback.
- **Guaranteed Cleanup**: The `finally` block ensures the session is returned to the pool regardless of outcome.

---

## 3. Declarative Base & Mixins (`app/db/base.py`)

All future domain models inherit from `app.db.base.Base`:

```python
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class ExamPaper(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "exam_papers"
    ...
```

### Provided Mixins
- **`UUIDPrimaryKeyMixin`**: Provides a standard `id: Mapped[uuid.UUID]` primary key defaulting to `uuid7`/`uuid4`.
- **`TimestampMixin`**: Provides timezone-aware `created_at` and `updated_at` timestamps using server defaults (`func.now()`).

---

## 4. Alembic Migration Workflow

Alembic is configured in `backend/alembic/` to run migrations asynchronously using the application's declarative metadata (`Base.metadata`).

### Creating a New Migration
When new ORM models are declared in `app/models/`:

```bash
# 1. Generate migration script with autogenerate
alembic revision --autogenerate -m "create_initial_models"

# 2. Review the generated file in backend/alembic/versions/
# Verify all column types, constraints, and index definitions.

# 3. Apply the migration
alembic upgrade head
```

### Rolling Back Migrations
```bash
# Revert 1 migration revision
alembic downgrade -1

# Revert to base (empty database)
alembic downgrade base
```

### Checking Migration Status
```bash
# Current active revision in DB
alembic current

# Migration history
alembic history --verbose
```

---

## 5. Health Probing (`app/db/health.py`)

A non-blocking database health check function is exposed for readiness probes:

```python
is_healthy, latency_ms, error = await check_database_health()
```

This runs `SELECT 1` through a dedicated connection, measuring round-trip latency in milliseconds without leaking connections.
