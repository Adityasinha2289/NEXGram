import { fetchApi, buildQueryString } from './client';

export const distributorsApi = {
  getDistributors: (params) => fetchApi(`/distributors${buildQueryString(params)}`),
  getDistributor: (id) => fetchApi(`/distributors/${id}`),
  getDistributorCatalogue: (id, params) => fetchApi(`/distributors/${id}/catalogue${buildQueryString(params)}`),

  // Own-catalogue writes. The distributor is resolved from the token server-side,
  // so there is no id to pass and no way to write into someone else's catalogue.
  addCatalogueItem: (data) => fetchApi('/distributors/me/catalogue', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCatalogueItem: (itemId, data) => fetchApi(`/distributors/me/catalogue/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  removeCatalogueItem: (itemId) => fetchApi(`/distributors/me/catalogue/${itemId}`, {
    method: 'DELETE',
  }),
};
