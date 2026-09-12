"""Password recovery.

Anything that can replace a password is worth testing as hard as the password
itself, so these cover the leak paths as well as the happy one: account
enumeration, replay, expiry, and codes crossing between accounts.
"""

from datetime import datetime, timedelta

import pytest

from app.core import notifications
from app.core.security import get_password_hash, verify_password
from app.models.auth_tokens import PasswordResetToken
from app.models.users import User
from app.modules.auth import password_reset


@pytest.fixture(autouse=True)
def silent_notifications():
    """Keeps reset codes out of the test output."""
    notifications.set_channel(notifications.NullChannel())
    yield
    notifications.set_channel(notifications.ConsoleChannel())


@pytest.fixture
def user(db):
    account = User(
        id="u1", role="retailer", name="Shop Owner",
        mobile="9000000001", password_hash=get_password_hash("original123"),
        is_active=True,
    )
    db.add(account)
    db.commit()
    return account


def issue_code(db, monkeypatch, code="123456"):
    """Pins the generated code so a test can use it."""
    monkeypatch.setattr(password_reset.secrets, "randbelow", lambda _n: int(code))
    password_reset.request_reset(db, "9000000001", ip="1.2.3.4")
    return code


# --- no account enumeration ----------------------------------------------

def test_an_unregistered_number_creates_no_token(db):
    password_reset.request_reset(db, "9999999999")
    assert db.query(PasswordResetToken).count() == 0


def test_an_invalid_number_creates_no_token(db):
    password_reset.request_reset(db, "not-a-number")
    assert db.query(PasswordResetToken).count() == 0


def test_requesting_never_reveals_whether_the_account_exists(db, user):
    """Both calls return None; the caller cannot tell them apart."""
    assert password_reset.request_reset(db, "9000000001") is None
    assert password_reset.request_reset(db, "9999999999") is None


# --- the code itself ------------------------------------------------------

def test_only_a_hash_of_the_code_is_stored(db, user, monkeypatch):
    code = issue_code(db, monkeypatch)
    stored = db.query(PasswordResetToken).one()
    assert stored.token_hash != code
    assert code not in stored.token_hash


def test_a_valid_code_sets_the_new_password(db, user, monkeypatch):
    code = issue_code(db, monkeypatch)

    ok, error = password_reset.confirm_reset(db, "9000000001", code, "brandnew123")
    assert ok, error

    db.refresh(user)
    assert verify_password("brandnew123", user.password_hash)
    assert not verify_password("original123", user.password_hash)


def test_a_code_cannot_be_used_twice(db, user, monkeypatch):
    code = issue_code(db, monkeypatch)
    assert password_reset.confirm_reset(db, "9000000001", code, "brandnew123")[0]

    ok, error = password_reset.confirm_reset(db, "9000000001", code, "another123")
    assert not ok
    assert "galat" in error


def test_a_wrong_code_is_rejected(db, user, monkeypatch):
    issue_code(db, monkeypatch, code="123456")

    ok, _ = password_reset.confirm_reset(db, "9000000001", "654321", "brandnew123")
    assert not ok
    db.refresh(user)
    assert verify_password("original123", user.password_hash), "password must be untouched"


def test_an_expired_code_is_rejected(db, user, monkeypatch):
    code = issue_code(db, monkeypatch)
    token = db.query(PasswordResetToken).one()
    token.expires_at = datetime.utcnow() - timedelta(minutes=1)
    db.commit()

    ok, error = password_reset.confirm_reset(db, "9000000001", code, "brandnew123")
    assert not ok
    assert "expire" in error


def test_requesting_again_invalidates_the_previous_code(db, user, monkeypatch):
    """A code glimpsed over someone's shoulder should not stay live."""
    first = issue_code(db, monkeypatch, code="111111")
    issue_code(db, monkeypatch, code="222222")

    assert not password_reset.confirm_reset(db, "9000000001", first, "brandnew123")[0]
    assert password_reset.confirm_reset(db, "9000000001", "222222", "brandnew123")[0]


def test_a_code_does_not_work_for_another_account(db, user, monkeypatch):
    other = User(id="u2", role="retailer", name="Other", mobile="9000000002",
                 password_hash=get_password_hash("original123"), is_active=True)
    db.add(other)
    db.commit()

    code = issue_code(db, monkeypatch)
    ok, _ = password_reset.confirm_reset(db, "9000000002", code, "brandnew123")
    assert not ok

    db.refresh(other)
    assert verify_password("original123", other.password_hash)


def test_a_weak_new_password_is_refused(db, user, monkeypatch):
    code = issue_code(db, monkeypatch)

    ok, error = password_reset.confirm_reset(db, "9000000001", code, "short")
    assert not ok
    assert "characters" in error

    # And the code survives, so an honest mistake does not cost a second request.
    assert password_reset.confirm_reset(db, "9000000001", code, "goodpassword1")[0]


def test_a_deactivated_account_cannot_be_reset(db, user):
    user.is_active = False
    db.commit()

    password_reset.request_reset(db, "9000000001")
    assert db.query(PasswordResetToken).count() == 0


# --- changing a password while signed in ----------------------------------

def test_changing_a_password_requires_the_current_one(db, user):
    ok, error = password_reset.change_password(db, user, "wrong", "brandnew123")
    assert not ok
    assert "galat" in error

    db.refresh(user)
    assert verify_password("original123", user.password_hash)


def test_changing_a_password_works_with_the_current_one(db, user):
    ok, error = password_reset.change_password(db, user, "original123", "brandnew123")
    assert ok, error

    db.refresh(user)
    assert verify_password("brandnew123", user.password_hash)


def test_a_weak_replacement_is_refused(db, user):
    ok, error = password_reset.change_password(db, user, "original123", "1234")
    assert not ok
    assert error
