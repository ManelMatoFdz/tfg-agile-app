import { useTranslation } from 'react-i18next';
import type { PokerParticipant } from '../../types';

const AVATAR_COLORS = [
  '#2563EB', '#7C3AED', '#16A34A', '#D97706', '#DC2626',
  '#0891B2', '#4F46E5', '#059669', '#EA580C', '#DB2777',
];

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface Props {
  participants: PokerParticipant[];
  currentUserId?: string;
}

export default function LobbyParticipants({ participants, currentUserId }: Props) {
  const { t } = useTranslation();

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      padding: '32px 16px',
    }}>
      {/* Top row of participants */}
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 32 }}>
        {participants.slice(0, Math.ceil(participants.length / 2)).map((p) => (
          <ParticipantAvatar
            key={p.id}
            participant={p}
            isCurrentUser={p.userId === currentUserId}
            t={t}
          />
        ))}
      </div>

      {/* Central area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 48px',
        background: 'rgba(241,245,249,0.7)',
        borderRadius: 24,
        minWidth: 240,
        border: '1px solid #E2E8F0',
      }}>
        <p style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: '#CBD5E1',
          textTransform: 'uppercase',
        }}>
          {t('poker.room.planningPoker')}
        </p>
        <p style={{
          margin: '6px 0 0',
          fontSize: 13,
          color: '#94A3B8',
        }}>
          {t('poker.room.waitingForModeratorShort')}
        </p>
      </div>

      {/* Bottom row of participants */}
      {participants.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 32 }}>
          {participants.slice(Math.ceil(participants.length / 2)).map((p) => (
            <ParticipantAvatar
              key={p.id}
              participant={p}
              isCurrentUser={p.userId === currentUserId}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ParticipantAvatar({
  participant: p,
  isCurrentUser,
  t,
}: {
  participant: PokerParticipant;
  isCurrentUser: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const color = nameToColor(p.displayName);
  const initials = getInitials(p.displayName);
  const roleLabel = t(`poker.roles.${p.role}`);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      minWidth: 72,
    }}>
      {/* Avatar */}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 700,
          color: '#FFFFFF',
          border: isCurrentUser ? '3px solid #2563EB' : '2px solid #FFFFFF',
          boxShadow: isCurrentUser
            ? '0 0 0 2px #2563EB, 0 2px 8px rgba(37,99,235,0.2)'
            : '0 2px 8px rgba(0,0,0,0.08)',
          opacity: p.connected ? 1 : 0.4,
        }}>
          {initials}
        </div>

        {/* Connected badge */}
        {p.connected && (
          <span style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#16A34A',
            border: '2px solid #FFFFFF',
          }} />
        )}

        {/* YOU badge */}
        {isCurrentUser && (
          <span style={{
            position: 'absolute',
            top: -6,
            right: -8,
            fontSize: 9,
            fontWeight: 700,
            color: '#FFFFFF',
            background: '#2563EB',
            borderRadius: 4,
            padding: '1px 5px',
            letterSpacing: '0.04em',
          }}>
            {t('poker.room.youBadge')}
          </span>
        )}
      </div>

      {/* Name */}
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        color: p.connected ? '#1E293B' : '#94A3B8',
        textAlign: 'center',
        maxWidth: 90,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {p.displayName}
      </span>

      {/* Role */}
      <span style={{
        fontSize: 10,
        fontWeight: 500,
        color: p.role === 'MODERATOR' ? '#2563EB' : '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        {roleLabel}
      </span>
    </div>
  );
}