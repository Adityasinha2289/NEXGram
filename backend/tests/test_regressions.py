"""Regressions for bugs that took a whole screen down.

Each test here stands in for a failure that reached the browser as a blank page
or an empty list, because nothing in the suite exercised the path.
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_retailer, get_current_user
from app.main import app
from app.models.commerce import Order, OrderItem
from app.models.profiles import RetailerProfile
from app.models.users import User
from app.modules.intelligence.services import dashboard as dashboard_service
from app.modules.profiles import schemas as profile_schemas
from app.modules.profiles import service as profiles_service

client = TestClient(app)


@pytest.fixture
def as_retailer(db):
    """Signs the request in as the seeded retailer."""
    app.dependency_overrides[get_current_retailer] = (
        lambda: db.query(RetailerProfile).filter_by(id="ret_ramesh").first()
    )
    app.dependency_overrides[get_current_user] = (
        lambda: db.query(User).filter_by(id="usr_ret_1").first()
    )
    yield


def _completed_order(db, seed_data, *, days_ago: int, order_id: str):
    """One completed order, dated in the past, for the seeded retailer."""
    retailer = seed_data["profs"]["ret_1"]
    distributor = seed_data["profs"]["dist_1"]
    listing = seed_data["catalogue"]["cat_paneer_sharma"]

    order = Order(
        id=order_id,
        order_number=f"NEX-TEST-{order_id}",
        retailer_id=retailer.id,
        distributor_id=distributor.id,
        status="completed",
        subtotal=500.0,
        total=500.0,
        # Naive, the way SQLite hands timestamps back.
        created_at=datetime.utcnow() - timedelta(days=days_ago),
    )
    db.add(order)
    db.flush()
    db.add(OrderItem(
        order_id=order.id,
        catalogue_item_id=listing.id,
        product_id=listing.product_id,
        product_variant_id=listing.product_variant_id,
        quantity=10,
        unit_price=50.0,
        line_total=500.0,
    ))
    db.commit()
    return order


class TestReorderTimezones:
    """`now` was offset-aware while the stored timestamps were not.

    Subtracting them raised TypeError, so /intelligence/reorder, the retailer
    dashboard and /intelligence/alerts all answered 500 for any shop that had
    ever completed an order - which is every real shop.
    """

    def test_reorder_list_builds_with_order_history(self, db, seed_data):
        _completed_order(db, seed_data, days_ago=30, order_id="ord_tz_1")
        retailer = db.query(RetailerProfile).filter_by(id="ret_ramesh").first()

        items = dashboard_service.build_reorder_list(db, retailer)

        assert len(items) == 1
        assert items[0]["name"] == "Paneer"
        assert items[0]["daysAgo"] == 30

    def test_reorder_endpoint_answers_200(self, db, seed_data, as_retailer):
        _completed_order(db, seed_data, days_ago=12, order_id="ord_tz_2")

        response = client.get("/api/intelligence/reorder")

        assert response.status_code == 200
        assert response.json()[0]["productId"]

    def test_retailer_dashboard_answers_200(self, db, seed_data, as_retailer):
        _completed_order(db, seed_data, days_ago=5, order_id="ord_tz_3")

        response = client.get("/api/intelligence/dashboard/retailer")

        assert response.status_code == 200
        assert response.json()["reorderItems"][0]["name"] == "Paneer"

    def test_alerts_answer_200(self, db, seed_data, as_retailer):
        _completed_order(db, seed_data, days_ago=5, order_id="ord_tz_4")

        response = client.get("/api/intelligence/alerts")

        assert response.status_code == 200

    def test_naive_accepts_an_aware_value(self):
        """Postgres returns aware datetimes where SQLite returns naive ones."""
        aware = datetime(2026, 1, 1, tzinfo=timezone.utc)

        assert dashboard_service.naive(aware).tzinfo is None
        assert dashboard_service.naive(None) is None
        assert dashboard_service.naive("2026-01-01T00:00:00") == datetime(2026, 1, 1)


class TestProductSuppliers:
    """The supplier list read a Location column that does not exist.

    `village_name` raised AttributeError, so the whole supplier-comparison
    screen answered 500 for every product.
    """

    def test_suppliers_endpoint_answers_200(self, seed_data):
        product_id = seed_data["catalogue"]["cat_paneer_sharma"].product_id

        response = client.get(f"/api/products/{product_id}/suppliers")

        assert response.status_code == 200
        assert response.json()["offers"], "a seeded product should have offers"

    def test_offer_carries_a_readable_location(self, seed_data):
        product_id = seed_data["catalogue"]["cat_paneer_sharma"].product_id

        offer = client.get(f"/api/products/{product_id}/suppliers").json()["offers"][0]

        # Whatever the row has, never a raw None and never an attribute error.
        assert offer["distributor_location"] is None or isinstance(
            offer["distributor_location"], str
        )


class TestUnmetNeedsMerge:
    """Editing the profile used to delete every demand report the shop filed.

    The profile form submits only {categories, other}; assigning that payload
    over the stored value dropped the `reports` list that Demand Batao appends
    to, taking the shop's whole demand history with it.
    """

    def test_reports_survive_a_profile_edit(self, db, seed_data):
        user = db.query(User).filter_by(id="usr_ret_1").first()
        profile = db.query(RetailerProfile).filter_by(id="ret_ramesh").first()
        profile.unmet_needs = {
            "categories": ["Dairy"],
            "other": "paneer nahi milta",
            "reports": [{"product": "Paneer", "note": "roz maangte hain"}],
        }
        db.commit()

        profiles_service.update_retailer_profile(
            db, user, profile,
            profile_schemas.RetailerProfileUpdate(
                unmet_needs={"categories": ["Dairy", "Staples"], "other": "ghee bhi"},
            ),
        )

        assert profile.unmet_needs["reports"] == [
            {"product": "Paneer", "note": "roz maangte hain"}
        ]
        # The fields the form did edit still take effect.
        assert profile.unmet_needs["categories"] == ["Dairy", "Staples"]
        assert profile.unmet_needs["other"] == "ghee bhi"

    def test_an_explicit_reports_list_still_wins(self, db, seed_data):
        user = db.query(User).filter_by(id="usr_ret_1").first()
        profile = db.query(RetailerProfile).filter_by(id="ret_ramesh").first()
        profile.unmet_needs = {"reports": [{"product": "Paneer"}]}
        db.commit()

        profiles_service.update_retailer_profile(
            db, user, profile,
            profile_schemas.RetailerProfileUpdate(unmet_needs={"reports": []}),
        )

        assert profile.unmet_needs["reports"] == []
