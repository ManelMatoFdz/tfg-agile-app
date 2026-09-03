import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import TaskComments from './TaskComments';
import { renderWithProviders } from '../../test/testUtils';
import { tasksApi } from '../../api/tasks';
import { useAuthStore } from '../../store/authStore';
import { userFixture, userSummaryFixture } from '../../test/fixtures';
import type { Task, TaskComment, UserSummary } from '../../types';
import i18n from '../../i18n';

jest.mock('../../api/tasks', () => ({
  tasksApi: {
    getComments: jest.fn(),
    getByProject: jest.fn(),
    createComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
  },
}));

const mockGetComments = jest.mocked(tasksApi.getComments);
const mockGetByProject = jest.mocked(tasksApi.getByProject);
const mockCreateComment = jest.mocked(tasksApi.createComment);
const mockUpdateComment = jest.mocked(tasksApi.updateComment);
const mockDeleteComment = jest.mocked(tasksApi.deleteComment);

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Main task',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    type: 'TASK',
    reporterId: 'user-1',
    assigneeId: null,
    completedAt: null,
    storyPoints: null,
    ready: false,
    position: 0,
    labels: [],
    subtaskCount: 0,
    completedSubtaskCount: 0,
    definitionOfDone: null,
    blockedByCount: 0,
    blocksCount: 0,
    gitEventCount: 0,
    createdAt: '2026-09-03',
    updatedAt: '2026-09-03',
    ...overrides,
  };
}

function commentFixture(overrides: Partial<TaskComment> = {}): TaskComment {
  return {
    id: 'comment-1',
    taskId: 'task-1',
    authorId: 'user-1',
    content: 'Initial comment',
    createdAt: '2026-09-03T09:00:00Z',
    editedAt: null,
    ...overrides,
  };
}

function setEditorText(editor: HTMLElement, value: string) {
  editor.textContent = value;
  const range = document.createRange();
  range.setStart(editor.firstChild ?? editor, value.length);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent.input(editor);
}

