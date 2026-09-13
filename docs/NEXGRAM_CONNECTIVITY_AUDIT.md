# Frontend ↔ Backend Connectivity Audit

Both frontends were audited against the running FastAPI API and repaired. Every
finding below was reproduced against a seeded database before it was fixed, and
the fix re-verified the same way.

The repo holds two applications:

| App | Path | Stack | State before |
|---|---|---|---|
| Vite app | `src/` | React 19 + react-router | Wired to the API, but three retailer screens crashed and two endpoints it depends on returned 500 |
| Next.js app | `frontend/` | Next 15 + shadcn | Largely a design mockup: the dashboards read fields no endpoint returns and fell back to invented figures |

---

## 1. Backend faults (3 endpoints returning 500)

These are the reason the retailer journey looked "not connected": the screens
were calling the API correctly and the API was failing.

### 1.1 Offset-naive vs offset-aware datetimes

`app/modules/intelligence/services/dashboard.py` compared `datetime.now(timezone.utc)`
with timestamps SQLite returns naive, raising
`TypeError: can't subtract offset-naive and offset-aware datetimes`.

Three endpoints answered **500 for any shop that had ever completed an order** —
which is every real shop:

- `GET /api/intelligence/dashboard/retailer` (the entire retailer home screen)
- `GET /api/intelligence/reorder`
- `GET /api/intelligence/alerts` (via `build_reorder_list`)

Fixed with `naive()` / `now_naive()` helpers that normalise both sides, so the
code behaves the same on SQLite and Postgres.

### 1.2 Non-existent column on `Location`

`app/modules/products/service.py` read `loc.village_name`; the column is
`village_town_city`, and the display field elsewhere is `area`. Every call to
`GET /api/products/{id}/suppliers` — the entire supplier-comparison screen —
returned 500 with `AttributeError`.

Fixed to use `area` with `village_town_city` as fallback, joined with the block
or district.

### 1.3 A profile edit deleted the shop's demand history

`unmet_needs` holds two different things: the categories and free text the
profile form edits, and the `reports` list that "Demand Batao" appends to. The
form submits only the first pair, and `update_retailer_profile` assigned the
payload wholesale — so **saving your profile deleted every demand report you had
ever filed**, silently taking your contribution to the local demand signal with
it.

Reproduced: 2 reports → `PATCH /api/profiles/retailer/me` → 0 reports.
Fixed with a merge that carries forward anything the edit does not mention.

---

## 2. Vite app (`src/`)

| Bug | Effect |
|---|---|
| `getQuantity` was never on the basket context | **Three screens crashed on render** — Market Search, Reorder, Product Detail — with `getQuantity is not a function` |
| `schemesApi.getSchemes()` returned a hardcoded two-scheme array | Every shop saw the same "3/4 criteria met"; the backend's real matcher was never called |
| `fetchApi` called `response.json()` unconditionally | A 204 has no body, so **deleting a catalogue listing always reported failure** while succeeding server-side |
| `addItem` used `Math.min(moq, availableStock)` | Lines opened below MOQ (refused by the API), or at `NaN` when the caller had no stock figure |
| Reorder read `availableStock` / `stockStatus` | Fields this endpoint does not return — the Add button was never disabled, and ordering an unlisted product sent a product id where a catalogue item id belongs |
| `text-error` used in 3 places | `--color-error` lives in `:root`, not `@theme`, so Tailwind v4 never emitted the utility — "Out of stock" and MOQ warnings rendered in body colour, not red |
| Retailer order detail had no cancel action | The API has always accepted a retailer cancellation from `requested` / `accepted` / `preparing` |
| Checkout allowed below-MOQ lines | The order was sent and refused; the warning beside the line did not block the button |
| `scheme.applyAt` used as an `href` | It is prose for the schemes applied for in person ("Nearest bank branch or https://…"), so half the catalogue had a dead link |
| Tailwind scanned the whole repo | It compiled the **Next.js app's** classes into this app's stylesheet, including a `/noise.png` that does not exist here. Scoping with `source("./")` cut the CSS from **101.9 kB to 57.4 kB** (18.0 → 11.5 kB gzipped) — real money on the metered rural connection this app is designed for |
| `esbuild: { jsx: 'automatic' }` in `vite.config.js` | Ignored by Vite 8 (which transforms with oxc) and warned on every build. Now scoped to test mode, where Vitest genuinely needs it |
| `useCatalogue` / `useDeveloperPack` each wrote their fetch twice | The inlined copies had already diverged — neither set the loading flag, so re-searching showed stale rows with no indication a request was in flight. Both now load through the shared `useApiResource` |
| `useCatalogue` stat used the server's unfiltered total | The "Products" figure disagreed with the rows beneath it as soon as a filter ran |

---

## 3. Next.js app (`frontend/`)

This app was not connected in any meaningful sense. Its TypeScript compiled
because the interfaces were self-consistent — they simply described a different
API.

### 3.1 Dashboards described an API that does not exist

`RetailerDashboard` was typed as `{ overview: { totalRevenue, activeOrders,
inventoryAlerts }, demandSignals, opportunities }`. No endpoint has ever returned
that shape, so `dashboardData?.overview?.totalRevenue` was always `undefined`.

What the retailer dashboard actually rendered:

- `Good Morning, Ravi.` — hardcoded
- `Hubli, Karnataka` — hardcoded
- A week of revenue — a fixed array in the file
- `Stock DAP Fertilizer immediately` at `92%` confidence, `+₹12,500 Margin` — invented
- Three identical orders from "AgriCorp Distributors", `#4429`, `₹8,450` — `[1,2,3].map`
- `₹50,000 at 7% p.a.` capital offer — invented
- `₹145,000` revenue — the fallback for the one real read

