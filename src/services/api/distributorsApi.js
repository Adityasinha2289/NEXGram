import { fetchApi, buildQueryString } from './client';

export const distributorsApi = {
  getDistributors: (params) => fetchApi(`/distributors${buildQueryString(params)}`),
  getDistributor: (id) => fetchApi(`/distributors/${id}`),
  getDistributorCatalogue: (id, params) => fetchApi(`/distributors/${id}/catalogue${buildQueryString(params)}`),
};
