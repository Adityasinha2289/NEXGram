import { fetchApi, buildQueryString } from './client';

/**
 * Government-backed loan schemes, and the application that follows.
 *
 * The platform is not the lender and never says "approved": it reports which
 * stated criteria a profile appears to meet, and what the bank came back with.
 */
export const loansApi = {
  /** An indicative EMI. Explicitly not an offer — the rate is the bank's. */
  getEstimate: (params) => fetchApi(`/loans/estimate${buildQueryString(params)}`),

  apply: (data) => fetchApi('/loans', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getApplications: () => fetchApi('/loans'),
  getApplication: (id) => fetchApi(`/loans/${id}`),

  withdraw: (id) => fetchApi(`/loans/${id}/withdraw`, { method: 'POST' }),
};
