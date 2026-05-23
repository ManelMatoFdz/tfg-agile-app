import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Zap } from 'lucide-react';
import { pokerApi } from '../../../api/poker';
import type { PokerSession, DeckType, SessionStatus } from '../../../types';
import CreateSessionModal from '../../../components/poker/CreateSessionModal';
import Alert from '../../../components/ui/Alert';

const STATUS_STYLE: Record<SessionStatus, { color: string; bg: string }> = {
  LOBBY:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  VOTING:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  REVEALED: { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  CLOSED:   { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
};

export default function PokerPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<PokerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    pokerApi.listSessions(projectId)
      .then(setSessions)
      .catch(() => setError(t('poker.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, t]);

  const handleCreate = async (name: string, deck: DeckType) => {
    if (!projectId) return;
    const session = await pokerApi.createSession(projectId, { name, deck });
    setSessions((prev) => [session, ...prev]);
  };

  const handleClick = (session: PokerSession) => {
    navigate(`/workspaces/${workspaceId}/projects/${projectId}/poker/${session.id}`);
  };

  const activeSessions = sessions.filter((s) => s.status !== 'CLOSED');
  const closedSessions = sessions.filter((s) => s.status === 'CLOSED');

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    marginBottom: 8,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em' }}>
            {t('poker.title')}
          </h2>
          {sessions.length > 0 && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
              {sessions.length} {sessions.length === 1 ? t('poker.session') : t('poker.sessions')}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', fontSize: 12, fontWeight: 500,
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', transition: `background var(--duration)`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
        >
          <Plus size={12} strokeWidth={2.5} />
          {t('poker.newSession')}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 24, height: 24,
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : sessions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 24px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{
            width: 44, height: 44,
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Zap size={20} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{t('poker.noSessions')}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>{t('poker.noSessionsSubtitle')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {activeSessions.length > 0 && (
            <div>
              <p style={sectionLabel}>{t('poker.activeSessions')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeSessions.map((session) => {
                  const statusStyle = STATUS_STYLE[session.status];
                  return (
                    <button
                      key={session.id}
                      onClick={() => handleClick(session)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: `border-color var(--duration), background var(--duration)`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {session.name}
                        </h4>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: statusStyle.color, background: statusStyle.bg,
                          borderRadius: 'var(--radius-sm)', padding: '2px 7px',
                          flexShrink: 0, letterSpacing: '0.03em',
                        }}>
                          {t(`poker.status.${session.status}`)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-faint)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Users size={11} strokeWidth={2} />
                          {session.participants.filter((p) => p.connected).length}
                        </span>
                        <span>{t(`poker.decks.${session.deck}`)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {closedSessions.length > 0 && (
            <div>
              <p style={sectionLabel}>{t('poker.closedSessions')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {closedSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleClick(session)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      opacity: 0.7,
                      transition: `opacity var(--duration)`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {session.name}
                      </h4>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: '#9ca3af',
                        background: 'rgba(156,163,175,0.1)',
                        borderRadius: 'var(--radius-sm)', padding: '2px 7px', flexShrink: 0,
                      }}>
                        {t('poker.status.CLOSED')}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>
                      {t(`poker.decks.${session.deck}`)} · {session.participants.length} {t('poker.room.participants').toLowerCase()}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}