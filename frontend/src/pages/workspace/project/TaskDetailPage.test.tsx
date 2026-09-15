import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderWithProviders } from '../../../test/testUtils';
import i18n from '../../../i18n';
import type { Epic, Sprint, Task } from '../../../types';
import { tasksApi } from '../../../api/tasks';
import { sprintsApi } from '../../../api/sprints';
import { labelsApi } from '../../../api/labels';
import { epicsApi } from '../../../api/epics';
import { dependenciesApi } from '../../../api/dependencies';
import { gitApi } from '../../../api/git';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useProjectMembers } from '../../../hooks/useProjectMembers';
import TaskDetailPage from './TaskDetailPage';

jest.mock('../../../api/tasks', () => ({ tasksApi: {
  getById: jest.fn(), update: jest.fn(), delete: jest.fn(), create: jest.fn(), getSubtasks: jest.fn(),
  toggleSubtaskDone: jest.fn(), getByProject: jest.fn(), getComments: jest.fn(), createComment: jest.fn(),
  updateComment: jest.fn(), deleteComment: jest.fn(), getActivity: jest.fn(),
} }));
jest.mock('../../../api/sprints', () => ({ sprintsApi: { getSprint: jest.fn() } }));
jest.mock('../../../api/labels', () => ({ labelsApi: { getByProject: jest.fn() } }));
jest.mock('../../../api/epics', () => ({ epicsApi: { getByProject: jest.fn(), assignToTask: jest.fn() } }));
jest.mock('../../../api/dependencies', () => ({ dependenciesApi: { getByTask: jest.fn(), create: jest.fn(), delete: jest.fn() } }));
jest.mock('../../../api/git', () => ({
  gitApi: { getTaskEvents: jest.fn(), link: jest.fn(), unlink: jest.fn() },
  taskGitRef: jest.fn(() => 'TASK-1'),
}));
jest.mock('../../../hooks/useProjectMember', () => ({ useProjectMember: jest.fn() }));
jest.mock('../../../hooks/useProjectMembers', () => ({ useProjectMembers: jest.fn() }));
jest.mock('../../../hooks/useBoardColumns', () => ({
  useBoardColumns: jest.fn(() => [
    { id: 'todo', name: 'TODO', position: 0, color: '#64748B', wipLimit: null, doneEquivalent: false },
    { id: 'done', name: 'DONE', position: 1, color: '#16A34A', wipLimit: null, doneEquivalent: true },
  ]),
  getStatusLabel: (status: string) => status,
  getStatusColor: () => '#64748B',
}));

const task: Task = {
  id: 'task-1',
  projectId: 'project-1',
  sprintId: 'sprint-1',
  epicId: null,
  epicName: null,
  epicColor: null,
  title: 'Pantalla del sprint',
  description: 'Detalle inicial',
  status: 'TODO',
  priority: 'MEDIUM',
  type: 'STORY',
  parentId: null,
  reporterId: 'user-1',
  assigneeId: null,
  completedAt: null,
  storyPoints: null,
  ready: false,
  position: 0,
  labels: [],
  subtaskCount: 0,
  completedSubtaskCount: 0,
  parentTitle: null,
  definitionOfDone: '',
  blockedByCount: 0,
  blocksCount: 0,
  gitEventCount: 0,
  createdAt: '2026-09-15T08:00:00Z',
  updatedAt: '2026-09-15T08:00:00Z',
};

const sprint: Sprint = {
  id: 'sprint-1',
  projectId: 'project-1',
  name: 'Sprint actual',
  goal: '',
  status: 'ACTIVE',
  startDate: '2026-09-15',
  endDate: '2026-09-29',
  createdAt: '2026-09-15T08:00:00Z',
};

const epic: Epic = {
  id: 'epic-1',
  projectId: 'project-1',
  name: 'Epic Portal',
  description: null,
  color: '#7C3AED',
  status: 'OPEN',
  startDate: null,
  targetDate: null,
  createdBy: 'user-1',
  totalTasks: 0,
  doneTasks: 0,
  createdAt: '2026-09-15T08:00:00Z',
  updatedAt: '2026-09-15T08:00:00Z',
};

const developerPermissions = {
  member: null,
  loading: false,
  isAdmin: false,
  isScrumMaster: false,
  isProductOwner: false,
  isDeveloper: true,
  canCreateTask: false,
  canEditBacklogTask: false,
  canEditSprintTask: true,
  canDeleteBacklogTask: false,
  canDeleteSprintTask: true,
  canMoveTask: true,
  canConfigureBoard: true,
  canPlanSprint: true,
  canAddToActiveSprint: true,
  canManageSprint: false,
  canCreatePokerSession: false,
};

describe('TaskDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useProjectMember).mockReturnValue(developerPermissions);
    jest.mocked(useProjectMembers).mockReturnValue({ members: [], userMap: {}, loading: false });
    jest.mocked(tasksApi.getById).mockResolvedValue(task);
    jest.mocked(tasksApi.update).mockResolvedValue(task);
    jest.mocked(tasksApi.getSubtasks).mockResolvedValue([]);
    jest.mocked(tasksApi.getByProject).mockResolvedValue([]);
    jest.mocked(tasksApi.getComments).mockResolvedValue([]);
    jest.mocked(tasksApi.getActivity).mockResolvedValue([]);
    jest.mocked(sprintsApi.getSprint).mockResolvedValue(sprint);
    jest.mocked(labelsApi.getByProject).mockResolvedValue([]);
    jest.mocked(epicsApi.getByProject).mockResolvedValue([epic]);
    jest.mocked(epicsApi.assignToTask).mockResolvedValue({ ...task, epicId: epic.id, epicName: epic.name, epicColor: epic.color });
    jest.mocked(dependenciesApi.getByTask).mockResolvedValue([]);
    jest.mocked(gitApi.getTaskEvents).mockResolvedValue([]);
  });

  it('shows a specific message when the task is saved but epic assignment is rejected for permissions', async () => {
    jest.mocked(epicsApi.assignToTask).mockRejectedValue({
      response: { status: 403, data: { errorCode: 'ONLY_PO_CAN_MANAGE_EPICS' } },
    });

    const { user } = renderWithProviders(<TaskDetailPage />, {
      route: '/workspaces/workspace-1/projects/project-1/tasks/task-1',
      path: '/workspaces/:workspaceId/projects/:projectId/tasks/:taskId',
    });

    expect(await screen.findByDisplayValue('Pantalla del sprint')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: i18n.t('tasks.modal.save') })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: i18n.t('tasks.modal.noEpic') }));
    await user.click(screen.getByRole('button', { name: 'Epic Portal' }));
    await user.click(screen.getByRole('button', { name: i18n.t('tasks.modal.save') }));

    await waitFor(() => expect(tasksApi.update).toHaveBeenCalledWith('task-1', expect.objectContaining({
      title: 'Pantalla del sprint',
    })));
    expect(epicsApi.assignToTask).toHaveBeenCalledWith('task-1', 'epic-1');
    expect(await screen.findByText(i18n.t('tasks.detail.epicChangePermissionError'))).toBeInTheDocument();
    expect(tasksApi.getById).toHaveBeenCalledTimes(2);
  });
});
