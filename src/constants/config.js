/**
 * Environment & Runtime Configuration for NEXGram Frontend.
 *
 * Exploration Mode allows immediate access to Retailer and Distributor dashboards
 * without requiring manual login, registration, or onboarding completion.
 *
 * Active by default in local development (Vite dev server) unless explicitly disabled
 * via VITE_EXPLORATION_MODE=false.
 */
export const IS_EXPLORATION_MODE =
  import.meta.env.VITE_EXPLORATION_MODE !== 'false' &&
  (import.meta.env.DEV || import.meta.env.VITE_EXPLORATION_MODE === 'true');
