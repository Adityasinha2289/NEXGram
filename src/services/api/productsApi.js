import { fetchApi, buildQueryString } from './client';

export const productsApi = {
  getProducts: (params) => fetchApi(`/products${buildQueryString(params)}`),
  getProduct: (id) => fetchApi(`/products/${id}`),
};
