import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import TeamsPage from './TeamsPage';
import { renderWithProviders } from '../../test/testUtils';
import { teamsApi } from '../../api/teams';
import { useUserMap } from '../../hooks/useUserMap';
import { userSummaryFixture, teamMemberFixture } from '../../test/fixtures';
import type { Team } from '../../types';
import i18n from '../../i18n';

jest.mock('../../api/teams', () => ({
  teamsApi: {
    list: jest.fn(),
    getMembers: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('../../hooks/useUserMap', () => ({ useUserMap: jest.fn() }));

const mockTeamList = jest.mocked(teamsApi.list);
const mockGetMembers = jest.mocked(teamsApi.getMembers);
const mockCreate = jest.mocked(teamsApi.create);
const mockUseUserMap = jest.mocked(useUserMap);

function teamFixture(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    workspaceId: 'workspace-1',
    name: 'Backend',
    description: 'API team',
    color: '#2563EB',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

describe('TeamsPage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
    mockUseUserMap.mockReturnValue(new Map([
      ['user-1', userSummaryFixture({ id: 'user-1', username: 'ada', fullName: 'Ada Lovelace' })],
      ['user-2', userSummaryFixture({ id: 'user-2', username: 'grace', fullName: 'Grace Hopper' })],
      ['user-3', userSummaryFixture({ id: 'user-3', username: 'linus', fullName: 'Linus Torvalds' })],
      ['user-4', userSummaryFixture({ id: 'user-4', username: 'barbara', fullName: 'Barbara Liskov' })],
      ['user-5', userSummaryFixture({ id: 'user-5', username: 'ken', fullName: 'Ken Thompson' })],
    ]));
    mockGetMembers.mockImplementation(async (teamId: string) => ({
      data: teamId === 'team-1'
        ? [teamMemberFixture({ userId: 'user-1' }), teamMemberFixture({ id: 'tm-2', userId: 'user-2' })]
        : [
            teamMemberFixture({ id: 'tm-3', userId: 'user-1' }),
            teamMemberFixture({ id: 'tm-4', userId: 'user-2' }),
            teamMemberFixture({ id: 'tm-5', userId: 'user-3' }),
            teamMemberFixture({ id: 'tm-6', userId: 'user-4' }),
            teamMemberFixture({ id: 'tm-7', userId: 'user-5' }),
          ],
    }) as never);
  });

  it('renders teams, pagination and resolved member counts', async () => {
    mockTeamList.mockResolvedValue({ data: [
      teamFixture(),
      teamFixture({ id: 'team-2', name: 'Frontend', color: '#16A34A' }),
      teamFixture({ id: 'team-3', name: 'QA', color: '#EAB308' }),
      teamFixture({ id: 'team-4', name: 'DevOps', color: '#EC4899' }),
      teamFixture({ id: 'team-5', name: 'Product', color: '#8B5CF6' }),
      teamFixture({ id: 'team-6', name: 'Support', color: '#F97316' }),
    ] } as never);

    const { user } = renderWithProviders(<TeamsPage />, {
      route: '/workspaces/workspace-1/teams',
      path: '/workspaces/:workspaceId/teams',
    });

    expect(await screen.findByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.queryByText('Support')).not.toBeInTheDocument();
    expect(screen.getAllByText('2')[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: i18n.t('teams.manage') })[0]).toHaveAttribute('href', '/workspaces/workspace-1/teams/team-1');

    await user.click(screen.getByRole('button', { name: i18n.t('common.next') }));
    expect(await screen.findByText('Support')).toBeInTheDocument();
  });

  it('creates a team from the empty state and resets modal fields when cancelled', async () => {
    mockTeamList.mockResolvedValue({ data: [] } as never);
    mockCreate.mockResolvedValue({ data: teamFixture({ id: 'team-new', name: 'Architecture', color: '#d946ef' }) } as never);

    const { user, container } = renderWithProviders(<TeamsPage />, {
      route: '/workspaces/workspace-1/teams',
      path: '/workspaces/:workspaceId/teams',
    });

    expect(await screen.findByText(i18n.t('teams.noTeams'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: i18n.t('teams.newTeam') }));

    await user.type(screen.getByPlaceholderText(i18n.t('teams.form.namePlaceholder')), 'Architecture');
    await user.type(screen.getByPlaceholderText(i18n.t('teams.form.descriptionPlaceholder')), 'Platform standards');
    const colorButtons = container.querySelectorAll('button[type="button"][style*="background: rgb"]');
    await user.click(colorButtons[1] as HTMLElement);
    await user.click(screen.getByRole('button', { name: i18n.t('teams.form.submit') }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('workspace-1', {
      name: 'Architecture',
      description: 'Platform standards',
      color: '#8b5cf6',
    }));
    expect(await screen.findByText('Architecture')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: i18n.t('teams.ctaButton') }));
    await user.type(screen.getByPlaceholderText(i18n.t('teams.form.namePlaceholder')), 'Temporary');
    await user.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));
    await user.click(screen.getByRole('button', { name: i18n.t('teams.ctaButton') }));
    expect(screen.getByPlaceholderText(i18n.t('teams.form.namePlaceholder'))).toHaveValue('');
  });

  it('surfaces list and create errors', async () => {
    mockTeamList.mockRejectedValueOnce({ response: { status: 403 } }).mockResolvedValueOnce({ data: [] } as never);
    mockCreate.mockRejectedValueOnce({ response: { status: 409 } });

    const failing = renderWithProviders(<TeamsPage />, {
      route: '/workspaces/workspace-1/teams',
      path: '/workspaces/:workspaceId/teams',
    });
    expect(await screen.findByText(i18n.t('errors.FORBIDDEN'))).toBeInTheDocument();
    failing.unmount();

    const { user } = renderWithProviders(<TeamsPage />, {
      route: '/workspaces/workspace-1/teams',
      path: '/workspaces/:workspaceId/teams',
    });
    await screen.findByText(i18n.t('teams.noTeams'));
    await user.click(screen.getByRole('button', { name: i18n.t('teams.newTeam') }));
    await user.type(screen.getByPlaceholderText(i18n.t('teams.form.namePlaceholder')), 'Conflicting');
    await user.click(screen.getByRole('button', { name: i18n.t('teams.form.submit') }));
    expect(await screen.findByText(i18n.t('errors.CONFLICT'))).toBeInTheDocument();
  });
});
