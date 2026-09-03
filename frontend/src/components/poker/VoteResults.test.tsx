import { screen } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';
import VoteResults from './VoteResults';
import { renderWithProviders } from '../../test/testUtils';
import { userSummaryFixture } from '../../test/fixtures';
import type { PokerParticipant, PokerRound, Task } from '../../types';
import i18n from '../../i18n';

jest.mock('../kanban/AssigneePicker', () => ({
  AssigneeAvatar: ({ name }: { name: string }) => <span>{name}</span>,
}));

const participants: PokerParticipant[] = [
  { id: 'p1', userId: 'u1', displayName: 'Ada', role: 'VOTER', connected: true, joinedAt: '2026-01-01' },
  { id: 'p2', userId: 'u2', displayName: 'Bob', role: 'VOTER', connected: true, joinedAt: '2026-01-01' },
  { id: 'p3', userId: 'u3', displayName: 'Carol', role: 'OBSERVER', connected: true, joinedAt: '2026-01-01' },
];

function roundFixture(overrides: Partial<PokerRound> = {}): PokerRound {
  return {
    id: 'round-1',
    taskId: 'task-1',
    taskTitle: 'Implement review flow',
    status: 'REVEALED',
    finalEstimate: null,
    votes: [
      { userId: 'u1', value: '3', votedAt: '2026-01-01T00:00:00Z' },
      { userId: 'u2', value: '3', votedAt: '2026-01-01T00:00:00Z' },
    ],
    startedAt: '2026-01-01T00:00:00Z',
    revealedAt: '2026-01-01T00:01:00Z',
    timerEndsAt: null,
    ...overrides,
  };
}

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Implement review flow',
    description: 'Persist the chosen estimate',
    status: 'TODO',
    priority: 'HIGH',
    type: 'STORY',
    reporterId: 'u1',
    assigneeId: 'u1',
    completedAt: null,
    storyPoints: 5,
    ready: false,
    position: 0,
    labels: [{ id: 'l1', name: 'Poker', color: '#2563EB' }],
    subtaskCount: 2,
    completedSubtaskCount: 1,
    definitionOfDone: 'Saved to the task',
    blockedByCount: 0,
    blocksCount: 0,
    gitEventCount: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('VoteResults', () => {
  it('renders consensus details and saves the mode by default', async () => {
    const onAccept = jest.fn();
    const { user } = renderWithProviders(
      <VoteResults
        round={roundFixture()}
        participants={participants}
        isFacilitator
        onAccept={onAccept}
        onRevote={jest.fn()}
        task={taskFixture()}
        subtasks={[
          taskFixture({ id: 'st-1', title: 'Wire the button', completedAt: '2026-01-02T00:00:00Z' }),
          taskFixture({ id: 'st-2', title: 'Persist estimate', completedAt: null }),
        ]}
        userMap={{ u1: userSummaryFixture({ id: 'u1', fullName: 'Ada Lovelace' }) }}
      />,
    );

    expect(screen.getByText(i18n.t('poker.room.consensus'))).toBeInTheDocument();
    expect(screen.getByText('Persist the chosen estimate')).toBeInTheDocument();
    expect(screen.getByText('Poker')).toBeInTheDocument();
    expect(screen.getByText('Wire the button')).toBeInTheDocument();
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: i18n.t('poker.room.saveToTask') }));
    expect(onAccept).toHaveBeenCalledWith(3);
  });

  it('highlights extreme voters, accepts a custom estimate and supports moderator actions', async () => {
    const onAccept = jest.fn();
    const onRevote = jest.fn();
    const { user } = renderWithProviders(
      <VoteResults
        round={roundFixture({
          votes: [
            { userId: 'u1', value: '2', votedAt: '2026-01-01T00:00:00Z' },
            { userId: 'u2', value: '13', votedAt: '2026-01-01T00:00:00Z' },
          ],
        })}
        participants={participants}
        isFacilitator
        onAccept={onAccept}
        onRevote={onRevote}
      />,
    );

    expect(screen.getByText(i18n.t('poker.room.extremeVotersTitle'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('poker.room.extremeHigh', { names: 'Bob', value: 13 }))).toBeInTheDocument();

    await user.type(screen.getByRole('spinbutton'), '8');
    await user.click(screen.getByRole('button', { name: i18n.t('poker.room.saveToTask') }));
    expect(onAccept).toHaveBeenCalledWith(8);

    await user.click(screen.getByRole('button', { name: i18n.t('poker.room.revote') }));
    expect(onRevote).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));
    expect(onAccept).toHaveBeenLastCalledWith(null);
  });

  it('keeps moderator controls disabled for non facilitators', () => {
    renderWithProviders(
      <VoteResults
        round={roundFixture()}
        participants={participants}
        isFacilitator={false}
        onAccept={jest.fn()}
        onRevote={jest.fn()}
      />,
    );

    expect(screen.getByRole('spinbutton')).toBeDisabled();
    expect(screen.queryByRole('button', { name: i18n.t('poker.room.saveToTask') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('poker.room.revote') })).not.toBeInTheDocument();
  });
});
