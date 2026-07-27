import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, Bell, ClipboardList, Clock } from 'lucide-react';
import Toggle from '../ui/Toggle';
import Alert from '../ui/Alert';
import { notificationsApi } from '../../api/notifications';
import type { NotificationSettings } from '../../types';

const TOGGLE_ICONS: Record<string, React.ElementType> = {
  inAppNotificationsEnabled: Bell,
  projectUpdatesEnabled: ClipboardList,
  taskRemindersEnabled: Clock,
};

const TOGGLE_KEYS: Array<{ key: keyof NotificationSettings; tKey: string }> = [
  { key: 'inAppNotificationsEnabled', tKey: 'inApp' },
  { key: 'projectUpdatesEnabled', tKey: 'projectUpdates' },
  { key: 'taskRemindersEnabled', tKey: 'taskReminders' },
];

export default function NotificationPreferences() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    data: settings,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const res = await notificationsApi.getSettings();
      return res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<NotificationSettings>) => {
      const res = await notificationsApi.updateSettings(patch);
      return res.data;
    },
    onMutate: async (patch) => {
      setFeedback(null);
      await queryClient.cancelQueries({ queryKey: ['notification-settings'] });
      const previous = queryClient.getQueryData<NotificationSettings>(['notification-settings']);
      if (previous) {
        queryClient.setQueryData<NotificationSettings>(['notification-settings'], { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData<NotificationSettings>(['notification-settings'], context.previous);
      }
      setFeedback(t('profile.notificationSettings.saveError'));
    },
    onSuccess: (serverSettings) => {
      queryClient.setQueryData<NotificationSettings>(['notification-settings'], serverSettings);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) return;
    const patch: Partial<NotificationSettings> = { [key]: value };
    mutation.mutate(patch);
  };

  if (isError) return <Alert type="error" message={t('profile.notificationSettings.loadError')} />;
  if (isLoading || !settings) {
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 24,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton-shimmer" style={{ height: 20, width: 192, borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton-shimmer" style={{ height: 16, width: 288, borderRadius: 'var(--radius-sm)' }} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-shimmer" style={{ height: 48, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 36,
          height: 36,
          background: 'var(--moss-soft)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Settings size={18} strokeWidth={1.75} style={{ color: 'var(--moss)' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('profile.notificationSettings.title')}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
            {t('profile.notificationSettings.subtitle')}
          </p>
        </div>
      </div>

      {feedback && (
        <Alert
          type="error"
          message={feedback}
          onClose={() => setFeedback(null)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {TOGGLE_KEYS.map(({ key, tKey }, i) => {
          const Icon = TOGGLE_ICONS[key];
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 'var(--radius-md)',
                borderBottom: i < TOGGLE_KEYS.length - 1 ? '1px solid var(--border)' : 'none',
                transition: `background var(--duration-micro) var(--ease-micro)`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: 28,
                height: 28,
                background: 'var(--bg-sunken)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={14} strokeWidth={1.75} style={{ color: 'var(--text-faint)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Toggle
                  label={t(`profile.notificationSettings.${tKey}.label`)}
                  description={t(`profile.notificationSettings.${tKey}.description`)}
                  checked={settings[key]}
                  onChange={(v) => handleToggle(key, v)}
                  disabled={mutation.isPending}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}