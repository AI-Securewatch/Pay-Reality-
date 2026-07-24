"""Operator authentication, request context/logging, security headers, and
per-client rate limiting.

Phase 1 has no human user/session/RBAC system yet: `resolved_by` on a
decision resolution is still a free-text field (see
app.services.resolution_service). `verify_operator_key` is a real, working
gate (not a mock) on the endpoints that mutate policy or resolve a
HUMAN_REVIEW decision: a single shared operator credential, appropriate for
an early pilot with one ops team, not a substitute for the multi-user RBAC
system in the V3 roadmap.
"""

import hmac
import logging
import time
import uuid
from collections import defaultdict, deque

from fastapi import Header, HTTPException, Request
from fastapi.responses import JSONResponse

from app.config import settings

access_logger = logging.getLogger("payreality.access")

_RATE_LIMIT_WINDOW_SECONDS = 60
_RATE_LIMIT_MAX_REQUESTS = 120
_request_log: dict[str, deque] = defaultdict(deque)


def verify_operator_key(x_payreality_operator_key: str = Header(...)) -> None:
    if not settings.admin_api_key:
        raise HTTPException(status_code=503, detail="operator_auth_not_configured")
    if not hmac.compare_digest(x_payreality_operator_key, settings.admin_api_key):
        raise HTTPException(status_code=401, detail="invalid_operator_key")


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def observability_middleware(request: Request, call_next):
    """Rate limiting, request id, access logging, security headers, and the
    last-resort 500 handler, in one middleware.

    This intentionally is NOT split into several stacked
    `app.middleware("http")` (BaseHTTPMiddleware) layers: Starlette's
    BaseHTTPMiddleware has a documented history of losing exceptions across
    multiple stacked instances (the exception raised by the route handler
    never reaches an outer layer's except block, producing an empty
    response body instead of a clean JSON 500, verified locally while
    building this). One middleware, one try/except around call_next, is the
    reliable version of the same behavior.
    """
    key = _client_key(request)
    now = time.monotonic()
    log = _request_log[key]
    while log and now - log[0] > _RATE_LIMIT_WINDOW_SECONDS:
        log.popleft()
    if len(log) >= _RATE_LIMIT_MAX_REQUESTS:
        return JSONResponse(status_code=429, content={"detail": "rate_limit_exceeded"})
    log.append(now)

    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    start = time.monotonic()

    try:
        response = await call_next(request)
    except Exception:
        access_logger.exception(
            "unhandled_exception request_id=%s method=%s path=%s",
            request_id,
            request.method,
            request.url.path,
        )
        response = JSONResponse(status_code=500, content={"detail": "internal_error"})

    duration_ms = (time.monotonic() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"

    access_logger.info(
        "request_id=%s method=%s path=%s status=%s duration_ms=%.1f",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response
