# Working on NEXGram

## Running it

**Everything, on Postgres, one command:**

```bash
docker compose up --build
# web  http://localhost:4173
# api  http://localhost:8000
```

**Or locally, for development:**

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m seed.demo_seed          # 3 villages, 25 retailers, 8 distributors
                                  # add --reset to wipe and rebuild
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend, in another terminal
npm install
npm run dev
```

Bind the API to `0.0.0.0`, not `127.0.0.1`. The frontend calls `localhost:8000`,
and on Windows `localhost` resolves to IPv6 first — an IPv4-only bind produces a
connection failure that the browser reports as a CORS error.

Demo accounts (all password `demo1234`):

| Role | Mobile | Who |
|---|---|---|
| Retailer | `9000000001` | Gupta Kirana Store, Palampur |
| Retailer | `9000000022` | Thural Kirana — deliberately cold-start |
| Distributor | `9100000002` | Himachal Dairy Co, Palampur |

## The intelligence layer

Demand signals, supply gaps and opportunities are *derived*, not stored by the
seed. `demo_seed` runs the pipeline as its last step, so a fresh database is
ready to demo — without that, every screen that reads the intelligence layer
comes up empty on a database that otherwise looks complete.

In the app, the same three engines run as one authenticated call to
`POST /api/intelligence/refresh`, triggered whenever a retailer reports demand
or a distributor changes stock. To drive the stages individually:

```bash
curl -X POST localhost:8000/api/intelligence/demand/generate       -H "X-Ops-Token: dev-ops-token"
curl -X POST localhost:8000/api/intelligence/supply-gaps/generate  -H "X-Ops-Token: dev-ops-token"
curl -X POST localhost:8000/api/intelligence/opportunities/generate -H "X-Ops-Token: dev-ops-token"
```

Order matters — each stage consumes the previous one's persisted output. All
three upsert on deterministic ids, so repeat calls are idempotent.

## Tests

```bash
cd backend && pytest -q      # 102 tests
npm test -- --run            # 49 tests
npm run lint                 # oxlint, must be 0 errors
npm run build
```

`tests/test_pipeline_e2e.py` runs the whole demand → gap → opportunity chain
against SQLite. Before it existed, the opportunity engine shipped reading a
column that did not exist, because nothing ever executed it.

## Changing the database

```bash
cd backend
alembic revision --autogenerate -m "what changed"
alembic upgrade head
```

CI fails if the models and migrations disagree, so a model edited without a
migration is caught in the pull request rather than on deploy.

## Architecture in one screen

```
React (Vite)  ──HTTP──▶  FastAPI  ──▶  PostgreSQL
     │                      │
     │                      ├── intelligence/   demand, supply-gap, opportunity engines
     │                      ├── orders/         transactional, row-locked, price-snapshotted
     │                      ├── distributors/   catalogue read + write
     │                      └── schemes/        rule-based government scheme matching
     │
     └── service worker: app shell cached, API reads network-first
```

Two rules the codebase holds to:

1. **The system calculates; the explanation describes.** No score, quantity or
   ranking comes from generated text. `services/explanation.py` renders sentences
   from an evidence object and verifies them against it — a sentence containing a
   figure the evidence cannot support is rejected, not shown.
2. **No number without its evidence.** Every score carries a confidence label and
   the retailer count behind it, all the way to the UI.

## Where things live

| Path | What |
|---|---|
| `backend/app/modules/intelligence/services/` | the engines: demand, supply gap, opportunity |
| `backend/app/modules/intelligence/services/dashboard.py` | read models for both home screens, the stock plan, market search |
| `backend/app/modules/orders/service.py` | order lifecycle, stock locking, price snapshots |
| `backend/app/core/` | config, security, rate limiting, audit, logging |
| `backend/seed/demo_seed.py` | the engineered demo dataset |
| `src/pages/` | screens, grouped by role |
| `src/services/api/` | one module per API area |

## Conventions

- Hinglish in user-facing copy; English in code and comments.
- Every state-changing action writes an audit entry (`app/core/audit.py`).
- Money is rupees as `float` on the wire and formatted `en-IN` in the UI.
- Mobile numbers are normalised to bare 10 digits at the boundary, so `+91…`
  and `0…` cannot become two accounts for one person.
