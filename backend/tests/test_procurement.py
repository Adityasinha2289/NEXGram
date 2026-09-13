"""Sourcing one list across every local distributor.

Two distributors serve Palampur. Once `split_market` runs, Gupta is cheaper on
paneer and Sharma on milk - so no single supplier is the right answer, which is
the whole situation this feature exists for.
"""

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_retailer, get_current_user
from app.main import app
from app.models.catalogue import DistributorCatalogueItem
from app.models.profiles import RetailerProfile
from app.models.users import User
from app.modules.procurement import service

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
def split_market(db, seed_data):
    """A market where no single supplier is cheapest on everything.

    The seed already has Sharma on paneer (320) and milk (25), and Gupta on
    paneer (315) and atta (200). These two rows put Gupta below Sharma on
    paneer while leaving Sharma cheapest on milk, which is the situation the
    optimiser exists for.
    """
    rows = {
        (i.distributor_id, i.product_id): i
        for i in db.query(DistributorCatalogueItem).all()
    }

    # Gupta undercuts Sharma on paneer; Sharma undercuts Gupta on milk.
    db.add_all([
        DistributorCatalogueItem(
            distributor_id="dist_gupta", product_id="prod_paneer",
            product_variant_id="var_paneer_1kg",
            selling_price=290.0, minimum_order_quantity=2,
            available_stock=50, stock_status="available",
        ),
        DistributorCatalogueItem(
            distributor_id="dist_gupta", product_id="prod_milk",
            product_variant_id="var_milk_500ml",
            selling_price=31.0, minimum_order_quantity=5,
            available_stock=200, stock_status="available",
        ),
    ])
    db.commit()
    return rows


class TestOptimising:
    def test_each_line_goes_to_whoever_is_cheapest(self, db, retailer, split_market):
        plan = service.optimise(db, retailer, [
            {"product_id": "prod_paneer", "quantity": 5},
            {"product_id": "prod_milk", "quantity": 20},
        ])

        by_product = {line["productId"]: line for line in plan["lines"]}
        assert by_product["prod_paneer"]["best"]["distributorId"] == "dist_gupta"
        assert by_product["prod_milk"]["best"]["distributorId"] == "dist_sharma"

    def test_the_split_is_grouped_into_one_order_per_supplier(self, db, retailer, split_market):
        plan = service.optimise(db, retailer, [
            {"product_id": "prod_paneer", "quantity": 5},
            {"product_id": "prod_milk", "quantity": 20},
        ])

        assert plan["split"]["supplierCount"] == 2
        for group in plan["split"]["groups"]:
            assert group["items"]

    def test_the_saving_against_the_dearest_option_is_reported(self, db, retailer, split_market):
        plan = service.optimise(db, retailer, [{"product_id": "prod_paneer", "quantity": 5}])

        line = plan["lines"][0]
        # Cheapest is Gupta at 290 x 5. The dearest able to fill it is Gupta's
        # own 315 listing, whose MOQ of 10 forces a larger order.
        assert line["best"]["lineTotal"] == 1450.0
        assert plan["savingVsWorst"] == round(line["worstLineTotal"] - 1450.0, 2)
        assert plan["savingVsWorst"] > 0

    def test_the_best_single_supplier_is_offered_alongside(self, db, retailer, split_market):
        """One delivery is worth something; the shopkeeper decides."""
        plan = service.optimise(db, retailer, [
            {"product_id": "prod_paneer", "quantity": 5},
            {"product_id": "prod_milk", "quantity": 20},
        ])

        single = plan["singleSupplier"]
        assert single is not None
        assert single["coversWholeList"] is True
        assert plan["savingVsSingle"] >= 0

    def test_no_saving_is_claimed_when_no_supplier_covers_the_list(self, db, retailer):
        """Subtracting a partial basket from a complete one is not a saving.

        Without `split_market`, only Sharma has milk and only Gupta has atta,
        so neither can fill this list alone. Comparing the split against the
        better half-basket produced a *negative* saving, which reads as
        "splitting costs you more" when the real answer is that the one-stop
        option does not exist.
        """
        plan = service.optimise(db, retailer, [
            {"product_id": "prod_milk", "quantity": 20},
            {"product_id": "prod_atta", "quantity": 5},
        ])

        assert plan["singleSupplier"]["coversWholeList"] is False
        assert plan["savingVsSingle"] is None
        assert "ek supplier" in plan["recommendation"]

    def test_splitting_is_never_dearer_than_one_supplier(self, db, retailer, split_market):
        plan = service.optimise(db, retailer, [
            {"product_id": "prod_paneer", "quantity": 5},
            {"product_id": "prod_milk", "quantity": 20},
        ])

        assert plan["split"]["subtotal"] <= plan["singleSupplier"]["total"]

    def test_the_platform_cut_is_stated_in_rupees(self, db, retailer, split_market):
        """A hidden markup is the one thing that breaks this product."""
        plan = service.optimise(db, retailer, [{"product_id": "prod_milk", "quantity": 20}])

        split = plan["split"]
        assert split["platformMarginRate"] > 0
        assert split["platformFee"] == round(split["subtotal"] * split["platformMarginRate"], 2)
        assert split["payable"] == round(split["subtotal"] + split["platformFee"], 2)

    def test_a_quantity_below_moq_is_raised_and_flagged(self, db, retailer, split_market):
        # Sharma's milk MOQ is 20; asking for 5 is still a real offer.
        plan = service.optimise(db, retailer, [{"product_id": "prod_milk", "quantity": 5}])

        best = plan["lines"][0]["best"]
        assert best["quantity"] >= best["minimumOrderQuantity"]
        if best["quantity"] > 5:
            assert best["raisedToMoq"] is True

    def test_a_product_nobody_stocks_is_named_rather_than_dropped(self, db, retailer, split_market):
        """Silence would read as "you do not need this"."""
        plan = service.optimise(db, retailer, [{"product_id": "prod_unknown", "quantity": 5}])

        assert plan["lines"] == []
        assert plan["unavailable"][0]["productId"] == "prod_unknown"

    def test_a_quantity_beyond_every_supplier_stock_is_unavailable(self, db, retailer, split_market):
        plan = service.optimise(db, retailer, [{"product_id": "prod_paneer", "quantity": 99999}])
        assert plan["unavailable"]

    def test_an_empty_list_returns_a_reason_not_a_crash(self, db, retailer, split_market):
        plan = service.optimise(db, retailer, [])
        assert plan["lines"] == []
        assert plan["recommendation"]

    def test_the_recommendation_says_what_to_do(self, db, retailer, split_market):
        plan = service.optimise(db, retailer, [
            {"product_id": "prod_paneer", "quantity": 5},
            {"product_id": "prod_milk", "quantity": 20},
        ])
        assert isinstance(plan["recommendation"], str) and plan["recommendation"]


