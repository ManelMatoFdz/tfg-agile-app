import projectClient from './projectClient';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '../types';

export const workspacesApi = {
  list: () =>
    projectClient.get<Workspace[]>('/workspaces'),

  create: (data: { name: string; description?: string }) =>
    projectClient.post<Workspace>('/workspaces', data),

  getById: (workspaceId: string) =>
    projectClient.get<Workspace>(`/workspaces/${workspaceId}`),

  update: (workspaceId: string, data: { name: string; description?: string }) =>
    projectClient.put<Workspace>(`/workspaces/${workspaceId}`, data),

  delete: (workspaceId: string) =>
    projectClient.delete(`/workspaces/${workspaceId}`),

  getMembers: (workspaceId: string) =>
    projectClient.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),

  addMember: (workspaceId: string, data: { userId: string; role: WorkspaceRole }) =>
    projectClient.post<WorkspaceMember>(`/workspaces/${workspaceId}/members`, data),

  updateMemberRole: (workspaceId: string, userId: string, role: WorkspaceRole) =>
    projectClient.put<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}`, { role }),

  removeMember: (workspaceId: string, userId: string) =>
    projectClient.delete(`/workspaces/${workspaceId}/members/${userId}`),
};