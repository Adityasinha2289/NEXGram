from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import func
from app.models.intelligence import Opportunity, SupplyGap
from app.models.profiles import DistributorProfile
from app.models.catalogue import Product, Category
from typing import Any, Dict
import uuid

class OpportunityEngine:
    """Scores, for one distributor, how attractive one local supply gap is.

    The three components below sum to 100, so a score is a true percentage of
    the best opportunity the model can describe: saturated unmet demand, nobody
    supplying it locally, and a distributor whose own area and categories match.
    Keeping the weights explicit (rather than bonuses stacked on a raw gap score)
    is what lets the UI show a reader the arithmetic behind any number.
    """

    DEMAND_WEIGHT = 45.0
    SCARCITY_WEIGHT = 35.0
    FIT_WEIGHT = 20.0

    # Retailer count at which demand counts as saturated. Chosen so a signal
    # from a realistic rural cluster (10-15 shops) can reach full marks.
    DEMAND_SATURATION = 15.0

    # Share of SCARCITY_WEIGHT earned, keyed by how many distributors can
    # actually fulfil today. Four or more is a served market: no scarcity left.
    SCARCITY_BY_SUPPLIER_COUNT = {0: 1.0, 1: 0.75, 2: 0.5, 3: 0.25}

    # Share of FIT_WEIGHT earned by how closely the distributor already operates
    # where the gap is.
    FIT_BY_LOCATION_LEVEL = {'area': 1.0, 'district': 0.6, 'district_radius': 0.6}

    @staticmethod
    def generate_id(distributor_id: str, product_id: str, category_id: str, location_id: str) -> str:
        """Generates a deterministic ID for a Distributor Opportunity."""
        id_str = f"{distributor_id}:{product_id or ''}:{category_id or ''}:{location_id or ''}"
        return str(uuid.uuid5(uuid.NAMESPACE_OID, id_str))

    @staticmethod
    def score_demand(retailer_count: int) -> float:
        """Unmet demand, capped at saturation so one huge cluster can't dominate."""
        ratio = min(float(retailer_count or 0) / OpportunityEngine.DEMAND_SATURATION, 1.0)
        return round(ratio * OpportunityEngine.DEMAND_WEIGHT, 2)

    @staticmethod
    def score_scarcity(available_supplier_count: int) -> float:
        """How underserved the gap is.

        Counts distributors that can fulfil *now*, not merely list the product:
        three suppliers all out of stock is still an opportunity.
        """
        share = OpportunityEngine.SCARCITY_BY_SUPPLIER_COUNT.get(int(available_supplier_count or 0), 0.0)
        return round(share * OpportunityEngine.SCARCITY_WEIGHT, 2)

    @staticmethod
    def score_fit(location_level: str) -> float:
        """How well the distributor's existing footprint covers the gap."""
        share = OpportunityEngine.FIT_BY_LOCATION_LEVEL.get(location_level, 0.0)
        return round(share * OpportunityEngine.FIT_WEIGHT, 2)

    @staticmethod
    def _retire_stale(db: Session, live_ids: set) -> int:
        """Marks active opportunities absent from the latest run as resolved."""
        stale = db.query(Opportunity).filter(Opportunity.status == "active")
        if live_ids:
            stale = stale.filter(Opportunity.id.notin_(live_ids))
        return stale.update({"status": "resolved"}, synchronize_session=False)

    @staticmethod
    def get_competition_level(supplier_count: int) -> str:
        if supplier_count == 0: return 'Very Low'
        if supplier_count == 1: return 'Low'
        if supplier_count >= 4: return 'High'
        return 'Medium'

    @staticmethod
    def generate_opportunities(db: Session) -> Dict[str, Any]:
        """
        Reads all SupplyGaps and DistributorProfiles.
        Evaluates fit for each distributor against each gap.
        Calculates scores and idempotently upserts Opportunities.
        """
        # 1. Preload data
        distributors = db.query(DistributorProfile).all()
        gaps = db.query(SupplyGap).all()
        
        # Preload Locations to avoid N+1
        from app.models.profiles import Location
        locations = {loc.id: loc for loc in db.query(Location).all()}
        
        # Preload Categories and Products to resolve names for evidence
        categories = {c.id: c.name for c in db.query(Category).all()}
        products = {p.id: p.canonical_name for p in db.query(Product).all()}

        # Products each distributor can already fulfil today. An opportunity to
        # start supplying something you already stock is noise; one to restock
        # something you list but have run out of is not, so this deliberately
        # keys on in-stock listings rather than on listings alone.
        from app.models.catalogue import DistributorCatalogueItem
        already_supplied = set()
        stocked_rows = db.query(
            DistributorCatalogueItem.distributor_id,
            DistributorCatalogueItem.product_id,
        ).filter(
            DistributorCatalogueItem.is_active == True,
            DistributorCatalogueItem.stock_status == "available",
            DistributorCatalogueItem.available_stock > 0,
        ).all()
        for distributor_id, product_id in stocked_rows:
            already_supplied.add((distributor_id, product_id))

        opportunities = []

        for gap in gaps:
            # Skip gaps with no location (global gaps) for distributor assignment,
            # unless a distributor has global reach, which we don't model right now.
            if not gap.location_id:
                continue
                
            gap_loc = locations.get(gap.location_id)
            if not gap_loc:
                continue
                
            # Determine gap category/product names for text and fit matching
            gap_cat_name = categories.get(gap.category_id, "").lower() if gap.category_id else ""
            gap_prod_name = products.get(gap.product_id, "").lower() if gap.product_id else ""
            
            if gap.product_id and not gap_cat_name:
                # Fallback to product's category if possible, but let's assume category_id is populated.
                pass

            for dist in distributors:
                # Nothing to act on if they already stock this product.
                if gap.product_id and (dist.id, gap.product_id) in already_supplied:
                    continue

                # 2. Evaluate Fit
                dist_loc = locations.get(dist.location_id)
                if not dist_loc:
                    continue
                
                # Check location match
                location_level = 'unknown'
                location_fit = False
                
                # Normalize text safely
                def norm(s): return str(s).strip().lower() if s else ""
                
                dist_area = norm(dist_loc.area)
                dist_dist = norm(dist_loc.district)
                gap_area = norm(gap_loc.area)
                gap_dist = norm(gap_loc.district)
                
                if dist_area and dist_area == gap_area:
                    location_fit = True
                    location_level = 'area'
                elif not gap_area and dist_dist == gap_dist:
                    location_fit = True
                    location_level = 'district'
                elif dist_dist == gap_dist:
                    location_fit = True
                    location_level = 'district_radius'
                    
                if not location_fit:
                    continue # Not Suitable: Location mismatch
                    
                # Check category match
                operates_in_cat = False
                dist_cats = dist.product_categories or []
                dist_biz_cat = norm(dist.business_category)
                
                if gap_cat_name:
                    if dist_biz_cat == gap_cat_name:
                        operates_in_cat = True
                    for c in dist_cats:
                        if norm(c) == gap_cat_name:
                            operates_in_cat = True
                            break
                            
                # If gap is a product but we don't have category string mapped, this is an edge case. 
                # We assume operates_in_cat = True for MVP if we can't determine it, to be safe, 
                # but let's stick to strict matching. If no gap_cat_name, we skip or assume True.
                if not gap_cat_name:
                     operates_in_cat = True # Permissive if category mapping fails
                     
                if not operates_in_cat:
                    continue # Not Suitable (or Low fit, but prompt says exclude incompatible)
                    
                fit_level = 'Medium'
                fit_exp = 'Moderate match: Relevant to your service area and category.'
                if location_level == 'area':
                    fit_level = 'High'
                    fit_exp = 'Strong match: Operates in your primary area and matches your product categories.'
                    
                # 3. Derive Competition
                comp_level = OpportunityEngine.get_competition_level(gap.supplier_count)

                # 4. Compute Scores
                demand_score = OpportunityEngine.score_demand(gap.retailer_demand_count)
                scarcity_score = OpportunityEngine.score_scarcity(gap.available_supplier_count)
                fit_score = OpportunityEngine.score_fit(location_level)

                opportunity_score = round(
                    max(0.0, min(100.0, demand_score + scarcity_score + fit_score)), 1
                )
                
                # Derive Opp Level for Summary
                opp_level = 'Low'
                if opportunity_score >= 80: opp_level = 'Strong'
                elif opportunity_score >= 65: opp_level = 'Good'
                elif opportunity_score >= 45: opp_level = 'Moderate'
                
                # 5. Stock Recommendation
                initial_stock = 0
                if gap.product_id:
                    initial_stock = max(10, (gap.retailer_demand_count or 0) * 5)
                    
                # 6. Evidence Natural Language
                is_product = bool(gap.product_id)
                target_name = gap_prod_name.title() if is_product else gap_cat_name.title()
                retailers = gap.retailer_demand_count or 0
                suppliers = gap.supplier_count or 0
                fulfillable = gap.available_supplier_count or 0

                # Confidence describes how much evidence the score rests on, not how
                # good the opportunity is. A thin signal stays visible but labelled,
                # which is what makes the cold-start state honest rather than hidden.
                if retailers >= 10:
                    confidence = 'High'
                elif retailers >= 4:
                    confidence = 'Medium'
                else:
                    confidence = 'Low'

                demand_text = f"{retailers} retailer{'s are' if retailers != 1 else ' is'} looking for {target_name}."
                supply_text = f"No local distributors currently supply it." if suppliers == 0 else f"Only {suppliers} local distributor{'s' if suppliers != 1 else ''} currently suppl{'y' if suppliers != 1 else 'ies'} it."
                summary_text = 'Moderate opportunity in the market.'
                if opp_level == 'Strong': summary_text = 'High demand with limited supply creates a strong commercial opportunity.'
                elif opp_level == 'Low': summary_text = 'Market may already be saturated or demand is too weak.'
                
                # The breakdown is the product's core promise: never show a score
                # without the arithmetic that produced it.
                evidence = {
                    "demand": demand_text,
                    "supply": supply_text,
                    "competition": f"Local competition is {comp_level.lower()}.",
                    "fit": fit_exp,
                    "summary": summary_text,
                    "confidence": confidence,
                    "breakdown": [
                        {
                            "label": "Local demand",
                            "points": demand_score,
                            "max": OpportunityEngine.DEMAND_WEIGHT,
                            "detail": f"{retailers} of a saturating {int(OpportunityEngine.DEMAND_SATURATION)} retailers",
                            "source_type": "OBSERVED"
                        },
                        {
                            "label": "Supply scarcity",
                            "points": scarcity_score,
                            "max": OpportunityEngine.SCARCITY_WEIGHT,
                            "detail": f"{fulfillable} distributor{'' if fulfillable == 1 else 's'} can fulfil today",
                            "source_type": "OBSERVED"
                        },
                        {
                            "label": "Your fit",
                            "points": fit_score,
                            "max": OpportunityEngine.FIT_WEIGHT,
                            "detail": "Your primary area" if location_level == 'area' else "Within your district",
                            "source_type": "MODEL_INFERENCE"
                        },
                    ],
                    "total": opportunity_score,
                }
                
                opp_id = OpportunityEngine.generate_id(dist.id, gap.product_id, gap.category_id, gap.location_id)
                
                opportunities.append({
                    "id": opp_id,
                    "distributor_id": dist.id,
                    "product_id": gap.product_id,
                    "category_id": gap.category_id,
                    "location_id": gap.location_id,
                    "demand_score": demand_score,
                    "supply_score": scarcity_score,
                    "fit_score": fit_score,
                    "competition_score": float(suppliers),
                    "opportunity_score": opportunity_score,
                    "confidence": confidence,
                    "potential_retailer_count": gap.retailer_demand_count,
                    "recommended_initial_stock": initial_stock,
                    "distributor_fit": fit_level,
                    "evidence_json": evidence,
                    "status": "active"
                })

        # Deduplicate locally just in case
        unique_opps = {o['id']: o for o in opportunities}

        # Retire anything that no longer qualifies — most often because the
        # distributor acted on it and now stocks the product. Without this the
        # feed keeps recommending work the user has already done. Rows are kept
        # rather than deleted so the history stays auditable.
        retired = OpportunityEngine._retire_stale(db, set(unique_opps))

        if not opportunities:
            db.commit()
            return {
                "status": "success",
                "inserted": 0,
                "processed_gaps": len(gaps),
                "retired": retired,
            }
        
        insert_stmt = insert(Opportunity).values(list(unique_opps.values()))
        
        on_conflict_stmt = insert_stmt.on_conflict_do_update(
            index_elements=['id'],
            set_={
                'demand_score': insert_stmt.excluded.demand_score,
                'supply_score': insert_stmt.excluded.supply_score,
                'fit_score': insert_stmt.excluded.fit_score,
                'competition_score': insert_stmt.excluded.competition_score,
                'opportunity_score': insert_stmt.excluded.opportunity_score,
                'confidence': insert_stmt.excluded.confidence,
                'potential_retailer_count': insert_stmt.excluded.potential_retailer_count,
                'recommended_initial_stock': insert_stmt.excluded.recommended_initial_stock,
                'distributor_fit': insert_stmt.excluded.distributor_fit,
                'evidence_json': insert_stmt.excluded.evidence_json,
                'status': 'active',
                'updated_at': func.now()
            }
        )
        
        db.execute(on_conflict_stmt)
        db.commit()

        return {
            "status": "success",
            "processed_gaps": len(gaps),
            "opportunities_generated": len(unique_opps),
            "retired": retired,
        }
