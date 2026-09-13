"""The consumer storefront and the chotu delivery.

The radius is the feature, so most of these tests are about what the storefront
*refuses*: a shop too far to cycle to, an item someone else just bought, an
order accepted when the shelf has since emptied.
"""

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_retailer, get_current_user
from app.main import app
from app.models.profiles import Location, RetailerProfile
from app.models.retail import ConsumerOrder, CustomerProfile, DeliveryRunner
from app.models.users import User
from app.modules.inventory import service as inventory_service
from app.modules.storefront import service
from app.modules.storefront.router import get_current_customer

client = TestClient(app)

# Palampur market, and a house 400 m away.
SHOP_LAT, SHOP_LON = 32.1109, 76.5363
NEAR_LAT, NEAR_LON = 32.1140, 76.5380
# Baijnath, ~13 km off - a different errand entirely.
FAR_LAT, FAR_LON = 32.0553, 76.6469


@pytest.fixture
def retailer(db, seed_data):
    shop = db.query(RetailerProfile).filter_by(id="ret_ramesh").first()
    location = db.query(Location).filter_by(id=shop.location_id).first()
    location.latitude, location.longitude = SHOP_LAT, SHOP_LON
    db.commit()
    return shop


@pytest.fixture
def shelf(db, retailer):
    """Two lines the shop has chosen to sell online."""
    milk = inventory_service.add_stock(
        db, retailer, product_variant_id="var_milk_500ml",
        quantity=30, unit_cost=22.0, selling_price=28.0,
    )
    paneer = inventory_service.add_stock(
        db, retailer, product_variant_id="var_paneer_200g",
        quantity=8, unit_cost=55.0, selling_price=70.0,
    )
    return {"milk": milk, "paneer": paneer}


@pytest.fixture
def customer(db, retailer):
    user = User(
        id="usr_cust_1", role="customer", name="Sunita",
        mobile="7777777771", password_hash="x",
    )
    db.add(user)
    db.flush()
    profile = CustomerProfile(
        user_id=user.id,
        address_line="Ward 4, Palampur",
        landmark="Peepal tree ke paas",
        latitude=NEAR_LAT, longitude=NEAR_LON,
        location_id=retailer.location_id,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@pytest.fixture
def as_customer(db, customer):
    app.dependency_overrides[get_current_customer] = lambda: customer
    app.dependency_overrides[get_current_user] = (
        lambda: db.query(User).filter_by(id="usr_cust_1").first()
    )
    yield
    app.dependency_overrides.pop(get_current_customer, None)


@pytest.fixture
def as_shop(db, retailer):
    app.dependency_overrides[get_current_retailer] = lambda: retailer
    app.dependency_overrides[get_current_user] = (
        lambda: db.query(User).filter_by(id="usr_ret_1").first()
    )
    yield


class TestFindingShops:
    def test_a_shop_within_cycling_distance_is_listed(self, db, customer, shelf):
        shops = service.nearby_shops(db, customer)

        assert len(shops) == 1
        assert shops[0]["distanceKm"] < 1
        assert shops[0]["itemsAvailable"] == 2

    def test_a_shop_beyond_the_radius_is_not_offered(self, db, customer, shelf):
        customer.latitude, customer.longitude = FAR_LAT, FAR_LON
        customer.location_id = None
        db.commit()

        assert service.nearby_shops(db, customer) == []

    def test_a_shop_with_nothing_listed_online_is_not_offered(self, db, customer, shelf):
        for row in shelf.values():
            row.is_listed_online = False
        db.commit()

        assert service.nearby_shops(db, customer) == []

    def test_an_ungeocoded_shop_is_reachable_within_the_same_area(self, db, customer, shelf, retailer):
        """A village shop nobody mapped still serves its own neighbours."""
        location = db.query(Location).filter_by(id=retailer.location_id).first()
        location.latitude = location.longitude = None
        customer.latitude = customer.longitude = None
        db.commit()

        shops = service.nearby_shops(db, customer)
        assert len(shops) == 1
        assert shops[0]["distanceLabel"] == "Aapke area mein"

    def test_the_catalogue_shows_only_what_is_in_stock(self, db, customer, shelf):
        shelf["paneer"].quantity = 0
        db.commit()

        catalogue = service.shop_catalogue(db, shelf["milk"].retailer_id)
        assert [i["name"] for i in catalogue["items"]] == ["Milk"]


class TestPlacingAnOrder:
    def test_an_order_prices_from_the_shelf(self, db, customer, shelf):
        order = service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 2},
        ])

        assert order.total == 56.0
        assert order.status == "placed"
        assert order.order_number.startswith("NXD-")

    def test_the_delivery_address_is_snapshotted(self, db, customer, shelf):
        """A later profile edit must not rewrite where a past order went."""
        order = service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 1},
        ])
        customer.address_line = "Somewhere else entirely"
        db.commit()

        assert order.delivery_address == "Ward 4, Palampur"

    def test_placing_does_not_yet_touch_the_shelf(self, db, customer, shelf):
        """Anyone could otherwise empty a shop with orders they never pay for."""
        service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 5},
        ])

        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 30

    def test_ordering_more_than_the_shop_has_is_refused(self, db, customer, shelf):
        with pytest.raises(Exception) as exc:
            service.place_order(db, customer, shelf["paneer"].retailer_id, [
                {"inventory_id": shelf["paneer"].id, "quantity": 99},
            ])
        assert exc.value.status_code == 409

    def test_ordering_from_too_far_away_is_refused_with_the_reason(self, db, customer, shelf):
        customer.latitude, customer.longitude = FAR_LAT, FAR_LON
        db.commit()

        with pytest.raises(Exception) as exc:
            service.place_order(db, customer, shelf["milk"].retailer_id, [
                {"inventory_id": shelf["milk"].id, "quantity": 1},
            ])

        assert exc.value.status_code == 400
        assert "cycle" in exc.value.detail

    def test_an_item_not_listed_online_cannot_be_ordered(self, db, customer, shelf):
        shelf["milk"].is_listed_online = False
        db.commit()

        with pytest.raises(Exception) as exc:
            service.place_order(db, customer, shelf["milk"].retailer_id, [
                {"inventory_id": shelf["milk"].id, "quantity": 1},
            ])
        assert exc.value.status_code == 400

    def test_an_item_from_another_shop_cannot_be_added(self, db, customer, shelf, retailer):
        """Given in the same area, so the radius check is not what refuses it."""
        other = RetailerProfile(
            id="ret_other", user_id=None, business_name="Doosri Dukaan",
            location_id=retailer.location_id,
        )
        db.add(other)
        db.commit()

        with pytest.raises(Exception) as exc:
            service.place_order(db, customer, other.id, [
                {"inventory_id": shelf["milk"].id, "quantity": 1},
            ])
        assert exc.value.status_code == 404
        assert "is dukaan mein nahi" in exc.value.detail

    def test_an_empty_order_is_refused(self, db, customer, shelf):
        with pytest.raises(Exception):
            service.place_order(db, customer, shelf["milk"].retailer_id, [])


