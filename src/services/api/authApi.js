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
  }
};
