import client from './client';
import type { NotificationPage, NotificationSettings } from '../types';

export const notificationsApi = {
  list: (params: { unreadOnly?: boolean; page?: number; size?: number }) =>
    client.get<NotificationPage>('/users/me/notifications', { params }),

  markRead: (notificationId: string) =>
    client.patch(`/users/me/notifications/${notificationId}/read`),

  markAllRead: () =>
    client.post('/users/me/notifications/read-all'),

  getSettings: () =>
    client.get<NotificationSettings>('/users/me/notifications/settings'),

  updateSettings: (data: Partial<NotificationSettings>) =>
    client.patch<NotificationSettings>('/users/me/notifications/settings', data),
};
