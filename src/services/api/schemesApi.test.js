import { beforeEach, describe, expect, it, vi } from 'vitest';
import { schemesApi } from './schemesApi';

/**
 * This module used to return a hardcoded two-scheme array, so every shop saw
 * the same "3/4 criteria met" no matter what their profile said — and the
 * backend's own /schemes matcher was never called by anything.
 */
describe('schemesApi', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('asks the API rather than returning a built-in list', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => Promise.resolve({ role: 'retailer', schemes: [], totalCatalogued: 5 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await schemesApi.getSchemes();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/schemes$/);
    expect(result.schemes).toEqual([]);
  });

  it('passes the caller the schemes the server matched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => Promise.resolve({
        role: 'retailer',
        schemes: [{ id: 'udyam', metCount: 2, totalCount: 2 }],
      }),
    }));

    const result = await schemesApi.getSchemes();

    expect(result.schemes[0].id).toBe('udyam');
  });

  it('lets a failure reach the screen instead of resolving with stale data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: () => Promise.resolve({ detail: 'Not authenticated' }),
    }));

    await expect(schemesApi.getSchemes()).rejects.toThrow('Not authenticated');
  });
});
