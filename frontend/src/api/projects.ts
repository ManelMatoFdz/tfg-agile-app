import projectClient from './projectClient';
import type { Project, ProjectMember, ProjectRole } from '../types';

export const projectsApi = {
  list: (workspaceId: string) =>
    projectClient.get<Project[]>(`/workspaces/${workspaceId}/projects`),

  create: (workspaceId: string, data: { name: string; description?: string; categoryId?: string }) =>
    projectClient.post<Project>(`/workspaces/${workspaceId}/projects`, data),

  getById: (projectId: string) =>
    projectClient.get<Project>(`/projects/${projectId}`),

  update: (projectId: string, data: { name: string; description?: string; categoryId?: string }) =>
    projectClient.put<Project>(`/projects/${projectId}`, data),

  delete: (projectId: string) =>
    projectClient.delete(`/projects/${projectId}`),

  getMembers: (projectId: string) =>
    projectClient.get<ProjectMember[]>(`/projects/${projectId}/members`),

  addMember: (projectId: string, data: { userId: string; role: ProjectRole }) =>
    projectClient.post<ProjectMember>(`/projects/${projectId}/members`, data),

  updateMemberRole: (projectId: string, userId: string, role: ProjectRole) =>
    projectClient.put<ProjectMember>(`/projects/${projectId}/members/${userId}`, { role }),

  removeMember: (projectId: string, userId: string) =>
    projectClient.delete(`/projects/${projectId}/members/${userId}`),

  addMembersFromTeam: (projectId: string, teamId: string, userIds?: string[]) =>
    projectClient.post<ProjectMember[]>(
      `/projects/${projectId}/members/from-team/${teamId}`,
      userIds ? { userIds } : undefined,
    ),
};