import taskClient from './taskClient';
import type { Task } from '../types';

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  storyPoints?: number;
}

export interface UpdateTaskDto {
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string | null;
  storyPoints?: number | null;
}

export interface MoveTaskDto {
  status: string;
  position: number;
}

export const tasksApi = {
  myTasks: () =>
    taskClient.get<Task[]>('/tasks/my-tasks').then((r) => r.data),

  getByProject: (projectId: string) =>
    taskClient.get<Task[]>(`/projects/${projectId}/tasks`).then((r) => r.data),

  getById: (taskId: string) =>
    taskClient.get<Task>(`/tasks/${taskId}`).then((r) => r.data),

  create: (projectId: string, dto: CreateTaskDto) =>
    taskClient.post<Task>(`/projects/${projectId}/tasks`, dto).then((r) => r.data),

  update: (taskId: string, dto: UpdateTaskDto) =>
    taskClient.put<Task>(`/tasks/${taskId}`, dto).then((r) => r.data),

  move: (taskId: string, dto: MoveTaskDto) =>
    taskClient.patch<Task>(`/tasks/${taskId}/move`, dto).then((r) => r.data),

  delete: (taskId: string) =>
    taskClient.delete(`/tasks/${taskId}`),
};