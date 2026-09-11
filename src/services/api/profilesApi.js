import { fetchApi } from './client';

export const profilesApi = {
  getRetailerProfile: () => fetchApi('/profiles/retailer/me'),
  updateRetailerProfile: (data) => fetchApi('/profiles/retailer/me', {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  
  getDistributorProfile: () => fetchApi('/profiles/distributor/me'),
  updateDistributorProfile: (data) => fetchApi('/profiles/distributor/me', {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
};
