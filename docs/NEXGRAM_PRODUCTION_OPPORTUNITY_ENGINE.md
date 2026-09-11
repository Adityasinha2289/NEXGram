# NEXGram Production Opportunity Engine

## 1. Inputs
The engine natively consumes aggregated records from PostgreSQL:
- **Demand**: `SupplyGaps` contain the calculated `retailer_demand_count` (aggregated uniquely per retailer) and `location_id`.
- **Supply**: `SupplyGaps` contain `supplier_count` (unique distributor listings for that product/category).
- **Distributor Profiles**: Contains business constraints, locations (areas/districts), and categories.

## 2. Scoring Formula
The exact deterministic scoring is calculated as:
- **Base Score**: Inherits the raw `gap_score` from `SupplyGap` (which is typically `normalized_demand - supply`).
- **Volume Bonus**: `min(20, gap.retailer_demand_count * 2)`. Gives a boost for large markets without overpowering the total.
- **Competition Adjustment**: 
  - 0 suppliers: +10
  - 1 supplier: +5
  - >= 4 suppliers: -10
- **Total Opportunity Score**: `max(0, min(100, Base + Volume + Competition))`

## 3. Distributor Fit
Evaluated individually for every `DistributorProfile` against every `SupplyGap`.
- **Location Fit**:
  - `High`: Distributor's Area == Gap's Area
  - `Medium`: Distributor's District == Gap's District
  - `Not Suitable`: Mismatch (Excluded from persistence).
- **Category Match**: Matches string name from gap category/product against distributor's claimed array of categories or primary `business_category`.
- If a distributor is "Not Suitable", no opportunity row is generated for them for that gap.

## 4. Geographic Matching
Uses exact string and ID mapping. "Unknown" (NULL) locations in gaps are safely skipped (they are not assigned to distributors). Mismatched areas and districts strictly prevent opportunity assignment.

## 5. Opportunity Identity
Identity is strictly deterministic:
`UUIDv5 Hash ( distributor_id, product_id, category_id, location_id )`
This ensures distinct commercial situations do not collide, and identical situations perfectly deduplicate.

## 6. Persistence & 7. Idempotency
Data is persisted to the `opportunities` PostgreSQL table.
Idempotency is mathematically enforced using `ON CONFLICT (id) DO UPDATE`. 
- When the engine runs repeatedly, it updates the `opportunity_score`, `demand_score`, `supply_score`, and `distributor_fit` inline rather than creating duplicate records or deleting historical context.

## 8. API
```text
POST /api/intelligence/opportunities/generate (Admin/System only)
GET  /api/intelligence/opportunities (Returns authorized distributor's opportunities)
GET  /api/intelligence/opportunities/{opportunity_id} (Returns single authorized record)
```

## 9. Privacy
Opportunities strictly obfuscate underlying retailer identities. Only aggregate `potential_retailer_count` is exposed. 
Distributor endpoints are filtered strictly by `distributor_id` derived from the JWT authentication `user_id`. A distributor cannot see another's opportunities.

## 10. Limitations
- True radial radius mapping (e.g. 50km bounds) is deferred to future geo-spatial queries. Matching is string-equality based on district/area.
- Product/Category mapping is dependent on string matching and assumes upstream normalization handles synonyms effectively.

## 11. Comparison with old JS OpportunityEngine
- **Location**: JS engine lived on the frontend and calculated on the fly across fixtures.
- **Speed**: JS engine recalculated every render. Backend engine uses pre-calculated batch upserts, yielding O(1) reads for the distributor dashboard.
- **Data Source**: JS engine used `mockData.js`. Backend engine consumes verified PostgreSQL telemetry.
- **Integrity**: Backend correctly bounds distributor scope. JS engine leaked global opportunities.
