export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  hasLocalPassword?: boolean;
  roles?: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  isRead?: boolean;
  createdAt: string;
}

export interface NotificationPage {
  content?: Notification[];
  items?: Notification[];
  totalElements: number;
  totalPages: number;
  number?: number;
  page?: number;
  size: number;
  hasNext?: boolean;
}

export interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  projectUpdatesEnabled: boolean;
  taskRemindersEnabled: boolean;
}
