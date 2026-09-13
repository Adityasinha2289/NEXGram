"""Applying for a government-backed loan, and tracking where it got to.

The schemes module already answers "which schemes fit my profile". This is the
half after that: the shopkeeper picks one, says how much and for how long, and
gets a reference they can quote - instead of a phone number and a memory of
which branch they walked into.

Two rules hold throughout.

The platform is not the lender and never says "approved". Every response here
reports what the user told us and what the bank came back with; the decision
lives with the bank, and a screen implying otherwise costs someone real money.

An application snapshots the criteria that matched at the moment it was
submitted. Profiles change - a shop adds a category, edits its budget - and an
application whose stated basis silently rewrote itself is not a record of
anything.
"""

import json
import random
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.retail import LOAN_STATUSES, LoanApplication
from app.models.users import User

# What the applicant may do themselves. Everything else is the lender's to
# report, and arrives through the ops path rather than the user's own session.
APPLICANT_TRANSITIONS = {
    "draft": ["submitted", "withdrawn"],
    "submitted": ["withdrawn"],
    "under_review": ["withdrawn"],
    "approved": [],
    "rejected": [],
    "withdrawn": [],
}

# Indicative only. Real rates are set per bank, per applicant, and quoting one
# as fact is how somebody budgets around a number that was never offered.
INDICATIVE_RATES = {
    "pmmy_shishu": 10.0,
    "pmmy_kishor": 11.5,
    "udyam": 0.0,
    "pmfme": 9.5,
    "standup_india": 11.0,
}
DEFAULT_INDICATIVE_RATE = 11.0


def naive_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def monthly_instalment(principal: float, annual_rate: float, months: int) -> float:
    """Standard amortising EMI.

    A zero-interest scheme is not a special case in the maths so much as a
    division by zero in the formula, so it is handled directly.
    """
    if principal <= 0 or months <= 0:
        return 0.0
    if annual_rate <= 0:
        return round(principal / months, 2)

    r = annual_rate / 12 / 100
    factor = (1 + r) ** months
    return round(principal * r * factor / (factor - 1), 2)


def repayment_estimate(scheme_id: str, amount: float, months: int) -> dict:
    """What the borrowing would cost per month, clearly labelled as indicative."""
    rate = INDICATIVE_RATES.get(scheme_id, DEFAULT_INDICATIVE_RATE)
    emi = monthly_instalment(amount, rate, months)
    total = round(emi * months, 2)
    return {
        "amount": amount,
        "tenureMonths": months,
        "indicativeAnnualRate": rate,
        "monthlyInstalment": emi,
        "totalRepayable": total,
        "totalInterest": round(total - amount, 2),
        "disclaimer": (
            "Yeh sirf ek estimate hai. Actual rate aur EMI bank decide karega - "
            "yeh koi offer nahi hai."
        ),
    }


def _reference(db: Session) -> str:
    """Short and quotable: this gets read out at a bank counter."""
    stamp = naive_now().strftime("%Y%m")
    for _ in range(12):
        candidate = f"NXL-{stamp}-{random.randint(10000, 99999)}"
        if not db.query(LoanApplication).filter(LoanApplication.reference == candidate).first():
            return candidate
    raise HTTPException(status_code=503, detail="Reference generate nahi ho paya, dobara try karein")


