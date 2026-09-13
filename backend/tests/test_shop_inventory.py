"""The shop's own shelf: batches, expiry, and the movement ledger."""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_retailer, get_current_user
from app.main import app
from app.models.profiles import RetailerProfile
from app.models.retail import InventoryBatch, RetailerInventory, StockMovement
from app.models.users import User
from app.modules.inventory import service

client = TestClient(app)


@pytest.fixture(autouse=True)
def signed_in(db):
    app.dependency_overrides[get_current_retailer] = (
        lambda: db.query(RetailerProfile).filter_by(id="ret_ramesh").first()
    )
    app.dependency_overrides[get_current_user] = (
        lambda: db.query(User).filter_by(id="usr_ret_1").first()
    )
    yield


@pytest.fixture
def retailer(db, seed_data):
    return db.query(RetailerProfile).filter_by(id="ret_ramesh").first()


def stock(db, retailer, variant_id="var_milk_500ml", **kwargs):
    defaults = dict(quantity=20, unit_cost=22.0, selling_price=28.0)
    defaults.update(kwargs)
    return service.add_stock(db, retailer, product_variant_id=variant_id, **defaults)


class TestReceivingStock:
    def test_creates_the_shelf_row_on_first_receipt(self, db, retailer):
        row = stock(db, retailer, quantity=12)

        assert row.quantity == 12
        assert row.product_id == "prod_milk"
        assert len(row.batches) == 1

    def test_a_second_delivery_adds_a_batch_rather_than_a_row(self, db, retailer):
        stock(db, retailer, quantity=10)
        row = stock(db, retailer, quantity=5)

        assert row.quantity == 15
        assert len(row.batches) == 2
        assert db.query(RetailerInventory).filter_by(retailer_id=retailer.id).count() == 1

    def test_shelf_life_dates_a_batch_that_arrived_undated(self, db, retailer):
        row = stock(db, retailer, quantity=10, shelf_life_days=5)

        assert row.batches[0].expires_on == date.today() + timedelta(days=5)

    def test_an_explicit_expiry_wins_over_the_shelf_life_default(self, db, retailer):
        stamped = date.today() + timedelta(days=2)
        row = stock(db, retailer, quantity=10, shelf_life_days=30, expires_on=stamped)

        assert row.batches[0].expires_on == stamped

    def test_every_receipt_writes_a_movement(self, db, retailer):
        row = stock(db, retailer, quantity=10)

        movement = db.query(StockMovement).filter_by(inventory_id=row.id).one()
        assert movement.quantity_delta == 10
        assert movement.reason == "restock"

    def test_an_unknown_variant_is_refused(self, db, retailer):
        with pytest.raises(Exception) as exc:
            service.add_stock(db, retailer, product_variant_id="nope", quantity=5)
        assert "nahi mila" in str(exc.value.detail)


class TestFefoConsumption:
    """Stock leaves by expiry, not by arrival - that is what saves the waste."""

    def test_a_sale_draws_from_the_batch_expiring_soonest(self, db, retailer):
        row = stock(db, retailer, quantity=10, expires_on=date.today() + timedelta(days=30))
        stock(db, retailer, quantity=10, expires_on=date.today() + timedelta(days=2))
        db.refresh(row)

        result = service.consume_stock(db, row, 6, "sale_counter")

        assert result["remaining"] == 14
        soonest = min(row.batches, key=lambda b: b.expires_on)
        assert soonest.quantity == 4, "the batch about to expire should be sold first"

    def test_a_sale_spills_into_the_next_batch_when_one_is_not_enough(self, db, retailer):
        row = stock(db, retailer, quantity=3, expires_on=date.today() + timedelta(days=1))
        stock(db, retailer, quantity=10, expires_on=date.today() + timedelta(days=20))
        db.refresh(row)

        result = service.consume_stock(db, row, 8, "sale_counter")

        assert result["remaining"] == 5
        assert len(result["drawnFrom"]) == 2
        assert result["drawnFrom"][0]["quantity"] == 3

    def test_undated_stock_is_kept_until_last(self, db, retailer):
        row = stock(db, retailer, quantity=10)  # no expiry
        stock(db, retailer, quantity=10, expires_on=date.today() + timedelta(days=3))
        db.refresh(row)

        service.consume_stock(db, row, 4, "sale_counter")

        undated = [b for b in row.batches if b.expires_on is None][0]
        assert undated.quantity == 10, "a batch with no expiry can wait; a dated one cannot"

    def test_selling_more_than_the_shelf_holds_is_refused(self, db, retailer):
        row = stock(db, retailer, quantity=3)

        with pytest.raises(Exception) as exc:
            service.consume_stock(db, row, 5, "sale_counter")

        assert exc.value.status_code == 409
        db.refresh(row)
        assert row.quantity == 3, "a refused sale must not move the count"


