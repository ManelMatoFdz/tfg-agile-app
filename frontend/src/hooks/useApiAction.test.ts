import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import i18next from 'i18next';
import { useApiAction } from './useApiAction';

describe('useApiAction', () => {
  afterEach(() => jest.restoreAllMocks());

  it('exposes loading and resolves successful data', async () => {
    let resolve!: (value: { data: string }) => void;
    const promise = new Promise<{ data: string }>((done) => { resolve = done; });
    const { result } = renderHook(() => useApiAction<string>());
    let returned: string | null = null;
    let pending!: Promise<void>;

    act(() => {
      pending = result.current.run(promise).then((value) => { returned = value; });
    });
    expect(result.current.loading).toBe(true);
    await act(async () => {
      resolve({ data: 'saved' });
      await pending;
    });

    expect(returned).toBe('saved');
    expect(result.current).toMatchObject({ data: 'saved', loading: false, error: null, success: true });
  });

  it.each([
    [{ response: { status: 403, data: {} } }, 'errors.FORBIDDEN'],
    [{ response: { status: 404, data: {} } }, 'errors.NOT_FOUND'],
    [{ response: { status: 409, data: {} } }, 'errors.CONFLICT'],
    [{ response: { status: 400, data: {} } }, 'errors.BAD_REQUEST'],
    [{ response: { status: 500, data: {} } }, 'errors.INTERNAL_ERROR'],
    [{ response: { status: 400, data: { errorCode: 'CUSTOM' } } }, 'errors.CUSTOM'],
  ])('maps API failures to a translated error', async (error, expectedKey) => {
    jest.spyOn(i18next, 't').mockImplementation(((key: string) => key === 'errors.CUSTOM' ? 'Custom message' : key) as never);
    const { result } = renderHook(() => useApiAction());

    let returned: unknown = 'unset';
    await act(async () => {
      returned = await result.current.run(Promise.reject(error));
    });

    expect(returned).toBeNull();
    expect(i18next.t).toHaveBeenCalledWith(expectedKey);
    expect(result.current.success).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('resets all state fields', async () => {
    const { result } = renderHook(() => useApiAction<number>());
    await act(async () => { await result.current.run(Promise.resolve({ data: 4 })); });
    act(() => result.current.reset());
    expect(result.current).toMatchObject({ data: null, loading: false, error: null, success: false });
  });
});
