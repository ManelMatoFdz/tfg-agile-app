import client from './client';
import type { User, UserSummary } from '../types';

type AvatarUploadResponse = {
  avatarUrl: string;
};

export const usersApi = {
  getMe: () => client.get<User>('/users/me'),

  updateMe: (data: { fullName?: string; bio?: string }) =>
    client.patch<User>('/users/me', data),

  changePassword: (newPassword: string, currentPassword?: string) =>
    client.patch('/users/me/password', { currentPassword, newPassword }),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.post<AvatarUploadResponse>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  batch: (ids: string[]) =>
    client.post<UserSummary[]>('/users/batch', ids),
};
