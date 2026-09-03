import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import PokerRoomPage from './PokerRoomPage';
import { renderWithProviders } from '../../../test/testUtils';
import { pokerApi } from '../../../api/poker';
import { tasksApi } from '../../../api/tasks';
import { useAuthStore } from '../../../store/authStore';
import { usePokerSocket } from '../../../hooks/usePokerSocket';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useProjectMembers } from '../../../hooks/useProjectMembers';
import { userFixture, userSummaryFixture } from '../../../test/fixtures';
import type { PokerRound, PokerSession, Task } from '../../../types';
import i18n from '../../../i18n';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
jest.mock('../../../api/poker', () => ({
  pokerApi: {
    getSession: jest.fn(),
    getRounds: jest.fn(),
    joinSession: jest.fn(),
    leaveSession: jest.fn(),
    closeSession: jest.fn(),
    updateTimer: jest.fn(),
    selectTask: jest.fn(),
    startRound: jest.fn(),
  },
}));
jest.mock('../../../api/tasks', () => ({
  tasksApi: {
    getById: jest.fn(),
    getSubtasks: jest.fn(),
  },
}));
jest.mock('../../../hooks/usePokerSocket', () => ({ usePokerSocket: jest.fn() }));
jest.mock('../../../hooks/useProjectMember', () => ({ useProjectMember: jest.fn() }));
jest.mock('../../../hooks/useProjectMembers', () => ({ useProjectMembers: jest.fn() }));
jest.mock('../../../components/poker/LobbyParticipants', () => ({
  __esModule: true,
  default: ({ participants, voteStatus, isVoting }: any) => (
    <div>
      lobby-{participants.length}-{isVoting ? 'voting' : 'lobby'}
      {voteStatus && <span>votes-{Object.keys(voteStatus).length}</span>}
    </div>
  ),
}));
jest.mock('../../../components/poker/VotingCards', () => ({
  __esModule: true,
  default: ({ onVote, disabled, lockedMessage }: any) => (
    <div>
      <button onClick={() => onVote('8')} disabled={disabled}>Vote 8</button>
      {lockedMessage && <span>{lockedMessage}</span>}
    </div>
  ),
}));
jest.mock('../../../components/poker/VoteResults', () => ({
  __esModule: true,
  default: ({ round, onAccept, onRevote }: any) => (
    <div>
      <span>results-{round.taskTitle}</span>
      <button onClick={() => onAccept(8)}>Accept estimate</button>
      <button onClick={onRevote}>Re-vote</button>
    </div>
  ),
}));
jest.mock('../../../components/poker/RoundHistory', () => ({
  __esModule: true,
  default: ({ rounds }: any) => <div>history-{rounds.length}</div>,
}));
jest.mock('../../../components/poker/SelectTaskModal', () => ({
  __esModule: true,
  default: ({ onSelect, onClose }: any) => (
    <div>
      <span>Select task modal</span>
      <button onClick={() => onSelect({
        id: 'task-2',
        projectId: 'project-1',
        title: 'Selected by modal',
        description: 'Picked from modal',
        status: 'TODO',
        priority: 'HIGH',
        type: 'TASK',
        reporterId: 'user-1',
        assigneeId: 'user-2',
        completedAt: null,
        storyPoints: 3,
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
      })}>Pick task</button>
      <button onClick={onClose}>Close task modal</button>
    </div>
  ),
}));
jest.mock('../../../components/poker/JoinSessionModal', () => ({
  __esModule: true,
  default: ({ displayName, availableRoles, defaultRole, onJoin, onClose }: any) => (
    <div>
      <span>join-{displayName}</span>
      <span>roles-{availableRoles.join(',')}</span>
      <button onClick={() => onJoin(defaultRole)}>Join default</button>
      <button onClick={onClose}>Close join</button>
    </div>
  ),
}));

