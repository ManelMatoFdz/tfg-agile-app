import client from './client';
import type { User, UserSummary, UserLookup } from '../types';

type AvatarUploadResponse = {
  avatarUrl: string;
};

type UpdateMeRequest = {
  username?: string;
  email?: string;
  fullName?: string;
  bio?: string;
};

export const usersApi = {
  getMe: () => client.get<User>('/users/me'),

  updateMe: (data: UpdateMeRequest) =>
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

  lookupByEmail: (email: string) =>
    client.get<UserLookup>(`/users/lookup?email=${encodeURIComponent(email)}`),
};
