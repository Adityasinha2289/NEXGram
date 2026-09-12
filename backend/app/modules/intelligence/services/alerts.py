"""What changed since a user last looked.

A distributor who has to open the app to discover a new opportunity will mostly
not discover it. This derives alerts from data already persisted rather than
adding an events table: an opportunity carries generated_at/updated_at, an order
carries its status, and "new since you last looked" is a comparison against a
timestamp the client sends.

Deliberately derived rather than stored. A notifications table would need its own
lifecycle - creation, delivery, read state, cleanup - and would drift out of
agreement with the rows it describes. Here an alert cannot contradict the
opportunity it points at, because it *is* the opportunity.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.commerce import Order
from app.models.intelligence import Opportunity
from app.models.profiles import DistributorProfile, RetailerProfile

# Below this an alert is noise rather than news.
MIN_ALERT_SCORE = 60.0


def _naive(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    return value.replace(tzinfo=None) if value.tzinfo else value


def _since(since: Optional[datetime], default_days: int = 7) -> datetime:
    if since:
        return _naive(since)
    return datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=default_days)


def _age(moment: Optional[datetime]) -> str:
    if not moment:
        return ""
    delta = datetime.now(timezone.utc).replace(tzinfo=None) - _naive(moment)
    if delta.days >= 1:
        return f"{delta.days} din pehle"
    hours = delta.seconds // 3600
    if hours >= 1:
        return f"{hours} ghante pehle"
    return "abhi"


def for_distributor(db: Session, distributor: DistributorProfile,
                    since: Optional[datetime] = None) -> List[dict]:
    """New opportunities worth acting on, and orders waiting on this supplier."""
    cutoff = _since(since)
    alerts = []

    opportunities = db.query(Opportunity).filter(
        Opportunity.distributor_id == distributor.id,
        Opportunity.status == "active",
        Opportunity.opportunity_score >= MIN_ALERT_SCORE,
    ).order_by(Opportunity.opportunity_score.desc()).limit(20).all()

    for opp in opportunities:
        seen_at = _naive(opp.updated_at) or _naive(opp.generated_at)
        if not seen_at or seen_at < cutoff:
            continue
        alerts.append({
            "id": f"opp:{opp.id}",
            "type": "opportunity",
            "severity": "success" if opp.opportunity_score >= 80 else "primary",
            "title": f"Naya signal: {int(round(opp.opportunity_score))}/100",
            "body": (opp.evidence_json or {}).get("demand", "Aapke area mein nayi demand hai."),
            "confidence": opp.confidence,
            "at": (seen_at.isoformat() if seen_at else None),
            "age": _age(seen_at),
            "link": f"/distributor/opportunities/{opp.id}",
        })

    # Orders waiting on them are more urgent than any signal, so they lead.
    pending = db.query(Order).filter(
        Order.distributor_id == distributor.id,
        Order.status == "requested",
    ).order_by(Order.created_at.desc()).limit(10).all()

    for order in pending:
        alerts.insert(0, {
            "id": f"order:{order.id}",
            "type": "order",
            "severity": "warning",
            "title": f"Order {order.order_number} pending hai",
            "body": f"Rs {order.total:,.0f} ka order aapke jawab ka intezaar kar raha hai.",
            "confidence": None,
            "at": (_naive(order.created_at).isoformat() if order.created_at else None),
            "age": _age(order.created_at),
            "link": f"/distributor/orders/{order.id}",
        })

    return alerts


def for_retailer(db: Session, retailer: RetailerProfile,
                 since: Optional[datetime] = None) -> List[dict]:
    """Order progress, and reorders that have come due."""
    from app.modules.intelligence.services.dashboard import build_reorder_list

    alerts = []

    moving = db.query(Order).filter(
        Order.retailer_id == retailer.id,
        Order.status.in_(["accepted", "preparing", "ready"]),
    ).order_by(Order.updated_at.desc().nullslast()).limit(10).all()

    LABELS = {
        "accepted": "accept ho gaya",
        "preparing": "taiyar ho raha hai",
        "ready": "delivery ke liye ready hai",
    }
    for order in moving:
        moment = _naive(order.updated_at) or _naive(order.created_at)
        alerts.append({
            "id": f"order:{order.id}",
            "type": "order",
            "severity": "primary" if order.status != "ready" else "success",
            "title": f"Order {order.order_number} {LABELS.get(order.status, order.status)}",
            "body": f"Rs {order.total:,.0f}",
            "confidence": None,
            "at": moment.isoformat() if moment else None,
            "age": _age(moment),
            "link": f"/retailer/orders/{order.id}",
        })

    for item in build_reorder_list(db, retailer):
        if not item["dueNow"]:
            continue
        alerts.append({
            "id": f"reorder:{item['productId']}",
            "type": "reorder",
            "severity": "warning",
            "title": f"{item['name']} dobara mangwane ka time hai",
            "body": item["suggestion"],
            "confidence": None,
            "at": item["lastOrderedDate"],
            "age": f"{item['daysAgo']} din pehle",
            "link": "/retailer/reorder",
        })

    return alerts
