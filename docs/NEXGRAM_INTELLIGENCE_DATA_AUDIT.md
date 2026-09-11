# NEXGram Phase 5.2: Intelligence Integration Audit

## 1. Actual Intelligence Architecture

The Phase 5.1 report claimed that intelligence engines transitioned to PostgreSQL-backed profiles. **This claim is partially false.**
While the *identity* and *profiles* of Retailers and Distributors are now loaded from the PostgreSQL database (via the FastAPI backend and React Context), the **Intelligence Layer itself is entirely unintegrated.**

**The Actual Data Flow:**
```text
PostgreSQL
   ↓
FastAPI
   ↓
React (AuthContext / Profile API) -> Supplies Retailer/Distributor Identity
   +
Hardcoded Frontend Mock Files -> Supplies Demand, Supply, Catalogue data
   ↓
Intelligence Engine (Local JS Execution)
   ↓
React UI Component
```

The engines (DemandEngine, SupplyGapEngine, OpportunityEngine, DeveloperPackEngine, DistributorMatchingEngine) are still running client-side in the browser and consuming static test fixtures (`mockData`, `demandTestMock`, `supplyGapTestMock`) instead of live PostgreSQL business data.

## 2. Intelligence Engines Audit

### A. Demand Engine
- **Input Source:** Hardcoded `DEMAND_TEST_MOCK`
- **Location:** Executed in `src/pages/distributor/Dashboard.jsx` and `useDeveloperPack.js`
- **Production Status:** Not using PostgreSQL demand. It consumes a static array of mock retailers instead of aggregating real demand across live retailers.

### B. Supply Gap Engine
- **Input Source:** Output of Demand Engine + `SUPPLY_GAP_CATALOGUES_MOCK`
- **Location:** Executed in `src/pages/distributor/Dashboard.jsx` and `useDeveloperPack.js`
- **Production Status:** It incorrectly compares mock retailer demand with mock distributor catalogues, entirely bypassing the live PostgreSQL catalogue.

### C. Opportunity Engine
- **Input Source:** Output of Supply Gap Engine + `SUPPLY_GAP_CATALOGUES_MOCK`
- **Location:** Executed in `src/pages/distributor/Dashboard.jsx`
- **Production Status:** Opportunity scores are generated based on fake data. No output is persisted to PostgreSQL.

### D. Developer Pack Engine
- **Input Source:** Real Retailer Profile (from PostgreSQL via AuthContext) + Mock Demand Signals + Mock Supply Gaps + `SUPPLY_GAP_CATALOGUES_MOCK`.
- **Location:** Executed in `src/pages/retailer/developer-pack/hooks/useDeveloperPack.js`
- **Production Status:** Hybrid but flawed. It takes the real user profile (budget, business type) but then generates a Developer Pack based on fake local supply and demand.

### E. Distributor Matching Engine
- **Input Source:** Output of Developer Pack + `SUPPLY_GAP_CATALOGUES_MOCK` + `DISTRIBUTORS_LIST_MOCK`
- **Location:** Executed in `src/pages/retailer/distributors/DistributorDiscovery.jsx`
- **Production Status:** The UI fetches real distributors from the backend (`distributorsApi.getDistributors`) to display, but the Matching Engine still cross-references the developer pack against the hardcoded `DISTRIBUTORS_LIST_MOCK` to determine fulfillment.

## 3. Mock Dependency Audit

| File | Mock/Data Source | Runtime? | Test? | Action |
| --- | --- | :---: | :---: | --- |
| `src/data/demandTestMock.js` | `DEMAND_TEST_MOCK` | Yes | Yes | Migrate to test fixture only |
| `src/data/supplyGapTestMock.js` | `SUPPLY_GAP_CATALOGUES_MOCK` | Yes | Yes | Migrate to test fixture only |
| `src/data/distributorDiscoveryMock.js` | `DISTRIBUTORS_LIST_MOCK` | Yes | Yes | Migrate to test fixture only |
| `src/data/retailerMock.js` | `DEVELOPER_PACK_MOCK`, `RETAILER_DASHBOARD_MOCK` | Yes | Yes | Migrate |
| `src/data/distributorMock.js` | `DISTRIBUTOR_DASHBOARD_MOCK` | Yes | Yes | Migrate |
| `src/data/mockData.js` | `mockProducts`, `mockCategories` | Yes | Yes | Migrate |

