from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.models.profiles import RetailerProfile
from app.models.intelligence import DemandSignal
from app.modules.intelligence.services.normalization import NormalizationService

import uuid

class DemandEngine:
    PRODUCT_DICTIONARY = {
        'Dairy': ['paneer', 'milk', 'butter', 'curd', 'ghee'],
        'Staples': ['atta', 'rice', 'dal', 'sugar', 'salt'],
        'Beverages': ['water', 'juice', 'soft drink', 'cold drink'],
        'Snacks': ['biscuits', 'namkeen', 'chips', 'snacks'],
        'Spices': ['masala', 'turmeric', 'chilli', 'cumin'],
        'Household': ['detergent', 'soap', 'cleaner']
    }

    SCORING_WEIGHTS = {
        'EXPLICIT_UNMET_NEED': 3.0,
        'PRODUCT_REQUIREMENT': 2.0,
        'REQUESTED_CATEGORY': 1.0
    }
    
    @staticmethod
    def generate_id(retailer_id: str, product_id: str, category_id: str, signal_type: str, source: str) -> str:
        """Generates a deterministic ID for a DemandSignal based on its canonical uniqueness."""
        id_str = f"{retailer_id or ''}:{product_id or ''}:{category_id or ''}:{signal_type}:{source}"
        return str(uuid.uuid5(uuid.NAMESPACE_OID, id_str))

    @staticmethod
    def generate_demand(db: Session):
        """
        Reads retailer profiles, extracts demand, and idempotently upserts to DemandSignals.
        """
        retailers = db.query(RetailerProfile).all()
        signals = []

        for retailer in retailers:
            location_id = retailer.location_id
            retailer_id = retailer.id

            # 1. Demanded Categories
            demanded_cats = retailer.demanded_categories or []
            for cat in demanded_cats:
                cat_id = NormalizationService.map_category_id(db, cat)
                signals.append({
                    "id": DemandEngine.generate_id(retailer_id, None, cat_id, "category_requirement", cat),
                    "retailer_id": retailer_id,
                    "product_id": None,
                    "category_id": cat_id,
                    "location_id": location_id,
                    "signal_type": "category_requirement",
                    "source": cat,
                    "confidence": DemandEngine.SCORING_WEIGHTS['REQUESTED_CATEGORY']
                })

            # 2. Unmet Needs Categories
            unmet_needs = retailer.unmet_needs or {}
            if isinstance(unmet_needs, dict):
                unmet_cats = unmet_needs.get('categories', [])
                unmet_other = unmet_needs.get('other', '')
            else:
                unmet_cats = []
                unmet_other = str(unmet_needs) if unmet_needs else ""

            for cat in unmet_cats:
                cat_id = NormalizationService.map_category_id(db, cat)
                signals.append({
                    "id": DemandEngine.generate_id(retailer_id, None, cat_id, "unmet_need", cat),
                    "retailer_id": retailer_id,
                    "product_id": None,
                    "category_id": cat_id,
                    "location_id": location_id,
                    "signal_type": "unmet_need",
                    "source": cat,
                    "confidence": DemandEngine.SCORING_WEIGHTS['EXPLICIT_UNMET_NEED']
                })

            # 3. Requirements (Text/Array parsing)
            reqs = retailer.requirements or []
            if isinstance(reqs, list):
                reqs_text = " ".join(reqs).lower()
            else:
                reqs_text = str(reqs).lower()

            unmet_other_text = unmet_other.lower()

            for category, keywords in DemandEngine.PRODUCT_DICTIONARY.items():
                for keyword in keywords:
                    cat_id = NormalizationService.map_category_id(db, category)
                    prod_id = NormalizationService.map_product_id(db, keyword)

                    if keyword in reqs_text:
                        signals.append({
                            "id": DemandEngine.generate_id(retailer_id, prod_id, cat_id, "product_requirement", keyword),
                            "retailer_id": retailer_id,
                            "product_id": prod_id,
                            "category_id": cat_id,
                            "location_id": location_id,
                            "signal_type": "product_requirement",
                            "source": keyword,
                            "confidence": DemandEngine.SCORING_WEIGHTS['PRODUCT_REQUIREMENT']
                        })
                    
                    if keyword in unmet_other_text:
                        signals.append({
                            "id": DemandEngine.generate_id(retailer_id, prod_id, cat_id, "unmet_need", keyword),
                            "retailer_id": retailer_id,
                            "product_id": prod_id,
                            "category_id": cat_id,
                            "location_id": location_id,
                            "signal_type": "unmet_need",
                            "source": keyword,
                            "confidence": DemandEngine.SCORING_WEIGHTS['EXPLICIT_UNMET_NEED']
                        })

        # Idempotent insert via PostgreSQL ON CONFLICT
        # Ensure we have data
        if not signals:
            return {"status": "success", "inserted": 0, "processed": len(retailers)}

        # Need to deduplicate within the batch itself to avoid constraint errors
        unique_signals = {}
        for s in signals:
            key = s['id']
            # Prefer higher confidence if there are duplicates for some reason
            if key not in unique_signals or s['confidence'] > unique_signals[key]['confidence']:
                unique_signals[key] = s
        
        insert_stmt = insert(DemandSignal).values(list(unique_signals.values()))
        
        # On conflict do nothing for identical signals
        on_conflict_stmt = insert_stmt.on_conflict_do_nothing(
            index_elements=['id']
        )
        
        db.execute(on_conflict_stmt)
        db.commit()

        return {"status": "success", "processed_retailers": len(retailers), "signals_generated": len(unique_signals)}
