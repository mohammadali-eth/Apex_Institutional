"""Centralized application settings and environment validation using Pydantic Settings."""

import os
from typing import Literal

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --------------------------------------------------------------------------
    # A. Application Configuration
    # --------------------------------------------------------------------------
    app_name: str = Field(default="QPMS Enterprise", description="Application name")
    app_env: Literal["development", "test", "production"] = Field(
        default="development", description="Current runtime environment"
    )
    app_version: str = Field(default="0.1.0", description="Semver release tag")
    app_base_url: str = Field(
        default="http://localhost:3000",
        description="Public client-facing frontend URL (CORS and verification links)",
    )
    api_base_url: str = Field(
        default="http://localhost:8000",
        description="Backend API server URL",
    )
    debug: bool = Field(default=False, description="Enable debug mode")
    api_v1_prefix: str = Field(default="/api/v1", description="Prefix for v1 routes")

    # Server Bindings
    host: str = Field(default="127.0.0.1", description="Server bind host")
    port: int = Field(default=8000, description="Server bind port")

    # --------------------------------------------------------------------------
    # B. Database Configuration (PostgreSQL + asyncpg)
    # --------------------------------------------------------------------------
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

    # --------------------------------------------------------------------------
    # C. Authentication and Session Security
    # --------------------------------------------------------------------------
    secret_key: str = Field(
        default="dev-insecure-secret-key-change-in-production-min-32-chars",
        description="Cryptographic secret key for signing sessions and CSRF tokens",
    )
    auth_session_cookie_name: str = Field(
        default="qpms_session",
        description="Session cookie name (uses __Host- prefix automatically in production HTTPS)",
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
    auth_csrf_cookie_name: str = Field(default="qpms_csrf", description="CSRF token cookie name")
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
        default=5, description="Max failed login attempts in rate limit window"
    )
    auth_rate_limit_login_window_seconds: int = Field(
        default=300, description="Rate limit window for login attempts in seconds"
    )
    auth_account_lockout_duration_minutes: int = Field(
        default=15, description="Duration in minutes an account is locked after repeated failures"
    )

    # --------------------------------------------------------------------------
    # E. File Uploads and Document Storage
    # --------------------------------------------------------------------------
    storage_provider: Literal["local", "s3"] = Field(
        default="local", description="Document storage backend (local filesystem or Amazon S3)"
    )
    storage_local_dir: str = Field(
        default="data/uploads", description="Base directory for local file uploads"
    )
    max_upload_size_bytes: int = Field(
        default=10485760, description="Maximum permitted upload file size in bytes (default: 10MB)"
    )
    allowed_upload_extensions: list[str] = Field(
        default=[".pdf", ".docx", ".png", ".jpg", ".jpeg"],
        description="Permitted file extensions for uploaded question assets and documents",
    )

    # --------------------------------------------------------------------------
    # F. Email and Notifications
    # --------------------------------------------------------------------------
    email_delivery_provider: Literal["console", "file", "smtp", "disabled"] = Field(
        default="console", description="Outbound email provider"
    )
    email_delivery_file_path: str = Field(
        default="data/emails.log", description="File path for file-based email logging"
    )
    smtp_host: str | None = Field(default=None, description="SMTP server hostname")
    smtp_port: int = Field(default=587, description="SMTP server port")
    smtp_username: str | None = Field(default=None, description="SMTP authentication username")
    smtp_password: str | None = Field(default=None, description="SMTP authentication password")
    smtp_use_tls: bool = Field(default=True, description="Enable TLS for SMTP connections")
    email_from_address: str = Field(
        default="no-reply@apex.edu", description="Sender email address for system emails"
    )
    email_from_name: str = Field(
        default="Apex QPMS", description="Sender display name for system emails"
    )

    # --------------------------------------------------------------------------
    # G. Question Paper System Configuration
    # --------------------------------------------------------------------------
    default_language: str = Field(
        default="English", description="Default primary language for question papers"
    )
    paper_generation_timeout_seconds: int = Field(
        default=30, description="Maximum computation timeout for paper solver engine in seconds"
    )
    max_paper_marks: int = Field(
        default=100, description="Default maximum marks cap for examination papers"
    )

    # --------------------------------------------------------------------------
    # H. Security and Logging
    # --------------------------------------------------------------------------
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed frontend origin URLs for CORS",
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", description="Global logging severity level"
    )
    log_format: Literal["json", "text"] = Field(
        default="text", description="Log serialization format"
    )
    audit_log_retention_days: int = Field(
        default=365, description="Days to retain security audit logs"
    )

    # --------------------------------------------------------------------------
    # Validators & Properties
    # --------------------------------------------------------------------------
    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, value: str | list[str]) -> list[str]:
        """Parse string, comma-delimited, or JSON list of CORS origins."""
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

    @field_validator("allowed_upload_extensions", mode="before")
    @classmethod
    def assemble_allowed_extensions(cls, value: str | list[str]) -> list[str]:
        """Parse comma-delimited or list of file extensions, ensuring leading dot."""
        if isinstance(value, str):
            items = [item.strip() for item in value.split(",") if item.strip()]
        else:
            items = list(value)
        return [ext if ext.startswith(".") else f".{ext}" for ext in items]

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
        """Backward-compatible alias for validate_environment."""
        self.validate_environment()

    def validate_environment(self) -> None:
        """Fail fast at startup with actionable error messages if invariants are violated."""
        # 1. Enforce production cryptographic secret constraints
        if self.is_production:
            if (
                self.secret_key.startswith("dev-insecure")
                or "change-in-production" in self.secret_key.lower()
                or len(self.secret_key) < 32
            ):
                raise ValueError(
                    "Production configuration violation: SECRET_KEY must be a cryptographically "
                    "secure random string of at least 32 characters. Generate one with: "
                    "`openssl rand -hex 32` or `python -c 'import secrets; print(secrets.token_urlsafe(32))'`"
                )

            # Enforce production SMTP settings when SMTP provider is active
            if self.email_delivery_provider == "smtp":
                if not self.smtp_host:
                    raise ValueError(
                        "CRITICAL CONFIGURATION ERROR: SMTP_HOST must be provided when "
                        "EMAIL_DELIVERY_PROVIDER is set to 'smtp'."
                    )
                if not self.email_from_address or "@" not in self.email_from_address:
                    raise ValueError(
                        "CRITICAL CONFIGURATION ERROR: A valid EMAIL_FROM_ADDRESS must be configured."
                    )

        # 2. Local file storage directory initialization
        if self.storage_provider == "local":
            try:
                os.makedirs(self.storage_local_dir, exist_ok=True)
            except OSError as exc:
                raise ValueError(
                    f"CRITICAL STORAGE ERROR: Cannot access or create local storage directory "
                    f"'{self.storage_local_dir}': {exc}"
                ) from exc


settings = Settings()
