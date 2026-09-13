"""Applying for a listed scheme, and following where it got to."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.users import User
from app.modules.loans import service
from app.modules.schemes.catalogue import SCHEMES, match_schemes
from app.modules.schemes.router import _profile_data

router = APIRouter(prefix="/loans", tags=["loans"])

SCHEMES_BY_ID = {scheme["id"]: scheme for scheme in SCHEMES}


class ApplyIn(BaseModel):
    scheme_id: str
    amount: float = Field(gt=0)
    tenure_months: int = Field(gt=0, le=360)
    purpose: Optional[str] = Field(default=None, max_length=500)


class DecisionIn(BaseModel):
    status: str
    lender_reference: Optional[str] = None
    note: Optional[str] = None


@router.get("/estimate", summary="What an amount would cost per month")
def estimate(
    scheme_id: str = Query(...),
    amount: float = Query(..., gt=0),
    tenure_months: int = Query(..., gt=0, le=360),
    _user: User = Depends(get_current_user),
):
    """An indicative EMI, labelled as one.

    A shopkeeper deciding whether to borrow needs a monthly number, not a
    principal. It is explicitly not an offer - the rate is the bank's to set.
    """
    if scheme_id not in SCHEMES_BY_ID:
        raise HTTPException(status_code=404, detail="Yeh scheme nahi mili")
    return service.repayment_estimate(scheme_id, amount, tenure_months)


@router.post("", status_code=201, summary="Apply for a scheme")
def apply(
    payload: ApplyIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Records the application against the criteria that matched today.

    The scheme is re-matched here rather than trusted from the client, so the
    criteria snapshot reflects the profile the server can actually see.
    """
    scheme = SCHEMES_BY_ID.get(payload.scheme_id)
    if not scheme:
        raise HTTPException(status_code=404, detail="Yeh scheme nahi mili")
    if current_user.role not in scheme["forRoles"]:
        raise HTTPException(
            status_code=403,
            detail=f"Yeh scheme {current_user.role} ke liye nahi hai",
        )

    matched = next(
        (s for s in match_schemes(_profile_data(db, current_user), current_user.role, payload.amount)
         if s["id"] == payload.scheme_id),
        scheme,
    )

    application = service.apply(
        db, current_user, matched,
        amount=payload.amount,
        tenure_months=payload.tenure_months,
        purpose=payload.purpose,
    )
    return service.serialise(application)


@router.get("", summary="Your applications")
def my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"items": service.list_for_user(db, current_user)}


@router.get("/{application_id}", summary="One application")
def read_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.serialise(service.get_for_user(db, current_user, application_id))


@router.post("/{application_id}/withdraw", summary="Withdraw an application")
def withdraw(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = service.get_for_user(db, current_user, application_id)
    return service.serialise(service.withdraw(db, application))


@router.patch(
    "/{application_id}/decision",
    summary="Record what the lender decided",
)
def record_decision(
    application_id: str,
    payload: DecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Operational, and deliberately not something an applicant can call.

    Approval is the bank's word, reported through an admin. A borrower able to
    mark their own loan approved makes the whole record worthless.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Loan decisions sirf NEXGram ops record kar sakte hain",
        )

    from app.models.retail import LoanApplication

    application = db.query(LoanApplication).filter(
        LoanApplication.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Yeh application nahi mili")

    return service.serialise(service.record_decision(
        db, application, payload.status,
        lender_reference=payload.lender_reference,
        note=payload.note,
    ))
