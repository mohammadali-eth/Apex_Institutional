"""Unit tests for foundational configuration and components."""

from app.core.config import Settings


def test_settings_initialization_defaults() -> None:
    """Validate settings initializes with valid defaults and types."""
    settings = Settings(
        app_name="Test App",
        app_env="test",
        secret_key="test-secret-key-32-chars-long-minimum",
    )
    assert settings.app_name == "Test App"
    assert settings.app_env == "test"
    assert settings.is_test is True
    assert settings.is_production is False
    assert settings.api_v1_prefix == "/api/v1"


def test_cors_origins_parsing() -> None:
    """Validate string and JSON array parsing for CORS origins."""
    settings_str = Settings(
        cors_origins="http://example.com, https://test.edu",
        secret_key="test-secret-key-32-chars-long-minimum",
    )
    assert settings_str.cors_origins == ["http://example.com", "https://test.edu"]

    settings_json = Settings(
        cors_origins='["http://app.com", "http://api.com"]',
        secret_key="test-secret-key-32-chars-long-minimum",
    )
    assert settings_json.cors_origins == ["http://app.com", "http://api.com"]
