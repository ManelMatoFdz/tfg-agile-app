import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import SnapshotModal from './SnapshotModal';
import { renderWithProviders } from '../../test/testUtils';
import type { BoardColumn, SprintTaskSnapshot } from '../../types';
import i18n from '../../i18n';

function snapshotFixture(overrides: Partial<SprintTaskSnapshot> = {}): SprintTaskSnapshot {
  return {
    id: 'snapshot-1',
    sprintId: 'sprint-1',
    taskId: 'task-1',
    title: 'Harden webhook verification',
    description: 'Validate signatures before processing.',
    statusAtEnd: 'IN_REVIEW',
    priority: 'HIGH',
    type: 'TASK',
    parentTaskId: null,
    completedAt: null,
    storyPoints: 5,
    completed: false,
    returnedToBacklog: true,
    ...overrides,
  };
}

describe('SnapshotModal', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders snapshot metadata, banners and closes from the action button', async () => {
    const onClose = jest.fn();
    const columns: BoardColumn[] = [
      { id: 'col-1', name: 'IN_REVIEW', position: 1, color: '#7c3aed', wipLimit: null, doneEquivalent: false },
    ];

    renderWithProviders(
      <SnapshotModal
        snapshot={snapshotFixture()}
        onClose={onClose}
        columns={columns}
      />,
    );

    expect(screen.getByText(i18n.t('projects.sprints.report.snapshotBanner'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('projects.sprints.report.returnedBanner'))).toBeInTheDocument();
    expect(screen.getByText('Harden webhook verification')).toBeInTheDocument();
    expect(screen.getByText('Validate signatures before processing.')).toBeInTheDocument();
    expect(screen.getByText('5 pts')).toBeInTheDocument();
    expect(screen.getByText('IN REVIEW')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: i18n.t('common.close') });
    fireEvent.mouseEnter(closeButton);
    fireEvent.mouseLeave(closeButton);
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back for missing optional fields and closes on backdrop click', () => {
    const onClose = jest.fn();
    const { container } = renderWithProviders(
      <SnapshotModal
        snapshot={snapshotFixture({
          description: null,
          storyPoints: null,
          returnedToBacklog: false,
          statusAtEnd: 'DONE',
        })}
        onClose={onClose}
      />,
    );

    expect(screen.queryByText(i18n.t('projects.sprints.report.returnedBanner'))).not.toBeInTheDocument();
    expect(screen.getByText(i18n.t('tasks.status.DONE'))).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();

    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
