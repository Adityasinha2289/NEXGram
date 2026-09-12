"""Guardrail tests for the explanation layer.

README section 38 calls for deliberately feeding a bad generated response to the
explanation pipeline and confirming it is rejected rather than shown. These are
that test. They matter because the sentences describe someone's working capital:
a fabricated "22 retailers" is not a cosmetic error.
"""

import pytest

from app.modules.intelligence.services.explanation import (
    explain_opportunity,
    render_opportunity,
    verify,
)

EVIDENCE = {
    "demand": "14 retailers are looking for Paneer.",
    "supply": "Only 2 local distributors currently supply it.",
    "competition": "Local competition is medium.",
    "summary": "High demand with limited supply creates a strong commercial opportunity.",
    "total": 88.2,
    "retailers": 14,
    "suppliers": 1,
    "breakdown": [
        {"label": "Local demand", "points": 42.0, "max": 45.0, "detail": "14 of a saturating 15 retailers"},
        {"label": "Supply scarcity", "points": 26.25, "max": 35.0, "detail": "1 distributor can fulfil today"},
        {"label": "Your fit", "points": 20.0, "max": 20.0, "detail": "Your primary area"},
    ],
}


def test_accepts_a_sentence_built_from_the_evidence():
    ok, reason = verify("14 retailers want Paneer and only 1 can supply it.", EVIDENCE)
    assert ok, reason


def test_accepts_the_rounded_form_of_an_evidence_figure():
    """The evidence total is 88.2; saying "88" is still supported."""
    ok, reason = verify("This scores 88 out of 100.", EVIDENCE)
    assert ok, reason


@pytest.mark.parametrize(
    "hallucination",
    [
        "22 retailers are looking for Paneer.",          # inflated demand
        "Only 7 distributors supply it locally.",        # invented supply
        "This opportunity is worth Rs 45000 a month.",   # invented revenue
        "Demand has grown 37% since last quarter.",      # invented trend
        "Scores 95 out of 100.",                         # inflated score
    ],
)
def test_rejects_any_figure_the_evidence_cannot_support(hallucination):
    ok, reason = verify(hallucination, EVIDENCE)
    assert not ok
    assert "unsupported figure" in reason


def test_rejects_an_empty_response():
    ok, reason = verify("   ", EVIDENCE)
    assert not ok
    assert reason == "empty explanation"


def test_qualitative_claims_pass_because_they_carry_no_figures():
    """The guardrail governs numbers; prose is checked by the templates."""
    ok, _ = verify("Strong local demand with thin supply.", EVIDENCE)
    assert ok


def test_rendered_explanation_always_passes_its_own_guardrail():
    """A template that could fail verification would be a bug in the template."""
    for retailers, suppliers, confidence in [
        (14, 1, "High"), (5, 0, "Medium"), (1, 3, "Low"), (0, 0, "Low"),
    ]:
        evidence = {"retailers": retailers, "suppliers": suppliers}
        sentence = render_opportunity(
            evidence, name="Paneer", score=80, confidence=confidence,
            retailers=retailers, available_suppliers=suppliers,
        )
        ok, reason = verify(sentence, evidence)
        assert ok, f"template produced an unverifiable sentence: {sentence} ({reason})"


def test_low_confidence_is_stated_in_the_sentence():
    sentence = render_opportunity(
        {"retailers": 2, "suppliers": 0}, name="Paneer", score=61,
        confidence="Low", retailers=2, available_suppliers=0,
    )
    assert "confidence low" in sentence.lower()


def test_explain_opportunity_marks_its_output_verified():
    result = explain_opportunity({
        "name": "Paneer",
        "score": 88.2,
        "confidence": "High",
        "retailerCount": 14,
        "availableSupplierCount": 1,
        "evidence": EVIDENCE,
    })
    assert result["verified"] is True
    assert result["source"] == "template"
    assert "14" in result["text"]


def test_singular_plural_reads_correctly():
    one = render_opportunity({"retailers": 1, "suppliers": 1}, name="Paneer", score=50,
                             confidence="Low", retailers=1, available_suppliers=1)
    assert "1 retailer " in one
    assert "1 retailers" not in one
