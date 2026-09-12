# NEXGram — Frontend Improvement Roadmap

This roadmap defines the prioritized sequence of frontend improvements derived from the full codebase audit. 

---

## Priority Classification Framework

- **P0 — Blocking:** Issues preventing reliable feature exploration, error recovery, or breaking test/runtime confidence.
- **P1 — Critical UX:** Usability, clarity, or workflow limitations that significantly hinder merchant understanding or procurement conversion.
- **P2 — Important:** Feature enhancements that materially improve daily productivity, discoverability, and data visibility.
- **P3 — Polish:** Micro-interactions, visual flair, animation smoothing, and styling refinements.

---

## P0 — Blocking Improvements

### 1. Fix Vitest Test Suite Environment (`localStorage` Mock)
- **Problem:** Running `npm test` fails 49 test cases across 7 files because `src/test/setup.js` attempts `localStorage.clear()` in jsdom where `window.localStorage` is not cleanly mocked.
- **Affected File:** `src/test/setup.js`
- **Why It Matters:** Breaks CI/CD confidence and prevents automated regression testing during frontend iterations.
- **Dependency:** None.
- **Suggested Solution:** Define a robust storage mock object in `setup.js` before all test hooks execute.
- **Estimated Complexity:** Low (1 hour)

### 2. Resolve React Effect Cascading State Warnings
- **Problem:** Oxlint reports 13 warnings for `react(set-state-in-effect)` in `useCatalogue.js`, `OnboardingFlow.jsx`, `AuthContext.jsx`, `Schemes.jsx`, and `EditProfile.jsx`.
- **Affected Files:** `src/pages/distributor/catalogue/hooks/useCatalogue.js`, `src/pages/retailer/onboarding/OnboardingFlow.jsx`, `src/context/AuthContext.jsx`, `src/pages/schemes/Schemes.jsx`, `src/pages/profile/EditProfile.jsx`
- **Why It Matters:** Causes unnecessary double-renders, potential infinite render loops on slow devices, and skips React Compiler optimizations.
- **Dependency:** None.
- **Suggested Solution:** Refactor state derivation to happen during render or inside event callbacks rather than synchronous `useEffect` calls.
- **Estimated Complexity:** Medium (3 hours)

---

## P1 — Critical UX Improvements

### 3. Replace Simulated Onboarding Location Detection with Location Selector
- **Problem:** The retailer and distributor onboarding location step uses a mock `setTimeout(800ms)` that hardcodes "Palampur Market" / "Palampur Hub", preventing users outside Palampur from setting their real location during signup.
- **Affected Components:** `src/pages/retailer/onboarding/steps/Location.jsx`, `src/pages/distributor/onboarding/steps/Location.jsx`
- **Why It Matters:** Location is the primary filter for demand aggregation and distributor matching; inaccurate locations break rural intelligence.
- **Dependency:** Backend `/api/distributors` and existing `locations` data.
- **Suggested Solution:** Implement a searchable district & village dropdown with real postal code autocomplete based on existing seeded locations.
- **Estimated Complexity:** Medium (4 hours)

### 4. Multi-Supplier Unified Procurement Basket & Checkout Drawer
- **Problem:** Currently, adding items from a distributor's catalogue only persists within that specific distributor view (`src/pages/retailer/distributors/Catalogue.jsx`). If a retailer navigates back to search for another supplier, the draft is cleared.
- **Affected Components:** `src/pages/retailer/distributors/Catalogue.jsx`, `src/pages/retailer/distributors/components/OrderDraftBar.jsx`, `src/pages/retailer/market/MarketSearch.jsx`
- **Why It Matters:** Rural merchants buy different categories from different distributors in a single buying session. Losing cart items across views creates severe purchase friction.
- **Dependency:** `ordersApi.createOrder`.
- **Suggested Solution:** Introduce a global Procurement Basket drawer that groups items by supplier, enforces per-supplier MOQ, and provides one-click multi-order dispatch.
- **Estimated Complexity:** High (6–8 hours)

### 5. Distributor Opportunity Revenue Estimator & Fast-Stocking Workflow
- **Problem:** On `OpportunityDetail.jsx`, distributors see the recommended initial stock count, but have no intuitive way to calculate their expected margin or customize the stock quantity before clicking "Catalogue mein add karo".
- **Affected Component:** `src/pages/distributor/opportunities/OpportunityDetail.jsx`
- **Why It Matters:** The primary conversion action for distributors is turning an opportunity signal into a live catalogue listing.
- **Dependency:** Backend opportunity evidence schema.
- **Suggested Solution:** Add an interactive margin calculator slider showing projected investment, expected weekly turnover, and pre-filling the catalogue form with 1-click pricing.
- **Estimated Complexity:** Medium (4 hours)

---

## P2 — Important Improvements

