import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.router import api_router
from app.core.config import settings
from app.core import notifications
from app.core.database import engine
from app.core.logging_config import RequestContextMiddleware, configure_logging, request_id_var

configure_logging()
logger = logging.getLogger("nexgram")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info(
        "NEXGram API starting (env=%s, docs=%s, notifications=%s)",
        settings.ENVIRONMENT,
        "disabled" if settings.is_production else "enabled",
        notifications.channel_name(),
    )
    if settings.is_production and notifications.channel_name() == "ConsoleChannel":
        # Password reset codes would go to the log instead of the user.
        logger.warning(
            "No notification provider configured: password reset codes will not "
            "reach users. Wire a NotificationChannel before real signups."
        )
    yield
    logger.info("NEXGram API shutting down")


app = FastAPI(
    lifespan=lifespan,
    title="NEXGram API",
    description=(
        "Local business intelligence for rural B2B commerce. Turns retailer demand "
        "and distributor supply into explainable, evidence-backed opportunities."
    ),
    version="1.0.0",
    # Interactive docs are useful in development and an information leak in
    # production, where the schema tells an attacker exactly what to probe.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Returns a JSON 500 instead of letting the exception escape the stack.

    An error that propagates past CORSMiddleware produces a response with no
    Access-Control-Allow-Origin header, so the browser reports a server crash as
    a CORS failure and the real cause never reaches the console. The request id
    goes back to the caller so a bug report can be traced to a log line.
    """
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id_var.get()},
        headers={"X-Request-ID": request_id_var.get()},
    )


app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["ops"], summary="Liveness")
def health_check():
    """Is the process up? Used by the platform to decide whether to restart."""
    return {"status": "ok", "environment": settings.ENVIRONMENT, "version": app.version}


@app.get("/ready", tags=["ops"], summary="Readiness")
def readiness_check():
    """Can this instance actually serve traffic?

    Separate from /health on purpose: a process that is alive but cannot reach
    the database should be pulled out of the load balancer, not restarted.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        database = "connected"
        ready = True
    except Exception as exc:
        logger.error("Readiness check failed: %s", exc)
        database = "unavailable"
        ready = False

    return JSONResponse(
        status_code=200 if ready else 503,
        content={"ready": ready, "database": database, "environment": settings.ENVIRONMENT},
    )
