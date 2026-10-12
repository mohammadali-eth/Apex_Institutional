"""Request ID correlation and logging middleware."""

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

HEADER_REQUEST_ID = "X-Request-ID"
HEADER_PROCESS_TIME = "X-Process-Time"


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Assigns or propagates X-Request-ID and tracks request duration."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get(HEADER_REQUEST_ID) or str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = time.perf_counter() - start_time

        response.headers[HEADER_REQUEST_ID] = request_id
        response.headers[HEADER_PROCESS_TIME] = f"{process_time:.4f}s"
        return response
