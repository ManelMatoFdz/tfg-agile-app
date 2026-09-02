import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import Lenis from 'lenis';
import { getLenis, useLenis } from './useLenis';

const mockLenisInstance = { raf: jest.fn(), destroy: jest.fn() };
jest.mock('lenis', () => ({ __esModule: true, default: jest.fn(() => mockLenisInstance) }));

describe('useLenis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
  });

  it('creates one global instance and destroys it on unmount', () => {
    const first = renderHook(() => useLenis());
    const second = renderHook(() => useLenis());
    expect(Lenis).toHaveBeenCalledTimes(1);
    expect(getLenis()).toBe(mockLenisInstance);
    second.unmount();
    first.unmount();
    expect(mockLenisInstance.destroy).toHaveBeenCalled();
    expect(getLenis()).toBeNull();
  });

  it('does not initialize when reduced motion is preferred', () => {
    jest.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    const rendered = renderHook(() => useLenis());
    expect(Lenis).not.toHaveBeenCalled();
    rendered.unmount();
  });
});
