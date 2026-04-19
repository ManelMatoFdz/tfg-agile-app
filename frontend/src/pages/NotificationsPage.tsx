import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { notificationsApi } from '../api/notifications';
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

const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  PROJECT_UPDATE: {
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  TASK_REMINDER: {
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
  DEFAULT: {
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    color: 'text-primary-600',
    bg: 'bg-primary-100',
  },
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState('');
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

  return (
    <div className="space-y-6 animate-slide-up-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('notifications.title')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('notifications.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {/* Filter tabs */}
          <div className="flex bg-gray-100/60 backdrop-blur-sm rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setUnreadOnly(false); setPage(0); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
                !unreadOnly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('notifications.all')}
            </button>
            <button
              type="button"
              onClick={() => { setUnreadOnly(true); setPage(0); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
                unreadOnly ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('notifications.unread')}
            </button>
          </div>
          <Button
            variant="ghost"
            onClick={handleMarkAll}
            loading={markAllAction.loading}
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">{t('notifications.markAll')}</span>
          </Button>
        </div>
      </div>

      {loadError && <Alert type="error" message={loadError} />}
      {markAllAction.error && <Alert type="error" message={markAllAction.error} />}

      {/* Notification list */}
      <div className="glass-card-strong rounded-2xl overflow-hidden">
        {loadingList ? (
          <div className="divide-y divide-gray-100/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-5 flex gap-4">
                <div className="w-10 h-10 skeleton-shimmer rounded-xl shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 skeleton-shimmer rounded-lg w-3/4" />
                  <div className="h-3 skeleton-shimmer rounded-lg w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">{t('notifications.empty')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('notifications.emptySubtitle')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/40 stagger-children">
            {notifications.map((n) => {
              const cfg = typeConfig[n.type] ?? typeConfig.DEFAULT;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 p-5 transition-all duration-300 hover:bg-gray-50/40 group ${
                    !n.read ? 'bg-primary-50/20' : ''
                  }`}
                >
                  {/* Type icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                    !n.read ? `${cfg.bg} ${cfg.color}` : 'bg-gray-100 text-gray-400'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={cfg.icon} />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0 animate-glow-pulse" />
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 tabular-nums">
                        {timeAgo(n.createdAt, t)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                  </div>

                  {/* Mark read button */}
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="shrink-0 px-3 py-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium rounded-lg hover:bg-primary-50 transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      {t('notifications.markRead')}
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
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('common.previous')}
          </Button>

          <div className="flex items-center gap-1 px-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  i === page
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            type="button"
          >
            {t('common.next')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
}