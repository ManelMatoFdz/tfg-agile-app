import taskClient from './taskClient';
import type { Sprint, Task } from '../types';

export interface CreateSprintDto {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSprintDto {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export const sprintsApi = {
  getBacklog: (projectId: string) =>
    taskClient.get<Task[]>(`/projects/${projectId}/backlog`).then((r) => r.data),

  listSprints: (projectId: string) =>
    taskClient.get<Sprint[]>(`/projects/${projectId}/sprints`).then((r) => r.data),

  getSprint: (sprintId: string) =>
    taskClient.get<Sprint>(`/sprints/${sprintId}`).then((r) => r.data),

  createSprint: (projectId: string, dto: CreateSprintDto) =>
    taskClient.post<Sprint>(`/projects/${projectId}/sprints`, dto).then((r) => r.data),

  updateSprint: (sprintId: string, dto: UpdateSprintDto) =>
    taskClient.put<Sprint>(`/sprints/${sprintId}`, dto).then((r) => r.data),

  activateSprint: (sprintId: string) =>
    taskClient.post<Sprint>(`/sprints/${sprintId}/activate`).then((r) => r.data),

  completeSprint: (sprintId: string) =>
    taskClient.post<Sprint>(`/sprints/${sprintId}/complete`).then((r) => r.data),

  getSprintTasks: (sprintId: string) =>
    taskClient.get<Task[]>(`/sprints/${sprintId}/tasks`).then((r) => r.data),

  assignTasksToSprint: (sprintId: string, taskIds: string[]) =>
    taskClient.post<Task[]>(`/sprints/${sprintId}/tasks`, { taskIds }).then((r) => r.data),

  removeTaskFromSprint: (sprintId: string, taskId: string) =>
    taskClient.delete<Task>(`/sprints/${sprintId}/tasks/${taskId}`).then((r) => r.data),
};