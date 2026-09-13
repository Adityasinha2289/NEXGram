import { fetchApi, buildQueryString } from './client';

export const schemesApi = {
  /**
   * Schemes matched against the signed-in user's own profile.
   *
   * This used to return a hardcoded two-scheme list, so every shop saw the same
   * "3/4 criteria met" regardless of what they had actually filled in. The
   * matching is rule-based and lives on the server, next to the profile data it
   * reads; the response shape is the same one this screen already rendered.
   */
  getSchemes: (params) => fetchApi(`/schemes${buildQueryString(params)}`),
};
