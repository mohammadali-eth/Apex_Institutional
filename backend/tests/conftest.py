"""Test configuration and shared fixtures."""

from collections.abc import AsyncGenerator

import pytest
from app.core.config import settings
from app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.fixture(scope="session", autouse=True)
def configure_test_environment() -> None:
    """Ensure tests run under test environment profile."""
    assert settings.app_env in ("test", "development"), "Tests must not run in production!"


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Provide an asynchronous HTTP client bound to the FastAPI application."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
