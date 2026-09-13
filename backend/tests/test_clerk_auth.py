"""Clerk as the identity provider.

Clerk is never actually called. A real RSA keypair is generated here and served
as a fake JWKS, so the signature check, the issuer check and the `azp` check are
genuinely exercised rather than mocked past — those three are the entire trust
boundary, and a test that stubs them proves nothing.

The account-linking tests are the other half: matching a Clerk identity to an
existing shop on an unverified phone number would be an account takeover, so
that path is tested from the attacker's side too.
"""

import json
import time

import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import settings
from app.core.security import get_password_hash
from app.main import app
from app.models.users import User
from app.modules.auth import clerk

client = TestClient(app)

ISSUER = "https://test-instance.clerk.accounts.dev"
KID = "test-key-1"


@pytest.fixture(scope="module")
def keypair():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    public_pem = key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    return private_pem, public_pem


@pytest.fixture
def clerk_configured(keypair, monkeypatch):
    """A configured Clerk whose signing keys are the test keypair."""
    _, public_pem = keypair
    monkeypatch.setattr(settings, "CLERK_SECRET_KEY", "sk_test_fake")
    monkeypatch.setattr(settings, "CLERK_ISSUER", ISSUER)
    monkeypatch.setattr(settings, "CLERK_AUTHORIZED_PARTIES", "")

    from jose import jwk

    jwk_dict = jwk.construct(public_pem, "RS256").to_dict()
    # to_dict() returns bytes for the big integers; JWKS is JSON.
    jwk_dict = {
        k: (v.decode() if isinstance(v, bytes) else v) for k, v in jwk_dict.items()
    }
    jwk_dict.update({"kid": KID, "use": "sig", "alg": "RS256"})

    monkeypatch.setattr(clerk, "_jwks", {"keys": [jwk_dict]})
    monkeypatch.setattr(clerk, "_jwks_fetched_at", time.monotonic())
    yield
    clerk.reset_cache()


def make_token(keypair, *, sub="user_clerk_1", issuer=ISSUER, expires_in=60, **extra):
    private_pem, _ = keypair
    now = int(time.time())
    claims = {
        "sub": sub,
        "iss": issuer,
        "iat": now,
        "nbf": now - 1,
        "exp": now + expires_in,
        "sid": "sess_1",
        **extra,
    }
    return jwt.encode(claims, private_pem, algorithm="RS256", headers={"kid": KID})


def clerk_user_body(**overrides):
    """Clerk's /v1/users/{id} shape, verified unless a test says otherwise."""
    body = {
        "id": "user_clerk_1",
        "first_name": "Ramesh",
        "last_name": "Kumar",
        "primary_phone_number_id": "idn_phone",
        "phone_numbers": [
            {
                "id": "idn_phone",
                "phone_number": "+919000000123",
                "verification": {"status": "verified"},
            }
        ],
        "primary_email_address_id": None,
        "email_addresses": [],
    }
    body.update(overrides)
    return body


def mock_clerk_api(monkeypatch, body, status_code=200):
    """Answers the Backend API user lookup without leaving the process."""
    def handler(request):
        return httpx.Response(status_code, json=body)

    real_client = httpx.Client
    transport = httpx.MockTransport(handler)

    def fake_client(*args, **kwargs):
        kwargs["transport"] = transport
        return real_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "Client", fake_client)


class TestConfiguration:
    def test_reports_itself_unconfigured_without_a_key(self, monkeypatch):
        monkeypatch.setattr(settings, "CLERK_SECRET_KEY", "")
        assert clerk.is_configured() is False

    def test_the_status_endpoint_lets_the_ui_hide_the_button(self, db, monkeypatch):
        monkeypatch.setattr(settings, "CLERK_SECRET_KEY", "")
        assert client.get("/api/auth/clerk/status").json() == {"configured": False}

    def test_the_issuer_can_be_recovered_from_a_publishable_key(self, monkeypatch):
        # pk_test_<base64 of "host$">, which is how Clerk encodes it.
        monkeypatch.setattr(settings, "CLERK_ISSUER", "")
        monkeypatch.setattr(
            settings,
            "CLERK_PUBLISHABLE_KEY",
            "pk_test_dGVzdC1pbnN0YW5jZS5jbGVyay5hY2NvdW50cy5kZXYk",
        )
        assert clerk.issuer() == ISSUER

    def test_a_junk_publishable_key_yields_no_issuer(self, monkeypatch):
        monkeypatch.setattr(settings, "CLERK_ISSUER", "")
        monkeypatch.setattr(settings, "CLERK_PUBLISHABLE_KEY", "pk_test_!!!!not-base64")
        assert clerk.issuer() == ""


