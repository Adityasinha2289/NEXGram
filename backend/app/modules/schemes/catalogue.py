"""Government scheme reference data.

Deliberately narrow. README section 20 scopes this to a handful of verified
schemes rather than a scraped directory, because a wrong "you are eligible" is
actively harmful to someone deciding whether to borrow against their shop.

Every entry carries its source URL, and matching is rule-based on facts the user
already gave during onboarding. The API never says "you qualify" - it says which
stated criteria a profile appears to meet, and sends the user to the official
portal to confirm. Figures were taken from the official pages listed in `source`
and should be re-checked before any real deployment.
"""

from typing import Dict, List

# criterion(profile) -> (met: bool, explanation: str)
SCHEMES: List[Dict] = [
    {
        "id": "pmmy_shishu",
        "minAmount": 5000,
        "maxAmount": 50000,
        "isLoan": True,
        "name": "PM MUDRA Yojana (Shishu)",
        "authority": "Govt. of India / MUDRA",
        "summary": "Collateral-free working capital loan up to Rs 50,000 for micro enterprises.",
        "benefit": "Up to Rs 50,000",
        "forRoles": ["retailer", "distributor"],
        "criteria": [
            {"key": "is_micro_business", "label": "Non-farm micro enterprise"},
            {"key": "has_business_name", "label": "Registered business name"},
        ],
        "documents": ["Aadhaar", "PAN", "Business proof", "Bank account"],
        "source": "https://www.mudra.org.in/",
        "applyAt": "Nearest bank branch or https://www.udyamimitra.in/",
    },
    {
        "id": "pmmy_kishor",
        "minAmount": 50000,
        "maxAmount": 500000,
        "isLoan": True,
        "name": "PM MUDRA Yojana (Kishor)",
        "authority": "Govt. of India / MUDRA",
        "summary": "Loan from Rs 50,000 to Rs 5 lakh for an established small business looking to expand.",
        "benefit": "Rs 50,000 - Rs 5,00,000",
        "forRoles": ["retailer", "distributor"],
        "criteria": [
            {"key": "is_micro_business", "label": "Non-farm micro enterprise"},
            {"key": "is_established", "label": "Trading for more than a year"},
            {"key": "wants_larger_capital", "label": "Planning investment above Rs 50,000"},
        ],
        "documents": ["Aadhaar", "PAN", "Business proof", "Bank statements", "Sales records"],
        "source": "https://www.mudra.org.in/",
        "applyAt": "Nearest bank branch or https://www.udyamimitra.in/",
    },
    {
        "id": "udyam",
        "minAmount": None,
        "maxAmount": None,
        "isLoan": False,
        "name": "Udyam Registration (MSME)",
        "authority": "Ministry of MSME",
        "summary": "Free online registration that unlocks priority-sector lending, subsidies and tender access.",
        "benefit": "Free registration; gateway to other MSME schemes",
        "forRoles": ["retailer", "distributor"],
        "criteria": [
            {"key": "has_business_name", "label": "Operating business"},
            {"key": "is_micro_business", "label": "Within MSME investment limits"},
        ],
        "documents": ["Aadhaar", "PAN"],
        "source": "https://udyamregistration.gov.in/",
        "applyAt": "https://udyamregistration.gov.in/",
    },
    {
        "id": "pmfme",
        "minAmount": 50000,
        "maxAmount": 1000000,
        "isLoan": True,
        "name": "PM Formalisation of Micro Food Processing (PMFME)",
        "authority": "Ministry of Food Processing Industries",
        "summary": "35% credit-linked subsidy for micro food-processing units, capped at Rs 10 lakh.",
        "benefit": "35% subsidy, up to Rs 10,00,000",
        "forRoles": ["distributor", "retailer"],
        "criteria": [
            {"key": "is_micro_business", "label": "Micro enterprise"},
            {"key": "handles_food", "label": "Deals in food products (dairy, staples, snacks)"},
        ],
        "documents": ["Aadhaar", "PAN", "Business proof", "Project report"],
        "source": "https://pmfme.mofpi.gov.in/",
        "applyAt": "https://pmfme.mofpi.gov.in/",
    },
    {
        "id": "standup_india",
        "minAmount": 1000000,
        "maxAmount": 10000000,
        "isLoan": True,
        "name": "Stand-Up India",
        "authority": "Govt. of India / SIDBI",
        "summary": "Bank loans from Rs 10 lakh to Rs 1 crore for SC/ST and women entrepreneurs setting up a new enterprise.",
        "benefit": "Rs 10,00,000 - Rs 1,00,00,000",
        "forRoles": ["distributor", "retailer"],
        "criteria": [
            {"key": "has_business_name", "label": "Operating business"},
            {"key": "requires_self_declaration", "label": "Applicant is SC/ST or a woman entrepreneur"},
        ],
        "documents": ["Aadhaar", "PAN", "Category certificate", "Project report"],
        "source": "https://www.standupmitra.in/",
        "applyAt": "https://www.standupmitra.in/",
    },
]

