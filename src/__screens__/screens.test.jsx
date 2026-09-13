import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import alerts from './payloads/alerts.json';
import autobasket from './payloads/autobasket.json';
import custMe from './payloads/cust_me.json';
import custOrders from './payloads/cust_orders.json';
import deliveries from './payloads/deliveries.json';
import devpack from './payloads/devpack.json';
import devpackOptions from './payloads/devpack_options.json';
import distCatalogue from './payloads/dist_catalogue.json';
import distDashboard from './payloads/dist_dashboard.json';
import distOrders from './payloads/dist_orders.json';
import distributors from './payloads/distributors.json';
import inventory from './payloads/inventory.json';
import loans from './payloads/loans.json';
import market from './payloads/market.json';
import opportunities from './payloads/opportunities.json';
import reorder from './payloads/reorder.json';
import restock from './payloads/restock.json';
import retDashboard from './payloads/ret_dashboard.json';
import retOrders from './payloads/ret_orders.json';
import runners from './payloads/runners.json';
import schemes from './payloads/schemes.json';
import shops from './payloads/shops.json';
import products from './payloads/products.json';
import categories from './payloads/categories.json';

/**
 * Every screen, mounted against the response the real API gave for it.
 *
 * The unit tests around this one each cover a screen's behaviour. This covers
 * the thing none of them do: that all of them still render at all, on real
 * data, without the faults a person would see immediately and an assertion
 * about one element would miss — a screen that throws on a field it assumed,
 * a <div> inside a <p> collapsing a layout, duplicate keys silently dropping
 * rows, a button nobody can name.
 *
 * The payloads under ./payloads are captured from a seeded backend rather than
 * written by hand, so they carry the shapes that actually occur: quantities
 * capped by supplier stock, category-level demand gaps, a district with one
 * shop in delivery range. Re-capture them when an endpoint's shape changes;
 * a screen failing here after a backend change is this test doing its job.
 */
const ROUTES = [
  ['/intelligence/dashboard/retailer', retDashboard],
  ['/intelligence/dashboard/distributor', distDashboard],
  ['/intelligence/developer-pack/options', devpackOptions],
  ['/intelligence/developer-pack', devpack],
  ['/intelligence/opportunities', opportunities],
  ['/intelligence/reorder', reorder],
  ['/intelligence/alerts', alerts],
  ['/intelligence/demand-reports', []],
  ['/intelligence/market', market],
  ['/intelligence/demand', { items: [] }],
  ['/intelligence/supply-gaps', { items: [] }],
  ['/procurement/auto-basket', autobasket],
  ['/inventory/restock-plan', restock],
  ['/inventory/movements', { items: [] }],
  ['/inventory', inventory],
  ['/storefront/shop/orders', deliveries],
  ['/storefront/shop/runners', runners],
  ['/storefront/shops', shops],
  ['/storefront/orders', custOrders],
  ['/storefront/me', custMe],
  ['/distributors/me/catalogue', distCatalogue],
  ['/distributors', distributors],
  ['/profiles/retailer/me', { id: 'rp1', business_name: 'Gupta Kirana Store', profile_complete: true }],
  ['/profiles/distributor/me', { id: 'dp1', business_name: 'Himachal Dairy Co', profile_complete: true }],
  ['/orders', retOrders],
  ['/schemes', schemes],
  ['/loans', loans],
  ['/categories', categories],
  // The real shape is { items, page, page_size, total, has_next }. This said
  // { results, total }, which no endpoint returns.
  ['/products', products],
  ['/assistant/status', { configured: false, model: null }],
  ['/auth/clerk/status', { configured: false }],
  ['/auth/me', { id: 'u1', name: 'Ramesh', role: 'retailer', profile_complete: true }],
];

