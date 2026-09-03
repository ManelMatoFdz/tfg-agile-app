import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import KanbanBoard from './KanbanBoard';
import { renderWithProviders } from '../../test/testUtils';
import { tasksApi } from '../../api/tasks';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import type { BoardColumn, Task } from '../../types';
import i18n from '../../i18n';

const mockNavigate = jest.fn();
let dndHandlers: { onDragStart?: any; onDragOver?: any; onDragEnd?: any; onDragCancel?: any } = {};

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/workspaces/workspace-1/projects/project-1/board', search: '' }),
  };
});
jest.mock('../../api/tasks', () => ({
  tasksApi: {
    move: jest.fn(),
  },
}));
jest.mock('../../hooks/useProjectMembers', () => ({ useProjectMembers: jest.fn() }));
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragStart, onDragOver, onDragEnd, onDragCancel }: any) => {
    dndHandlers = { onDragStart, onDragOver, onDragEnd, onDragCancel };
    return <div>{children}</div>;
  },
  DragOverlay: ({ children }: any) => <div>{children}</div>,
  PointerSensor: function PointerSensor() { return null; },
  useSensor: () => ({}),
  useSensors: () => [],
  useDroppable: () => ({ setNodeRef: jest.fn() }),
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: jest.fn(), transform: null, isDragging: false }),
}));
jest.mock('./TaskCard', () => ({
  __esModule: true,
  default: ({ task, onClick }: any) => <button onClick={onClick}>{task.title}</button>,
}));
jest.mock('./CreateTaskModal', () => ({
  __esModule: true,
  default: ({ onCreated, onClose }: any) => (
    <div>
      <span>Create task modal</span>
      <button onClick={() => onCreated({
        id: 'task-new',
        projectId: 'project-1',
        title: 'Created task',
        description: null,
        status: 'TODO',
        priority: 'LOW',
        type: 'TASK',
        reporterId: 'user-1',
        assigneeId: null,
        completedAt: null,
        storyPoints: null,
        ready: false,
        position: 2,
        labels: [],
        subtaskCount: 0,
        completedSubtaskCount: 0,
        definitionOfDone: null,
        blockedByCount: 0,
        blocksCount: 0,
        gitEventCount: 0,
        createdAt: '2026-09-03',
        updatedAt: '2026-09-03',
      })}>Confirm create</button>
      <button onClick={onClose}>Close create</button>
    </div>
  ),
}));

const mockMove = jest.mocked(tasksApi.move);
const mockUseProjectMembers = jest.mocked(useProjectMembers);

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Task one',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    type: 'TASK',
    reporterId: 'user-1',
    assigneeId: 'user-2',
    completedAt: null,
    storyPoints: null,
    ready: false,
    position: 0,
    labels: [],
    subtaskCount: 0,
    completedSubtaskCount: 0,
    definitionOfDone: null,
    blockedByCount: 0,
    blocksCount: 0,
    gitEventCount: 0,
    createdAt: '2026-09-03',
    updatedAt: '2026-09-03',
    ...overrides,
  };
}

function columnFixture(overrides: Partial<BoardColumn> = {}): BoardColumn {
  return {
    id: 'col-1',
    name: 'TODO',
    position: 0,
    color: '#2563EB',
    wipLimit: null,
    doneEquivalent: false,
    ...overrides,
  };
}

