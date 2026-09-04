import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from '@jest/globals';
import LobbyParticipants from './LobbyParticipants';
import { renderWithProviders } from '../../test/testUtils';
import { userSummaryFixture } from '../../test/fixtures';
import type { PokerParticipant } from '../../types';
import i18n from '../../i18n';

function participantFixture(overrides: Partial<PokerParticipant> = {}): PokerParticipant {
  return {
    id: 'participant-1',
    userId: 'user-1',
    displayName: 'Ada Lovelace',
    role: 'MODERATOR',
    connected: true,
    joinedAt: '2026-09-04T09:00:00Z',
    ...overrides,
  };
}

describe('LobbyParticipants', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders lobby mode with split rows, avatars and the current user badge', () => {
    renderWithProviders(
      <LobbyParticipants
        participants={[
          participantFixture(),
          participantFixture({ id: 'participant-2', userId: 'user-2', displayName: 'Grace Hopper', role: 'VOTER' }),
          participantFixture({ id: 'participant-3', userId: 'user-3', displayName: 'Alan Turing', role: 'OBSERVER', connected: false }),
        ]}
        currentUserId="user-1"
        userMap={{
          'user-2': userSummaryFixture({ id: 'user-2', fullName: 'Grace Hopper', avatarUrl: '/avatars/grace.webp' }),
        }}
      />,
    );

    expect(screen.getByText(i18n.t('poker.room.planningPoker'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('poker.room.waitingForModerator'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('poker.room.youBadge'))).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Grace Hopper' })).toBeInTheDocument();
    expect(screen.getByText(i18n.t('poker.roles.MODERATOR'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('poker.roles.OBSERVER'))).toBeInTheDocument();
  });

  it('renders voting progress and check badges for voted participants', () => {
    renderWithProviders(
      <LobbyParticipants
        participants={[
          participantFixture({ role: 'VOTER' }),
          participantFixture({ id: 'participant-2', userId: 'user-2', displayName: 'Grace Hopper', role: 'VOTER' }),
          participantFixture({ id: 'participant-3', userId: 'user-3', displayName: 'Linus Torvalds', role: 'OBSERVER' }),
        ]}
        currentUserId="user-2"
        isVoting
        voteStatus={{ 'user-1': true, 'user-2': false }}
      />,
    );

    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('poker.room.votedProgress', { voted: 1, total: 2 }))).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('poker.room.youBadge'))).toBeInTheDocument();
  });
});
