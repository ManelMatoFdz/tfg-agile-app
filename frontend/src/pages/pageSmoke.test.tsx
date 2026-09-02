import type { ReactElement } from 'react';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderWithProviders } from '../test/testUtils';
import { userFixture } from '../test/fixtures';
import { useAuthStore } from '../store/authStore';
import { workspacesApi } from '../api/workspaces';
import { invitationsApi } from '../api/invitations';
import { projectsApi } from '../api/projects';
import { categoriesApi } from '../api/categories';
import { teamsApi } from '../api/teams';
import { tasksApi } from '../api/tasks';
import { sprintsApi } from '../api/sprints';
import { labelsApi } from '../api/labels';
import { epicsApi } from '../api/epics';
import { boardColumnsApi } from '../api/boardColumns';
import { pokerApi } from '../api/poker';
import { gitApi } from '../api/git';
import { notificationsApi } from '../api/notifications';
import { usersApi } from '../api/users';
import { dependenciesApi } from '../api/dependencies';
import LandingPage from './LandingPage';
import ProfilePage from './ProfilePage';
import WorkspaceSelectorPage from './workspace/WorkspaceSelectorPage';
import WorkspaceDashboardPage from './workspace/WorkspaceDashboardPage';
import TeamsPage from './workspace/TeamsPage';
import TeamDetailPage from './workspace/TeamDetailPage';
import ProjectDetailPage from './workspace/ProjectDetailPage';
import WorkspaceMembersPage from './workspace/WorkspaceMembersPage';
import WorkspaceSettingsPage from './workspace/WorkspaceSettingsPage';
import MyTasksPage from './MyTasksPage';
import NotificationsPage from './NotificationsPage';
import KanbanPage from './workspace/project/KanbanPage';
import BacklogPage from './workspace/project/BacklogPage';
import SprintsPage from './workspace/project/SprintsPage';
import PokerPage from './workspace/project/PokerPage';
import EpicsPage from './workspace/project/EpicsPage';
import RepositoryPage from './workspace/project/RepositoryPage';
import ProjectMetricsPage from './workspace/project/ProjectMetricsPage';
import BoardSettingsPage from './workspace/project/BoardSettingsPage';
import SprintPlanningPage from './workspace/project/SprintPlanningPage';
import SprintBacklogPage from './workspace/project/SprintBacklogPage';
import ProjectMembersPage from './workspace/project/ProjectMembersPage';
import ProjectSettingsPage from './workspace/project/ProjectSettingsPage';
import SprintReportPage from './workspace/project/SprintReportPage';
import TaskDetailPage from './workspace/project/TaskDetailPage';
import PokerRoomPage from './workspace/project/PokerRoomPage';

