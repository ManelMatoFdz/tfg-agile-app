import taskClient from './taskClient';
import type { BoardColumn } from '../types';

export interface SaveBoardColumnsDto {
  columns: BoardColumn[];
}

export const boardColumnsApi = {
  getColumns: (projectId: string) =>
    taskClient.get<BoardColumn[]>(`/projects/${projectId}/board-columns`).then((r) => r.data),

  saveColumns: (projectId: string, columns: BoardColumn[]) =>
    taskClient.put<BoardColumn[]>(`/projects/${projectId}/board-columns`, { columns }).then((r) => r.data),
};