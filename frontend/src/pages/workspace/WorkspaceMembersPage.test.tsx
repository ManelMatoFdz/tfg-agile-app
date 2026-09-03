import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import WorkspaceMembersPage from './WorkspaceMembersPage';
import { renderWithProviders } from '../../test/testUtils';
import { workspacesApi } from '../../api/workspaces';
import { teamsApi } from '../../api/teams';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import { useUserMap } from '../../hooks/useUserMap';
import { userFixture, userSummaryFixture, teamMemberFixture, workspaceMemberFixture } from '../../test/fixtures';
import type { Team, UserLookup, WorkspaceMember } from '../../types';
import i18n from '../../i18n';

jest.mock('../../api/workspaces', () => ({
  workspacesApi: {
    getMembers: jest.fn(),
    createInvitation: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
  },
}));
jest.mock('../../api/teams', () => ({
  teamsApi: {
    list: jest.fn(),
    getMembers: jest.fn(),
  },
}));
jest.mock('../../api/users', () => ({
  usersApi: {
    lookupByEmail: jest.fn(),
  },
}));
jest.mock('../../hooks/useUserMap', () => ({ useUserMap: jest.fn() }));

const mockGetMembers = jest.mocked(workspacesApi.getMembers);
const mockCreateInvitation = jest.mocked(workspacesApi.createInvitation);
const mockUpdateMemberRole = jest.mocked(workspacesApi.updateMemberRole);
const mockRemoveMember = jest.mocked(workspacesApi.removeMember);
const mockTeamList = jest.mocked(teamsApi.list);
const mockTeamMembers = jest.mocked(teamsApi.getMembers);
const mockLookupByEmail = jest.mocked(usersApi.lookupByEmail);
const mockUseUserMap = jest.mocked(useUserMap);

