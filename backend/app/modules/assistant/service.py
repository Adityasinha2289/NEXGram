"""The in-app assistant, on Google Gemini.

Built around one number: **time to first token**. A shopkeeper on a rural
connection does not experience "the answer took 3 seconds", they experience
"nothing happened when I pressed send". Four choices follow from that.

* **Stream.** Tokens go to the screen as Google emits them, so text starts
  appearing in a few hundred milliseconds instead of after the whole reply.
  This is the single largest perceived-latency win available and everything
  else here is secondary to it.
* **One HTTP client, reused.** A fresh connection per message pays DNS, TCP and
  a TLS handshake every time - easily 200ms on a slow link, before Google has
  read a word. The client is opened once with the app and kept warm.
* **A short system prompt.** Every input token is time. The prompt below is
  deliberately terse, and the shop snapshot is a handful of lines rather than a
  dump of the catalogue.
* **No server-side history.** The client sends the turns it already has, so a
  reply costs no database round trip to reconstruct a conversation.

The API key never reaches the browser: the app talks to this endpoint, and this
endpoint talks to Google.
"""

import json
import logging
from typing import AsyncIterator, Optional

import httpx
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.commerce import Order
from app.models.intelligence import Opportunity
from app.models.profiles import DistributorProfile, Location, RetailerProfile
from app.models.retail import ConsumerOrder, RetailerInventory
from app.models.users import User

logger = logging.getLogger("nexgram.assistant")

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"

# Opened once by the app's lifespan, so a message does not pay for a TLS
# handshake before Google sees it.
_client: Optional[httpx.AsyncClient] = None


def open_client() -> None:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.GEMINI_TIMEOUT_SECONDS, connect=10.0),
            # Keeps the connection warm between messages.
            limits=httpx.Limits(max_keepalive_connections=4, keepalive_expiry=120.0),
        )


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def is_configured() -> bool:
    return bool(settings.GEMINI_API_KEY.strip())


class AssistantUnavailable(RuntimeError):
    """Raised when the assistant cannot answer, with something a user can act on."""


# Terse on purpose - every input token is latency. It says what the product is,
# who is asking, and the two rules that matter, and stops.
SYSTEM_PROMPT = """You are the NEXGram assistant, inside an app used by small
shopkeepers, distributors and households in rural and tier-3 India.

Answer anything asked - general knowledge, business advice, arithmetic, or
questions about their own shop from the context below.

Rules:
- Reply in the language of the question. Hinglish question, Hinglish answer.
- Be brief. Most answers are 1-3 sentences. Use a short list only when the
  question genuinely has several parts. The reader is on a phone.
- Use the CONTEXT for anything about their own business. If the context does
  not contain the answer, say you cannot see that rather than inventing it.
- Never invent a price, a stock figure, or an order number.
- You do not decide loans or eligibility. Point at the Loan screen instead.
"""


def build_context(db: Session, user: User) -> str:
    """A compact snapshot of what the asker actually has.

    This is what separates a useful assistant from a search box: "kitna doodh
    bacha hai" should be answerable. Kept to a few lines because the whole point
    is speed, and because a model given a catalogue dump answers more slowly and
    no better.
    """
    lines = [f"User: {user.name} ({user.role})"]

    if user.role == "retailer":
        shop = db.query(RetailerProfile).filter(RetailerProfile.user_id == user.id).first()
        if not shop:
            return "\n".join(lines)

        location = db.query(Location).filter(Location.id == shop.location_id).first() if shop.location_id else None
        lines.append(f"Shop: {shop.business_name}" + (f", {location.area}" if location and location.area else ""))

        rows = db.query(RetailerInventory).filter(
            RetailerInventory.retailer_id == shop.id,
            RetailerInventory.is_active == True,  # noqa: E712
        ).all()
        if rows:
            # The whole shelf, but one short line each: this is a kirana, not a
            # supermarket, so it is a few dozen rows at most.
            lines.append("Shelf (product: qty @ price):")
            for row in rows[:40]:
                product = row.product
                name = product.canonical_name if product else "?"
                variant = row.variant.variant_name if row.variant else ""
                lines.append(
                    f"- {name} {variant}: {row.quantity} @ Rs {row.selling_price or '?'}"
                    + (" (LOW)" if row.quantity <= row.reorder_level else "")
                )

        pending = db.query(func.count(Order.id)).filter(
            Order.retailer_id == shop.id, Order.status == "requested",
        ).scalar() or 0
        online = db.query(func.count(ConsumerOrder.id)).filter(
            ConsumerOrder.retailer_id == shop.id, ConsumerOrder.status == "placed",
        ).scalar() or 0
        lines.append(f"Wholesale orders awaiting supplier: {pending}")
        lines.append(f"Home-delivery orders awaiting your acceptance: {online}")

    elif user.role == "distributor":
        dist = db.query(DistributorProfile).filter(DistributorProfile.user_id == user.id).first()
        if not dist:
            return "\n".join(lines)
        lines.append(f"Business: {dist.business_name}")

        signals = db.query(func.count(Opportunity.id)).filter(
            Opportunity.distributor_id == dist.id, Opportunity.status == "active",
        ).scalar() or 0
        incoming = db.query(func.count(Order.id)).filter(
            Order.distributor_id == dist.id, Order.status == "requested",
        ).scalar() or 0
        lines.append(f"Active opportunity signals: {signals}")
        lines.append(f"Orders awaiting your response: {incoming}")

    return "\n".join(lines)


