/**
 * What each demo account is, for the button that opens it.
 *
 * Labels only. The mobile number and password used to live here too, and the
 * demo buttons posted them like an ordinary login — which meant the browser
 * shipped a working credential, and the button broke for reasons that had
 * nothing to do with the demo: a reseed changing the password, someone else's
 * failed attempts using up a shared rate limit, or a deployed database never
 * having been seeded at all. That last one reported "Mobile number ya password
 * galat hai", which is the worst possible sentence for the truth "this database
 * is empty".
 *
 * The server now resolves a role to its own seeded account, so nothing here
 * has to stay in step with backend/seed/demo_seed.py except the names a person
 * reads.
 */
export const DEMO_ACCOUNTS = {
  retailer: {
    label: 'Gupta Kirana Store',
    caption: 'Palampur ki ek kirana dukaan',
  },
  distributor: {
    label: 'Himachal Dairy Co',
    caption: 'Palampur ka dairy distributor',
  },
  customer: {
    label: 'Sunita Devi',
    caption: 'Gupta Kirana se 400m door',
  },
};