jest.mock('../api/workspaces', () => ({ workspacesApi: {
  list: jest.fn(), getMembers: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(),
  delete: jest.fn(), leave: jest.fn(), createInvitation: jest.fn(), updateMemberRole: jest.fn(), removeMember: jest.fn(),
} }));
jest.mock('../api/invitations', () => ({ invitationsApi: { getPending: jest.fn(), accept: jest.fn(), reject: jest.fn() } }));
jest.mock('../api/projects', () => ({ projectsApi: {
  list: jest.fn(), getTeamMembers: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
} }));
jest.mock('../api/categories', () => ({ categoriesApi: {
  list: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
} }));
jest.mock('../api/teams', () => ({ teamsApi: {
  list: jest.fn(), getMembers: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
  addMember: jest.fn(), removeMember: jest.fn(), updateMemberRole: jest.fn(), updateScrumRole: jest.fn(), leaveTeam: jest.fn(),
} }));
jest.mock('../api/tasks', () => ({ tasksApi: {
  myTasks: jest.fn(), getByProject: jest.fn(), getById: jest.fn(), getSubtasks: jest.fn(), create: jest.fn(),
  update: jest.fn(), delete: jest.fn(), toggleSubtaskDone: jest.fn(),
} }));
jest.mock('../api/sprints', () => ({ sprintsApi: {
  listSprints: jest.fn(), getSprintTasks: jest.fn(), getBacklog: jest.fn(), getSprint: jest.fn(),
  getSprintStories: jest.fn(), getVelocity: jest.fn(), getSprintSnapshots: jest.fn(),
} }));
jest.mock('../api/labels', () => ({ labelsApi: {
  getByProject: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
} }));
jest.mock('../api/epics', () => ({ epicsApi: { getByProject: jest.fn(), getTasks: jest.fn(), assignToTask: jest.fn() } }));
jest.mock('../api/boardColumns', () => ({ boardColumnsApi: { getColumns: jest.fn(), saveColumns: jest.fn() } }));
jest.mock('../api/poker', () => ({ pokerApi: {
  listSessions: jest.fn(), getSession: jest.fn(), getRounds: jest.fn(), leaveSession: jest.fn(), joinSession: jest.fn(),
  updateTimer: jest.fn(), selectTask: jest.fn(), startRound: jest.fn(), closeSession: jest.fn(),
} }));
jest.mock('../api/git', () => ({
  gitApi: {
    getConfig: jest.fn(), getProjectEvents: jest.fn(), getTaskEvents: jest.fn(), setup: jest.fn(), disconnect: jest.fn(),
    link: jest.fn(), unlink: jest.fn(),
  },
  taskGitRef: jest.fn(() => null),
}));
jest.mock('../api/notifications', () => ({ notificationsApi: {
  list: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn(), getSettings: jest.fn(), updateSettings: jest.fn(),
} }));
jest.mock('../api/users', () => ({ usersApi: {
  getMe: jest.fn(), batch: jest.fn(), lookupByEmail: jest.fn(), updateMe: jest.fn(), changePassword: jest.fn(), uploadAvatar: jest.fn(),
} }));
jest.mock('../api/dependencies', () => ({ dependenciesApi: { getByTask: jest.fn(), create: jest.fn(), delete: jest.fn() } }));
jest.mock('../hooks/useProjectMember', () => ({ useProjectMember: jest.fn(() => ({
  member: null, loading: false, isAdmin: true, isScrumMaster: false, isProductOwner: false,
  isDeveloper: false, canCreateTask: true, canEditBacklogTask: true, canEditSprintTask: true,
  canDeleteBacklogTask: true, canDeleteSprintTask: true, canMoveTask: true, canPlanSprint: true,
  canAddToActiveSprint: true, canManageSprint: true, canCreatePokerSession: true,
})) }));
jest.mock('../hooks/useProjectMembers', () => ({ useProjectMembers: jest.fn(() => ({ members: [], userMap: {}, loading: false })) }));
jest.mock('../hooks/useUserMap', () => ({ useUserMap: jest.fn(() => new Map()) }));
jest.mock('../hooks/usePokerSocket', () => ({ usePokerSocket: jest.fn(() => ({
  connected: false, voteStatus: {}, setVoteStatus: jest.fn(), revealedRound: null, sessionState: null,
  participantUpdate: null, sendVote: jest.fn(), sendReveal: jest.fn(), sendNext: jest.fn(), sendRevote: jest.fn(),
  error: null, onReconnectRef: { current: null },
})) }));
jest.mock('../hooks/useLenis', () => ({ useLenis: jest.fn() }));
jest.mock('../hooks/useBoardColumns', () => ({
  useBoardColumns: jest.fn(() => []),
  getStatusLabel: (status: string) => status,
  getStatusColor: () => '#999999',
}));

const axiosResponse = <T,>(data: T) => ({ data }) as never;
const sprint = {
  id: 'sprint-1', projectId: 'project-1', name: 'Sprint 1', goal: '', status: 'PLANNING',
  startDate: '2026-01-01', endDate: '2026-01-14', createdAt: '2026-01-01',
};
const workspace = {
  id: 'workspace-1', name: 'Workspace One', description: '', ownerId: 'user-1',
  createdAt: '2026-01-01', updatedAt: '2026-01-01',
};
const project = {
  id: 'project-1', workspaceId: 'workspace-1', teamId: 'team-1', name: 'Project One', description: '',
  color: '#6366f1', visibility: 'PRIVATE', createdAt: '2026-01-01', updatedAt: '2026-01-01',
};
const team = {
  id: 'team-1', workspaceId: 'workspace-1', name: 'Team One', description: '', color: '#6366f1',
  createdAt: '2026-01-01', updatedAt: '2026-01-01',
};

