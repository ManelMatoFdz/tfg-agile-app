import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import CreateTaskModal from './CreateTaskModal';
import SubtaskModal from './SubtaskModal';
import { renderWithProviders } from '../../test/testUtils';
import { teamMemberFixture, userSummaryFixture } from '../../test/fixtures';
import { tasksApi } from '../../api/tasks';
import { labelsApi } from '../../api/labels';
import { epicsApi } from '../../api/epics';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import type { BoardColumn, Epic, Label, Task, TeamMember, UserSummary } from '../../types';
import i18n from '../../i18n';

jest.mock('../../api/tasks', () => ({ tasksApi: {
  create: jest.fn(), update: jest.fn(), toggleSubtaskDone: jest.fn(), delete: jest.fn(),
} }));
jest.mock('../../api/labels', () => ({ labelsApi: { getByProject: jest.fn() } }));
jest.mock('../../api/epics', () => ({ epicsApi: { getByProject: jest.fn(), assignToTask: jest.fn() } }));
jest.mock('../../hooks/useProjectMembers', () => ({ useProjectMembers: jest.fn() }));
jest.mock('../../hooks/useBoardColumns', () => ({ getStatusColor: jest.fn(() => '#2563EB') }));
jest.mock('./AssigneePicker', () => ({
  AssigneeDropdown: ({ value, onChange, members, userMap, placeholder }: {
    value: string;
    onChange: (value: string) => void;
    members: TeamMember[];
    userMap: Record<string, UserSummary>;
    placeholder: string;
  }) => (
    <select aria-label="assignee-dropdown" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {members.map((member) => (
        <option key={member.userId} value={member.userId}>
          {userMap[member.userId]?.fullName ?? member.userId}
        </option>
      ))}
    </select>
  ),
  AssigneeAvatar: ({ name }: { name: string }) => <span>{name}</span>,
}));
jest.mock('./LabelPicker', () => ({
  LabelMultiSelect: ({ labels, onChange }: {
    labels: Label[];
    onChange: (selected: string[]) => void;
  }) => (
    <button type="button" onClick={() => onChange(labels.map((label) => label.id))}>
      Select labels
    </button>
  ),
}));
jest.mock('./EpicPicker', () => ({
  EpicDropdown: ({ value, onChange, epics, placeholder }: {
    value: string;
    onChange: (value: string) => void;
    epics: Epic[];
    placeholder: string;
  }) => (
    <select aria-label="epic-dropdown" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {epics.map((epic) => (
        <option key={epic.id} value={epic.id}>{epic.name}</option>
      ))}
    </select>
  ),
}));

const createTask = jest.mocked(tasksApi.create);
const updateTask = jest.mocked(tasksApi.update);
const toggleSubtaskDone = jest.mocked(tasksApi.toggleSubtaskDone);
const deleteTask = jest.mocked(tasksApi.delete);
const getLabels = jest.mocked(labelsApi.getByProject);
const getEpics = jest.mocked(epicsApi.getByProject);
const assignToTask = jest.mocked(epicsApi.assignToTask);
const mockedUseProjectMembers = jest.mocked(useProjectMembers);

const projectLabels: Label[] = [
  { id: 'label-1', name: 'Backend', color: '#2563EB' },
  { id: 'label-2', name: 'Urgent', color: '#DC2626' },
];

const projectEpics: Epic[] = [{
  id: 'epic-1',
  projectId: 'project-1',
  name: 'Q4 milestone',
  description: null,
  color: '#7C3AED',
  status: 'OPEN',
  startDate: null,
  targetDate: null,
  createdBy: 'user-1',
  totalTasks: 0,
  doneTasks: 0,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}];

const userMap = {
  'user-2': userSummaryFixture({ id: 'user-2', username: 'ada', fullName: 'Ada Lovelace' }),
};

const columns: BoardColumn[] = [
  { id: 'c1', name: 'TODO', position: 0, color: '#2563EB', wipLimit: null, doneEquivalent: false },
  { id: 'c2', name: 'DONE', position: 1, color: '#16A34A', wipLimit: null, doneEquivalent: true },
];

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Existing task',
    description: 'Current description',
    status: 'TODO',
    priority: 'MEDIUM',
    type: 'TASK',
    reporterId: 'user-1',
    assigneeId: 'user-2',
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

