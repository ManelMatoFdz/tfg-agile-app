import projectClient from './projectClient';
import type { Team, TeamMember } from '../types';

export const teamsApi = {
  list: (workspaceId: string) =>
    projectClient.get<Team[]>(`/workspaces/${workspaceId}/teams`),

  create: (workspaceId: string, data: { name: string; description?: string }) =>
    projectClient.post<Team>(`/workspaces/${workspaceId}/teams`, data),

  getById: (teamId: string) =>
    projectClient.get<Team>(`/teams/${teamId}`),

  update: (teamId: string, data: { name: string; description?: string }) =>
    projectClient.put<Team>(`/teams/${teamId}`, data),

  delete: (teamId: string) =>
    projectClient.delete(`/teams/${teamId}`),

  getMembers: (teamId: string) =>
    projectClient.get<TeamMember[]>(`/teams/${teamId}/members`),

  addMember: (teamId: string, userId: string) =>
    projectClient.post<TeamMember>(`/teams/${teamId}/members/${userId}`, {}),

  removeMember: (teamId: string, userId: string) =>
    projectClient.delete(`/teams/${teamId}/members/${userId}`),
};