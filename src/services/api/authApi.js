import { fetchApi } from './client';

export const authApi = {
  login: async (mobile, password) => {
    // OAuth2PasswordRequestForm expects form-urlencoded
    const params = new URLSearchParams();
    params.append('username', mobile);
    params.append('password', password);

    const response = await fetchApi('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    return response;
  },

  register: async (userData) => {
    return fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  getMe: async () => {
    return fetchApi('/auth/me');
  },

  // Always resolves the same way whether or not the number is registered;
  // the server deliberately does not reveal which.
  requestPasswordReset: (mobile) => fetchApi('/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ mobile }),
  }),

  confirmPasswordReset: (payload) => fetchApi('/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  changePassword: (payload) => fetchApi('/auth/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  /** Whether the server has a Clerk instance configured to sign in against. */
  clerkStatus: () => fetchApi('/auth/clerk/status'),

  /**
   * Trades a Clerk session token for a NEXGram one.
   *
   * Called once, at sign-in. What comes back is the same bearer token /login
   * issues and lasts a week — Clerk's own token expires in sixty seconds and
   * its web SDK cannot refresh one offline, which would sign a shopkeeper out
   * every time the signal dropped behind the counter.
   *
   * `role` is only consulted if this Clerk identity has never been seen here.
   * An existing account keeps the role the server already has for it.
   */
  exchangeClerkToken: (token, role) => fetchApi('/auth/clerk', {
    method: 'POST',
    body: JSON.stringify(role ? { token, role } : { token }),
  }),
};
