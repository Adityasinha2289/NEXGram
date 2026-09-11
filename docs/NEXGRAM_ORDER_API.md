# NEXGram Order API Architecture (Phase 4.3)

## Overview
Phase 4.3 implements a fully transactional B2B procurement engine natively on PostgreSQL and FastAPI. It replaces legacy local mock data with real database persistence, price snapshotting, and stock concurrency management.

## 1. Domain Model
The architecture relies on three primary tables:
- `orders`: Contains high-level information (retailer, distributor, total, status, timestamps).
- `order_items`: Maps 1-to-many from `orders`. Captures the exact quantity and heavily protects the **snapshotted unit price** at the time of creation.
- `order_status_history`: A log tracking the entire lifecycle of an order to enforce strict transitions.

## 2. Validation & Business Rules
When a retailer calls `POST /api/orders`, the following validations occur atomically:
1. **Distributor Ownership**: An order cannot contain a mix of products from different distributors, nor can it claim a product belongs to a distributor when it doesn't.
2. **MOQ Enforcement**: The requested quantity MUST be `>= minimum_order_quantity` defined in the catalogue.
3. **Stock Verification**: The requested quantity MUST be `<= available_stock`.

If any of these fail, the *entire* transaction is rolled back. No partial orders are ever created.

## 3. Inventory & Concurrency
We chose a direct stock decrement model that occurs at the **acceptance** phase, not the **draft/requested** phase.
- `requested` -> `accepted`: The backend uses `with_for_update()` to place a row-level lock on the `distributor_catalogue_items`. It verifies stock is still sufficient and decrements it. If stock depleted between request and acceptance, it throws an HTTP 409 Conflict.
- `cancelled` or `rejected`: If an order is cancelled *after* it was accepted, the stock is automatically returned to the catalogue.

## 4. Price Snapshotting
A critical commercial invariant. Prices in the B2B world change frequently.
When `POST /api/orders` runs, `OrderItem.unit_price` is hardcopied from `DistributorCatalogueItem.selling_price`.
Even if the distributor updates the catalogue price 5 minutes later, historical orders remain immutable.

## 5. API Endpoints
- `POST /api/orders`: Create an order.
- `GET /api/orders`: Paginated list of orders, filterable by `retailer_id` and `distributor_id`.
- `GET /api/orders/{id}`: Detailed view including items and status history.
- `PATCH /api/orders/{id}/status`: Safe state machine for progressing the order through its lifecycle.

## 6. Status Lifecycle
Allowed flow:
`requested` → `accepted` → `preparing` → `ready` → `completed`
Alternative terminations:
`requested` → `rejected`
`accepted`/`preparing`/`ready` → `cancelled`

The backend strictly rejects invalid jumps (e.g. `completed` → `preparing`).

## 7. Identity Handling (Development)
Since full authentication (Phase 5) is not yet built, the frontend handles session identity using hardcoded constants:
- Retailer UI uses `ret_ramesh`.
- Distributor UI uses `dist_sharma`.
This is strictly isolated to the UI layer. The API itself is fully dynamic and accepts any valid identity.
