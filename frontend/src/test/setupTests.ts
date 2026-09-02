import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { TextDecoder, TextEncoder } from 'node:util';

Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: TextEncoder });
Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, value: TextDecoder });

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

class ObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: ObserverMock });
Object.defineProperty(globalThis, 'IntersectionObserver', { configurable: true, value: ObserverMock });
Object.defineProperty(window, 'scrollTo', { configurable: true, value: jest.fn() });
Object.defineProperty(window, 'requestAnimationFrame', {
  configurable: true,
  value: jest.fn((callback: FrameRequestCallback) => window.setTimeout(() => callback(Date.now()), 0)),
});
Object.defineProperty(window, 'cancelAnimationFrame', {
  configurable: true,
  value: jest.fn((id: number) => window.clearTimeout(id)),
});

if (!URL.createObjectURL) Object.defineProperty(URL, 'createObjectURL', { value: jest.fn(() => 'blob:test') });
if (!URL.revokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', { value: jest.fn() });
