import axios from 'axios';
import { refreshSession } from './authRefresh';
import { useAuthStore } from '../store/authStore';

const TASK_API_BASE = import.meta.env.VITE_TASK_API_BASE_URL ?? '/task-api';

const taskClient = axios.create({
  baseURL: TASK_API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

taskClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

taskClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccess = await refreshSession();
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return taskClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default taskClient;
