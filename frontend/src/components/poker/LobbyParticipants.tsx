import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { PokerParticipant, UserSummary } from '../../types';

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
  voteStatus?: Record<string, boolean>;
  isVoting?: boolean;
  userMap?: Record<string, UserSummary>;
}

export default function LobbyParticipants({ participants, currentUserId, voteStatus, isVoting, userMap = {} }: Props) {
  const { t } = useTranslation();

  const voterCount = isVoting ? participants.filter((p) => p.role === 'VOTER').length : 0;
  const votedCount = isVoting && voteStatus
    ? Object.values(voteStatus).filter(Boolean).length
    : 0;

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 20,
      padding: '24px 16px',
    }}>
      {/* Top row of participants */}
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 32 }}>
        {participants.slice(0, Math.ceil(participants.length / 2)).map((p) => (
          <ParticipantAvatar
            key={p.id}
            participant={p}
            isCurrentUser={p.userId === currentUserId}
            hasVoted={voteStatus?.[p.userId]}
            isVoting={isVoting}
            avatarUrl={userMap[p.userId]?.avatarUrl}
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
        padding: '24px 40px',
        background: isVoting ? 'var(--warning-bg)' : 'var(--bg-elevated)',
        borderRadius: 24,
        minWidth: 240,
        border: `1px solid ${isVoting ? 'rgba(245,158,11,0.35)' : 'var(--border)'}`,
        boxShadow: isVoting ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        {isVoting ? (
          <>
            <p style={{
              margin: 0, fontSize: 32, fontWeight: 800,
              color: '#F59E0B',
            }}>
              {votedCount}/{voterCount}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
              {t('poker.room.votedProgress', { voted: votedCount, total: voterCount })}
            </p>
          </>
        ) : (
          <>
            <p style={{
              margin: 0, fontSize: 18, fontWeight: 700,
              letterSpacing: '0.06em', color: 'var(--text-faint)',
              textTransform: 'uppercase',
            }}>
              {t('poker.room.planningPoker')}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 500 }}>
              {t('poker.room.waitingForModerator')}
            </p>
          </>
        )}
      </div>

      {/* Bottom row of participants */}
      {participants.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 32 }}>
          {participants.slice(Math.ceil(participants.length / 2)).map((p) => (
            <ParticipantAvatar
              key={p.id}
              participant={p}
              isCurrentUser={p.userId === currentUserId}
              hasVoted={voteStatus?.[p.userId]}
              isVoting={isVoting}
              avatarUrl={userMap[p.userId]?.avatarUrl}
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
  hasVoted,
  isVoting,
  avatarUrl,
  t,
}: {
  participant: PokerParticipant;
  isCurrentUser: boolean;
  hasVoted?: boolean;
  isVoting?: boolean;
  avatarUrl?: string | null;
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
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={p.displayName}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              objectFit: 'cover',
              border: isCurrentUser ? '3px solid #2563EB' : '2px solid var(--bg-elevated)',
              boxShadow: isCurrentUser
                ? '0 0 0 2px #2563EB, 0 2px 8px rgba(37,99,235,0.2)'
                : '0 2px 8px rgba(0,0,0,0.08)',
              opacity: p.connected ? 1 : 0.4,
            }}
          />
        ) : (
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
            border: isCurrentUser ? '3px solid #2563EB' : '2px solid var(--bg-elevated)',
            boxShadow: isCurrentUser
              ? '0 0 0 2px #2563EB, 0 2px 8px rgba(37,99,235,0.2)'
              : '0 2px 8px rgba(0,0,0,0.08)',
            opacity: p.connected ? 1 : 0.4,
          }}>
            {initials}
          </div>
        )}

        {/* Vote check badge (voting mode) */}
        {isVoting && hasVoted ? (
          <span style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 16, height: 16, borderRadius: '50%',
            background: '#16A34A', border: '2px solid var(--bg-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={10} color="#FFFFFF" strokeWidth={3} />
          </span>
        ) : p.connected && (
          /* Connected badge (lobby mode) */
          <span style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#16A34A',
            border: '2px solid var(--bg-elevated)',
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
        color: p.connected ? 'var(--text)' : 'var(--text-faint)',
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
        color: p.role === 'MODERATOR' ? 'var(--accent-text)' : 'var(--text-faint)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        {roleLabel}
      </span>
    </div>
  );
}