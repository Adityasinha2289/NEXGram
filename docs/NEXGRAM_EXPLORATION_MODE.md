# NEXGram — Exploration Mode & Development Stabilization Guide

## 1. Why Exploration Mode Exists

NEXGram connects rural retailers and distributors through demand signals, real-time catalogue discovery, developer packs, and opportunity engines. During iterative development, validation, and design review, requiring users or developers to manually register, verify, log in, and complete multi-step retailer or distributor onboarding before reaching every screen significantly impedes rapid feature inspection.

Exploration Mode provides an unblocking development-time entry flow:
```text
Open NEXGram
      ↓
Enter application
      ↓
Choose / enter as Retailer or Distributor
      ↓
Explore features immediately
```

Key principles of Exploration Mode:
* **No Blocking Gates**: Login, signup, and onboarding are not forced before accessing dashboards or deep-linked feature pages.
* **Full Backend RBAC & JWT Preservation**: Exploration Mode does **NOT** weaken backend API security or delete authentication/onboarding routes. Real JWTs and seeded identities from the database are utilized.
* **No Fake / Mock Intelligence**: The backend PostgreSQL database and live intelligence engines remain the sole source of truth.

---

## 2. How Exploration Mode is Configured and Enabled

Exploration Mode is controlled via the environment configuration pattern in `src/constants/config.js`:

```javascript
export const IS_EXPLORATION_MODE =
  import.meta.env.VITE_EXPLORATION_MODE !== 'false' &&
  (import.meta.env.DEV || import.meta.env.VITE_EXPLORATION_MODE === 'true');
```

* In **Local Development** (`import.meta.env.DEV`), Exploration Mode is active by default.
* In **Production Builds** (`import.meta.env.PROD`), Exploration Mode is strictly disabled unless `VITE_EXPLORATION_MODE=true` is explicitly provided.
* To explicitly force Exploration Mode off in development: set `VITE_EXPLORATION_MODE=false` in `.env.local` or environment variables.

---

## 3. How Retailer Exploration Works

1. **Entry**: Users navigating to `/` or directly to `/retailer/dashboard` are automatically authenticated with the seeded retailer development account.
2. **Accessible Routes**:
   * `/retailer/dashboard` — Live retailer metrics, unmet demand summaries, and distributor matching.
   * `/retailer/developer-pack` — Tailored category inventory recommendations.
   * `/retailer/distributors` — Distributor directory, catalogue discovery, and stock lookup.
   * `/retailer/orders` & `/retailer/reorder` — Active order tracking and 1-click replenishment.
   * `/retailer/demand/report` — Real-time unmet demand reporting engine.
   * `/retailer/profile` & `/retailer/profile/edit` — Profile review and live intelligence re-triggering.
   * `/retailer/onboarding` — Preserved for manual step-by-step testing.

---

## 4. How Distributor Exploration Works

1. **Entry**: Users navigating to `/` or directly to `/distributor/dashboard` are automatically authenticated with the seeded distributor development account.
2. **Accessible Routes**:
   * `/distributor/dashboard` — Overview of demand clusters, active opportunities, and quick stats.
   * `/distributor/catalogue` — Live product inventory, pricing, MOQ, stock status, and variant additions.
   * `/distributor/opportunities` — PostgreSQL-persisted Opportunity Engine signals.
   * `/distributor/orders` — Incoming retailer orders with state machine transitions (pending -> confirmed -> dispatched -> delivered).
   * `/distributor/profile` & `/distributor/profile/edit` — Distributor operational coverage and category settings.
   * `/distributor/onboarding` — Preserved for manual step-by-step testing.

---

## 5. Development Identities & Seed Database

Development identities are selected from pre-seeded database accounts rather than mock in-memory objects:
* **Retailer Identity**: Seeded Retailer (e.g., Gupta Kirana Store, Kangra / Palampur Market)
* **Distributor Identity**: Seeded Distributor (e.g., Himachal Dairy & Agro, Kangra)

These identities correspond to real PostgreSQL rows with populated categories, variants, historical demand, and orders.

---

## 6. Role Switching

A role toggle switcher is integrated directly in the top navigation bar (`TopNav.jsx`) during Exploration Mode:
* Clicking **"Switch to Distributor"** or **"Switch to Retailer"** immediately authenticates the session into the counterpart demo account via the standard login endpoint, retrieves a valid JWT token, caches the profile, and navigates seamlessly to the appropriate dashboard.

---

## 7. How Backend Authentication Remains Protected

Exploration Mode maintains strict backend isolation:
* **No Admin Bypasses**: Backend endpoints continue to enforce JWT validation and role-based access control (RBAC).
* **Ownership Enforcement**: Retailer endpoints only return data belonging to the authenticated retailer ID; distributor endpoints only permit actions by the authenticated distributor ID.
* **Token Validity**: The frontend generates real JWT tokens via standard authentication requests against the backend auth endpoints.
* **No Secrets Committed**: Client code does not contain hardcoded backend master tokens or JWT signing secrets.

---

## 8. Disabling Exploration Mode & Production Readiness

To disable Exploration Mode and restore strict production gating:
1. Ensure `VITE_EXPLORATION_MODE=false` in production environment settings.
2. `ProtectedRoute` and `RequireOnboarding` will automatically enforce authentication and profile completion requirements.
3. Production builds (`npm run build`) automatically default to strict production behavior.