def _payload(history: list, context: str) -> dict:
    """The request body, in Gemini's shape."""
    contents = []
    for turn in history:
        role = "model" if turn.get("role") == "assistant" else "user"
        text = (turn.get("text") or "").strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})

    return {
        "system_instruction": {
            "parts": [{"text": f"{SYSTEM_PROMPT}\n\nCONTEXT\n{context}"}],
        },
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": settings.GEMINI_MAX_OUTPUT_TOKENS,
            "temperature": 0.7,
        },
    }


def _extract_text(chunk: dict) -> str:
    """Pulls the text out of one streamed chunk, tolerating a missing part.

    Gemini emits chunks carrying only a finishReason or safety metadata, and
    indexing straight into parts[0] turns one of those into a 500 mid-answer.
    """
    for candidate in chunk.get("candidates") or []:
        for part in (candidate.get("content") or {}).get("parts") or []:
            if "text" in part:
                return part["text"]
    return ""


async def stream_reply(history: list, context: str) -> AsyncIterator[str]:
    """Yields the reply as Google produces it.

    Raises AssistantUnavailable with a sentence the user can act on, rather
    than letting an httpx error or a Google 4xx surface as a blank screen.
    """
    if not is_configured():
        raise AssistantUnavailable(
            "Assistant abhi set nahi hua hai. GEMINI_API_KEY backend ke .env mein daalein."
        )
    if _client is None:
        open_client()

    url = (
        f"{GEMINI_BASE}/models/{settings.GEMINI_MODEL}:streamGenerateContent"
        f"?alt=sse&key={settings.GEMINI_API_KEY}"
    )

    try:
        async with _client.stream("POST", url, json=_payload(history, context)) as response:
            if response.status_code >= 400:
                body = (await response.aread()).decode(errors="replace")
                raise AssistantUnavailable(_explain(response.status_code, body))

            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                raw = line[5:].strip()
                if not raw or raw == "[DONE]":
                    continue
                try:
                    text = _extract_text(json.loads(raw))
                except json.JSONDecodeError:
                    continue
                if text:
                    yield text

    except httpx.TimeoutException:
        raise AssistantUnavailable("Jawab aane mein bahut der lagi. Dobara try karein.")
    except httpx.HTTPError as exc:
        logger.warning("Gemini request failed: %s", exc)
        raise AssistantUnavailable("Assistant se baat nahi ho payi. Internet check karein.")


def _explain(status: int, body: str) -> str:
    """Turns Google's error into something the person reading it can fix."""
    detail = ""
    try:
        detail = (json.loads(body).get("error") or {}).get("message", "")
    except (json.JSONDecodeError, AttributeError):
        detail = body[:200]

    if status in (401, 403):
        return "Gemini API key galat ya expired hai. Backend ke .env mein GEMINI_API_KEY check karein."
    if status == 404:
        return (
            f"Model '{settings.GEMINI_MODEL}' nahi mila. GEMINI_MODEL .env mein badlein "
            f"(e.g. gemini-3.5-flash-lite). Google: {detail[:120]}"
        )
    if status == 429:
        return "Gemini ki limit lag gayi hai. Thodi der baad try karein."

    logger.warning("Gemini returned %s: %s", status, detail[:300])
    return "Assistant abhi jawab nahi de paa raha. Thodi der baad try karein."
