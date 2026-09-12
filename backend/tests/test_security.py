"""Authentication, validation, rate limiting and the audit trail.

These cover the boundary a real deployment is attacked at, and the log that
answers "who changed this" afterwards.
"""

import pytest

from app.core.audit import record
from app.core.rate_limit import SlidingWindowLimiter
from app.core.security import (
    MIN_PASSWORD_LENGTH,
    create_access_token,
    get_password_hash,
    normalise_mobile,
    password_problem,
    verify_password,
)
from app.models.audit import AuditLog


# --- mobile normalisation -------------------------------------------------

@pytest.mark.parametrize("raw,expected", [
    ("9876543210", "9876543210"),
    ("+919876543210", "9876543210"),
    ("919876543210", "9876543210"),
    ("09876543210", "9876543210"),
    ("98765 43210", "9876543210"),
    ("98765-43210", "9876543210"),
])
def test_the_same_number_normalises_to_one_value(raw, expected):
    """Otherwise one person becomes several accounts and their demand splits."""
    assert normalise_mobile(raw) == expected


@pytest.mark.parametrize("raw", [
    "1234567890",   # Indian mobiles do not start below 6
    "987654321",    # too short
    "98765432101",  # too long
    "abcdefghij",
    "",
    None,
])
def test_invalid_numbers_are_rejected(raw):
    assert normalise_mobile(raw) is None


# --- passwords ------------------------------------------------------------

def test_short_passwords_are_refused():
    assert password_problem("a" * (MIN_PASSWORD_LENGTH - 1)) is not None


def test_all_digit_passwords_are_refused():
    """A phone keypad makes an all-numeric password the path of least resistance."""
    assert password_problem("12345678") is not None


def test_a_reasonable_password_is_accepted():
    assert password_problem("paneer2026") is None


def test_hashes_are_salted():
    """Two shops choosing the same password must not share a hash."""
    assert get_password_hash("paneer2026") != get_password_hash("paneer2026")


def test_password_round_trips():
    hashed = get_password_hash("paneer2026")
    assert verify_password("paneer2026", hashed)
    assert not verify_password("paneer2027", hashed)


def test_verifying_against_an_empty_hash_fails_closed():
    """A user row with no password must never authenticate."""
    assert not verify_password("anything", None)
    assert not verify_password("anything", "")


# --- tokens ---------------------------------------------------------------

def test_token_carries_subject_and_expiry():
    from jose import jwt
    from app.core.security import ALGORITHM, SECRET_KEY

    token = create_access_token(subject="user-123")
    claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert claims["sub"] == "user-123"
    assert claims["exp"] > claims["iat"]


def test_a_token_signed_with_another_key_is_rejected():
    from jose import JWTError, jwt
    from app.core.security import ALGORITHM, SECRET_KEY

    forged = jwt.encode({"sub": "user-123"}, "not-the-real-key", algorithm=ALGORITHM)
    with pytest.raises(JWTError):
        jwt.decode(forged, SECRET_KEY, algorithms=[ALGORITHM])


# --- rate limiting --------------------------------------------------------

def test_attempts_are_capped_within_the_window():
    limiter = SlidingWindowLimiter(max_attempts=3, window_seconds=60)
    assert limiter.check("ip") is None
    assert limiter.check("ip") is None
    assert limiter.check("ip") is None
    assert limiter.check("ip") is not None, "fourth attempt should be blocked"


def test_limits_are_per_client():
    limiter = SlidingWindowLimiter(max_attempts=1, window_seconds=60)
    limiter.check("ip-a")
    assert limiter.check("ip-a") is not None
    assert limiter.check("ip-b") is None, "one client must not lock out another"


def test_a_successful_login_clears_the_counter():
    """Shops share connections; one person's typos must not lock out the next."""
    limiter = SlidingWindowLimiter(max_attempts=2, window_seconds=60)
    limiter.check("ip")
    limiter.check("ip")
    assert limiter.check("ip") is not None

    limiter.reset("ip")
    assert limiter.check("ip") is None


def test_the_window_rolls_forward():
    """Old attempts age out instead of counting forever.

    The recorded timestamp is pushed into the past rather than sleeping: the
    clock has ~15ms granularity on Windows, which makes a real short window
    flaky.
    """
    limiter = SlidingWindowLimiter(max_attempts=1, window_seconds=60)
    assert limiter.check("ip") is None
    assert limiter.check("ip") is not None, "second attempt is inside the window"

    limiter._hits["ip"][0] -= 61  # as if that attempt happened over a minute ago
    assert limiter.check("ip") is None, "an elapsed window should free the key"


# --- audit trail ----------------------------------------------------------

def test_an_audit_entry_is_written(db):
    record(db, action="order.accepted", entity_type="order", entity_id="o1",
           actor_id="u1", metadata={"from": "requested"}, commit=True)

    entry = db.query(AuditLog).one()
    assert entry.action == "order.accepted"
    assert entry.entity_id == "o1"
    assert entry.actor_id == "u1"
    assert entry.metadata_json["from"] == "requested"


def test_secrets_are_redacted_from_audit_metadata(db):
    record(db, action="user.registered", entity_type="user", entity_id="u1",
           metadata={"password": "hunter2", "token": "abc", "role": "retailer"},
           commit=True)

    meta = db.query(AuditLog).one().metadata_json
    assert meta["password"] == "[redacted]"
    assert meta["token"] == "[redacted]"
    assert meta["role"] == "retailer", "non-sensitive fields should survive"


def test_a_broken_audit_write_never_breaks_the_caller(db):
    """The action matters more than its log line."""
    record(db, action="x", entity_type="y", entity_id=None, metadata={"a": 1}, commit=True)
