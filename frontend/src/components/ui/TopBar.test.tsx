import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import TopBar from './TopBar';
import { renderWithProviders } from '../../test/testUtils';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { userFixture } from '../../test/fixtures';
import i18n from '../../i18n';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

jest.mock('../../api/auth', () => ({
  authApi: {
    logout: jest.fn(),
  },
}));

jest.mock('./NotificationBell', () => ({
  __esModule: true,
  default: () => <div>bell</div>,
}));

const mockLogoutApi = jest.mocked(authApi.logout);

describe('TopBar', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    await i18n.changeLanguage('en');
    useAuthStore.setState({
      accessToken: 'access',
      refreshToken: 'refresh-token',
      user: userFixture({
        id: 'user-1',
        username: 'ada',
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        avatarUrl: '/avatars/ada.webp',
        updatedAt: '2026-09-04T10:00:00Z',
      }),
      setSession: jest.fn(),
      setTokens: jest.fn(),
      setUser: jest.fn(),
      logout: jest.fn(),
    });
  });

  it('opens the profile menu, falls back after avatar error and navigates to profile', async () => {
    const { user, container } = renderWithProviders(<TopBar />, {
      route: '/workspaces/workspace-1',
      path: '/workspaces/:workspaceId',
    });

    expect(screen.getByText('bell')).toBeInTheDocument();

    const avatarImage = container.querySelector('img');
    expect(avatarImage).not.toBeNull();
    fireEvent.error(avatarImage!);
    expect(screen.getByText('A')).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', { name: 'A' });
    await user.click(toggleButton);
    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument());

    await user.click(toggleButton);
    await user.click(screen.getByRole('button', { name: i18n.t('workspace.nav.profile') }));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('logs out and still navigates to login if the API call fails', async () => {
    const logout = jest.fn();
    useAuthStore.setState({ logout });
    mockLogoutApi.mockRejectedValueOnce(new Error('network'));

    const { user } = renderWithProviders(<TopBar />, {
      route: '/workspaces/workspace-1',
      path: '/workspaces/:workspaceId',
    });

    await user.click(screen.getAllByRole('button')[0]);
    await user.click(screen.getByRole('button', { name: i18n.t('workspace.nav.logout') }));

    await waitFor(() => expect(mockLogoutApi).toHaveBeenCalledWith('refresh-token'));
    expect(logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
