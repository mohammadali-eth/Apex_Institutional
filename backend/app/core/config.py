"""Centralized application settings using Pydantic Settings."""

from typing import Literal

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed application configuration loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Application Metadata
    app_name: str = Field(default="QPMS Backend", description="Application name")
    app_env: Literal["development", "test", "production"] = Field(
        default="development", description="Current runtime environment"
    )
    app_version: str = Field(default="0.1.0", description="Semver release tag")
    debug: bool = Field(default=False, description="Enable debug mode")
    api_v1_prefix: str = Field(default="/api/v1", description="Prefix for v1 routes")

    # Server Bindings
    host: str = Field(default="127.0.0.1", description="Server bind host")
    port: int = Field(default=8000, description="Server bind port")

    # Security & Authentication Configuration (Phase 2)
    secret_key: str = Field(
        default="dev-insecure-secret-key-change-in-production-min-32-chars",
        description="Application secret key",
    )
    auth_session_cookie_name: str = Field(
        default="qpms_session",
        description="Session cookie name (uses __Host- prefix automatically in production)",
    )
    auth_session_idle_timeout_minutes: int = Field(
        default=60, description="Session idle inactivity timeout in minutes"
    )
    auth_session_absolute_timeout_hours: int = Field(
        default=24, description="Session absolute expiration timeout in hours"
    )
    auth_session_cookie_secure: bool | None = Field(
        default=None,
        description="Explicit Secure cookie flag. Defaults to True in production, False in dev",
    )
    auth_session_cookie_samesite: Literal["lax", "strict", "none"] = Field(
        default="lax", description="SameSite policy for session cookies"
    )
    auth_csrf_cookie_name: str = Field(
        default="qpms_csrf", description="CSRF token cookie name"
    )
    auth_csrf_header_name: str = Field(
        default="X-CSRF-Token", description="CSRF verification request header name"
    )
    auth_argon2_time_cost: int = Field(default=3, description="Argon2id time cost parameter")
    auth_argon2_memory_cost: int = Field(
        default=65536, description="Argon2id memory cost parameter in KiB"
    )
    auth_argon2_parallelism: int = Field(default=4, description="Argon2id parallelism parameter")
    auth_email_verification_token_expire_hours: int = Field(
        default=24, description="Email verification token validity in hours"
    )
    auth_password_reset_token_expire_minutes: int = Field(
        default=30, description="Password reset token validity in minutes"
    )
    auth_rate_limit_login_attempts: int = Field(
        default=5, description="Max failed login attempts in window"
    )
    auth_rate_limit_login_window_seconds: int = Field(
        default=300, description="Rate limit window for login attempts in seconds"
    )
    email_delivery_provider: Literal["console", "file", "disabled"] = Field(
        default="console", description="Email delivery sink provider"
    )
    email_delivery_file_path: str = Field(
        default="data/emails.log", description="File path for file email sink"
    )

    # Database Settings (PostgreSQL + asyncpg)
    database_url: PostgresDsn | str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/qpms_dev",
        description="Async PostgreSQL connection string",
    )
    test_database_url: PostgresDsn | str | None = Field(
        default=None, description="Isolated database connection for tests"
    )
    db_pool_size: int = Field(default=10, description="Database connection pool size")
    db_max_overflow: int = Field(
        default=20, description="Max overflow connections beyond pool size"
    )
    db_pool_timeout: int = Field(
        default=30, description="Seconds to wait before timing out getting a connection"
    )
    db_pool_recycle: int = Field(
        default=1800, description="Seconds before recycling persistent connections"
    )
    db_echo: bool = Field(default=False, description="Log generated SQL statements")

    # CORS Configuration
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed frontend origin URLs",
    )

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", description="Global logging severity level"
    )
    log_format: Literal["json", "text"] = Field(
        default="text", description="Log serialization format"
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, value: str | list[str]) -> list[str]:
        """Parse string or JSON list of CORS origins."""
        if isinstance(value, str):
            if value.startswith("[") and value.endswith("]"):
                import json

                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        return [str(origin).strip() for origin in parsed]
                except Exception:
                    pass
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        """Helper to verify production mode."""
        return self.app_env == "production"

    @property
    def is_test(self) -> bool:
        """Helper to verify test mode."""
        return self.app_env == "test"

    @property
    def resolved_session_cookie_name(self) -> str:
        """Ensure __Host- prefix in production when HTTPS cookies are enforced."""
        if self.is_production and not self.auth_session_cookie_name.startswith("__Host-"):
            return f"__Host-{self.auth_session_cookie_name}"
        return self.auth_session_cookie_name

    @property
    def resolved_cookie_secure(self) -> bool:
        """Resolve Secure flag based on explicit configuration and environment."""
        if self.auth_session_cookie_secure is not None:
            return self.auth_session_cookie_secure
        return self.is_production

    def validate_production_security(self) -> None:
        """Fail fast at startup if production security invariants are violated."""
        if self.is_production and (
            self.secret_key.startswith("dev-insecure") or len(self.secret_key) < 32
        ):
            raise ValueError(
                "Production configuration violation: SECRET_KEY must be a cryptographically secure string of at least 32 characters."
            )


settings = Settings()
