import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import client from './client';
import projectClient from './projectClient';
import taskClient from './taskClient';
import pokerClient from './pokerClient';
import { authApi } from './auth';
import { boardColumnsApi } from './boardColumns';
import { categoriesApi } from './categories';
import { dependenciesApi } from './dependencies';
import { epicsApi } from './epics';
import { gitApi, taskGitRef } from './git';
import { invitationsApi } from './invitations';
import { labelsApi } from './labels';
import { notificationsApi } from './notifications';
import { pokerApi } from './poker';
import { projectsApi } from './projects';
import { sprintsApi } from './sprints';
import { tasksApi } from './tasks';
import { teamsApi } from './teams';
import { usersApi } from './users';
import { workspacesApi } from './workspaces';

jest.mock('./client', () => ({ __esModule: true, default: {
  get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn(),
} }));
jest.mock('./projectClient', () => ({ __esModule: true, default: {
  get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn(),
} }));
jest.mock('./taskClient', () => ({ __esModule: true, default: {
  get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn(),
} }));
jest.mock('./pokerClient', () => ({ __esModule: true, default: {
  get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn(),
} }));

type MockHttp = { get: jest.Mock; post: jest.Mock; put: jest.Mock; patch: jest.Mock; delete: jest.Mock };
const response = { data: { id: 'result' }, status: 200 };

function prime(http: MockHttp) {
  Object.values(http).forEach((method) => method.mockResolvedValue(response));
}