def apply(
    db: Session,
    user: User,
    scheme: dict,
    *,
    amount: float,
    tenure_months: int,
    purpose: Optional[str] = None,
) -> LoanApplication:
    """Records an application against one matched scheme.

    Refuses an amount the scheme itself does not cover. Letting someone apply
    for Rs 8 lakh under a Rs 50,000 facility wastes a trip to the bank, and the
    scheme catalogue already knows the ceiling.
    """
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Loan amount 0 se zyada hona chahiye")
    if tenure_months <= 0:
        raise HTTPException(status_code=400, detail="Tenure 0 se zyada hona chahiye")

    ceiling = scheme.get("maxAmount")
    floor = scheme.get("minAmount") or 0
    if ceiling and amount > ceiling:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{scheme['name']} mein zyada se zyada Rs {ceiling:,.0f} tak milta hai. "
                f"Aapne Rs {amount:,.0f} maanga hai."
            ),
        )
    if floor and amount < floor:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{scheme['name']} kam se kam Rs {floor:,.0f} se shuru hota hai."
            ),
        )

    # One live application per scheme per user: two open applications for the
    # same facility is a duplicate at the bank, not twice the chance.
    existing = db.query(LoanApplication).filter(
        LoanApplication.user_id == user.id,
        LoanApplication.scheme_id == scheme["id"],
        LoanApplication.status.in_(["draft", "submitted", "under_review"]),
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Is scheme ke liye aapki ek application pehle se chal rahi hai "
                f"({existing.reference})."
            ),
        )

    application = LoanApplication(
        reference=_reference(db),
        user_id=user.id,
        scheme_id=scheme["id"],
        scheme_name=scheme["name"],
        amount=amount,
        tenure_months=tenure_months,
        purpose=purpose,
        status="submitted",
        # Frozen deliberately: what the profile said today is the basis on
        # which this was submitted, whatever it says next month.
        matched_criteria=json.dumps(scheme.get("checks") or []),
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def withdraw(db: Session, application: LoanApplication) -> LoanApplication:
    """The one status change an applicant owns."""
    if "withdrawn" not in APPLICANT_TRANSITIONS.get(application.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"{application.status} application withdraw nahi ho sakti",
        )
    application.status = "withdrawn"
    application.decided_at = naive_now()
    db.commit()
    db.refresh(application)
    return application


def record_decision(
    db: Session,
    application: LoanApplication,
    status: str,
    *,
    lender_reference: Optional[str] = None,
    note: Optional[str] = None,
) -> LoanApplication:
    """Writes back what the lender reported.

    Operational, not user-facing: an applicant must never be able to mark their
    own application approved.
    """
    if status not in LOAN_STATUSES:
        raise HTTPException(status_code=400, detail=f"Unknown loan status: {status}")
    if application.status in {"approved", "rejected", "withdrawn"}:
        raise HTTPException(
            status_code=400,
            detail=f"Yeh application pehle hi {application.status} ho chuki hai",
        )

    application.status = status
    application.lender_reference = lender_reference
    application.decision_note = note
    if status in {"approved", "rejected"}:
        application.decided_at = naive_now()
    db.commit()
    db.refresh(application)
    return application


def serialise(application: LoanApplication) -> dict:
    """Display shape for one application."""
    try:
        criteria = json.loads(application.matched_criteria) if application.matched_criteria else []
    except (ValueError, TypeError):
        criteria = []

    estimate = repayment_estimate(
        application.scheme_id, application.amount, application.tenure_months
    )

    return {
        "id": application.id,
        "reference": application.reference,
        "schemeId": application.scheme_id,
        "schemeName": application.scheme_name,
        "amount": application.amount,
        "tenureMonths": application.tenure_months,
        "purpose": application.purpose,
        "status": application.status,
        "statusLabel": STATUS_LABELS.get(application.status, application.status),
        "lenderReference": application.lender_reference,
        "decisionNote": application.decision_note,
        # What the profile satisfied when this was submitted, not now.
        "criteriaAtSubmission": criteria,
        "estimate": estimate,
        "canWithdraw": "withdrawn" in APPLICANT_TRANSITIONS.get(application.status, []),
        "submittedAt": application.submitted_at.isoformat() if application.submitted_at else None,
        "decidedAt": application.decided_at.isoformat() if application.decided_at else None,
    }


STATUS_LABELS = {
    "draft": "Draft",
    "submitted": "Bank ko bheja gaya",
    "under_review": "Bank review kar raha hai",
    "approved": "Approve ho gaya",
    "rejected": "Reject ho gaya",
    "withdrawn": "Aapne wapas le liya",
}


def list_for_user(db: Session, user: User) -> list:
    rows = db.query(LoanApplication).filter(
        LoanApplication.user_id == user.id
    ).order_by(LoanApplication.submitted_at.desc()).all()
    return [serialise(row) for row in rows]


def get_for_user(db: Session, user: User, application_id: str) -> LoanApplication:
    """One application, scoped to its owner.

    Scoped rather than fetched by id: a loan application carries an amount and
    a business's financial position, and is not another user's to read.
    """
    row = db.query(LoanApplication).filter(
        LoanApplication.id == application_id,
        LoanApplication.user_id == user.id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Yeh application nahi mili")
    return row
