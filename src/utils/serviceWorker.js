/**
 * Service worker registration and the stale-data signal.
 *
 * The worker reports when it had to answer a request from cache. That message
 * can arrive before React has mounted anything, so it is captured here at
 * module load and held in a flag the UI reads on mount - otherwise the first
 * (and most important) notice of stale data would be missed.
 */
let servedFromCache = false;

export function isServingStaleData() {
  return servedFromCache;
}

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'nexgram:stale') return;
    servedFromCache = true;
    window.dispatchEvent(new CustomEvent('api:stale', { detail: { stale: true } }));
  });
}

export function markFresh() {
  servedFromCache = false;
}

export function registerServiceWorker() {
  // Production only. In dev the worker would serve cached modules over Vite's
  // HMR and make every change look like it did nothing.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // A failed registration costs offline support, not the app.
      console.warn('Service worker registration failed:', err);
    });
  });
}
