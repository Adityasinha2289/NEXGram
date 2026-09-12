from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.intelligence import DemandSignal, SupplyGap, Opportunity
from app.modules.intelligence.services.demand_engine import DemandEngine
from app.modules.intelligence.services.supply_gap_engine import SupplyGapEngine
from app.modules.intelligence.services.opportunity_engine import OpportunityEngine
from app.modules.intelligence.services import dashboard as dashboard_service
from app.modules.intelligence.services import alerts as alerts_service
from app.modules.intelligence.services import demand_report
from app.modules.intelligence.services.pipeline import run_pipeline
from app.api.deps import get_current_distributor, get_current_retailer, get_current_user
from app.models.users import User
from app.models.profiles import DistributorProfile, RetailerProfile

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])


def require_ops_token(x_ops_token: Optional[str] = Header(default=None)):
    """Guards the operational pipeline endpoints.

    These rebuild the entire intelligence layer, so they must not be callable
    anonymously on a deployed instance. Seeding and demo prep pass the token;
    the app itself uses /refresh, which is authenticated instead.
    """
    if x_ops_token != settings.OPS_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid or missing ops token")


@router.post("/demand/generate", summary="Generate Demand Signals", dependencies=[Depends(require_ops_token)])
def generate_demand(db: Session = Depends(get_db)):
    """
    Reads retailer profiles, extracts demand, and idempotently upserts to DemandSignals.
    Operational endpoint.
    """
    try:
        return DemandEngine.generate_demand(db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/supply-gaps/generate", summary="Generate Supply Gaps", dependencies=[Depends(require_ops_token)])
def generate_supply_gaps(db: Session = Depends(get_db)):
    """
    Cross-references aggregated DemandSignals against DistributorCatalogueItems
    to generate SupplyGaps idempotently.
    Operational endpoint.
    """
    try:
        return SupplyGapEngine.generate_supply_gaps(db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/opportunities/generate", summary="Generate Opportunities", dependencies=[Depends(require_ops_token)])
def generate_opportunities(db: Session = Depends(get_db)):
    """
    Cross-references SupplyGaps against Distributor profiles to create actionable Opportunities.
    """
    try:
        return OpportunityEngine.generate_opportunities(db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh", summary="Recompute the full intelligence pipeline")
def refresh_intelligence(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recomputes demand -> supply gaps -> opportunities for the whole dataset.

    This is what closes the product loop: a retailer finishing onboarding, or a
    distributor adding stock, changes the signals everyone else is scored against.
    Every engine upserts on a deterministic ID, so repeat calls are idempotent.
    """
    try:
        return run_pipeline(db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/distributor", summary="Distributor home screen")
def distributor_dashboard(
    db: Session = Depends(get_db),
    current_distributor: DistributorProfile = Depends(get_current_distributor),
):
    """One payload for the distributor home screen.

    Assembled server-side so the dashboard cannot drift from the opportunity
    detail page, and so a rural connection makes one request instead of four.
    """
    return dashboard_service.build_distributor_dashboard(db, current_distributor)


@router.get("/dashboard/retailer", summary="Retailer home screen")
def retailer_dashboard(
    db: Session = Depends(get_db),
    current_retailer: RetailerProfile = Depends(get_current_retailer),
):
    """One payload for the retailer home screen."""
    return dashboard_service.build_retailer_dashboard(db, current_retailer)


@router.get("/developer-pack", summary="Budget-aware stock plan")
def developer_pack(
    db: Session = Depends(get_db),
    current_retailer: RetailerProfile = Depends(get_current_retailer),
):
    """The retailer's stock plan, computed server-side.

    Running this in the browser would mean shipping every nearby shop's unmet
    needs and budget to the client to compute against.
    """
    pack = dashboard_service.build_developer_pack(db, current_retailer)
    pack["distributorMatches"] = dashboard_service.build_pack_matches(db, current_retailer, pack)
    return pack


@router.get("/developer-pack/options", summary="Products a retailer can add to the plan")
def developer_pack_options(
    limit: int = Query(60, ge=1, le=200),
    db: Session = Depends(get_db),
    current_retailer: RetailerProfile = Depends(get_current_retailer),
):
    """Local, in-stock listings, shaped like pack lines."""
    return dashboard_service.build_pack_options(db, current_retailer, limit=limit)


class DemandReportIn(BaseModel):
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    category_name: Optional[str] = None
    note: str = ""


@router.get("/demand-reports", summary="What this shop has reported as unmet")
def my_demand_reports(
    db: Session = Depends(get_db),
    current_retailer: RetailerProfile = Depends(get_current_retailer),
):
    return demand_report.list_reports(current_retailer)


@router.post("/demand-reports", summary="Report a product customers ask for but you cannot supply", status_code=201)
def report_demand(
    payload: DemandReportIn,
    db: Session = Depends(get_db),
    current_retailer: RetailerProfile = Depends(get_current_retailer),
):
    """The product loop's entry point.

    Onboarding captures unmet demand once; this lets a shopkeeper add to it the
    moment a customer asks for something they do not carry. The report is written
    into the same field the DemandEngine reads, then the pipeline is recomputed
    so the signal reaches nearby distributors immediately.
    """
    try:
        entry = demand_report.add_report(
            db, current_retailer,
            product_id=payload.product_id,
            product_name=payload.product_name,
            category_name=payload.category_name,
            note=payload.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        run_pipeline(db)
    except Exception:
        # The report is saved; a failed recompute only delays its effect.
        db.rollback()

    return entry


@router.get("/alerts", summary="What changed since you last looked")
def get_alerts(
    since: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Derived from live rows rather than a notifications table.

    An alert therefore cannot disagree with the thing it points at: it is a view
    over the opportunity or order itself. `since` is supplied by the client from
    its own last-seen timestamp; without it the window is the last seven days.
    """
    if current_user.role == "distributor":
        profile = db.query(DistributorProfile).filter(
            DistributorProfile.user_id == current_user.id
        ).first()
        items = alerts_service.for_distributor(db, profile, since) if profile else []
    else:
        profile = db.query(RetailerProfile).filter(
            RetailerProfile.user_id == current_user.id
        ).first()
        items = alerts_service.for_retailer(db, profile, since) if profile else []

    return {"items": items, "count": len(items)}


@router.get("/market", summary="Search what local suppliers actually stock")
def search_market(
    q: Optional[str] = None,
    category_id: Optional[str] = None,
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_retailer: RetailerProfile = Depends(get_current_retailer),
):
    """Products a supplier near this shop can deliver today, cheapest first."""
    return dashboard_service.search_local_market(
        db, current_retailer, query=q, category_id=category_id, limit=limit
    )


@router.get("/reorder", summary="Reorder suggestions from order history")
def reorder_suggestions(
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_retailer: RetailerProfile = Depends(get_current_retailer),
):
    """Products this shop has bought before, ordered by how overdue they are."""
    return dashboard_service.build_reorder_list(db, current_retailer)[:limit]


@router.get("/demand", summary="Read Demand Signals")
def get_demand(
    product_id: str = None,
    category_id: str = None,
    location_id: str = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(DemandSignal)

    if current_user.role == "retailer":
        profile = db.query(RetailerProfile).filter(RetailerProfile.user_id == current_user.id).first()
        if not profile:
            raise HTTPException(status_code=403, detail="Retailer profile not found")
        query = query.filter(DemandSignal.retailer_id == profile.id)
    elif current_user.role == "distributor":
        raise HTTPException(status_code=403, detail="Distributors must use /opportunities or /supply-gaps")
    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    if product_id:
        query = query.filter(DemandSignal.product_id == product_id)
    if category_id:
        query = query.filter(DemandSignal.category_id == category_id)
    if location_id:
        query = query.filter(DemandSignal.location_id == location_id)

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/supply-gaps", summary="Read Supply Gaps")
def get_supply_gaps(
    product_id: str = None,
    category_id: str = None,
    location_id: str = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "distributor" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only distributors can view supply gaps")

    query = db.query(SupplyGap)

    if product_id:
        query = query.filter(SupplyGap.product_id == product_id)
    if category_id:
        query = query.filter(SupplyGap.category_id == category_id)
    if location_id:
        query = query.filter(SupplyGap.location_id == location_id)

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/opportunities", summary="Get Distributor Opportunities")
def get_opportunities(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    min_score: float = Query(0, ge=0, le=100),
    db: Session = Depends(get_db),
    current_distributor: DistributorProfile = Depends(get_current_distributor)
):
    """The signed-in distributor's active opportunities, strongest first.

    Bounded: a distributor covering a large district can accumulate thousands of
    rows, and each one costs extra queries to serialise.
    """
    query = db.query(Opportunity).filter(
        Opportunity.distributor_id == current_distributor.id,
        Opportunity.status == "active",
        Opportunity.opportunity_score >= min_score,
    )
    total = query.count()
    rows = query.order_by(Opportunity.opportunity_score.desc()).offset(offset).limit(limit).all()

    return {
        "items": [dashboard_service.serialise_opportunity(db, row) for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + len(rows) < total,
    }


@router.get("/opportunities/{opportunity_id}", summary="Get Opportunity Details")
def get_opportunity(
    opportunity_id: str,
    db: Session = Depends(get_db),
    current_distributor: DistributorProfile = Depends(get_current_distributor)
):
    opp = db.query(Opportunity).filter(
        Opportunity.id == opportunity_id,
        Opportunity.distributor_id == current_distributor.id
    ).first()

    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    return dashboard_service.serialise_opportunity(db, opp)
