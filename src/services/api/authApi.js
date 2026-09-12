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
};
