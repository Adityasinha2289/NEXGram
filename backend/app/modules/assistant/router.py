"""The assistant endpoint.

Streams over SSE. The browser reads the body as it arrives and paints each
chunk, which is what makes a reply feel immediate rather than merely fast.
"""

import json
import logging
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.users import User
from app.modules.assistant import service

logger = logging.getLogger("nexgram.assistant")

router = APIRouter(prefix="/assistant", tags=["assistant"])


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=4000)


class ChatIn(BaseModel):
    # The whole conversation, sent by the client. Keeping history off the server
    # means a reply costs no database round trip to reconstruct it, and there is
    # no chat log sitting in the database for someone to read later.
    messages: List[Turn] = Field(min_length=1, max_length=24)
    # Off by default for a genuinely general question: the shop snapshot is
    # cheap but not free, and a question about the weather does not need it.
    include_context: bool = True


@router.get("/status", summary="Is the assistant usable?")
def status(_user: User = Depends(get_current_user)):
    """Lets the UI hide itself rather than offer a chat that cannot answer."""
    return {
        "configured": service.is_configured(),
        "model": settings.GEMINI_MODEL if service.is_configured() else None,
    }


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat", summary="Ask the assistant")
async def chat(
    payload: ChatIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Streams the reply back token by token.

    Errors are sent *inside* the stream as an `error` event rather than as an
    HTTP status, because by the time Google refuses the response has already
    begun and the status line is long gone. The client renders either the same
    way.
    """
    context = service.build_context(db, current_user) if payload.include_context else ""
    history = [turn.model_dump() for turn in payload.messages]

    async def events():
        try:
            async for chunk in service.stream_reply(history, context):
                yield _sse("chunk", {"text": chunk})
            yield _sse("done", {})
        except service.AssistantUnavailable as exc:
            yield _sse("error", {"message": str(exc)})
        except Exception:
            # Never let a stack trace reach a shopkeeper, and never leave the
            # stream hanging open with no explanation.
            logger.exception("Assistant stream failed")
            yield _sse("error", {"message": "Kuch gadbad ho gayi. Dobara try karein."})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Stops nginx buffering the stream into one lump, which would undo
            # the entire point of streaming.
            "X-Accel-Buffering": "no",
        },
    )
