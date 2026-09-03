import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import SelectTaskModal from './SelectTaskModal';
import { renderWithProviders } from '../../test/testUtils';
import { tasksApi } from '../../api/tasks';
import type { Task } from '../../types';
import i18n from '../../i18n';

jest.mock('../../api/tasks', () => ({ tasksApi: { getByProject: jest.fn() } }));

const mockGetByProject = jest.mocked(tasksApi.getByProject);

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Estimate login flow',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    type: 'TASK',
    reporterId: 'u1',
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
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('SelectTaskModal', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('filters DONE tasks and subtasks, then closes after a successful selection', async () => {
    const onClose = jest.fn();
    const onSelect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    mockGetByProject.mockResolvedValue([
      taskFixture({ id: 'root-open', title: 'Open root', status: 'TODO', storyPoints: 8 }),
      taskFixture({ id: 'root-done', title: 'Done root', status: 'DONE' }),
      taskFixture({ id: 'child-open', title: 'Child task', parentId: 'parent-1' }),
    ]);

    const { user } = renderWithProviders(
      <SelectTaskModal projectId="project-1" onClose={onClose} onSelect={onSelect} />,
    );

    expect(await screen.findByText(i18n.t('poker.room.selectTask'))).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Open root/i })).toBeInTheDocument();
    expect(screen.queryByText('Done root')).not.toBeInTheDocument();
    expect(screen.queryByText('Child task')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open root/i }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'root-open' })));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the empty state when there are no selectable tasks', async () => {
    mockGetByProject.mockResolvedValue([
      taskFixture({ id: 'done', status: 'DONE' }),
      taskFixture({ id: 'subtask', parentId: 'parent-1' }),
    ]);

    renderWithProviders(<SelectTaskModal projectId="project-1" onClose={jest.fn()} onSelect={jest.fn()} />);

    expect(await screen.findByText(i18n.t('poker.room.noTasks'))).toBeInTheDocument();
  });

  it('keeps the modal open when onSelect fails and supports overlay close', async () => {
    const onClose = jest.fn();
    const onSelect = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('boom'));
    mockGetByProject.mockResolvedValue([taskFixture({ id: 'root-open', title: 'Open root' })]);

    const { user, container } = renderWithProviders(
      <SelectTaskModal projectId="project-1" onClose={onClose} onSelect={onSelect} />,
    );

    await screen.findByRole('button', { name: /Open root/i });
    await user.click(screen.getByRole('button', { name: /Open root/i }));
    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();

    await user.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });
});
