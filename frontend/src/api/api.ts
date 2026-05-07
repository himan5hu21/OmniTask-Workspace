// src/lib/api.ts
import axios, { type AxiosRequestConfig } from 'axios';

const FASTIFY_API_URL = '/omni-api';


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
  withCredentials: true, // This is CRITICAL so cookies are sent with requests
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

// Add these variables at the top of your file, outside the interceptor
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: unknown) => void }[] = [];

// NEW: Helper to manage cross-tab locking
const acquireLock = () => {
  if (typeof window === 'undefined') return true;
  if (localStorage.getItem('isRefreshing') === 'true') return false;
  localStorage.setItem('isRefreshing', 'true');
  return true;
};

const releaseLock = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('isRefreshing');
};

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

// Add response interceptor for global error handling and automatic token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 1. Identify if the failing request is a login or register attempt
    const isAuthRoute = 
      originalRequest.url?.includes('/auth/login') || 
      originalRequest.url?.includes('/auth/register');

    // 2. ONLY trigger refresh if it's a 401, hasn't been retried, AND is NOT an auth route
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      
      // 🚨 FIX 1: The Multi-Tab / Fast Concurrency Check
      const currentToken = getToken();
      const requestToken = originalRequest.headers.Authorization?.replace('Bearer ', '');
      
      // If the token in cookies doesn't match the one that failed, another request 
      // or browser tab ALREADY refreshed it! Skip the queue and just retry.
      if (currentToken && requestToken && currentToken !== requestToken) {
        originalRequest.headers.Authorization = `Bearer ${currentToken}`;
        return api(originalRequest);
      }

      // Check BOTH the memory lock and the cross-tab lock
      if (isRefreshing || !acquireLock()) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh API (bypassing interceptor to avoid loops)
        const res = await axios.post(`${FASTIFY_API_URL}/auth/refresh`, {}, {
          withCredentials: true 
        });

        const newToken = res.data.data.accessToken;
        
        // Save the new token
        setToken(newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // IMPORTANT FOR SOCKETS: Dispatch an event telling the socket to reconnect
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('token_refreshed'));
        }

        // Release the queued requests
        processQueue(null, newToken);

        // Retry the original request that triggered the refresh
        return api(originalRequest);

      } catch (refreshError: unknown) {
        // Reject all queued requests
        processQueue(refreshError, null);
        
        // If refresh fails, session is completely dead. Log them out.
        deleteToken();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        releaseLock(); // ALWAYS release the lock so other tabs aren't stuck
      }
    }

    // Handle 403 errors cleanly
    if (error.response?.status === 403) {
      console.error('[API] 403 Forbidden - Session invalid or expired.');
      
      // If we get a 403, the session cannot be saved. Wipe everything and redirect.
      deleteToken();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
         window.location.href = '/login';
      }
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
