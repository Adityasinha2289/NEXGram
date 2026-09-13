"""What to buy next: running low, about to spoil, and not stocked at all."""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_retailer, get_current_user
from app.main import app
from app.models.intelligence import SupplyGap
from app.models.profiles import RetailerProfile
from app.models.users import User
from app.modules.inventory import restock, service

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


@pytest.fixture
def unlisted_product(db, seed_data):
    """A real product that no distributor in this district stocks."""
    from app.models.catalogue import Product, ProductVariant

    product = Product(
        id="prod_sabun", category_id="cat_staples",
        canonical_name="Sabun", normalized_name="sabun",
    )
    db.add(product)
    db.flush()
    variant = ProductVariant(
        id="var_sabun_1", product_id=product.id, variant_name="1 cake", unit="piece",
    )
    db.add(variant)
    db.commit()
    return variant


def selling_at(db, retailer, variant, *, stocked, sold, **kwargs):
    """A line with real sales history behind it."""
    row = service.add_stock(
        db, retailer, product_variant_id=variant,
        quantity=stocked, unit_cost=20.0, selling_price=28.0, **kwargs
    )
    if sold:
        service.consume_stock(db, row, sold, "sale_counter")
    db.refresh(row)
    return row


class TestSuggestedQuantity:
    def test_it_orders_up_to_the_cover_target(self):
        # 2/day for a 7-day target is 14, less the 4 already held.
        assert restock.suggested_quantity(2.0, 4, None, 1) == 10

    def test_shelf_life_caps_the_order(self):
        """Ordering a week of bread that keeps three days is a week of waste."""
        assert restock.suggested_quantity(2.0, 0, 3, 1) == 6

    def test_the_supplier_minimum_still_applies(self):
        assert restock.suggested_quantity(0.5, 0, None, 10) == 10

    def test_an_empty_shelf_with_no_history_orders_one_minimum(self):
        """With no rate there is nothing to project, but zero is still wrong."""
        assert restock.suggested_quantity(0.0, 0, None, 5) == 5

    def test_a_well_stocked_line_is_not_reordered(self):
        assert restock.suggested_quantity(1.0, 50, None, 1) == 0


class TestRunningLow:
    def test_a_fast_selling_line_is_flagged_with_its_rate(self, db, retailer):
        # 60 sold over the 30-day window is 2/day; the 10 left is five days.
        selling_at(db, retailer, "var_milk_500ml", stocked=70, sold=60, reorder_level=5)

        plan = restock.build_restock_plan(db, retailer)
        line = next(l for l in plan["reorder"] if l["name"] == "Milk")

        assert line["salesPerDay"] == 2.0
        assert line["daysOfCover"] == 5.0

    def test_a_line_with_a_fortnight_of_cover_is_not_due(self, db, retailer):
        """Fifteen days of stock is not a reason to buy more today."""
        selling_at(db, retailer, "var_milk_500ml", stocked=90, sold=60, reorder_level=5)

        plan = restock.build_restock_plan(db, retailer)
        assert not any(l["name"] == "Milk" for l in plan["reorder"])

    def test_an_empty_shelf_is_urgent(self, db, retailer):
        selling_at(db, retailer, "var_milk_500ml", stocked=30, sold=30, reorder_level=5)

        plan = restock.build_restock_plan(db, retailer)
        line = next(l for l in plan["reorder"] if l["name"] == "Milk")

        assert line["onHand"] == 0
        assert line["urgent"] is True

    def test_a_well_stocked_line_is_left_off_the_list(self, db, retailer):
        selling_at(db, retailer, "var_milk_500ml", stocked=300, sold=3, reorder_level=5)

        plan = restock.build_restock_plan(db, retailer)
        assert not any(l["name"] == "Milk" for l in plan["reorder"])

    def test_every_line_says_why_it_is_there(self, db, retailer):
        """A quantity without a reason is a number nobody acts on."""
        selling_at(db, retailer, "var_milk_500ml", stocked=90, sold=88, reorder_level=5)

        plan = restock.build_restock_plan(db, retailer)
        assert all(line["reason"] for line in plan["reorder"])

    def test_it_names_the_cheapest_local_supplier(self, db, retailer):
        selling_at(db, retailer, "var_milk_500ml", stocked=90, sold=88, reorder_level=5)

        line = next(l for l in restock.build_restock_plan(db, retailer)["reorder"]
                    if l["name"] == "Milk")

        assert line["available"] is True
        assert line["distributorName"] == "Sharma Distributors"
        assert line["estimatedCost"] > 0

    def test_a_line_nobody_local_supplies_says_so(self, db, retailer, unlisted_product):
        """Silently omitting it would read as "you do not need this"."""
        row = service.add_stock(
            db, retailer, product_variant_id=unlisted_product.id,
            quantity=1, selling_price=70.0, reorder_level=5,
        )
        service.consume_stock(db, row, 1, "sale_counter")

        line = next(l for l in restock.build_restock_plan(db, retailer)["reorder"]
                    if l["name"] == "Sabun")

        assert line["available"] is False
        assert "supplier" in line["supplyNote"]

    def test_shelf_life_is_explained_in_the_reason(self, db, retailer):
        selling_at(
            db, retailer, "var_milk_500ml",
            stocked=30, sold=30, reorder_level=5, shelf_life_days=2,
        )

        line = next(l for l in restock.build_restock_plan(db, retailer)["reorder"]
                    if l["name"] == "Milk")

        assert "Shelf life" in line["reason"]


