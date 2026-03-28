import client from './client';
import type { AuthResponse, User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    client.post<AuthResponse>('/auth/login', { email, password }),

  register: (username: string, email: string, password: string) =>
    client.post<AuthResponse>('/auth/register', { username, email, password }),

  googleLogin: (idToken: string) =>
    client.post<AuthResponse>('/auth/google/login', { idToken }),

  logout: (refreshToken: string) =>
    client.post('/auth/logout', { refreshToken }),

  forgotPassword: (email: string) =>
    client.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    client.post('/auth/reset-password', { token, newPassword }),

  me: () => client.get<User>('/auth/me'),
};
