import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const USER_API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

let refreshPromise: Promise<string> | null = null;

export const refreshSession = () => {
  if (refreshPromise) return refreshPromise;

  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    useAuthStore.getState().logout();
    return Promise.reject(new Error('No refresh token available'));
  }

  refreshPromise = axios
    .post(`${USER_API_BASE}/auth/refresh`, { refreshToken })
    .then((res) => {
      const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
      useAuthStore.getState().setTokens(newAccess, newRefresh);
      return newAccess;
    })
    .catch((error) => {
      useAuthStore.getState().logout();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};
