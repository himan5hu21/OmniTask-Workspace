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

    // Handle 401 errors (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Immediately lock this request from ever triggering the 401 logic again
      originalRequest._retry = true;

      // If the refresh token call itself fails with 401, it means the session is completely dead.
      // Force logout to prevent an infinite loop.
      if (originalRequest.url?.includes('/auth/refresh')) {
        deleteToken();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      }

      // If another request is already refreshing the token, put this request in a queue
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        // We use a clean axios instance (or base axios) here to avoid interceptor loops
        const res = await axios.post(
          `${FASTIFY_API_URL}/auth/refresh`,
          {},
          { withCredentials: true } // Crucial: sends the HttpOnly refresh cookie!
        );

        const newToken = res.data.data.accessToken;
        
        // Save the new token
        setToken(newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Release the queued requests
        processQueue(null, newToken);

        // Retry the original failed request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear everything and kick user to login
        processQueue(refreshError, null);
        deleteToken();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
