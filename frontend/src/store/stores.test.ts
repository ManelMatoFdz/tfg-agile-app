import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { useAuthStore } from './authStore';
import { useThemeStore } from './themeStore';
import { useWorkspaceStore } from './workspaceStore';
import { userFixture } from '../test/fixtures';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  });

  it('persists and updates a complete session', () => {
    const user = userFixture();
    act(() => useAuthStore.getState().setSession('access', 'refresh', user));
    expect(useAuthStore.getState()).toMatchObject({ accessToken: 'access', refreshToken: 'refresh', user });
    expect(localStorage.getItem('user')).toBe(JSON.stringify(user));
  });

  it('updates tokens and the user independently', () => {
    const user = userFixture({ fullName: 'Changed' });
    act(() => useAuthStore.getState().setTokens('a2', 'r2'));
    act(() => useAuthStore.getState().setUser(user));
    expect(localStorage.getItem('accessToken')).toBe('a2');
    expect(localStorage.getItem('refreshToken')).toBe('r2');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('clears state and storage on logout', () => {
    useAuthStore.getState().setSession('a', 'r', userFixture());
    act(() => useAuthStore.getState().logout());
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, refreshToken: null, user: null });
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    useThemeStore.setState({ theme: 'light' });
  });

  it('applies explicit themes to the document', () => {
    act(() => useThemeStore.getState().setTheme('dark'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    act(() => useThemeStore.getState().setTheme('light'));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('toggles between light and dark', () => {
    act(() => useThemeStore.getState().toggle());
    expect(useThemeStore.getState().theme).toBe('dark');
    act(() => useThemeStore.getState().toggle());
    expect(useThemeStore.getState().theme).toBe('light');
  });
});

describe('workspaceStore', () => {
  beforeEach(() => useWorkspaceStore.setState({ workspaceId: null }));

  it('selects and clears a workspace', () => {
    act(() => useWorkspaceStore.getState().setWorkspace('workspace-1'));
    expect(useWorkspaceStore.getState().workspaceId).toBe('workspace-1');
    act(() => useWorkspaceStore.getState().clearWorkspace());
    expect(useWorkspaceStore.getState().workspaceId).toBeNull();
  });
});
