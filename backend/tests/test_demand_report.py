"""In-app demand reporting.

The loop only turns if a shop can report unmet demand after onboarding, so these
cover the path from "a customer asked for this" to a supply gap that nearby
distributors are scored against.
"""

import pytest

from app.models.catalogue import Category, Product
from app.models.intelligence import SupplyGap
from app.models.profiles import Location, RetailerProfile
from app.models.users import User
from app.modules.intelligence.services import demand_report
from app.modules.intelligence.services.demand_engine import DemandEngine
from app.modules.intelligence.services.supply_gap_engine import SupplyGapEngine


@pytest.fixture
def shop(db):
    db.add(Location(id="loc_r", state="HP", district="Kangra", area="Test Market"))
    dairy = Category(id="cat_dairy", name="Dairy", slug="dairy", level=0)
    db.add(dairy)
    db.flush()
    db.add(Product(id="prod_paneer", category_id=dairy.id,
                   canonical_name="Paneer", normalized_name="paneer"))

    user = User(id="u1", role="retailer", name="Owner", mobile="9000000001")
    db.add(user)
    profile = RetailerProfile(
        id="ret_1", user_id=user.id, location_id="loc_r",
        business_name="Test Kirana", business_type="Kirana",
        demanded_categories=["Dairy"],
        unmet_needs={"categories": [], "other": ""},
    )
    db.add(profile)
    db.commit()
    return profile


def test_reporting_a_known_product_records_it(db, shop):
    entry = demand_report.add_report(db, shop, product_id="prod_paneer", note="roz maangte hain")

    assert entry["product"] == "Paneer"
    assert entry["productId"] == "prod_paneer"
    assert entry["category"] == "Dairy"
    assert entry["reportedAt"]


def test_report_becomes_a_demand_signal_and_a_supply_gap(db, shop):
    demand_report.add_report(db, shop, product_id="prod_paneer")

    DemandEngine.generate_demand(db)
    SupplyGapEngine.generate_supply_gaps(db)

    gap = db.query(SupplyGap).filter(
        SupplyGap.product_id == "prod_paneer",
        SupplyGap.location_id == "loc_r",
    ).first()
    assert gap is not None
    assert gap.retailer_demand_count == 1


def test_free_text_is_accepted_when_the_product_is_unknown(db, shop):
    """Novel demand is the point; an unrecognised name must not be dropped."""
    entry = demand_report.add_report(db, shop, product_name="Dragon fruit", note="tourists poochte hain")

    assert entry["product"] == "Dragon fruit"
    assert entry["productId"] is None
    assert "dragon fruit" in shop.unmet_needs["other"]


def test_an_empty_report_is_refused(db, shop):
    with pytest.raises(ValueError):
        demand_report.add_report(db, shop, note="   ")


def test_reports_are_listed_newest_first(db, shop):
    demand_report.add_report(db, shop, product_name="First")
    demand_report.add_report(db, shop, product_name="Second")

    reports = demand_report.list_reports(shop)
    assert [r["product"] for r in reports] == ["Second", "First"]


def test_onboarding_answers_survive_a_report(db, shop):
    """Reporting appends; it must not wipe what onboarding collected."""
    shop.unmet_needs = {"categories": ["Staples"], "other": "atta kam padta hai", "reports": []}
    db.commit()

    demand_report.add_report(db, shop, product_id="prod_paneer")

    assert "Staples" in shop.unmet_needs["categories"]
    assert "atta kam padta hai" in shop.unmet_needs["other"]


def test_report_history_is_capped(db, shop):
    """A chatty shop must not grow the JSON column without bound."""
    for i in range(demand_report.MAX_REPORTS + 10):
        demand_report.add_report(db, shop, product_name=f"Item {i}")

    assert len(shop.unmet_needs["reports"]) == demand_report.MAX_REPORTS
