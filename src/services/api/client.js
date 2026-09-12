import { markFresh } from '../../utils/serviceWorker';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const token = localStorage.getItem('nexgram_access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Reaching the network means anything previously flagged as stale is current
  // again.
  markFresh();
  window.dispatchEvent(new CustomEvent('api:stale', { detail: { stale: false } }));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('nexgram_access_token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.detail || 'API request failed');
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export function buildQueryString(params) {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
