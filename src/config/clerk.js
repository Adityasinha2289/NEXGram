/**
 * Clerk, when it is switched on.
 *
 * The key is absent in most checkouts and in every test run, and the app has to
 * be complete without it: mobile+password is still the way most shopkeepers
 * sign in, and the demo logins on the landing page do not touch Clerk at all.
 * So this is a flag, read once, and everything Clerk-shaped hides behind it.
 *
 * The publishable key is not a secret — it identifies the Clerk instance to the
 * browser and is meant to ship. The secret key stays on the server, where it
 * signs the Backend API call that resolves who someone is.
 */
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

export const isClerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY);
