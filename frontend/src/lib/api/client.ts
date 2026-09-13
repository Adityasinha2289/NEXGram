import axios, { AxiosError } from 'axios';

// Create a configured Axios instance pointing to the FastAPI backend
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
});

/**
 * Turns whatever the server put in `detail` into one readable sentence.
 *
 * FastAPI answers a validation failure with a list of objects and a refusal
 * with a plain string. Screens were showing their own "Failed to load" instead
 * of either, so a retailer who ordered below a supplier's MOQ was told nothing
 * about MOQ.
 */
function describeDetail(detail: unknown): string {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((entry) => (entry && typeof entry === 'object' && 'msg' in entry
        ? String((entry as { msg: unknown }).msg)
        : String(entry)))
      .join('. ');
  }
  if (typeof detail === 'object' && 'msg' in (detail as object)) {
    return String((detail as { msg: unknown }).msg);
  }
  return '';
}

// Response interceptor to handle token expiry / unauth
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: unknown }>) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    // Carry the server's own reason on `message`, so a caller that renders
    // err.message shows "MOQ 5 hai" rather than "Request failed with status
    // code 400".
    const detail = describeDetail(error.response?.data?.detail);
    if (detail) {
      error.message = detail;
    } else if (!error.response) {
      error.message = 'Could not reach the server. Check your connection.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
