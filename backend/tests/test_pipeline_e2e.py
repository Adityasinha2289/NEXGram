"""End-to-end tests for the intelligence pipeline.

The existing intelligence tests only exercise the ID-hashing helpers, and
test_opportunity_engine.py says outright that full DB tests "would require a
configured test PostgreSQL instance". That gap is why the engine could ship
reading a column that does not exist: nothing ever ran it.

The Postgres-dialect upserts in all three engines do compile and execute on
SQLite, so the whole pipeline is testable here with no extra infrastructure.
"""

import pytest

from app.models.catalogue import Category, DistributorCatalogueItem, Product, ProductVariant
from app.models.intelligence import DemandSignal, Opportunity, SupplyGap
from app.models.profiles import DistributorProfile, Location, RetailerProfile
from app.models.users import User
from app.modules.intelligence.services.demand_engine import DemandEngine
from app.modules.intelligence.services.opportunity_engine import OpportunityEngine
from app.modules.intelligence.services.supply_gap_engine import SupplyGapEngine


def run_pipeline(db):
    DemandEngine.generate_demand(db)
    SupplyGapEngine.generate_supply_gaps(db)
    return OpportunityEngine.generate_opportunities(db)


@pytest.fixture
def market(db):
    """A miniature market: one village, one product, two distributors.

    Deliberately small so every expected number can be worked out by hand.
    """
    village = Location(id="loc_test", state="HP", district="Kangra", area="Test Market")
    other = Location(id="loc_far", state="HP", district="Shimla", area="Far Market")
    db.add_all([village, other])

    dairy = Category(id="cat_dairy", name="Dairy", slug="dairy", level=0)
    db.add(dairy)
    db.flush()

    paneer = Product(id="prod_paneer", category_id=dairy.id, canonical_name="Paneer", normalized_name="paneer")
    db.add(paneer)
    db.flush()
    variant = ProductVariant(id="var_paneer", product_id=paneer.id, variant_name="200g", pack_size="200", unit="g")
    db.add(variant)

    # Ten shops in the village, all short of paneer.
    for i in range(10):
        user = User(id=f"u_r{i}", role="retailer", name=f"Shop {i}", mobile=f"90000000{i:02d}")
        db.add(user)
        db.add(RetailerProfile(
            id=f"ret_{i}", user_id=user.id, location_id=village.id,
            business_name=f"Shop {i}", business_type="Kirana",
            demanded_categories=["Dairy"],
            unmet_needs={"categories": ["Dairy"], "other": "paneer nahi milta"},
        ))

    # Two distributors in the same village, both dairy, neither stocking paneer.
    for key in ("a", "b"):
        user = User(id=f"u_d{key}", role="distributor", name=f"Dist {key}", mobile=f"9100000{key and 1 or 0}{key}")
        db.add(user)
        db.add(DistributorProfile(
            id=f"dist_{key}", user_id=user.id, location_id=village.id,
            business_name=f"Dist {key}", business_category="Dairy",
            product_categories=["Dairy"],
        ))

    db.commit()
    return {"village": village, "other": other, "variant": variant}


def stock_paneer(db, distributor_id, variant, quantity=100, status="available"):
    db.add(DistributorCatalogueItem(
        id=f"cat_{distributor_id}_paneer",
        distributor_id=distributor_id,
        product_id=variant.product_id,
        product_variant_id=variant.id,
        selling_price=60.0,
        minimum_order_quantity=5,
        available_stock=quantity,
        stock_status=status,
        is_available=status != "out_of_stock",
        is_active=True,
    ))
    db.commit()


def test_pipeline_produces_signals_gaps_and_opportunities(db, market):
    """The whole chain runs and every stage persists rows."""
    run_pipeline(db)

    assert db.query(DemandSignal).count() > 0
    assert db.query(SupplyGap).count() > 0
    assert db.query(Opportunity).count() > 0


def test_unmet_demand_with_no_supply_scores_highest(db, market):
    """Ten shops asking, nobody supplying: full demand and scarcity marks."""
    run_pipeline(db)

    opp = db.query(Opportunity).filter(
        Opportunity.distributor_id == "dist_a",
        Opportunity.product_id == "prod_paneer",
    ).one()

    # 10 of 15 saturating retailers -> 30 of 45; no supplier -> all 35; own area -> all 20.
    assert opp.demand_score == pytest.approx(30.0)
    assert opp.supply_score == pytest.approx(35.0)
    assert opp.fit_score == pytest.approx(20.0)
    assert opp.opportunity_score == pytest.approx(85.0)
    assert opp.confidence == "High"


def test_score_components_sum_to_the_total(db, market):
    """The breakdown shown to the user must actually add up."""
    run_pipeline(db)

    for opp in db.query(Opportunity).all():
        parts = (opp.demand_score or 0) + (opp.supply_score or 0) + (opp.fit_score or 0)
        assert opp.opportunity_score == pytest.approx(min(100.0, parts), abs=0.05)


