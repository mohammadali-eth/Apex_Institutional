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

    # Security Configuration Boundaries (Future Auth)
    secret_key: str = Field(
        default="dev-insecure-secret-key-change-in-production-min-32-chars",
        description="Application secret key",
    )
    access_token_expire_minutes: int = Field(
        default=30, description="Access token expiration window"
    )
    refresh_token_expire_days: int = Field(default=7, description="Refresh token expiration window")

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


settings = Settings()
