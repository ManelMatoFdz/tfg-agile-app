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

export type ScrumRole = 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPER';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  scrumRole?: ScrumRole | null;
  joinedAt: string;
}

// ── Task-service types ────────────────────────────────────────────────────────

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';

export interface Task {
  id: string;
  projectId: string;
  sprintId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  reporterId: string;
  assigneeId?: string | null;
  storyPoints?: number | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  status: SprintStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
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
