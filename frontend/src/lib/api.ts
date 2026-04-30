// src/lib/api.ts
import axios, { type AxiosRequestConfig } from 'axios';

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
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

const api = axios.create({
  baseURL: FASTIFY_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add token to headers
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // originalRequest._retry = true;
      // You could implement refresh token logic here
      // For now, let's just clear token and redirect if not on login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        deleteToken();
        window.location.href = '/login';
      }
    }

    // Handle 403 errors (Forbidden)
    if (error.response?.status === 403) {
      console.error('Permission denied:', error.response.data);
    }

    // Standardized error object
    const apiError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      status: error.response?.status,
      data: error.response?.data,
    };

    return Promise.reject(apiError);
  }
);

export default api;

// Generic methods for a more professional API client
export const apiRequest = {
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    api.get<T>(url, config).then(res => res.data),
  
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    api.post<T>(url, data, config).then(res => res.data),
  
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    api.put<T>(url, data, config).then(res => res.data),
  
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    api.patch<T>(url, data, config).then(res => res.data),
  
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    api.delete<T>(url, config).then(res => res.data),
};

export { setToken, deleteToken, getToken };
