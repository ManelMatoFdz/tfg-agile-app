import taskClient from './taskClient';
import type { Epic, Task } from '../types';

export interface CreateEpicDto {
  name: string;
  description?: string;
  color?: string;
  startDate?: string;
  targetDate?: string;
}

export interface UpdateEpicDto {
  name: string;
  description?: string;
  color?: string;
  status?: string;
  startDate?: string;
  targetDate?: string;
}

export const epicsApi = {
  getByProject: (projectId: string) =>
    taskClient.get<Epic[]>(`/projects/${projectId}/epics`).then((r) => r.data),

  getById: (projectId: string, epicId: string) =>
    taskClient.get<Epic>(`/projects/${projectId}/epics/${epicId}`).then((r) => r.data),

  create: (projectId: string, dto: CreateEpicDto) =>
    taskClient.post<Epic>(`/projects/${projectId}/epics`, dto).then((r) => r.data),

  update: (projectId: string, epicId: string, dto: UpdateEpicDto) =>
    taskClient.put<Epic>(`/projects/${projectId}/epics/${epicId}`, dto).then((r) => r.data),

  delete: (projectId: string, epicId: string) =>
    taskClient.delete(`/projects/${projectId}/epics/${epicId}`),

  getTasks: (projectId: string, epicId: string) =>
    taskClient.get<Task[]>(`/projects/${projectId}/epics/${epicId}/tasks`).then((r) => r.data),

  assignToTask: (taskId: string, epicId: string | null) =>
    taskClient.put<Task>(`/tasks/${taskId}/epic`, { epicId }).then((r) => r.data),
};