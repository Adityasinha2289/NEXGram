# NEXGram

**Local business intelligence for rural B2B commerce.**

Rural retailers and distributors make stocking decisions on gut feel. Existing
platforms answer *"who sells X"*. Nobody answers *"what should I sell, and why
do you think so?"*

NEXGram turns scattered local demand and supply signals into one explainable
decision — a budget-aware stock plan for a retailer, a scored opportunity for a
distributor — with every number traceable to the evidence behind it.

---

## Run it

```bash
docker compose up --build     # web :4173 · api :8000
```

Or locally — see [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup.

**Demo accounts** (password `demo1234` for all):

| Role | Mobile | Who |
|---|---|---|
| Distributor | `9100000002` | Himachal Dairy Co, Palampur |
| Retailer | `9000000001` | Gupta Kirana Store, Palampur |
| Retailer | `9000000022` | Thural Kirana — deliberately cold-start |

The login screen has one-tap demo buttons for the first two.

---

## The loop, in five steps

1. A retailer reports what customers ask for but they cannot supply.
2. The engine aggregates that across every shop in the same market.
3. A distributor sees a scored, evidence-backed opportunity.
4. They stock it — and the gap visibly closes for everyone else.
5. The retailer's stock plan re-sources from the new supplier.

Every step is live in the app. Step 4 is reversible, so the demo can be re-run.

---

## What makes it defensible

**The system calculates. The explanation describes.** No score, quantity or
ranking is ever produced by generated text. Explanations are rendered from an
evidence object and then *verified against it*: a sentence containing a figure
the evidence cannot support is rejected rather than shown. That guardrail is
what would make it safe to swap in a language model later — and it is tested
with deliberately fabricated responses (`"22 retailers"`, `"grown 37%"`,
`"Rs 45000 a month"`), each of which is refused.

**No number without its evidence.** A score never appears bare. Paneer in
Palampur reads *88/100 · High confidence · 14 retailer signals*, and the detail
page shows the arithmetic:

```
Local demand      42 / 45    14 of a saturating 15 retailers
Supply scarcity   26 / 35    1 distributor can fulfil today
Your fit          20 / 20    Your primary area
                  ────────
Total             88 / 100
```

**Uncertainty is designed for, not patched in.** Thural is deliberately sparse
in the dataset, so the low-confidence cold-start state is a screen you can
navigate to on purpose rather than a hypothetical.

**Scarcity means "can fulfil today", not "has it listed".** Three suppliers all
out of stock is still an opportunity. The distinction is visible in the UI and
enforced in the engine.

---

## Scope: what is real, and what is not

Being precise about this is more useful than overclaiming.

**Real and working**
- Demand → supply-gap → opportunity pipeline, computing on the database
- Budget-aware stock plan with greedy allocation, MOQ and stock clamping
- Transactional ordering: row-level stock locking, price snapshotting, a status
  machine with valid transitions and stock rollback on cancellation
- Catalogue management against canonical products
- Rule-based government scheme matching
- Local market search with price comparison
- Reorder intelligence measured from each shop's own order history
- Auth with JWT, rate limiting, audit trail, password recovery
- Installable PWA that opens and renders offline

**Deliberately not built**
- **No LLM.** The explanation layer is template-based with a guardrail. Adding a
  model is a drop-in; the grounding work is already done.
- **SMS delivery is stubbed.** Password reset is complete — hashed single-use
  codes, expiry, rate limiting, no account enumeration — but delivery writes to
  the log, because paid SMS was outside the project's budget. Swapping in a
  provider is one class.
- **Payments, logistics, credit underwriting, GST invoicing.** Out of scope.

**The dataset is synthetic.** Three villages in Kangra, 25 retailers, 8
distributors, 46 products, 49 orders over 60 days. The numbers are engineered
rather than random so the demo is reproducible. Real onboarding writes to the
same tables with no schema change.

---

## Engineering

| | |
|---|---|
| Frontend | React 19, Vite 8, Tailwind v4, PWA |
| Backend | FastAPI, SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL (SQLite for development) |
| Tests | **101 backend + 43 frontend** |
| CI | tests, lint, build, image builds, migration-drift check |

The migration-drift check is worth calling out: it fails the build if the models
and migrations disagree, which is the failure that otherwise passes every test
and then breaks on deploy.

The intelligence pipeline has end-to-end tests that run the whole chain against
a database. That coverage was added after the engine was found to have shipped
reading a column that does not exist — nothing had ever executed it.

---

## Honest limitations

- The rate limiter is in-process, so a multi-instance deployment needs Redis or
  a limit at the load balancer. The code says so.
- Geographic matching is exact string comparison on area and district. Real
  deployment wants PostGIS or a geocoded radius.
- The stock plan's saturation constant (15 retailers) is a judgement call, not a
  fitted parameter. With real data it should be learned.
- There is no staff/multi-user model: one login per business.

---

## Repository

```
backend/app/modules/intelligence/   the engines and their read models
backend/app/core/                   config, security, rate limiting, audit, logging
backend/seed/demo_seed.py           the engineered dataset
src/pages/                          screens, grouped by role
src/services/api/                   one module per API area
```

Further reading: [CONTRIBUTING.md](CONTRIBUTING.md) for setup and conventions,
[README.md](README.md) for the full product thesis, and `docs/` for the
architecture notes written during the build.
