import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.logging_config import configure_logging
from app.routers import agents, evidence, intents, policies, principals
from app.security import observability_middleware

configure_logging(level="INFO" if settings.environment == "production" else "DEBUG")
logger = logging.getLogger("payreality.startup")


def _validate_production_config() -> None:
    """Refuse to boot in production with missing/default secrets rather than
    running degraded: e.g. silently unable to sign Evidence, or exposing
    every policy/resolution endpoint with no operator gate."""
    if settings.environment != "production":
        return
    missing = []
    if not settings.evidence_signing_key_b64:
        missing.append("EVIDENCE_SIGNING_KEY_B64")
    if not settings.admin_api_key:
        missing.append("ADMIN_API_KEY")
    if not settings.cors_origin or settings.cors_origin == "http://localhost:5173":
        missing.append("CORS_ORIGIN")
    if missing:
        raise RuntimeError(
            "Refusing to start with ENVIRONMENT=production while these are "
            f"missing or left at their dev default: {', '.join(missing)}"
        )


def create_app() -> FastAPI:
    _validate_production_config()

    app = FastAPI(
        title="PayReality Runtime Authority API",
        version="0.1.0",
        description=(
            "Deterministic policy evaluation (OPA/Rego), ED25519-signed "
            "Evidence, and the human-review resolution flow for AI agent "
            "financial actions. Full schema at /openapi.json, interactive "
            "docs at /docs."
        ),
    )

    app.middleware("http")(observability_middleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.cors_origin],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=[
            "Content-Type",
            "X-PayReality-Key-Id",
            "X-PayReality-Signature",
            "X-PayReality-Operator-Key",
        ],
    )

    @app.get("/health")
    def health():
        """Liveness only: process is up and serving. No dependency calls --
        see /health/ready for database and OPA reachability."""
        return {"status": "ok"}

    @app.get("/health/ready")
    def health_ready():
        """Readiness: checked live on every call, not cached. A false
        'ready' here is worse than a slow one, since a load balancer or
        orchestrator will route real traffic based on this.

        Each check runs with a hard overall deadline via a worker thread,
        not just the engine's own connect_timeout: psycopg retries every
        address a hostname resolves to (e.g. both ::1 and 127.0.0.1 for
        "localhost"), each getting its own connect_timeout budget, so an
        unreachable "localhost" database took 14+ seconds to fail even
        with connect_timeout=5, caught by actually timing this endpoint
        against a real unreachable database, not assumed from the config
        alone. The .result(timeout=...) below bounds the HTTP response
        itself regardless of how many addresses get tried underneath."""
        from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

        def _check_database() -> bool:
            from sqlalchemy import text

            from app.db.session import SessionLocal

            db = SessionLocal()
            try:
                db.execute(text("SELECT 1"))
                return True
            finally:
                db.close()

        def _check_opa() -> bool:
            from app.opa_client import HttpOpaClient

            return HttpOpaClient().health()

        # Not a `with` block deliberately: ThreadPoolExecutor.__exit__ calls
        # shutdown(wait=True), which would block this response on the same
        # slow-to-fail connection attempt we're trying to bound. A future
        # that times out here keeps running in its worker thread in the
        # background (Python can't force-kill a thread), but that no
        # longer blocks the HTTP response, which is the actual guarantee
        # this endpoint needs to make.
        checks = {"database": False, "opa": False}
        pool = ThreadPoolExecutor(max_workers=2)
        db_future = pool.submit(_check_database)
        opa_future = pool.submit(_check_opa)

        try:
            checks["database"] = db_future.result(timeout=3)
        except FutureTimeoutError:
            logger.warning("readiness_check_timed_out component=database")
        except Exception:
            logger.exception("readiness_check_failed component=database")

        try:
            checks["opa"] = opa_future.result(timeout=3)
        except FutureTimeoutError:
            logger.warning("readiness_check_timed_out component=opa")
        except Exception:
            logger.exception("readiness_check_failed component=opa")

        pool.shutdown(wait=False)
        ready = all(checks.values())
        return JSONResponse(status_code=200 if ready else 503, content={"ready": ready, "checks": checks})

    app.include_router(principals.router)
    app.include_router(agents.router)
    app.include_router(policies.router)
    app.include_router(intents.router)
    app.include_router(evidence.router)

    return app


app = create_app()
