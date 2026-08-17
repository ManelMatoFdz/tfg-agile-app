import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Inbox } from 'lucide-react';
import Alert from '../components/ui/Alert';
import NotificationSource from '../components/ui/NotificationSource';
import PageTitle from '../components/motion/PageTitle';
import { notificationsApi } from '../api/notifications';
import { invitationsApi } from '../api/invitations';
import { useApiAction } from '../hooks/useApiAction';
import { useNotificationActors } from '../hooks/useNotificationActors';
import {
  normalizeNotification,
  notificationActorId,
  parseNotificationData,
  timeAgo,
} from '../utils/notificationMeta';
import type { Notification, NotificationPage } from '../types';

const PAGE_SIZE = 10;

const CSS = `
.nfy-page{width:100%;max-width:1120px;display:flex;flex-direction:column;gap:20px}
.nfy-header{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap}
.nfy-mark-all{height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 14px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-elevated);color:var(--text-muted);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background var(--duration),color var(--duration),border-color var(--duration)}
.nfy-mark-all:hover:not(:disabled){background:var(--bg-hover);color:var(--text);border-color:var(--border-strong)}
.nfy-mark-all:disabled{cursor:not-allowed;opacity:.48}
.nfy-panel{overflow:hidden;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-card)}
.nfy-tabs{height:52px;display:flex;align-items:stretch;padding:0 12px;border-bottom:1px solid var(--border)}
.nfy-tab{position:relative;display:inline-flex;align-items:center;gap:7px;padding:0 14px;border:0;background:transparent;color:var(--text-faint);font:inherit;font-size:13px;font-weight:600;letter-spacing:0;cursor:pointer;transition:color var(--duration),background var(--duration)}
.nfy-tab:hover{color:var(--text);background:var(--bg-hover)}
.nfy-tab[data-active='true']{color:var(--accent-text)}
.nfy-tab[data-active='true']::after{content:'';position:absolute;left:12px;right:12px;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:var(--accent)}
.nfy-tab-count{min-width:19px;height:19px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-pill);background:var(--accent-muted);color:var(--accent-text);font-size:11px;font-weight:700;font-variant-numeric:tabular-nums}
.nfy-list{min-height:120px}
.nfy-row{position:relative;display:flex;align-items:flex-start;gap:14px;padding:17px 18px 17px 20px;background:transparent;transition:background var(--duration)}
.nfy-row+.nfy-row{box-shadow:inset 0 1px 0 var(--border)}
.nfy-row:hover{background:var(--bg-hover)}
.nfy-row[data-clickable='true']{cursor:pointer}
.nfy-row[data-unread='true']{background:var(--accent-muted)}
.nfy-row[data-unread='true']:hover{background:var(--accent-muted)}
.nfy-row[data-unread='true']::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--accent)}
.nfy-content{flex:1;min-width:0;padding-top:1px}
.nfy-content-head{display:flex;align-items:baseline;gap:14px}
.nfy-title{flex:1;min-width:0;margin:0;color:var(--text);font-size:14px;font-weight:600;line-height:1.45;letter-spacing:0}
.nfy-row[data-unread='false'] .nfy-title{color:var(--text-muted);font-weight:500}
.nfy-time{flex-shrink:0;color:var(--text-faint);font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
.nfy-message{margin:3px 0 0;color:var(--text-faint);font-size:13px;line-height:1.55;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.nfy-mark{width:30px;height:30px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--text-faint);opacity:0;cursor:pointer;transition:opacity var(--duration),background var(--duration),color var(--duration)}
.nfy-row:hover .nfy-mark,.nfy-mark:focus-visible{opacity:1}
.nfy-mark:hover{background:var(--bg-elevated);color:var(--accent-text)}
.nfy-actions{display:flex;align-items:center;gap:8px;margin-top:11px}
.nfy-action{height:32px;padding:0 14px;border-radius:var(--radius-sm);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.nfy-action:disabled{cursor:not-allowed;opacity:.5}
.nfy-action-primary{border:1px solid var(--success);background:var(--success);color:#fff}
.nfy-action-secondary{border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-muted)}
.nfy-footer{display:flex;align-items:center;justify-content:center;padding:15px;border-top:1px solid var(--border)}
.nfy-load-more{height:34px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 18px;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--accent-text);font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background var(--duration)}
.nfy-load-more:hover:not(:disabled){background:var(--accent-muted)}
.nfy-load-more:disabled{cursor:wait;opacity:.65}
.nfy-spinner{width:15px;height:15px;border:2px solid var(--border);border-top-color:var(--accent-text);border-radius:50%;animation:spin .7s linear infinite}
@media (hover:none){.nfy-mark{opacity:1}}
@media (max-width:640px){
  .nfy-header{align-items:stretch}
  .nfy-header-copy{width:100%}
  .nfy-mark-all{width:100%}
  .nfy-tabs{padding:0 6px}
  .nfy-tab{padding:0 11px}
  .nfy-row{gap:11px;padding:14px 12px 14px 15px}
  .nfy-content-head{display:block}
  .nfy-time{display:block;margin-top:4px}
  .nfy-mark{opacity:1}
}
`;

