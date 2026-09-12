import { fetchApi } from './client';

export const schemesApi = {
  getSchemes: () => fetchApi('/schemes'),
};
