"""One-tap demo access.

The landing page used to open a demo by posting a hardcoded password from the
browser. That worked until the deployed database had not been seeded, at which
point every button reported "Mobile number ya password galat hai" — sending
everyone to look at credentials when the real problem was an empty catalogue.

This endpoint takes a role and no credentials. It can only ever resolve the
three accounts demo_seed creates, and it says plainly when they are missing.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.models.users import User

client = TestClient(app)


@pytest.fixture
def demo_users(db):
    """The three accounts the demo seed creates, without the rest of the corpus."""
    rows = [
        User(id="demo_ret", role="retailer", name="Gupta Kirana", mobile="9000000001"),
        User(id="demo_dist", role="distributor", name="Himachal Dairy", mobile="9100000002"),
        User(id="demo_cust", role="customer", name="Sunita Devi", mobile="9500000001"),
    ]
    db.add_all(rows)
    db.commit()
    return rows


class TestOpeningADemo:
    def test_a_role_is_enough(self, db, demo_users):
        response = client.post("/api/auth/demo", json={"role": "retailer"})

        assert response.status_code == 200
        assert response.json()["access_token"]

    def test_the_token_works_on_the_rest_of_the_api(self, db, demo_users):
        token = client.post("/api/auth/demo", json={"role": "distributor"}).json()["access_token"]

        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert me.status_code == 200
        assert me.json()["role"] == "distributor"

    def test_each_role_opens_its_own_account(self, db, demo_users):
        seen = {}
        for role in ("retailer", "distributor", "customer"):
            token = client.post("/api/auth/demo", json={"role": role}).json()["access_token"]
            seen[role] = client.get(
                "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
            ).json()["role"]

        assert seen == {
            "retailer": "retailer",
            "distributor": "distributor",
            "customer": "customer",
        }

    def test_no_password_travels_anywhere(self, db, demo_users):
        # The point of the endpoint: the browser never holds a credential, so a
        # changed seed password cannot break the button.
        response = client.post("/api/auth/demo", json={"role": "retailer"})

        assert "password" not in response.request.content.decode().lower()
        assert response.status_code == 200

    def test_it_is_not_a_way_into_anyone_else(self, db, demo_users):
        """It resolves a fixed list of three numbers, not an arbitrary account."""
        victim = User(id="real", role="retailer", name="A real shop", mobile="9812345678")
        db.add(victim)
        db.commit()

        # There is no field to name them by; the only input is a role.
        response = client.post("/api/auth/demo", json={"role": "admin"})

        assert response.status_code == 404

    def test_a_closed_account_is_refused(self, db, demo_users):
        user = db.query(User).filter(User.mobile == "9000000001").first()
        user.is_active = False
        db.commit()

        assert client.post("/api/auth/demo", json={"role": "retailer"}).status_code == 400


class TestWhenItCannotWork:
    def test_an_unseeded_database_says_so(self, db):
        """The failure that started this: no demo rows, and the old flow blamed
        the password."""
        response = client.post("/api/auth/demo", json={"role": "retailer"})

        assert response.status_code == 503
        assert "Demo data" in response.json()["detail"]

    def test_it_can_be_switched_off(self, db, demo_users, monkeypatch):
        monkeypatch.setattr(settings, "DEMO_LOGIN_ENABLED", False)

        assert client.post("/api/auth/demo", json={"role": "retailer"}).status_code == 404


class TestStatus:
    def test_it_reports_which_roles_are_ready(self, db, demo_users):
        body = client.get("/api/auth/demo/status").json()

        assert body["enabled"] is True
        assert sorted(body["roles"]) == ["customer", "distributor", "retailer"]

    def test_an_unseeded_database_reports_no_roles(self, db):
        # So the UI can hide the buttons instead of offering three that fail.
        body = client.get("/api/auth/demo/status").json()

        assert body["enabled"] is True
        assert body["roles"] == []

    def test_disabled_reports_disabled(self, db, monkeypatch):
        monkeypatch.setattr(settings, "DEMO_LOGIN_ENABLED", False)

        assert client.get("/api/auth/demo/status").json() == {"enabled": False, "roles": []}
