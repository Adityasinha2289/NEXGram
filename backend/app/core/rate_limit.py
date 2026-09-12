"""Per-IP rate limiting for the authentication endpoints.

Deliberately dependency-free and in-process. That is honest about what it is:
it stops password guessing against a single instance, which is the threat this
app actually faces. It is not a distributed limiter - behind several instances
each holds its own counter, so a real multi-instance deployment should move this
to Redis or the load balancer. The docstring says so rather than the code
pretending otherwise.
"""

import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional

from fastapi import HTTPException, Request, status

from app.core.config import settings


class SlidingWindowLimiter:
    """Counts attempts per key inside a rolling time window."""

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> Deque[float]:
        hits = self._hits[key]
        cutoff = now - self.window_seconds
        while hits and hits[0] < cutoff:
            hits.popleft()
        return hits

    def check(self, key: str) -> Optional[int]:
        """Records an attempt. Returns seconds to wait if over the limit."""
        now = time.time()
        with self._lock:
            hits = self._prune(key, now)
            if len(hits) >= self.max_attempts:
                return max(1, int(self.window_seconds - (now - hits[0])))
            hits.append(now)
            return None

    def reset(self, key: str) -> None:
        """Clears a key's history - called after a successful sign-in so one
        person's typos do not lock out the next customer on a shared IP."""
        with self._lock:
            self._hits.pop(key, None)


auth_limiter = SlidingWindowLimiter(
    max_attempts=settings.AUTH_RATE_LIMIT_ATTEMPTS,
    window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
)


def client_key(request: Request) -> str:
    """Identifies the caller.

    Behind a proxy the socket address is the proxy, so the forwarded header is
    used when present. That header is client-controlled and must only be trusted
    where a proxy you control overwrites it.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit_auth(request: Request) -> None:
    retry_after = auth_limiter.check(f"auth:{client_key(request)}")
    if retry_after is None:
        return
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Bahut zyada attempts. {retry_after} second baad try karein.",
        headers={"Retry-After": str(retry_after)},
    )
