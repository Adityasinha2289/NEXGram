"""Scheme matching by amount, and the application that follows.

The platform is not the lender, so the tests care as much about what it refuses
to claim - that an amount is available, that a loan is approved - as about the
records it keeps.
"""

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.main import app
from app.models.retail import LoanApplication
from app.models.users import User
from app.modules.loans import service
from app.modules.schemes.catalogue import SCHEMES, amount_fit, match_schemes

client = TestClient(app)

SHISHU = next(s for s in SCHEMES if s["id"] == "pmmy_shishu")
KISHOR = next(s for s in SCHEMES if s["id"] == "pmmy_kishor")
UDYAM = next(s for s in SCHEMES if s["id"] == "udyam")

PROFILE = {"businessName": "Ramesh Kirana", "demandedCategories": ["Dairy"]}


@pytest.fixture
def retailer_user(db, seed_data):
    return db.query(User).filter_by(id="usr_ret_1").first()


@pytest.fixture(autouse=True)
def signed_in(db, request):
    if "no_auth" in request.keywords:
        yield
        return
    app.dependency_overrides[get_current_user] = (
        lambda: db.query(User).filter_by(id="usr_ret_1").first()
    )
    yield


class TestAmountMatching:
    """A tier-3 shopkeeper asks for thirty thousand, not for a facility."""

    def test_a_small_amount_matches_the_small_facility(self):
        assert amount_fit(SHISHU, 30000)["covers"] is True

    def test_an_amount_over_the_ceiling_is_refused_with_the_ceiling(self):
        fit = amount_fit(SHISHU, 200000)
        assert fit["covers"] is False
        assert "50,000" in fit["note"]

    def test_an_amount_under_the_floor_says_where_it_starts(self):
        fit = amount_fit(KISHOR, 20000)
        assert fit["covers"] is False
        assert "50,000" in fit["note"]

    def test_a_registration_is_not_offered_as_a_loan(self):
        fit = amount_fit(UDYAM, 30000)
        assert fit["covers"] is False
        assert "registration" in fit["note"]

    def test_schemes_that_cover_the_amount_rank_first(self):
        matched = match_schemes(PROFILE, "retailer", amount=30000)

        assert matched[0]["id"] == "pmmy_shishu"
        assert matched[0]["coversAmount"] is True
        assert any(s["coversAmount"] is False for s in matched[1:])

    def test_asking_for_a_larger_amount_moves_a_different_scheme_up(self):
        matched = match_schemes(PROFILE, "retailer", amount=300000)
        assert matched[0]["coversAmount"] is True
        assert matched[0]["id"] in {"pmmy_kishor", "pmfme"}

    def test_no_amount_still_returns_every_scheme(self):
        """The list must not shrink just because nobody typed a number."""
        matched = match_schemes(PROFILE, "retailer")
        assert len(matched) == len([s for s in SCHEMES if "retailer" in s["forRoles"]])
        assert "coversAmount" not in matched[0]


class TestRepaymentEstimate:
    def test_an_emi_is_produced_for_a_normal_loan(self):
        estimate = service.repayment_estimate("pmmy_shishu", 50000, 24)

        assert estimate["monthlyInstalment"] > 50000 / 24
        assert estimate["totalRepayable"] > 50000
        assert estimate["totalInterest"] > 0

    def test_a_zero_interest_scheme_just_divides(self):
        estimate = service.repayment_estimate("udyam", 12000, 12)
        assert estimate["monthlyInstalment"] == 1000.0
        assert estimate["totalInterest"] == 0.0

    def test_the_estimate_says_it_is_not_an_offer(self):
        """Quoting a rate as fact is how someone budgets around a fiction."""
        assert "estimate" in service.repayment_estimate("pmmy_shishu", 50000, 24)["disclaimer"]

    def test_a_longer_tenure_lowers_the_instalment(self):
        short = service.monthly_instalment(100000, 11.0, 12)
        long = service.monthly_instalment(100000, 11.0, 36)
        assert long < short


