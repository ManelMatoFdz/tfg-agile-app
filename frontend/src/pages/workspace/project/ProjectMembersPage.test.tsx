import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import ProjectMembersPage from './ProjectMembersPage';
import { renderWithProviders } from '../../../test/testUtils';
import { projectsApi } from '../../../api/projects';
import { useUserMap } from '../../../hooks/useUserMap';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useAuthStore } from '../../../store/authStore';
import { teamMemberFixture, userFixture, userSummaryFixture } from '../../../test/fixtures';
import type { Project, TeamMember } from '../../../types';
import i18n from '../../../i18n';

jest.mock('../../../api/projects', () => ({
  projectsApi: {
    getTeamMembers: jest.fn(),
    getById: jest.fn(),
  },
}));

jest.mock('../../../hooks/useUserMap', () => ({ useUserMap: jest.fn() }));
jest.mock('../../../hooks/useProjectMember', () => ({ useProjectMember: jest.fn() }));

const mockGetTeamMembers = jest.mocked(projectsApi.getTeamMembers);
const mockGetById = jest.mocked(projectsApi.getById);
const mockUseUserMap = jest.mocked(useUserMap);
const mockUseProjectMember = jest.mocked(useProjectMember);

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    workspaceId: 'workspace-1',
    teamId: 'team-1',
    name: 'Delivery Platform',
    description: 'Platform project',
    color: '#123456',
    visibility: 'WORKSPACE',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-04T08:00:00Z',
    ...overrides,
  };
}

function memberListFixture(): TeamMember[] {
  return [
    teamMemberFixture({ id: 'member-1', userId: 'user-1', role: 'ADMIN', scrumRole: 'PRODUCT_OWNER', lastActiveAt: '2026-09-04T09:55:00Z' }),
    teamMemberFixture({ id: 'member-2', userId: 'user-2', role: 'MEMBER', scrumRole: 'DEVELOPER', lastActiveAt: '2026-09-04T09:40:00Z' }),
    teamMemberFixture({ id: 'member-3', userId: 'user-3', role: 'MEMBER', scrumRole: 'SCRUM_MASTER', lastActiveAt: '2026-09-04T08:00:00Z' }),
    teamMemberFixture({ id: 'member-4', userId: 'user-4', role: 'MEMBER', scrumRole: 'DEVELOPER' }),
    teamMemberFixture({ id: 'member-5', userId: 'user-5', role: 'MEMBER', scrumRole: null }),
    teamMemberFixture({ id: 'member-6', userId: 'user-6', role: 'ADMIN', scrumRole: 'DEVELOPER' }),
    teamMemberFixture({ id: 'member-7', userId: 'user-7', role: 'MEMBER', scrumRole: 'DEVELOPER' }),
    teamMemberFixture({ id: 'member-8', userId: 'user-8', role: 'MEMBER', scrumRole: 'DEVELOPER' }),
    teamMemberFixture({ id: 'member-9', userId: 'user-9', role: 'MEMBER', scrumRole: 'DEVELOPER' }),
  ];
}

function userMapFixture() {
  return new Map([
    ['user-1', userSummaryFixture({ id: 'user-1', fullName: 'Ada Lovelace', username: 'ada' })],
    ['user-2', userSummaryFixture({ id: 'user-2', fullName: 'Grace Hopper', username: 'grace' })],
    ['user-3', userSummaryFixture({ id: 'user-3', fullName: 'Alan Turing', username: 'alan' })],
    ['user-4', userSummaryFixture({ id: 'user-4', fullName: 'Katherine Johnson', username: 'katherine' })],
    ['user-5', userSummaryFixture({ id: 'user-5', fullName: 'Margaret Hamilton', username: 'margaret' })],
    ['user-6', userSummaryFixture({ id: 'user-6', fullName: 'Donald Knuth', username: 'donald' })],
    ['user-7', userSummaryFixture({ id: 'user-7', fullName: 'Barbara Liskov', username: 'barbara' })],
    ['user-8', userSummaryFixture({ id: 'user-8', fullName: 'Linus Torvalds', username: 'linus' })],
    ['user-9', userSummaryFixture({ id: 'user-9', fullName: 'Sophie Wilson', username: 'sophie' })],
  ]);
}

describe('ProjectMembersPage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: userFixture({ id: 'user-1', username: 'ada', fullName: 'Ada Lovelace' }),
      setSession: jest.fn(),
      setTokens: jest.fn(),
      setUser: jest.fn(),
      logout: jest.fn(),
    });

    mockUseUserMap.mockReturnValue(userMapFixture());
    mockUseProjectMember.mockReturnValue({ isAdmin: true } as never);
    mockGetTeamMembers.mockResolvedValue({ data: memberListFixture() } as never);
    mockGetById.mockResolvedValue({ data: projectFixture() } as never);
  });

  it('renders the team, exposes manage link, filters results and paginates', async () => {
    const { user } = renderWithProviders(<ProjectMembersPage />, {
      route: '/workspaces/workspace-1/projects/project-1/members',
      path: '/workspaces/:workspaceId/projects/:projectId/members',
    });

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('common.you'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manage/i })).toHaveAttribute('href', '/workspaces/workspace-1/teams/team-1');
    expect(screen.getByText(i18n.t('projects.members.showing', { from: 1, to: 8, total: 9 }))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '2' }));
    expect(await screen.findByText('Sophie Wilson')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(i18n.t('projects.members.searchPlaceholder')), 'grace');
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByText('Sophie Wilson')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: i18n.t('common.clear') }));
    await user.selectOptions(
      screen.getByRole('combobox'),
      i18n.t('projects.members.scrumRoles.SCRUM_MASTER'),
    );
    expect(await screen.findByText('Alan Turing')).toBeInTheDocument();
    expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox'), i18n.t('teams.roles.ADMIN'));
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText('Alan Turing')).not.toBeInTheDocument();
  });

  it('shows the empty state without filters when there are no members', async () => {
    mockUseProjectMember.mockReturnValue({ isAdmin: false } as never);
    mockGetTeamMembers.mockResolvedValue({ data: [] } as never);

    renderWithProviders(<ProjectMembersPage />, {
      route: '/workspaces/workspace-1/projects/project-1/members',
      path: '/workspaces/:workspaceId/projects/:projectId/members',
    });

    expect(await screen.findByText(i18n.t('projects.members.noMembers'))).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(i18n.t('projects.members.searchPlaceholder'))).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /manage/i })).not.toBeInTheDocument();
  });

  it('shows an API error if the members request fails', async () => {
    mockGetTeamMembers.mockRejectedValueOnce({ response: { status: 500 } } as never);

    renderWithProviders(<ProjectMembersPage />, {
      route: '/workspaces/workspace-1/projects/project-1/members',
      path: '/workspaces/:workspaceId/projects/:projectId/members',
    });

    expect(await screen.findByText(i18n.t('errors.INTERNAL_ERROR'))).toBeInTheDocument();
    await waitFor(() => expect(mockGetById).toHaveBeenCalledWith('project-1'));
  });
});
