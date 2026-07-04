from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://payreality@localhost:5432/payreality_dev"

    opa_url: str = "http://localhost:8181"
    opa_binary_path: str = "opa"

    evidence_signing_key_b64: str = ""
    evidence_signing_key_id: str = "signing_key_dev"

    anthropic_api_key: str = ""

    intent_signature_window_seconds: int = 300

    cors_origin: str = "http://localhost:5173"


settings = Settings()
