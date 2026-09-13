# Shop features: loans, sourcing, inventory, voice and delivery

Five features, end to end: the API, the screens in the Vite app, and the demo
data to exercise both. 271 backend tests and 141 frontend tests pass.

Sections 1-5 cover the backend. Section 7 covers the frontend. Every walkthrough
below is real output, taken from the seeded demo database.

---

## 1. Loan help

Rule-based scheme matching already existed. What was missing was the part a
shopkeeper actually needs: *"who will lend me thirty thousand rupees, and what
will it cost me a month"*.

**Amount-aware matching.** Every scheme now carries `minAmount`, `maxAmount` and
`isLoan`. `GET /api/schemes?amount=30000` ranks schemes that can cover that
amount first and says why the others cannot:

```
OK  PM MUDRA Yojana (Shishu)
no  PM Formalisation of Micro Food Processing   Yeh scheme Rs 50,000 se shuru hoti hai.
no  Udyam Registration (MSME)                   Yeh loan nahi, registration hai.
```

Schemes that do not cover the amount are still returned, marked, and ranked
below — so the list never silently shrinks.

**Applications.** `POST /api/loans` records an application with a quotable
reference (`NXL-202609-16393`), an indicative EMI, and a **frozen snapshot of
the criteria that matched at submission** — a later profile edit cannot rewrite
the basis on which it was submitted.

| Endpoint | Purpose |
|---|---|
| `GET /api/loans/estimate` | Indicative EMI, explicitly not an offer |
| `POST /api/loans` | Apply against a scheme |
| `GET /api/loans` · `GET /api/loans/{id}` | Track applications |
| `POST /api/loans/{id}/withdraw` | The one status change the applicant owns |
| `PATCH /api/loans/{id}/decision` | Admin-only — records what the lender said |

Guardrails, all tested:

- An amount above the scheme ceiling is refused *with the ceiling* — no wasted trip to a bank.
- A second live application for the same scheme is refused (it is a duplicate at the lender, not two chances).
- **A borrower cannot approve their own loan** — `PATCH .../decision` is 403 for anyone but admin.
- Another user's application is a 404, not a read.

---

## 2. Distributor network at the least rate

The reason a shopkeeper visits four suppliers: each is cheapest on something,
nobody is cheapest on everything, and comparing them by hand across forty SKUs
is not work anyone does — so they settle for one and overpay on most of the
basket.

`POST /api/procurement/optimise` prices a list against every distributor who can
deliver to the shop and returns three things:

- the **cheapest split** — each line from whoever is genuinely cheapest, grouped into one order per supplier;
- the **best single supplier**, priced honestly, because one delivery is worth something real;
- the **saving between them**, so the shopkeeper decides rather than being told.

`POST /api/procurement/place-split` turns that into real orders — one per
supplier, re-optimised server-side rather than trusting a client-supplied
allocation (a client-supplied allocation is also a client-supplied price). One
supplier failing does not lose the others.

**Margin is disclosed in rupees on every quote**, never folded into the price:

```
split across 4 supplier(s): Rs 2376.00
platform fee (2%):          Rs   47.52  ->  payable Rs 2423.52
saving vs dearest:          Rs  270.00
```

Two correctness details worth naming:

- A supplier listing the same product in two pack sizes used to count as covering two lines of the basket, ranking them above a supplier who genuinely stocked more. Offers are now deduplicated per product.
- `savingVsSingle` is `null` when no single supplier covers the whole list. It previously subtracted a *partial* basket's total from a complete one and reported **−1376** — which reads as "splitting costs you more" when the real answer is that the one-stop option does not exist.

---

## 3. Inventory, shelf life and local demand

New tables model the shop itself, separate from the wholesale side:
`retailer_inventory` (the shelf), `inventory_batches` (a lot with its own
expiry), `stock_movements` (every change and its cause).

**Stock leaves by expiry, not arrival.** A sale draws from the batch expiring
soonest (FEFO). That single choice is what turns a shelf-life field into money
saved rather than a date on a screen. Undated stock is kept until last.

**Nothing changes a quantity without writing a movement.** Sales rate, wastage
and "why is my count wrong" are all read back out of that ledger — so counter
sales, voice sales and online orders produce *one* set of numbers, not three.

`GET /api/inventory/restock-plan` answers "what do I buy next" from three
directions:

