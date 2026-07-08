import taskClient from './taskClient';
import type { Label } from '../types';

export interface CreateLabelDto {
  name: string;
  color?: string;
}

export interface UpdateLabelDto {
  name: string;
  color?: string;
}

export const labelsApi = {
  getByProject: (projectId: string) =>
    taskClient.get<Label[]>(`/projects/${projectId}/labels`).then((r) => r.data),

  create: (projectId: string, dto: CreateLabelDto) =>
    taskClient.post<Label>(`/projects/${projectId}/labels`, dto).then((r) => r.data),

  update: (labelId: string, dto: UpdateLabelDto) =>
    taskClient.put<Label>(`/labels/${labelId}`, dto).then((r) => r.data),

  delete: (labelId: string) =>
    taskClient.delete(`/labels/${labelId}`),
};