### 6. Enhanced Order Status Stepper & Direct Counterparty Communication
- **Problem:** `OrderDetailView.jsx` displays static status badges and history timestamps, but lacks direct merchant action hooks (e.g. "Call Distributor", "WhatsApp Order Slip", "Expected Delivery Date").
- **Affected Components:** `src/components/orders/OrderDetailView.jsx`, `src/pages/retailer/orders/OrderDetail.jsx`, `src/pages/distributor/orders/OrderDetail.jsx`
- **Why It Matters:** Rural commerce relies heavily on phone calls and WhatsApp confirmations once an order is placed.
- **Dependency:** `RetailerProfile.mobile` and `DistributorProfile.mobile`.
- **Suggested Solution:** Add click-to-call and WhatsApp pre-filled message generator buttons for both retailer and distributor views.
- **Estimated Complexity:** Low (2–3 hours)

### 7. Search & Date Filter in Order History
- **Problem:** `OrderList.jsx` only filters by status (`all`, `requested`, `accepted`, `completed`, `cancelled`). Finding a specific order requires scrolling.
- **Affected Component:** `src/components/orders/OrderList.jsx`
- **Why It Matters:** Active retailers and distributors managing dozens of weekly orders need quick search by order number, product name, or shop name.
- **Dependency:** None (client-side filtering or query params).
- **Suggested Solution:** Add an order search input and date-range preset selector.
- **Estimated Complexity:** Low (2 hours)

### 8. Category-Based Fast Filters in Distributor Discovery & Market Search
- **Problem:** Category filtering in `MarketSearch.jsx` and `DistributorDiscovery.jsx` uses simple text chips that require horizontal scrolling.
- **Affected Components:** `src/pages/retailer/market/MarketSearch.jsx`, `src/pages/retailer/distributors/DistributorDiscovery.jsx`
- **Why It Matters:** Kirana merchants think in visual categories (Dairy, Staples, Oils, Snacks).
- **Dependency:** Category icons / SVGs.
- **Suggested Solution:** Add category visual badges with category count pills for rapid one-touch filtering.
- **Estimated Complexity:** Low (2 hours)

---

## P3 — Polish & Micro-Interactions

### 9. Micro-Animations & Haptic Feedback Indicators
- **Problem:** Adding products to pack or draft happens instantly without tactile feedback or subtle micro-animations.
- **Affected Components:** `PackProductRow.jsx`, `CatalogueRow.jsx`, `QuantityStepper.jsx`
- **Why It Matters:** Gives users confidence that their action was registered, especially on lower-end mobile devices.
- **Dependency:** Tailwind CSS animations.
- **Suggested Solution:** Add smooth spring transitions, button active scale effects (`active:scale-95`), and toast confirmations.
- **Estimated Complexity:** Low (2 hours)

### 10. Offline Stale Data Indicator & Instant Network Recovery Toast
- **Problem:** `ConnectionBanner.jsx` warns when offline, but does not provide an explicit "Tap to Refresh" sync button when connectivity is restored.
- **Affected Component:** `src/components/ui/ConnectionBanner.jsx`
- **Why It Matters:** Rural network connectivity fluctuates constantly.
- **Dependency:** `src/hooks/useConnection.js`
- **Suggested Solution:** Add a sticky floating banner with an animated sync indicator and manual retry button.
- **Estimated Complexity:** Low (1.5 hours)

---

## Summary Matrix of Frontend Tasks

| Priority | Task Description | Primary Component | Complexity | Estimated Effort |
| -------- | ---------------- | ----------------- | ---------- | ---------------- |
| **P0** | Fix Vitest storage setup | `src/test/setup.js` | Low | 1 hr |
| **P0** | Resolve React effect lint warnings | `useCatalogue.js`, `OnboardingFlow.jsx` | Medium | 3 hrs |
| **P1** | Real onboarding location picker | `Location.jsx` (Retailer & Distributor) | Medium | 4 hrs |
| **P1** | Unified Multi-Supplier Cart Drawer | `Catalogue.jsx`, `MarketSearch.jsx` | High | 8 hrs |
| **P1** | Distributor Opportunity margin calculator | `OpportunityDetail.jsx` | Medium | 4 hrs |
| **P2** | Call / WhatsApp merchant action buttons | `OrderDetailView.jsx` | Low | 2.5 hrs |
| **P2** | Order number / name search in OrderList | `OrderList.jsx` | Low | 2 hrs |
| **P2** | Visual category cards in Market & Discovery | `MarketSearch.jsx`, `DistributorDiscovery.jsx` | Low | 2 hrs |
| **P3** | Tactile micro-animations & quantity stepper | `QuantityStepper.jsx`, `CatalogueRow.jsx` | Low | 2 hrs |
| **P3** | Offline sync banner with manual retry | `ConnectionBanner.jsx` | Low | 1.5 hrs |
