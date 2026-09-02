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
  link?: string;
  data?: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  invitedEmail: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface UserLookup {
  id: string;
  username: string;
  fullName?: string;
  email: string;
  avatarUrl?: string;
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
  inAppNotificationsEnabled: boolean;
  projectUpdatesEnabled: boolean;
  taskRemindersEnabled: boolean;
}

export interface UserSummary {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
}

// ── Project-service types ─────────────────────────────────────────────────────

export type WorkspaceRole = 'ADMIN' | 'MEMBER';
export type ProjectVisibility = 'PRIVATE' | 'WORKSPACE';

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
  teamId?: string;
  name: string;
  description?: string;
  color?: string;
  visibility: ProjectVisibility;
  createdAt: string;
  updatedAt: string;
}

export type ScrumRole = 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPER';

// ── Task-service types ────────────────────────────────────────────────────────

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskType = 'STORY' | 'TASK' | 'BUG';
export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';
export type EpicStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';
export type RetrospectiveTechnique = 'START_STOP_CONTINUE' | 'FOUR_LS' | 'MAD_SAD_GLAD';

export interface RetrospectiveData {
  technique: RetrospectiveTechnique;
  answers: Record<string, string>;
}

export interface BoardColumn {
  id: string;
  name: string;
  position: number;
  color: string;
  wipLimit: number | null;
  doneEquivalent: boolean;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Epic {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  color: string;
  status: EpicStatus;
  startDate?: string | null;
  targetDate?: string | null;
  createdBy: string;
  totalTasks: number;
  doneTasks: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  sprintId?: string | null;
  epicId?: string | null;
  epicName?: string | null;
  epicColor?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: TaskPriority;
  type: TaskType;
  parentId?: string | null;
  reporterId: string;
  assigneeId?: string | null;
  completedAt?: string | null;
  storyPoints?: number | null;
  ready: boolean;
  position: number;
  labels?: Label[];
  subtaskCount: number;
  completedSubtaskCount: number;
  parentTitle?: string | null;
  definitionOfDone?: string | null;
  blockedByCount: number;
  blocksCount: number;
  gitEventCount: number;
  createdAt: string;
  updatedAt: string;
}

export type GitEventType = 'COMMIT' | 'BRANCH' | 'PULL_REQUEST';

export interface GitEvent {
  id: string;
  taskId?: string | null;
  taskTitle?: string | null;
  projectId: string;
  type: GitEventType;
  externalId: string;
  externalUrl: string;
  title: string;
  author: string;
  status?: string | null;
  receivedAt: string;
}

/** Respuesta paginada del backend (`PagedResponseDto`). */
export interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface GitIntegration {
  id: string;
  projectId: string;
  provider: 'GITHUB' | 'GITLAB';
  repositoryUrl: string;
  webhookUrl: string;
  /** Solo llega en la respuesta del setup; despues siempre null. */
  webhookSecret?: string | null;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  blockingTaskId: string;
  blockingTaskTitle?: string | null;
  blockingTaskStatus?: string | null;
  blockedTaskId: string;
  blockedTaskTitle?: string | null;
  blockedTaskStatus?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  status: SprintStatus;
  startDate?: string | null;
  endDate?: string | null;
  reviewNotes?: string | null;
  // Snapshot captured at completion — only present when status === 'COMPLETED'
  closedTotalTasks?: number | null;
  closedDoneTasks?: number | null;
  closedIncompleteTasks?: number | null;
  closedTotalStoryPoints?: number | null;
  closedDoneStoryPoints?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SprintTaskSnapshot {
  id: string;
  sprintId: string;
  taskId: string | null;
  title: string;
  description?: string | null;
  statusAtEnd: string;
  priority: TaskPriority;
  type?: TaskType;
  parentTaskId?: string | null;
  completedAt?: string | null;
  storyPoints?: number | null;
  completed: boolean;
  returnedToBacklog: boolean;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
}

export type TaskActivityType =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'SPRINT_ADDED'
  | 'RETURNED_TO_BACKLOG'
  | 'LABEL_ADDED'
  | 'LABEL_REMOVED'
  | 'SUBTASK_ADDED'
  | 'SUBTASK_REMOVED'
  | 'TITLE_CHANGED'
  | 'DESCRIPTION_CHANGED'
  | 'STORY_POINTS_CHANGED'
  | 'READY_CHANGED'
  | 'EPIC_CHANGED'
  | 'DEPENDENCY_ADDED'
  | 'DEPENDENCY_REMOVED';

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId?: string | null;
  type: TaskActivityType;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export type TeamRole = 'ADMIN' | 'MEMBER';

export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  role: TeamRole;
  scrumRole?: ScrumRole | null;
  joinedAt: string;
  lastActiveAt?: string | null;
}

// ── Poker-service types ─────────────────────────────────────────────────────

export type SessionStatus = 'LOBBY' | 'VOTING' | 'REVEALED' | 'CLOSED';
export type RoundStatus = 'VOTING' | 'REVEALED' | 'CONSENSUS';
export type DeckType = 'FIBONACCI' | 'T_SHIRT' | 'POWERS_OF_2';
export type ParticipantRole = 'VOTER' | 'OBSERVER' | 'MODERATOR';

export interface PokerSession {
  id: string;
  projectId: string;
  name: string;
  status: SessionStatus;
  deck: DeckType;
  createdBy: string;
  currentTaskId?: string | null;
  timerSeconds?: number | null;
  participants: PokerParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface PokerParticipant {
  id: string;
  userId: string;
  displayName: string;
  role: ParticipantRole;
  connected: boolean;
  joinedAt: string;
}

export interface PokerRound {
  id: string;
  taskId: string;
  taskTitle: string;
  status: RoundStatus;
  finalEstimate?: number | null;
  votes: PokerVote[];
  startedAt: string;
  revealedAt?: string | null;
  timerEndsAt?: string | null;
}

export interface PokerVote {
  userId: string;
  value: string;
  votedAt: string;
}
