import axios from 'axios';
import { refreshSession } from './authRefresh';
import { useAuthStore } from '../store/authStore';

const PROJECT_API_BASE = import.meta.env.VITE_PROJECT_API_BASE_URL ?? '/project-api';

const projectClient = axios.create({
  baseURL: PROJECT_API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

projectClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

projectClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    // If the user has been removed from the workspace, redirect to the selector.
    if (
      error.response?.status === 403 &&
      error.response?.data?.errorCode === 'NOT_WORKSPACE_MEMBER' &&
      /\/workspaces\/[^/]+/.test(window.location.pathname)
    ) {
      window.location.replace('/workspaces');
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccess = await refreshSession();
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return projectClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default projectClient;