describe('API endpoint modules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    [client, projectClient, taskClient, pokerClient].forEach((http) => prime(http as unknown as MockHttp));
  });

  it('maps authentication, user and notification operations to the user service', async () => {
    await authApi.login('a@b.dev', 'secret');
    await authApi.register('alice', 'a@b.dev', 'secret');
    await authApi.googleLogin('google-token');
    await authApi.logout('refresh');
    await authApi.forgotPassword('a@b.dev');
    await authApi.resetPassword('reset-token', 'new-secret');
    await authApi.me();
    await usersApi.getMe();
    await usersApi.updateMe({ fullName: 'Alice' });
    await usersApi.changePassword('new-secret', 'old-secret');
    await usersApi.uploadAvatar(new File(['avatar'], 'avatar.png', { type: 'image/png' }));
    await usersApi.batch(['u1']);
    await usersApi.lookupByEmail('a+b@b.dev');
    await notificationsApi.list({ unreadOnly: true, page: 1, size: 10 });
    await notificationsApi.markRead('n1');
    await notificationsApi.markAllRead();
    await notificationsApi.getSettings();
    await notificationsApi.updateSettings({ projectUpdatesEnabled: false });

    expect(client.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.dev', password: 'secret' });
    expect(client.get).toHaveBeenCalledWith('/users/lookup?email=a%2Bb%40b.dev');
    expect(client.patch).toHaveBeenCalledWith('/users/me/notifications/n1/read');
    const upload = jest.mocked(client.post).mock.calls.find(([url]) => url === '/users/me/avatar');
    expect(upload?.[1]).toBeInstanceOf(FormData);
  });

  it('maps workspace, category, invitation, project and team operations to the project service', async () => {
    await workspacesApi.list();
    await workspacesApi.create({ name: 'Workspace' });
    await workspacesApi.getById('w1');
    await workspacesApi.update('w1', { name: 'Renamed' });
    await workspacesApi.delete('w1');
    await workspacesApi.getMembers('w1');
    await workspacesApi.addMember('w1', { userId: 'u1', role: 'MEMBER' });
    await workspacesApi.updateMemberRole('w1', 'u1', 'ADMIN');
    await workspacesApi.removeMember('w1', 'u1');
    await workspacesApi.createInvitation('w1', 'u1', 'a@b.dev');
    await workspacesApi.leave('w1');
    await categoriesApi.list('w1');
    await categoriesApi.create('w1', { name: 'Cat', position: 0 });
    await categoriesApi.update('w1', 'c1', { name: 'Updated', position: 1 });
    await categoriesApi.delete('w1', 'c1');
    await invitationsApi.getPending();
    await invitationsApi.accept('i1');
    await invitationsApi.reject('i1');
    await projectsApi.list('w1');
    await projectsApi.create('w1', { name: 'Project', teamId: 't1' });
    await projectsApi.getById('p1');
    await projectsApi.update('p1', { name: 'Updated' });
    await projectsApi.delete('p1');
    await projectsApi.getTeamMembers('p1');
    await teamsApi.list('w1');
    await teamsApi.create('w1', { name: 'Team' });
    await teamsApi.getById('t1');
    await teamsApi.update('t1', { name: 'Updated' });
    await teamsApi.delete('t1');
    await teamsApi.getMembers('t1');
    await teamsApi.addMember('t1', 'u1');
    await teamsApi.removeMember('t1', 'u1');
    await teamsApi.updateMemberRole('t1', 'u1', 'ADMIN');
    await teamsApi.leaveTeam('t1');
    await teamsApi.updateScrumRole('t1', 'u1', 'DEVELOPER');

    expect(projectClient.post).toHaveBeenCalledWith('/workspaces/w1/invitations', { userId: 'u1', email: 'a@b.dev' });
    expect(projectClient.put).toHaveBeenCalledWith('/teams/t1/members/u1/role', { role: 'ADMIN' });
    expect(projectClient.patch).toHaveBeenCalledWith('/teams/t1/members/u1/scrum-role', { scrumRole: 'DEVELOPER' });
  });

  it('maps task, dependency, label and epic operations to the task service', async () => {
    await tasksApi.myTasks();
    await tasksApi.getByProject('p1');
    await tasksApi.getById('task1');
    await tasksApi.create('p1', { title: 'Task' });
    await tasksApi.update('task1', { title: 'Updated' });
    await tasksApi.move('task1', { status: 'DONE', position: 2 });
    await tasksApi.delete('task1');
    await tasksApi.getSubtasks('task1');
    await tasksApi.getComments('task1');
    await tasksApi.createComment('task1', 'hello');
    await tasksApi.updateComment('comment1', 'edited');
    await tasksApi.deleteComment('comment1');
    await tasksApi.toggleSubtaskDone('task1');
    await tasksApi.getActivity('task1');
    await dependenciesApi.getByTask('task1');
    await dependenciesApi.create('task1', 'task2');
    await dependenciesApi.delete('task1', 'dep1');
    await dependenciesApi.getByProject('p1');
    await labelsApi.getByProject('p1');
    await labelsApi.create('p1', { name: 'frontend' });
    await labelsApi.update('label1', { name: 'backend' });
    await labelsApi.delete('label1');
    await epicsApi.getByProject('p1');
    await epicsApi.getById('p1', 'epic1');
    await epicsApi.create('p1', { name: 'Epic' });
    await epicsApi.update('p1', 'epic1', { name: 'Updated' });
    await epicsApi.delete('p1', 'epic1');
    await epicsApi.getTasks('p1', 'epic1');
    await epicsApi.assignToTask('task1', 'epic1');

    expect(taskClient.patch).toHaveBeenCalledWith('/tasks/task1/move', { status: 'DONE', position: 2 });
    expect(taskClient.post).toHaveBeenCalledWith('/tasks/task1/dependencies', { blockedTaskId: 'task2' });
    expect(taskClient.put).toHaveBeenCalledWith('/tasks/task1/epic', { epicId: 'epic1' });
  });

  it('maps sprint operations and serializes every active task filter', async () => {
    const filters = {
      priorities: ['HIGH'], assigneeIds: ['u1'], labelIds: ['l1'], statuses: ['TODO'], epicIds: ['e1'], search: 'needle',
    } as never;
    await sprintsApi.getBacklog('p1', filters);
    await sprintsApi.getBacklog('p1');
    await sprintsApi.listSprints('p1');
    await sprintsApi.getSprint('s1');
    await sprintsApi.createSprint('p1', { name: 'Sprint', startDate: '2026-01-01', endDate: '2026-01-14' });
    await sprintsApi.updateSprint('s1', { name: 'Updated' });
    await sprintsApi.activateSprint('s1');
    await sprintsApi.deleteSprint('s1');
    await sprintsApi.getSprintTasks('s1', filters);
    await sprintsApi.assignTasksToSprint('s1', ['task1']);
    await sprintsApi.removeTaskFromSprint('s1', 'task1');
    await sprintsApi.getSprintStories('s1', filters);
    await sprintsApi.getSprintSnapshots('s1');
    await sprintsApi.getVelocity('p1');
    await sprintsApi.saveRetrospective('s1', '{}');

    expect(taskClient.get).toHaveBeenCalledWith('/projects/p1/backlog', { params: {
      priority: ['HIGH'], assigneeId: ['u1'], labelId: ['l1'], status: ['TODO'], epicId: ['e1'], search: 'needle',
    } });
    expect(taskClient.patch).toHaveBeenCalledWith('/sprints/s1/retrospective', { reviewNotes: '{}' });
  });

  it('maps Git and board-column operations and handles an absent Git integration', async () => {
    await boardColumnsApi.getColumns('p1');
    await boardColumnsApi.saveColumns('p1', []);
    await gitApi.getConfig('p1');
    jest.mocked(taskClient.get).mockResolvedValueOnce({ data: '', status: 204 });
    await expect(gitApi.getConfig('p2')).resolves.toBeNull();
    await gitApi.setup('p1', 'https://github.com/acme/repo');
    await gitApi.disconnect('p1');
    await gitApi.getProjectEvents('p1', { type: 'COMMIT', page: 0, size: 20 });
    await gitApi.getTaskEvents('task1');
    await gitApi.link('task1', 'https://github.com/acme/repo/commit/abc', 'Commit');
    await gitApi.unlink('task1', 'event1');

    expect(taskGitRef('1234567890')).toBe('TASK-12345678');
    expect(taskClient.put).toHaveBeenCalledWith('/projects/p1/board-columns', { columns: [] });
    expect(taskClient.get).toHaveBeenCalledWith('/projects/p1/git/events', { params: { type: 'COMMIT', page: 0, size: 20 } });
  });

  it('maps every planning-poker operation to the poker service', async () => {
    await pokerApi.createSession('p1', { name: 'Planning', deck: 'FIBONACCI' });
    await pokerApi.listSessions('p1');
    await pokerApi.getSession('session1');
    await pokerApi.joinSession('session1', { displayName: 'Alice', role: 'VOTER' });
    await pokerApi.leaveSession('session1');
    await pokerApi.closeSession('session1');
    await pokerApi.updateTimer('session1', 60);
    await pokerApi.selectTask('session1', 'task1');
    await pokerApi.startRound('session1', { taskId: 'task1', taskTitle: 'Task' });
    await pokerApi.getRounds('session1');

    expect(pokerClient.post).toHaveBeenCalledWith('/poker/sessions/session1/timer', { timerSeconds: 60 });
    expect(pokerClient.post).toHaveBeenCalledWith('/poker/sessions/session1/rounds', { taskId: 'task1', taskTitle: 'Task' });
  });
});
