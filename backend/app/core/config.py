import secrets
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration.

    Every value has a development default so `git clone && uvicorn` works, but
    the secrets are validated on startup: a default that is safe on a laptop is
    not safe once the app is reachable from the internet, and a silent fallback
    is how a placeholder signing key ends up in production.
    """

    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./nexgram_dev.db"

    # Comma-separated list of browser origins allowed to call the API.
    # 5173 is `npm run dev`; 4173 is `npm run preview` (the production build).
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173,"
        "http://localhost:3000,http://127.0.0.1:3000"
    )

    # Signs access tokens. Regenerated per process in development so a leaked
    # laptop key is worthless; must be set explicitly anywhere else.
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # Shared secret guarding the operational /intelligence/*/generate endpoints.
    OPS_TOKEN: str = ""

    # Auth rate limiting, per client IP.
    AUTH_RATE_LIMIT_ATTEMPTS: int = 10
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 300

    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in {"production", "prod", "staging"}

    @property
    def allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    def validate_runtime(self) -> None:
        """Fails fast rather than starting up insecurely.

        Called once at import. In production a missing secret is a hard error;
        in development it is filled with a random per-process value, which means
        restarting invalidates old tokens - the right trade for a laptop.
        """
        problems = []

        if not self.SECRET_KEY:
            if self.is_production:
                problems.append(
                    "SECRET_KEY is required in production. Generate one with: "
                    'python -c "import secrets; print(secrets.token_hex(32))"'
                )
            else:
                self.SECRET_KEY = secrets.token_hex(32)

        if not self.OPS_TOKEN:
            if self.is_production:
                problems.append("OPS_TOKEN is required in production to guard the pipeline endpoints.")
            else:
                self.OPS_TOKEN = "dev-ops-token"

        if self.is_production:
            if any(origin.startswith("http://localhost") for origin in self.allowed_origins):
                problems.append("ALLOWED_ORIGINS still contains localhost in production.")
            if self.DATABASE_URL.startswith("sqlite"):
                # A warning, not a failure: single-instance SQLite is a
                # legitimate small deployment, but it should be deliberate.
                import logging
                logging.getLogger("nexgram").warning(
                    "Running production on SQLite. This is single-writer and does "
                    "not survive an ephemeral filesystem; set DATABASE_URL to Postgres "
                    "for anything multi-instance."
                )

        if problems:
            raise RuntimeError("Invalid configuration:\n  - " + "\n  - ".join(problems))


settings = Settings()
settings.validate_runtime()
