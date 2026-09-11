# NEXGram Ecosystem Architecture & Domain Foundation

## 1. Executive Summary

NEXGram is evolving from a prototype into a large-scale Retailer ↔ Distributor B2B commerce ecosystem. The architecture must now support complex many-to-many relationships, scale to accommodate extensive product catalogues, and provide a robust transactional foundation for procurement, ordering, and reordering. The deterministic intelligence layer (Demand, Supply Gap, Opportunity, Developer Pack, and Matching Engines) is preserved and will eventually consume normalized data from a central PostgreSQL database rather than frontend state.

This document outlines the target architecture, domain models, backend strategy, and the phased migration plan required to achieve this goal without disrupting the existing frontend application.

---

## 2. Target Product Architecture

NEXGram operates via two primary interconnected loops augmented by an intelligence layer:

### A. Retailer Procurement Loop
- **Catalogue-led:** Retailers actively search, browse, compare distributors, and construct procurement orders from large, multi-category catalogues.
- **Intelligence-led:** Retailers receive proactive Developer Packs and restock recommendations driven by local demand signals and historical order patterns.
- Both paths converge into a unified `Order` system.

### B. Distributor Fulfillment Loop
- Distributors maintain active catalogues mapping to canonical products.
- Distributors define commercial constraints (MOQ, Price) and operational constraints (Service Area, Stock, Delivery Time).
- Distributors receive intelligence regarding unmet local demand to expand their catalogue strategically.

---

## 3. Core Domain Model & Entity Relationships

The most critical architectural change is decoupling products from distributors to support scale.

### 3.1. Canonical Product vs. Catalogue Listing

To support thousands of products, NEXGram must distinguish between the universal product and the distributor's offering:

- **Canonical Product:** Central, platform-owned entities representing the physical product (e.g., "Amul Taaza Milk 500ml").
- **Distributor Catalogue Item:** The distributor-specific commercial offering of that product (e.g., "Sharma Distributors selling Amul Taaza Milk 500ml for ₹25 with MOQ 20").

### 3.2. Recommended PostgreSQL Entities

#### Platform & Taxonomy
- `users`: Authentication and core identity.
- `categories`: Hierarchical product taxonomy (e.g., FMCG > Dairy > Milk).
- `products`: Canonical product master list (`id, name, normalized_name, category_id, brand, pack_size, unit, barcode`).
- `product_variants`: Extends products if variance logic (size/flavor) becomes complex.

#### Business Entities
- `retailer_profiles`: Business details, location, budgets, operating characteristics.
- `distributor_profiles`: Coverage areas, business type, delivery capabilities.
- `locations`: Serviceable grids (Village/Block/District) for match filtering.
- `retailer_distributor_relationships`: Tracks historical/preferred links and friction.

#### Catalogue & Inventory
- `distributor_catalogue_items`: Maps a `distributor_id` to a `product_id` with `price`, `moq`, `stock_qty`, `status`.
- *Note:* In the initial backend MVP, inventory stock state can safely live on the catalogue item. At scale, an `inventory_movements` ledger will be required.

#### Commerce Transactions
- `procurement_drafts`: Unconfirmed carts holding items across potential suppliers.
- `orders`: The immutable transaction record (`id, retailer_id, distributor_id, status, subtotal, total`).
- `order_items`: The line items mapping back to products/catalogue items.

#### Intelligence & Signals
- `demand_signals`: Sourced from retailer inputs and aggregated per location.
- `opportunities`: Computed demand gaps assigned to relevant distributors.
- `recommendation_evidence`: Explanatory data preserving the "why" for recommendations.

---

## 4. Retailer-Distributor Relationship Model

The architecture explicitly supports **many-to-many** commerce:

- **Retailer ↔ Multiple Distributors:** A retailer buys Dairy from Distributor A, but Staples from Distributor B.
- **Retailer ↔ Multiple Products from One Distributor:** A retailer consolidates orders, buying 15 different canonical products from a single distributor in one order.

Orders must be mapped as `One Order → Many OrderItems`. The Developer Pack logic correctly aggregates multiple products, but the future ordering system must allow independent, cart-based multi-product checkouts from specific suppliers.

---

## 5. Order & Reorder Architecture

### 5.1. The Order Model
Orders are immutable snapshots in time. When a retailer orders a product, the `unit_price` and `quantity` are frozen on the `order_items` table. Future catalogue price changes will not affect historical records.

### 5.2. The Reorder Model
Reordering does **not** create a separate transactional pathway. 
Instead:
`Completed Order` → Extract `Historical Order Items` → `New Procurement Draft` → `New Order`

Reorder intelligence will eventually factor in consumption velocity (time since purchase) to suggest exact reorder moments.

---

## 6. Intelligence Architecture Integration

The five existing deterministic engines (Demand, SupplyGap, Opportunity, DeveloperPack, DistributorMatching) will remain intact. 

