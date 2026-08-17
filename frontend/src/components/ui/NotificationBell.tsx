import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2 } from 'lucide-react';
import { notificationsApi } from '../../api/notifications';
import { useNotificationActors } from '../../hooks/useNotificationActors';
import { normalizeNotification, notificationActorId, timeAgo } from '../../utils/notificationMeta';
import NotificationSource from './NotificationSource';
import type { Notification, NotificationPage } from '../../types';

export default function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const actorsById = useNotificationActors(notifications);

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
                  background: 'transparent', color: 'var(--accent-text)',
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
                  border: '2px solid var(--border)', borderTopColor: 'var(--accent-text)',
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
                const actorId = notificationActorId(n);
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
                    <NotificationSource
                      notification={n}
                      actor={actorId ? actorsById[actorId] : undefined}
                      size={30}
                      iconSize={15}
                    />
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
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-text)'; }}
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
