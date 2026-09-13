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
    // FastAPI returns 422 validation errors as a list of objects; rendering
    // that list directly puts "[object Object]" in front of the user.
    const error = new Error(describeDetail(errorData.detail) || 'API request failed');
    error.status = response.status;
    throw error;
  }

  // 204 No Content has an empty body, and response.json() on an empty body
  // rejects with a SyntaxError. Deleting a catalogue listing answers 204, so
  // without this every successful delete surfaced as a failure.
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }
  return response.json().catch(() => null);
}

/** Turns whatever the server put in `detail` into one readable sentence. */
function describeDetail(detail) {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((entry) => entry?.msg || entry?.detail || String(entry)).join('. ');
  }
  return detail.msg || '';
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
