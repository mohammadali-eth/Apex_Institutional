"""Integration tests for infrastructure health and system endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_liveness_endpoint(async_client: AsyncClient) -> None:
    """Verify GET /health returns 200 OK and expected infrastructure metadata."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data
    assert "version" in data
    assert "environment" in data


@pytest.mark.asyncio
async def test_request_id_middleware(async_client: AsyncClient) -> None:
    """Verify X-Request-ID and X-Process-Time response headers are emitted."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers
    assert "X-Process-Time" in response.headers
