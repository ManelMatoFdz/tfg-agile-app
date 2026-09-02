import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useParams } from 'react-router-dom';
import type { AxiosResponse } from 'axios';
import { projectsApi } from '../api/projects';
import { workspacesApi } from '../api/workspaces';
import { useAuthStore } from '../store/authStore';
import type { TeamMember, User, WorkspaceMember } from '../types';
import { useProjectMember, type ProjectMemberPermissions } from './useProjectMember';

jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
}));

jest.mock('../api/projects', () => ({
  projectsApi: {
    getTeamMembers: jest.fn(),
  },
}));

jest.mock('../api/workspaces', () => ({
  workspacesApi: {
    getMembers: jest.fn(),
  },
}));

const mockedUseParams = jest.mocked(useParams);
const mockedGetTeamMembers = jest.mocked(projectsApi.getTeamMembers);
const mockedGetWorkspaceMembers = jest.mocked(workspacesApi.getMembers);

const currentUser: User = {
  id: 'user-1',
  username: 'tester',
  email: 'tester@example.com',
};

const allPermissions = {
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
} satisfies Omit<ProjectMemberPermissions, 'member' | 'loading'>;

const noPermissions = {
  isAdmin: false,
  isScrumMaster: false,
  isProductOwner: false,
  isDeveloper: false,
  canCreateTask: false,
  canEditBacklogTask: false,
  canEditSprintTask: false,
  canDeleteBacklogTask: false,
  canDeleteSprintTask: false,
  canMoveTask: false,
  canPlanSprint: false,
  canAddToActiveSprint: false,
  canManageSprint: false,
  canCreatePokerSession: false,
} satisfies Omit<ProjectMemberPermissions, 'member' | 'loading'>;

function teamMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'team-member-1',
    userId: currentUser.id,
    role: 'MEMBER',
    scrumRole: 'DEVELOPER',
    joinedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function workspaceMember(overrides: Partial<WorkspaceMember> = {}): WorkspaceMember {
  return {
    id: 'workspace-member-1',
    workspaceId: 'workspace-1',
    userId: currentUser.id,
    role: 'MEMBER',
    joinedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function response<T>(data: T): AxiosResponse<T> {
  return { data } as AxiosResponse<T>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function renderLoaded(...projectIds: [] | [string | undefined]) {
  const projectId = projectIds.length === 0 ? 'project-1' : projectIds[0];
  const rendered = renderHook(() => useProjectMember(projectId));
  await waitFor(() => expect(rendered.result.current.loading).toBe(false));
  return rendered;
}

describe('useProjectMember', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseParams.mockReturnValue({ workspaceId: 'workspace-1' });
    mockedGetTeamMembers.mockResolvedValue(response([]));
    mockedGetWorkspaceMembers.mockResolvedValue(response([]));
    useAuthStore.setState({ user: currentUser });
  });

  it.each([
    ['project id', undefined, currentUser],
    ['authenticated user', 'project-1', null],
  ])('does not fetch permissions without a %s', async (_label, projectId, user) => {
    useAuthStore.setState({ user });

    const { result } = await renderLoaded(projectId);

    expect(mockedGetTeamMembers).not.toHaveBeenCalled();
    expect(mockedGetWorkspaceMembers).not.toHaveBeenCalled();
    expect(result.current).toEqual({ member: null, loading: false, ...noPermissions });
  });

  it('keeps loading enabled until both permission requests finish', async () => {
    const teamRequest = deferred<AxiosResponse<TeamMember[]>>();
    const workspaceRequest = deferred<AxiosResponse<WorkspaceMember[]>>();
    mockedGetTeamMembers.mockReturnValue(teamRequest.promise);
    mockedGetWorkspaceMembers.mockReturnValue(workspaceRequest.promise);

    const { result } = renderHook(() => useProjectMember('project-1'));
    expect(result.current.loading).toBe(true);

    await act(async () => {
      teamRequest.resolve(response([teamMember()]));
    });
    await waitFor(() => expect(mockedGetWorkspaceMembers).toHaveBeenCalled());
    expect(result.current.loading).toBe(true);

    await act(async () => {
      workspaceRequest.resolve(response([workspaceMember()]));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it.each([
    {
      name: 'team administrator',
      members: [teamMember({ role: 'ADMIN', scrumRole: null })],
      workspaceMembers: [workspaceMember()],
      expected: allPermissions,
    },
    {
      name: 'workspace administrator outside the team',
      members: [],
      workspaceMembers: [workspaceMember({ role: 'ADMIN' })],
      expected: allPermissions,
    },
    {
      name: 'product owner',
      members: [teamMember({ scrumRole: 'PRODUCT_OWNER' })],
      workspaceMembers: [workspaceMember()],
      expected: {
        ...noPermissions,
        isProductOwner: true,
        canCreateTask: true,
        canEditBacklogTask: true,
        canDeleteBacklogTask: true,
        canPlanSprint: true,
        canCreatePokerSession: true,
      },
    },
    {
      name: 'scrum master',
      members: [teamMember({ scrumRole: 'SCRUM_MASTER' })],
      workspaceMembers: [workspaceMember()],
      expected: {
        ...noPermissions,
        isScrumMaster: true,
        canManageSprint: true,
        canCreatePokerSession: true,
      },
    },
    {
      name: 'developer',
      members: [teamMember()],
      workspaceMembers: [workspaceMember()],
      expected: {
        ...noPermissions,
        isDeveloper: true,
        canEditSprintTask: true,
        canDeleteSprintTask: true,
        canMoveTask: true,
        canPlanSprint: true,
        canAddToActiveSprint: true,
      },
    },
    {
      name: 'member without a scrum role',
      members: [teamMember({ scrumRole: null })],
      workspaceMembers: [workspaceMember()],
      expected: {
        ...noPermissions,
        isDeveloper: true,
        canEditSprintTask: true,
        canDeleteSprintTask: true,
        canMoveTask: true,
        canPlanSprint: true,
        canAddToActiveSprint: true,
      },
    },
    {
      name: 'non-member',
      members: [],
      workspaceMembers: [],
      expected: noPermissions,
    },
  ])('returns the expected permissions for a $name', async ({ members, workspaceMembers, expected }) => {
    mockedGetTeamMembers.mockResolvedValue(response(members));
    mockedGetWorkspaceMembers.mockResolvedValue(response(workspaceMembers));

    const { result } = await renderLoaded();

    expect(mockedGetTeamMembers).toHaveBeenCalledWith('project-1');
    expect(mockedGetWorkspaceMembers).toHaveBeenCalledWith('workspace-1');
    expect(result.current.member).toBe(members[0] ?? null);
    expect(result.current).toMatchObject(expected);
  });

  it('skips the workspace request when the route has no workspace id', async () => {
    const member = teamMember({ scrumRole: 'PRODUCT_OWNER' });
    mockedUseParams.mockReturnValue({});
    mockedGetTeamMembers.mockResolvedValue(response([member]));

    const { result } = await renderLoaded();

    expect(mockedGetWorkspaceMembers).not.toHaveBeenCalled();
    expect(result.current.member).toBe(member);
    expect(result.current.isProductOwner).toBe(true);
  });

  it.each(['team', 'workspace'])('returns a safe state when the %s request fails', async (request) => {
    if (request === 'team') {
      mockedGetTeamMembers.mockRejectedValue(new Error('team request failed'));
    } else {
      mockedGetTeamMembers.mockResolvedValue(response([teamMember({ role: 'ADMIN' })]));
      mockedGetWorkspaceMembers.mockRejectedValue(new Error('workspace request failed'));
    }

    const { result } = await renderLoaded();

    expect(result.current).toEqual({ member: null, loading: false, ...noPermissions });
  });

  it.failing('clears previous permissions when the project id disappears', async () => {
    mockedGetTeamMembers.mockResolvedValue(response([teamMember({ role: 'ADMIN' })]));
    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string | undefined }) => useProjectMember(projectId),
      { initialProps: { projectId: 'project-1' } as { projectId: string | undefined } },
    );
    await waitFor(() => expect(result.current.isAdmin).toBe(true));

    rerender({ projectId: undefined });

    expect(result.current).toEqual({ member: null, loading: false, ...noPermissions });
  });

  it.failing('clears previous permissions when the authenticated user disappears', async () => {
    mockedGetTeamMembers.mockResolvedValue(response([teamMember({ role: 'ADMIN' })]));
    const { result } = await renderLoaded();
    expect(result.current.isAdmin).toBe(true);

    act(() => useAuthStore.setState({ user: null }));

    expect(result.current).toEqual({ member: null, loading: false, ...noPermissions });
  });

  it.failing('clears old permissions while another project is loading', async () => {
    mockedGetTeamMembers.mockResolvedValueOnce(response([teamMember({ role: 'ADMIN' })]));
    const nextTeamRequest = deferred<AxiosResponse<TeamMember[]>>();
    mockedGetTeamMembers.mockReturnValueOnce(nextTeamRequest.promise);
    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string }) => useProjectMember(projectId),
      { initialProps: { projectId: 'project-1' } },
    );
    await waitFor(() => expect(result.current.isAdmin).toBe(true));

    rerender({ projectId: 'project-2' });

    expect(result.current).toEqual({ member: null, loading: true, ...noPermissions });
    await act(async () => {
      nextTeamRequest.resolve(response([]));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it.failing('ignores a stale response after switching projects', async () => {
    const oldRequest = deferred<AxiosResponse<TeamMember[]>>();
    mockedGetTeamMembers
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce(response([teamMember({ scrumRole: 'PRODUCT_OWNER' })]));
    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string }) => useProjectMember(projectId),
      { initialProps: { projectId: 'project-1' } },
    );

    rerender({ projectId: 'project-2' });
    await waitFor(() => expect(result.current.isProductOwner).toBe(true));

    await act(async () => {
      oldRequest.resolve(response([teamMember({ role: 'ADMIN' })]));
    });

    expect(result.current.isProductOwner).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });
});
