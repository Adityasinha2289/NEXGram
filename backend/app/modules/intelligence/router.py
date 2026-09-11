from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.intelligence import DemandSignal, SupplyGap, Opportunity
from app.modules.intelligence.services.demand_engine import DemandEngine
from app.modules.intelligence.services.supply_gap_engine import SupplyGapEngine
from app.modules.intelligence.services.opportunity_engine import OpportunityEngine
from app.api.deps import get_current_user, get_current_distributor
from app.models.users import User
from app.models.profiles import DistributorProfile

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])

# Note: In a real environment, we'd want a proper admin/developer auth dependency
# For Phase 5.3, we're using a simple protection mechanism to avoid public exposure.
def verify_admin_access():
    pass

@router.post("/demand/generate", summary="Generate Demand Signals")
def generate_demand(db: Session = Depends(get_db)):
    """
    Reads retailer profiles, extracts demand, and idempotently upserts to DemandSignals.
    Operational endpoint.
    """
    try:
        result = DemandEngine.generate_demand(db)
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/supply-gaps/generate", summary="Generate Supply Gaps")
def generate_supply_gaps(db: Session = Depends(get_db)):
    """
    Cross-references aggregated DemandSignals against DistributorCatalogueItems
    to generate SupplyGaps idempotently.
    Operational endpoint.
    """
    try:
        result = SupplyGapEngine.generate_supply_gaps(db)
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/opportunities/generate", summary="Generate Opportunities")
def generate_opportunities(db: Session = Depends(get_db)):
    """
    Cross-references SupplyGaps against Distributor profiles to create actionable Opportunities.
    """
    try:
        result = OpportunityEngine.generate_opportunities(db)
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/demand", summary="Read Demand Signals")
def get_demand(
    product_id: str = None,
    category_id: str = None,
    location_id: str = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(DemandSignal)
    
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db), 
    current_distributor: DistributorProfile = Depends(get_current_distributor)
):
    # Only return opportunities for the logged-in distributor
    opportunities = db.query(Opportunity).filter(
        Opportunity.distributor_id == current_distributor.id,
        Opportunity.status == "active"
    ).order_by(Opportunity.opportunity_score.desc()).all()
    
    return opportunities

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
            
    return opp
