import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { userFixture } from '../test/fixtures';
import { renderWithProviders } from '../test/testUtils';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';

jest.mock('@react-oauth/google', () => ({
  useGoogleLogin: jest.fn(() => jest.fn()),
}));
jest.mock('../api/auth', () => ({
  authApi: {
    login: jest.fn(), register: jest.fn(), googleLogin: jest.fn(),
    forgotPassword: jest.fn(), resetPassword: jest.fn(),
  },
}));

const login = jest.mocked(authApi.login);
const register = jest.mocked(authApi.register);
const forgotPassword = jest.mocked(authApi.forgotPassword);
const resetPassword = jest.mocked(authApi.resetPassword);
const authResponse = { accessToken: 'access', refreshToken: 'refresh', user: userFixture() };

function inputs(container: HTMLElement) {
  return Array.from(container.querySelectorAll('input'));
}

describe('authentication pages', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  });

  it('logs in, stores the session and navigates to workspaces', async () => {
    login.mockResolvedValue({ data: authResponse } as never);
    const { container, user } = renderWithProviders(<LoginPage />, { route: '/login' });
    const [email, password] = inputs(container);
    await user.type(email, 'ada@example.com');
    await user.type(password, 'secret12');
    await user.click(container.querySelector('form button[type="submit"]')!);

    await waitFor(() => expect(login).toHaveBeenCalledWith('ada@example.com', 'secret12'));
    expect(useAuthStore.getState()).toMatchObject(authResponse);
  });

  it('validates registration before calling the API', async () => {
    const { container, user } = renderWithProviders(<RegisterPage />, { route: '/register' });
    const [username, email, password, confirm] = inputs(container);
    await user.type(username, 'ada');
    await user.type(email, 'ada@example.com');
    await user.type(password, '123');
    await user.type(confirm, '123');
    await user.click(container.querySelector('form button[type="submit"]')!);
    expect(register).not.toHaveBeenCalled();
    expect(screen.getByText(/6/)).toBeInTheDocument();
  });

  it('registers valid credentials and stores the session', async () => {
    register.mockResolvedValue({ data: authResponse } as never);
    const { container, user } = renderWithProviders(<RegisterPage />, { route: '/register' });
    const [username, email, password, confirm] = inputs(container);
    await user.type(username, 'ada');
    await user.type(email, 'ada@example.com');
    await user.type(password, 'secret12');
    await user.type(confirm, 'secret12');
    await user.click(container.querySelector('form button[type="submit"]')!);
    await waitFor(() => expect(register).toHaveBeenCalledWith('ada', 'ada@example.com', 'secret12'));
    expect(useAuthStore.getState().accessToken).toBe('access');
  });

  it('submits a password recovery request and displays success', async () => {
    forgotPassword.mockResolvedValue({ data: undefined } as never);
    const { container, user } = renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' });
    await user.type(inputs(container)[0], 'ada@example.com');
    await user.click(container.querySelector('form button[type="submit"]')!);
    await waitFor(() => expect(forgotPassword).toHaveBeenCalledWith('ada@example.com'));
    expect(container.querySelector('form')).not.toBeInTheDocument();
  });

  it('rejects password reset without a URL token', async () => {
    const { container, user } = renderWithProviders(<ResetPasswordPage />, { route: '/reset-password' });
    const [password, confirm] = inputs(container);
    await user.type(password, 'secret12');
    await user.type(confirm, 'secret12');
    await user.click(container.querySelector('form button[type="submit"]')!);
    expect(resetPassword).not.toHaveBeenCalled();
    expect(screen.getByText(/Invalid token/i)).toBeInTheDocument();
  });

  it('resets a password with a valid token', async () => {
    resetPassword.mockResolvedValue({ data: undefined } as never);
    const { container, user } = renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=reset-token' });
    const [password, confirm] = inputs(container);
    await user.type(password, 'secret12');
    await user.type(confirm, 'secret12');
    await user.click(container.querySelector('form button[type="submit"]')!);
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('reset-token', 'secret12'));
    expect(container.querySelector('form')).not.toBeInTheDocument();
  });
});
