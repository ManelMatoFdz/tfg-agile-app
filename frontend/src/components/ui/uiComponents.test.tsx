import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Route, Routes } from 'react-router-dom';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import Toggle from './Toggle';
import LanguageFlag from './LanguageFlag';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationSource from './NotificationSource';
import ProtectedRoute from '../auth/ProtectedRoute';
import { renderWithProviders } from '../../test/testUtils';
import { useAuthStore } from '../../store/authStore';
import { userSummaryFixture } from '../../test/fixtures';
import type { Notification } from '../../types';
import i18n from '../../i18n';

describe('UI primitives', () => {
  it('Button forwards clicks and disables interaction while loading', async () => {
    const onClick = jest.fn();
    const { user, rerender } = renderWithProviders(<Button onClick={onClick}>Save</Button>);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalled();
    rerender(<Button onClick={onClick} loading>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('Input associates its label, shows hints and prioritizes errors', () => {
    const { rerender } = render(<Input label="Email" hint="Required" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
    rerender(<Input label="Email" hint="Required" error="Invalid" />);
    expect(screen.getByText('Invalid')).toBeInTheDocument();
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });

  it('Alert renders its message and invokes close', async () => {
    const close = jest.fn();
    const { user } = renderWithProviders(<Alert type="error" message="Failed" onClose={close} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(close).toHaveBeenCalled();
  });

  it('Toggle exposes switch semantics and changes to the inverse value', async () => {
    const change = jest.fn();
    const { user } = renderWithProviders(<Toggle label="Updates" checked={false} onChange={change} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    expect(change).toHaveBeenCalledWith(true);
  });

  it('renders known and unknown language flags safely', () => {
    const { container, rerender } = render(<LanguageFlag code="es" />);
    expect(container.querySelectorAll('rect')).toHaveLength(2);
    rerender(<LanguageFlag code="xx" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('switches application language', async () => {
    await i18n.changeLanguage('es');
    const { user } = renderWithProviders(<LanguageSwitcher compact />);
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(i18n.language).toBe('en');
  });
});

describe('NotificationSource', () => {
  const notification: Notification = {
    id: 'n1', userId: 'u1', title: 'Member update', message: '', type: 'PROJECT_UPDATE', read: false,
    createdAt: '2026-01-01',
  };

  it('renders an actor avatar and falls back to initials after an image error', () => {
    const actor = userSummaryFixture({ fullName: 'Ada Lovelace' });
    render(<NotificationSource notification={notification} actor={actor} />);
    fireEvent.error(screen.getByRole('img', { name: 'Ada Lovelace' }));
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('uses an event icon for git notifications even when an actor exists', () => {
    const { container } = render(<NotificationSource notification={{ ...notification, title: 'New commit' }} actor={userSummaryFixture()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('ProtectedRoute', () => {
  beforeEach(() => useAuthStore.setState({ accessToken: null, refreshToken: null, user: null }));

  it('redirects anonymous users to the login route', () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}><Route path="/private" element={<div>Private</div>} /></Route>
        <Route path="/login" element={<div>Login</div>} />
      </Routes>,
      { route: '/private' },
    );
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('renders protected content with a token', () => {
    useAuthStore.setState({ accessToken: 'token' });
    renderWithProviders(
      <Routes><Route element={<ProtectedRoute />}><Route path="/private" element={<div>Private</div>} /></Route></Routes>,
      { route: '/private' },
    );
    expect(screen.getByText('Private')).toBeInTheDocument();
  });
});
