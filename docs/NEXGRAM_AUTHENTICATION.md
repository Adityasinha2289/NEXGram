# NEXGram Authentication & Authorization (Phase 5.0)

## Overview

NEXGram implements a strict, role-based authorization model using OAuth2 with JWT (JSON Web Tokens).

The backend is the **sole authority** for identifying who is making a request. The frontend never passes its own `retailer_id` or `distributor_id` as trusted data.

## Architecture

### 1. Identity Verification (JWT)
When a user logs in, the FastAPI backend issues an `access_token` signed with `HS256`. 
The token contains:
- `sub`: The UUID of the authenticated `User`.
- `exp`: Expiration timestamp.

### 2. The Dependency Chain
FastAPI endpoints use a layered dependency injection chain to enforce access:
- `get_current_user`: Verifies the JWT signature, checks expiration, and retrieves the `User` record from the database. Rejects if inactive or missing.
- `get_current_retailer`: Demands the user has `role == "retailer"`, and fetches their specific `RetailerProfile`.
- `get_current_distributor`: Demands the user has `role == "distributor"`, and fetches their specific `DistributorProfile`.

### 3. Resource Isolation
Endpoints never trust client payloads for ownership:
- **Creating Orders**: The payload's `retailer_id` is forcefully overwritten by `current_retailer.id`.
- **Viewing Orders**: The API automatically filters `orders` by `current_user`'s profile ID. Retailers cannot query distributor orders, and vice versa.
- **Updating Orders**: The API verifies that the `distributor_id` on the order matches `current_distributor.id` before allowing status transitions (like accepting or completing). Retailers are only authorized to transition to `cancelled`.

### 4. Frontend Integration
The React frontend handles session state globally via `AuthContext`.
- Tokens are stored in `localStorage` (`nexgram_access_token`).
- `fetchApi` automatically appends the `Authorization: Bearer <token>` header to every request.
- `fetchApi` intercepts `401 Unauthorized` responses and emits an event (`auth:unauthorized`) which forces the context to clear state and redirect to `/login`.
- `ProtectedRoute` components wrap the React Router to prevent accessing the UI of the wrong role.

## Seed Accounts (Development)
For local development, the `initial_seed.py` creates default accounts. All use the password `password123`.

- **Retailer**: Ramesh (`8888888881`)
- **Distributor 1**: Sharma (`9999999991`)
- **Distributor 2**: Gupta (`9999999992`)