function teamFixture(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    workspaceId: 'workspace-1',
    name: 'Platform',
    description: 'Main team',
    color: '#2563EB',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

function lookupFixture(overrides: Partial<UserLookup> = {}): UserLookup {
  return {
    id: 'lookup-1',
    username: 'guest',
    fullName: 'Guest User',
    email: 'guest@example.com',
    avatarUrl: '/avatars/guest.png',
    ...overrides,
  };
}

describe('WorkspaceMembersPage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();
    await i18n.changeLanguage('en');
    useAuthStore.setState({ user: userFixture({ id: 'admin-1', fullName: 'Ada Lovelace' }) });
    mockTeamList.mockResolvedValue({ data: [
      teamFixture(),
      teamFixture({ id: 'team-2', name: 'QA', color: '#16A34A' }),
    ] } as never);
    mockTeamMembers.mockImplementation(async (teamId: string) => ({
      data: teamId === 'team-1'
        ? [teamMemberFixture({ userId: 'admin-1' }), teamMemberFixture({ id: 'tm-2', userId: 'user-2' })]
        : [teamMemberFixture({ id: 'tm-3', userId: 'user-3' })],
    }) as never);
    mockUseUserMap.mockReturnValue(new Map([
      ['admin-1', userSummaryFixture({ id: 'admin-1', fullName: 'Ada Lovelace', username: 'ada', email: 'ada@example.com' })],
      ['user-2', userSummaryFixture({ id: 'user-2', fullName: 'Grace Hopper', username: 'grace', email: 'grace@example.com' })],
      ['user-3', userSummaryFixture({ id: 'user-3', fullName: 'Linus Torvalds', username: 'linus', email: 'linus@example.com' })],
      ['user-4', userSummaryFixture({ id: 'user-4', fullName: 'Barbara Liskov', username: 'barbara', email: 'barbara@example.com' })],
      ['user-5', userSummaryFixture({ id: 'user-5', fullName: 'Ken Thompson', username: 'ken', email: 'ken@example.com' })],
      ['user-6', userSummaryFixture({ id: 'user-6', fullName: 'Margaret Hamilton', username: 'margaret', email: 'margaret@example.com' })],
    ]));
  });

  it('renders members, filters by search and team, and paginates results', async () => {
    const members: WorkspaceMember[] = [
      workspaceMemberFixture({ id: 'm1', userId: 'admin-1', role: 'ADMIN' }),
      workspaceMemberFixture({ id: 'm2', userId: 'user-2' }),
      workspaceMemberFixture({ id: 'm3', userId: 'user-3' }),
      workspaceMemberFixture({ id: 'm4', userId: 'user-4' }),
      workspaceMemberFixture({ id: 'm5', userId: 'user-5' }),
      workspaceMemberFixture({ id: 'm6', userId: 'user-6' }),
    ];
    mockGetMembers.mockResolvedValue({ data: members } as never);

    const { user } = renderWithProviders(<WorkspaceMembersPage />, {
      route: '/workspaces/workspace-1/members',
      path: '/workspaces/:workspaceId/members',
    });

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByText('Margaret Hamilton')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '2' }));
    expect(await screen.findByText('Margaret Hamilton')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(i18n.t('workspace.members.searchPlaceholder')), 'grace');
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(i18n.t('workspace.members.searchPlaceholder')));
    await user.selectOptions(screen.getByRole('combobox'), 'team-2');
    expect(await screen.findByText('Linus Torvalds')).toBeInTheDocument();
    expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: i18n.t('workspace.members.filter') }));
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
  });

  it('handles invite lookup errors and sends invitations successfully', async () => {
    mockGetMembers
      .mockResolvedValueOnce({ data: [workspaceMemberFixture({ id: 'm1', userId: 'admin-1', role: 'ADMIN' })] } as never)
      .mockResolvedValueOnce({ data: [
        workspaceMemberFixture({ id: 'm1', userId: 'admin-1', role: 'ADMIN' }),
        workspaceMemberFixture({ id: 'm2', userId: 'lookup-1' }),
      ] } as never);
    mockLookupByEmail
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ data: lookupFixture() } as never);
    mockCreateInvitation.mockResolvedValue({ data: { id: 'inv-1' } } as never);

    const { user } = renderWithProviders(<WorkspaceMembersPage />, {
      route: '/workspaces/workspace-1/members',
      path: '/workspaces/:workspaceId/members',
    });

    await screen.findByText('Ada Lovelace');
    await user.click(screen.getByRole('button', { name: i18n.t('workspace.members.inviteToWorkspace') }));

    const emailInput = screen.getByPlaceholderText(i18n.t('workspace.members.invite.emailPlaceholder'));
    await user.type(emailInput, 'missing@example.com');
    await user.click(screen.getByRole('button', { name: i18n.t('workspace.members.invite.searchUser') }));
    expect(await screen.findByText(i18n.t('workspace.members.invite.userNotFound'))).toBeInTheDocument();

    await user.clear(emailInput);
    await user.type(emailInput, 'guest@example.com');
    await user.click(screen.getByRole('button', { name: i18n.t('workspace.members.invite.searchUser') }));
    expect(await screen.findByText('Guest User')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: i18n.t('workspace.members.invite.sendInvitation') }));

    await waitFor(() => expect(mockCreateInvitation).toHaveBeenCalledWith('workspace-1', 'lookup-1', 'guest@example.com'));
    expect(await screen.findByText(i18n.t('workspace.members.invite.success'))).toBeInTheDocument();

    await waitFor(() => expect(mockGetMembers).toHaveBeenCalledTimes(2), { timeout: 2500 });
  });

  it('changes roles, removes members and surfaces action errors', async () => {
    mockGetMembers.mockResolvedValue({ data: [
      workspaceMemberFixture({ id: 'm1', userId: 'admin-1', role: 'ADMIN' }),
      workspaceMemberFixture({ id: 'm2', userId: 'user-2', role: 'MEMBER' }),
      workspaceMemberFixture({ id: 'm3', userId: 'user-3', role: 'MEMBER' }),
    ] } as never);
    mockUpdateMemberRole
      .mockResolvedValueOnce({ data: workspaceMemberFixture({ id: 'm2', userId: 'user-2', role: 'ADMIN' }) } as never)
      .mockRejectedValueOnce({ response: { data: { errorCode: 'CONFLICT' } } });
    mockRemoveMember
      .mockRejectedValueOnce(new Error('remove failed'))
      .mockResolvedValueOnce({} as never);

    const { user } = renderWithProviders(<WorkspaceMembersPage />, {
      route: '/workspaces/workspace-1/members',
      path: '/workspaces/:workspaceId/members',
    });

    expect(await screen.findByText(/Grace Hopper/)).toBeInTheDocument();

    await user.click(screen.getAllByTitle(i18n.t('workspace.members.promoteToAdmin'))[0]);
    expect(await screen.findByText(i18n.t('workspace.members.confirmRoleChange.title'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(mockUpdateMemberRole).toHaveBeenCalledWith('workspace-1', 'user-2', 'ADMIN'));
    expect((await screen.findAllByText(i18n.t('workspace.members.roles.ADMIN_FULL'))).length).toBeGreaterThan(1);

    await user.click(screen.getAllByTitle(i18n.t('workspace.members.demoteToMember'))[0]);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect((await screen.findAllByText(i18n.t('errors.CONFLICT'))).length).toBeGreaterThan(0);

    await user.click(screen.getAllByTitle(i18n.t('workspace.members.removeMember'))[0]);
    expect(await screen.findByText(i18n.t('workspace.members.confirmRemove.title'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: i18n.t('workspace.members.confirmRemove.confirm') }));
    expect((await screen.findAllByText(i18n.t('workspace.members.errors.remove'))).length).toBeGreaterThan(0);

    await user.click(screen.getAllByTitle(i18n.t('workspace.members.removeMember'))[1]);
    await user.click(screen.getByRole('button', { name: i18n.t('workspace.members.confirmRemove.confirm') }));
    await waitFor(() => expect(mockRemoveMember).toHaveBeenLastCalledWith('workspace-1', 'user-3'));
    expect(screen.queryByText('Linus Torvalds')).not.toBeInTheDocument();
  });

  it('hides admin actions for non-admin members and renders empty/error states', async () => {
    useAuthStore.setState({ user: userFixture({ id: 'user-2', fullName: 'Grace Hopper' }) });
    mockGetMembers.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce({ data: [] } as never);

    const first = renderWithProviders(<WorkspaceMembersPage />, {
      route: '/workspaces/workspace-1/members',
      path: '/workspaces/:workspaceId/members',
    });

    expect(await screen.findByText(i18n.t('errors.INTERNAL_ERROR'))).toBeInTheDocument();
    first.unmount();

    renderWithProviders(<WorkspaceMembersPage />, {
      route: '/workspaces/workspace-1/members',
      path: '/workspaces/:workspaceId/members',
    });

    expect(await screen.findByText(i18n.t('workspace.members.count', { count: 0 }))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('workspace.members.inviteToWorkspace') })).not.toBeInTheDocument();
  });
});
