import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import SprintsPage from './SprintsPage';
import { renderWithProviders } from '../../../test/testUtils';
import { sprintsApi } from '../../../api/sprints';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useBoardColumns } from '../../../hooks/useBoardColumns';
import type { Sprint, Task } from '../../../types';
import i18n from '../../../i18n';

jest.mock('../../../api/sprints', () => ({
  sprintsApi: {
    listSprints: jest.fn(),
    getSprintTasks: jest.fn(),
    createSprint: jest.fn(),
    updateSprint: jest.fn(),
    activateSprint: jest.fn(),
    deleteSprint: jest.fn(),
    removeTaskFromSprint: jest.fn(),
  },
}));
jest.mock('../../../hooks/useProjectMember', () => ({ useProjectMember: jest.fn() }));
jest.mock('../../../hooks/useBoardColumns', () => ({ useBoardColumns: jest.fn() }));
jest.mock('../../../components/sprints/SnapshotModal', () => ({
  __esModule: true,
  default: ({ snapshot }: any) => <div>snapshot-{snapshot.title}</div>,
}));
jest.mock('../../../components/sprints/RetrospectiveModal', () => ({
  __esModule: true,
  default: ({ sprint, onSaved, onClose }: any) => (
    <div>
      <span>retro-{sprint.name}</span>
      <button onClick={() => onSaved({ ...sprint, reviewNotes: 'Saved retro' })}>Save retro</button>
      <button onClick={onClose}>Close retro</button>
    </div>
  ),
}));

const mockListSprints = jest.mocked(sprintsApi.listSprints);
const mockGetSprintTasks = jest.mocked(sprintsApi.getSprintTasks);
const mockCreateSprint = jest.mocked(sprintsApi.createSprint);
const mockUpdateSprint = jest.mocked(sprintsApi.updateSprint);
const mockActivateSprint = jest.mocked(sprintsApi.activateSprint);
const mockDeleteSprint = jest.mocked(sprintsApi.deleteSprint);
const mockUseProjectMember = jest.mocked(useProjectMember);
const mockUseBoardColumns = jest.mocked(useBoardColumns);

function sprintFixture(overrides: Partial<Sprint> = {}): Sprint {
  return {
    id: 'sprint-1',
    projectId: 'project-1',
    name: 'Sprint Alpha',
    goal: 'Ship onboarding',
    status: 'PLANNING',
    startDate: '2026-09-02',
    endDate: '2026-09-16',
    reviewNotes: null,
    closedTotalTasks: null,
    closedDoneTasks: null,
    closedIncompleteTasks: null,
    closedTotalStoryPoints: null,
    closedDoneStoryPoints: null,
    createdAt: '2026-09-01',
    updatedAt: '2026-09-03',
    ...overrides,
  };
}

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Implement API',
    description: null,
    status: 'DONE',
    priority: 'MEDIUM',
    type: 'TASK',
    reporterId: 'user-1',
    assigneeId: null,
    completedAt: null,
    storyPoints: 3,
    ready: false,
    position: 0,
    labels: [],
    subtaskCount: 0,
    completedSubtaskCount: 0,
    definitionOfDone: null,
    blockedByCount: 0,
    blocksCount: 0,
    gitEventCount: 0,
    createdAt: '2026-09-02',
    updatedAt: '2026-09-03',
    ...overrides,
  };
}