class TestProcurementApi:
    def test_optimise_through_the_api(self, db, retailer, split_market):
        response = client.post("/api/procurement/optimise", json={
            "items": [{"product_id": "prod_paneer", "quantity": 5}],
        })

        assert response.status_code == 200
        assert response.json()["lines"][0]["name"] == "Paneer"

    def test_an_empty_basket_is_rejected_by_validation(self, db, retailer, split_market):
        assert client.post("/api/procurement/optimise", json={"items": []}).status_code == 422

    def test_placing_the_split_creates_one_order_per_supplier(self, db, retailer, split_market):
        response = client.post("/api/procurement/place-split", json={
            "items": [
                {"product_id": "prod_paneer", "quantity": 5},
                {"product_id": "prod_milk", "quantity": 20},
            ],
        })

        assert response.status_code == 201
        body = response.json()
        assert body["ordersPlaced"] == 2
        assert body["totalValue"] > 0

    def test_placing_a_split_nobody_can_fill_is_refused(self, db, retailer, split_market):
        response = client.post("/api/procurement/place-split", json={
            "items": [{"product_id": "prod_unknown", "quantity": 5}],
        })
        assert response.status_code == 400


class TestAutoBasket:
    def test_it_builds_the_list_from_the_shelf(self, db, retailer, split_market):
        """No list is typed: what is running low is what gets sourced."""
        from app.modules.inventory import service as inventory_service

        row = inventory_service.add_stock(
            db, retailer, product_variant_id="var_milk_500ml",
            quantity=30, selling_price=30.0, reorder_level=5,
        )
        inventory_service.consume_stock(db, row, 28, "sale_counter")

        result = service.auto_basket(db, retailer)

        assert any(line["productId"] == "prod_milk" for line in result["lines"])

    def test_each_sourced_line_carries_why_it_is_there(self, db, retailer, split_market):
        from app.modules.inventory import service as inventory_service

        row = inventory_service.add_stock(
            db, retailer, product_variant_id="var_milk_500ml",
            quantity=30, selling_price=30.0, reorder_level=5,
        )
        inventory_service.consume_stock(db, row, 28, "sale_counter")

        result = service.auto_basket(db, retailer)
        line = next(l for l in result["lines"] if l["productId"] == "prod_milk")

        assert line["why"]
        assert line["source"] == "running_low"

    def test_an_empty_shop_produces_an_empty_basket_not_an_error(self, db, retailer, split_market):
        result = service.auto_basket(db, retailer)
        assert result["lines"] == []
        assert result["recommendation"]

    def test_the_api_exposes_it(self, db, retailer, split_market):
        assert client.get("/api/procurement/auto-basket").status_code == 200
