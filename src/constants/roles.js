import { Bike, Store, Truck } from 'lucide-react';
import { DEMO_ACCOUNTS } from './demoAccounts';

/**
 * The three sides of the market, described once.
 *
 * Where each one lands after signing in, what to call it, and which demo
 * account opens it. Routing, the landing page, the login screens and the role
 * switcher all read from here — they had started to disagree about where a
 * customer goes, which is the kind of drift that sends someone to a dashboard
 * they have no profile for.
 */
export const ROLES = {
  retailer: {
    key: 'retailer',
    label: 'Retailer',
    noun: 'Dukaandaar',
    tagline: 'Apni dukaan chalayein — stock, sale aur supply ek jagah.',
    home: '/retailer/dashboard',
    loginPath: '/login/retailer',
    icon: Store,
    demo: DEMO_ACCOUNTS.retailer,
  },
  distributor: {
    key: 'distributor',
    label: 'Distributor',
    noun: 'Supplier',
    tagline: 'Apna maal wahan bechein jahan demand hai.',
    home: '/distributor/dashboard',
    loginPath: '/login/distributor',
    icon: Truck,
    demo: DEMO_ACCOUNTS.distributor,
  },
  customer: {
    key: 'customer',
    label: 'Customer',
    noun: 'Ghar ke liye',
    tagline: 'Paas ki dukaan se ghar par mangwayein.',
    home: '/shop',
    loginPath: '/login/customer',
    icon: Bike,
    demo: DEMO_ACCOUNTS.customer,
  },
};

export const ROLE_LIST = [ROLES.retailer, ROLES.distributor, ROLES.customer];

/** Where a signed-in user belongs. */
export const homeFor = (role) => ROLES[role]?.home || ROLES.retailer.home;
