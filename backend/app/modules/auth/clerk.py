"""Clerk as the identity provider.

NEXGram keeps issuing its own session. Clerk proves who someone is — once, at
sign-in — and this module is the whole of that trust boundary: it verifies the
token Clerk handed the browser and reports the identity inside it. Everything
downstream is a NEXGram user id in a NEXGram token, which is why adding this
changed no endpoint, no dependency and no test outside auth.

Verifying a Clerk token on *every* request was considered and rejected. Clerk's
session tokens live 60 seconds and its web SDK has no offline cache, so a
shopkeeper who walks into the back room would start getting 401s mid-sale. The
session this app hands out lasts a week and survives a dead signal — which is
the behaviour a counter in a village needs, and the reason AuthContext refuses
to sign anyone out over a network error.

Two things here are load-bearing for security rather than convenience:

  * Only *verified* phone numbers and email addresses are matched against
    existing accounts. Matching an unverified one would let anyone who typed a
    shopkeeper's number into a Clerk signup inherit that shop.
  * The `azp` claim is checked against the origins we expect. Without it, a
    token minted for any other site on the same Clerk instance is accepted here.
"""

from __future__ import annotations

import base64
import binascii
import logging
import time
from dataclasses import dataclass
from typing import Any, Optional

import httpx
from jose import jwt
from jose.exceptions import JWTError

from app.core.config import settings
from app.core.security import normalise_mobile

logger = logging.getLogger("nexgram.clerk")

CLERK_API_BASE = "https://api.clerk.com/v1"
ALGORITHM = "RS256"

# Clerk mints short-lived tokens and clocks drift. This is the slack allowed on
# exp/nbf; more than a few seconds would defeat the point of a 60s token.
LEEWAY_SECONDS = 10

_jwks: Optional[dict] = None
_jwks_fetched_at: float = 0.0
# Guards against a malformed token with an unknown `kid` turning every request
# into a fetch against Clerk.
_jwks_last_refresh_attempt: float = 0.0
MIN_REFETCH_INTERVAL_SECONDS = 10


class ClerkError(Exception):
    """Raised when a Clerk token cannot be trusted, with a reason to show."""


@dataclass(frozen=True)
class ClerkIdentity:
    """Who Clerk says this is. Unverified contact details are dropped."""

    clerk_user_id: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None


def is_configured() -> bool:
    return bool(settings.CLERK_SECRET_KEY and issuer())


def issuer() -> str:
    """The instance origin every token must be issued by.

    Configured explicitly, or recovered from the publishable key, which carries
    it base64-encoded after the `pk_test_` / `pk_live_` prefix.
    """
    if settings.CLERK_ISSUER:
        return settings.CLERK_ISSUER.rstrip("/")

    key = settings.CLERK_PUBLISHABLE_KEY
    if not key:
        return ""
    _, _, encoded = key.partition("_")
    _, _, encoded = encoded.partition("_")
    if not encoded:
        return ""
    try:
        # The encoding is unpadded; base64 wants the padding back.
        host = base64.b64decode(encoded + "=" * (-len(encoded) % 4)).decode()
    except (binascii.Error, UnicodeDecodeError, ValueError):
        return ""
    host = host.rstrip("$")
    return f"https://{host}" if host else ""


def _authorized_parties() -> list[str]:
    raw = settings.CLERK_AUTHORIZED_PARTIES or ""
    return [p.strip() for p in raw.split(",") if p.strip()]


def _fetch_jwks(client: httpx.Client) -> dict:
    url = f"{issuer()}/.well-known/jwks.json"
    response = client.get(url, timeout=10.0)
    response.raise_for_status()
    return response.json()


def _signing_key(token: str, client: Optional[httpx.Client] = None) -> dict:
    """The JWK that signed this token, refetching if Clerk has rotated keys."""
    global _jwks, _jwks_fetched_at, _jwks_last_refresh_attempt

    try:
        kid = jwt.get_unverified_header(token).get("kid")
    except JWTError as exc:
        raise ClerkError("Token padha nahi ja saka.") from exc
    if not kid:
        raise ClerkError("Token mein signing key id nahi hai.")

    now = time.monotonic()
    stale = not _jwks or (now - _jwks_fetched_at) > settings.CLERK_JWKS_TTL_SECONDS

    def find() -> Optional[dict]:
        for key in (_jwks or {}).get("keys", []):
            if key.get("kid") == kid:
                return key
        return None

    key = None if stale else find()
    if key:
        return key

    # Either the cache is cold/stale, or this key id is new to us — which is
    # what a rotation looks like from here.
    if not stale and (now - _jwks_last_refresh_attempt) < MIN_REFETCH_INTERVAL_SECONDS:
        raise ClerkError("Token ki signing key nahi mili.")

    _jwks_last_refresh_attempt = now
    owned = client is None
    client = client or httpx.Client()
    try:
        _jwks = _fetch_jwks(client)
        _jwks_fetched_at = now
    except httpx.HTTPError as exc:
        logger.warning("Could not fetch Clerk JWKS: %s", exc)
        raise ClerkError("Clerk se signing keys nahi mil paayin. Thodi der baad try karein.") from exc
    finally:
        if owned:
            client.close()

    key = find()
    if not key:
        raise ClerkError("Token ki signing key nahi mili.")
    return key


