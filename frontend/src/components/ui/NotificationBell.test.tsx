import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import NotificationBell from './NotificationBell';
import { renderWithProviders } from '../../test/testUtils';
import { notificationsApi } from '../../api/notifications';
import { useNotificationActors } from '../../hooks/useNotificationActors';
import type { Notification } from '../../types';
import i18n from '../../i18n';

const mockNavigate = jest.fn();
const mockActorSummary = { id: 'actor-1', username: 'ada', fullName: 'Ada Lovelace' };

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
jest.mock('../../api/notifications', () => ({ notificationsApi: {
  list: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn(),
} }));
jest.mock('../../hooks/useNotificationActors', () => ({
  useNotificationActors: jest.fn(() => ({ 'actor-1': mockActorSummary })),
}));
jest.mock('./NotificationSource', () => ({
  __esModule: true,
  default: ({ notification, actor }: { notification: Notification; actor?: { fullName?: string } }) => (
    <div>
      <span>{notification.type}</span>
      {actor?.fullName && <span>{actor.fullName}</span>}
    </div>
  ),
}));

const listNotifications = jest.mocked(notificationsApi.list);
const markRead = jest.mocked(notificationsApi.markRead);
const markAllRead = jest.mocked(notificationsApi.markAllRead);
const mockedUseNotificationActors = jest.mocked(useNotificationActors);

function page(content: Notification[], totalElements = content.filter((item) => !item.read).length) {
  return { data: { content, totalElements, totalPages: 1, size: 8 } } as never;
}

const unreadNotification: Notification = {
  id: 'n1',
  userId: 'u1',
  title: 'Task updated',
  message: 'A task changed state',
  type: 'TASK_UPDATE',
  read: false,
  createdAt: '2026-01-01T00:00:00Z',
  link: '/workspaces/workspace-1',
  data: JSON.stringify({ actorUserId: 'actor-1' }),
};

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    markRead.mockResolvedValue({} as never);
    markAllRead.mockResolvedValue({} as never);
    mockedUseNotificationActors.mockReturnValue({ 'actor-1': mockActorSummary });
  });

  it('loads unread count, opens the list and marks all notifications as read', async () => {
    listNotifications
      .mockResolvedValueOnce(page([], 3))
      .mockResolvedValueOnce(page([unreadNotification, { ...unreadNotification, id: 'n2', title: 'Mention', read: true }], 3));

    const { user, container } = renderWithProviders(<NotificationBell />);

    await waitFor(() => expect(listNotifications).toHaveBeenCalledWith({ unreadOnly: true, size: 1 }));
    await waitFor(() => expect(container.querySelector('button')?.textContent).toContain('3'));

    await user.click(container.querySelector('button')!);
    await waitFor(() => expect(listNotifications).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(i18n.t('notifications.title'))).toBeInTheDocument();
    expect(screen.getByText('Task updated')).toBeInTheDocument();
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: i18n.t('notifications.markAll') }));
    expect(markAllRead).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('3')).not.toBeInTheDocument());
  });

  it('marks an unread notification as read and navigates to its link', async () => {
    listNotifications
      .mockResolvedValueOnce(page([], 1))
      .mockResolvedValueOnce(page([unreadNotification], 1));

    const { user, container } = renderWithProviders(<NotificationBell />);

    await waitFor(() => expect(listNotifications).toHaveBeenCalledTimes(1));
    await user.click(container.querySelector('button')!);
    await waitFor(() => expect(listNotifications).toHaveBeenCalledTimes(2));
    await screen.findByText('Task updated');

    await user.click(screen.getByText('Task updated'));

    await waitFor(() => expect(markRead).toHaveBeenCalledWith('n1'));
    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/workspace-1');
  });

  it('renders the empty state when there are no notifications', async () => {
    listNotifications
      .mockResolvedValueOnce(page([], 0))
      .mockResolvedValueOnce(page([], 0));

    const { user, container } = renderWithProviders(<NotificationBell />);
    await waitFor(() => expect(listNotifications).toHaveBeenCalledTimes(1));

    await user.click(container.querySelector('button')!);
    await waitFor(() => expect(listNotifications).toHaveBeenCalledTimes(2));

    expect(await screen.findByText(i18n.t('notifications.empty'))).toBeInTheDocument();
  });
});