def test_every_tier_is_reachable():
    """Guards the bug where the maximum score (40) sat below the 'Strong' cut-off."""
    best = (
        OpportunityEngine.score_demand(99)
        + OpportunityEngine.score_scarcity(0)
        + OpportunityEngine.score_fit("area")
    )
    assert best == pytest.approx(100.0)
    assert best >= 80, "Strong tier must be achievable"


def test_supply_closes_the_gap(db, market):
    """Adding stock lowers the score for everyone still outside the market."""
    def paneer_score():
        return db.query(Opportunity).filter(
            Opportunity.distributor_id == "dist_b",
            Opportunity.product_id == "prod_paneer",
        ).one().opportunity_score

    run_pipeline(db)
    before = paneer_score()

    stock_paneer(db, "dist_a", market["variant"])
    run_pipeline(db)

    assert paneer_score() < before


def test_distributor_already_stocking_gets_no_opportunity(db, market):
    """Do not recommend selling something the distributor already sells."""
    stock_paneer(db, "dist_a", market["variant"])
    run_pipeline(db)

    assert db.query(Opportunity).filter(
        Opportunity.distributor_id == "dist_a",
        Opportunity.product_id == "prod_paneer",
        Opportunity.status == "active",
    ).first() is None

    # The one who cannot supply it still sees it.
    assert db.query(Opportunity).filter(
        Opportunity.distributor_id == "dist_b",
        Opportunity.product_id == "prod_paneer",
        Opportunity.status == "active",
    ).first() is not None


def test_out_of_stock_listing_still_yields_a_restock_signal(db, market):
    """Listing a product you cannot deliver is not supply."""
    stock_paneer(db, "dist_a", market["variant"], quantity=0, status="out_of_stock")
    run_pipeline(db)

    opp = db.query(Opportunity).filter(
        Opportunity.distributor_id == "dist_a",
        Opportunity.product_id == "prod_paneer",
        Opportunity.status == "active",
    ).first()
    assert opp is not None, "an out-of-stock lister should still see the opportunity"

    gap = db.query(SupplyGap).filter(SupplyGap.product_id == "prod_paneer").first()
    assert gap.supplier_count == 1
    assert gap.available_supplier_count == 0


def test_opportunity_retires_once_acted_on(db, market):
    """A resolved opportunity leaves the feed instead of lingering."""
    run_pipeline(db)
    opp_id = db.query(Opportunity).filter(
        Opportunity.distributor_id == "dist_a",
        Opportunity.product_id == "prod_paneer",
    ).one().id

    stock_paneer(db, "dist_a", market["variant"])
    run_pipeline(db)

    assert db.query(Opportunity).filter(Opportunity.id == opp_id).one().status == "resolved"


def test_pipeline_is_idempotent(db, market):
    """Re-running must update rows in place, never duplicate them."""
    run_pipeline(db)
    counts = (
        db.query(DemandSignal).count(),
        db.query(SupplyGap).count(),
        db.query(Opportunity).count(),
    )

    run_pipeline(db)
    run_pipeline(db)

    assert (
        db.query(DemandSignal).count(),
        db.query(SupplyGap).count(),
        db.query(Opportunity).count(),
    ) == counts


def test_demand_follows_a_retailer_who_moves(db, market):
    """Correcting an address must re-home that shop's signals."""
    run_pipeline(db)
    assert db.query(DemandSignal).filter(
        DemandSignal.retailer_id == "ret_0",
        DemandSignal.location_id == "loc_test",
    ).count() > 0

    db.query(RetailerProfile).filter(RetailerProfile.id == "ret_0").one().location_id = "loc_far"
    db.commit()
    run_pipeline(db)

    assert db.query(DemandSignal).filter(
        DemandSignal.retailer_id == "ret_0",
        DemandSignal.location_id == "loc_test",
    ).count() == 0


def test_distributor_outside_the_district_is_excluded(db, market):
    """Geography gates the feed: a Shimla distributor sees no Kangra gap."""
    user = User(id="u_far", role="distributor", name="Far Dist", mobile="9199999999")
    db.add(user)
    db.add(DistributorProfile(
        id="dist_far", user_id=user.id, location_id="loc_far",
        business_name="Far Dist", business_category="Dairy", product_categories=["Dairy"],
    ))
    db.commit()
    run_pipeline(db)

    assert db.query(Opportunity).filter(
        Opportunity.distributor_id == "dist_far",
        Opportunity.location_id == "loc_test",
    ).first() is None


def test_thin_signal_is_labelled_low_confidence(db, market):
    """Cold start stays visible but honest about how little it rests on."""
    for i in range(1, 10):
        db.query(RetailerProfile).filter(RetailerProfile.id == f"ret_{i}").one().location_id = "loc_far"
    db.commit()
    run_pipeline(db)

    opp = db.query(Opportunity).filter(
        Opportunity.distributor_id == "dist_a",
        Opportunity.location_id == "loc_test",
        Opportunity.product_id == "prod_paneer",
    ).one()
    assert opp.potential_retailer_count == 1
    assert opp.confidence == "Low"