class TestFulfilment:
    def test_accepting_takes_the_stock_off_the_shelf(self, db, customer, shelf):
        order = service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 4},
        ])

        service.update_status(db, order, "accepted")

        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 26

    def test_an_online_sale_lands_in_the_same_ledger_as_the_counter(self, db, customer, shelf):
        """The day's sales must be one number, not three."""
        order = service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 3},
        ])
        service.update_status(db, order, "accepted")

        ledger = inventory_service.movements(db, shelf["milk"].retailer_id)
        assert any(m["reason"] == "sale_online" and m["quantityDelta"] == -3 for m in ledger)

    def test_cancelling_after_acceptance_puts_the_stock_back(self, db, customer, shelf):
        order = service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 4},
        ])
        service.update_status(db, order, "accepted")
        service.update_status(db, order, "cancelled", reason="Customer nahi mila")

        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 30

    def test_cancelling_before_acceptance_returns_nothing(self, db, customer, shelf):
        order = service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 4},
        ])
        service.update_status(db, order, "cancelled")

        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 30

    def test_accepting_is_refused_if_the_counter_sold_it_first(self, db, customer, shelf):
        """A walk-in customer and the app draw down the same milk."""
        order = service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 10},
        ])
        inventory_service.consume_stock(db, shelf["milk"], 25, "sale_counter")

        with pytest.raises(Exception) as exc:
            service.update_status(db, order, "accepted")
        assert exc.value.status_code == 409

    def test_an_illegal_transition_is_refused(self, db, customer, shelf):
        order = service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 1},
        ])

        with pytest.raises(Exception) as exc:
            service.update_status(db, order, "delivered")
        assert exc.value.status_code == 400

    def test_dispatch_needs_somebody_to_carry_it(self, db, customer, shelf):
        order = service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 1},
        ])
        service.update_status(db, order, "accepted")

        with pytest.raises(Exception) as exc:
            service.update_status(db, order, "out_for_delivery")
        assert "assign" in exc.value.detail

    def test_the_full_run_from_placed_to_delivered(self, db, customer, shelf, retailer):
        runner = DeliveryRunner(retailer_id=retailer.id, name="Chotu", mode="cycle")
        db.add(runner)
        db.commit()

        order = service.place_order(db, customer, retailer.id, [
            {"inventory_id": shelf["milk"].id, "quantity": 2},
        ])
        service.update_status(db, order, "accepted")
        service.update_status(db, order, "out_for_delivery", runner_id=runner.id)
        service.update_status(db, order, "delivered")

        assert order.status == "delivered"
        assert order.delivered_at is not None
        db.refresh(shelf["milk"])
        assert shelf["milk"].quantity == 28

    def test_a_runner_from_another_shop_cannot_be_assigned(self, db, customer, shelf, seed_data):
        other = RetailerProfile(id="ret_other2", user_id=None, business_name="Doosri")
        db.add(other)
        db.flush()
        runner = DeliveryRunner(retailer_id=other.id, name="Someone else")
        db.add(runner)
        db.commit()

        order = service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 1},
        ])
        service.update_status(db, order, "accepted")

        with pytest.raises(Exception) as exc:
            service.update_status(db, order, "out_for_delivery", runner_id=runner.id)
        assert exc.value.status_code == 404


