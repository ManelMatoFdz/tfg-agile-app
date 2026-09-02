import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { projectsApi } from '../api/projects';
import { usersApi } from '../api/users';
import type { Notification } from '../types';
import { createTestQueryClient } from '../test/testUtils';
import { teamMemberFixture, userSummaryFixture } from '../test/fixtures';
import { useNotificationActors } from './useNotificationActors';
import { useProjectMembers } from './useProjectMembers';
import { useUserMap } from './useUserMap';

jest.mock('../api/projects', () => ({ projectsApi: { getTeamMembers: jest.fn() } }));
jest.mock('../api/users', () => ({ usersApi: { batch: jest.fn() } }));

const getTeamMembers = jest.mocked(projectsApi.getTeamMembers);
const batchUsers = jest.mocked(usersApi.batch);
const response = <T,>(data: T) => ({ data }) as never;

describe('useProjectMembers', () => {
  beforeEach(() => jest.resetAllMocks());

  it('loads members and indexes user summaries', async () => {
    const member = teamMemberFixture();
    const summary = userSummaryFixture();
    getTeamMembers.mockResolvedValue(response([member]));
    batchUsers.mockResolvedValue(response([summary]));
    const { result } = renderHook(() => useProjectMembers('p1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([member]);
    expect(result.current.userMap).toEqual({ [summary.id]: summary });
    expect(batchUsers).toHaveBeenCalledWith([member.userId]);
  });

  it('skips the user lookup for an empty team', async () => {
    getTeamMembers.mockResolvedValue(response([]));
    const { result } = renderHook(() => useProjectMembers('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(batchUsers).not.toHaveBeenCalled();
  });

  it('returns empty state without a project or after an error', async () => {
    const absent = renderHook(() => useProjectMembers(undefined));
    await waitFor(() => expect(absent.result.current.loading).toBe(false));
    expect(getTeamMembers).not.toHaveBeenCalled();
    absent.unmount();

    getTeamMembers.mockRejectedValue(new Error('network'));
    const failed = renderHook(() => useProjectMembers('p1'));
    await waitFor(() => expect(failed.result.current.loading).toBe(false));
    expect(failed.result.current).toMatchObject({ members: [], userMap: {} });
  });
});

describe('useUserMap', () => {
  beforeEach(() => jest.resetAllMocks());

  it('resolves ids and refreshes when their joined value changes', async () => {
    batchUsers.mockResolvedValue(response([userSummaryFixture()]));
    const { result, rerender } = renderHook(({ ids }) => useUserMap(ids), { initialProps: { ids: ['user-1'] } });
    await waitFor(() => expect(result.current.get('user-1')).toBeDefined());
    rerender({ ids: ['user-1', 'user-2'] });
    await waitFor(() => expect(batchUsers).toHaveBeenCalledTimes(2));
  });

  it('does nothing for empty ids and keeps fallback state after failure', async () => {
    const empty = renderHook(() => useUserMap([]));
    expect(empty.result.current.size).toBe(0);
    empty.unmount();
    batchUsers.mockRejectedValue(new Error('network'));
    const failed = renderHook(() => useUserMap(['u1']));
    await waitFor(() => expect(batchUsers).toHaveBeenCalled());
    expect(failed.result.current.size).toBe(0);
  });
});

describe('useNotificationActors', () => {
  beforeEach(() => jest.resetAllMocks());

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
  }

  const notification = (actorUserId?: string): Notification => ({
    id: Math.random().toString(), userId: 'recipient', title: '', message: '', type: 'GENERAL', read: false,
    createdAt: '2026-01-01', data: actorUserId ? JSON.stringify({ actorUserId }) : undefined,
  });

  it('deduplicates, sorts and indexes notification actors', async () => {
    const a = userSummaryFixture({ id: 'a' });
    const b = userSummaryFixture({ id: 'b' });
    batchUsers.mockResolvedValue(response([a, b]));
    const { result } = renderHook(() => useNotificationActors([notification('b'), notification('a'), notification('b')]), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ a, b }));
    expect(batchUsers).toHaveBeenCalledWith(['a', 'b']);
  });

  it('does not query when notifications have no actor', async () => {
    const { result } = renderHook(() => useNotificationActors([notification()]), { wrapper });
    await act(async () => Promise.resolve());
    expect(result.current).toEqual({});
    expect(batchUsers).not.toHaveBeenCalled();
  });
});
