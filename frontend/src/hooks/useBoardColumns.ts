import { useEffect, useState } from 'react';
import type { BoardColumn } from '../types';
import { boardColumnsApi } from '../api/boardColumns';

/**
 * Fetches and caches board columns for a project.
 */
export function useBoardColumns(projectId?: string) {
  const [columns, setColumns] = useState<BoardColumn[]>([]);

  useEffect(() => {
    if (!projectId) return;
    boardColumnsApi.getColumns(projectId).then(setColumns).catch(() => {});
  }, [projectId]);

  return columns;
}

// Built-in statuses that have i18n translations
const TRANSLATABLE_STATUSES = new Set(['TODO', 'DONE']);

/**
 * Returns the display label for a task status.
 * - If the status matches a board column: shows the column name
 * - If no column match and status is TODO/DONE: uses i18n translation (fallback)
 * - Otherwise: raw status with underscores replaced by spaces
 */
export function getStatusLabel(
  status: string,
  columns: BoardColumn[],
  t: (key: string) => string,
): string {
  const col = columns.find((c) => c.name === status);
  if (col) return col.name.replace(/_/g, ' ');
  if (TRANSLATABLE_STATUSES.has(status)) {
    return t(`tasks.status.${status}`);
  }
  return status.replace(/_/g, ' ');
}

/**
 * Returns the color for a task status from its board column config.
 * Falls back to a neutral grey if no column is found.
 */
export function getStatusColor(status: string, columns: BoardColumn[]): string {
  const col = columns.find((c) => c.name === status);
  if (col) return col.color;
  return '#94A3B8';
}