class TestStorefrontApi:
    def test_a_customer_sees_nearby_shops(self, db, customer, shelf, as_customer):
        response = client.get("/api/storefront/shops")
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_a_customer_places_and_tracks_an_order(self, db, customer, shelf, as_customer):
        placed = client.post("/api/storefront/orders", json={
            "shop_id": shelf["milk"].retailer_id,
            "items": [{"inventory_id": shelf["milk"].id, "quantity": 2}],
            "note": "Gate par de dena",
        })

        assert placed.status_code == 201
        order_id = placed.json()["id"]
        assert client.get(f"/api/storefront/orders/{order_id}").status_code == 200

    def test_a_customer_cannot_read_another_household_order(self, db, customer, shelf, as_customer, retailer):
        other_user = User(id="usr_cust_2", role="customer", name="Anya", mobile="7777777772", password_hash="x")
        db.add(other_user)
        db.flush()
        other = CustomerProfile(user_id=other_user.id, location_id=retailer.location_id)
        db.add(other)
        db.commit()
        order = service.place_order(db, other, retailer.id, [
            {"inventory_id": shelf["milk"].id, "quantity": 1},
        ])

        assert client.get(f"/api/storefront/orders/{order.id}").status_code == 404

    def test_the_shop_sees_the_order_with_a_number_to_call(self, db, customer, shelf, as_shop):
        service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 1},
        ])

        response = client.get("/api/storefront/shop/orders")

        assert response.status_code == 200
        assert response.json()[0]["customer"]["mobile"] == "7777777771"

    def test_the_shop_moves_the_order_along(self, db, customer, shelf, as_shop):
        order = service.place_order(db, customer, shelf["milk"].retailer_id, [
            {"inventory_id": shelf["milk"].id, "quantity": 2},
        ])

        response = client.patch(
            f"/api/storefront/shop/orders/{order.id}/status", json={"status": "accepted"},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "accepted"

    def test_a_shop_cannot_touch_another_shop_order(self, db, customer, shelf, as_shop, retailer, seed_data):
        other = RetailerProfile(id="ret_other3", user_id=None, business_name="Teesri")
        db.add(other)
        db.commit()
        order = service.place_order(db, customer, retailer.id, [
            {"inventory_id": shelf["milk"].id, "quantity": 1},
        ])
        order.retailer_id = other.id
        db.commit()

        response = client.patch(
            f"/api/storefront/shop/orders/{order.id}/status", json={"status": "accepted"},
        )
        assert response.status_code == 404

    def test_runners_can_be_added_and_retired(self, db, retailer, as_shop):
        created = client.post("/api/storefront/shop/runners", json={
            "name": "Chotu", "mobile": "9000000009", "mode": "cycle",
        })
        assert created.status_code == 201
        runner_id = created.json()["id"]

        assert client.delete(f"/api/storefront/shop/runners/{runner_id}").status_code == 204
        # Deactivated rather than deleted: past orders still reference them.
        assert db.query(DeliveryRunner).filter_by(id=runner_id).first().is_active is False
