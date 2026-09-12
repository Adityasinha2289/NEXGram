import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads one thing from the API.
 *
 * The same twenty lines of isLoading / error / setData were repeated across
 * more than a dozen screens, each with its own small differences in how a
 * failure was surfaced and whether a late response from an abandoned request
 * could overwrite a newer one. Concentrating it here makes that behaviour one
 * decision instead of a dozen.
 *
 * @param fetcher  async () => data. Must be stable (useCallback) or declared
 *                 outside the component, otherwise this refetches every render.
 * @param options  { enabled, initialData, onSuccess }
 */
export function useApiResource(fetcher, { enabled = true, initialData = null, onSuccess } = {}) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);

  // Guards against a slow first response landing after a newer one, which would
  // show stale data with no indication anything was wrong.
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!enabled) return;
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (!mounted.current || id !== requestId.current) return;
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      if (!mounted.current || id !== requestId.current) return;
      setError(err?.message || 'Kuch load nahi ho paya.');
    } finally {
      if (mounted.current && id === requestId.current) setIsLoading(false);
    }
    // onSuccess is intentionally not a dependency: callers routinely pass an
    // inline function, which would make this reload on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, enabled]);

  useEffect(() => { load(); }, [load]);

  return { data, isLoading, error, reload: load, setData };
}
