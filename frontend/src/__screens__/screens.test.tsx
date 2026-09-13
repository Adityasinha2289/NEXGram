import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import devpack from './payloads/devpack.json';
import devpackOptions from './payloads/devpack_options.json';
import distDashboard from './payloads/dist_dashboard.json';
import distOrders from './payloads/dist_orders.json';
import market from './payloads/market.json';
import opportunities from './payloads/opportunities.json';
import reorder from './payloads/reorder.json';
import retDashboard from './payloads/ret_dashboard.json';
import retOrders from './payloads/ret_orders.json';
import schemes from './payloads/schemes.json';
import products from './payloads/products.json';
import categories from './payloads/categories.json';

/**
 * Every screen in the Next.js app, mounted against the responses the real API
 * gave for them.
 *
 * This app had no tests at all, so nothing stopped a screen from throwing on a
 * field it assumed, nesting a <div> inside a <p>, or shipping a control with
 * no accessible name. The payloads are the same captures the Vite app's screen
 * test uses, taken from a seeded backend, so both frontends are checked against
 * one source of truth about what the API returns.
 */
const ROUTES: [string, unknown][] = [
  ['/intelligence/dashboard/retailer', retDashboard],
  ['/intelligence/dashboard/distributor', distDashboard],
  ['/intelligence/developer-pack/options', devpackOptions],
  ['/intelligence/developer-pack', devpack],
  ['/intelligence/opportunities', opportunities],
  ['/intelligence/reorder', reorder],
  ['/intelligence/market', market],
  ['/intelligence/demand-reports', []],
  ['/schemes', schemes],
  ['/categories', categories],
  ['/products', products],
  ['/auth/me', { id: 'u1', name: 'Ramesh', role: 'retailer', profile_complete: true }],
];

let role: 'retailer' | 'distributor' = 'retailer';

const respond = async (url: string) => {
  const path = String(url).split('?')[0];
  // /orders is scoped by whoever is signed in, so the fixture follows the role
  // rather than always handing back a retailer's orders.
  if (path.startsWith('/orders')) {
    return { data: role === 'distributor' ? distOrders : retOrders };
  }
  for (const [prefix, body] of ROUTES) {
    if (path.startsWith(prefix)) return { data: body };
  }
  return { data: {} };
};

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn((url: string) => respond(url)),
    post: vi.fn((url: string) => respond(url)),
    put: vi.fn((url: string) => respond(url)),
    patch: vi.fn((url: string) => respond(url)),
    delete: vi.fn((url: string) => respond(url)),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

const CART_ITEM = {
  catalogue_item_id: 'cat_1',
  product_id: 'prod_paneer',
  product_name: 'Paneer',
  variant_name: '200g',
  quantity: 10,
  unit_price: 62,
  distributor_id: 'dist_sharma',
  distributor_name: 'Sharma Distributors',
  minimum_order_quantity: 5,
  available_stock: 140,
};

// Checkout redirects to the cart when the basket is empty and renders nothing
// on the way, so an empty store would have this test checking a blank page.
vi.mock('@/store/cartStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store/cartStore')>();
  return {
    ...actual,
    useCartStore: Object.assign(
      () => ({
        items: [CART_ITEM],
        addItem: vi.fn(),
        removeItem: vi.fn(),
        updateQuantity: vi.fn(),
        clearCart: vi.fn(),
        clearDistributor: vi.fn(),
      }),
      { getState: () => ({ items: [CART_ITEM] }) },
    ),
  };
});

vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      user: { id: 'u1', name: 'Ramesh', role, profile_complete: true },
      isAuthenticated: true,
      isHydrating: false,
      login: vi.fn(),
      logout: vi.fn(),
      setHydrating: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

const RetailerDashboard = (await import('@/app/(dashboard)/retailer/page')).default;
const RetailerOrders = (await import('@/app/(dashboard)/retailer/orders/page')).default;
const RetailerMarketplace = (await import('@/app/(dashboard)/retailer/marketplace/page')).default;
const RetailerDeveloperPack = (await import('@/app/(dashboard)/retailer/developer-pack/page')).default;
const RetailerFinancing = (await import('@/app/(dashboard)/retailer/financing/page')).default;
const RetailerCart = (await import('@/app/(dashboard)/retailer/cart/page')).default;
const RetailerCheckout = (await import('@/app/(dashboard)/retailer/checkout/page')).default;
const DistributorDashboard = (await import('@/app/(dashboard)/distributor/page')).default;
const DistributorOrders = (await import('@/app/(dashboard)/distributor/orders/page')).default;
const Login = (await import('@/app/(auth)/login/page')).default;

const SCREENS: [string, React.ComponentType, 'retailer' | 'distributor'][] = [
  ['Login', Login, 'retailer'],
  ['Retailer / Dashboard', RetailerDashboard, 'retailer'],
  ['Retailer / Orders', RetailerOrders, 'retailer'],
  ['Retailer / Marketplace', RetailerMarketplace, 'retailer'],
  ['Retailer / Developer pack', RetailerDeveloperPack, 'retailer'],
  ['Retailer / Financing', RetailerFinancing, 'retailer'],
  ['Retailer / Cart', RetailerCart, 'retailer'],
  ['Retailer / Checkout', RetailerCheckout, 'retailer'],
  ['Distributor / Dashboard', DistributorDashboard, 'distributor'],
  ['Distributor / Orders', DistributorOrders, 'distributor'],
];

/** React reports these to the console rather than throwing. */
const REACT_FAULTS = new RegExp([
  'validateDOMNesting',
  'cannot be a descendant',
  'cannot appear as a descendant',
  'unique "key"',
  'Each child',
  'Failed prop',
].join('|'));

let errSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

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
  const problems: string[] = [];
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
  for (const [name, Screen, screenRole] of SCREENS) {
    it(`renders ${name} on real data`, async () => {
      role = screenRole;
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <Screen />
        </QueryClientProvider>,
      );

      // Wait for the data, not merely for something on screen: a heading
      // renders before its query resolves, so asserting on the first paint
      // checks the skeleton and passes whatever the loaded screen does.
      await act(async () => {
        await new Promise((resolve) => { setTimeout(resolve, 60); });
      });
      await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(0));

      const faults = [...errSpy.mock.calls, ...warnSpy.mock.calls]
        .map((call) => String(call[0]))
        .filter((message) => REACT_FAULTS.test(message));

      expect([...new Set(faults)]).toEqual([]);
      expect(unnamedControls()).toEqual([]);
    });
  }
});
