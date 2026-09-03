import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import WorkspaceDashboardPage from './WorkspaceDashboardPage';
import { renderWithProviders } from '../../test/testUtils';
import { useAuthStore } from '../../store/authStore';
import { projectsApi } from '../../api/projects';
import { categoriesApi } from '../../api/categories';
import { teamsApi } from '../../api/teams';
import { useUserMap } from '../../hooks/useUserMap';
import { userFixture, userSummaryFixture, teamMemberFixture } from '../../test/fixtures';
import type { Category, Project, Team } from '../../types';
import i18n from '../../i18n';

jest.mock('../../api/projects', () => ({ projectsApi: { list: jest.fn(), create: jest.fn(), getTeamMembers: jest.fn() } }));
jest.mock('../../api/categories', () => ({ categoriesApi: { list: jest.fn(), create: jest.fn() } }));
jest.mock('../../api/teams', () => ({ teamsApi: { list: jest.fn() } }));
jest.mock('../../hooks/useUserMap', () => ({ useUserMap: jest.fn() }));

const mockProjectList = jest.mocked(projectsApi.list);
const mockProjectCreate = jest.mocked(projectsApi.create);
const mockGetTeamMembers = jest.mocked(projectsApi.getTeamMembers);
const mockCategoryList = jest.mocked(categoriesApi.list);
const mockCategoryCreate = jest.mocked(categoriesApi.create);
const mockTeamList = jest.mocked(teamsApi.list);
const mockUseUserMap = jest.mocked(useUserMap);

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    workspaceId: 'workspace-1',
    teamId: 'team-1',
    categoryId: 'cat-1',
    name: 'Platform',
    description: 'Main platform work',
    color: '#6366f1',
    visibility: 'PRIVATE',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-10T11:58:00Z',
    ...overrides,
  };
}

function categoryFixture(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    workspaceId: 'workspace-1',
    name: 'Product',
    color: '#f97316',
    position: 0,
    createdAt: '2026-01-01',
    ...overrides,
  };
}

