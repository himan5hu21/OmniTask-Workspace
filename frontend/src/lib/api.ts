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

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      deleteToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { setToken, deleteToken, getToken };