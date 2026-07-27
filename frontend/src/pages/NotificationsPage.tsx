import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { CheckCircle2, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import Alert from '../components/ui/Alert';
import PageTitle from '../components/motion/PageTitle';
import { notificationsApi } from '../api/notifications';
import { invitationsApi } from '../api/invitations';
import { useApiAction } from '../hooks/useApiAction';
import type { Notification, NotificationPage } from '../types';

type NotificationApiItem = Partial<Notification> & { isRead?: boolean };

function normalizeNotification(item: NotificationApiItem): Notification {
  return {
    id: item.id ?? crypto.randomUUID(),
    userId: item.userId ?? '',
    title: item.title ?? '',
    message: item.message ?? '',
    type: item.type ?? 'DEFAULT',
    read: typeof item.read === 'boolean' ? item.read : Boolean(item.isRead),
    createdAt: item.createdAt ?? new Date().toISOString(),
    link: item.link,
    data: item.data,
  };
}

function timeAgo(dateStr: string, t: TFunction): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('notifications.timeAgo.now');
  if (mins < 60) return t('notifications.timeAgo.minutes', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('notifications.timeAgo.hours', { count: hours });
  const days = Math.floor(hours / 24);
  return t('notifications.timeAgo.days', { count: days });
}

const typeConfig: Record<string, { iconPath: string; color: string; bg: string }> = {
  PROJECT_UPDATE: {
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    color: 'var(--ink-blue)',
    bg: 'var(--ink-blue-soft)',
  },
  TASK_REMINDER: {
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'var(--ochre)',
    bg: 'var(--ochre-soft)',
  },
  WORKSPACE_INVITATION: {
    iconPath: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    color: 'var(--success)',
    bg: 'var(--success-bg)',
  },
  POKER_INVITATION: {
    iconPath: 'M3 10h18M3 6h18M3 14h18M3 18h18',
    color: 'var(--violet, #8b5cf6)',
    bg: 'var(--violet-soft, rgba(139,92,246,0.1))',
  },
  DEFAULT: {
    iconPath: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    color: 'var(--accent)',
    bg: 'var(--accent-muted)',
  },
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [invitationActingId, setInvitationActingId] = useState<string | null>(null);
  const markAllAction = useApiAction();

  const fetchNotifications = useCallback(async () => {
    setLoadingList(true);
    setLoadError('');
    try {
      const res = await notificationsApi.list({ unreadOnly, page, size: 10 });
      const data: NotificationPage = res.data;
      const list = Array.isArray(data.content)
        ? data.content
        : Array.isArray(data.items)
          ? data.items
          : [];
      setNotifications(list.map((item) => normalizeNotification(item)));
      setTotalPages(Number.isFinite(data.totalPages) ? data.totalPages : 0);
    } catch {
      setLoadError(t('notifications.loadError'));
    } finally {
      setLoadingList(false);
    }
  }, [unreadOnly, page, t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const handleMarkAll = async () => {
    await markAllAction.run(notificationsApi.markAllRead());
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleInvitationAction = async (notificationId: string, invitationId: string, action: 'accept' | 'reject') => {
    setInvitationActingId(notificationId);
    try {
      if (action === 'accept') {
        await invitationsApi.accept(invitationId);
      } else {
        await invitationsApi.reject(invitationId);
      }
      await notificationsApi.markRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => n.id === notificationId ? { ...n, read: true } : n)
      );
    } finally {
      setInvitationActingId(null);
    }
  };

  const handleClick = async (n: Notification) => {
    if (n.type === 'WORKSPACE_INVITATION' && !n.read) return;
    if (!n.read) {
      await notificationsApi.markRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '0.3125rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    background: active ? 'var(--bg-elevated)' : 'transparent',
    color: active ? (unreadOnly ? 'var(--accent)' : 'var(--text)') : 'var(--text-faint)',
    boxShadow: active ? '0 0.0625rem 0.1875rem rgba(0,0,0,0.06)' : 'none',
    transition: `background var(--duration), color var(--duration)`,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <style>{`.notif-mark-label{display:none}@media(min-width:640px){.notif-mark-label{display:inline}}`}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <PageTitle>
            {t('notifications.title')}
          </PageTitle>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
            {t('notifications.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Filter tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-hover)',
            borderRadius: 'var(--radius-md)',
            padding: '0.1875rem',
            border: '0.0625rem solid var(--border)',
          }}>
            <button
              type="button"
              onClick={() => { setUnreadOnly(false); setPage(0); }}
              style={tabBtn(!unreadOnly)}
            >
              {t('notifications.all')}
            </button>
            <button
              type="button"
              onClick={() => { setUnreadOnly(true); setPage(0); }}
              style={tabBtn(unreadOnly)}
            >
              {t('notifications.unread')}
            </button>
          </div>

          <button
            type="button"
            onClick={handleMarkAll}
            disabled={markAllAction.loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3125rem',
              padding: '0.3125rem 0.625rem', fontSize: '0.75rem', fontWeight: 500,
              background: 'var(--bg-elevated)',
              color: 'var(--text-muted)',
              border: '0.0625rem solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: markAllAction.loading ? 'not-allowed' : 'pointer',
              opacity: markAllAction.loading ? 0.6 : 1,
              transition: `background var(--duration)`,
            }}
            onMouseEnter={(e) => { if (!markAllAction.loading) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
          >
            {markAllAction.loading ? (
              <div style={{
                width: '0.75rem', height: '0.75rem',
                border: '0.125rem solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            ) : (
              <CheckCircle2 size={12} strokeWidth={2} />
            )}
            <span className="notif-mark-label">{t('notifications.markAll')}</span>
          </button>
        </div>
      </div>

      {loadError && <Alert type="error" message={loadError} />}
      {markAllAction.error && <Alert type="error" message={markAllAction.error} />}

      {/* Notification list */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '0.0625rem solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}>
        {loadingList ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{
                display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem',
                borderBottom: i < 5 ? '0.0625rem solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: '2.25rem', height: '2.25rem',
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-sm)',
                  flexShrink: 0,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div style={{ height: '0.75rem', width: '70%', background: 'var(--bg-hover)', borderRadius: '0.25rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ height: '0.625rem', width: '45%', background: 'var(--bg-hover)', borderRadius: '0.25rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '3.75rem 1.5rem', textAlign: 'center' }}>
            <div style={{
              width: '3rem', height: '3rem',
              background: 'var(--bg-hover)',
              border: '0.0625rem solid var(--border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 0.75rem',
            }}>
              <Bell size={22} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t('notifications.empty')}</p>
            <p style={{ margin: '0.1875rem 0 0', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{t('notifications.emptySubtitle')}</p>
          </div>
        ) : (
          <div>
            {notifications.map((n, idx) => {
              const cfg = typeConfig[n.type] ?? typeConfig.DEFAULT;
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderTop: idx > 0 ? '0.0625rem solid var(--border)' : 'none',
                    background: !n.read ? 'var(--accent-muted)' : 'transparent',
                    transition: `background var(--duration)`,
                    cursor: n.link && !(n.type === 'WORKSPACE_INVITATION' && !n.read) ? 'pointer' : 'default',
                  }}
                  onMouseEnter={(e) => { if (n.read) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = !n.read ? 'var(--accent-muted)' : 'transparent'; }}
                >
                  {/* Type icon */}
                  <div style={{
                    width: '2.125rem', height: '2.125rem',
                    borderRadius: 'var(--radius-sm)',
                    background: !n.read ? cfg.bg : 'var(--bg-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width={16} height={16} fill="none" stroke={!n.read ? cfg.color : 'var(--text-faint)'} viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d={cfg.iconPath} />
                    </svg>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <p style={{
                          margin: 0, fontSize: '0.75rem',
                          fontWeight: !n.read ? 600 : 400,
                          color: !n.read ? 'var(--text)' : 'var(--text-muted)',
                        }}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span style={{
                            width: '0.375rem', height: '0.375rem',
                            background: 'var(--accent)',
                            borderRadius: '50%',
                            flexShrink: 0,
                            display: 'inline-block',
                          }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: '0.625rem',
                        color: 'var(--text-faint)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {timeAgo(n.createdAt, t)}
                      </span>
                    </div>
                    <p style={{ margin: '0.125rem 0 0', fontSize: '0.6875rem', color: 'var(--text-faint)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {n.message}
                    </p>

                    {/* Invitation actions */}
                    {n.type === 'WORKSPACE_INVITATION' && !n.read && (() => {
                      let invitationId: string | null = null;
                      try {
                        const parsed = JSON.parse(n.data ?? '{}');
                        invitationId = parsed.invitationId ?? null;
                      } catch { /* ignore */ }
                      if (!invitationId) return null;
                      const isActing = invitationActingId === n.id;
                      return (
                        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleInvitationAction(n.id, invitationId!, 'accept')}
                            style={{
                              padding: '0.25rem 0.625rem', fontSize: '0.6875rem', fontWeight: 500,
                              color: 'var(--accent-fg)', background: 'var(--success)',
                              border: 'none', borderRadius: 'var(--radius-sm)',
                              cursor: isActing ? 'not-allowed' : 'pointer',
                              opacity: isActing ? 0.5 : 1,
                            }}
                          >
                            {t('workspace.members.invite.accept')}
                          </button>
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleInvitationAction(n.id, invitationId!, 'reject')}
                            style={{
                              padding: '0.25rem 0.625rem', fontSize: '0.6875rem', fontWeight: 500,
                              color: 'var(--text-muted)', background: 'var(--bg-hover)',
                              border: '0.0625rem solid var(--border)', borderRadius: 'var(--radius-sm)',
                              cursor: isActing ? 'not-allowed' : 'pointer',
                              opacity: isActing ? 0.5 : 1,
                            }}
                          >
                            {t('workspace.members.invite.reject')}
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Mark read */}
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      title={t('notifications.markRead')}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '1.625rem', height: '1.625rem', flexShrink: 0,
                        background: 'none', border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-faint)',
                        cursor: 'pointer',
                        transition: `background var(--duration), color var(--duration)`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-muted)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)'; }}
                    >
                      <CheckCircle2 size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.3125rem 0.625rem', fontSize: '0.75rem', fontWeight: 500,
              background: 'var(--bg-elevated)', color: 'var(--text-muted)',
              border: '0.0625rem solid var(--border)', borderRadius: 'var(--radius-md)',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              opacity: page === 0 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={12} strokeWidth={2} />
            {t('common.previous')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                style={{
                  width: '1.75rem', height: '1.75rem', fontSize: '0.6875rem', fontWeight: 500,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: i === page ? 'var(--accent)' : 'transparent',
                  color: i === page ? 'var(--accent-fg)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: `background var(--duration), color var(--duration)`,
                }}
                onMouseEnter={(e) => { if (i !== page) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (i !== page) e.currentTarget.style.background = 'transparent'; }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.3125rem 0.625rem', fontSize: '0.75rem', fontWeight: 500,
              background: 'var(--bg-elevated)', color: 'var(--text-muted)',
              border: '0.0625rem solid var(--border)', borderRadius: 'var(--radius-md)',
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages - 1 ? 0.4 : 1,
            }}
          >
            {t('common.next')}
            <ChevronRight size={12} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