describe('TaskComments', () => {
  const userMap: Record<string, UserSummary> = {
    'user-1': userSummaryFixture({ id: 'user-1', fullName: 'Ada Lovelace', username: 'ada' }),
    'user-2': userSummaryFixture({ id: 'user-2', fullName: 'Grace Hopper', username: 'grace' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
    useAuthStore.setState({ user: userFixture({ id: 'user-1', fullName: 'Ada Lovelace', username: 'ada' }) });
    mockGetByProject.mockResolvedValue([
      taskFixture(),
      taskFixture({ id: 'task-2', title: 'Secondary task' }),
    ] as never);
  });

  it('renders the empty state and hides the editor in read-only mode', async () => {
    mockGetComments.mockResolvedValue([] as never);

    const first = renderWithProviders(
      <TaskComments
        taskId="task-1"
        projectId="project-1"
        members={[{ userId: 'user-1' }, { userId: 'user-2' }]}
        userMap={userMap}
        isAdmin={false}
        readOnly
      />,
    );

    expect(await screen.findByText(i18n.t('tasks.comments.empty'))).toBeInTheDocument();
    expect(first.container.querySelector('[contenteditable="true"]')).toBeNull();
    first.unmount();
  });

  it('creates comments from the inline editor', async () => {
    mockGetComments.mockResolvedValue([] as never);
    mockCreateComment.mockResolvedValue(commentFixture({ content: '@Ada' }) as never);

    const { container, user } = renderWithProviders(
      <TaskComments
        taskId="task-1"
        projectId="project-1"
        members={[{ userId: 'user-1' }, { userId: 'user-2' }]}
        userMap={userMap}
        isAdmin={false}
      />,
    );

    await screen.findByText(i18n.t('tasks.comments.empty'));
    const editor = container.querySelector('[contenteditable="true"]') as HTMLElement;
    setEditorText(editor, '@Ada');
    await user.click(screen.getByTitle(i18n.t('tasks.comments.send')));

    await waitFor(() => expect(mockCreateComment).toHaveBeenCalledWith('task-1', '@Ada'));
    expect(await screen.findByText('@Ada')).toBeInTheDocument();
  });

  it('renders mentions, forwards task mention clicks, edits comments and cancels edit mode', async () => {
    const onTaskClick = jest.fn();
    mockGetComments.mockResolvedValue([
      commentFixture({ content: 'See #{task-2:Secondary task} and @{user-2:Grace Hopper}', editedAt: '2026-09-03T09:10:00Z' }),
    ] as never);
    mockUpdateComment.mockResolvedValue(commentFixture({
      content: 'Updated body',
      editedAt: '2026-09-03T09:11:00Z',
    }) as never);

    const { container, user } = renderWithProviders(
      <TaskComments
        taskId="task-1"
        projectId="project-1"
        members={[{ userId: 'user-1' }, { userId: 'user-2' }]}
        userMap={userMap}
        isAdmin={false}
        onTaskClick={onTaskClick}
      />,
    );

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    await user.click(screen.getByText('#Secondary task'));
    expect(onTaskClick).toHaveBeenCalledWith('task-2');
    expect(screen.getByText('@Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText(`(${i18n.t('tasks.comments.edited')})`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: i18n.t('tasks.comments.edit') }));
    let editor = container.querySelector('[contenteditable="true"]') as HTMLElement;
    setEditorText(editor, 'Updated body');
    await user.click(screen.getByTitle(i18n.t('common.save')));

    await waitFor(() => expect(mockUpdateComment).toHaveBeenCalledWith('comment-1', 'Updated body'));
    expect(await screen.findByText('Updated body')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: i18n.t('tasks.comments.edit') }));
    editor = container.querySelector('[contenteditable="true"]') as HTMLElement;
    setEditorText(editor, 'Discard me');
    await user.click(screen.getByTitle(i18n.t('common.cancel')));
    expect(screen.queryByText('Discard me')).not.toBeInTheDocument();
  });

  it('deletes comments and surfaces API errors', async () => {
    mockGetComments.mockResolvedValue([commentFixture()] as never);
    mockDeleteComment.mockRejectedValueOnce(new Error('boom'));

    const failing = renderWithProviders(
      <TaskComments
        taskId="task-1"
        projectId="project-1"
        members={[{ userId: 'user-1' }, { userId: 'user-2' }]}
        userMap={userMap}
        isAdmin
      />,
    );
    const { user } = failing;

    expect(await screen.findByText('Initial comment')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: i18n.t('tasks.comments.delete') }));
    await user.click(screen.getByRole('button', { name: i18n.t('common.delete') }));
    expect(await screen.findByText(i18n.t('tasks.comments.error'))).toBeInTheDocument();
    failing.unmount();

    mockGetComments.mockResolvedValue([commentFixture()] as never);
    mockDeleteComment.mockResolvedValueOnce({} as never);
    mockCreateComment.mockRejectedValueOnce(new Error('boom'));

    const success = renderWithProviders(
      <TaskComments
        taskId="task-1"
        projectId="project-1"
        members={[{ userId: 'user-1' }, { userId: 'user-2' }]}
        userMap={userMap}
        isAdmin
      />,
    );

    expect(await screen.findByText('Initial comment')).toBeInTheDocument();

    await success.user.click(screen.getByRole('button', { name: i18n.t('tasks.comments.delete') }));
    await success.user.click(screen.getByRole('button', { name: i18n.t('common.delete') }));
    await waitFor(() => expect(mockDeleteComment).toHaveBeenCalledWith('comment-1'));

    mockGetComments.mockResolvedValue([] as never);
    const editor = success.container.querySelector('[contenteditable="true"]') as HTMLElement;
    setEditorText(editor, 'Fail create');
    await success.user.click(screen.getByTitle(i18n.t('tasks.comments.send')));
    expect(await screen.findByText(i18n.t('tasks.comments.error'))).toBeInTheDocument();
  });
});