function pageItems(data: NotificationPage): Notification[] {
  const items = Array.isArray(data.content)
    ? data.content
    : Array.isArray(data.items)
      ? data.items
      : [];
  return items.map((item) => normalizeNotification(item));
}

function pageHasNext(data: NotificationPage, page: number): boolean {
  if (typeof data.hasNext === 'boolean') return data.hasNext;
  return Number.isFinite(data.totalPages) && page + 1 < data.totalPages;
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requestVersion = useRef(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [invitationActingId, setInvitationActingId] = useState<string | null>(null);
  const markAllAction = useApiAction();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => (await notificationsApi.list({ unreadOnly: true, size: 1 })).data.totalElements,
  });

  useEffect(() => {
    const version = ++requestVersion.current;
    setLoadingList(true);
    setLoadError('');
    setNotifications([]);
    setPage(0);

    notificationsApi.list({ unreadOnly, page: 0, size: PAGE_SIZE })
      .then((res) => {
        if (requestVersion.current !== version) return;
        setNotifications(pageItems(res.data));
        setHasNext(pageHasNext(res.data, 0));
      })
      .catch(() => {
        if (requestVersion.current === version) setLoadError(t('notifications.loadError'));
      })
      .finally(() => {
        if (requestVersion.current === version) setLoadingList(false);
      });
  }, [t, unreadOnly]);

  const actorsById = useNotificationActors(notifications);

  const invalidateUnreadCount = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  }, [queryClient]);

  const markLocallyRead = useCallback((id: string) => {
    setNotifications((current) => unreadOnly
      ? current.filter((notification) => notification.id !== id)
      : current.map((notification) => notification.id === id
        ? { ...notification, read: true }
        : notification));
  }, [unreadOnly]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasNext) return;
    const version = requestVersion.current;
    const nextPage = page + 1;
    setLoadingMore(true);
    setLoadError('');
    try {
      const res = await notificationsApi.list({ unreadOnly, page: nextPage, size: PAGE_SIZE });
      if (requestVersion.current !== version) return;
      const incoming = pageItems(res.data);
      setNotifications((current) => {
        const knownIds = new Set(current.map((notification) => notification.id));
        return [...current, ...incoming.filter((notification) => !knownIds.has(notification.id))];
      });
      setPage(nextPage);
      setHasNext(pageHasNext(res.data, nextPage));
    } catch {
      if (requestVersion.current === version) setLoadError(t('notifications.loadError'));
    } finally {
      if (requestVersion.current === version) setLoadingMore(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    markLocallyRead(id);
    invalidateUnreadCount();
  };

  const handleMarkAll = async () => {
    const result = await markAllAction.run(notificationsApi.markAllRead());
    if (result === null) return;
    setNotifications((current) => unreadOnly ? [] : current.map((notification) => ({ ...notification, read: true })));
    invalidateUnreadCount();
  };

  const handleInvitationAction = async (
    notificationId: string,
    invitationId: string,
    action: 'accept' | 'reject',
  ) => {
    setInvitationActingId(notificationId);
    setLoadError('');
    try {
      if (action === 'accept') await invitationsApi.accept(invitationId);
      else await invitationsApi.reject(invitationId);
      await notificationsApi.markRead(notificationId);
      markLocallyRead(notificationId);
      invalidateUnreadCount();
    } catch {
      setLoadError(t('notifications.loadError'));
    } finally {
      setInvitationActingId(null);
    }
  };

  const isPendingInvitation = (notification: Notification) => (
    notification.type === 'WORKSPACE_INVITATION'
    && !notification.read
    && typeof parseNotificationData(notification.data).invitationId === 'string'
  );

  const handleClick = async (notification: Notification) => {
    if (isPendingInvitation(notification)) return;
    if (!notification.read) {
      await notificationsApi.markRead(notification.id).catch(() => null);
      markLocallyRead(notification.id);
      invalidateUnreadCount();
    }
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="nfy-page">
      <style>{CSS}</style>

      <header className="nfy-header">
        <div className="nfy-header-copy">
          <PageTitle>{t('notifications.title')}</PageTitle>
          <p style={{ margin: '4px 0 0', color: 'var(--text-faint)', fontSize: 13 }}>
            {t('notifications.subtitle')}
          </p>
        </div>
        <button
          type="button"
          className="nfy-mark-all"
          onClick={handleMarkAll}
          disabled={markAllAction.loading || unreadCount === 0}
        >
          {markAllAction.loading ? <span className="nfy-spinner" /> : <CheckCheck size={16} strokeWidth={2} />}
          {t('notifications.markAll')}
        </button>
      </header>

      {loadError && <Alert type="error" message={loadError} />}
      {markAllAction.error && <Alert type="error" message={markAllAction.error} />}

      <section className="nfy-panel" aria-label={t('notifications.title')}>
        <div className="nfy-tabs" role="tablist" aria-label={t('notifications.title')}>
          <button
            type="button"
            role="tab"
            aria-selected={!unreadOnly}
            className="nfy-tab"
            data-active={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
          >
            {t('notifications.all')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={unreadOnly}
            className="nfy-tab"
            data-active={unreadOnly}
            onClick={() => setUnreadOnly(true)}
          >
            {t('notifications.unread')}
            {unreadCount > 0 && (
              <span className="nfy-tab-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
        </div>

        <div className="nfy-list" role="tabpanel">
          {loadingList ? (
            <NotificationSkeleton />
          ) : notifications.length === 0 ? (
            <EmptyState unreadOnly={unreadOnly} t={t} />
          ) : (
            notifications.map((notification) => {
              const actorId = notificationActorId(notification);
              const actor = actorId ? actorsById[actorId] : undefined;
              const pending = isPendingInvitation(notification);
              const clickable = !pending && (Boolean(notification.link) || !notification.read);
              return (
                <article
                  key={notification.id}
                  className="nfy-row"
                  data-unread={!notification.read}
                  data-clickable={clickable}
                  onClick={() => { if (clickable) void handleClick(notification); }}
                >
                  <NotificationSource notification={notification} actor={actor} />

                  <div className="nfy-content">
                    <div className="nfy-content-head">
                      <p className="nfy-title">{notification.title}</p>
                      <time className="nfy-time" dateTime={notification.createdAt}>
                        {timeAgo(notification.createdAt, t)}
                      </time>
                    </div>
                    {notification.message && <p className="nfy-message">{notification.message}</p>}
                    {pending && (
                      <InvitationActions
                        notification={notification}
                        acting={invitationActingId === notification.id}
                        onAction={handleInvitationAction}
                        t={t}
                      />
                    )}
                  </div>

                  {!notification.read && !pending && (
                    <button
                      type="button"
                      className="nfy-mark"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleMarkRead(notification.id);
                      }}
                      title={t('notifications.markRead')}
                      aria-label={t('notifications.markRead')}
                    >
                      <Check size={16} strokeWidth={2.25} />
                    </button>
                  )}
                </article>
              );
            })
          )}
        </div>

        {!loadingList && notifications.length > 0 && hasNext && (
          <div className="nfy-footer">
            <button type="button" className="nfy-load-more" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore && <span className="nfy-spinner" />}
              {loadingMore ? t('notifications.loadingMore') : t('notifications.loadMore')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="nfy-row">
          <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', background: 'var(--bg-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 5 }}>
            <span style={{ width: `${68 - item * 7}%`, height: 10, borderRadius: 4, background: 'var(--bg-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <span style={{ width: `${48 - item * 4}%`, height: 8, borderRadius: 4, background: 'var(--bg-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ unreadOnly, t }: { unreadOnly: boolean; t: (key: string) => string }) {
  return (
    <div style={{ padding: '70px 24px', textAlign: 'center' }}>
      <div style={{
        width: 54, height: 54, margin: '0 auto 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)',
      }}>
        <Inbox size={24} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
      </div>
      <p style={{ margin: 0, color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>
        {unreadOnly ? t('notifications.emptyUnread') : t('notifications.empty')}
      </p>
      <p style={{ margin: '4px 0 0', color: 'var(--text-faint)', fontSize: 13 }}>
        {unreadOnly ? t('notifications.emptyUnreadSubtitle') : t('notifications.emptySubtitle')}
      </p>
    </div>
  );
}

function InvitationActions({ notification, acting, onAction, t }: {
  notification: Notification;
  acting: boolean;
  onAction: (notificationId: string, invitationId: string, action: 'accept' | 'reject') => void;
  t: (key: string) => string;
}) {
  const invitationId = parseNotificationData(notification.data).invitationId;
  if (typeof invitationId !== 'string' || !invitationId) return null;

  return (
    <div className="nfy-actions" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="nfy-action nfy-action-primary"
        disabled={acting}
        onClick={() => onAction(notification.id, invitationId, 'accept')}
      >
        {t('workspace.members.invite.accept')}
      </button>
      <button
        type="button"
        className="nfy-action nfy-action-secondary"
        disabled={acting}
        onClick={() => onAction(notification.id, invitationId, 'reject')}
      >
        {t('workspace.members.invite.reject')}
      </button>
    </div>
  );
}
