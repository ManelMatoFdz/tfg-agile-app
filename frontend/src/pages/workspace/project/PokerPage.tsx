import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Zap } from 'lucide-react';
import { pokerApi } from '../../../api/poker';
import type { PokerSession, DeckType, SessionStatus, ParticipantRole } from '../../../types';
import CreateSessionModal from '../../../components/poker/CreateSessionModal';
import JoinSessionModal from '../../../components/poker/JoinSessionModal';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import { useAuthStore } from '../../../store/authStore';
import { useProjectMember } from '../../../hooks/useProjectMember';

const STATUS_STYLE: Record<SessionStatus, { color: string; bg: string }> = {
  LOBBY:    { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  VOTING:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  REVEALED: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  CLOSED:   { color: '#94A3B8', bg: '#EDF0F4' },
};

export default function PokerPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { member } = useProjectMember(projectId);

  const [sessions, setSessions] = useState<PokerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingSession, setPendingSession] = useState<PokerSession | null>(null);

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

  const goToRoom = (sessionId: string) =>
    navigate(`/workspaces/${workspaceId}/projects/${projectId}/poker/${sessionId}`);

  const handleClick = async (session: PokerSession) => {
    if (session.status === 'CLOSED') {
      goToRoom(session.id);
      return;
    }
    const myParticipant = session.participants.find((p) => p.userId === user?.id);
    if (myParticipant) {
      if (!myParticipant.connected) {
        try {
          await pokerApi.joinSession(session.id, {
            displayName: myParticipant.displayName,
            role: myParticipant.role,
          });
        } catch { /* room page will handle it */ }
      }
      goToRoom(session.id);
      return;
    }
    if (member?.scrumRole == null) {
      const displayName = user?.fullName || user?.username || 'Observer';
      try { await pokerApi.joinSession(session.id, { displayName, role: 'OBSERVER' }); }
      catch { /* room page will handle it */ }
      goToRoom(session.id);
      return;
    }
    setPendingSession(session);
  };

  const handleJoin = async (displayName: string, role: ParticipantRole) => {
    if (!pendingSession) return;
    await pokerApi.joinSession(pendingSession.id, { displayName, role });
    goToRoom(pendingSession.id);
  };

  const activeSessions = sessions.filter((s) => s.status !== 'CLOSED');
  const closedSessions = sessions.filter((s) => s.status === 'CLOSED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        .poker-grid{display:grid;gap:16px;grid-template-columns:1fr}
        @media(min-width:640px){.poker-grid{grid-template-columns:1fr 1fr}}
        @media(min-width:1024px){.poker-grid{grid-template-columns:1fr 1fr 1fr}}
        .poker-session-card{transition:border-color 0.15s,box-shadow 0.15s,transform 0.15s}
        .poker-session-card:hover{border-color:#2563EB;box-shadow:0 4px 12px rgba(37,99,235,0.08);transform:translateY(-1px)}
      `}</style>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <PageTitle as="h2" style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', letterSpacing: '-0.02em' }}>
            {t('poker.title')}
          </PageTitle>
          {sessions.length > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
              {sessions.length} {sessions.length === 1 ? t('poker.session') : t('poker.sessions')}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            background: '#2563EB', color: '#FFFFFF',
            border: 'none', borderRadius: 8,
            cursor: 'pointer', transition: 'background 0.15s',
            boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1D4ED8')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2563EB')}
        >
          <Plus size={14} strokeWidth={2.5} />
          {t('poker.newSession')}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 28, height: 28,
            border: '3px solid #E2E8F0',
            borderTopColor: '#2563EB',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : sessions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            width: 56, height: 56,
            background: 'rgba(37,99,235,0.08)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Zap size={24} strokeWidth={1.5} style={{ color: '#2563EB' }} />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E293B' }}>{t('poker.noSessions')}</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94A3B8' }}>{t('poker.noSessionsSubtitle')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {activeSessions.length > 0 && (
            <div>
              <p style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#64748B',
                marginBottom: 12,
              }}>
                {t('poker.activeSessions')}
              </p>
              <div className="poker-grid">
                {activeSessions.map((session) => {
                  const statusStyle = STATUS_STYLE[session.status];
                  return (
                    <button
                      key={session.id}
                      onClick={() => handleClick(session)}
                      className="poker-session-card"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        padding: '18px 20px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {session.name}
                        </h4>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: statusStyle.color, background: statusStyle.bg,
                          borderRadius: 999, padding: '3px 10px',
                          flexShrink: 0,
                        }}>
                          {t(`poker.status.${session.status}`)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#94A3B8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={13} strokeWidth={2} />
                          {session.participants.filter((p) => p.connected).length}
                        </span>
                        <span style={{ width: 1, height: 12, background: '#E2E8F0' }} />
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
              <p style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#94A3B8',
                marginBottom: 12,
              }}>
                {t('poker.closedSessions')}
              </p>
              <div className="poker-grid">
                {closedSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleClick(session)}
                    className="poker-session-card"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '18px 20px',
                      cursor: 'pointer',
                      opacity: 0.7,
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {session.name}
                      </h4>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: '#94A3B8',
                        background: '#EDF0F4',
                        borderRadius: 999, padding: '3px 10px', flexShrink: 0,
                      }}>
                        {t('poker.status.CLOSED')}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>
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

      {pendingSession && (
        <JoinSessionModal
          defaultRole={member?.scrumRole === 'PRODUCT_OWNER' ? 'OBSERVER' : 'VOTER'}
          onClose={() => setPendingSession(null)}
          onJoin={handleJoin}
        />
      )}
    </div>
  );
}