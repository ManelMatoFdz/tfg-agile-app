import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2 } from 'lucide-react';
import type { TFunction } from 'i18next';
import { notificationsApi } from '../../api/notifications';
import type { Notification, NotificationPage } from '../../types';

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

const NOTIF_ICONS: Record<string, { iconPath: string; color: string; bg: string }> = {
  PROJECT_UPDATE: {
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    color: 'var(--ink-blue)', bg: 'var(--ink-blue-soft)',
  },
  TASK_REMINDER: {
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'var(--ochre)', bg: 'var(--ochre-soft)',
  },
  WORKSPACE_INVITATION: {
    iconPath: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    color: 'var(--success)', bg: 'var(--success-bg)',
  },
  POKER_INVITATION: {
    iconPath: 'M3 10h18M3 6h18M3 14h18M3 18h18',
    color: 'var(--violet, #8b5cf6)', bg: 'var(--violet-soft, rgba(139,92,246,0.1))',
  },
  DEFAULT: {
    iconPath: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    color: 'var(--accent)', bg: 'var(--accent-muted)',
  },
};

function normalizeNotification(item: Partial<Notification> & { isRead?: boolean }): Notification {
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

export default function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    notificationsApi.list({ unreadOnly: true, size: 1 }).then((res) => {
      setUnreadCount(res.data.totalElements);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list({ size: 8 });
      const data: NotificationPage = res.data;
      const list = Array.isArray(data.content) ? data.content : Array.isArray(data.items) ? data.items : [];
      setNotifications(list.map((item) => normalizeNotification(item)));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) loadNotifications();
  };

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await notificationsApi.markRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36,
          borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)',
          background: 'var(--bg-hover)', color: 'var(--text-muted)',
          cursor: 'pointer',
        }}
      >
        <Bell size={16} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 18, height: 18, padding: '0 5px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--danger)', color: '#fff',
            fontSize: 10, fontWeight: 700, borderRadius: 'var(--radius-pill)',
            border: '2px solid var(--bg-elevated)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 44,
          width: 360, maxHeight: 'min(460px, 70vh)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', zIndex: 100,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {t('notifications.title')}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', fontSize: 11, fontWeight: 500,
                  background: 'transparent', color: 'var(--accent)',
                  border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <CheckCircle2 size={12} strokeWidth={2} />
                {t('notifications.markAll')}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <div style={{
                  width: 20, height: 20,
                  border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Bell size={20} strokeWidth={1.5} style={{ color: 'var(--text-faint)', margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                  {t('notifications.empty')}
                </p>
              </div>
            ) : (
              notifications.map((n, idx) => {
                const cfg = NOTIF_ICONS[n.type] ?? NOTIF_ICONS.DEFAULT;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 16px',
                      borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                      background: !n.read ? 'var(--accent-muted)' : 'transparent',
                      transition: 'background 150ms',
                      cursor: n.link ? 'pointer' : 'default',
                    }}
                    onMouseEnter={e => { if (n.read) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = !n.read ? 'var(--accent-muted)' : 'transparent'; }}
                  >
                    <div style={{
                      width: 30, height: 30, flexShrink: 0,
                      borderRadius: 'var(--radius-sm)',
                      background: !n.read ? cfg.bg : 'var(--bg-hover)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width={14} height={14} fill="none" stroke={!n.read ? cfg.color : 'var(--text-faint)'} viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d={cfg.iconPath} />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <p style={{
                          margin: 0, fontSize: 12, flex: 1, minWidth: 0,
                          fontWeight: !n.read ? 600 : 400,
                          color: !n.read ? 'var(--text)' : 'var(--text-muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span style={{
                            width: 6, height: 6, flexShrink: 0,
                            background: 'var(--accent)', borderRadius: '50%',
                          }} />
                        )}
                      </div>
                      <p style={{
                        margin: '2px 0 0', fontSize: 11, color: 'var(--text-faint)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                        {timeAgo(n.createdAt, t)}
                      </span>
                    </div>
                    {!n.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                        title={t('notifications.markRead')}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 24, height: 24, flexShrink: 0,
                          background: 'none', border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-faint)', cursor: 'pointer',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; }}
                      >
                        <CheckCircle2 size={13} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}