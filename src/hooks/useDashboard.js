import { useCallback } from 'react';
import { intelligenceApi } from '../services/api/intelligenceApi';
import { useApiResource } from './useApiResource';

/**
 * Loads a role's home screen.
 *
 * The dashboards used to render fixtures while the rest of the app read live
 * data, which let the home screen contradict the detail page one tap away.
 * Both now come from one server-computed payload.
 */
export function useDashboard(role) {
  const fetcher = useCallback(
    () => (role === 'retailer'
      ? intelligenceApi.getRetailerDashboard()
      : intelligenceApi.getDistributorDashboard()),
    [role],
  );

  return useApiResource(fetcher);
}