class TestTokenVerification:
    def test_a_properly_signed_token_verifies(self, clerk_configured, keypair):
        claims = clerk.verify_token(make_token(keypair))
        assert claims["sub"] == "user_clerk_1"

    def test_a_token_signed_by_someone_else_is_refused(self, clerk_configured):
        other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        pem = other.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()
        now = int(time.time())
        forged = jwt.encode(
            {"sub": "attacker", "iss": ISSUER, "exp": now + 60, "iat": now},
            pem,
            algorithm="RS256",
            headers={"kid": KID},
        )

        with pytest.raises(clerk.ClerkError):
            clerk.verify_token(forged)

    def test_an_expired_token_is_refused(self, clerk_configured, keypair):
        with pytest.raises(clerk.ClerkError):
            clerk.verify_token(make_token(keypair, expires_in=-120))

    def test_a_token_from_another_clerk_instance_is_refused(self, clerk_configured, keypair):
        # Same signing key, different issuer: this is what a token minted by a
        # neighbouring tenant would look like.
        with pytest.raises(clerk.ClerkError):
            clerk.verify_token(make_token(keypair, issuer="https://evil.clerk.accounts.dev"))

    def test_a_token_minted_for_another_site_is_refused(
        self, clerk_configured, keypair, monkeypatch
    ):
        monkeypatch.setattr(
            settings, "CLERK_AUTHORIZED_PARTIES", "https://nexgram.example"
        )

        with pytest.raises(clerk.ClerkError):
            clerk.verify_token(make_token(keypair, azp="https://someone-else.example"))

    def test_the_expected_party_is_allowed_through(
        self, clerk_configured, keypair, monkeypatch
    ):
        monkeypatch.setattr(
            settings, "CLERK_AUTHORIZED_PARTIES", "https://nexgram.example"
        )

        claims = clerk.verify_token(make_token(keypair, azp="https://nexgram.example"))
        assert claims["sub"] == "user_clerk_1"

    def test_garbage_is_refused_without_crashing(self, clerk_configured):
        with pytest.raises(clerk.ClerkError):
            clerk.verify_token("not.a.token")


class TestIdentityExtraction:
    def test_a_jwt_template_saves_the_round_trip(self, clerk_configured, keypair):
        token = make_token(keypair, phone_number="+919000000123", name="Ramesh Kumar")

        identity = clerk.identify(token)

        assert identity.mobile == "9000000123"
        assert identity.clerk_user_id == "user_clerk_1"

    def test_without_a_template_it_asks_the_backend_api(
        self, clerk_configured, keypair, monkeypatch
    ):
        mock_clerk_api(monkeypatch, clerk_user_body())

        identity = clerk.identify(make_token(keypair))

        assert identity.mobile == "9000000123"
        assert identity.name == "Ramesh Kumar"

    def test_an_unverified_number_is_dropped(self, clerk_configured, keypair, monkeypatch):
        # The whole reason the linking below is safe.
        mock_clerk_api(
            monkeypatch,
            clerk_user_body(
                phone_numbers=[
                    {
                        "id": "idn_phone",
                        "phone_number": "+919000000123",
                        "verification": {"status": "unverified"},
                    }
                ]
            ),
        )

        identity = clerk.identify(make_token(keypair))

        assert identity.mobile is None

    def test_a_bad_secret_key_says_which_setting_to_fix(
        self, clerk_configured, keypair, monkeypatch
    ):
        mock_clerk_api(monkeypatch, {"errors": []}, status_code=401)

        with pytest.raises(clerk.ClerkError) as exc:
            clerk.identify(make_token(keypair))

        assert "CLERK_SECRET_KEY" in str(exc.value)