function teamFixture(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    workspaceId: 'workspace-1',
    name: 'Backend team',
    color: '#2563EB',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

describe('WorkspaceDashboardPage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
    useAuthStore.setState({ user: userFixture({ id: 'current-user', fullName: 'Ada Lovelace' }) });
    mockUseUserMap.mockReturnValue(new Map([
      ['current-user', userSummaryFixture({ id: 'current-user', fullName: 'Ada Lovelace' })],
      ['user-2', userSummaryFixture({ id: 'user-2', fullName: 'Grace Hopper' })],
    ]));
    mockTeamList.mockResolvedValue({ data: [teamFixture()] } as never);
  });

  it('renders grouped projects, supports category filters and collapses groups', async () => {
    mockProjectList.mockResolvedValue({ data: [
      projectFixture({ id: 'project-1', name: 'Platform', categoryId: 'cat-1' }),
      projectFixture({ id: 'project-2', name: 'Portal', categoryId: null, visibility: 'WORKSPACE', updatedAt: '2026-01-10T09:00:00Z' }),
    ] } as never);
    mockCategoryList.mockResolvedValue({ data: [categoryFixture()] } as never);
    mockGetTeamMembers
      .mockResolvedValueOnce({ data: [teamMemberFixture({ userId: 'current-user', role: 'ADMIN' }), teamMemberFixture({ id: 'm2', userId: 'user-2' })] } as never)
      .mockResolvedValueOnce({ data: [teamMemberFixture({ id: 'm3', userId: 'user-2' })] } as never);

    const { user } = renderWithProviders(<WorkspaceDashboardPage />, {
      route: '/workspaces/workspace-1',
      path: '/workspaces/:workspaceId',
    });

    expect(await screen.findByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Portal')).toBeInTheDocument();
    expect(screen.getAllByText('Product').length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('workspace.dashboard.uncategorized')).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('workspace.dashboard.roles.ADMIN'))).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Product' })[0]);
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.queryByText('Portal')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Product/ })[1]);
    expect(screen.queryByText('Platform')).not.toBeInTheDocument();
  });

  it('creates a new project from the modal and resets the modal state on close', async () => {
    mockProjectList.mockResolvedValue({ data: [] } as never);
    mockCategoryList.mockResolvedValue({ data: [categoryFixture()] } as never);
    mockProjectCreate.mockResolvedValue({ data: projectFixture({ id: 'project-new', name: 'Analytics', visibility: 'WORKSPACE' }) } as never);

    const { user } = renderWithProviders(<WorkspaceDashboardPage />, {
      route: '/workspaces/workspace-1',
      path: '/workspaces/:workspaceId',
    });

    expect(await screen.findByText(i18n.t('workspace.dashboard.noProjects'))).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: i18n.t('workspace.dashboard.newProject') })[0]);

    await user.type(screen.getByPlaceholderText(i18n.t('workspace.dashboard.modal.namePlaceholder')), 'Analytics');
    await user.type(screen.getByPlaceholderText(i18n.t('workspace.dashboard.modal.descriptionPlaceholder')), 'Tracking and dashboards');
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'team-1');
    await user.selectOptions(selects[1], 'cat-1');
    await user.click(screen.getByRole('button', { name: /Whole workspace/i }));
    await user.click(screen.getByRole('button', { name: i18n.t('workspace.dashboard.modal.submit') }));

    await waitFor(() => expect(mockProjectCreate).toHaveBeenCalledWith('workspace-1', {
      name: 'Analytics',
      description: 'Tracking and dashboards',
      categoryId: 'cat-1',
      teamId: 'team-1',
      color: '#6366f1',
      visibility: 'WORKSPACE',
    }));
    expect(await screen.findByText('Analytics')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: i18n.t('workspace.dashboard.newProject') })[0]);
    await user.type(screen.getByPlaceholderText(i18n.t('workspace.dashboard.modal.namePlaceholder')), 'Temporary');
    await user.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));
    await user.click(screen.getAllByRole('button', { name: i18n.t('workspace.dashboard.newProject') })[0]);
    expect(screen.getByPlaceholderText(i18n.t('workspace.dashboard.modal.namePlaceholder'))).toHaveValue('');
  });

  it('creates an inline category and surfaces category creation errors', async () => {
    mockProjectList.mockResolvedValue({ data: [] } as never);
    mockCategoryList.mockResolvedValue({ data: [] } as never);
    mockCategoryCreate
      .mockRejectedValueOnce({ response: { data: { errorCode: 'CONFLICT' } } })
      .mockResolvedValueOnce({ data: categoryFixture({ id: 'cat-2', name: 'Architecture', color: '#22c55e' }) } as never);

    const { user } = renderWithProviders(<WorkspaceDashboardPage />, {
      route: '/workspaces/workspace-1',
      path: '/workspaces/:workspaceId',
    });

    await screen.findByText(i18n.t('workspace.dashboard.noProjects'));
    await user.click(screen.getAllByRole('button', { name: i18n.t('workspace.dashboard.newProject') })[0]);
    await user.click(screen.getByRole('button', { name: /New category/ }));

    const inlineInput = screen.getByPlaceholderText(i18n.t('workspace.settings.categories.modal.namePlaceholder'));
    await user.type(inlineInput, 'Architecture');
    await user.click(screen.getByRole('button', { name: i18n.t('workspace.dashboard.modal.createCategory') }));
    expect(await screen.findByText(i18n.t('errors.CONFLICT'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: i18n.t('workspace.dashboard.modal.createCategory') }));
    await waitFor(() => expect(mockCategoryCreate).toHaveBeenLastCalledWith('workspace-1', {
      name: 'Architecture',
      color: '#f97316',
      position: 0,
    }));
    expect(screen.getByRole('option', { name: 'Architecture' })).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')[1]).toHaveValue('cat-2');
  });
});