class TestExpiringStock:
    def test_stock_about_to_expire_is_surfaced(self, db, retailer):
        service.add_stock(
            db, retailer, product_variant_id="var_milk_500ml",
            quantity=20, unit_cost=20.0, selling_price=28.0,
            expires_on=date.today() + timedelta(days=2),
        )

        plan = restock.build_restock_plan(db, retailer)

        assert plan["expiring"]
        assert plan["expiring"][0]["daysLeft"] == 2

    def test_only_the_part_that_will_not_sell_counts_as_at_risk(self, db, retailer):
        """A line selling 2/day will clear 4 of the 20 in two days."""
        row = service.add_stock(
            db, retailer, product_variant_id="var_milk_500ml",
            quantity=80, unit_cost=20.0, selling_price=28.0,
            expires_on=date.today() + timedelta(days=2),
        )
        service.consume_stock(db, row, 60, "sale_counter")

        entry = restock.build_restock_plan(db, retailer)["expiring"][0]

        assert entry["quantity"] == 20
        assert entry["atRiskQuantity"] == 16
        assert entry["costValue"] == 320.0

    def test_stock_expiring_today_says_to_act_today(self, db, retailer):
        service.add_stock(
            db, retailer, product_variant_id="var_milk_500ml",
            quantity=10, unit_cost=20.0, selling_price=28.0,
            expires_on=date.today(),
        )

        entry = restock.build_restock_plan(db, retailer)["expiring"][0]
        assert "Aaj" in entry["action"]

    def test_stock_with_a_long_life_is_not_reported_as_expiring(self, db, retailer):
        service.add_stock(
            db, retailer, product_variant_id="var_milk_500ml",
            quantity=10, selling_price=28.0,
            expires_on=date.today() + timedelta(days=60),
        )

        assert restock.build_restock_plan(db, retailer)["expiring"] == []


class TestLocalDemandOpportunities:
    """The part no stock rule can produce: demand for what you never sold."""

    @pytest.fixture
    def gap(self, db, retailer):
        db.add(SupplyGap(
            id="gap_atta", product_id="prod_atta", category_id="cat_staples",
            location_id=retailer.location_id,
            retailer_demand_count=9, available_supplier_count=1, gap_score=70.0,
        ))
        db.commit()

    def test_a_product_the_area_wants_is_suggested(self, db, retailer, gap):
        plan = restock.build_restock_plan(db, retailer)

        assert plan["newProducts"]
        assert plan["newProducts"][0]["name"] == "Atta"
        assert plan["newProducts"][0]["retailersAsking"] == 9

    def test_it_says_how_many_shops_are_asking(self, db, retailer, gap):
        reason = restock.build_restock_plan(db, retailer)["newProducts"][0]["reason"]
        assert "9 shop" in reason

    def test_something_already_stocked_is_not_suggested_again(self, db, retailer, gap):
        service.add_stock(
            db, retailer, product_variant_id="var_atta_5kg", quantity=10, selling_price=250.0,
        )

        plan = restock.build_restock_plan(db, retailer)
        assert not any(p["name"] == "Atta" for p in plan["newProducts"])

    def test_a_product_no_local_supplier_can_deliver_is_not_suggested(
        self, db, retailer, unlisted_product
    ):
        """A recommendation nobody can fulfil is just a complaint."""
        db.add(SupplyGap(
            id="gap_ghost", product_id=unlisted_product.product_id, category_id="cat_dairy",
            location_id=retailer.location_id, retailer_demand_count=12, gap_score=90.0,
        ))
        db.commit()

        plan = restock.build_restock_plan(db, retailer)
        assert not any(
            p["productId"] == unlisted_product.product_id for p in plan["newProducts"]
        )


class TestRestockApi:
    def test_the_plan_is_exposed(self, db, retailer):
        selling_at(db, retailer, "var_milk_500ml", stocked=60, sold=55, reorder_level=5)

        response = client.get("/api/inventory/restock-plan")

        assert response.status_code == 200
        body = response.json()
        assert body["summary"]["linesToReorder"] >= 1
        assert "expiring" in body and "newProducts" in body

    def test_the_summary_totals_the_cost_and_the_waste(self, db, retailer):
        service.add_stock(
            db, retailer, product_variant_id="var_milk_500ml",
            quantity=20, unit_cost=20.0, selling_price=28.0,
            expires_on=date.today() + timedelta(days=1),
        )

        summary = client.get("/api/inventory/restock-plan").json()["summary"]
        assert summary["wastageAtRisk"] > 0
