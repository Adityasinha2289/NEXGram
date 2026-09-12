"""Audit trail for state-changing actions.

The `audit_logs` table has existed since the initial schema and nothing ever
wrote to it. For a commerce app that is a real gap: when a distributor says "I
never rejected that order" or stock disappears, the only honest answer comes
from a log that records who did what to which row, and when.

Rules this follows:
  - Never raises. An audit write must not be able to fail a user's action.
  - Never records credentials or password hashes.
  - Writes in the caller's session so it commits atomically with the change it
    describes: a logged action that was rolled back would be a lie.
"""

import logging
import uuid
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.audit import AuditLog

logger = logging.getLogger("nexgram.audit")

# Anything matching these is dropped from recorded metadata.
_REDACT = ("password", "token", "secret", "hash", "authorization")


def _clean(payload: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not payload:
        return None
    return {
        key: ("[redacted]" if any(word in key.lower() for word in _REDACT) else value)
        for key, value in payload.items()
    }


def record(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: str,
    actor_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    commit: bool = False,
) -> None:
    """Appends one audit entry.

    By default it only stages the row: the caller commits it along with the
    change itself. Pass commit=True when there is no surrounding transaction.
    """
    try:
        db.add(AuditLog(
            id=str(uuid.uuid4()),
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            metadata_json=_clean(metadata),
        ))
        if commit:
            db.commit()
    except Exception:
        # Losing an audit line is bad; losing the user's order because of it is
        # worse. Log loudly and carry on.
        logger.exception("Failed to record audit entry: %s on %s %s", action, entity_type, entity_id)
