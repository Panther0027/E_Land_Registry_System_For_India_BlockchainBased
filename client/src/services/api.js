import axios from 'axios';
import { useAuthStore } from '../store';

const normalizeApiUrl = (url) => {
  if (!url) return '/api';
  let trimmed = url.trim();
  if (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1);
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
};

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthRoute = /\/auth\/(login|verify-registration|register)/.test(url);

    if (error.response?.status === 401 && !isAuthRoute) {
      useAuthStore.getState().logout();
      window.location.hash = '#/login';
    }

    if (error.response?.status === 503) {
      console.warn('API unavailable:', error.response?.data?.message);
    }
    return Promise.reject(error);
  }
);

export default api;
