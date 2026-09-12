import { useCallback, useEffect, useState } from 'react';
import { intelligenceApi } from '../services/api/intelligenceApi';

/**
 * Loads a role's home screen from the backend.
 *
 * The dashboards used to render fixtures while the rest of the app read live
 * data, which let the home screen contradict the detail page one tap away.
 * Both now come from one server-computed payload.
 */
export function useDashboard(role) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetcher = role === 'retailer'
        ? intelligenceApi.getRetailerDashboard
        : intelligenceApi.getDistributorDashboard;
      setData(await fetcher());
    } catch (err) {
      setError(err.message || 'Dashboard load nahi hua');
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  return { data, isLoading, error, reload: load };
}
