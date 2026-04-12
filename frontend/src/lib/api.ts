// src/lib/api.ts
import axios from 'axios';

const FASTIFY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Helper function to get token from cookies
const getToken = () => {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
  return match ? match[2] : null;
};

// Helper function to set token in cookies
const setToken = (token: string) => {
  if (typeof window === 'undefined') return;
  document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=lax`;
};

// Helper function to delete token from cookies
const deleteToken = () => {
  if (typeof window === 'undefined') return;
  document.cookie = 'token=; path=/; max-age=0';
};

export const api = axios.create({
  baseURL: FASTIFY_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to headers
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401 and 404 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const requestUrl = error.config?.url || '';
      const errorData = error.response.data;
      const status = error.response.status;

      // Don't redirect on login or signup endpoints - let the form handle the error
      const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/signup');

      if (status === 401 && !isAuthRequest) {
        const hadToken = !!getToken();

        // Log for debugging - helps identify if token was expired or invalid
        if (process.env.NODE_ENV === 'development') {
          console.warn('[API] 401 Unauthorized:', {
            url: requestUrl,
            hadToken,
            error: errorData?.errors?.token || errorData?.message,
          });
        }

        // Clear the invalid/expired token
        deleteToken();

        // Redirect to login only in browser environment
        if (typeof window !== 'undefined') {
          // Optional: store current path to redirect back after login
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          window.location.href = '/login';
        }
      }

      // Handle 404 for profile endpoint - user not found
      if (status === 404 && requestUrl.includes('/auth/profile')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[API] 404 Profile not found:', {
            url: requestUrl,
            error: errorData?.message,
          });
        }

        // Clear token and session
        deleteToken();

        // Redirect to login only in browser environment
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export { setToken, deleteToken, getToken };