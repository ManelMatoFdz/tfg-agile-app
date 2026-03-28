import client from './client';
import type { User } from '../types';

export const usersApi = {
  getMe: () => client.get<User>('/users/me'),

  updateMe: (data: { fullName?: string; bio?: string }) =>
    client.patch<User>('/users/me', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    client.patch('/users/me/password', { currentPassword, newPassword }),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.post<User>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