class TestApplying:
    def test_an_application_is_recorded_with_a_quotable_reference(self, db, retailer_user):
        application = service.apply(
            db, retailer_user, SHISHU, amount=40000, tenure_months=24, purpose="Stock",
        )

        assert application.reference.startswith("NXL-")
        assert application.status == "submitted"
        assert application.amount == 40000

    def test_the_criteria_are_frozen_at_submission(self, db, retailer_user):
        """A later profile edit must not rewrite what this was submitted on."""
        matched = next(s for s in match_schemes(PROFILE, "retailer", 40000) if s["id"] == "pmmy_shishu")
        application = service.apply(db, retailer_user, matched, amount=40000, tenure_months=24)

        assert service.serialise(application)["criteriaAtSubmission"]

    def test_an_amount_above_the_scheme_ceiling_is_refused(self, db, retailer_user):
        with pytest.raises(Exception) as exc:
            service.apply(db, retailer_user, SHISHU, amount=900000, tenure_months=24)

        assert exc.value.status_code == 400
        assert "50,000" in exc.value.detail

    def test_an_amount_below_the_scheme_floor_is_refused(self, db, retailer_user):
        with pytest.raises(Exception) as exc:
            service.apply(db, retailer_user, KISHOR, amount=10000, tenure_months=24)
        assert exc.value.status_code == 400

    def test_a_second_live_application_for_one_scheme_is_refused(self, db, retailer_user):
        service.apply(db, retailer_user, SHISHU, amount=40000, tenure_months=24)

        with pytest.raises(Exception) as exc:
            service.apply(db, retailer_user, SHISHU, amount=30000, tenure_months=12)

        assert exc.value.status_code == 409
        assert "pehle se chal rahi hai" in exc.value.detail

    def test_withdrawing_frees_the_scheme_to_be_applied_for_again(self, db, retailer_user):
        first = service.apply(db, retailer_user, SHISHU, amount=40000, tenure_months=24)
        service.withdraw(db, first)

        second = service.apply(db, retailer_user, SHISHU, amount=30000, tenure_months=12)
        assert second.status == "submitted"

    def test_a_decided_application_cannot_be_withdrawn(self, db, retailer_user):
        application = service.apply(db, retailer_user, SHISHU, amount=40000, tenure_months=24)
        service.record_decision(db, application, "approved")

        with pytest.raises(Exception):
            service.withdraw(db, application)


class TestDecisions:
    def test_a_lender_decision_is_recorded(self, db, retailer_user):
        application = service.apply(db, retailer_user, SHISHU, amount=40000, tenure_months=24)

        service.record_decision(
            db, application, "approved", lender_reference="SBI/2026/771", note="Sanctioned",
        )

        assert application.status == "approved"
        assert application.lender_reference == "SBI/2026/771"
        assert application.decided_at is not None

    def test_a_decision_cannot_be_overwritten(self, db, retailer_user):
        application = service.apply(db, retailer_user, SHISHU, amount=40000, tenure_months=24)
        service.record_decision(db, application, "rejected")

        with pytest.raises(Exception) as exc:
            service.record_decision(db, application, "approved")
        assert exc.value.status_code == 400


class TestLoansApi:
    def test_applying_through_the_api(self, db, retailer_user):
        response = client.post("/api/loans", json={
            "scheme_id": "pmmy_shishu", "amount": 40000,
            "tenure_months": 24, "purpose": "Naya stock",
        })

        assert response.status_code == 201
        body = response.json()
        assert body["schemeName"] == SHISHU["name"]
        assert body["estimate"]["monthlyInstalment"] > 0

    def test_an_unknown_scheme_is_a_404(self, db, retailer_user):
        response = client.post("/api/loans", json={
            "scheme_id": "not_a_scheme", "amount": 10000, "tenure_months": 12,
        })
        assert response.status_code == 404

    def test_the_estimate_endpoint_answers(self, db, retailer_user):
        response = client.get(
            "/api/loans/estimate",
            params={"scheme_id": "pmmy_shishu", "amount": 50000, "tenure_months": 24},
        )
        assert response.status_code == 200
        assert response.json()["monthlyInstalment"] > 0

    def test_applications_list_for_their_owner(self, db, retailer_user):
        client.post("/api/loans", json={
            "scheme_id": "pmmy_shishu", "amount": 40000, "tenure_months": 24,
        })

        response = client.get("/api/loans")
        assert response.status_code == 200
        assert len(response.json()["items"]) == 1

    def test_another_user_application_is_not_readable(self, db, retailer_user, seed_data):
        """An application carries an amount and a business's position."""
        other = db.query(User).filter_by(id="usr_dist_1").first()
        theirs = service.apply(db, other, SHISHU, amount=40000, tenure_months=24)

        assert client.get(f"/api/loans/{theirs.id}").status_code == 404

    def test_a_borrower_cannot_approve_their_own_loan(self, db, retailer_user):
        """Approval is the bank's word, not the applicant's."""
        created = client.post("/api/loans", json={
            "scheme_id": "pmmy_shishu", "amount": 40000, "tenure_months": 24,
        }).json()

        response = client.patch(
            f"/api/loans/{created['id']}/decision", json={"status": "approved"},
        )

        assert response.status_code == 403
        assert db.query(LoanApplication).filter_by(id=created["id"]).first().status == "submitted"

    def test_withdrawing_through_the_api(self, db, retailer_user):
        created = client.post("/api/loans", json={
            "scheme_id": "pmmy_shishu", "amount": 40000, "tenure_months": 24,
        }).json()

        response = client.post(f"/api/loans/{created['id']}/withdraw")

        assert response.status_code == 200
        assert response.json()["status"] == "withdrawn"

    def test_the_schemes_endpoint_takes_an_amount(self, db, retailer_user):
        response = client.get("/api/schemes", params={"amount": 30000})

        assert response.status_code == 200
        body = response.json()
        assert body["requestedAmount"] == 30000
        assert body["schemes"][0]["coversAmount"] is True
