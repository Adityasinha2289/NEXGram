"""In-app demand reporting.

Onboarding captures a shop's unmet needs once. But the product loop only turns
if a retailer can say "a customer asked for this again today" whenever it
happens, so this appends to the same `unmet_needs` payload the DemandEngine
already reads rather than introducing a parallel store the engine would ignore.

Shape written to RetailerProfile.unmet_needs:

    {
      "categories": ["Dairy"],           # existing onboarding field
      "other": "paneer nahi milta",      # existing free text the NLP scans
      "reports": [                       # appended here, newest last
        {"product": "Paneer", "productId": "prod_paneer",
         "category": "Dairy", "note": "...", "reportedAt": "..."}
      ]
    }

`other` is kept in sync because it is what the keyword extractor reads; the
structured `reports` list is what the UI renders back to the shopkeeper.
"""

from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.catalogue import Category, Product
from app.models.profiles import RetailerProfile

MAX_REPORTS = 50


def _normalise(profile: RetailerProfile) -> Dict:
    raw = profile.unmet_needs
    if isinstance(raw, dict):
        return {
            "categories": list(raw.get("categories") or []),
            "other": raw.get("other") or "",
            "reports": list(raw.get("reports") or []),
        }
    # Older rows stored plain text.
    return {"categories": [], "other": str(raw) if raw else "", "reports": []}


def list_reports(profile: RetailerProfile) -> List[Dict]:
    return list(reversed(_normalise(profile)["reports"]))


def add_report(
    db: Session,
    profile: RetailerProfile,
    product_id: Optional[str] = None,
    product_name: Optional[str] = None,
    category_name: Optional[str] = None,
    note: str = "",
) -> Dict:
    """Records one "customer asked, I could not supply" event.

    Either a canonical product (preferred - it matches straight to a supply gap)
    or free text. Free text still counts: the demand engine keyword-scans it, and
    refusing an unrecognised product would silently drop exactly the novel demand
    this feature exists to catch.
    """
    payload = _normalise(profile)

    product = db.query(Product).filter(Product.id == product_id).first() if product_id else None
    if product:
        product_name = product.canonical_name
        category = db.query(Category).filter(Category.id == product.category_id).first()
        if category:
            category_name = category.name

    label = (product_name or note or "").strip()
    if not label:
        raise ValueError("Product ya note mein se kuch to batana hoga")

    entry = {
        "product": product_name or None,
        "productId": product.id if product else None,
        "category": category_name or None,
        "note": note.strip(),
        "reportedAt": datetime.utcnow().isoformat(),
    }
    payload["reports"] = (payload["reports"] + [entry])[-MAX_REPORTS:]

    if category_name and category_name not in payload["categories"]:
        payload["categories"].append(category_name)

    # The engine's keyword pass reads `other`, so anything reported has to land
    # there too or the report would not become a signal.
    mentions = " ".join(
        part for part in [payload["other"], label.lower(), entry["note"].lower()] if part
    ).strip()
    payload["other"] = mentions[-2000:]

    profile.unmet_needs = payload
    # JSON columns are replaced wholesale; flag it so SQLAlchemy emits the UPDATE.
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(profile, "unmet_needs")
    db.commit()
    db.refresh(profile)

    return entry
