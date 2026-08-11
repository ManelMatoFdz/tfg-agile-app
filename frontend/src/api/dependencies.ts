import taskClient from './taskClient';
import type { TaskDependency } from '../types';

export const dependenciesApi = {
  getByTask: (taskId: string) =>
    taskClient.get<TaskDependency[]>(`/tasks/${taskId}/dependencies`).then((r) => r.data),

  create: (blockingTaskId: string, blockedTaskId: string) =>
    taskClient.post<TaskDependency>(`/tasks/${blockingTaskId}/dependencies`, { blockedTaskId }).then((r) => r.data),

  delete: (taskId: string, dependencyId: string) =>
    taskClient.delete(`/tasks/${taskId}/dependencies/${dependencyId}`),

  getByProject: (projectId: string) =>
    taskClient.get<TaskDependency[]>(`/projects/${projectId}/dependencies`).then((r) => r.data),
};
