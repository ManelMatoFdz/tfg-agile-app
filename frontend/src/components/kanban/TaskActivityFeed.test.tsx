import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import TaskActivityFeed from './TaskActivityFeed';
import { renderWithProviders } from '../../test/testUtils';
import { tasksApi } from '../../api/tasks';
import { userSummaryFixture } from '../../test/fixtures';
import type { Label, TaskActivity, TaskComment } from '../../types';
import i18n from '../../i18n';

jest.mock('../../api/tasks', () => ({ tasksApi: { getActivity: jest.fn() } }));

const mockGetActivity = jest.mocked(tasksApi.getActivity);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('TaskActivityFeed', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-10T12:00:00Z'));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders loading first and then activity rows with resolved values and relative time', async () => {
    const pending = deferred<TaskActivity[]>();
    mockGetActivity.mockReturnValue(pending.promise);

    const labels: Label[] = [{ id: '11111111-1111-1111-1111-111111111111', name: 'Backend', color: '#2563EB' }];
    const userMap = {
      actor: userSummaryFixture({ id: 'actor', fullName: 'Ada Lovelace', username: 'ada' }),
      old: userSummaryFixture({ id: 'old', fullName: 'Bob Stone', username: 'bob' }),
      next: userSummaryFixture({ id: 'next', fullName: 'Carol Jones', username: 'carol' }),
    };
    const comments: TaskComment[] = [
      { id: 'c1', taskId: 'task-1', authorId: 'actor', content: 'Looks good', createdAt: '2026-01-09T08:00:00Z' },
    ];

    const { container } = renderWithProviders(
      <TaskActivityFeed taskId="task-1" comments={comments} userMap={userMap} labels={labels} />,
    );

    expect(container.textContent).not.toContain(i18n.t('tasks.activity.title'));

    pending.resolve([
      { id: 'a1', taskId: 'task-1', actorId: 'actor', type: 'ASSIGNEE_CHANGED', oldValue: 'old', newValue: 'next', createdAt: '2026-01-10T11:59:00Z' },
      { id: 'a2', taskId: 'task-1', actorId: null, type: 'LABEL_REMOVED', oldValue: '11111111-1111-1111-1111-111111111111', createdAt: '2026-01-10T10:00:00Z' },
      { id: 'a3', taskId: 'task-1', actorId: null, type: 'READY_CHANGED', newValue: 'true', createdAt: '2026-01-09T12:00:00Z' },
      { id: 'a4', taskId: 'task-1', actorId: null, type: 'STORY_POINTS_CHANGED', newValue: '5', createdAt: '2026-01-10T11:59:50Z' },
    ]);

    expect(await screen.findByText(i18n.t('tasks.activity.title'))).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Bob Stone/)).toBeInTheDocument();
    expect(screen.getByText(/Carol Jones/)).toBeInTheDocument();
    expect(screen.getByText(/Label Backend removed/)).toBeInTheDocument();
    expect(screen.getByText(i18n.t('tasks.activity.READY_CHANGED_true_impersonal'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('tasks.activity.STORY_POINTS_SET_impersonal', { newValue: '5' }))).toBeInTheDocument();
    expect(screen.getByText('1 min ago')).toBeInTheDocument();
    expect(screen.getByText('2h ago')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('tasks.comments.yesterday'))).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('returns null when the request fails and there are no activities to render', async () => {
    mockGetActivity.mockRejectedValue(new Error('network'));

    const { container } = renderWithProviders(
      <TaskActivityFeed taskId="task-1" comments={[]} userMap={{}} labels={[]} />,
    );

    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledWith('task-1'));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('returns null when there are only comments and no activity entries', async () => {
    mockGetActivity.mockResolvedValue([]);

    const { container } = renderWithProviders(
      <TaskActivityFeed
        taskId="task-1"
        comments={[{ id: 'c1', taskId: 'task-1', authorId: 'u1', content: 'Only comment', createdAt: '2026-01-10T11:00:00Z' }]}
        userMap={{}}
        labels={[]}
      />,
    );

    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledWith('task-1'));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
