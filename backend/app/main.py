"""FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import logger, setup_logging
from app.db.health import check_database_health
from app.db.session import engine, get_db_session
from app.middleware.request_id import RequestIdMiddleware


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and graceful shutdown lifecycle."""
    setup_logging()
    logger.info(
        "Initializing %s (v%s) in [%s] mode",
        settings.app_name,
        settings.app_version,
        settings.app_env,
    )
    yield
    logger.info("Shutting down database connection engine...")
    await engine.dispose()
    logger.info("Application shutdown complete.")


def create_application() -> FastAPI:
    """Factory function to build and configure the FastAPI instance."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production or settings.debug else None,
        redoc_url="/redoc" if not settings.is_production or settings.debug else None,
        openapi_url="/openapi.json" if not settings.is_production or settings.debug else None,
    )

    # 1. Custom Request ID Middleware
    app.add_middleware(RequestIdMiddleware)

    # 2. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # 3. Global Exception Handlers
    register_exception_handlers(app)

    # 4. Infrastructure Health Endpoints (Non-business)
    @app.get(
        "/health",
        tags=["Infrastructure"],
        summary="Liveness check",
        response_model=dict[str, Any],
    )
    async def liveness() -> dict[str, Any]:
        """Verify the service process is alive and responsive."""
        return {
            "status": "ok",
            "service": settings.app_name,
            "version": settings.app_version,
            "environment": settings.app_env,
        }

    @app.get(
        "/health/ready",
        tags=["Infrastructure"],
        summary="Readiness check",
        response_model=dict[str, Any],
    )
    async def readiness(session: AsyncSession = Depends(get_db_session)) -> JSONResponse:
        """Verify database connectivity and external infrastructure readiness."""
        db_healthy = await check_database_health(session)
        is_ready = db_healthy

        payload: dict[str, Any] = {
            "status": "ready" if is_ready else "unhealthy",
            "components": {
                "database": "connected" if db_healthy else "disconnected",
            },
        }

        return JSONResponse(
            status_code=status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE,
            content=payload,
        )

    # 5. Versioned API Routes (/api/v1)
    app.include_router(api_v1_router, prefix=settings.api_v1_prefix)

    return app


app = create_application()
