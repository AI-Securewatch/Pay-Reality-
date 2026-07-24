from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import agents, evidence, intents, policies, principals


def create_app() -> FastAPI:
    app = FastAPI(title="PayReality", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.cors_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {"status": "ok"}

    app.include_router(principals.router)
    app.include_router(agents.router)
    app.include_router(policies.router)
    app.include_router(intents.router)
    app.include_router(evidence.router)

    return app


app = create_app()
