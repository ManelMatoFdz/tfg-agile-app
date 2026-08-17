import { BookOpen, CheckSquare, Bug } from 'lucide-react';
import type { TaskPriority, TaskType } from '../../types';

export const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const TASK_TYPES: TaskType[] = ['STORY', 'TASK', 'BUG'];

export const TYPE_CONFIG: Record<TaskType, { icon: typeof BookOpen; color: string }> = {
  STORY: { icon: BookOpen, color: '#7C3AED' },
  TASK:  { icon: CheckSquare, color: '#2563EB' },
  BUG:   { icon: Bug, color: '#DC2626' },
};

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: 'var(--prio-low)',
  MEDIUM: '#2563EB',
  HIGH: '#D97706',
  CRITICAL: '#DC2626',
};