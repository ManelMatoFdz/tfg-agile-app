import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import MyTasksPage from './MyTasksPage';
import { renderWithProviders } from '../test/testUtils';
import { tasksApi } from '../api/tasks';
import { projectsApi } from '../api/projects';
import type { BoardColumn, Project, Task } from '../types';
import i18n from '../i18n';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
jest.mock('../api/tasks', () => ({ tasksApi: { myTasks: jest.fn(), getById: jest.fn() } }));
jest.mock('../api/projects', () => ({ projectsApi: { list: jest.fn() } }));
jest.mock('../hooks/useBoardColumns', () => ({
  useBoardColumns: jest.fn(() => [{ id: 'done', name: 'DONE', position: 1, color: '#16A34A', wipLimit: null, doneEquivalent: true }]),
  getStatusLabel: jest.fn((status: string) => status),
  getStatusColor: jest.fn(() => '#2563EB'),
}));
jest.mock('../components/kanban/SubtaskModal', () => ({
  __esModule: true,
  default: ({ subtask, readOnly, onClose, columns }: { subtask: Task; readOnly: boolean; onClose: () => void; columns: BoardColumn[] }) => (
    <div>
      <span>{subtask.title}</span>
      <span>{readOnly ? 'read-only' : 'editable'}</span>
      <span>{columns.length}</span>
      <button onClick={onClose}>close-subtask</button>
    </div>
  ),
}));

const mockMyTasks = jest.mocked(tasksApi.myTasks);
const mockGetById = jest.mocked(tasksApi.getById);
const mockListProjects = jest.mocked(projectsApi.list);

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    workspaceId: 'workspace-1',
    name: 'Platform',
    description: '',
    color: '#6366f1',
    visibility: 'PRIVATE',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
    ...overrides,
  };
}

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Root task',
    description: null,
    status: 'TODO',
    priority: 'HIGH',
    type: 'STORY',
    reporterId: 'u1',
    assigneeId: null,
    completedAt: null,
    storyPoints: 5,
    ready: false,
    position: 0,
    labels: [{ id: 'label-1', name: 'Backend', color: '#2563EB' }],
    subtaskCount: 1,
    completedSubtaskCount: 0,
    parentTitle: null,
    definitionOfDone: null,
    blockedByCount: 0,
    blocksCount: 0,
    gitEventCount: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('MyTasksPage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('renders the empty state when there are no tasks in the workspace', async () => {
    mockMyTasks.mockResolvedValue([]);
    mockListProjects.mockResolvedValue({ data: [projectFixture()] } as never);

    renderWithProviders(<MyTasksPage />, { route: '/workspaces/workspace-1/my-tasks', path: '/workspaces/:workspaceId/my-tasks' });

    expect(await screen.findByText(i18n.t('myTasks.empty'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('myTasks.emptySubtitle'))).toBeInTheDocument();
  });

  it('renders the translated error when loading fails', async () => {
    mockMyTasks.mockRejectedValue(new Error('network'));
    mockListProjects.mockResolvedValue({ data: [projectFixture()] } as never);

    renderWithProviders(<MyTasksPage />, { route: '/workspaces/workspace-1/my-tasks', path: '/workspaces/:workspaceId/my-tasks' });

    expect(await screen.findByText(i18n.t('myTasks.loadError'))).toBeInTheDocument();
  });

  it('filters tasks by workspace, project and priority and navigates from root tasks', async () => {
    mockMyTasks.mockResolvedValue([
      taskFixture({ id: 'todo-1', title: 'Root task', projectId: 'project-1', status: 'TODO', priority: 'HIGH' }),
      taskFixture({ id: 'progress-1', title: 'Progress task', projectId: 'project-2', status: 'IN_PROGRESS', priority: 'LOW', storyPoints: null, labels: [] }),
      taskFixture({ id: 'outside', title: 'Outside workspace', projectId: 'project-3', status: 'TODO' }),
    ]);
    mockListProjects.mockResolvedValue({ data: [
      projectFixture({ id: 'project-1', name: 'Platform' }),
      projectFixture({ id: 'project-2', name: 'Mobile', color: '#22c55e' }),
    ] } as never);

    const { user } = renderWithProviders(<MyTasksPage />, {
      route: '/workspaces/workspace-1/my-tasks',
      path: '/workspaces/:workspaceId/my-tasks',
    });

    expect(await screen.findByText('Root task')).toBeInTheDocument();
    expect(screen.queryByText('Outside workspace')).not.toBeInTheDocument();

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'project-2');
    await user.click(screen.getByRole('button', { name: /IN_PROGRESS/ }));
    expect(screen.getByText('Progress task')).toBeInTheDocument();

    await user.selectOptions(selects[1], 'LOW');
    expect(screen.getByText('Progress task')).toBeInTheDocument();

    await user.selectOptions(selects[0], 'ALL');
    await user.selectOptions(selects[1], 'ALL');
    await user.click(screen.getByRole('button', { name: /TODO/ }));
    await user.click(screen.getByText('Root task'));

    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/workspace-1/projects/project-1/tasks/todo-1', expect.any(Object));

    await user.click(screen.getByTitle(i18n.t('myTasks.goToProject')));
    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/workspace-1/projects/project-1/board');
  });

  it('opens subtasks in read-only modal using the fresh task when available', async () => {
    const subtask = taskFixture({
      id: 'sub-1',
      title: 'Subtask from list',
      projectId: 'project-1',
      status: 'IN_PROGRESS',
      parentId: 'parent-1',
      parentTitle: 'Parent',
      type: 'TASK',
      storyPoints: null,
      labels: [],
    });
    mockMyTasks.mockResolvedValue([subtask]);
    mockListProjects.mockResolvedValue({ data: [projectFixture()] } as never);
    mockGetById.mockResolvedValue({ ...subtask, title: 'Fresh subtask' });

    const { user } = renderWithProviders(<MyTasksPage />, {
      route: '/workspaces/workspace-1/my-tasks',
      path: '/workspaces/:workspaceId/my-tasks',
    });

    expect(await screen.findByRole('button', { name: /IN_PROGRESS/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /IN_PROGRESS/ }));
    await user.click(screen.getByText('Subtask from list'));

    expect(await screen.findByText('Fresh subtask')).toBeInTheDocument();
    expect(screen.getByText('read-only')).toBeInTheDocument();
  });

  it('falls back to the list data when fetching the subtask fails', async () => {
    const subtask = taskFixture({
      id: 'sub-1',
      title: 'Fallback subtask',
      projectId: 'project-1',
      status: 'IN_PROGRESS',
      parentId: 'parent-1',
      parentTitle: 'Parent',
      type: 'TASK',
      storyPoints: null,
      labels: [],
    });
    mockMyTasks.mockResolvedValue([subtask]);
    mockListProjects.mockResolvedValue({ data: [projectFixture()] } as never);
    mockGetById.mockRejectedValue(new Error('boom'));

    const { user } = renderWithProviders(<MyTasksPage />, {
      route: '/workspaces/workspace-1/my-tasks',
      path: '/workspaces/:workspaceId/my-tasks',
    });

    await screen.findByRole('button', { name: /IN_PROGRESS/ });
    await user.click(screen.getByRole('button', { name: /IN_PROGRESS/ }));
    await user.click(screen.getByText('Fallback subtask'));

    expect(await screen.findByText('read-only')).toBeInTheDocument();
  });
});