describe('KanbanBoard', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    dndHandlers = {};
    await i18n.changeLanguage('en');
    mockUseProjectMembers.mockReturnValue({
      members: [],
      userMap: { 'user-2': { id: 'user-2', username: 'grace', fullName: 'Grace Hopper' } },
      loading: false,
    });
  });

  it('renders columns and orphaned tasks, opens task details and creates tasks from the modal', async () => {
    const onTasksChange = jest.fn();
    const tasks = [
      taskFixture({ id: 'task-1', title: 'Orphan critical', status: 'BLOCKED', priority: 'CRITICAL' }),
      taskFixture({ id: 'task-2', title: 'Todo task', status: 'TODO', position: 1 }),
      taskFixture({ id: 'task-3', title: 'Done task', status: 'DONE' }),
    ];

    const { user } = renderWithProviders(
      <KanbanBoard
        projectId="project-1"
        tasks={tasks}
        columns={[columnFixture(), columnFixture({ id: 'col-2', name: 'DONE', position: 1, color: '#16A34A', doneEquivalent: true })]}
        onTasksChange={onTasksChange}
      />,
      {
        route: '/workspaces/workspace-1/projects/project-1/board',
        path: '/workspaces/:workspaceId/projects/:projectId/board',
      },
    );

    expect(screen.getByText(i18n.t('projects.kanban.uncategorized'))).toBeInTheDocument();
    expect(screen.getByText('Orphan critical')).toBeInTheDocument();

    await user.click(screen.getByText('Todo task'));
    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/workspace-1/projects/project-1/tasks/task-2', {
      state: { from: '/workspaces/workspace-1/projects/project-1/board', task: tasks[1] },
    });

    await user.click(screen.getAllByTitle(i18n.t('projects.kanban.newTask'))[0]);
    expect(screen.getByText('Create task modal')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm create' }));
    expect(onTasksChange).toHaveBeenCalledWith([...tasks, expect.objectContaining({ id: 'task-new', title: 'Created task' })]);
  });

  it('applies optimistic moves, refreshes on success and rolls back on WIP errors', async () => {
    const onTasksChange = jest.fn();
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    const onError = jest.fn();
    const tasks = [
      taskFixture({ id: 'task-1', title: 'Todo task', status: 'TODO' }),
      taskFixture({ id: 'task-2', title: 'Done task', status: 'DONE' }),
    ];
    mockMove
      .mockResolvedValueOnce(taskFixture({ id: 'task-1', title: 'Todo task', status: 'DONE', position: 1 }) as never)
      .mockRejectedValueOnce({ response: { data: { message: 'WIP_LIMIT_EXCEEDED:IN_PROGRESS:3:2' } } });

    renderWithProviders(
      <KanbanBoard
        projectId="project-1"
        tasks={tasks}
        columns={[columnFixture(), columnFixture({ id: 'col-2', name: 'DONE', position: 1, color: '#16A34A', doneEquivalent: true }), columnFixture({ id: 'col-3', name: 'IN_PROGRESS', position: 2, color: '#F59E0B' })]}
        onTasksChange={onTasksChange}
        onRefresh={onRefresh}
        onError={onError}
      />,
      {
        route: '/workspaces/workspace-1/projects/project-1/board',
        path: '/workspaces/:workspaceId/projects/:projectId/board',
      },
    );

    await act(async () => {
      dndHandlers.onDragEnd?.({ active: { id: 'task-1' }, over: { id: 'DONE' } });
    });
    await waitFor(() => expect(mockMove).toHaveBeenCalledWith('task-1', { status: 'DONE', position: 1 }));
    expect(onTasksChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'task-1', status: 'DONE' })]));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());

    await act(async () => {
      dndHandlers.onDragEnd?.({ active: { id: 'task-2' }, over: { id: 'IN_PROGRESS' } });
    });
    await waitFor(() => expect(onError).toHaveBeenCalledWith(i18n.t('projects.boardSettings.errorWipExceeded', {
      column: 'IN PROGRESS',
      current: '3',
      limit: '2',
    })));
    expect(onTasksChange).toHaveBeenCalledWith(tasks);
  });

  it('opens the blocked-task confirmation modal and only moves after confirmation', async () => {
    const onTasksChange = jest.fn();
    const tasks = [taskFixture({ id: 'task-1', title: 'Blocked task', blockedByCount: 2 })];
    mockMove.mockResolvedValue(taskFixture({ id: 'task-1', title: 'Blocked task', status: 'DONE' }) as never);

    const { user } = renderWithProviders(
      <KanbanBoard
        projectId="project-1"
        tasks={tasks}
        columns={[columnFixture(), columnFixture({ id: 'col-2', name: 'DONE', position: 1, color: '#16A34A', doneEquivalent: true })]}
        onTasksChange={onTasksChange}
      />,
      {
        route: '/workspaces/workspace-1/projects/project-1/board',
        path: '/workspaces/:workspaceId/projects/:projectId/board',
      },
    );

    await act(async () => {
      dndHandlers.onDragEnd?.({ active: { id: 'task-1' }, over: { id: 'DONE' } });
    });

    expect((await screen.findAllByText(i18n.t('tasks.card.blockedMoveTitle'))).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: i18n.t('tasks.card.blockedMoveCancel') }));
    expect(mockMove).not.toHaveBeenCalled();

    await act(async () => {
      dndHandlers.onDragEnd?.({ active: { id: 'task-1' }, over: { id: 'DONE' } });
    });
    await user.click(screen.getByRole('button', { name: i18n.t('tasks.card.blockedMoveConfirm') }));
    await waitFor(() => expect(mockMove).toHaveBeenCalledWith('task-1', { status: 'DONE', position: 0 }));
  });

  it('ignores drag end when movement is disabled', async () => {
    const onTasksChange = jest.fn();
    renderWithProviders(
      <KanbanBoard
        projectId="project-1"
        tasks={[taskFixture()]}
        columns={[columnFixture(), columnFixture({ id: 'col-2', name: 'DONE', position: 1, color: '#16A34A', doneEquivalent: true })]}
        onTasksChange={onTasksChange}
        canMove={false}
      />,
      {
        route: '/workspaces/workspace-1/projects/project-1/board',
        path: '/workspaces/:workspaceId/projects/:projectId/board',
      },
    );

    await act(async () => {
      dndHandlers.onDragEnd?.({ active: { id: 'task-1' }, over: { id: 'DONE' } });
    });

    expect(mockMove).not.toHaveBeenCalled();
    expect(onTasksChange).not.toHaveBeenCalled();
  });
});
