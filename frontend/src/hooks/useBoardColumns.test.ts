import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { boardColumnsApi } from '../api/boardColumns';
import type { BoardColumn } from '../types';
import { getStatusColor, getStatusLabel, useBoardColumns } from './useBoardColumns';

jest.mock('../api/boardColumns', () => ({ boardColumnsApi: { getColumns: jest.fn() } }));

const getColumns = jest.mocked(boardColumnsApi.getColumns);
const columns = [
  { id: 'c1', projectId: 'p1', name: 'IN_PROGRESS', color: '#123456', position: 1 },
] as BoardColumn[];

describe('useBoardColumns', () => {
  beforeEach(() => jest.resetAllMocks());

  it('loads columns for a project', async () => {
    getColumns.mockResolvedValue(columns);
    const { result } = renderHook(() => useBoardColumns('p1'));
    await waitFor(() => expect(result.current).toEqual(columns));
    expect(getColumns).toHaveBeenCalledWith('p1');
  });

  it('does not request without a project and silently handles failures', async () => {
    const first = renderHook(() => useBoardColumns());
    expect(first.result.current).toEqual([]);
    expect(getColumns).not.toHaveBeenCalled();
    first.unmount();

    getColumns.mockRejectedValue(new Error('network'));
    const second = renderHook(() => useBoardColumns('p1'));
    await waitFor(() => expect(getColumns).toHaveBeenCalled());
    expect(second.result.current).toEqual([]);
  });
});

describe('board column helpers', () => {
  const t = (key: string) => `translated:${key}`;

  it('uses configured, translated and humanized labels', () => {
    expect(getStatusLabel('IN_PROGRESS', columns, t)).toBe('IN PROGRESS');
    expect(getStatusLabel('TODO', [], t)).toBe('translated:tasks.status.TODO');
    expect(getStatusLabel('CUSTOM_STATUS', [], t)).toBe('CUSTOM STATUS');
  });

  it('uses configured colors and a neutral fallback', () => {
    expect(getStatusColor('IN_PROGRESS', columns)).toBe('#123456');
    expect(getStatusColor('UNKNOWN', columns)).toBe('#94A3B8');
  });
});
