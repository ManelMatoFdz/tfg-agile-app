import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toggle from '../ui/Toggle';
import Alert from '../ui/Alert';
import { notificationsApi } from '../../api/notifications';
import type { NotificationSettings } from '../../types';

const TOGGLE_ICONS: Record<string, string> = {
  emailNotificationsEnabled: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  inAppNotificationsEnabled: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  projectUpdatesEnabled: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  taskRemindersEnabled: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

const TOGGLE_KEYS: Array<{ key: keyof NotificationSettings; tKey: string }> = [
  { key: 'emailNotificationsEnabled', tKey: 'email' },
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
      <div className="glass-card-strong rounded-2xl p-6">
        <div className="space-y-4">
          <div className="h-5 skeleton-shimmer rounded w-48" />
          <div className="h-4 skeleton-shimmer rounded w-72" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 skeleton-shimmer rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card-strong rounded-2xl p-6 space-y-6 hover:shadow-xl transition-shadow duration-500">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t('profile.notificationSettings.title')}</h3>
          <p className="text-sm text-gray-400 mt-0.5">{t('profile.notificationSettings.subtitle')}</p>
        </div>
      </div>

      {feedback && (
        <Alert
          type="error"
          message={feedback}
          onClose={() => setFeedback(null)}
        />
      )}

      <div className="space-y-1 stagger-children">
        {TOGGLE_KEYS.map(({ key, tKey }, i) => (
          <div
            key={key}
            className={`flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/50 transition-colors duration-200 ${
              i < TOGGLE_KEYS.length - 1 ? 'border-b border-gray-100/50' : ''
            }`}
          >
            <div className="w-8 h-8 bg-gray-100/80 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={TOGGLE_ICONS[key]} />
              </svg>
            </div>
            <div className="flex-1">
              <Toggle
                label={t(`profile.notificationSettings.${tKey}.label`)}
                description={t(`profile.notificationSettings.${tKey}.description`)}
                checked={settings[key]}
                onChange={(v) => handleToggle(key, v)}
                disabled={mutation.isPending}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