FOOD_CATEGORIES = {
    "dairy", "staples", "snacks", "bakery", "beverages",
    "confectionery", "pulses", "edible oils", "spices", "tea & coffee",
}


def _investment_ceiling(raw) -> int:
    digits = [int(n) for n in "".join(c if c.isdigit() else " " for c in str(raw or "")).split()]
    return max(digits) if digits else 0


def evaluate_criteria(profile_data: Dict, role: str) -> Dict[str, tuple]:
    """Resolves each criterion key against what onboarding already collected.

    Anything the platform cannot observe (caste, gender) is never guessed; it
    returns as a self-declaration for the user to confirm themselves.
    """
    categories = {
        str(c).strip().lower()
        for c in (profile_data.get("demandedCategories") or profile_data.get("productCategories") or [])
    }
    if profile_data.get("businessCategory"):
        categories.add(str(profile_data["businessCategory"]).strip().lower())

    business_name = profile_data.get("businessName")
    age = str(profile_data.get("businessAge") or "")
    established = any(token in age for token in ("2-5", "5+", "5-10", "10+", "more"))
    ceiling = _investment_ceiling(profile_data.get("investmentBudget"))

    return {
        "is_micro_business": (True, "Kirana aur local distribution MSME micro category mein aate hain."),
        "has_business_name": (
            bool(business_name),
            f"Business name: {business_name}" if business_name else "Profile mein business name nahi hai.",
        ),
        "is_established": (
            established,
            f"Business age: {age}" if age else "Business age profile mein nahi hai.",
        ),
        "wants_larger_capital": (
            ceiling > 50000,
            f"Aapka stated investment budget Rs {ceiling:,}" if ceiling else "Investment budget profile mein nahi hai.",
        ),
        "handles_food": (
            bool(categories & FOOD_CATEGORIES),
            "Aap food categories mein deal karte hain." if categories & FOOD_CATEGORIES
            else "Profile mein koi food category nahi mili.",
        ),
        "requires_self_declaration": (
            None,
            "Yeh aapko khud declare karna hoga - platform ise verify nahi karta.",
        ),
    }


def amount_fit(scheme: Dict, amount: float) -> Dict:
    """Whether a scheme covers the amount someone actually wants.

    The question a tier-3 shopkeeper asks is "who lends me thirty thousand
    rupees", and answering it with a Rs 10 lakh facility wastes a trip to a
    bank. A scheme that does not cover the amount is still returned - so the
    list does not silently shrink - but it is marked, ranked below the ones
    that do, and says why.
    """
    low, high = scheme.get("minAmount"), scheme.get("maxAmount")
    if not scheme.get("isLoan", True):
        return {"covers": False, "note": "Yeh loan nahi, registration hai."}
    if low and amount < low:
        return {
            "covers": False,
            "note": f"Yeh scheme Rs {low:,.0f} se shuru hoti hai.",
        }
    if high and amount > high:
        return {
            "covers": False,
            "note": f"Is scheme mein zyada se zyada Rs {high:,.0f} milta hai.",
        }
    return {"covers": True, "note": None}


def match_schemes(profile_data: Dict, role: str, amount: float = None) -> List[Dict]:
    """Scores every scheme against one profile.

    Returns each scheme with its criteria marked met / not met / self-declared,
    ordered by how much of it the profile already satisfies. Nothing here is an
    eligibility decision: the official portal remains the authority.
    """
    resolved = evaluate_criteria(profile_data, role)
    results = []

    for scheme in SCHEMES:
        if role not in scheme["forRoles"]:
            continue

        checks, met, unknown = [], 0, 0
        for criterion in scheme["criteria"]:
            status, reason = resolved.get(criterion["key"], (None, "Not assessed."))
            if status is True:
                met += 1
                state = "met"
            elif status is None:
                unknown += 1
                state = "self_declare"
            else:
                state = "not_met"
            checks.append({"label": criterion["label"], "status": state, "reason": reason})

        total = len(checks)
        blocked = any(c["status"] == "not_met" for c in checks)
        if blocked:
            verdict, variant = "Abhi eligible nahi", "danger"
        elif unknown:
            verdict, variant = "Shayad eligible - khud check karein", "warning"
        else:
            verdict, variant = "Criteria poore lagte hain", "success"

        entry = {
            **{k: v for k, v in scheme.items() if k != "criteria"},
            "checks": checks,
            "metCount": met,
            "totalCount": total,
            "verdict": verdict,
            "verdictVariant": variant,
            # Never phrased as approval; this is what the portal will ask about.
            "disclaimer": "Final eligibility official portal decide karta hai. Yeh sirf aapke profile ke against criteria match hai.",
        }

        if amount is not None:
            fit = amount_fit(scheme, amount)
            entry["coversAmount"] = fit["covers"]
            entry["amountNote"] = fit["note"]

        results.append(entry)

    # Schemes that can actually lend the requested amount lead, then how much
    # of their criteria the profile already meets.
    results.sort(key=lambda r: (
        not r.get("coversAmount", True),
        -r["metCount"] / r["totalCount"],
        r["name"],
    ))
    return results
