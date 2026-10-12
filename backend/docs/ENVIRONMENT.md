# Environment Configuration Specification

The QPMS backend utilizes **Pydantic Settings** (`app.core.config.Settings`) for type-safe, validated environment management.

---

## 1. Environment Loading Priority

The application loads environment variables in the following descending order:
1. System OS environment variables (highest priority)
2. Local `.env` file located in `backend/.env`
3. Targeted environment file (e.g. `.env.development`, `.env.test`)
4. Default fallback values defined in `app/core/config.py`

---

## 2. Variables Specification Table

| Variable | Type | Default | Description |
|---|---|---|---|
| `APP_NAME` | `str` | `"Question Paper Management System API"` | Name of the application displayed in OpenAPI docs. |
| `APP_ENV` | `str` | `"development"` | Active runtime environment (`development`, `staging`, `production`, `test`). |
| `APP_DEBUG` | `bool` | `false` | Enables debug mode and verbose tracebacks. |
| `API_V1_STR` | `str` | `"/api/v1"` | URL prefix for version 1 API endpoints. |
| `DATABASE_URL` | `PostgresDsn` | `postgresql+asyncpg://qpms_user:qpms_password@localhost:5432/qpms_db` | Async PostgreSQL connection string with asyncpg dialect. |
| `DB_ECHO` | `bool` | `false` | When true, SQLAlchemy logs all executed SQL queries. |
| `DB_POOL_SIZE` | `int` | `10` | The number of persistent connections in the async connection pool. |
| `DB_MAX_OVERFLOW` | `int` | `20` | Max temporary overflow connections created above pool size during traffic spikes. |
| `DB_POOL_TIMEOUT` | `int` | `30` | Seconds to wait before timing out when obtaining a connection from the pool. |
| `DB_POOL_RECYCLE` | `int` | `1800` | Number of seconds after which a connection is automatically recycled (prevents stale drops). |
| `SECRET_KEY` | `str` | `"changethisinproduction_min32chars_secretkey"` | Secret key used for cryptographic operations and tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `int` | `60` | Token expiration time in minutes. |
| `LOG_LEVEL` | `str` | `"INFO"` | Root log level (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`). |
| `LOG_FORMAT` | `str` | `"json"` | Log format: `"json"` (for production/containers) or `"console"` (for human-readable dev). |
| `CORS_ORIGINS` | `list[str]` | `["http://localhost:3000","http://127.0.0.1:3000"]` | Authorized CORS client origins allowed to access the API. |

---

## 3. Template Files

Three environment templates are provided in the `backend/` directory:
- `.env.example`: Generic baseline template for reference.
- `.env.development.example`: Pre-configured for local docker-compose PostgreSQL development.
- `.env.test.example`: Pre-configured for non-interfering unit and integration testing.

---

## 4. Production Security Guidelines

- **Never commit `.env`**: `.env` is listed in `backend/.gitignore`.
- **Secret Key Rotation**: In production, `SECRET_KEY` must be generated with a cryptographically secure RNG (e.g., `openssl rand -hex 32`) and passed via secret management systems (e.g. AWS Secrets Manager, Vault, or Kubernetes Secrets).
- **CORS Restriction**: Explicitly define domain names in `CORS_ORIGINS`. Never use `["*"]` in production environments when credentials are enabled.
