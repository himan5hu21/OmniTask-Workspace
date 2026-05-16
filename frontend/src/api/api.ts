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
// Track retry attempts using a WeakMap to ensure persistence even if Axios clones the config object
const retryMap = new WeakMap<AxiosRequestConfig, number>();

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // 1. Initialize or increment retry count
    const retryCount = (retryMap.get(originalRequest) || 0) + 1;
    retryMap.set(originalRequest, retryCount);

    const isAuthRoute = 
      originalRequest.url?.includes('/auth/login') || 
      originalRequest.url?.includes('/auth/register');

    // 2. 🛑 CONNECTION ERRORS: No response from server (e.g. backend down)
    if (!error.response) {
      console.error(`[API] Connection Error on ${originalRequest.url}. Backend might be down.`);
      return Promise.reject({
        message: 'Unable to connect to the server. Please check your internet or try again later.',
        status: 0,
        data: null,
      });
    }

    // 3. 🛑 SERVER ERRORS: 5xx errors should never be retried by the interceptor
    if (error.response.status >= 500) {
      console.error(`[API] Server Error (${error.response.status}) on ${originalRequest.url}`);
      return Promise.reject({
        message: error.response.data?.message || 'Server encountered an internal error',
        status: error.response.status,
        data: error.response.data,
      });
    }

    // 4. 🛡️ RETRY LIMIT: Stop if we've tried too many times (Max 2 retries)
    if (retryCount > 2) {
      console.error(`[API] Max retries reached for ${originalRequest.url}. Stopping.`);
      return Promise.reject({
        message: 'Request failed after multiple attempts',
        status: error.response.status,
        data: error.response.data,
      });
    }

    // 5. 🔑 AUTH ERRORS: Only trigger refresh if it's a 401 AND NOT an auth route
    if (error.response.status === 401 && !isAuthRoute) {
      // Prevent recursive refresh attempts if the refresh call itself fails with 401
      if (originalRequest.url?.includes('/auth/refresh')) {
        console.warn('[API] Refresh call failed with 401. Logging out.');
        deleteToken();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        console.log(`[API] Retrying 401 (Attempt ${retryCount}) for ${originalRequest.url}`);

        // Check if token was refreshed while this request was flying
        const currentToken = getToken();
        const requestToken = 
          typeof originalRequest.headers?.Authorization === 'string'
            ? originalRequest.headers.Authorization.replace('Bearer ', '')
            : null;

        if (currentToken && requestToken && currentToken !== requestToken) {
          console.log('[API] Token already updated, retrying with new token.');
          originalRequest.headers.Authorization = `Bearer ${currentToken}`;
          return api(originalRequest);
        }

        // Shared promise pattern for token refresh
        if (!refreshPromise) {
          console.log('[API] Starting token refresh...');
          refreshPromise = axios
            .post(`${FASTIFY_API_URL}/auth/refresh`, {}, { withCredentials: true })
            .then((res) => {
              const newToken = res.data.data.accessToken;
              setToken(newToken);
              api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('token_refreshed'));
              }

              if (authChannel) {
                authChannel.postMessage({ type: 'TOKEN_REFRESHED', token: newToken });
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
        console.error('[API] Token refresh failed:', refreshError);
        deleteToken();

        if (authChannel) {
          authChannel.postMessage({ type: 'LOGOUT' });
        }

        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Standardized error object for all other errors (400, 403, 404, etc.)
    return Promise.reject({
      message: error.response.data?.message || error.message || 'An unexpected error occurred',
      status: error.response.status,
      data: error.response.data,
    });
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