describe('main page loading contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ accessToken: 'token', refreshToken: null, user: userFixture() });
    jest.mocked(workspacesApi.list).mockResolvedValue(axiosResponse([]));
    jest.mocked(workspacesApi.getById).mockResolvedValue(axiosResponse(workspace));
    jest.mocked(workspacesApi.getMembers).mockResolvedValue(axiosResponse([]));
    jest.mocked(invitationsApi.getPending).mockResolvedValue(axiosResponse([]));
    jest.mocked(projectsApi.list).mockResolvedValue(axiosResponse([]));
    jest.mocked(projectsApi.getById).mockResolvedValue(axiosResponse(project));
    jest.mocked(projectsApi.getTeamMembers).mockResolvedValue(axiosResponse([]));
    jest.mocked(categoriesApi.list).mockResolvedValue(axiosResponse([]));
    jest.mocked(teamsApi.list).mockResolvedValue(axiosResponse([]));
    jest.mocked(teamsApi.getById).mockResolvedValue(axiosResponse(team));
    jest.mocked(teamsApi.getMembers).mockResolvedValue(axiosResponse([]));
    jest.mocked(tasksApi.myTasks).mockResolvedValue([]);
    jest.mocked(tasksApi.getByProject).mockResolvedValue([]);
    jest.mocked(tasksApi.getSubtasks).mockResolvedValue([]);
    jest.mocked(sprintsApi.listSprints).mockResolvedValue([]);
    jest.mocked(sprintsApi.getSprintTasks).mockResolvedValue([]);
    jest.mocked(sprintsApi.getBacklog).mockResolvedValue([]);
    jest.mocked(sprintsApi.getSprintStories).mockResolvedValue([]);
    jest.mocked(sprintsApi.getSprint).mockResolvedValue(sprint as never);
    jest.mocked(sprintsApi.getVelocity).mockResolvedValue({ averageVelocity: 0, completedSprints: 0 });
    jest.mocked(sprintsApi.getSprintSnapshots).mockResolvedValue([]);
    jest.mocked(labelsApi.getByProject).mockResolvedValue([]);
    jest.mocked(epicsApi.getByProject).mockResolvedValue([]);
    jest.mocked(boardColumnsApi.getColumns).mockResolvedValue([]);
    jest.mocked(pokerApi.listSessions).mockResolvedValue([]);
    jest.mocked(pokerApi.getSession).mockRejectedValue(new Error('not found'));
    jest.mocked(pokerApi.getRounds).mockResolvedValue([]);
    jest.mocked(pokerApi.leaveSession).mockResolvedValue(undefined as never);
    jest.mocked(gitApi.getConfig).mockResolvedValue(null);
    jest.mocked(gitApi.getProjectEvents).mockResolvedValue({ items: [], totalElements: 0, hasNext: false } as never);
    jest.mocked(gitApi.getTaskEvents).mockResolvedValue([]);
    jest.mocked(dependenciesApi.getByTask).mockResolvedValue([]);
    jest.mocked(tasksApi.getById).mockRejectedValue({ response: { status: 404 } });
    jest.mocked(usersApi.getMe).mockResolvedValue(axiosResponse(userFixture()));
    jest.mocked(usersApi.batch).mockResolvedValue(axiosResponse([]));
    jest.mocked(notificationsApi.getSettings).mockResolvedValue(axiosResponse({
      inAppNotificationsEnabled: true, projectUpdatesEnabled: true, taskRemindersEnabled: true,
    }));
    jest.mocked(notificationsApi.list).mockResolvedValue(axiosResponse({
      content: [], totalElements: 0, totalPages: 0, size: 10,
    }));
  });

  const cases: Array<{
    name: string;
    ui: ReactElement;
    route: string;
    path?: string;
    called: jest.Mock;
  }> = [
    { name: 'workspace selector', ui: <WorkspaceSelectorPage />, route: '/workspaces', called: workspacesApi.list as jest.Mock },
    { name: 'workspace dashboard', ui: <WorkspaceDashboardPage />, route: '/workspaces/workspace-1', path: '/workspaces/:workspaceId', called: projectsApi.list as jest.Mock },
    { name: 'teams', ui: <TeamsPage />, route: '/workspaces/workspace-1/teams', path: '/workspaces/:workspaceId/teams', called: teamsApi.list as jest.Mock },
    { name: 'my tasks', ui: <MyTasksPage />, route: '/workspaces/workspace-1/my-tasks', path: '/workspaces/:workspaceId/my-tasks', called: tasksApi.myTasks as jest.Mock },
    { name: 'notifications', ui: <NotificationsPage />, route: '/workspaces/workspace-1/notifications', path: '/workspaces/:workspaceId/notifications', called: notificationsApi.list as jest.Mock },
    { name: 'kanban', ui: <KanbanPage />, route: '/workspaces/workspace-1/projects/project-1/board', path: '/workspaces/:workspaceId/projects/:projectId/board', called: sprintsApi.listSprints as jest.Mock },
    { name: 'backlog', ui: <BacklogPage />, route: '/workspaces/workspace-1/projects/project-1/backlog', path: '/workspaces/:workspaceId/projects/:projectId/backlog', called: sprintsApi.getBacklog as jest.Mock },
    { name: 'sprints', ui: <SprintsPage />, route: '/workspaces/workspace-1/projects/project-1/sprints', path: '/workspaces/:workspaceId/projects/:projectId/sprints', called: sprintsApi.listSprints as jest.Mock },
    { name: 'poker', ui: <PokerPage />, route: '/workspaces/workspace-1/projects/project-1/poker', path: '/workspaces/:workspaceId/projects/:projectId/poker', called: pokerApi.listSessions as jest.Mock },
    { name: 'epics', ui: <EpicsPage />, route: '/workspaces/workspace-1/projects/project-1/epics', path: '/workspaces/:workspaceId/projects/:projectId/epics', called: epicsApi.getByProject as jest.Mock },
    { name: 'repository', ui: <RepositoryPage />, route: '/workspaces/workspace-1/projects/project-1/repository', path: '/workspaces/:workspaceId/projects/:projectId/repository', called: gitApi.getConfig as jest.Mock },
    { name: 'metrics', ui: <ProjectMetricsPage />, route: '/workspaces/workspace-1/projects/project-1/metrics', path: '/workspaces/:workspaceId/projects/:projectId/metrics', called: tasksApi.getByProject as jest.Mock },
    { name: 'board settings', ui: <BoardSettingsPage />, route: '/workspaces/workspace-1/projects/project-1/board-settings', path: '/workspaces/:workspaceId/projects/:projectId/board-settings', called: boardColumnsApi.getColumns as jest.Mock },
    { name: 'sprint planning', ui: <SprintPlanningPage />, route: '/workspaces/workspace-1/projects/project-1/sprints/sprint-1/planning', path: '/workspaces/:workspaceId/projects/:projectId/sprints/:sprintId/planning', called: sprintsApi.getSprint as jest.Mock },
    { name: 'sprint backlog', ui: <SprintBacklogPage />, route: '/workspaces/workspace-1/projects/project-1/sprints/sprint-1/backlog', path: '/workspaces/:workspaceId/projects/:projectId/sprints/:sprintId/backlog', called: sprintsApi.getSprint as jest.Mock },
    { name: 'project detail', ui: <ProjectDetailPage />, route: '/workspaces/workspace-1/projects/project-1', path: '/workspaces/:workspaceId/projects/:projectId', called: projectsApi.getById as jest.Mock },
    { name: 'team detail', ui: <TeamDetailPage />, route: '/workspaces/workspace-1/teams/team-1', path: '/workspaces/:workspaceId/teams/:teamId', called: teamsApi.getById as jest.Mock },
    { name: 'workspace members', ui: <WorkspaceMembersPage />, route: '/workspaces/workspace-1/members', path: '/workspaces/:workspaceId/members', called: workspacesApi.getMembers as jest.Mock },
    { name: 'workspace settings', ui: <WorkspaceSettingsPage />, route: '/workspaces/workspace-1/settings', path: '/workspaces/:workspaceId/settings', called: workspacesApi.getById as jest.Mock },
    { name: 'project members', ui: <ProjectMembersPage />, route: '/workspaces/workspace-1/projects/project-1/members', path: '/workspaces/:workspaceId/projects/:projectId/members', called: projectsApi.getTeamMembers as jest.Mock },
    { name: 'project settings', ui: <ProjectSettingsPage />, route: '/workspaces/workspace-1/projects/project-1/settings', path: '/workspaces/:workspaceId/projects/:projectId/settings', called: projectsApi.getById as jest.Mock },
    { name: 'sprint report', ui: <SprintReportPage />, route: '/workspaces/workspace-1/projects/project-1/sprints/sprint-1/report', path: '/workspaces/:workspaceId/projects/:projectId/sprints/:sprintId/report', called: sprintsApi.getSprint as jest.Mock },
    { name: 'task detail not-found state', ui: <TaskDetailPage />, route: '/workspaces/workspace-1/projects/project-1/tasks/task-1', path: '/workspaces/:workspaceId/projects/:projectId/tasks/:taskId', called: tasksApi.getById as jest.Mock },
    { name: 'poker room load error', ui: <PokerRoomPage />, route: '/workspaces/workspace-1/projects/project-1/poker/session-1', path: '/workspaces/:workspaceId/projects/:projectId/poker/:sessionId', called: pokerApi.getSession as jest.Mock },
  ];

  it.each(cases)('renders the $name page after its empty response', async ({ ui, route, path, called }) => {
    const { container } = renderWithProviders(ui, { route, path });
    await waitFor(() => expect(called).toHaveBeenCalled());
    await waitFor(() => expect(container).not.toBeEmptyDOMElement());
  });

  it('renders the landing page without making an API request', () => {
    const { container } = renderWithProviders(<LandingPage />, { route: '/' });
    expect(container).not.toBeEmptyDOMElement();
  });

  it('hydrates the profile page from the current-user endpoint', async () => {
    const { container } = renderWithProviders(<ProfilePage />, { route: '/workspaces/workspace-1/profile' });
    await waitFor(() => expect(usersApi.getMe).toHaveBeenCalled());
    expect(container).toHaveTextContent(userFixture().username);
  });
});
