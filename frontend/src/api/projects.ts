import projectClient from './projectClient';
import type { Project, ProjectVisibility, TeamMember } from '../types';

export const projectsApi = {
  list: (workspaceId: string) =>
    projectClient.get<Project[]>(`/workspaces/${workspaceId}/projects`),

  create: (workspaceId: string, data: { name: string; description?: string; categoryId?: string; teamId: string; color?: string; visibility?: ProjectVisibility }) =>
    projectClient.post<Project>(`/workspaces/${workspaceId}/projects`, data),

  getById: (projectId: string) =>
    projectClient.get<Project>(`/projects/${projectId}`),

  update: (projectId: string, data: { name: string; description?: string; categoryId?: string; teamId?: string; color?: string; visibility?: ProjectVisibility }) =>
    projectClient.put<Project>(`/projects/${projectId}`, data),

  delete: (projectId: string) =>
    projectClient.delete(`/projects/${projectId}`),

  getTeamMembers: (projectId: string) =>
    projectClient.get<TeamMember[]>(`/projects/${projectId}/team-members`),
};