/**
 * The one-tap demo logins.
 *
 * These must track backend/seed/demo_seed.py. They are declared once because
 * they had already drifted: the landing page was still calling an account pair
 * that no longer existed after a reseed, so both of its demo buttons failed and
 * silently dropped the visitor on the login form.
 */
export const DEMO_ACCOUNTS = {
  retailer: {
    mobile: '9000000001',
    password: 'demo1234',
    label: 'Gupta Kirana Store',
    caption: 'Palampur ki ek kirana dukaan',
  },
  distributor: {
    mobile: '9100000002',
    password: 'demo1234',
    label: 'Himachal Dairy Co',
    caption: 'Palampur ka dairy distributor',
  },
};