class TestExpiryAndWastage:
    def test_expiring_stock_is_reported_before_it_is_lost(self, db, retailer):
        stock(db, retailer, quantity=8, expires_on=date.today() + timedelta(days=3))
        row = db.query(RetailerInventory).filter_by(retailer_id=retailer.id).one()

        view = service.serialise(db, row)

        assert view["expiringQuantity"] == 8
        assert view["expiredQuantity"] == 0
        assert view["batches"][0]["daysLeft"] == 3

    def test_writing_off_expired_stock_clears_it_and_costs_it(self, db, retailer):
        row = stock(db, retailer, quantity=10, unit_cost=22.0)
        row.batches[0].expires_on = date.today() - timedelta(days=1)
        db.commit()

        result = service.write_off_expired(db, retailer)

        assert result["totalQuantity"] == 10
        assert result["totalCostValue"] == 220.0
        db.refresh(row)
        assert row.quantity == 0

    def test_stock_that_is_still_in_date_is_left_alone(self, db, retailer):
        row = stock(db, retailer, quantity=10, expires_on=date.today() + timedelta(days=5))

        result = service.write_off_expired(db, retailer)

        assert result["totalQuantity"] == 0
        db.refresh(row)
        assert row.quantity == 10

    def test_a_write_off_is_recorded_as_wastage(self, db, retailer):
        row = stock(db, retailer, quantity=4)
        row.batches[0].expires_on = date.today() - timedelta(days=2)
        db.commit()

        service.write_off_expired(db, retailer)

        reasons = [m.reason for m in db.query(StockMovement).filter_by(inventory_id=row.id).all()]
        assert "wastage" in reasons


class TestSalesRate:
    def test_the_rate_is_counted_from_sales_only(self, db, retailer):
        row = stock(db, retailer, quantity=60)
        service.consume_stock(db, row, 30, "sale_counter")

        # 30 sold over the 30-day window is one a day; the 60-unit restock that
        # preceded it must not register as negative demand.
        assert service.sales_per_day(db, row.id) == 1.0

    def test_days_of_cover_follows_the_observed_rate(self, db, retailer):
        row = stock(db, retailer, quantity=90)
        service.consume_stock(db, row, 30, "sale_counter")
        db.refresh(row)

        assert service.days_of_cover(row.quantity, 1.0) == 60.0

    def test_cover_is_unknown_rather_than_infinite_when_nothing_sells(self, db, retailer):
        assert service.days_of_cover(50, 0.0) is None


class TestStockTake:
    def test_a_correction_records_the_difference(self, db, retailer):
        row = stock(db, retailer, quantity=20)

        service.adjust_stock(db, row, 17, note="Counted the shelf")

        assert row.quantity == 17
        correction = db.query(StockMovement).filter_by(
            inventory_id=row.id, reason="correction"
        ).one()
        assert correction.quantity_delta == -3

    def test_a_correction_upwards_creates_stock_to_match(self, db, retailer):
        row = stock(db, retailer, quantity=5)

        service.adjust_stock(db, row, 9)

        assert row.quantity == 9
        assert sum(b.quantity for b in row.batches) == 9

    def test_a_negative_count_is_refused(self, db, retailer):
        row = stock(db, retailer, quantity=5)
        with pytest.raises(Exception):
            service.adjust_stock(db, row, -1)


class TestInventoryApi:
    def test_the_shelf_lists_through_the_api(self, db, retailer):
        stock(db, retailer, quantity=10)

        response = client.get("/api/inventory")

        assert response.status_code == 200
        assert response.json()[0]["name"] == "Milk"

    def test_receiving_stock_through_the_api(self, db, retailer):
        response = client.post("/api/inventory", json={
            "product_variant_id": "var_atta_5kg",
            "quantity": 6,
            "unit_cost": 210.0,
            "selling_price": 250.0,
            "shelf_life_days": 90,
        })

        assert response.status_code == 201
        assert response.json()["quantity"] == 6

    def test_a_counter_sale_moves_the_count(self, db, retailer):
        row = stock(db, retailer, quantity=10)

        response = client.post("/api/inventory/counter-sale", json={
            "inventory_id": row.id, "quantity": 3,
        })

        assert response.status_code == 200
        assert response.json()["remaining"] == 7

    def test_low_stock_can_be_filtered_for(self, db, retailer):
        row = stock(db, retailer, quantity=2, reorder_level=5)
        stock(db, retailer, variant_id="var_atta_5kg", quantity=50, reorder_level=5)

        response = client.get("/api/inventory?low_stock_only=true")

        ids = [item["id"] for item in response.json()]
        assert ids == [row.id]

    def test_another_shop_cannot_read_this_shelf_row(self, db, seed_data):
        """A row is fetched with its owner, never by id alone."""
        retailer = db.query(RetailerProfile).filter_by(id="ret_ramesh").first()
        row = stock(db, retailer, quantity=5)

        with pytest.raises(Exception) as exc:
            service.get_inventory(db, "some-other-shop", row.id)

        assert exc.value.status_code == 404
