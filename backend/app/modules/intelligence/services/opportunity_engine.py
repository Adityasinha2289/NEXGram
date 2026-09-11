from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import func
from app.models.intelligence import Opportunity, SupplyGap
from app.models.profiles import DistributorProfile
from app.models.catalogue import Product, Category
from typing import Dict, Any, List
import uuid

class OpportunityEngine:
    @staticmethod
    def generate_id(distributor_id: str, product_id: str, category_id: str, location_id: str) -> str:
        """Generates a deterministic ID for a Distributor Opportunity."""
        id_str = f"{distributor_id}:{product_id or ''}:{category_id or ''}:{location_id or ''}"
        return str(uuid.uuid5(uuid.NAMESPACE_OID, id_str))
    
    @staticmethod
    def get_competition_level(supplier_count: int) -> str:
        if supplier_count == 0: return 'Very Low'
        if supplier_count == 1: return 'Low'
        if supplier_count >= 4: return 'High'
        return 'Medium'

    @staticmethod
    def evaluate_fit(distributor: DistributorProfile, gap: SupplyGap, db: Session) -> Dict[str, str]:
        # Geographic fit
        # We assume distributor.location and gap.location are eager loaded or accessible
        dist_loc = distributor.location
        # To avoid N+1, gap.location might not be loaded. 
        # But we can query it safely or assume it's preloaded if we do it in bulk.
        # Actually, since gap has location_id, we can look up the Location object from a preloaded dict.
        # Let's assume we pass in dicts for locations.
        pass

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
        products = {p.id: p.name for p in db.query(Product).all()}

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
                base_score = gap.gap_score or 0.0
                volume_bonus = min(20.0, float(gap.retailer_demand_count or 0) * 2.0)
                
                comp_adj = 0.0
                if comp_level == 'Very Low': comp_adj = 10.0
                elif comp_level == 'Low': comp_adj = 5.0
                elif comp_level == 'High': comp_adj = -10.0
                
                raw_score = base_score + volume_bonus + comp_adj
                opportunity_score = max(0.0, min(100.0, raw_score))
                
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
                
                demand_text = f"{retailers} retailer{'s are' if retailers != 1 else ' is'} looking for {target_name}."
                supply_text = f"No local distributors currently supply it." if suppliers == 0 else f"Only {suppliers} local distributor{'s' if suppliers != 1 else ''} currently suppl{'y' if suppliers != 1 else 'ies'} it."
                summary_text = 'Moderate opportunity in the market.'
                if opp_level == 'Strong': summary_text = 'High demand with limited supply creates a strong commercial opportunity.'
                elif opp_level == 'Low': summary_text = 'Market may already be saturated or demand is too weak.'
                
                evidence = {
                    "demand": demand_text,
                    "supply": supply_text,
                    "competition": f"Local competition is {comp_level.lower()}.",
                    "fit": fit_exp,
                    "summary": summary_text
                }
                
                opp_id = OpportunityEngine.generate_id(dist.id, gap.product_id, gap.category_id, gap.location_id)
                
                opportunities.append({
                    "id": opp_id,
                    "distributor_id": dist.id,
                    "product_id": gap.product_id,
                    "category_id": gap.category_id,
                    "location_id": gap.location_id,
                    "demand_score": float(gap.retailer_demand_count or 0), # using raw count as proxy for demand_score in db if needed, or normalized
                    "supply_score": float(gap.supplier_count or 0),
                    "competition_score": comp_adj,
                    "opportunity_score": opportunity_score,
                    "potential_retailer_count": gap.retailer_demand_count,
                    "recommended_initial_stock": initial_stock,
                    "distributor_fit": fit_level,
                    "evidence_json": evidence,
                    "status": "active"
                })

        if not opportunities:
            return {"status": "success", "inserted": 0, "processed_gaps": len(gaps)}

        # Deduplicate locally just in case
        unique_opps = {o['id']: o for o in opportunities}
        
        insert_stmt = insert(Opportunity).values(list(unique_opps.values()))
        
        on_conflict_stmt = insert_stmt.on_conflict_do_update(
            index_elements=['id'],
            set_={
                'demand_score': insert_stmt.excluded.demand_score,
                'supply_score': insert_stmt.excluded.supply_score,
                'competition_score': insert_stmt.excluded.competition_score,
                'opportunity_score': insert_stmt.excluded.opportunity_score,
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

        return {"status": "success", "processed_gaps": len(gaps), "opportunities_generated": len(unique_opps)}
