import { useState, useEffect, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity, Plus, ArrowRight, User, Tag, Layers,
  CornerDownRight, Type, AlignLeft, Target, Undo2, CheckCircle2,
} from 'lucide-react';
import type { TaskActivity, TaskComment, UserSummary, Label } from '../../types';
import { tasksApi } from '../../api/tasks';
import { AssigneeAvatar } from './TaskModal';

type FeedItem =
  | { kind: 'activity'; data: TaskActivity }
  | { kind: 'comment'; data: TaskComment };

function useRelativeTime(t: (key: string, opts?: Record<string, unknown>) => string) {
  return useCallback(
    (dateStr: string) => {
      const now = Date.now();
      const then = new Date(dateStr).getTime();
      const diffSec = Math.floor((now - then) / 1000);

      if (diffSec < 60) return t('tasks.comments.justNow');
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return t('tasks.comments.minutesAgo', { count: diffMin });
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return t('tasks.comments.hoursAgo', { count: diffHr });
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay === 1) return t('tasks.comments.yesterday');
      if (diffDay < 7) return t('tasks.comments.daysAgo', { count: diffDay });
      return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    },
    [t],
  );
}

const ICON_MAP: Record<string, typeof Activity> = {
  CREATED: Plus,
  STATUS_CHANGED: ArrowRight,
  PRIORITY_CHANGED: Target,
  ASSIGNEE_CHANGED: User,
  SPRINT_ADDED: Layers,
  RETURNED_TO_BACKLOG: Undo2,
  LABEL_ADDED: Tag,
  LABEL_REMOVED: Tag,
  SUBTASK_ADDED: CornerDownRight,
  SUBTASK_REMOVED: CornerDownRight,
  TITLE_CHANGED: Type,
  DESCRIPTION_CHANGED: AlignLeft,
  STORY_POINTS_CHANGED: Target,
  READY_CHANGED: CheckCircle2,
};

const ICON_COLOR_MAP: Record<string, string> = {
  CREATED: '#16A34A',
  STATUS_CHANGED: '#2563EB',
  PRIORITY_CHANGED: '#D97706',
  ASSIGNEE_CHANGED: '#7C3AED',
  SPRINT_ADDED: '#0891B2',
  RETURNED_TO_BACKLOG: '#D97706',
  LABEL_ADDED: '#16A34A',
  LABEL_REMOVED: '#DC2626',
  SUBTASK_ADDED: '#16A34A',
  SUBTASK_REMOVED: '#DC2626',
  TITLE_CHANGED: '#6366F1',
  DESCRIPTION_CHANGED: '#6366F1',
  STORY_POINTS_CHANGED: '#0891B2',
  READY_CHANGED: '#16A34A',
};

function ActivityRow({
  activity,
  userMap,
  labels,
  relativeTime,
  t,
}: {
  activity: TaskActivity;
  userMap: Record<string, UserSummary>;
  labels: Label[];
  relativeTime: (d: string) => string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const Icon = ICON_MAP[activity.type] ?? Activity;
  const iconColor = ICON_COLOR_MAP[activity.type] ?? 'var(--text-faint)';

  const actor = activity.actorId ? userMap[activity.actorId] : null;
  const actorName = actor ? (actor.fullName ?? actor.username) : null;

  const message = buildMessage(t, activity, actorName, userMap, labels);

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      padding: '6px 0',
    }}>
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: `${iconColor}12`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
      }}>
        <Icon size={12} strokeWidth={2.5} style={{ color: iconColor }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          {message}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>
          {relativeTime(activity.createdAt)}
        </div>
      </div>
    </div>
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveValues(
  activity: TaskActivity,
  userMap: Record<string, UserSummary>,
  labels: Label[],
): { oldValue: string; newValue: string } {
  let oldValue = activity.oldValue ?? '';
  let newValue = activity.newValue ?? '';

  if (activity.type === 'ASSIGNEE_CHANGED') {
    if (oldValue && userMap[oldValue]) {
      const u = userMap[oldValue];
      oldValue = u.fullName ?? u.username;
    }
    if (newValue && userMap[newValue]) {
      const u = userMap[newValue];
      newValue = u.fullName ?? u.username;
    }
  }

  if (activity.type === 'LABEL_REMOVED' && oldValue && UUID_RE.test(oldValue)) {
    const lbl = labels.find((l) => l.id === oldValue);
    if (lbl) oldValue = lbl.name;
  }

  return { oldValue, newValue };
}

function buildMessage(
  t: (key: string, opts?: Record<string, unknown>) => string,
  activity: TaskActivity,
  actorName: string | null,
  userMap: Record<string, UserSummary>,
  labels: Label[],
): React.ReactNode {
  const { oldValue, newValue } = resolveValues(activity, userMap, labels);

  let typeKey: string = activity.type;
  if (activity.type === 'READY_CHANGED') {
    typeKey = `READY_CHANGED_${activity.newValue}`;
  } else if (activity.type === 'ASSIGNEE_CHANGED') {
    if (!oldValue && newValue) typeKey = 'ASSIGNEE_SET';
    else if (oldValue && !newValue) typeKey = 'ASSIGNEE_UNSET';
  } else if (activity.type === 'STORY_POINTS_CHANGED' && !oldValue) {
    typeKey = 'STORY_POINTS_SET';
  }
  const key = `tasks.activity.${typeKey}`;
  const keyImpersonal = `${key}_impersonal`;

  if (actorName) {
    return (
      <Fragment>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{actorName}</span>
        {' '}
        {t(key, { oldValue, newValue })}
      </Fragment>
    );
  }

  return t(keyImpersonal, { oldValue, newValue });
}

interface Props {
  taskId: string;
  comments: TaskComment[];
  userMap: Record<string, UserSummary>;
  labels?: Label[];
}

export default function TaskActivityFeed({ taskId, comments, userMap, labels = [] }: Props) {
  const { t } = useTranslation();
  const relativeTime = useRelativeTime(t);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksApi.getActivity(taskId)
      .then(setActivities)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
        <div style={{
          width: 16, height: 16,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  // Merge activities and comments into a unified feed
  const feed: FeedItem[] = [
    ...activities.map((a) => ({ kind: 'activity' as const, data: a })),
    ...comments.map((c) => ({ kind: 'comment' as const, data: c })),
  ].sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime());

  if (feed.length === 0) {
    return null;
  }

  // Only render activity items; comments are rendered by TaskComments
  const activityItems = activities;
  if (activityItems.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Activity size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          {t('tasks.activity.title')}
        </span>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-faint)',
          background: 'var(--bg-hover)',
          borderRadius: 'var(--radius-pill)',
          padding: '0 6px',
          fontFamily: 'var(--font-mono)',
        }}>
          {activityItems.length}
        </span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
      }}>
        {activityItems.map((activity) => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            userMap={userMap}
            labels={labels}
            relativeTime={relativeTime}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}