The distributor dashboard fell back to three invented opportunities
("Belagavi North / DAP Fertilizer / 94") whenever the API returned nothing, and
its headline panel hardcoded that same opportunity — so a distributor with no
signals still saw a 94/100 score.

Both are rewritten against the real payloads, with real empty states.

### 3.2 Ordering was impossible

The product page added to the cart with:

```ts
catalogue_item_id: activeVariant.id,        // a VARIANT id, not a listing id
unit_price: 500,                            // hardcoded
distributor_id: "demo-distributor-id",      // hardcoded
```

Every order built from that payload was refused. Verified against the live API:

```
what the OLD page sent: 404 {'detail': 'Distributor not found'}
```

The page is rebuilt on `GET /products/{id}/suppliers`, which returns the real
listing id, supplier, price, MOQ and stock. The same flow now completes:

```
1. marketplace: 200, 46 products
2. product page: Paneer -> 2 offer(s)
   chosen offer: catalogue_item_id=cat_dist_sharma_paneer_200g
                 distributor=Sharma Distributors (dist_sharma)
                 price=62.0 moq=5 stock=140
3. cart line: quantity 5 (the MOQ), unit_price 62.0
4. checkout: 201 NEX-20260913-0001 total=310.0 status=requested
5. order list: found, status='requested'
6. retailer cancel: 200 -> cancelled
```

Checkout also sent every line to `items[0].distributor_id`, so a basket spanning
two suppliers was rejected wholesale. It now places one order per supplier,
clears only the suppliers that succeeded, and reports each failure with the
server's own reason.

### 3.3 Order statuses the API never emits

Pages branched on `pending`, `processing` and `delivered`. The API uses
`requested`, `accepted`, `preparing`, `ready`, `completed`, `cancelled`,
`rejected`. Consequences:

- The distributor's **entire fulfilment panel was unreachable** (gated on `status === "pending"`), and its buttons would have sent `processing` / `delivered`, which the server rejects.
- The retailer's **cancel button never appeared** on any order.
- Every order rendered amber; a completed one never showed green.
- The raw database value was printed at the user.

Replaced with `src/lib/orderStatus.ts` — one vocabulary, plus the transition
table mirrored from the server so a button never offers a move that will 400.

### 3.4 Other

- `developer-pack` read `data.lines[].product/quantity/explanation`; the endpoint returns `items[]` with `name` / `suggestedQuantity` / `reason`. The page therefore *always* showed "No high-confidence signals found", beside a summary of a fixed ₹12,450 capital and ₹16,800 revenue, with per-line revenue computed as `quantity * 450` under a comment reading `{/* Mock math */}`.
- The opportunity page reached for `opp.product`, `opp.location`, `opp.potential`, `opp.value_potential` — none of which exist. The heading fell back to "Supply Gap Identified" and the headline number was the literal string `"High"`.
- Axios errors discarded the server's `detail`, so a below-MOQ order was reported as "There was a problem placing your order". An interceptor now carries the reason onto `error.message`.
- An order item linked to `/retailer/marketplace/{catalogue_item_id}`, which resolves a *product* id — a 404 on every row.
- `bg-[url('/noise.png')]` in three components; the asset was never added to `public/`.
- `.env.example` and `docker-compose.yml` omitted port 3000, so a developer copying them hit opaque CORS failures on this app.

---

## 4. Data isolation

Swept every endpoint with a retailer token, a distributor token and no token.
No cross-role read succeeds and nothing 500s:

```
403  GET /intelligence/dashboard/retailer   [as distributor]
403  GET /intelligence/dashboard/distributor [as retailer]
403  GET /intelligence/opportunities        [as retailer]
403  GET /intelligence/supply-gaps          [as retailer]
403  GET /intelligence/demand               [as distributor]
403  GET /intelligence/opportunities/<id>   [another distributor's]
403  GET /orders/<id>                       [another party's order]
401  GET /intelligence/dashboard/retailer   [anonymous]
```

Write paths were swept the same way: MOQ, stock, invalid transitions, ownership
on catalogue writes, and role restrictions on ordering all behave.

---

## 5. Release gate

| Check | Result |
|---|---|
| Backend tests | **111 passed** (102 before; 9 regression tests added) |
| Vite tests | **74 passed** (55 before; 19 added) |
| `oxlint src/` | clean |
| `eslint` (Next.js) | clean |
| `tsc --noEmit` (Next.js) | clean |
| `npm run build` (Vite) | clean, no warnings |
| `npm run build` (Next.js) | clean, no warnings |

New regression tests:

- `backend/tests/test_regressions.py` — the timezone crash across all three endpoints, the supplier-list crash, and the demand-report merge.
- `src/pages/retailer/orders/Reorder.test.jsx` — renders the page against the endpoint's real payload; fails without the `getQuantity` fix.
- `src/services/api/schemesApi.test.js` — asserts the module calls `/schemes` rather than returning a built-in list.
- Additions to `useBasket.test.jsx` (MOQ flooring, `getQuantity`) and `client.test.js` (204 bodies, 422 detail flattening).

## 6. Running it

```bash
# Backend
cd backend
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
cp .env.example .env
python -m seed.demo_seed --reset
python -m uvicorn app.main:app --port 8000

# Vite app (port 5173)
npm install && npm run dev

# Next.js app (port 3000)
cd frontend && npm install && npm run dev
```

Demo logins (password `demo1234`): retailer `9000000001`, distributor `9100000002`.