vi.mock('../services/api/client', () => ({
  fetchApi: vi.fn(async (endpoint) => {
    const path = String(endpoint).split('?')[0];
    // /orders is one endpoint the server scopes by whoever is signed in, so
    // the fixture has to follow the role too — otherwise the distributor's
    // orders screen is quietly rendering a retailer's orders.
    if (path.startsWith('/orders')) {
      return currentUser.role === 'distributor' ? distOrders : retOrders;
    }
    for (const [prefix, body] of ROUTES) {
      if (path.startsWith(prefix)) return body;
    }
    return {};
  }),
  markFresh: vi.fn(),
  // The real thing, not a stub. Mocking a module replaces all of it, and
  // leaving this out threw inside every api call that takes filters — so every
  // screen with a query string rendered its error state and this test happily
  // checked that instead of the screen.
  buildQueryString: (params) => {
    if (!params) return '';
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') search.append(key, value);
    }
    const query = search.toString();
    return query ? `?${query}` : '';
  },
}));

let currentUser = { id: 'u1', name: 'Ramesh', role: 'retailer' };
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    currentUser,
    profile: { id: 'p1', business_name: 'Gupta Kirana Store' },
    setProfile: vi.fn(),
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    loginWithClerk: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  }),
}));

const { RetailerDashboard } = await import('../pages/retailer/Dashboard');
const { DistributorDashboard } = await import('../pages/distributor/Dashboard');
const { Inventory } = await import('../pages/retailer/inventory/Inventory');
const { RestockPlan } = await import('../pages/retailer/inventory/RestockPlan');
const { VoiceSale } = await import('../pages/retailer/inventory/VoiceSale');
const { Deliveries } = await import('../pages/retailer/deliveries/Deliveries');
const { Sourcing } = await import('../pages/retailer/sourcing/Sourcing');
const { ProcurementReview } = await import('../pages/retailer/procurement/ProcurementReview');
const { RetailerOrders } = await import('../pages/retailer/orders/RetailerOrders');
const { Reorder } = await import('../pages/retailer/orders/Reorder');
const { MarketSearch } = await import('../pages/retailer/market/MarketSearch');
const { DistributorDiscovery } = await import('../pages/retailer/distributors/DistributorDiscovery');
const { DeveloperPack } = await import('../pages/retailer/developer-pack/DeveloperPack');
const { ReportDemand } = await import('../pages/retailer/demand/ReportDemand');
const { Catalogue: DistCatalogue } = await import('../pages/distributor/catalogue/Catalogue');
const { OpportunitiesList } = await import('../pages/distributor/opportunities/OpportunitiesList');
const { DistributorOrders } = await import('../pages/distributor/orders/DistributorOrders');
const { Shops } = await import('../pages/customer/Shops');
const { MyOrders } = await import('../pages/customer/MyOrders');
const { Address } = await import('../pages/customer/Address');
const { Loans } = await import('../pages/loans/Loans');
const { Schemes } = await import('../pages/schemes/Schemes');
const { Landing } = await import('../pages/Landing');
const { BasketProvider } = await import('../context/BasketContext');

const SCREENS = [
  ['Landing', Landing, 'retailer', '/'],
  ['Retailer / Dashboard', RetailerDashboard, 'retailer', '/retailer/dashboard'],
  ['Retailer / Inventory', Inventory, 'retailer', '/retailer/inventory'],
  ['Retailer / Restock plan', RestockPlan, 'retailer', '/retailer/restock'],
  ['Retailer / Voice sale', VoiceSale, 'retailer', '/retailer/voice-sale'],
  ['Retailer / Deliveries', Deliveries, 'retailer', '/retailer/deliveries'],
  ['Retailer / Sourcing', Sourcing, 'retailer', '/retailer/sourcing'],
  ['Retailer / Procurement', ProcurementReview, 'retailer', '/retailer/procurement'],
  ['Retailer / Orders', RetailerOrders, 'retailer', '/retailer/orders'],
  ['Retailer / Reorder', Reorder, 'retailer', '/retailer/reorder'],
  ['Retailer / Market search', MarketSearch, 'retailer', '/retailer/market'],
  ['Retailer / Distributors', DistributorDiscovery, 'retailer', '/retailer/distributors'],
  ['Retailer / Developer pack', DeveloperPack, 'retailer', '/retailer/developer-pack'],
  ['Retailer / Report demand', ReportDemand, 'retailer', '/retailer/report-demand'],
  ['Retailer / Loans', Loans, 'retailer', '/retailer/schemes'],
  ['Retailer / Schemes', Schemes, 'retailer', '/retailer/schemes'],
  ['Distributor / Dashboard', DistributorDashboard, 'distributor', '/distributor/dashboard'],
  ['Distributor / Catalogue', DistCatalogue, 'distributor', '/distributor/catalogue'],
  ['Distributor / Opportunities', OpportunitiesList, 'distributor', '/distributor/opportunities'],
  ['Distributor / Orders', DistributorOrders, 'distributor', '/distributor/orders'],
  ['Customer / Shops', Shops, 'customer', '/shop'],
  ['Customer / My orders', MyOrders, 'customer', '/shop/orders'],
  ['Customer / Address', Address, 'customer', '/shop/address'],
];