**Future Data Flow:**
1. Backend APIs retrieve normalized state from PostgreSQL (Retailers, Catalogues, Signals).
2. Data passes through the existing `Normalization.js` utilities to ensure string consistency.
3. The deterministic Engines process the unified data arrays to generate Scores, Opportunities, and Packs.
4. The frontend renders the generated recommendations and Evidence (reasons), removing the burden of client-side business logic calculation.

---

## 7. Search & Scaling Strategy

With the catalogue expanding to 10,000+ products:

- **MVP Search:** PostgreSQL `ILIKE` on `normalized_name`, supported by B-Tree indexes on `category_id` and `distributor_id`.
- **Search Optimization:** Materialized views for "Available Products by Location" to speed up retailer discovery.
- **Future Scale:** Introduce PostgreSQL Full-Text Search (tsvector). External search engines (ElasticSearch) are explicitly delayed until scale necessitates them.

---

## 8. Data Ownership & Privacy Boundaries

To maintain trust in a B2B environment:

- **Platform-Owned:** Canonical product definitions, taxonomy, aggregate location-based intelligence, normalized demand scores.
- **Distributor-Private:** Internal inventory buffers, supplier economics, B2B wholesale costs.
- **Retailer-Private:** Procurement budgets, historical purchasing volume, unmet needs, business age/health data.
- **Public/Marketplace-Visible:** Distributor catalogue prices (when marked visible), MOQ, delivery terms, service radius, product availability.

---

## 9. Mock Data to Database Migration Map

The existing frontend mock arrays must eventually map to the new SQL schema:

| Current Mock Object | Target PostgreSQL Table | Migration Notes |
| :--- | :--- | :--- |
| `RETAILER_DASHBOARD_MOCK` | `retailer_profiles` | Extract location to `locations` table reference |
| `DISTRIBUTOR_DASHBOARD_MOCK` | `distributor_profiles` | Extract service areas to join tables |
| `MOCK_PRODUCTS` | `products` & `categories` | Centralize into canonical definitions |
| `AVAILABLE_PRODUCTS_MOCK` | `distributor_catalogue_items`| Strip product metadata, link via `product_id` |
| `MOCK_ORDERS` | `orders` & `order_items` | Split header (status, dates) and line items |
| `DEMAND_TEST_MOCK` | `demand_signals` | Store as individual signals, computed via Engine |

---

## 10. Proposed Backend Architecture

To serve the frontend efficiently while retaining stability, the backend will be a **FastAPI Modular Monolith** backed by PostgreSQL.

**Module Structure:**
- `api/auth/` (JWT Authentication & RBAC)
- `api/retailers/`
- `api/distributors/`
- `api/catalogue/` (Products, Categories, Listings)
- `api/orders/` (Procurement, Checkout, Reorder)
- `api/intelligence/` (Wrapping the 5 JS Engines ported to or executed via micro-services/Python equivalents)

**No Microservices:** The ecosystem relies on high relational connectivity (Retailer -> Order -> Distributor -> Product -> Category). A monolithic PostgreSQL database avoids distributed transaction complexity.

---

## 11. Migration Sequence & Recommendations

The frontend must remain operational throughout the migration.

1. **Phase 4.1:** Stand up PostgreSQL and the canonical Product/Category taxonomy.
2. **Phase 4.2:** Deploy FastAPI Read-Only APIs mirroring the Mock data structures. Point the existing React components to these endpoints sequentially.
3. **Phase 4.3:** Implement the multi-product checkout and Order immutable lifecycle.
4. **Phase 5.0:** Authentication & Role-Based Access Control (JWT), eliminating hardcoded identities.
5. **Phase 5.1:** Migrate localStorage state (Onboarding, Profiles) to backend persistence. (Note: Intelligence remains unintegrated and runs locally on frontend).
6. **Phase 5.2:** Production Data & Intelligence Integration Audit to map actual architecture and mock dependencies.
7. **Phase 5.3:** Production Intelligence Data Pipeline. Implemented Demand and Supply Gap backend aggregation and persistence logic.
8. **Phase 5.3A:** Production Intelligence Integrity Hardening. Enforced idempotency via deterministic UUID hashing to circumvent database NULL-constraint regressions, and added robust adversarial test coverage.
9. **Phase 5.4 (Current):** Production Opportunity Engine. Migrated frontend Opportunity logic to a deterministic PostgreSQL-backed backend service that reliably scores and distributes opportunities to appropriate distributors based on geographic constraint mapping.
10. **Future Phases:** Migrate the Developer Pack Engine and Distributor Matching Engine to the backend to emit pre-calculated recommendations securely.

**Conclusion:**
NEXGram's transition to a scalable architecture fundamentally rests on separating canonical products from distributor catalogues, adopting an immutable order ledger, and formalizing the many-to-many relationship structures—all while preserving the powerful deterministic intelligence layer.
