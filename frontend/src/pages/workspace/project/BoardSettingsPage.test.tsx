import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import BoardSettingsPage from './BoardSettingsPage';
import { renderWithProviders } from '../../../test/testUtils';
import { boardColumnsApi } from '../../../api/boardColumns';
import { tasksApi } from '../../../api/tasks';
import { useProjectMember } from '../../../hooks/useProjectMember';
import type { BoardColumn, Task } from '../../../types';
import i18n from '../../../i18n';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
jest.mock('../../../api/boardColumns', () => ({ boardColumnsApi: { getColumns: jest.fn(), saveColumns: jest.fn() } }));
jest.mock('../../../api/tasks', () => ({ tasksApi: { getByProject: jest.fn() } }));
jest.mock('../../../hooks/useProjectMember', () => ({ useProjectMember: jest.fn() }));

const mockGetColumns = jest.mocked(boardColumnsApi.getColumns);
const mockSaveColumns = jest.mocked(boardColumnsApi.saveColumns);
const mockGetTasks = jest.mocked(tasksApi.getByProject);
const mockUseProjectMember = jest.mocked(useProjectMember);

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

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Task',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    type: 'TASK',
    reporterId: 'u1',
    assigneeId: null,
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
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('BoardSettingsPage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
    mockUseProjectMember.mockReturnValue({
      member: null,
      loading: false,
      isAdmin: true,
      isScrumMaster: false,
      isProductOwner: false,
      isDeveloper: false,
      canCreateTask: true,
      canEditBacklogTask: true,
      canEditSprintTask: true,
      canDeleteBacklogTask: true,
      canDeleteSprintTask: true,
      canMoveTask: true,
      canPlanSprint: true,
      canAddToActiveSprint: true,
      canManageSprint: true,
      canCreatePokerSession: true,
    });
    mockGetColumns.mockResolvedValue([
      columnFixture({ id: 'todo', name: 'TODO', position: 0 }),
      columnFixture({ id: 'done', name: 'DONE', position: 1, color: '#16A34A', doneEquivalent: true }),
    ]);
    mockGetTasks.mockResolvedValue([
      taskFixture({ id: 't1', status: 'TODO' }),
      taskFixture({ id: 't2', status: 'TODO' }),
      taskFixture({ id: 't3', status: 'DONE' }),
    ]);
  });

  it('validates empty names, missing done columns, duplicates and exceeded WIP', async () => {
    const { user } = renderWithProviders(<BoardSettingsPage />, {
      route: '/workspaces/workspace-1/projects/project-1/board-settings',
      path: '/workspaces/:workspaceId/projects/:projectId/board-settings',
    });

    expect(await screen.findByText(i18n.t('projects.boardSettings.title'))).toBeInTheDocument();

    const nameInputs = screen.getAllByRole('textbox');
    await user.clear(nameInputs[0]);
    await user.click(screen.getByRole('button', { name: i18n.t('projects.boardSettings.save') }));
    expect(await screen.findByText(i18n.t('projects.boardSettings.errorEmptyName'))).toBeInTheDocument();

    await user.type(nameInputs[0], 'TODO');
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(screen.getByRole('button', { name: i18n.t('projects.boardSettings.save') }));
    expect(await screen.findByText(i18n.t('projects.boardSettings.errorNoDone'))).toBeInTheDocument();

    await user.click(checkboxes[1]);
    await user.clear(nameInputs[1]);
    await user.type(nameInputs[1], 'TODO');
    await user.click(screen.getByRole('button', { name: i18n.t('projects.boardSettings.save') }));
    expect(await screen.findByText(i18n.t('projects.boardSettings.errorDuplicateName'))).toBeInTheDocument();

    await user.clear(nameInputs[1]);
    await user.type(nameInputs[1], 'DONE');
    const wipInputs = screen.getAllByRole('spinbutton');
    await user.clear(wipInputs[0]);
    await user.type(wipInputs[0], '1');
    await user.click(screen.getByRole('button', { name: i18n.t('projects.boardSettings.save') }));
    expect(await screen.findByText(i18n.t('projects.boardSettings.errorWipExceeded', {
      column: 'TODO',
      current: 2,
      limit: 1,
    }))).toBeInTheDocument();
  });

  it('adds a column, reorders it and saves trimmed names with positions', async () => {
    mockSaveColumns.mockResolvedValue([
      columnFixture({ id: 'todo', name: 'TODO', position: 0 }),
      columnFixture({ id: 'review', name: 'Review', position: 1, color: '#3B82F6' }),
      columnFixture({ id: 'done', name: 'DONE', position: 2, color: '#16A34A', doneEquivalent: true }),
    ]);

    const { user } = renderWithProviders(<BoardSettingsPage />, {
      route: '/workspaces/workspace-1/projects/project-1/board-settings',
      path: '/workspaces/:workspaceId/projects/:projectId/board-settings',
    });

    await screen.findByText(i18n.t('projects.boardSettings.title'));
    await user.click(screen.getByRole('button', { name: i18n.t('projects.boardSettings.addColumn') }));

    const nameInputs = screen.getAllByRole('textbox');
    await user.type(nameInputs[2], '  Review  ');

    const upButtons = screen.getAllByRole('button', { name: '▲' });
    await user.click(upButtons[upButtons.length - 1]);
    await user.click(screen.getByRole('button', { name: i18n.t('projects.boardSettings.save') }));

    await waitFor(() => expect(mockSaveColumns).toHaveBeenCalledWith('project-1', [
      expect.objectContaining({ name: 'TODO', position: 0 }),
      expect.objectContaining({ name: 'Review', position: 1 }),
      expect.objectContaining({ name: 'DONE', position: 2 }),
    ]));
    expect(await screen.findByRole('button', { name: i18n.t('projects.boardSettings.saved') })).toBeInTheDocument();
  });

  it('parses backend WIP errors and navigates back to the board', async () => {
    mockSaveColumns.mockRejectedValue({ response: { data: { message: 'WIP_LIMIT_EXCEEDED:IN_PROGRESS:3:2' } } });

    const { user, container } = renderWithProviders(<BoardSettingsPage />, {
      route: '/workspaces/workspace-1/projects/project-1/board-settings',
      path: '/workspaces/:workspaceId/projects/:projectId/board-settings',
    });

    await screen.findByText(i18n.t('projects.boardSettings.title'));
    await user.click(screen.getByRole('button', { name: i18n.t('projects.boardSettings.save') }));
    expect(await screen.findByText(i18n.t('projects.boardSettings.errorWipExceeded', {
      column: 'IN PROGRESS',
      current: '3',
      limit: '2',
    }))).toBeInTheDocument();

    await user.click(container.querySelectorAll('button')[1] as HTMLElement);
    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/workspace-1/projects/project-1/board');
  });
});
