import { useState } from 'react';
import type { Notification, UserSummary } from '../../types';
import { buildAvatarSrc } from '../../utils/avatarUrl';
import { gitNotificationMeta, notificationMeta } from '../../utils/notificationMeta';

type Props = {
  notification: Notification;
  actor?: UserSummary;
  size?: number;
  iconSize?: number;
};

export default function NotificationSource({ notification, actor, size = 40, iconSize = 18 }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const avatarSrc = buildAvatarSrc(actor?.avatarUrl);
  const actorName = actor?.fullName || actor?.username || '';
  const gitMeta = gitNotificationMeta(notification.title);

  if (!gitMeta && actor) {
    const initials = actorName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?';
    const showImage = avatarSrc && failedSrc !== avatarSrc;

    return (
      <div
        title={actorName}
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'var(--accent-muted)',
        }}
      >
        {showImage ? (
          <img
            src={avatarSrc}
            alt={actorName}
            referrerPolicy="no-referrer"
            onError={() => setFailedSrc(avatarSrc)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-text)', fontSize: Math.max(11, size * 0.32), fontWeight: 700,
          }}>
            {initials}
          </span>
        )}
      </div>
    );
  }

  const { Icon, color, bg } = gitMeta ?? notificationMeta(notification.type);
  return (
    <div style={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: 'var(--radius-md)',
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: notification.read ? 0.72 : 1,
    }}>
      <Icon size={iconSize} strokeWidth={1.75} style={{ color }} />
    </div>
  );
}
