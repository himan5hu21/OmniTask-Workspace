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

// This shared promise handles concurrent 401s within a single tab
let refreshPromise: Promise<string> | null = null;

// Multi-tab synchronization using BroadcastChannel
const authChannel = typeof window !== 'undefined' ? new BroadcastChannel('auth_sync') : null;

if (authChannel) {
  authChannel.onmessage = (event) => {
    if (event.data.type === 'TOKEN_REFRESHED' && event.data.token) {
      const currentToken = getToken();
      if (currentToken !== event.data.token) {
        console.log('[API] Token sync received from another tab');
        setToken(event.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${event.data.token}`;
        
        // Notify local listeners (like sockets)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('token_refreshed'));
        }
      }
    } else if (event.data.type === 'LOGOUT') {
      console.log('[API] Logout sync received from another tab');
      deleteToken();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  };

  // Cleanup BroadcastChannel on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      authChannel?.close();
    });
  }
}

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
      // 🚨 FIX: Prevent recursive refresh attempts if the refresh call itself fails with 401
      if (originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Multi-tab check: If token changed while this request was flying, another tab refreshed it!
        const currentToken = getToken();
        const requestToken = 
          typeof originalRequest.headers?.Authorization === 'string'
            ? originalRequest.headers.Authorization.replace('Bearer ', '')
            : null;

        if (currentToken && requestToken && currentToken !== requestToken) {
          originalRequest.headers.Authorization = `Bearer ${currentToken}`;
          return api(originalRequest);
        }

        // Shared promise pattern: If a refresh is already running in this tab, wait for it.
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${FASTIFY_API_URL}/auth/refresh`, {}, { withCredentials: true })
            .then((res) => {
              const newToken = res.data.data.accessToken;
              setToken(newToken);
              api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              
              // Notify local listeners (like sockets)
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('token_refreshed'));
              }

              // Broadcast to other tabs
              if (authChannel) {
                authChannel.postMessage({
                  type: 'TOKEN_REFRESHED',
                  token: newToken,
                });
              }
              
              return newToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);

      } catch (refreshError: unknown) {
        // If refresh fails, session is completely dead. Log them out.
        deleteToken();

        // Broadcast logout to other tabs
        if (authChannel) {
          authChannel.postMessage({ type: 'LOGOUT' });
        }

        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
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