const mockGetSession = jest.mocked(pokerApi.getSession);
const mockGetRounds = jest.mocked(pokerApi.getRounds);
const mockJoinSession = jest.mocked(pokerApi.joinSession);
const mockLeaveSession = jest.mocked(pokerApi.leaveSession);
const mockCloseSession = jest.mocked(pokerApi.closeSession);
const mockUpdateTimer = jest.mocked(pokerApi.updateTimer);
const mockSelectTask = jest.mocked(pokerApi.selectTask);
const mockStartRound = jest.mocked(pokerApi.startRound);
const mockGetTaskById = jest.mocked(tasksApi.getById);
const mockGetSubtasks = jest.mocked(tasksApi.getSubtasks);
const mockUsePokerSocket = jest.mocked(usePokerSocket);
const mockUseProjectMember = jest.mocked(useProjectMember);
const mockUseProjectMembers = jest.mocked(useProjectMembers);

type MockSocketState = ReturnType<typeof usePokerSocket>;
let socketState: MockSocketState;

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Estimate login flow',
    description: 'Task description',
    status: 'TODO',
    priority: 'MEDIUM',
    type: 'STORY',
    reporterId: 'user-1',
    assigneeId: 'user-2',
    completedAt: null,
    storyPoints: 5,
    ready: false,
    position: 0,
    labels: [],
    subtaskCount: 0,
    completedSubtaskCount: 0,
    definitionOfDone: 'Ready',
    blockedByCount: 0,
    blocksCount: 0,
    gitEventCount: 0,
    createdAt: '2026-09-03',
    updatedAt: '2026-09-03',
    ...overrides,
  };
}

function sessionFixture(overrides: Partial<PokerSession> = {}): PokerSession {
  return {
    id: 'session-1',
    projectId: 'project-1',
    name: 'Sprint estimation',
    status: 'LOBBY',
    deck: 'FIBONACCI',
    createdBy: 'user-1',
    currentTaskId: null,
    timerSeconds: 60,
    participants: [{
      id: 'p1',
      userId: 'user-1',
      displayName: 'Ada Lovelace',
      role: 'MODERATOR',
      connected: true,
      joinedAt: '2026-09-03T09:00:00Z',
    }],
    createdAt: '2026-09-03T09:00:00Z',
    updatedAt: '2026-09-03T09:00:00Z',
    ...overrides,
  };
}

function roundFixture(overrides: Partial<PokerRound> = {}): PokerRound {
  return {
    id: 'round-1',
    taskId: 'task-1',
    taskTitle: 'Estimate login flow',
    status: 'VOTING',
    finalEstimate: null,
    votes: [{ userId: 'user-1', value: '8', votedAt: '2026-09-03T09:05:00Z' }],
    startedAt: '2026-09-03T09:04:00Z',
    revealedAt: null,
    timerEndsAt: '2026-09-03T12:45:00Z',
    ...overrides,
  };
}