**Note:** These mock files are actively imported into production UI components (Dashboards, Discovery, Hooks).

## 4. JSON Profile Audit

Phase 5.1 introduced JSON fields into `RetailerProfile` and `DistributorProfile`. 

| Field | Current Type | Used For | Queryable? | Should Remain JSON? |
| --- | --- | --- | --- | --- |
| `demanded_categories` | JSON (Array) | Demand Engine scoring | Yes | **No**. Migrate to relational `demand_signals` or mapping table to filter at scale. |
| `unmet_needs` | JSON (Object) | NLP/Keyword scoring | Partially | **No**. The categories array should be relational; the "other" text can remain text. |
| `requirements` | JSON (Array/Text) | Keyword searching | No | **Yes**. Free-text requirements are fine as JSON or simple Text, unless categorized. |
| `product_categories` | JSON (Array) | Distributor filtering | Yes | **No**. Should map to canonical `categories` table via `distributor_categories`. |
| `delivery_capabilities` | JSON (Object) | Logistics matching | Yes | **Yes**. Complex nested logistics metadata is acceptable as JSON. |
| `stock_capacity` | JSON (Object) | Tiering | No | **Yes**. Small metadata object. |

## 5. Intelligence Data Contract

To run successfully on the backend, the engines require the following conceptual contract:

**Demand Engine:**
- Needs `List[RetailerProfile]` with relational `demanded_categories` and `location`.

**Supply Gap Engine:**
- Needs `List[DemandSignal]` (output of Demand Engine).
- Needs `List[DistributorCatalogueItem]` containing canonical `product_id`, `distributor_id`, `stock_status`, `price`, `location`.

**Distributor Matching Engine:**
- Needs `DeveloperPack` requirements.
- Needs live `distributor_catalogue_items` for the specific area to calculate exact `percent_fulfilled` and `price`.

## 6. Duplicate Business Logic

| Rule | Current Location | Desired Source of Truth |
| --- | --- | --- |
| Stock Status | Frontend JS (`Normalization.js`) | Backend Database (computed property) |
| MOQ Rules | Frontend Engine | Backend / API layer |
| Location Matching | Frontend String Comparison | Backend PostGIS or structured Area matches |
| Product Identity | String matching in JS | Database `product_id` (UUID) |

## 7. Scalability Audit

**Current Bottleneck:** O(N × M) processing in the browser.
If 1,000 retailers and 10,000 catalogue items exist in a district, fetching all of them to the React frontend to compute the Supply Gap and Opportunity Scores will crash the browser due to memory limits and network payload size.
Intelligence MUST be moved to the backend.

## 8. Persistence Status

- **Database Tables:** `demand_signals`, `opportunities`, `recommendation_evidence` exist in `models/intelligence.py` as SQLAlchemy schemas.
- **Actual Persistence:** **Zero.** No FastAPI routes write to these tables. They are schema placeholders only. Intelligence outputs are ephemeral in React state and `localStorage`.

## 9. Privacy / Security Findings

Because intelligence computes on the frontend, the API must theoretically send all competitor distributor catalogues and all retailer demand profiles to the client to run the engine.
**CRITICAL FLAW:** A distributor could inspect the network tab and see the exact unmet needs, budget, and purchasing patterns of every retailer in their district. This must be calculated securely on the backend, returning only aggregated scores.

## 10. Recommended Target Architecture

```text
Production:
PostgreSQL → FastAPI Intelligence Service (Python/SQL) → API Response → React UI (View Only)

Tests:
Controlled Fixtures → Intelligence Engine
```

*(Note: As of Phase 5.3, this target architecture has been achieved for the Demand and Supply Gap pipelines. They now run on the backend utilizing production PostgreSQL data. As of Phase 5.3A, the intelligence pipeline has been hardened with deterministic identity models ensuring strict uniqueness mapping without PostgreSQL NULL-conflict regressions.)*

## 11. Next Phase Recommendation

**Phase 5.4 Recommendation:** With Demand and Supply Gaps now aggregating correctly on the backend, and integrity guarantees enforced via deterministic hashing, the next step is to migrate the **Opportunity Engine, Developer Pack Engine, and Distributor Matching Engine** to the backend so they can securely consume these real signals.

---

### Audit Test & Build Results
- `npm run build`: Success (built in 165ms).
- `Frontend Tests`: Failed (No test runner configured in `package.json`).
- `Backend Tests`: Failed (`pytest` not found).
