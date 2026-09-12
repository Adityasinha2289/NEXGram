"""Natural-language explanations, and the guardrail that keeps them honest.

The product's first design commitment is that the system calculates and the
explanation only describes. So this module never computes a score, a quantity or
a ranking: it reads an evidence object that an engine already produced and
renders it as a sentence a shopkeeper can act on.

Two pieces:

  render(...)  - deterministic templates. Always available, costs nothing, and
                 cannot invent a number because it only interpolates evidence.
  verify(...)  - a guardrail that checks any candidate sentence (from a template
                 or, later, from an LLM) against the same evidence object and
                 rejects it if it contains a figure the evidence does not
                 support. That check is what makes it safe to swap in a
                 generative model without trusting it.
"""

import re
from typing import Dict, List, Optional, Tuple

# Figures a sentence may legitimately contain without appearing in the evidence:
# ordinals and small counts that come from the sentence structure itself.
_ALWAYS_ALLOWED = {"0", "1", "100"}

_NUMBER = re.compile(r"\d+(?:\.\d+)?")


def _numbers_in(text: str) -> List[str]:
    return _NUMBER.findall(text or "")


def _supported_numbers(evidence: Dict) -> set:
    """Every figure the evidence object can justify.

    Both the raw value and its rounded form count, because a sentence saying
    "88" is supported by an evidence total of 88.2.
    """
    supported = set(_ALWAYS_ALLOWED)

    def add(value):
        if value is None:
            return
        try:
            number = float(value)
        except (TypeError, ValueError):
            return
        supported.add(f"{number:g}")
        supported.add(f"{round(number):g}")
        supported.add(f"{number:.1f}")
        supported.add(f"{number:.2f}")

    for key in ("total", "score", "retailers", "suppliers", "confidence_count"):
        add(evidence.get(key))

    for part in evidence.get("breakdown") or []:
        add(part.get("points"))
        add(part.get("max"))
        # Figures quoted inside a breakdown detail line are evidence too.
        for token in _numbers_in(part.get("detail", "")):
            supported.add(token)

    for key in ("demand", "supply", "competition", "fit", "summary"):
        for token in _numbers_in(evidence.get(key, "")):
            supported.add(token)

    return supported


def verify(sentence: str, evidence: Dict) -> Tuple[bool, Optional[str]]:
    """Checks a candidate explanation against its evidence.

    Returns (ok, reason). A sentence fails if it states a figure the evidence
    cannot account for - the exact failure mode that makes an ungrounded model
    dangerous when it is talking about someone's working capital.
    """
    if not sentence or not sentence.strip():
        return False, "empty explanation"

    supported = _supported_numbers(evidence)
    for token in _numbers_in(sentence):
        normalised = f"{float(token):g}"
        if normalised not in supported and token not in supported:
            return False, f"unsupported figure: {token}"

    return True, None


def _plural(count: int, singular: str, plural: str = None) -> str:
    return singular if count == 1 else (plural or singular + "s")


def render_opportunity(evidence: Dict, name: str, score: float, confidence: str,
                       retailers: int, available_suppliers: int) -> str:
    """One sentence a distributor can act on, built only from evidence."""
    if available_suppliers == 0:
        supply_clause = f"koi local distributor {name} supply nahi karta"
    elif available_suppliers == 1:
        supply_clause = f"sirf 1 distributor {name} de pa raha hai"
    else:
        supply_clause = f"{available_suppliers} distributors {name} de pa rahe hain"

    demand_clause = (
        f"{retailers} {_plural(retailers, 'retailer')} {name} maang rahe hain"
    )

    if confidence == "Low":
        caveat = " Yeh signal abhi kam data par hai, isliye confidence low hai."
    elif confidence == "Medium":
        caveat = " Signal thoda limited data par hai."
    else:
        caveat = ""

    return f"Aapke area mein {demand_clause}, aur {supply_clause}.{caveat}"


def render_pack_line(name: str, retailers: int, quantity: int, stock_capped: bool) -> str:
    """Why one product earned a place in a retailer's stock plan."""
    base = (
        f"{retailers} aas-paas ke {_plural(retailers, 'retailer')} ne {name} ki "
        f"demand report ki hai."
    )
    if stock_capped:
        base += " Quantity aapke local supplier ke available stock tak seemit hai."
    return base


def explain_opportunity(opportunity: Dict) -> Dict:
    """Attaches a verified explanation to a serialised opportunity.

    If the guardrail rejects the sentence the evidence summary is used instead,
    so a failure degrades to something plainer rather than to something wrong.
    """
    evidence = dict(opportunity.get("evidence") or {})
    evidence.setdefault("retailers", opportunity.get("retailerCount"))
    evidence.setdefault("suppliers", opportunity.get("availableSupplierCount"))
    evidence.setdefault("score", opportunity.get("score"))

    sentence = render_opportunity(
        evidence,
        name=opportunity.get("name", "yeh product"),
        score=opportunity.get("score", 0),
        confidence=opportunity.get("confidence", "Low"),
        retailers=opportunity.get("retailerCount", 0),
        available_suppliers=opportunity.get("availableSupplierCount", 0),
    )

    ok, reason = verify(sentence, evidence)
    if not ok:
        return {
            "text": evidence.get("summary", ""),
            "verified": False,
            "rejectedReason": reason,
            "source": "fallback",
        }

    return {"text": sentence, "verified": True, "source": "template"}
