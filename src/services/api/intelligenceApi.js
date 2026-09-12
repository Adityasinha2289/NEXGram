import { fetchApi, buildQueryString } from './client';

export const intelligenceApi = {
  getDistributorDashboard: () => fetchApi('/intelligence/dashboard/distributor'),
  getRetailerDashboard: () => fetchApi('/intelligence/dashboard/retailer'),

  getDeveloperPack: () => fetchApi('/intelligence/developer-pack'),
  getDeveloperPackOptions: () => fetchApi('/intelligence/developer-pack/options'),
  getReorderSuggestions: () => fetchApi('/intelligence/reorder'),

  getAlerts: (params) => fetchApi(`/intelligence/alerts${buildQueryString(params)}`),

  searchMarket: (params) => fetchApi(`/intelligence/market${buildQueryString(params)}`),

  getDemandReports: () => fetchApi('/intelligence/demand-reports'),
  reportDemand: (data) => fetchApi('/intelligence/demand-reports', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Returns a paginated envelope; callers that only render a feed take .items.
  getOpportunities: (params) => fetchApi(`/intelligence/opportunities${buildQueryString(params)}`),
  getOpportunity: (id) => fetchApi(`/intelligence/opportunities/${id}`),
  getDemand: (params) => fetchApi(`/intelligence/demand${buildQueryString(params)}`),
  getSupplyGaps: (params) => fetchApi(`/intelligence/supply-gaps${buildQueryString(params)}`),

  /**
   * Recomputes demand -> supply gaps -> opportunities.
   *
   * This is what makes the loop a loop: finishing onboarding or adding stock
   * changes the signals every other user is scored against. The engines upsert
   * on deterministic IDs, so calling this more than once is harmless.
   */
  refresh: () => fetchApi('/intelligence/refresh', { method: 'POST' }),
};