```
to reorder: 2 (2 urgent), cost Rs 774.00     wastage at risk: Rs 764.00
  Curd:   order  9 - Aap roz lagbhag 2.133 bechte hain - 2 stock 0.9 din chalega.
  Milk:   order 16 - Aap roz lagbhag 5.467 bechte hain - 6 stock 1.1 din chalega.
  EXPIRY  Milk:   Aaj hi discount par nikalein
  NEW     Biscuits: Aapke area ke 1 shop ise maang rahe hain aur aap abhi yeh nahi rakhte
```

- **Running out** — measured from this shop's own sales ledger, not a reorder level typed at signup.
- **About to expire** — and only the portion that *will not sell in time* is counted as at risk, priced at cost.
- **Not stocked at all** — from the existing supply-gap engine. A shop cannot observe demand for something it has never sold; this is the one line no stock-level rule can produce. Filtered to what a local supplier can actually deliver, because a recommendation nobody can fulfil is just a complaint.

Shelf life caps the order: suggesting a week of bread that keeps three days is a
week of waste dressed up as advice.

---

## 4. Voice sale from the counter microphone

**The phone does the listening.** The browser's own `SpeechRecognition` API
produces the transcript on-device, free, with no audio reaching the server —
both the fastest path to build and the only version a shopkeeper would leave
switched on all day. The backend is the half that has to be right: taking one
noisy Hinglish sentence and deciding which row on the shelf it means.

```
POST /api/inventory/voice-sale   {"transcript": "do packet doodh aur ek dahi"}

heard 'do packet doodh' -> Milk 500ml x2  (confidence 1.0)
heard 'ek dahi'         -> Curd 400g  x1  (confidence 1.0)
applied: understood=2, value Rs 100.00      Milk 6->4, Curd 2->1
```

What makes it tractable: the vocabulary is tiny (a number, a unit word, a
product), and the candidate set is *this shop's* shelf — a few dozen rows, not a
national catalogue.

Handled: digits, English and Hindi number words in both scripts
(`do`/`दो`/`2`/`two`), `dozen` as a multiplier, unit and filler words stripped,
several items in one sentence split on `aur`/`and`/`,`.

**The catalogue is in English; shopkeepers say "doodh".** A Hinglish alias table
bridges them — without it the feature matched nothing in the shops it is built
for. Matched on any word of the product name, so "Amul Toned Milk" picks up
"doodh" without every brand needing an entry.

**A wrong guess is worse than no guess.** Below the confidence threshold, or
when two candidates score within 0.08 of each other, or when stock is short,
*nothing is deducted* — the line comes back with its candidates for a one-tap
confirmation. Phantom deductions are how a shopkeeper stops trusting their own
stock count, and then the feature is off for good.

Two deliberate choices:

- The certain half of a sentence still applies. "do packet doodh aur ek shampoo" deducts the milk; otherwise the whole sentence has to be repeated.
- The transcript is stored on the movement, so a wrong deduction can be *explained*, not just reversed.
- `POST /api/inventory/voice-sale/preview` reads a sentence and changes nothing.

---

## 5. Chotu delivery

A household opens the app, sees what the kirana two streets away has on its
shelf *right now*, and orders it. The shop's own delivery boy walks or cycles it
over.

**The radius is the design.** Everything is bounded by what someone covers on a
bicycle (`DELIVERY_RADIUS_KM`, default 3 km), which is what makes the promise
deliverable without a fleet or a dispatch algorithm. A shop too far away is not
a slower option — it is not an option, and the customer is told before they pick
items rather than after:

> Yeh dukaan 13.2 km door hai. Hamare delivery boy cycle par jaate hain, isliye sirf 3.0 km tak delivery hoti hai.

A shop nobody geocoded is still reachable by its own area, so an unmapped
village shop is not excluded.

```
nearby: Gupta Kirana Store   Aapke paas hi   8 items, 10-15 min
placed: NXD-20260912-7188  Rs 490.00  (0.38 km)
accepted -> shelf 18 -> 16          (stock committed on accept)
out_for_delivery  runner=Chotu (cycle)
delivered
ledger: ['sale_online', 'sale_voice', 'sale_voice', 'sale_counter', ...]
```

Design decisions that matter:

- **Stock is committed on accept, not on place.** Reserving at placement lets anyone empty a shelf with orders they never pay for; the shopkeeper accepting is the point they have agreed to sell it. Cancelling after acceptance returns it; cancelling before returns nothing.
- **The online order and the walk-in draw down the same shelf.** Accepting is refused with a 409 if the counter sold it first — tested.
- The delivery address is **snapshotted at checkout**, so a later profile edit cannot rewrite where a past order was sent.
- A runner from another shop cannot be assigned (404), and retiring one deactivates rather than deletes — past orders still reference who delivered them.
- A customer may cancel until the runner leaves; after that the shop handles it, because someone is already on a bicycle with the goods.

