import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import NotificationsPage from './NotificationsPage';
import { renderWithProviders } from '../test/testUtils';
import { notificationsApi } from '../api/notifications';
import { invitationsApi } from '../api/invitations';
import { useNotificationActors } from '../hooks/useNotificationActors';
import { userSummaryFixture } from '../test/fixtures';
import type { Notification, NotificationPage } from '../types';
import i18n from '../i18n';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

jest.mock('../api/notifications', () => ({
  notificationsApi: {
    list: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  },
}));

jest.mock('../api/invitations', () => ({
  invitationsApi: {
    accept: jest.fn(),
    reject: jest.fn(),
  },
}));

jest.mock('../hooks/useNotificationActors', () => ({ useNotificationActors: jest.fn() }));
jest.mock('../components/ui/NotificationSource', () => ({
  __esModule: true,
  default: ({ notification, actor }: any) => <div>{actor?.fullName ?? actor?.username ?? notification.type}</div>,
}));

const mockList = jest.mocked(notificationsApi.list);
const mockMarkRead = jest.mocked(notificationsApi.markRead);
const mockMarkAllRead = jest.mocked(notificationsApi.markAllRead);
const mockAccept = jest.mocked(invitationsApi.accept);
const mockReject = jest.mocked(invitationsApi.reject);
const mockUseNotificationActors = jest.mocked(useNotificationActors);

let notificationStore: Notification[] = [];

function notificationFixture(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notification-1',
    userId: 'user-1',
    title: 'Build pipeline',
    message: 'Pipeline is ready',
    type: 'GENERAL',
    read: false,
    createdAt: '2026-09-04T08:00:00Z',
    link: '/workspaces/workspace-1/projects/project-1/tasks/task-1',
    data: JSON.stringify({ actorUserId: 'actor-1' }),
    ...overrides,
  };
}

function buildPage(items: Notification[], page: number, size: number): NotificationPage {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  return {
    content: items.slice(page * size, page * size + size),
    totalElements: items.length,
    totalPages,
    size,
    number: page,
    hasNext: page + 1 < totalPages,
  };
}