def verify_token(token: str, client: Optional[httpx.Client] = None) -> dict[str, Any]:
    """Returns the claims of a token this Clerk instance really signed."""
    if not is_configured():
        raise ClerkError("Clerk configure nahi hai. Backend ke .env mein CLERK_SECRET_KEY daalein.")

    key = _signing_key(token, client)
    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=[ALGORITHM],
            issuer=issuer(),
            options={
                "verify_aud": False,  # Clerk uses azp, checked below.
                "leeway": LEEWAY_SECONDS,
            },
        )
    except JWTError as exc:
        # Covers a bad signature, an expired token and a wrong issuer alike.
        # Saying which would help someone probing more than it helps a user.
        raise ClerkError("Clerk session valid nahi hai. Dobara sign in karein.") from exc

    parties = _authorized_parties()
    if parties:
        azp = claims.get("azp")
        if azp and azp not in parties:
            logger.warning("Rejected a Clerk token minted for %s", azp)
            raise ClerkError("Yeh token is app ke liye nahi hai.")

    if not claims.get("sub"):
        raise ClerkError("Token mein user id nahi hai.")
    return claims


def _verified(entry: dict) -> bool:
    return (entry.get("verification") or {}).get("status") == "verified"


def _identity_from_user(payload: dict) -> ClerkIdentity:
    """Maps Clerk's user object, keeping only what it has actually verified."""
    mobile = None
    primary_phone = payload.get("primary_phone_number_id")
    for entry in payload.get("phone_numbers") or []:
        if not _verified(entry):
            continue
        candidate = normalise_mobile(entry.get("phone_number") or "")
        if candidate and (entry.get("id") == primary_phone or mobile is None):
            mobile = candidate

    email = None
    primary_email = payload.get("primary_email_address_id")
    for entry in payload.get("email_addresses") or []:
        if not _verified(entry):
            continue
        candidate = (entry.get("email_address") or "").strip().lower()
        if candidate and (entry.get("id") == primary_email or email is None):
            email = candidate

    name = " ".join(
        part for part in [payload.get("first_name"), payload.get("last_name")] if part
    ).strip()
    return ClerkIdentity(
        clerk_user_id=payload.get("id") or "",
        mobile=mobile,
        email=email,
        name=name or None,
    )


def _identity_from_claims(claims: dict) -> Optional[ClerkIdentity]:
    """Reads identity straight off the token, if a JWT template supplies it.

    Clerk's default session token carries almost nothing — sub, sid, iss, exp.
    A dashboard JWT template can add phone and email, and when someone has set
    one up this saves a round trip on every sign-in. Without one we ask the
    Backend API instead, so the feature works with no dashboard configuration.
    """
    phone = claims.get("phone_number") or claims.get("phone")
    email = claims.get("email_address") or claims.get("email")
    if not phone and not email:
        return None

    # A template can only assert what Clerk verified, but it can be configured
    # to emit unverified values, so respect an explicit flag when present.
    if phone and claims.get("phone_number_verified") is False:
        phone = None
    if email and claims.get("email_verified") is False:
        email = None
    if not phone and not email:
        return None

    return ClerkIdentity(
        clerk_user_id=claims["sub"],
        mobile=normalise_mobile(phone or "") if phone else None,
        email=(email or "").strip().lower() or None,
        name=(claims.get("name") or "").strip() or None,
    )


def fetch_user(clerk_user_id: str, client: Optional[httpx.Client] = None) -> ClerkIdentity:
    """Asks Clerk who this user is, using the server-side secret key."""
    owned = client is None
    client = client or httpx.Client()
    try:
        response = client.get(
            f"{CLERK_API_BASE}/users/{clerk_user_id}",
            headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        logger.warning("Clerk user lookup failed: %s", exc)
        raise ClerkError("Clerk se user details nahi mil paayin.") from exc
    finally:
        if owned:
            client.close()

    if response.status_code == 401:
        raise ClerkError("CLERK_SECRET_KEY galat hai. Backend ke .env mein check karein.")
    if response.status_code >= 400:
        logger.warning("Clerk user lookup returned %s", response.status_code)
        raise ClerkError("Clerk se user details nahi mil paayin.")

    return _identity_from_user(response.json())


def identify(token: str, client: Optional[httpx.Client] = None) -> ClerkIdentity:
    """Verifies a Clerk token and returns the verified identity behind it."""
    claims = verify_token(token, client)
    from_claims = _identity_from_claims(claims)
    if from_claims:
        return from_claims
    return fetch_user(claims["sub"], client)


def reset_cache() -> None:
    """Drops the cached signing keys. For tests and key rotation by hand."""
    global _jwks, _jwks_fetched_at, _jwks_last_refresh_attempt
    _jwks = None
    _jwks_fetched_at = 0.0
    _jwks_last_refresh_attempt = 0.0
