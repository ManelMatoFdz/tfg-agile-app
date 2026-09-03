import { render, screen } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';
import VotingCards from './VotingCards';
import ParticipantsList from './ParticipantsList';
import RoundHistory from './RoundHistory';
import CreateSessionModal from './CreateSessionModal';
import JoinSessionModal from './JoinSessionModal';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import type { PokerParticipant, PokerRound } from '../../types';

describe('VotingCards', () => {
  it('renders the selected deck and sends votes', async () => {
    const vote = jest.fn();
    const { user } = renderWithProviders(<VotingCards deck="T_SHIRT" selectedValue="M" onVote={vote} />);
    await user.click(screen.getByRole('button', { name: 'XL' }));
    expect(vote).toHaveBeenCalledWith('XL');
  });

  it('disables voting and displays the lock reason', () => {
    renderWithProviders(<VotingCards deck="FIBONACCI" selectedValue={null} onVote={jest.fn()} disabled lockedMessage="Round locked" />);
    expect(screen.getByText('Round locked')).toBeInTheDocument();
    expect(screen.getAllByRole('button')[0]).toBeDisabled();
  });
});

describe('ParticipantsList', () => {
  const participants = [
    { id: 'p1', userId: 'u1', displayName: 'Ada', role: 'VOTER', connected: true },
    { id: 'p2', userId: 'u2', displayName: 'Bob', role: 'OBSERVER', connected: false },
  ] as PokerParticipant[];

  it('separates voters and observers and marks the current user', () => {
    renderWithProviders(<ParticipantsList participants={participants} voteStatus={{ u1: true }} currentUserId="u1" />);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText(/you/i)).toBeInTheDocument();
  });
});

describe('RoundHistory', () => {
  it('hides when there are no completed estimates', () => {
    const { container } = render(<RoundHistory rounds={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only consensus rounds with estimates', () => {
    const rounds = [
      { id: 'r1', taskTitle: 'Task one', status: 'CONSENSUS', finalEstimate: 8 },
      { id: 'r2', taskTitle: 'Task two', status: 'VOTING', finalEstimate: null },
    ] as PokerRound[];
    renderWithProviders(<RoundHistory rounds={rounds} />);
    expect(screen.getByText('Task one')).toBeInTheDocument();
    expect(screen.queryByText('Task two')).not.toBeInTheDocument();
    expect(screen.getByText('8 SP')).toBeInTheDocument();
  });
});

describe('planning-poker forms', () => {
  it('creates a trimmed session with the selected deck and closes the modal', async () => {
    const onCreate = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { user } = renderWithProviders(<CreateSessionModal onClose={onClose} onCreate={onCreate} />);
    const submitLabel = i18n.t('poker.create.submit');

    expect(screen.getByRole('button', { name: submitLabel })).toBeDisabled();
    await user.type(screen.getByRole('textbox'), '  Refinamiento semanal  ');
    await user.selectOptions(screen.getByRole('combobox'), 'T_SHIRT');
    await user.click(screen.getByRole('button', { name: submitLabel }));

    expect(onCreate).toHaveBeenCalledWith('Refinamiento semanal', 'T_SHIRT');
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the create modal open and reports a rejected request', async () => {
    const onCreate = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('network'));
    const onClose = jest.fn();
    const { user } = renderWithProviders(<CreateSessionModal onClose={onClose} onCreate={onCreate} />);
    const submitLabel = i18n.t('poker.create.submit');

    await user.type(screen.getByRole('textbox'), 'Session');
    await user.click(screen.getByRole('button', { name: submitLabel }));

    expect(await screen.findByText(i18n.t('poker.create.error'))).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('joins with the role selected by the user', async () => {
    const onJoin = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const { user } = renderWithProviders(
      <JoinSessionModal
        onClose={jest.fn()}
        onJoin={onJoin}
        displayName="Ada"
        availableRoles={['VOTER', 'OBSERVER']}
        defaultRole="VOTER"
      />,
    );

    await user.click(screen.getByRole('button', { name: i18n.t('poker.roles.OBSERVER') }));
    await user.click(screen.getByRole('button', { name: i18n.t('poker.join.submit') }));
    expect(onJoin).toHaveBeenCalledWith('OBSERVER');
  });

  it('reports a failed join and supports closing from cancel', async () => {
    const onJoin = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('network'));
    const onClose = jest.fn();
    const { user } = renderWithProviders(
      <JoinSessionModal
        onClose={onClose}
        onJoin={onJoin}
        displayName="Ada"
        availableRoles={['VOTER']}
        defaultRole="VOTER"
      />,
    );

    await user.click(screen.getByRole('button', { name: i18n.t('poker.join.submit') }));
    expect(await screen.findByText(i18n.t('poker.join.error'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));
    expect(onClose).toHaveBeenCalled();
  });
});
