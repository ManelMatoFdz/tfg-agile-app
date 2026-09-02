import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { usersApi } from '../../api/users';
import { notificationsApi } from '../../api/notifications';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { userFixture } from '../../test/fixtures';
import { renderWithProviders } from '../../test/testUtils';
import ProfileInfo from './ProfileInfo';
import ChangePassword from './ChangePassword';
import AvatarUpload from './AvatarUpload';
import NotificationPreferences from './NotificationPreferences';
import ThemePreference from './ThemePreference';
import LanguagePreference from './LanguagePreference';
import i18n from '../../i18n';

jest.mock('../../api/users', () => ({
  usersApi: { updateMe: jest.fn(), changePassword: jest.fn(), uploadAvatar: jest.fn() },
}));
jest.mock('../../api/notifications', () => ({
  notificationsApi: { getSettings: jest.fn(), updateSettings: jest.fn() },
}));

const updateMe = jest.mocked(usersApi.updateMe);
const changePassword = jest.mocked(usersApi.changePassword);
const uploadAvatar = jest.mocked(usersApi.uploadAvatar);
const getSettings = jest.mocked(notificationsApi.getSettings);
const updateSettings = jest.mocked(notificationsApi.updateSettings);

describe('profile components', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    localStorage.clear();
    useAuthStore.setState({ accessToken: 'a', refreshToken: 'r', user: userFixture({ hasLocalPassword: true }) });
    useThemeStore.setState({ theme: 'light' });
    await i18n.changeLanguage('en');
  });

  it('updates personal information and the auth store', async () => {
    const updated = userFixture({ fullName: 'Grace Hopper', bio: 'Compiler pioneer' });
    updateMe.mockResolvedValue({ data: updated } as never);
    const { user } = renderWithProviders(<ProfileInfo />);
    const name = screen.getByLabelText('Full name');
    await user.clear(name);
    await user.type(name, 'Grace Hopper');
    await user.type(screen.getByPlaceholderText(/Tell us/i), 'Compiler pioneer');
    await user.click(screen.getByRole('button', { name: /Save changes/i }));
    await waitFor(() => expect(updateMe).toHaveBeenCalledWith({ fullName: 'Grace Hopper', bio: 'Compiler pioneer' }));
    expect(useAuthStore.getState().user).toEqual(updated);
  });

  it('validates password confirmation without sending a request', async () => {
    const { user } = renderWithProviders(<ChangePassword />);
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    await user.type(passwordInputs[0], 'current');
    await user.type(passwordInputs[1], 'newpass');
    await user.type(passwordInputs[2], 'different');
    await user.click(screen.getByRole('button', { name: /Change password/i }));
    expect(changePassword).not.toHaveBeenCalled();
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
  });

  it('changes the password, logs out and stores a flash notice', async () => {
    changePassword.mockResolvedValue({ data: {} } as never);
    const { user } = renderWithProviders(<ChangePassword />);
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    await user.type(passwordInputs[0], 'current');
    await user.type(passwordInputs[1], 'newpass');
    await user.type(passwordInputs[2], 'newpass');
    await user.click(screen.getByRole('button', { name: /Change password/i }));
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('newpass', 'current'));
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(sessionStorage.getItem('auth.flashNotice')).toBeTruthy();
  });

  it('uploads image files and ignores non-images', async () => {
    uploadAvatar.mockResolvedValue({ data: { avatarUrl: '/assets/avatars/new.png' } } as never);
    const { container } = renderWithProviders(<AvatarUpload />);
    const input = container.querySelector('input[type="file"]')!;
    const image = new File(['image'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [image] } });
    await waitFor(() => expect(uploadAvatar).toHaveBeenCalledWith(image));
    expect(useAuthStore.getState().user?.avatarUrl).toBe('/assets/avatars/new.png');

    fireEvent.change(input, { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });
    expect(uploadAvatar).toHaveBeenCalledTimes(1);
  });

  it('loads and updates notification settings optimistically', async () => {
    const settings = { inAppNotificationsEnabled: true, projectUpdatesEnabled: true, taskRemindersEnabled: false };
    getSettings.mockResolvedValue({ data: settings } as never);
    updateSettings.mockResolvedValue({ data: { ...settings, taskRemindersEnabled: true } } as never);
    const { user } = renderWithProviders(<NotificationPreferences />);
    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(3));
    await user.click(screen.getAllByRole('switch')[2]);
    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ taskRemindersEnabled: true }));
  });

  it('shows an error when notification settings cannot load', async () => {
    getSettings.mockRejectedValue(new Error('network'));
    renderWithProviders(<NotificationPreferences />);
    expect(await screen.findByText(/Error loading/i)).toBeInTheDocument();
  });

  it('changes theme and language preferences', async () => {
    const theme = renderWithProviders(<ThemePreference />);
    await theme.user.click(screen.getByRole('button', { name: /Dark/i }));
    expect(useThemeStore.getState().theme).toBe('dark');
    theme.unmount();

    const language = renderWithProviders(<LanguagePreference />);
    await language.user.click(screen.getByRole('button', { name: /Galego/i }));
    expect(i18n.language).toBe('gl');
  });
});
