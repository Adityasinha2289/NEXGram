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
        "http://localhost:5174,http://127.0.0.1:5174,"
        "http://localhost:5175,http://127.0.0.1:5175,"
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

    # --- Assistant (Google Gemini) -----------------------------------------
    #
    # Left blank on purpose. Without a key the assistant reports itself as
    # unconfigured and the UI hides itself, rather than every chat turning into
    # a 500 nobody can act on.
    GEMINI_API_KEY: str = ""

    # Chosen for latency, measured rather than assumed: on this workload the
    # -lite tier answers in ~1.1s to first token against ~4.7s for the plain
    # flash of the same generation, and the answers stayed on topic. On a rural
    # connection that gap is the difference between a reply and a wait.
    #
    # Google retires these. When it does, the API answers 404 with the name of
    # the replacement, and _explain() puts that name in front of the user.
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"

    # Caps one reply. A shopkeeper reading on a phone will not scroll past this,
    # and every token past it is latency they wait through.
    GEMINI_MAX_OUTPUT_TOKENS: int = 800

    # How long to wait for Google before giving up and saying so.
    GEMINI_TIMEOUT_SECONDS: float = 30.0

    # --- Demo access --------------------------------------------------------
    #
    # Lets the landing page open a demo account in one tap, without the browser
    # holding a password.
    #
    # This grants nothing that was not already public: the demo credentials
    # shipped inside the client bundle, so anyone could read them from the
    # JavaScript and sign in. What it removes is a class of breakage — the
    # button failing because the seed's password changed, or because somebody
    # else's typos used up the shared rate limit — on the one flow whose whole
    # job is to work first time in front of an audience.
    #
    # It only ever resolves the three seeded demo numbers. Set false on any
    # deployment carrying real shops.
    DEMO_LOGIN_ENABLED: bool = True

    # --- Identity (Clerk) ---------------------------------------------------
    #
    # Optional. Blank means the Clerk sign-in route reports itself unavailable
    # and mobile+password carries on unchanged — the same posture the assistant
    # takes without a key, and the reason adding this broke nothing.
    #
    # Clerk proves who someone is once, at sign-in. It does not own the session:
    # see app/modules/auth/clerk.py for why that distinction is load-bearing
    # for a shop on a rural connection.
    CLERK_SECRET_KEY: str = ""

    # The instance's Frontend API origin, e.g.
    # "https://verb-noun-00.clerk.accounts.dev". It is the `iss` every token
    # must carry and the host the signing keys are fetched from. Taken from the
    # publishable key when left blank, since that key encodes it.
    CLERK_ISSUER: str = ""

    # The publishable key the browser uses. Also read here so the issuer can be
    # derived from it — it is not a secret.
    CLERK_PUBLISHABLE_KEY: str = ""

    # Origins allowed to present a token, matched against the `azp` claim. A
    # token minted for another site is then refused even though it is validly
    # signed by the same Clerk instance. Blank skips the check, which is right
    # for local development and wrong in production.
    CLERK_AUTHORIZED_PARTIES: str = ""

    # Signing keys are cached this long. Clerk rotates them; an unknown key id
    # forces an immediate refetch regardless, so this only bounds how long a
    # retired key stays trusted.
    CLERK_JWKS_TTL_SECONDS: int = 3600

    # The cut taken on a sourced wholesale order, as a fraction. Deliberately
    # thin and deliberately visible: the product's promise is that a shopkeeper
    # gets the best local price without visiting four suppliers, and a markup
    # they discover later is the one thing that breaks it. Every quote states
    # this in rupees.
    PLATFORM_MARGIN_RATE: float = 0.02

    # How far a shop will deliver to a household on foot or by bicycle. Beyond
    # this the order is not a delivery, it is a journey - and the runner is a
    # teenager with a cycle, not a courier network.
    DELIVERY_RADIUS_KM: float = 3.0

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