class TestExchange:
    def test_it_hands_back_a_working_nexgram_session(
        self, db, clerk_configured, keypair, monkeypatch
    ):
        mock_clerk_api(monkeypatch, clerk_user_body())

        response = client.post(
            "/api/auth/clerk",
            json={"token": make_token(keypair), "role": "retailer"},
        )

        assert response.status_code == 200
        token = response.json()["access_token"]
        # The returned token is this app's own, and the rest of the API takes it.
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["role"] == "retailer"

    def test_a_new_identity_gets_an_account_and_a_profile(
        self, db, clerk_configured, keypair, monkeypatch
    ):
        mock_clerk_api(monkeypatch, clerk_user_body())

        client.post(
            "/api/auth/clerk",
            json={"token": make_token(keypair), "role": "distributor"},
        )

        user = db.query(User).filter(User.clerk_user_id == "user_clerk_1").first()
        assert user is not None
        assert user.role == "distributor"
        assert user.password_hash is None

    def test_signing_in_twice_does_not_make_two_accounts(
        self, db, clerk_configured, keypair, monkeypatch
    ):
        mock_clerk_api(monkeypatch, clerk_user_body())

        client.post("/api/auth/clerk", json={"token": make_token(keypair)})
        client.post("/api/auth/clerk", json={"token": make_token(keypair)})

        assert db.query(User).filter(User.clerk_user_id == "user_clerk_1").count() == 1

    def test_an_existing_shop_keeps_its_role_and_its_data(
        self, db, clerk_configured, keypair, monkeypatch
    ):
        """The point of matching: a password account and a Clerk sign-in on the
        same verified number are one shopkeeper, not two."""
        existing = User(
            name="Ramesh Kumar",
            mobile="9000000123",
            role="distributor",
            password_hash=get_password_hash("something-old"),
        )
        db.add(existing)
        db.commit()
        mock_clerk_api(monkeypatch, clerk_user_body())

        response = client.post(
            # Arriving through the retailer door must not demote a distributor.
            "/api/auth/clerk",
            json={"token": make_token(keypair), "role": "retailer"},
        )

        assert response.status_code == 200
        db.refresh(existing)
        assert existing.clerk_user_id == "user_clerk_1"
        assert existing.role == "distributor"

    def test_an_unverified_number_cannot_claim_an_existing_shop(
        self, db, clerk_configured, keypair, monkeypatch
    ):
        """The takeover this guards against: signing up in Clerk with somebody
        else's mobile and inheriting their shop."""
        victim = User(
            name="Gupta Kirana",
            mobile="9000000123",
            role="retailer",
            password_hash=get_password_hash("victim-password"),
        )
        db.add(victim)
        db.commit()
        mock_clerk_api(
            monkeypatch,
            clerk_user_body(
                id="user_attacker",
                phone_numbers=[
                    {
                        "id": "idn_phone",
                        "phone_number": "+919000000123",
                        "verification": {"status": "unverified"},
                    }
                ],
            ),
        )

        response = client.post(
            "/api/auth/clerk",
            json={"token": make_token(keypair, sub="user_attacker")},
        )

        assert response.status_code == 400
        db.refresh(victim)
        assert victim.clerk_user_id is None

    def test_a_second_clerk_identity_cannot_steal_a_linked_account(
        self, db, clerk_configured, keypair, monkeypatch
    ):
        linked = User(
            name="Gupta Kirana",
            mobile="9000000123",
            role="retailer",
            clerk_user_id="user_original",
        )
        db.add(linked)
        db.commit()
        mock_clerk_api(monkeypatch, clerk_user_body(id="user_second"))

        response = client.post(
            "/api/auth/clerk",
            json={"token": make_token(keypair, sub="user_second")},
        )

        assert response.status_code == 409
        db.refresh(linked)
        assert linked.clerk_user_id == "user_original"

    def test_a_forged_token_is_refused_by_the_endpoint(self, db, clerk_configured):
        response = client.post("/api/auth/clerk", json={"token": "not.a.real.token"})
        assert response.status_code == 401

    def test_it_refuses_when_clerk_is_not_configured(self, db, monkeypatch):
        monkeypatch.setattr(settings, "CLERK_SECRET_KEY", "")

        response = client.post("/api/auth/clerk", json={"token": "anything"})

        assert response.status_code == 401
        assert "CLERK_SECRET_KEY" in response.json()["detail"]


class TestNothingElseChanged:
    def test_mobile_and_password_still_works(self, db, seed_data):
        # Clerk is additive. The accounts that existed before it still sign in
        # the way they always did, with no Clerk instance configured at all.
        response = client.post(
            "/api/auth/login",
            data={"username": "8888888881", "password": "password123"},
        )
        assert response.status_code == 200
        assert response.json()["access_token"]