---

## Verification

| Check | Result |
|---|---|
| Backend tests | **271 passed** (111 before) |
| New tests added | 160 across 5 files |
| Migration `adfbe48d1dcd` | Applies cleanly from an empty DB; creates all 8 tables |
| Cross-role isolation | Every new endpoint refuses the wrong role (403) and anonymous (401) |
| Live walkthrough | All five features exercised end to end against the seeded DB |

New test files: `test_shop_inventory.py` (25), `test_voice_sale.py` (35),
`test_procurement.py` (20), `test_storefront.py` (29), `test_restock_plan.py`
(23), `test_loans.py` (28).

### Demo accounts

Password `demo1234`:

| Role | Mobile | |
|---|---|---|
| retailer | 9000000001 | Gupta Kirana Store — 8 shelf lines, 28 days of sales |
| distributor | 9100000002 | Himachal Dairy Co |
| customer | 9500000001 | Sunita Devi, 400 m from the shop |

```bash
cd backend
python -m alembic upgrade head
python -m seed.demo_seed --reset
python -m uvicorn app.main:app --port 8000
```

---

## 7. The frontend

All five features are built into the **Vite app** (`src/`), which is the final
application. The Next.js app in `frontend/` is unchanged and still covers only
the wholesale journeys.

### New screens

| Route | What it does |
|---|---|
| `/retailer/inventory` | The shelf — cover days, expiry, price, online listing, stock-take correction |
| `/retailer/voice-sale` | The counter microphone, with a typed fallback |
| `/retailer/restock` | What to buy next: running out, expiring, and what the area wants |
| `/retailer/sourcing` | One basket priced across every local distributor |
| `/retailer/deliveries` | The shop's delivery desk and its runners |
| `/retailer/schemes` · `/distributor/schemes` | Loan schemes by amount, EMI, apply and track |
| `/shop` · `/shop/:id` · `/shop/orders` · `/shop/address` | The household storefront |

A third role — `customer` — now runs through auth, routing, navigation and the
landing page, with its own demo account.

### Decisions worth naming

**The mic is not required.** Browser `SpeechRecognition` is Chrome/Edge only;
Firefox has none and iOS Safari is unreliable. The same screen accepts a typed
Hinglish sentence and posts it to the identical endpoint, so the feature works
on every device — and in a shop too loud to dictate in. Transcription is
on-device: no audio leaves the phone.

**A wrong guess is never made.** When the matcher is unsure, the line comes back
with its candidates for a one-tap confirmation and *nothing* is deducted. The
confirmed id is re-checked against the shop server-side rather than trusted.

**Margin is shown in rupees, beside the button.** Folding it into the prices
would make the sourcing screen a marketplace pretending to be a price
comparison.

**Every suggested quantity carries its sentence.** "Aap roz lagbhag 2.167
bechte hain — 1 stock 0.5 din chalega" sits under the number. A quantity with no
reason is a number nobody acts on.

**Both sourcing plans can actually be ordered.** The screen offers the cheapest
split *and* the best single supplier; `POST /procurement/place-split` gained a
`mode` so choosing one and having the other placed cannot happen.

### Code splitting

Routes are lazy-loaded. A retailer never downloads the distributor's opportunity
engine or the household's storefront, which on the metered rural connection this
product targets is real money:

| | Before | After |
|---|---|---|
| Initial JS (gzip) | 144 kB | **93 kB** |

### Verification

| Check | Result |
|---|---|
| Frontend tests | **141 passed** (81 before; 60 added across 6 new files) |
| Backend tests | **271 passed** |
| `oxlint` · Vite build | clean, no warnings |
| Next.js eslint · tsc · build | clean (app unchanged) |
| Live | every new route serves and every endpoint it calls answers 200 |

New test files: `Inventory.test.jsx` (9), `VoiceSale.test.jsx` (9),
`RestockPlan.test.jsx` (8), `Sourcing.test.jsx` (11), `Deliveries.test.jsx` (7),
`ShopCatalogue.test.jsx` (7), `Loans.test.jsx` (9).

### Running the whole thing

```bash
# Backend
cd backend
python -m alembic upgrade head
python -m seed.demo_seed --reset
python -m uvicorn app.main:app --port 8000

# App
npm install && npm run dev        # http://localhost:5173
```

Sign in from the landing page as a retailer, a distributor, or a household — or
use the role switcher in the top bar, which now cycles all three.
