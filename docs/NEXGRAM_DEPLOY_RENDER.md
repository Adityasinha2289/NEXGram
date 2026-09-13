# Deploying the API to Render

## SQLite does not come with you

Render's web service filesystem is **ephemeral**. It is rebuilt on every deploy,
every restart, and every time Render moves the instance — and on the free tier
the service sleeps when idle and wakes with a clean disk. A `nexgram_dev.db`
file sitting next to the code is not "hosted somewhere"; it is deleted, silently,
taking every order, shop, inventory count and user with it.

So: **do not host the SQLite file anywhere. Use Postgres.** Render's managed
Postgres has a free tier, `render.yaml` provisions it, and `DATABASE_URL` is
wired in automatically.

Nothing in the app needs changing for this. SQLAlchemy, the models and all 27
migrations are engine-agnostic, and `docker-compose.yml` has always pointed at
Postgres. One thing *was* missing and is now fixed: `psycopg2-binary` was absent
from `requirements.txt`, so any Postgres URL failed with
`ModuleNotFoundError: No module named 'psycopg2'`. The app only ever started
because SQLite needs no driver.

---

## Environment variables

### Required — startup fails without these

| Key | Value | Why |
|---|---|---|
| `ENVIRONMENT` | `production` | Turns on the startup checks below |
| `DATABASE_URL` | *(from the Render database)* | `render.yaml` wires this automatically |
| `SECRET_KEY` | *(generate)* | Signs session tokens. **Changing it signs everyone out** |
| `OPS_TOKEN` | *(generate)* | Guards the `/intelligence/*/generate` pipeline endpoints |
| `ALLOWED_ORIGINS` | your frontend origin | Comma-separated, no trailing slash |

`ALLOWED_ORIGINS` containing `localhost` is a **hard startup failure** in
production, on purpose — a permissive CORS list shipped by accident is worse
than a deploy that refuses to start. A blank `SECRET_KEY` or `OPS_TOKEN` fails
the same way. See `validate_runtime()` in `app/core/config.py`.

### Optional — each feature hides itself when unset

| Key | Default | Notes |
|---|---|---|
| `GEMINI_API_KEY` | blank | Assistant reports `configured: false` and the UI hides it |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | |
| `CLERK_SECRET_KEY` | blank | Clerk sign-in route is not offered |
| `CLERK_PUBLISHABLE_KEY` | blank | Also used to derive the issuer |
| `CLERK_AUTHORIZED_PARTIES` | blank | **Set this.** Blank skips the `azp` check |
| `CLERK_ISSUER` | blank | Derived from the publishable key; only set if that fails |

### Leave alone unless you have a reason

`ACCESS_TOKEN_EXPIRE_MINUTES` (7 days), `AUTH_RATE_LIMIT_ATTEMPTS` (10),
`AUTH_RATE_LIMIT_WINDOW_SECONDS` (300), `LOG_LEVEL` (INFO),
`PLATFORM_MARGIN_RATE` (0.02), `DELIVERY_RADIUS_KM` (3.0),
`GEMINI_MAX_OUTPUT_TOKENS` (800), `GEMINI_TIMEOUT_SECONDS` (30),
`CLERK_JWKS_TTL_SECONDS` (3600).

**Do not set `PORT`.** Render provides it and the Dockerfile already binds it.

---

## Migrations and seeding

The Dockerfile's command is:

```
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

so every deploy migrates before serving. No release hook needed.

A fresh Postgres is **empty** — no products, no demo accounts, so the landing
page's one-tap demos will fail. Seed it once from a Render Shell:

```
python -m seed.demo_seed
```

That builds the Kangra district corpus the intelligence layer needs: 3 villages,
8 distributors, 25 retailers, ~45 products and 60 days of order history. Without
it the dashboards render their empty states correctly but there is nothing to
show.

---

## Frontend

Hosted separately (Render Static Site, Vercel, Netlify — any of them). It needs:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<your-api>.onrender.com/api` — note the `/api` |
| `VITE_CLERK_PUBLISHABLE_KEY` | same publishable key as the backend, if using Clerk |

These are **build-time** variables in Vite: they are baked into the bundle, so
changing one needs a rebuild, not a restart.

Then set the API's `ALLOWED_ORIGINS` to the frontend's origin, and Clerk's
`CLERK_AUTHORIZED_PARTIES` to the same value.

---

## Two things to know about the free tier

**The service sleeps** after ~15 minutes idle and takes 30–60s to wake. The first
request after a nap will look broken to anyone demoing it.

**The free Postgres expires after 30 days.** Back up or upgrade before then, or
the data goes away.

---

## Worth doing before a real launch

`requirements.txt` pins only `bcrypt`. Everything else — FastAPI, SQLAlchemy,
Pydantic, Alembic — floats to whatever is latest at build time, so a breaking
release upstream becomes a broken deploy with no change on your side. `pip
freeze > requirements.txt` from a known-good environment is the fix.

`pytest`, `pytest-asyncio` and `aiosqlite` are also in `requirements.txt` and get
installed into the production image. Harmless, but they belong in a
`requirements-dev.txt`.
