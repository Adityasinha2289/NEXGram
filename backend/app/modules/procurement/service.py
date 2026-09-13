"""Sourcing one shopping list across every local distributor at once.

The problem this solves is the reason a shopkeeper goes to four suppliers: each
one is cheapest on something, nobody is cheapest on everything, and comparing
them by hand across forty SKUs is not work anyone does. So they settle for one
supplier and overpay on most of the basket.

Given a list, this prices it against every distributor who can deliver to the
shop, and returns three things:

* the **cheapest split** - each line from whoever is genuinely cheapest;
* the **best single supplier**, priced honestly, because one delivery and one
  relationship is worth something real and the split is not always worth it;
* the **saving between them**, so the shopkeeper decides rather than being told.

Platform margin is disclosed on every line. A marketplace that quietly marks up
the price it claims is the cheapest available is not a price comparison, and a
rural shopkeeper who discovers the markup later stops using the app.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.catalogue import DistributorCatalogueItem, Product
from app.models.profiles import DistributorProfile, Location, RetailerProfile
from app.models.retail import RetailerInventory
from app.modules.inventory import restock


def platform_margin_rate() -> float:
    """The cut taken on a sourced order, as a fraction."""
    return settings.PLATFORM_MARGIN_RATE


def _local_distributors(db: Session, retailer: RetailerProfile) -> list:
    """Every supplier who can deliver to this shop's district."""
    if not retailer.location_id:
        return []
    location = db.query(Location).filter(Location.id == retailer.location_id).first()
    if not location or not location.district:
        return []
    return db.query(DistributorProfile).join(
        Location, DistributorProfile.location_id == Location.id
    ).filter(Location.district == location.district).all()


def _offers_for(db: Session, product_ids: list, distributor_ids: list) -> dict:
    """Every deliverable listing for these products, grouped by product.

    One query for the whole basket rather than one per line: a forty-item list
    against eight distributors is otherwise 320 round trips on a connection
    that is the whole point of this product.
    """
    if not product_ids or not distributor_ids:
        return {}

    rows = db.query(DistributorCatalogueItem).filter(
        DistributorCatalogueItem.product_id.in_(product_ids),
        DistributorCatalogueItem.distributor_id.in_(distributor_ids),
        DistributorCatalogueItem.is_active == True,  # noqa: E712
        DistributorCatalogueItem.stock_status == "available",
        DistributorCatalogueItem.available_stock > 0,
    ).all()

    grouped = {}
    for row in rows:
        grouped.setdefault(row.product_id, []).append(row)
    return grouped


def _line_cost(listing: DistributorCatalogueItem, wanted: int) -> Optional[dict]:
    """What this supplier would actually charge for this line.

    Quantity is raised to the supplier's MOQ rather than the line being dropped
    - a MOQ of 10 on a request for 6 is a real offer, just a more expensive one
    - and capped at what they have. A supplier who cannot cover the quantity at
    all is not an option for this line.
    """
    stock = listing.available_stock or 0
    moq = max(1, listing.minimum_order_quantity or 1)
    quantity = max(wanted, moq)

    if quantity > stock:
        return None

    price = listing.selling_price or 0.0
    return {
        "catalogueItemId": listing.id,
        "distributorId": listing.distributor_id,
        "quantity": quantity,
        "unitPrice": price,
        "lineTotal": round(price * quantity, 2),
        "minimumOrderQuantity": moq,
        # Flagged rather than hidden: the shopkeeper is buying four more than
        # they asked for and should see why the line costs what it does.
        "raisedToMoq": quantity > wanted,
        "availableStock": stock,
    }


