import {
  CheckSquare,
  FolderCog,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Info,
  UserPlus,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { Notification } from '../types';

/* La campana del TopBar y la pagina de notificaciones pintan la misma lista con
   distinto tamano. Lo que decide como se ve un tipo (icono y color) vive aqui
   para que no se separen. */

export type NotificationApiItem = Partial<Notification> & { isRead?: boolean };

/* El backend normaliza cualquier tipo desconocido a GENERAL
   (NotificationProcessingService.normalizeType), asi que ese es el fallback. */
export function normalizeNotification(item: NotificationApiItem): Notification {
  return {
    id: item.id ?? crypto.randomUUID(),
    userId: item.userId ?? '',
    title: item.title ?? '',
    message: item.message ?? '',
    type: item.type ?? 'GENERAL',
    read: typeof item.read === 'boolean' ? item.read : Boolean(item.isRead),
    createdAt: item.createdAt ?? new Date().toISOString(),
    link: item.link,
    data: item.data,
  };
}

export function timeAgo(dateStr: string, t: TFunction): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('notifications.timeAgo.now');
  if (mins < 60) return t('notifications.timeAgo.minutes', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('notifications.timeAgo.hours', { count: hours });
  const days = Math.floor(hours / 24);
  return t('notifications.timeAgo.days', { count: days });
}

export type NotificationMeta = { Icon: LucideIcon; color: string; bg: string };

/* El icono describe el evento, no la pantalla a la que lleva:
   - WORKSPACE_INVITATION es literalmente una invitacion que llega -> sobre con +.
   - PROJECT_UPDATE agrupa "te anadieron al proyecto" y los dos cambios de rol
     (tecnico y Scrum): los tres hablan de tu papel dentro del proyecto.
   - TASK_REMINDER cubre asignacion, desbloqueo y cambio de estado, y reutiliza
     el icono de "My Tasks" del sidebar para que el usuario reconozca el concepto.
     Las notificaciones Git se distinguen despues por su titulo.
   - POKER_INVITATION son cartas de estimacion, no un reloj ni una capa.
   - GENERAL es el fallback del backend para tipos desconocidos: neutro a
     proposito, una campana no aportaria nada en una lista de notificaciones. */
const META: Record<string, NotificationMeta> = {
  WORKSPACE_INVITATION: { Icon: UserPlus,    color: 'var(--success-text)', bg: 'var(--success-bg)' },
  PROJECT_UPDATE:       { Icon: FolderCog,   color: 'var(--info-text)',    bg: 'var(--info-bg)' },
  TASK_REMINDER:        { Icon: CheckSquare, color: 'var(--warning-text)', bg: 'var(--warning-bg)' },
  POKER_INVITATION:     { Icon: WalletCards, color: 'var(--purple-text)',  bg: 'var(--purple-soft)' },
  GENERAL:              { Icon: Info,        color: 'var(--accent-text)',  bg: 'var(--accent-muted)' },
};

export function notificationMeta(type: string): NotificationMeta {
  return META[type] ?? META.GENERAL;
}

const GIT_META: Record<'pullRequest' | 'commit' | 'branch', NotificationMeta> = {
  pullRequest: { Icon: GitPullRequest, color: 'var(--purple-text)', bg: 'var(--purple-soft)' },
  commit:      { Icon: GitCommit,      color: 'var(--orange-text)', bg: 'var(--orange-soft)' },
  branch:      { Icon: GitBranch,      color: 'var(--info-text)',   bg: 'var(--info-bg)' },
};

export function gitNotificationMeta(title: string): NotificationMeta | null {
  const normalizedTitle = title.trim().toLowerCase();

  if (/\b(?:pull[\s-]?requests?|pr)\b/.test(normalizedTitle)) {
    return GIT_META.pullRequest;
  }
  if (/\bcommits?\b/.test(normalizedTitle)) {
    return GIT_META.commit;
  }
  if (/\b(?:ramas?|branches?|git(?:hub|lab)?|repositorio|repository)\b/.test(normalizedTitle)) {
    return GIT_META.branch;
  }

  return null;
}

export type NotificationData = {
  actorUserId?: string;
  invitationId?: string;
  workspaceId?: string;
  workspaceName?: string;
  [key: string]: unknown;
};

export function parseNotificationData(data?: string): NotificationData {
  if (!data) return {};
  try {
    const parsed: unknown = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as NotificationData;
    }
  } catch {
    // Malformed legacy data is treated as an actor-less notification.
  }
  return {};
}

export function notificationActorId(notification: Notification): string | null {
  const actorUserId = parseNotificationData(notification.data).actorUserId;
  return typeof actorUserId === 'string' && actorUserId.length > 0 ? actorUserId : null;
}
