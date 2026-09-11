from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from app.models.intelligence import DemandSignal, SupplyGap
from app.models.catalogue import DistributorCatalogueItem
from app.models.profiles import DistributorProfile

import uuid

class SupplyGapEngine:
    @staticmethod
    def generate_id(product_id: str, category_id: str, location_id: str) -> str:
        """Generates a deterministic ID for a SupplyGap based on its canonical uniqueness."""
        id_str = f"{product_id or ''}:{category_id or ''}:{location_id or ''}"
        return str(uuid.uuid5(uuid.NAMESPACE_OID, id_str))

    @staticmethod
    def generate_supply_gaps(db: Session):
        """
        Cross-references aggregated DemandSignals against DistributorCatalogueItems
        to generate SupplyGaps idempotently.
        """
        # 1. Aggregate Demand Signals
        # We group by product_id, category_id, location_id and count unique retailers
        demand_aggregates = db.query(
            DemandSignal.product_id,
            DemandSignal.category_id,
            DemandSignal.location_id,
            func.count(func.distinct(DemandSignal.retailer_id)).label('retailer_count')
        ).group_by(
            DemandSignal.product_id,
            DemandSignal.category_id,
            DemandSignal.location_id
        ).all()

        gaps = []

        for demand in demand_aggregates:
            # We must have a product or a category. If both are None, skip.
            if not demand.product_id and not demand.category_id:
                continue

            # 2. Retrieve Supply
            # Query DistributorCatalogueItem joined with DistributorProfile
            query = db.query(DistributorCatalogueItem).join(DistributorProfile)
            
            # Filter by Geography (exact location match)
            if demand.location_id:
                query = query.filter(DistributorProfile.location_id == demand.location_id)
            else:
                # If location is unknown, we cannot safely match it against all other unknown locations
                # because they are not physically the same place.
                # In this system, if location is unknown, we skip supply calculation,
                # or assume 0 supply because we cannot geographically fulfill it.
                pass

            # Filter by Product or Category
            if demand.product_id:
                # Need to match exact product
                query = query.filter(DistributorCatalogueItem.product_id == demand.product_id)
            elif demand.category_id:
                # Need to match category. A product belongs to a category.
                from app.models.catalogue import Product
                query = query.join(Product).filter(Product.category_id == demand.category_id)
            
            # Only active/available listings
            query = query.filter(DistributorCatalogueItem.is_active == True)
            
            suppliers = query.all()

            # 3. Calculate Supply Levels
            unique_suppliers = set()
            available = set()
            low_stock = set()
            out_of_stock = set()

            for item in suppliers:
                # Skip if we matched on location_id=None because that means we pulled ALL distributors
                # with no location. They cannot fulfill an unknown location reliably.
                if not demand.location_id and not item.distributor.location_id:
                     # This is a match of unknown to unknown, which is invalid.
                     continue

                dist_id = item.distributor_id
                unique_suppliers.add(dist_id)
                
                status = item.stock_status
                if not status:
                    if item.available_stock == 0:
                        status = "out_of_stock"
                    elif item.available_stock < 10:
                        status = "low_stock"
                    else:
                        status = "available"
                
                if status == "available":
                    available.add(dist_id)
                elif status == "low_stock":
                    low_stock.add(dist_id)
                else:
                    out_of_stock.add(dist_id)
            
            supplier_count = len(unique_suppliers)
            available_count = len(available)
            low_stock_count = len(low_stock) - len(available)
            if low_stock_count < 0: low_stock_count = 0
            
            out_of_stock_count = len(out_of_stock) - len(available) - len(low_stock)
            if out_of_stock_count < 0: out_of_stock_count = 0

            # 4. Determine Supply Level & Gap Score
            if available_count >= 4:
                supply_level = "strong"
                supply_score = 4.0
            elif available_count >= 2:
                supply_level = "adequate"
                supply_score = 2.0
            elif available_count == 1:
                supply_level = "limited"
                supply_score = 1.0
            else:
                supply_level = "unavailable"
                supply_score = 0.0

            normalized_demand = min(demand.retailer_count, 10.0)
            gap_score = max(0.0, normalized_demand - supply_score)

            gaps.append({
                "id": SupplyGapEngine.generate_id(demand.product_id, demand.category_id, demand.location_id),
                "product_id": demand.product_id,
                "category_id": demand.category_id,
                "location_id": demand.location_id,
                "retailer_demand_count": demand.retailer_count,
                "supplier_count": supplier_count,
                "available_supplier_count": available_count,
                "low_stock_supplier_count": low_stock_count,
                "out_of_stock_supplier_count": out_of_stock_count,
                "gap_score": gap_score,
                "supply_level": supply_level
            })

        # Idempotent insert via PostgreSQL ON CONFLICT
        if not gaps:
            return {"status": "success", "inserted": 0, "processed_aggregates": len(demand_aggregates)}

        unique_gaps = {}
        for g in gaps:
            key = g['id']
            unique_gaps[key] = g
        
        insert_stmt = insert(SupplyGap).values(list(unique_gaps.values()))
        
        # On conflict do update
        on_conflict_stmt = insert_stmt.on_conflict_do_update(
            index_elements=['id'],
            set_={
                'retailer_demand_count': insert_stmt.excluded.retailer_demand_count,
                'supplier_count': insert_stmt.excluded.supplier_count,
                'available_supplier_count': insert_stmt.excluded.available_supplier_count,
                'low_stock_supplier_count': insert_stmt.excluded.low_stock_supplier_count,
                'out_of_stock_supplier_count': insert_stmt.excluded.out_of_stock_supplier_count,
                'gap_score': insert_stmt.excluded.gap_score,
                'supply_level': insert_stmt.excluded.supply_level,
                'updated_at': func.now()
            }
        )
        
        db.execute(on_conflict_stmt)
        db.commit()

        return {"status": "success", "processed_aggregates": len(demand_aggregates), "gaps_generated": len(unique_gaps)}
