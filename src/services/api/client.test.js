import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildQueryString, fetchApi } from './client';

/**
 * The API client is where auth, error shape and session expiry all meet, so a
 * mistake here is invisible until a user is silently signed out or an error
 * loses the reason it failed.
 */

function respondWith({ ok = true, status = 200, body = {} } = {}) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(body),
  });
}

describe('buildQueryString', () => {
  it('returns nothing for no params', () => {
    expect(buildQueryString()).toBe('');
    expect(buildQueryString({})).toBe('');
  });

  it('omits empty values rather than sending blanks', () => {
    // `?search=` would be read by the API as "match the empty string".
    expect(buildQueryString({ a: 1, b: undefined, c: null, d: '' })).toBe('?a=1');
  });

  it('encodes values', () => {
    expect(buildQueryString({ q: 'tea & coffee' })).toBe('?q=tea+%26+coffee');
  });
});

describe('fetchApi', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('attaches the bearer token when one is stored', async () => {
    const fetchMock = respondWith({ body: { ok: true } });
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('nexgram_access_token', 'tok-123');

    await fetchApi('/thing');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer tok-123');
  });

  it('sends no Authorization header when signed out', async () => {
    const fetchMock = respondWith();
    vi.stubGlobal('fetch', fetchMock);

    await fetchApi('/thing');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('carries the status code on the thrown error', async () => {
    // AuthContext branches on this to tell a rejected token from a dead network.
    vi.stubGlobal('fetch', respondWith({ ok: false, status: 400, body: { detail: 'Bad input' } }));

    await expect(fetchApi('/thing')).rejects.toMatchObject({
      message: 'Bad input',
      status: 400,
    });
  });

  it('surfaces the server detail rather than a generic message', async () => {
    vi.stubGlobal('fetch', respondWith({ ok: false, status: 400, body: { detail: 'MOQ 5 hai' } }));

    await expect(fetchApi('/thing')).rejects.toThrow('MOQ 5 hai');
  });

  it('falls back to a generic message when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: () => Promise.reject(new Error('not json')),
    }));

    await expect(fetchApi('/thing')).rejects.toThrow('API request failed');
  });

  it('clears the token and announces expiry on a 401', async () => {
    localStorage.setItem('nexgram_access_token', 'stale');
    vi.stubGlobal('fetch', respondWith({ ok: false, status: 401, body: {} }));
    const listener = vi.fn();
    window.addEventListener('auth:unauthorized', listener);

    await expect(fetchApi('/thing')).rejects.toThrow();

    expect(localStorage.getItem('nexgram_access_token')).toBeNull();
    expect(listener).toHaveBeenCalled();
    window.removeEventListener('auth:unauthorized', listener);
  });

  it('keeps the token on a 500 - a server fault is not a signed-out user', async () => {
    localStorage.setItem('nexgram_access_token', 'still-good');
    vi.stubGlobal('fetch', respondWith({ ok: false, status: 500, body: {} }));

    await expect(fetchApi('/thing')).rejects.toThrow();

    expect(localStorage.getItem('nexgram_access_token')).toBe('still-good');
  });
});

describe('responses with no body', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null on a 204 instead of failing to parse an empty body', async () => {
    // DELETE /distributors/me/catalogue/{id} answers 204. response.json() on an
    // empty body rejects with a SyntaxError, so every successful delete used to
    // surface to the user as a failure while the row vanished server-side.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    }));

    await expect(fetchApi('/thing', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('returns null when the server declares a zero-length body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '0' }),
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    }));

    await expect(fetchApi('/thing')).resolves.toBeNull();
  });
});

describe('error messages', () => {
  it('flattens a FastAPI validation error into a sentence', async () => {
    // A 422 detail is a list of objects; rendering it raw showed the user
    // "[object Object]".
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers(),
      json: () => Promise.resolve({
        detail: [
          { loc: ['body', 'quantity'], msg: 'Input should be greater than 0' },
          { loc: ['body', 'items'], msg: 'List should have at least 1 item' },
        ],
      }),
    }));

    await expect(fetchApi('/orders', { method: 'POST' })).rejects.toThrow(
      'Input should be greater than 0. List should have at least 1 item',
    );
  });
});