describe('PokerRoomPage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    sessionStorage.clear();
    await i18n.changeLanguage('en');
    useAuthStore.setState({ user: userFixture({ id: 'user-1', fullName: 'Ada Lovelace', username: 'ada' }) });
    socketState = {
      connected: true,
      voteStatus: {},
      setVoteStatus: jest.fn(),
      revealedRound: null,
      sessionState: null,
      participantUpdate: null,
      sendVote: jest.fn(),
      sendReveal: jest.fn(),
      sendNext: jest.fn(),
      sendRevote: jest.fn(),
      error: null,
      onReconnectRef: { current: null },
    };
    mockUsePokerSocket.mockImplementation(() => socketState);
    mockUseProjectMember.mockReturnValue({
      member: { id: 'tm-1', userId: 'user-1', role: 'ADMIN', scrumRole: 'SCRUM_MASTER', joinedAt: '2026-09-03' },
      loading: false,
      isAdmin: true,
      isScrumMaster: true,
      isProductOwner: false,
      isDeveloper: false,
      canCreateTask: true,
      canEditBacklogTask: true,
      canEditSprintTask: true,
      canDeleteBacklogTask: true,
      canDeleteSprintTask: true,
      canMoveTask: true,
      canPlanSprint: true,
      canAddToActiveSprint: true,
      canManageSprint: true,
      canCreatePokerSession: true,
    });
    mockUseProjectMembers.mockReturnValue({
      members: [],
      userMap: {
        'user-1': userSummaryFixture({ id: 'user-1', fullName: 'Ada Lovelace', username: 'ada' }),
        'user-2': userSummaryFixture({ id: 'user-2', fullName: 'Grace Hopper', username: 'grace' }),
      },
      loading: false,
    });
    mockLeaveSession.mockResolvedValue({} as never);
    mockUpdateTimer.mockResolvedValue(sessionFixture() as never);
    mockSelectTask.mockResolvedValue(sessionFixture({ currentTaskId: 'task-2' }) as never);
    mockStartRound.mockResolvedValue(roundFixture() as never);
    mockCloseSession.mockResolvedValue(sessionFixture({ status: 'CLOSED' }) as never);
    mockGetSubtasks.mockResolvedValue([] as never);
  });

  it('shows load errors when the initial fetch fails', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('boom'));
    mockGetRounds.mockRejectedValueOnce(new Error('boom'));

    renderWithProviders(<PokerRoomPage />, {
      route: '/workspaces/workspace-1/projects/project-1/poker/session-1',
      path: '/workspaces/:workspaceId/projects/:projectId/poker/:sessionId',
    });

    expect(await screen.findByText(i18n.t('poker.room.loadError'))).toBeInTheDocument();
  });

  it('opens the join modal for a new participant and joins with the default role', async () => {
    mockGetSession.mockResolvedValue(sessionFixture({
      participants: [{
        id: 'p2',
        userId: 'user-2',
        displayName: 'Grace Hopper',
        role: 'VOTER',
        connected: true,
        joinedAt: '2026-09-03T09:00:00Z',
      }],
    }) as never);
    mockGetRounds.mockResolvedValue([] as never);
    mockJoinSession.mockResolvedValue({} as never);

    const { user } = renderWithProviders(<PokerRoomPage />, {
      route: '/workspaces/workspace-1/projects/project-1/poker/session-1',
      path: '/workspaces/:workspaceId/projects/:projectId/poker/:sessionId',
    });

    expect(await screen.findByText('join-Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('roles-MODERATOR,OBSERVER')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Join default' }));

    await waitFor(() => expect(mockJoinSession).toHaveBeenCalledWith('session-1', {
      displayName: 'Ada Lovelace',
      role: 'MODERATOR',
    }));
  });

  it('rejoins disconnected moderators, restores the pending task, updates timer and starts voting', async () => {
    mockGetSession
      .mockResolvedValueOnce(sessionFixture({
        currentTaskId: 'task-1',
        participants: [{
          id: 'p1',
          userId: 'user-1',
          displayName: 'Ada Lovelace',
          role: 'MODERATOR',
          connected: false,
          joinedAt: '2026-09-03T09:00:00Z',
        }],
      }) as never)
      .mockResolvedValueOnce(sessionFixture({
        currentTaskId: 'task-1',
        participants: [{
          id: 'p1',
          userId: 'user-1',
          displayName: 'Ada Lovelace',
          role: 'MODERATOR',
          connected: true,
          joinedAt: '2026-09-03T09:00:00Z',
        }],
      }) as never);
    mockGetRounds.mockResolvedValue([] as never);
    mockGetTaskById.mockResolvedValue(taskFixture() as never);
    mockJoinSession.mockResolvedValue({} as never);

    const { user } = renderWithProviders(<PokerRoomPage />, {
      route: '/workspaces/workspace-1/projects/project-1/poker/session-1',
      path: '/workspaces/:workspaceId/projects/:projectId/poker/:sessionId',
    });

    expect(await screen.findByText('Estimate login flow')).toBeInTheDocument();
    await waitFor(() => expect(mockJoinSession).toHaveBeenCalledWith('session-1', {
      displayName: 'Ada Lovelace',
      role: 'MODERATOR',
    }));

    await user.selectOptions(screen.getByRole('combobox'), '120');
    expect(mockUpdateTimer).toHaveBeenCalledWith('session-1', 120);

    await user.click(screen.getByRole('button', { name: i18n.t('poker.room.startVoting') }));
    await waitFor(() => expect(mockStartRound).toHaveBeenCalledWith('session-1', {
      taskId: 'task-1',
      taskTitle: 'Estimate login flow',
    }));
  });

  it('renders revealed results and delegates accept, revote, leave and close actions', async () => {
    const revealed = roundFixture({ status: 'REVEALED', finalEstimate: 5, revealedAt: '2026-09-03T09:10:00Z' });
    mockGetSession.mockResolvedValue(sessionFixture({ status: 'REVEALED' }) as never);
    mockGetRounds.mockResolvedValue([revealed] as never);
    mockGetTaskById.mockResolvedValue(taskFixture() as never);
    socketState.revealedRound = revealed;
    socketState.sessionState = { ...sessionFixture({ status: 'REVEALED' }) };
    socketState.error = 'Socket warning';

    const { user } = renderWithProviders(<PokerRoomPage />, {
      route: '/workspaces/workspace-1/projects/project-1/poker/session-1',
      path: '/workspaces/:workspaceId/projects/:projectId/poker/:sessionId',
    });

    expect(await screen.findByText('results-Estimate login flow')).toBeInTheDocument();
    expect(screen.getByText('history-1')).toBeInTheDocument();
    expect(screen.getByText('Socket warning')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Accept estimate' }));
    expect(socketState.sendNext).toHaveBeenCalledWith(8);

    await user.click(screen.getByRole('button', { name: 'Re-vote' }));
    expect(socketState.sendRevote).toHaveBeenCalled();
  });

  it('renders the voting state for voters, persists the vote and lets users leave', async () => {
    mockUseProjectMember.mockReturnValue({
      member: { id: 'tm-1', userId: 'user-1', role: 'MEMBER', scrumRole: 'DEVELOPER', joinedAt: '2026-09-03' },
      loading: false,
      isAdmin: false,
      isScrumMaster: false,
      isProductOwner: false,
      isDeveloper: true,
      canCreateTask: false,
      canEditBacklogTask: false,
      canEditSprintTask: true,
      canDeleteBacklogTask: false,
      canDeleteSprintTask: true,
      canMoveTask: true,
      canPlanSprint: true,
      canAddToActiveSprint: true,
      canManageSprint: false,
      canCreatePokerSession: false,
    });
    mockGetSession.mockResolvedValue(sessionFixture({
      status: 'VOTING',
      participants: [{
        id: 'p1',
        userId: 'user-1',
        displayName: 'Ada Lovelace',
        role: 'VOTER',
        connected: true,
        joinedAt: '2026-09-03T09:00:00Z',
      }],
    }) as never);
    mockGetRounds.mockResolvedValue([roundFixture()] as never);
    mockGetTaskById.mockResolvedValue(taskFixture() as never);

    const { user } = renderWithProviders(<PokerRoomPage />, {
      route: '/workspaces/workspace-1/projects/project-1/poker/session-1',
      path: '/workspaces/:workspaceId/projects/:projectId/poker/:sessionId',
    });

    expect(await screen.findByText('Estimate login flow')).toBeInTheDocument();
    expect(screen.queryByText('00:00')).not.toBeInTheDocument();
    expect(screen.getByText('lobby-1-voting')).toBeInTheDocument();

    await act(async () => {
      screen.getByRole('button', { name: 'Vote 8' }).click();
    });
    expect(sessionStorage.getItem('poker_vote_session-1')).toBe('8');

    await user.click(screen.getByRole('button', { name: i18n.t('poker.room.leave') }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/workspaces/workspace-1/projects/project-1/poker'));
  });
});
