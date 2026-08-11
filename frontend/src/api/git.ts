import taskClient from './taskClient';
import type { GitEvent, GitIntegration } from '../types';

export const gitApi = {
  getConfig: (projectId: string) =>
    taskClient
      .get<GitIntegration | ''>(`/projects/${projectId}/git/config`)
      .then((r) => (r.status === 204 || !r.data ? null : (r.data as GitIntegration))),

  setup: (projectId: string, repositoryUrl: string) =>
    taskClient
      .post<GitIntegration>(`/projects/${projectId}/git/setup`, { repositoryUrl })
      .then((r) => r.data),

  disconnect: (projectId: string) => taskClient.delete(`/projects/${projectId}/git/config`),

  getProjectEvents: (projectId: string) =>
    taskClient.get<GitEvent[]>(`/projects/${projectId}/git/events`).then((r) => r.data),

  getTaskEvents: (taskId: string) =>
    taskClient.get<GitEvent[]>(`/tasks/${taskId}/git-events`).then((r) => r.data),

  link: (taskId: string, url: string, title?: string) =>
    taskClient.post<GitEvent>(`/tasks/${taskId}/git-events`, { url, title }).then((r) => r.data),

  unlink: (taskId: string, eventId: string) =>
    taskClient.delete(`/tasks/${taskId}/git-events/${eventId}`),
};

/** Referencia que hay que escribir en commits y branches para vincular la tarea. */
export const taskGitRef = (taskId: string) => `TASK-${taskId.slice(0, 8)}`;
