import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { buildAvatarSrc } from './avatarUrl';
import { useChartColors } from './chartColors';
import { consumeFlashNotice, setFlashNotice } from './flashNotice';
import {
  gitNotificationMeta,
  normalizeNotification,
  notificationActorId,
  notificationMeta,
  parseNotificationData,
  timeAgo,
} from './notificationMeta';
import { relativeTime } from './relativeTime';
import { useThemeStore } from '../store/themeStore';

describe('avatarUrl', () => {
  it.each([
    [undefined, undefined, null],
    ['/assets/avatars/a.png', undefined, '/api/assets/avatars/a.png'],
    ['/assets/avatars/a.png?size=2', '2026-01-01', '/api/assets/avatars/a.png?size=2&v=2026-01-01'],
    ['https://old.host/assets/avatars/a.png?x=1', 'a b', '/api/assets/avatars/a.png?x=1&v=a%20b'],
    ['https://example.com/photo.png', undefined, 'https://example.com/photo.png'],
    ['not-a-url', undefined, 'not-a-url'],
  ])('builds an avatar source for %s', (url, updatedAt, expected) => {
    expect(buildAvatarSrc(url, updatedAt)).toBe(expected);
  });
});

describe('flash notices', () => {
  beforeEach(() => sessionStorage.clear());

  it('stores a message and consumes it only once', () => {
    setFlashNotice('Saved');
    expect(consumeFlashNotice()).toBe('Saved');
    expect(consumeFlashNotice()).toBeNull();
  });
});

describe('notification metadata', () => {
  const t = jest.fn((key: string, options?: { count?: number }) => `${key}:${options?.count ?? ''}`);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-02T12:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('normalizes legacy and incomplete notification shapes', () => {
    const normalized = normalizeNotification({ id: 'n1', isRead: true, type: undefined });
    expect(normalized).toMatchObject({ id: 'n1', read: true, type: 'GENERAL', userId: '', title: '', message: '' });
    expect(normalized.createdAt).toBeTruthy();
  });

  it.each([
    ['2026-01-02T11:59:40Z', 'notifications.timeAgo.now:'],
    ['2026-01-02T11:55:00Z', 'notifications.timeAgo.minutes:5'],
    ['2026-01-02T10:00:00Z', 'notifications.timeAgo.hours:2'],
    ['2025-12-31T12:00:00Z', 'notifications.timeAgo.days:2'],
  ])('formats notification age for %s', (date, expected) => {
    expect(timeAgo(date, t as never)).toBe(expected);
  });

  it('uses known metadata and the general fallback', () => {
    expect(notificationMeta('TASK_REMINDER').color).toBe('var(--warning-text)');
    expect(notificationMeta('UNKNOWN')).toBe(notificationMeta('GENERAL'));
  });

  it.each([
    ['Pull request opened', 'var(--purple-text)'],
    ['Nuevo commit', 'var(--orange-text)'],
    ['Rama actualizada', 'var(--info-text)'],
    ['Unrelated event', null],
  ])('detects git notification metadata from %s', (title, color) => {
    expect(gitNotificationMeta(title)?.color ?? null).toBe(color);
  });

  it('parses valid object data and rejects malformed or non-object data', () => {
    expect(parseNotificationData('{"actorUserId":"u1"}')).toEqual({ actorUserId: 'u1' });
    expect(parseNotificationData('[]')).toEqual({});
    expect(parseNotificationData('{bad')).toEqual({});
    expect(parseNotificationData()).toEqual({});
  });

  it('extracts only non-empty actor ids', () => {
    const base = { id: 'n', userId: 'u', title: '', message: '', type: 'GENERAL', read: false, createdAt: '' };
    expect(notificationActorId({ ...base, data: '{"actorUserId":"actor"}' })).toBe('actor');
    expect(notificationActorId({ ...base, data: '{"actorUserId":""}' })).toBeNull();
  });
});

describe('relativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-02T12:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it.each([
    ['2024-01-02T12:00:00Z', '2 yr. ago'],
    ['2025-11-02T12:00:00Z', '2 mo. ago'],
    ['2025-12-31T12:00:00Z', '2 days ago'],
    ['2026-01-02T10:00:00Z', '2 hr. ago'],
    ['2026-01-02T11:58:00Z', '2 min. ago'],
    ['2026-01-02T11:59:55Z', '5 sec. ago'],
  ])('formats %s relative to now', (date, expected) => {
    expect(relativeTime(date, 'en')).toBe(expected);
  });
});

describe('chart colors', () => {
  it('returns the palette for the active theme', () => {
    act(() => useThemeStore.setState({ theme: 'light' }));
    const { result, rerender } = renderHook(() => useChartColors());
    expect(result.current.accent).toBe('#2563EB');

    act(() => useThemeStore.setState({ theme: 'dark' }));
    rerender();
    expect(result.current.accent).toBe('#60A5FA');
  });
});
