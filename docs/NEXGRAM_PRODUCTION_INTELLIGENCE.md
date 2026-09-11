# NEXGram Production Intelligence Data Pipeline

This document describes the Phase 5.3 backend intelligence pipeline, which shifts the system from a mock-driven, client-side intelligence model to a true PostgreSQL-backed, server-side data pipeline.

## 1. Production Architecture

The new intelligence pipeline operates strictly on the backend:

```text
PostgreSQL (Live Business Data)
       ↓
FastAPI Intelligence Services (DemandEngine, SupplyGapEngine)
       ↓
Normalization & Aggregation Layer
       ↓
PostgreSQL (Intelligence Data Persistence: demand_signals, supply_gaps)
```

The frontend React application will (in a subsequent phase) solely consume the output of this backend layer rather than executing business logic locally.

## 2. Data Sources

- **Demand:** Extracted from `retailer_profiles` (`demanded_categories`, `unmet_needs`, `requirements`). 
- **Supply:** Extracted from `distributor_catalogue_items` in combination with `distributor_profiles` and `products`.

## 3. Demand Signal Model

The `DemandEngine` extracts text and JSON data from retailer profiles and transforms them into standard `DemandSignal` records containing:
- `retailer_id`, `product_id`, `category_id`, `location_id`
- `signal_type`: Extracted via explicit metadata (`category_requirement`, `unmet_need`) or NLP keyword extraction (`product_requirement`).
- `confidence`: Scoring based on explicit versus implicit intent (e.g., explicit unmet needs score 3.0, implicit mentions score 1.0).

## 4. Supply Model

The `SupplyGapEngine` evaluates live catalog items (`distributor_catalogue_items`) where `is_active=True`. It maps stock quantities into intelligent categorizations:
- `available`: `available_stock >= 10` (or `stock_status` explicitly "available")
- `low_stock`: `0 < available_stock < 10`
- `out_of_stock`: `available_stock == 0`

## 5. Geographic Matching

Geography is matched strictly by `location_id` between `DemandSignal` aggregates and `DistributorProfile`. This assumes that demand and supply are co-located in the same geographic grid block. Future versions will incorporate `service_radius` overlapping logic.

## 6. Demand Aggregation

`DemandSignals` are grouped by `(product_id, category_id, location_id)`. The strength of the demand is computed by counting the distinct number of `retailer_id`s in that group. This prevents duplicate mentions from a single retailer from inflating market demand artificially.

## 7. Supply-Gap Calculation

The Gap Score is determined by:
1. Normalizing demand (capping at a high value, e.g., 10 for simplicity).
2. Assigning a supply score based on the count of suppliers with `available` stock:
   - 4+ suppliers: `Strong` (Score: 4.0)
   - 2-3 suppliers: `Adequate` (Score: 2.0)
   - 1 supplier: `Limited` (Score: 1.0)
   - 0 suppliers: `Unavailable` (Score: 0.0)
3. `Gap Score = max(0, Normalized Demand - Supply Score)`

## 8. Persistence Strategy

- **Demand Signals:** Persisted as *raw*, per-retailer signals. This preserves the provenance of the demand (who asked for it and why).
- **Supply Gaps:** Persisted as *aggregated* signals representing market conditions for a given `(product, category, location)`.

## 9. Identity and Idempotency (Phase 5.3A Hardening)

To elegantly handle canonical identity and strictly enforce idempotency across database engines (specifically circumventing PostgreSQL's `NULL != NULL` unique constraint behavior), NEXGram uses deterministic UUID hashing for Primary Keys:

- **DemandGeneration** hashes `(retailer_id, product_id, category_id, signal_type, source)` into a deterministic UUIDv5 `id`. PostgreSQL safely executes `ON CONFLICT (id) DO NOTHING`.
- **SupplyGapGeneration** hashes `(product_id, category_id, location_id)` into a deterministic UUIDv5 `id`. PostgreSQL safely executes `ON CONFLICT (id) DO UPDATE`.
- **OpportunityGeneration** hashes `(distributor_id, product_id, category_id, location_id)` into a deterministic UUIDv5 `id`. PostgreSQL safely executes `ON CONFLICT (id) DO UPDATE`.

This ensures that missing products (e.g., category-only demands) or missing locations do not trigger infinite duplicate row creation on repeated generation runs. Multiple products in the same location safely coexist as mathematically distinct hashes.

Unknown locations (`location_id=None`) are strictly excluded from cross-referencing against other unknown locations, enforcing geographic safety.

## 10. API Endpoints

```text
POST /api/intelligence/demand/generate     (Trigger demand extraction)
GET  /api/intelligence/demand              (View raw signals)

POST /api/intelligence/supply-gaps/generate (Trigger gap analysis)
GET  /api/intelligence/supply-gaps          (View market gaps)

POST /api/intelligence/opportunities/generate (Trigger distributor opportunity generation)
GET  /api/intelligence/opportunities          (View distributor-specific actionable opportunities)
```

*Generation endpoints are protected and not for public consumption.*

## 11. Privacy

Because intelligence calculation and aggregation now occur on the server, the frontend only receives compiled results (e.g., "8 Retailers want Paneer"). It no longer receives the raw `retailer_profiles` dataset, effectively securing retailer privacy and budgets from distributor snooping.

## 12. JavaScript/Python Coexistence

The JavaScript engines (`DemandEngine.js`, `SupplyGapEngine.js`) remain in the `src/features/intelligence/` folder to serve as deterministic documentation, unit test fixtures, and fallback implementations until the UI is fully migrated to consume the new `GET /api/intelligence` endpoints.

## 13. Performance Strategy

By pushing calculation to the backend and aggregating via SQLAlchemy `GROUP BY` functions, the frontend network footprint is reduced from potentially megabytes of full catalogue data down to kilobytes of `SupplyGap` summary data.

## 14. Future Migration Plan

**Phase 5.4:** The next required step is to migrate the Opportunity Engine, Developer Pack Engine, and Distributor Matching Engine to the backend, enabling them to consume the newly persisted `demand_signals` and `supply_gaps`.
