import projectClient from './projectClient';
import type { Category } from '../types';

export const categoriesApi = {
  list: (workspaceId: string) =>
    projectClient.get<Category[]>(`/workspaces/${workspaceId}/categories`),

  create: (workspaceId: string, data: { name: string; color?: string; position: number }) =>
    projectClient.post<Category>(`/workspaces/${workspaceId}/categories`, data),

  update: (workspaceId: string, categoryId: string, data: { name: string; color?: string; position: number }) =>
    projectClient.put<Category>(`/workspaces/${workspaceId}/categories/${categoryId}`, data),

  delete: (workspaceId: string, categoryId: string) =>
    projectClient.delete(`/workspaces/${workspaceId}/categories/${categoryId}`),
};