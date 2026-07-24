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
    running degraded -- e.g. silently unable to sign Evidence, or exposing
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
        orchestrator will route real traffic based on this."""
        checks = {"database": False, "opa": False}

        try:
            from sqlalchemy import text

            from app.db.session import SessionLocal

            db = SessionLocal()
            try:
                db.execute(text("SELECT 1"))
                checks["database"] = True
            finally:
                db.close()
        except Exception:
            logger.exception("readiness_check_failed component=database")

        try:
            from app.opa_client import HttpOpaClient

            checks["opa"] = HttpOpaClient().health()
        except Exception:
            logger.exception("readiness_check_failed component=opa")

        ready = all(checks.values())
        return JSONResponse(status_code=200 if ready else 503, content={"ready": ready, "checks": checks})

    app.include_router(principals.router)
    app.include_router(agents.router)
    app.include_router(policies.router)
    app.include_router(intents.router)
    app.include_router(evidence.router)

    return app


app = create_app()
