import axios from 'axios';
import { refreshSession } from './authRefresh';
import { useAuthStore } from '../store/authStore';

const POKER_API_BASE = import.meta.env.VITE_POKER_API_BASE_URL ?? '/poker-api';

const pokerClient = axios.create({
  baseURL: POKER_API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

pokerClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

pokerClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccess = await refreshSession();
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return pokerClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default pokerClient;