def optimise(db: Session, retailer: RetailerProfile, requested: list) -> dict:
    """Prices a shopping list against the whole local distributor network.

    `requested` is [{product_id, quantity}]. Each line is costed against every
    supplier who stocks it; the cheapest wins the line.
    """
    wanted = {}
    for item in requested:
        pid = item.get("product_id")
        qty = int(item.get("quantity") or 0)
        if not pid or qty <= 0:
            continue
        wanted[pid] = wanted.get(pid, 0) + qty

    if not wanted:
        return _empty_plan("Koi item nahi bheja gaya.")

    distributors = _local_distributors(db, retailer)
    if not distributors:
        return _empty_plan("Aapke district mein abhi koi registered distributor nahi hai.")

    by_id = {d.id: d for d in distributors}
    offers = _offers_for(db, list(wanted), list(by_id))
    products = {
        p.id: p for p in db.query(Product).filter(Product.id.in_(list(wanted))).all()
    }

    lines, unavailable = [], []

    for product_id, quantity in wanted.items():
        product = products.get(product_id)
        name = product.canonical_name if product else "Unknown"

        priced = []
        for listing in offers.get(product_id, []):
            cost = _line_cost(listing, quantity)
            if cost:
                cost["distributorName"] = by_id[listing.distributor_id].business_name
                priced.append(cost)

        if not priced:
            unavailable.append({
                "productId": product_id,
                "name": name,
                "requestedQuantity": quantity,
                "reason": "Aapke district mein koi supplier itna stock nahi rakhta.",
            })
            continue

        priced.sort(key=lambda c: c["lineTotal"])
        best, worst = priced[0], priced[-1]

        lines.append({
            "productId": product_id,
            "name": name,
            "requestedQuantity": quantity,
            "best": best,
            # What the same line would cost from the most expensive supplier who
            # could fill it. This is the number that makes the saving real.
            "worstLineTotal": worst["lineTotal"],
            "lineSaving": round(worst["lineTotal"] - best["lineTotal"], 2),
            "supplierCount": len({c["distributorId"] for c in priced}),
            "offers": priced,
        })

    split = _group_by_supplier(lines, by_id)
    single = _best_single_supplier(lines, by_id)

    split_total = round(sum(g["subtotal"] for g in split), 2)
    single_total = single["total"] if single else None

    return {
        "lines": lines,
        "unavailable": unavailable,
        "split": {
            "groups": split,
            "supplierCount": len(split),
            "subtotal": split_total,
            **_margin(split_total),
        },
        "singleSupplier": single,
        # Only comparable when one supplier can actually fill the whole list.
        # Otherwise this subtracts a partial basket's total from a complete
        # one and reports the difference as a saving - which came out negative,
        # reading as "splitting costs you more" when the real answer is that
        # the one-stop option does not exist.
        "savingVsSingle": (
            round(single_total - split_total, 2)
            if single and single["coversWholeList"] else None
        ),
        "savingVsWorst": round(sum(line["lineSaving"] for line in lines), 2),
        "recommendation": _recommend(split, single, split_total, single_total),
    }


def _empty_plan(note: str) -> dict:
    return {
        "lines": [],
        "unavailable": [],
        "split": {"groups": [], "supplierCount": 0, "subtotal": 0.0, **_margin(0.0)},
        "singleSupplier": None,
        "savingVsSingle": None,
        "savingVsWorst": 0.0,
        "recommendation": note,
    }


def _margin(subtotal: float) -> dict:
    """What the platform takes, stated in rupees rather than implied."""
    rate = platform_margin_rate()
    fee = round(subtotal * rate, 2)
    return {
        "platformMarginRate": rate,
        "platformFee": fee,
        "payable": round(subtotal + fee, 2),
    }


def _group_by_supplier(lines: list, by_id: dict) -> list:
    """The cheapest-split plan, as one order per supplier."""
    groups = {}
    for line in lines:
        best = line["best"]
        group = groups.setdefault(best["distributorId"], {
            "distributorId": best["distributorId"],
            "distributorName": by_id[best["distributorId"]].business_name,
            "items": [],
            "subtotal": 0.0,
        })
        group["items"].append({
            "productId": line["productId"],
            "name": line["name"],
            "catalogueItemId": best["catalogueItemId"],
            "quantity": best["quantity"],
            "unitPrice": best["unitPrice"],
            "lineTotal": best["lineTotal"],
            "raisedToMoq": best["raisedToMoq"],
        })
        group["subtotal"] = round(group["subtotal"] + best["lineTotal"], 2)

    ordered = sorted(groups.values(), key=lambda g: -g["subtotal"])
    for group in ordered:
        group["itemCount"] = len(group["items"])
    return ordered


