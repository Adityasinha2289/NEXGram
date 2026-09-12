"""The three engines, in the order they depend on each other.

Lives in services rather than in the router because it is not routing: the
seed runs it too, and importing a FastAPI router module to get at a function
drags the whole dependency graph along with it.
"""

from sqlalchemy.orm import Session

from app.modules.intelligence.services.demand_engine import DemandEngine
from app.modules.intelligence.services.opportunity_engine import OpportunityEngine
from app.modules.intelligence.services.supply_gap_engine import SupplyGapEngine


def run_pipeline(db: Session) -> dict:
    """Runs the three engines in dependency order.

    Each stage consumes the previous stage's persisted output, so the order is
    fixed: demand signals feed supply gaps, which feed opportunities. Every
    engine upserts on a deterministic id, so repeat calls are idempotent.
    """
    demand = DemandEngine.generate_demand(db)
    gaps = SupplyGapEngine.generate_supply_gaps(db)
    opportunities = OpportunityEngine.generate_opportunities(db)
    return {"demand": demand, "supply_gaps": gaps, "opportunities": opportunities}
