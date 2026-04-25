import { useTranslation } from 'react-i18next';
import type { Task, TaskPriority } from '../../types';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-500',
  MEDIUM: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-amber-100 text-amber-600',
  CRITICAL: 'bg-red-100 text-red-600',
};

interface Props {
  task: Task;
  onClick: () => void;
}

export default function TaskCard({ task, onClick }: Props) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="w-full text-left glass-card p-3 hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-pointer group"
    >
      <p className="text-sm font-medium text-gray-900 leading-snug group-hover:text-primary-700 transition-colors">
        {task.title}
      </p>
      {task.description && (
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between mt-2.5">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
          {t(`tasks.priority.${task.priority}`)}
        </span>
        {task.storyPoints != null && (
          <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {task.storyPoints} pts
          </span>
        )}
      </div>
    </button>
  );
}