def _best_single_supplier(lines: list, by_id: dict) -> Optional[dict]:
    """The cheapest supplier who can fill the most of the basket alone.

    Ranked on coverage before price. A supplier who is Rs 40 cheaper on the
    half of the list they stock has not saved anybody a second trip, which is
    the thing being bought here.
    """
    if not lines:
        return None

    # Cheapest offer per product per supplier. A distributor who lists the same
    # product in two pack sizes must not count as covering two lines of the
    # basket - that ranked them above a supplier who genuinely stocks more of it.
    cheapest = {}
    for line in lines:
        for offer in line["offers"]:
            key = (offer["distributorId"], line["productId"])
            current = cheapest.get(key)
            if not current or offer["lineTotal"] < current[1]["lineTotal"]:
                cheapest[key] = (line, offer)

    totals = {}
    for (distributor_id, _product_id), (line, offer) in cheapest.items():
        entry = totals.setdefault(distributor_id, {"total": 0.0, "items": [], "covered": 0})
        entry["total"] = round(entry["total"] + offer["lineTotal"], 2)
        entry["covered"] += 1
        entry["items"].append({
            "productId": line["productId"],
            "name": line["name"],
            "catalogueItemId": offer["catalogueItemId"],
            "quantity": offer["quantity"],
            "unitPrice": offer["unitPrice"],
            "lineTotal": offer["lineTotal"],
            "raisedToMoq": offer["raisedToMoq"],
        })

    if not totals:
        return None

    best_id, best = max(totals.items(), key=lambda kv: (kv[1]["covered"], -kv[1]["total"]))
    return {
        "distributorId": best_id,
        "distributorName": by_id[best_id].business_name,
        "itemsCovered": best["covered"],
        "itemsRequested": len(lines),
        "coversWholeList": best["covered"] == len(lines),
        "total": best["total"],
        "items": best["items"],
        **_margin(best["total"]),
    }


def _recommend(split: list, single: Optional[dict], split_total: float, single_total) -> str:
    """One sentence on which plan to take, and why."""
    if not split:
        return "Is list ke liye abhi koi local supplier nahi mila."
    if len(split) == 1:
        return f"Poori list ek hi supplier se aa rahi hai - {split[0]['distributorName']}."
    if single and single["coversWholeList"]:
        saving = round(single_total - split_total, 2)
        if saving <= 0:
            return (
                f"{single['distributorName']} se poori list ek hi order mein le lein - "
                "alag-alag lene se sasta nahi pad raha."
            )
        return (
            f"{len(split)} suppliers mein baantne se Rs {saving:,.0f} bachte hain. "
            f"Ek hi jagah se chahiye to {single['distributorName']} sabse achhe hain."
        )
    return (
        f"Koi ek supplier poori list nahi de sakta. {len(split)} suppliers mein "
        "baant kar sabse sasta pad raha hai."
    )


def auto_basket(db: Session, retailer: RetailerProfile) -> dict:
    """Prices what the shop actually needs, without anyone typing a list.

    Takes the restock plan - lines running out, plus products the area is asking
    for that this shop does not carry - and sources it across the network in one
    step. This is the whole feature in one call: the shop never assembles a
    shopping list and never compares suppliers.
    """
    plan = restock.build_restock_plan(db, retailer)

    requested, origins = [], {}
    for line in plan["reorder"]:
        if not line.get("available"):
            continue
        requested.append({"product_id": line["productId"], "quantity": line["suggestedQuantity"]})
        origins[line["productId"]] = {"why": line["reason"], "source": "running_low"}

    for line in plan["newProducts"]:
        requested.append({"product_id": line["productId"], "quantity": line["suggestedQuantity"]})
        origins[line["productId"]] = {"why": line["reason"], "source": "local_demand"}

    result = optimise(db, retailer, requested)

    # Carry the reason through: without it the optimiser's output is a list of
    # products with no explanation of why any of them is on it.
    for line in result["lines"]:
        origin = origins.get(line["productId"], {})
        line["why"] = origin.get("why")
        line["source"] = origin.get("source")

    result["basisSummary"] = plan["summary"]
    result["expiring"] = plan["expiring"]
    return result
