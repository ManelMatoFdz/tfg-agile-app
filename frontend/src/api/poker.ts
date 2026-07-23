import pokerClient from './pokerClient';
import type {
  PokerSession,
  PokerParticipant,
  PokerRound,
  SessionStatus,
  DeckType,
  ParticipantRole,
} from '../types';

export interface CreateSessionDto {
  name: string;
  deck?: DeckType;
  timerSeconds?: number | null;
}

export interface JoinSessionDto {
  displayName: string;
  role?: ParticipantRole;
}

export interface StartRoundDto {
  taskId: string;
  taskTitle: string;
}

export const pokerApi = {
  createSession: (projectId: string, dto: CreateSessionDto) =>
    pokerClient.post<PokerSession>(`/projects/${projectId}/poker/sessions`, dto).then((r) => r.data),

  listSessions: (projectId: string) =>
    pokerClient.get<PokerSession[]>(`/projects/${projectId}/poker/sessions`).then((r) => r.data),

  getSession: (sessionId: string) =>
    pokerClient.get<PokerSession>(`/poker/sessions/${sessionId}`).then((r) => r.data),

  joinSession: (sessionId: string, dto: JoinSessionDto) =>
    pokerClient.post<PokerParticipant>(`/poker/sessions/${sessionId}/join`, dto).then((r) => r.data),

  leaveSession: (sessionId: string) =>
    pokerClient.post<void>(`/poker/sessions/${sessionId}/leave`),

  closeSession: (sessionId: string) =>
    pokerClient.post<PokerSession>(`/poker/sessions/${sessionId}/close`).then((r) => r.data),

  updateTimer: (sessionId: string, timerSeconds: number | null) =>
    pokerClient.post<PokerSession>(`/poker/sessions/${sessionId}/timer`, { timerSeconds }).then((r) => r.data),

  selectTask: (sessionId: string, taskId: string) =>
    pokerClient.post<PokerSession>(`/poker/sessions/${sessionId}/select-task`, { taskId }).then((r) => r.data),

  startRound: (sessionId: string, dto: StartRoundDto) =>
    pokerClient.post<PokerRound>(`/poker/sessions/${sessionId}/rounds`, dto).then((r) => r.data),

  getRounds: (sessionId: string) =>
    pokerClient.get<PokerRound[]>(`/poker/sessions/${sessionId}/rounds`).then((r) => r.data),
};