describe('SprintsPage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
    mockUseProjectMember.mockReturnValue({
      member: null,
      loading: false,
      isAdmin: true,
      isScrumMaster: true,
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
    mockUseBoardColumns.mockReturnValue([]);
    mockGetSprintTasks.mockResolvedValue([
      taskFixture(),
      taskFixture({ id: 'task-2', title: 'Add docs', status: 'TODO', storyPoints: 5 }),
    ] as never);
  });

  it('shows loading errors and the empty state', async () => {
    mockListSprints.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([] as never);

    const first = renderWithProviders(<SprintsPage />, {
      route: '/workspaces/workspace-1/projects/project-1/sprints',
      path: '/workspaces/:workspaceId/projects/:projectId/sprints',
    });

    expect(await screen.findByText(i18n.t('projects.sprints.loadError'))).toBeInTheDocument();
    first.unmount();

    renderWithProviders(<SprintsPage />, {
      route: '/workspaces/workspace-1/projects/project-1/sprints',
      path: '/workspaces/:workspaceId/projects/:projectId/sprints',
    });

    expect(await screen.findByText(i18n.t('projects.sprints.noSprints'))).toBeInTheDocument();
  });

  it('renders active, planned and completed sprints with progress and links', async () => {
    mockListSprints.mockResolvedValue([
      sprintFixture({ id: 'active-1', name: 'Sprint Active', status: 'ACTIVE', startDate: '2026-09-01', endDate: '2026-09-10' }),
      sprintFixture({ id: 'plan-1', name: 'Sprint Planned', status: 'PLANNING', startDate: '2026-09-03', endDate: '2026-09-15' }),
      sprintFixture({
        id: 'done-1',
        name: 'Sprint Done',
        status: 'COMPLETED',
        closedDoneTasks: 3,
        closedTotalTasks: 4,
        closedDoneStoryPoints: 13,
      }),
    ] as never);

    renderWithProviders(<SprintsPage />, {
      route: '/workspaces/workspace-1/projects/project-1/sprints',
      path: '/workspaces/:workspaceId/projects/:projectId/sprints',
    });

    expect(await screen.findByText('Sprint Active')).toBeInTheDocument();
    expect(await screen.findByText(i18n.t('projects.sprints.tasksDone', { done: 1, total: 2 }))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: i18n.t('projects.sprints.sprintBacklog.button') })).toHaveAttribute('href', '/workspaces/workspace-1/projects/project-1/sprints/active-1/backlog');
    expect(screen.getByText('Sprint Planned')).toBeInTheDocument();
    expect(screen.getByText('Sprint Done')).toBeInTheDocument();
  });

  it('creates a sprint, reports overlapping dates, updates it, activates it and deletes it', async () => {
    mockListSprints.mockResolvedValue([
      sprintFixture({ id: 'plan-1', name: 'Sprint Planned', status: 'PLANNING', startDate: '2026-09-03' }),
    ] as never);
    mockCreateSprint
      .mockRejectedValueOnce({ response: { data: { message: 'SPRINT_DATES_OVERLAP' } } })
      .mockResolvedValueOnce(sprintFixture({ id: 'plan-2', name: 'Sprint Beta' }) as never);
    mockUpdateSprint.mockResolvedValue(sprintFixture({ id: 'plan-1', name: 'Sprint Planned Updated' }) as never);
    mockActivateSprint.mockResolvedValue(sprintFixture({ id: 'plan-1', name: 'Sprint Planned Updated', status: 'ACTIVE' }) as never);
    mockDeleteSprint.mockResolvedValue({} as never);

    const { user } = renderWithProviders(<SprintsPage />, {
      route: '/workspaces/workspace-1/projects/project-1/sprints',
      path: '/workspaces/:workspaceId/projects/:projectId/sprints',
    });

    expect(await screen.findByText('Sprint Planned')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: i18n.t('projects.sprints.newSprint') }));
    await user.type(screen.getByPlaceholderText(i18n.t('projects.sprints.create.namePlaceholder')), 'Sprint Beta');
    const createDates = screen.getAllByDisplayValue('');
    await user.type(createDates[0], '2026-09-03');
    await user.type(createDates[1], '2026-09-17');
    await user.click(screen.getByRole('button', { name: i18n.t('projects.sprints.create.submit') }));
    expect(await screen.findByText(i18n.t('projects.sprints.create.overlapError'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: i18n.t('projects.sprints.create.submit') }));
    await waitFor(() => expect(mockCreateSprint).toHaveBeenLastCalledWith('project-1', {
      name: 'Sprint Beta',
      goal: undefined,
      startDate: '2026-09-03',
      endDate: '2026-09-17',
    }));
    expect(await screen.findByText('Sprint Beta')).toBeInTheDocument();

    await user.click(screen.getAllByTitle(i18n.t('common.edit'))[0]);
    const editInputs = screen.getAllByRole('textbox');
    await user.clear(editInputs[0]);
    await user.type(editInputs[0], 'Sprint Planned Updated');
    await user.click(screen.getByRole('button', { name: i18n.t('projects.sprints.edit.submit') }));
    await waitFor(() => expect(mockUpdateSprint).toHaveBeenCalledWith('plan-1', expect.objectContaining({
      name: 'Sprint Planned Updated',
    })));

    await user.click(screen.getAllByRole('button', { name: i18n.t('projects.sprints.activate') })[0]);
    expect(await screen.findByText(i18n.t('projects.sprints.activateConfirm.title'))).toBeInTheDocument();
    const activateButtons = screen.getAllByRole('button', { name: i18n.t('projects.sprints.activate') });
    await user.click(activateButtons[activateButtons.length - 1]);
    await waitFor(() => expect(mockActivateSprint).toHaveBeenCalled());

    await user.click(screen.getAllByTitle(i18n.t('common.delete'))[0]);
    await user.click(screen.getByRole('button', { name: i18n.t('common.delete') }));
    await waitFor(() => expect(mockDeleteSprint).toHaveBeenCalled());
  });

  it('opens the retrospective modal for completed sprints and saves the result', async () => {
    mockListSprints.mockResolvedValue([
      sprintFixture({
        id: 'done-1',
        name: 'Sprint Done',
        status: 'COMPLETED',
        closedDoneTasks: 3,
        closedTotalTasks: 4,
        closedDoneStoryPoints: 13,
      }),
    ] as never);

    const { user } = renderWithProviders(<SprintsPage />, {
      route: '/workspaces/workspace-1/projects/project-1/sprints',
      path: '/workspaces/:workspaceId/projects/:projectId/sprints',
    });

    expect(await screen.findByText('Sprint Done')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: i18n.t('projects.sprints.retrospective.createButton') }));
    expect(await screen.findByText('retro-Sprint Done')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save retro' }));
    await waitFor(() => expect(screen.queryByText('retro-Sprint Done')).not.toBeInTheDocument());
  });

  it('hides management actions when the user cannot manage sprints', async () => {
    mockUseProjectMember.mockReturnValue({
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
      canPlanSprint: true,
      canAddToActiveSprint: true,
      canManageSprint: false,
      canCreatePokerSession: false,
    });
    mockListSprints.mockResolvedValue([sprintFixture({ id: 'plan-1', name: 'Sprint Planned' })] as never);

    renderWithProviders(<SprintsPage />, {
      route: '/workspaces/workspace-1/projects/project-1/sprints',
      path: '/workspaces/:workspaceId/projects/:projectId/sprints',
    });

    expect(await screen.findByText('Sprint Planned')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('projects.sprints.newSprint') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('projects.sprints.activate') })).not.toBeInTheDocument();
  });
});