describe('kanban modals coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseProjectMembers.mockReturnValue({
      members: [teamMemberFixture({ userId: 'user-2' })],
      userMap,
      loading: false,
    });
    getLabels.mockResolvedValue(projectLabels);
    getEpics.mockResolvedValue(projectEpics);
    assignToTask.mockResolvedValue(taskFixture());
  });

  it('creates a root task, trims fields and assigns the selected epic', async () => {
    const onCreated = jest.fn();
    const created = taskFixture({ id: 'task-created', title: 'Ship auth tests', type: 'STORY' });
    createTask.mockResolvedValue(created);

    const { user } = renderWithProviders(
      <CreateTaskModal projectId="project-1" defaultType="TASK" onCreated={onCreated} onClose={jest.fn()} />,
    );

    await user.type(screen.getByPlaceholderText(i18n.t('tasks.modal.titlePlaceholder')), '  Ship auth tests  ');
    await user.type(screen.getByPlaceholderText(i18n.t('tasks.modal.descriptionPlaceholder')), '  Add regression coverage  ');
    await user.type(screen.getByPlaceholderText(i18n.t('tasks.modal.dodPlaceholder')), '  Green in CI  ');
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'HIGH');
    await user.selectOptions(screen.getByLabelText('assignee-dropdown'), 'user-2');
    await user.click(screen.getByRole('button', { name: i18n.t('tasks.type.STORY') }));
    await user.click(screen.getByRole('button', { name: 'Select labels' }));
    await user.selectOptions(screen.getByLabelText('epic-dropdown'), 'epic-1');
    await user.click(screen.getByRole('button', { name: i18n.t('tasks.modal.create') }));

    await waitFor(() => expect(createTask).toHaveBeenCalledWith('project-1', {
      title: 'Ship auth tests',
      description: 'Add regression coverage',
      priority: 'HIGH',
      type: 'STORY',
      assigneeId: 'user-2',
      labelIds: ['label-1', 'label-2'],
      definitionOfDone: 'Green in CI',
    }));
    expect(assignToTask).toHaveBeenCalledWith('task-created', 'epic-1');
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(screen.getByPlaceholderText(i18n.t('tasks.modal.titlePlaceholder'))).toHaveValue('');
    expect(screen.getByText(i18n.t('tasks.createModal.createdHint'))).toBeInTheDocument();
  });

  it('forces TASK type for subtasks and omits root-only fields', async () => {
    createTask.mockResolvedValue(taskFixture({ id: 'subtask-created', parentId: 'parent-1' }));

    const { user } = renderWithProviders(
      <CreateTaskModal projectId="project-1" parentId="parent-1" onCreated={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.queryByPlaceholderText(i18n.t('tasks.modal.dodPlaceholder'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('tasks.modal.epic'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('tasks.modal.type'))).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(i18n.t('tasks.modal.titlePlaceholder')), '  Child task  ');
    await user.click(screen.getByRole('button', { name: i18n.t('tasks.modal.create') }));

    await waitFor(() => expect(createTask).toHaveBeenCalled());
    const dto = createTask.mock.calls[0][1];
    expect(dto).toMatchObject({ title: 'Child task', type: 'TASK', parentId: 'parent-1' });
    expect(dto).not.toHaveProperty('definitionOfDone');
    expect(assignToTask).not.toHaveBeenCalled();
  });

  it('shows the translated error when task creation fails', async () => {
    createTask.mockRejectedValue(new Error('network'));

    const { user } = renderWithProviders(
      <CreateTaskModal projectId="project-1" onCreated={jest.fn()} onClose={jest.fn()} />,
    );

    await user.type(screen.getByPlaceholderText(i18n.t('tasks.modal.titlePlaceholder')), 'Broken task');
    await user.click(screen.getByRole('button', { name: i18n.t('tasks.modal.create') }));

    expect(await screen.findByText(i18n.t('tasks.modal.loadError'))).toBeInTheDocument();
  });

  it('saves subtask edits with trimmed text and nullable assignee', async () => {
    const onUpdated = jest.fn();
    const onClose = jest.fn();
    const updated = taskFixture({ title: 'Renamed subtask', assigneeId: null });
    updateTask.mockResolvedValue(updated);

    const { user } = renderWithProviders(
      <SubtaskModal subtask={taskFixture()} columns={columns} onClose={onClose} onUpdated={onUpdated} />,
    );

    const titleInput = screen.getByDisplayValue('Existing task');
    const descriptionInput = screen.getByDisplayValue('Current description');

    await user.clear(titleInput);
    await user.type(titleInput, '  Renamed subtask  ');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, '  Polished details  ');
    await user.selectOptions(screen.getByLabelText('assignee-dropdown'), '');
    await user.click(screen.getByRole('button', { name: i18n.t('tasks.modal.save') }));

    await waitFor(() => expect(updateTask).toHaveBeenCalledWith('task-1', {
      title: 'Renamed subtask',
      description: 'Polished details',
      priority: 'MEDIUM',
      assigneeId: null,
    }));
    expect(onUpdated).toHaveBeenCalledWith(updated);
    expect(onClose).toHaveBeenCalled();
  });

  it('toggles a subtask as done and closes the modal', async () => {
    const onUpdated = jest.fn();
    const onClose = jest.fn();
    const toggled = taskFixture({ completedAt: '2026-01-02T00:00:00Z' });
    toggleSubtaskDone.mockResolvedValue(toggled);

    const { user } = renderWithProviders(
      <SubtaskModal subtask={taskFixture()} columns={columns} onClose={onClose} onUpdated={onUpdated} />,
    );

    await user.click(screen.getByRole('button', { name: i18n.t('tasks.subtaskModal.markDone') }));

    await waitFor(() => expect(toggleSubtaskDone).toHaveBeenCalledWith('task-1'));
    expect(onUpdated).toHaveBeenCalledWith(toggled);
    expect(onClose).toHaveBeenCalled();
  });

  it('confirms and deletes a subtask', async () => {
    const onDeleted = jest.fn();
    const onClose = jest.fn();
    deleteTask.mockResolvedValue({} as never);

    const { user } = renderWithProviders(
      <SubtaskModal subtask={taskFixture()} columns={columns} onClose={onClose} onDeleted={onDeleted} />,
    );

    await user.click(screen.getByRole('button', { name: i18n.t('tasks.modal.deleteTask') }));
    await user.click(screen.getByRole('button', { name: i18n.t('common.delete') }));

    await waitFor(() => expect(deleteTask).toHaveBeenCalledWith('task-1'));
    expect(onDeleted).toHaveBeenCalledWith('task-1');
    expect(onClose).toHaveBeenCalled();
  });
});
