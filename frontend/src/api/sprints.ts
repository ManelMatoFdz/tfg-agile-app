import taskClient from './taskClient';
import type { Sprint, SprintTaskSnapshot, Task } from '../types';
import type { TaskFilters } from '../components/kanban/TaskFilterBar';

export interface CreateSprintDto {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}

export interface VelocityDto {
  averageVelocity: number;
  completedSprints: number;
}

export interface UpdateSprintDto {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  reviewNotes?: string;
}

function buildFilterParams(filters?: TaskFilters): Record<string, string | string[]> {
  if (!filters) return {};
  const params: Record<string, string | string[]> = {};
  if (filters.priorities.length > 0) params.priority = filters.priorities;
  if (filters.assigneeIds.length > 0) params.assigneeId = filters.assigneeIds;
  if (filters.labelIds.length > 0) params.labelId = filters.labelIds;
  if (filters.statuses.length > 0) params.status = filters.statuses;
  if (filters.epicIds && filters.epicIds.length > 0) params.epicId = filters.epicIds;
  if (filters.search) params.search = filters.search;
  return params;
}

export const sprintsApi = {
  getBacklog: (projectId: string, filters?: TaskFilters) =>
    taskClient.get<Task[]>(`/projects/${projectId}/backlog`, { params: buildFilterParams(filters) }).then((r) => r.data),

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

  deleteSprint: (sprintId: string) =>
    taskClient.delete(`/sprints/${sprintId}`),

  getSprintTasks: (sprintId: string, filters?: TaskFilters) =>
    taskClient.get<Task[]>(`/sprints/${sprintId}/tasks`, { params: buildFilterParams(filters) }).then((r) => r.data),

  assignTasksToSprint: (sprintId: string, taskIds: string[]) =>
    taskClient.post<Task[]>(`/sprints/${sprintId}/tasks`, { taskIds }).then((r) => r.data),

  removeTaskFromSprint: (sprintId: string, taskId: string) =>
    taskClient.delete<Task>(`/sprints/${sprintId}/tasks/${taskId}`).then((r) => r.data),

  getSprintStories: (sprintId: string, filters?: TaskFilters) =>
    taskClient.get<Task[]>(`/sprints/${sprintId}/stories`, { params: buildFilterParams(filters) }).then((r) => r.data),

  getSprintSnapshots: (sprintId: string) =>
    taskClient.get<SprintTaskSnapshot[]>(`/sprints/${sprintId}/snapshots`).then((r) => r.data),

  getVelocity: (projectId: string) =>
    taskClient.get<VelocityDto>(`/projects/${projectId}/velocity`).then((r) => r.data),

  saveRetrospective: (sprintId: string, reviewNotes: string) =>
    taskClient.patch<Sprint>(`/sprints/${sprintId}/retrospective`, { reviewNotes }).then((r) => r.data),
};