describe('NotificationsPage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    await i18n.changeLanguage('en');

    notificationStore = [
      notificationFixture(),
      notificationFixture({
        id: 'notification-2',
        title: 'Already read',
        message: 'Seen before',
        read: true,
        link: '/workspaces/workspace-1',
      }),
      notificationFixture({
        id: 'notification-3',
        title: 'Review PR',
        message: 'Please review',
        read: false,
        link: '/workspaces/workspace-1/projects/project-1/repository',
      }),
      notificationFixture({
        id: 'notification-4',
        title: 'Workspace invite',
        message: 'Join the workspace',
        type: 'WORKSPACE_INVITATION',
        link: undefined,
        data: JSON.stringify({ invitationId: 'inv-1', actorUserId: 'actor-1' }),
      }),
    ];

    mockUseNotificationActors.mockReturnValue({
      'actor-1': userSummaryFixture({ id: 'actor-1', fullName: 'Grace Hopper', username: 'grace' }),
    });

    mockList.mockImplementation(async (params) => {
      const unreadOnly = Boolean(params.unreadOnly);
      const page = params.page ?? 0;
      const size = params.size ?? 10;
      const items = unreadOnly ? notificationStore.filter((notification) => !notification.read) : notificationStore;
      return { data: buildPage(items, page, size) } as never;
    });

    mockMarkRead.mockImplementation(async (notificationId) => {
      notificationStore = notificationStore.map((notification) => (
        notification.id === notificationId ? { ...notification, read: true } : notification
      ));
      return { data: {} } as never;
    });

    mockMarkAllRead.mockImplementation(async () => {
      notificationStore = notificationStore.map((notification) => ({ ...notification, read: true }));
      return { data: {} } as never;
    });

    mockAccept.mockResolvedValue({ data: {} } as never);
    mockReject.mockResolvedValue({ data: {} } as never);
  });

  it('loads notifications, paginates, marks a row as read and navigates on click', async () => {
    const page0 = [
      notificationFixture(),
      notificationFixture({
        id: 'notification-2',
        title: 'Already read',
        message: 'Seen before',
        read: true,
        link: '/workspaces/workspace-1',
      }),
    ];
    const page1 = [
      notificationFixture(),
      notificationFixture({
        id: 'notification-3',
        title: 'Review PR',
        message: 'Please review',
        read: false,
        link: '/workspaces/workspace-1/projects/project-1/repository',
      }),
    ];

    mockList.mockImplementation(async (params) => {
      if (params.unreadOnly && params.size === 1) {
        return {
          data: {
            content: [page0[0]],
            totalElements: 3,
            totalPages: 3,
            size: 1,
            hasNext: true,
          },
        } as never;
      }
      if ((params.page ?? 0) === 0) {
        return {
          data: {
            content: page0,
            totalElements: 3,
            totalPages: 2,
            size: 10,
            hasNext: true,
          },
        } as never;
      }
      return {
        data: {
          content: page1,
          totalElements: 3,
          totalPages: 2,
          size: 10,
          hasNext: false,
        },
      } as never;
    });

    const { user } = renderWithProviders(<NotificationsPage />, { route: '/notifications', path: '/notifications' });

    expect(await screen.findByText('Build pipeline')).toBeInTheDocument();
    expect(screen.getAllByText('Grace Hopper').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: i18n.t('notifications.loadMore') }));
    expect(await screen.findByText('Review PR')).toBeInTheDocument();

    const reviewRow = screen.getByText('Review PR').closest('article');
    expect(reviewRow).not.toBeNull();
    await user.click(within(reviewRow!).getByRole('button', { name: i18n.t('notifications.markRead') }));
    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledWith('notification-3'));

    const buildRow = screen.getByText('Build pipeline').closest('article');
    expect(buildRow).not.toBeNull();
    await user.click(buildRow!);
    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledWith('notification-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/workspace-1/projects/project-1/tasks/task-1');
  });

  it('marks all notifications as read and removes unread actions', async () => {
    const { user } = renderWithProviders(<NotificationsPage />, { route: '/notifications', path: '/notifications' });

    expect(await screen.findByText('Build pipeline')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: i18n.t('notifications.markAll') }));

    await waitFor(() => expect(mockMarkAllRead).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: i18n.t('notifications.markRead') })).not.toBeInTheDocument();
    });
  });

  it('switches to unread notifications and accepts an invitation until the empty state is shown', async () => {
    const { user } = renderWithProviders(<NotificationsPage />, { route: '/notifications', path: '/notifications' });

    expect(await screen.findByText('Build pipeline')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: new RegExp(i18n.t('notifications.unread'), 'i') }));
    expect(await screen.findByText('Workspace invite')).toBeInTheDocument();

    const invitationRow = screen.getByText('Workspace invite').closest('article');
    expect(invitationRow).not.toBeNull();
    await user.click(invitationRow!);
    expect(mockNavigate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: i18n.t('workspace.members.invite.accept') }));

    await waitFor(() => expect(mockAccept).toHaveBeenCalledWith('inv-1'));
    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledWith('notification-4'));

    await user.click(screen.getByRole('button', { name: i18n.t('notifications.markAll') }));
    await waitFor(() => expect(mockMarkAllRead).toHaveBeenCalled());
    expect(await screen.findByText(i18n.t('notifications.emptyUnread'))).toBeInTheDocument();
  });

  it('shows a load error when the page request fails', async () => {
    mockList.mockImplementation(async (params) => {
      if (params.unreadOnly && params.size === 1) {
        return {
          data: {
            content: [],
            totalElements: 0,
            totalPages: 1,
            size: 1,
            hasNext: false,
          },
        } as never;
      }
      throw new Error('boom');
    });

    renderWithProviders(<NotificationsPage />, { route: '/notifications', path: '/notifications' });

    expect(await screen.findByText(i18n.t('notifications.loadError'))).toBeInTheDocument();
  });

  it('shows an action error when mark all fails', async () => {
    mockMarkAllRead.mockRejectedValueOnce({ response: { status: 500 } } as never);

    const { user } = renderWithProviders(<NotificationsPage />, { route: '/notifications', path: '/notifications' });

    expect(await screen.findByText('Build pipeline')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: i18n.t('notifications.markAll') }));

    expect(await screen.findByText(i18n.t('errors.INTERNAL_ERROR'))).toBeInTheDocument();
  });
});