/**
 * React reports these to the console rather than throwing.
 *
 * The nesting alternatives are both here on purpose: React 19 says "cannot be
 * a descendant of" where 18 said "cannot appear as a descendant of", and
 * matching only the older wording meant a <div> inside a <p> sailed through.
 */
const REACT_FAULTS = new RegExp([
  'validateDOMNesting',
  'cannot be a descendant',
  'cannot appear as a descendant',
  'unique "key"',
  'Each child',
  'Failed prop',
].join('|'));

let errSpy;
let warnSpy;

beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  errSpy.mockRestore();
  warnSpy.mockRestore();
});

/** Controls a screen reader would announce as just "button". */
function unnamedControls() {
  const problems = [];
  for (const el of document.querySelectorAll('button, a[href]')) {
    const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
    if (!name) problems.push(`unnamed <${el.tagName.toLowerCase()}>: ${el.outerHTML.slice(0, 100)}`);
  }
  for (const img of document.querySelectorAll('img')) {
    if (img.getAttribute('alt') === null) problems.push(`<img> with no alt: ${img.outerHTML.slice(0, 80)}`);
  }
  for (const input of document.querySelectorAll('input, select, textarea')) {
    const id = input.getAttribute('id');
    const labelled = input.getAttribute('aria-label')
      || input.getAttribute('aria-labelledby')
      || (id && document.querySelector(`label[for="${id}"]`))
      // A control wrapped in a <label> with text is labelled by it, no `for`
      // needed — leaving this out reports correctly-labelled controls.
      || input.closest('label')?.textContent?.trim();
    if (!labelled) problems.push(`unlabelled <${input.tagName.toLowerCase()}>: ${input.outerHTML.slice(0, 100)}`);
  }
  return problems;
}

describe('every screen', () => {
  for (const [name, Screen, role, path] of SCREENS) {
    it(`renders ${name} on real data`, async () => {
      currentUser = { id: 'u1', name: 'Ramesh', role };

      render(
        <MemoryRouter initialEntries={[path]}>
          <BasketProvider>
            <Routes>
              <Route path={path} element={<Screen />} />
              <Route path="*" element={<Screen />} />
            </Routes>
          </BasketProvider>
        </MemoryRouter>,
      );
      // Wait for the data, not merely for something on screen. A page header
      // renders before its fetch resolves, so asserting on the first paint
      // checks the skeleton and passes no matter what the loaded screen does —
      // which is exactly what this test did until a deliberately broken screen
      // failed to fail it.
      await act(async () => {
        await new Promise((resolve) => { setTimeout(resolve, 50); });
      });
      await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));

      // A screen that failed to load renders ErrorState, and every check below
      // would then be inspecting that instead of the screen. This test spent a
      // while doing exactly that, because the mock above was missing an export
      // and every filtered request threw.
      expect(document.body.textContent).not.toContain('Kuch galat ho gaya');

      const faults = [...errSpy.mock.calls, ...warnSpy.mock.calls]
        .map((call) => String(call[0]))
        .filter((message) => REACT_FAULTS.test(message));

      expect([...new Set(faults)]).toEqual([]);
      expect(unnamedControls()).toEqual([]);
    });
  }
});
