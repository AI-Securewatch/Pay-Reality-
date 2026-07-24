from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    database_url: str = "postgresql+psycopg://payreality@localhost:5432/payreality_dev"

    opa_url: str = "http://localhost:8181"
    opa_binary_path: str = "opa"

    evidence_signing_key_b64: str = ""
    evidence_signing_key_id: str = "signing_key_dev"

    # Gates the operator-only endpoints (policy review/compile/activate,
    # human-review resolution) until a real human auth/RBAC system exists.
    # See app.security.verify_operator_key.
    admin_api_key: str = ""

    anthropic_api_key: str = ""

    intent_signature_window_seconds: int = 300

    cors_origin: str = "http://localhost:5173"


settings = Settings()
