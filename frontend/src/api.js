import axios from 'axios';

// Use VITE_API_URL if defined, otherwise default to '/api' which works with proxy or Nginx
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
});

// Global response interceptor for handling auth errors
// flask-jwt-extended returns 401 for missing tokens and 422 for invalid/stale tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 422)) {
      // Only fire if this isn't a login/register request itself (avoid infinite loops)
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
