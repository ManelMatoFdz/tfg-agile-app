import { useTranslation } from 'react-i18next';
import type { Task, TaskPriority } from '../../types';

const PRIORITY_LEFT_BORDER: Record<TaskPriority, string> = {
  CRITICAL: 'border-l-red-500',
  HIGH:     'border-l-amber-400',
  MEDIUM:   'border-l-blue-400',
  LOW:      'border-l-gray-300',
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-amber-400',
  MEDIUM:   'bg-blue-400',
  LOW:      'bg-gray-300',
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
      className={`w-full text-left bg-white border border-gray-200 border-l-2 ${PRIORITY_LEFT_BORDER[task.priority]} rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all duration-150 cursor-pointer group`}
    >
      <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-primary-700 transition-colors">
        {task.title}
      </p>
      {task.description && (
        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
      )}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {t(`tasks.priority.${task.priority}`)}
          </span>
        </div>
        {task.storyPoints != null && (
          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
            {task.storyPoints} pts
          </span>
        )}
      </div>
    </button>
  );
}
