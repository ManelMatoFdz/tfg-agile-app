import taskClient from './taskClient';
import type { Task, TaskComment, TaskActivity } from '../types';

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: string;
  type?: string;
  parentId?: string;
  assigneeId?: string;
  labelIds?: string[];
  definitionOfDone?: string;
}

export interface UpdateTaskDto {
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string | null;
  labelIds?: string[];
  ready?: boolean;
  definitionOfDone?: string;
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

  getSubtasks: (taskId: string) =>
    taskClient.get<Task[]>(`/tasks/${taskId}/subtasks`).then((r) => r.data),

  // Comments
  getComments: (taskId: string) =>
    taskClient.get<TaskComment[]>(`/tasks/${taskId}/comments`).then((r) => r.data),

  createComment: (taskId: string, content: string) =>
    taskClient.post<TaskComment>(`/tasks/${taskId}/comments`, { content }).then((r) => r.data),

  updateComment: (commentId: string, content: string) =>
    taskClient.put<TaskComment>(`/comments/${commentId}`, { content }).then((r) => r.data),

  deleteComment: (commentId: string) =>
    taskClient.delete(`/comments/${commentId}`),

  // Toggle subtask done/not-done
  toggleSubtaskDone: (taskId: string) =>
    taskClient.patch<Task>(`/tasks/${taskId}/toggle-done`).then((r) => r.data),

  // Activity
  getActivity: (taskId: string) =>
    taskClient.get<TaskActivity[]>(`/tasks/${taskId}/activity`).then((r) => r.data),
};