"""Structured request logging.

Every log line carries a request id that is also returned to the caller in
`X-Request-ID`. When a shopkeeper reports "my order failed at 4pm", that id is
what turns a vague complaint into one traceable request.

JSON in production so a log shipper can parse it; human-readable locally.
"""

import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "request_id": getattr(record, "request_id", "-"),
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        for key, value in getattr(record, "extra_fields", {}).items():
            payload[key] = value
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RequestIdFilter())
    handler.setFormatter(
        JsonFormatter()
        if settings.is_production
        else logging.Formatter("%(levelname)-8s [%(request_id)s] %(name)s: %(message)s")
    )

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.LOG_LEVEL.upper())

    # Uvicorn keeps its own handlers, which would double every line.
    for name in ("uvicorn", "uvicorn.error"):
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True

    # Its access log duplicates the middleware's line without the request id, so
    # it is silenced rather than shipped twice.
    access = logging.getLogger("uvicorn.access")
    access.handlers = []
    access.propagate = False


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assigns a request id, times the request, and logs the outcome."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logger = logging.getLogger("nexgram.request")

    async def dispatch(self, request, call_next):
        # Honour an upstream id so a trace survives across services.
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        token = request_id_var.set(request_id)
        started = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - started) * 1000, 1)
            self.logger.exception(
                "%s %s failed after %sms", request.method, request.url.path, duration_ms
            )
            request_id_var.reset(token)
            raise

        duration_ms = round((time.perf_counter() - started) * 1000, 1)
        response.headers["X-Request-ID"] = request_id

        # Health checks every few seconds would drown the useful lines.
        if request.url.path not in ("/health", "/ready"):
            self.logger.info(
                "%s %s -> %s in %sms",
                request.method, request.url.path, response.status_code, duration_ms,
                extra={"extra_fields": {
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": duration_ms,
                }},
            )

        request_id_var.reset(token)
        return response
