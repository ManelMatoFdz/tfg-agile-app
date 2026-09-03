import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AuthPanel from './AuthPanel';
import { renderWithProviders } from '../../test/testUtils';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { userFixture } from '../../test/fixtures';
import { getLenis } from '../../hooks/useLenis';
import { consumeFlashNotice } from '../../utils/flashNotice';
import i18n from '../../i18n';

const mockNavigate = jest.fn();
const mockLenis = { stop: jest.fn(), start: jest.fn() };

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
jest.mock('motion/react', () => {
  const React = jest.requireActual('react');
  const make = (tag: string) => React.forwardRef(({ children, ...props }: { children?: React.ReactNode }, ref) =>
    React.createElement(tag, { ...props, ref }, children)
  );
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    motion: { div: make('div'), aside: make('aside'), span: make('span') },
  };
});
jest.mock('@react-oauth/google', () => ({ useGoogleLogin: jest.fn(() => jest.fn()) }));
jest.mock('../../api/auth', () => ({ authApi: { login: jest.fn(), register: jest.fn(), googleLogin: jest.fn() } }));
jest.mock('../../hooks/useLenis', () => ({ getLenis: jest.fn() }));
jest.mock('../../utils/flashNotice', () => ({ consumeFlashNotice: jest.fn() }));

const login = jest.mocked(authApi.login);
const register = jest.mocked(authApi.register);
const mockedGetLenis = jest.mocked(getLenis);
const mockedConsumeFlashNotice = jest.mocked(consumeFlashNotice);

describe('AuthPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    mockedGetLenis.mockReturnValue(mockLenis as never);
    mockedConsumeFlashNotice.mockReturnValue(null);
  });

  it('locks body scroll, shows the flash notice and closes on Escape', () => {
    const onClose = jest.fn();
    mockedConsumeFlashNotice.mockReturnValue('Password updated');

    const { unmount } = renderWithProviders(
      <AuthPanel mode="login" onModeChange={jest.fn()} onClose={onClose} />,
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(mockLenis.stop).toHaveBeenCalled();
    expect(screen.getByText('Password updated')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();

    unmount();
    expect(document.body.style.overflow).toBe('');
    expect(mockLenis.start).toHaveBeenCalled();
  });

  it('logs in successfully, stores the session and redirects to workspaces', async () => {
    login.mockResolvedValue({
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: userFixture({ id: 'u1', fullName: 'Ada Lovelace' }),
      },
    } as never);

    const { user } = renderWithProviders(
      <AuthPanel mode="login" onModeChange={jest.fn()} onClose={jest.fn()} />,
    );

    await user.type(screen.getByPlaceholderText(i18n.t('auth.login.emailPlaceholder')), 'ada@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret123');
    await user.click(screen.getByRole('button', { name: i18n.t('auth.login.submit') }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('ada@example.com', 'secret123'));
    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token');
    expect(useAuthStore.getState().user?.fullName).toBe('Ada Lovelace');
    expect(mockNavigate).toHaveBeenCalledWith('/workspaces');
  });

  it('blocks invalid register submissions and lets the user switch back to login', async () => {
    const onModeChange = jest.fn();
    const { user } = renderWithProviders(
      <AuthPanel mode="register" onModeChange={onModeChange} onClose={jest.fn()} />,
    );

    await user.type(screen.getByPlaceholderText(i18n.t('auth.register.usernamePlaceholder')), 'ada');
    await user.type(screen.getByPlaceholderText(i18n.t('auth.login.emailPlaceholder')), 'ada@example.com');
    await user.type(screen.getAllByPlaceholderText('••••••••')[0], 'short');
    await user.type(screen.getAllByPlaceholderText('••••••••')[1], 'short');
    await user.click(screen.getByRole('button', { name: i18n.t('auth.register.submit') }));

    expect(await screen.findByText(i18n.t('auth.register.validation.passwordTooShort'))).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: i18n.t('auth.register.loginLink') }));
    expect(onModeChange).toHaveBeenCalledWith('login');
  });
});
