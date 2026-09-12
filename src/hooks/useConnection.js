import { useEffect, useState } from 'react';
import { isServingStaleData } from '../utils/serviceWorker';

/**
 * Whether the browser currently believes it has a network.
 *
 * `navigator.onLine` only reports whether an interface is up, not whether the
 * API is reachable, so the app also listens for the stale-response signal the
 * service worker sets when it had to serve from cache.
 */
export function useConnection() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  // Seeded from the flag captured before React mounted, so a message that
  // arrived during startup is not lost.
  const [isStale, setIsStale] = useState(isServingStaleData);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    const stale = (event) => setIsStale(Boolean(event.detail?.stale));

    // The service worker reports when it had to answer from cache. That is a
    // more reliable signal than navigator.onLine, which only says an interface
    // is up - not that the API is reachable.
    const fromWorker = (event) => {
      if (event.data?.type === 'nexgram:stale') setIsStale(true);
    };

    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('api:stale', stale);
    navigator.serviceWorker?.addEventListener('message', fromWorker);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      window.removeEventListener('api:stale', stale);
      navigator.serviceWorker?.removeEventListener('message', fromWorker);
    };
  }, []);

  return { isOnline, isStale };
}
