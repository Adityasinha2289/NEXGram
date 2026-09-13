- `[x]` Audit and fix Retailer Journey
  - `[x]` Dashboard — endpoint returned 500 for any shop with order history (tz bug)
  - `[x]` Product Discovery (Search, Variants) — supplier list returned 500 (`village_name`)
  - `[x]` Supplier Comparison — page crashed on a missing basket method
  - `[x]` Add to Procurement Basket — lines opened below MOQ / at NaN
  - `[x]` Multi-Distributor Review and Checkout — below-MOQ orders were sent and refused
  - `[x]` Order Detail & State Transitions — retailer had no way to cancel
  - `[x]` Reorder & Price/MOQ Refresh — endpoint 500ed; page read fields it never returns
  - `[x]` Demand Batao & Demand Signal Generation — a profile edit deleted every report
  - `[x]` Smart Stock Plan & AI Explanation Guardrails — verified explanations only
- `[x]` Audit and fix Distributor Journey
  - `[x]` Dashboard / Intelligence Overview
  - `[x]` Opportunity Engine (Score, Confidence, Evidence)
  - `[x]` Catalogue Management (Stock, MOQ, Price) — delete always reported failure
  - `[x]` Incoming Orders & State transitions — fulfilment panel was unreachable
- `[x]` Security and Integrations
  - `[x]` Data Isolation (Retailer vs Distributor) — swept, 403 on every cross-role read
  - `[x]` Mock removal (ensure data originates from DB/API)
- `[x]` Final Release Gate
  - `[x]` Test suite execution (Frontend & Backend) — 74 Vite, 111 backend, all passing
  - `[x]` Linting execution — oxlint, eslint and tsc all clean
  - `[x]` Build verification — both apps build without warnings
  - `[x]` Documentation update — see `docs/NEXGRAM_CONNECTIVITY_AUDIT.md`
  - `[ ]` Git Push to origin — left to you; nothing has been committed

Findings and fixes are written up in `docs/NEXGRAM_CONNECTIVITY_AUDIT.md`.

## Shop-floor features (loans, sourcing, inventory, voice, delivery)

- `[x]` Loan help — amount-aware matching, EMI estimate, apply and track
- `[x]` Distributor network at least rates — basket optimiser, split vs single supplier
- `[x]` Inventory, shelf life (FEFO batches) and local-demand restock plan
- `[x]` Voice sale from the counter mic, with a typed fallback
- `[x]` Chotu delivery — customer storefront, shop delivery desk, runners
- `[x]` Frontend for all five, in the Vite app (`src/`)
- `[x]` Tests: 271 backend, 141 frontend
- `[x]` Documentation — `docs/NEXGRAM_SHOP_FEATURES.md`
- `[ ]` Git push to origin — still yours; nothing has been committed
