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

export interface UserSummary {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
}

// ── Project-service types ─────────────────────────────────────────────────────

export type WorkspaceRole = 'ADMIN' | 'MEMBER';
export type ProjectRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Category {
  id: string;
  workspaceId: string;
  name: string;
  color?: string;
  position: number;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  categoryId?: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  joinedAt: string;
}
