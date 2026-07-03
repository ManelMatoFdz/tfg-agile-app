import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Zap, LogOut, X } from 'lucide-react';
import { pokerApi } from '../../../api/poker';
import { useAuthStore } from '../../../store/authStore';
import { usePokerSocket } from '../../../hooks/usePokerSocket';
import { useProjectMember } from '../../../hooks/useProjectMember';
import type { PokerSession, PokerRound, ParticipantRole } from '../../../types';
import VotingCards from '../../../components/poker/VotingCards';
import ParticipantsList from '../../../components/poker/ParticipantsList';
import VoteResults from '../../../components/poker/VoteResults';
import RoundHistory from '../../../components/poker/RoundHistory';
import SelectTaskModal from '../../../components/poker/SelectTaskModal';
import JoinSessionModal from '../../../components/poker/JoinSessionModal';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  LOBBY:    { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  VOTING:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  REVEALED: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  CLOSED:   { color: '#94A3B8', bg: '#EDF0F4' },
};

export default function PokerRoomPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId, sessionId } = useParams<{
    workspaceId: string;
    projectId: string;
    sessionId: string;
  }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { member, loading: memberLoading } = useProjectMember(projectId);

  const [session, setSession] = useState<PokerSession | null>(null);
  const [rounds, setRounds] = useState<PokerRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [closing, setClosing] = useState(false);

  const {
    connected,
    voteStatus,
    revealedRound,
    sessionState,
    participantUpdate,
    sendVote,
    sendReveal,
    sendNext,
    sendRevote,
    error: wsError,
  } = usePokerSocket(sessionId);

  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    sessionStorage.removeItem('poker_reconnecting');
    setLoading(true);
    setSessionReady(false);
    Promise.all([
      pokerApi.getSession(sessionId),
      pokerApi.getRounds(sessionId),
    ])
      .then(([s, r]) => {
        setSession(s);
        setRounds(r);
        setSessionReady(true);
      })
      .catch(() => setError(t('poker.room.loadError')))
      .finally(() => setLoading(false));

    return () => {
      if (sessionStorage.getItem('poker_reconnecting') === sessionId) {
        sessionStorage.removeItem('poker_reconnecting');
      } else {
        pokerApi.leaveSession(sessionId).catch(() => {});
      }
    };
  }, [sessionId, t]);

  useEffect(() => {
    if (!sessionId) return;
    const handleBeforeUnload = () => {
      sessionStorage.setItem('poker_reconnecting', sessionId);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionReady || memberLoading || !session || !user) return;
    if (session.status === 'CLOSED') return;

    const myParticipant = session.participants.find((p) => p.userId === user.id);

    if (myParticipant && !myParticipant.connected) {
      pokerApi.joinSession(session.id, {
        displayName: myParticipant.displayName,
        role: myParticipant.role,
      })
        .then(() => pokerApi.getSession(session.id))
        .then(setSession)
        .catch(() => { /* ignore */ });
      return;
    }
    if (myParticipant) return;

    if (member?.scrumRole == null) {
      const displayName = user.fullName || user.username || 'Observer';
      pokerApi.joinSession(session.id, { displayName, role: 'OBSERVER' })
        .then(() => pokerApi.getSession(session.id))
        .then(setSession)
        .catch(() => { /* ignore */ });
    } else {
      setShowJoinModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, memberLoading]);

  useEffect(() => {
    if (!sessionState) return;
    setSession((prev) => {
      if (sessionState.status === 'VOTING' && prev?.status !== 'VOTING' && sessionId) {
        pokerApi.getRounds(sessionId).then(setRounds).catch(() => {});
      }
      return sessionState;
    });
  }, [sessionState, sessionId]);

  useEffect(() => {
    if (participantUpdate) {
      setSession((prev) => prev ? { ...prev, participants: participantUpdate } : prev);
    }
  }, [participantUpdate]);

  useEffect(() => {
    if (revealedRound) {
      setRounds((prev) => {
        const idx = prev.findIndex((r) => r.id === revealedRound.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = revealedRound;
          return copy;
        }
        return [...prev, revealedRound];
      });
      setSelectedVote(null);
    }
  }, [revealedRound]);

  const isFacilitator = useMemo(
    () => session?.createdBy === user?.id,
    [session?.createdBy, user?.id],
  );

  const myParticipant = useMemo(
    () => session?.participants.find((p) => p.userId === user?.id),
    [session?.participants, user?.id],
  );

  const isVoter = myParticipant?.role === 'VOTER';

  const currentRound = useMemo(
    () => rounds.find((r) => r.status === 'VOTING' || r.status === 'REVEALED'),
    [rounds],
  );

  const handleVote = (value: string) => {
    setSelectedVote(value);
    sendVote(value);
  };

  const handleJoin = async (displayName: string, role: ParticipantRole) => {
    if (!sessionId) return;
    await pokerApi.joinSession(sessionId, { displayName, role });
    const updated = await pokerApi.getSession(sessionId);
    setSession(updated);
  };

  const handleStartRound = async (taskId: string, taskTitle: string) => {
    if (!sessionId) return;
    const round = await pokerApi.startRound(sessionId, { taskId, taskTitle });
    setRounds((prev) => [...prev, round]);
    setSelectedVote(null);
    const updated = await pokerApi.getSession(sessionId);
    setSession(updated);
  };

  const handleAcceptEstimate = (finalEstimate: number | null) => {
    sendNext(finalEstimate);
    setSelectedVote(null);
  };

  const handleRevote = () => {
    sendRevote();
    setSelectedVote(null);
  };

  const handleClose = async () => {
    if (!sessionId) return;
    setClosing(true);
    try {
      const updated = await pokerApi.closeSession(sessionId);
      setSession(updated);
    } catch {
      setError(t('poker.room.closeError'));
    } finally {
      setClosing(false);
    }
  };

  const handleLeave = async () => {
    if (!sessionId) return;
    try {
      await pokerApi.leaveSession(sessionId);
      navigate(`/workspaces/${workspaceId}/projects/${projectId}/poker`);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{
          width: 28, height: 28,
          border: '3px solid #E2E8F0',
          borderTopColor: '#2563EB',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  if (!session) {
    return <Alert type="error" message={t('poker.room.loadError')} />;
  }

  const isClosed = session.status === 'CLOSED';
  const statusStyle = STATUS_STYLE[session.status] ?? STATUS_STYLE.CLOSED;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        .poker-room-grid{display:grid;gap:20px;grid-template-columns:1fr}
        @media(min-width:1024px){.poker-room-grid{grid-template-columns:3fr 1fr}.poker-room-main{grid-column:1}}
      `}</style>
      {(error || wsError) && (
        <Alert type="error" message={error || wsError!} onClose={() => setError(null)} />
      )}

      {/* Header card */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              onClick={() => navigate(`/workspaces/${workspaceId}/projects/${projectId}/poker`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, flexShrink: 0,
                background: '#F7F8FA', border: '1px solid #E2E8F0', borderRadius: 8,
                color: '#64748B', cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EDF0F4'; e.currentTarget.style.color = '#1E293B'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F7F8FA'; e.currentTarget.style.color = '#64748B'; }}
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <div style={{ minWidth: 0 }}>
              <PageTitle as="h2" style={{ fontSize: 18, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1E293B' }}>
                {session.name}
              </PageTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: statusStyle.color, background: statusStyle.bg,
                  borderRadius: 999, padding: '3px 10px',
                }}>
                  {t(`poker.status.${session.status}`)}
                </span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{t(`poker.decks.${session.deck}`)}</span>
                {connected && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#16A34A', fontWeight: 500 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A', display: 'inline-block', boxShadow: '0 0 6px rgba(22,163,74,0.3)' }} />
                    {t('poker.room.connected')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {!isClosed && (
              <button
                onClick={handleLeave}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', fontSize: 12, fontWeight: 500,
                  color: '#64748B', background: '#FFFFFF',
                  border: '1px solid #E2E8F0', borderRadius: 8,
                  cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#EDF0F4'; e.currentTarget.style.color = '#1E293B'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#64748B'; }}
              >
                <LogOut size={13} />
                {t('poker.room.leave')}
              </button>
            )}
            {isFacilitator && !isClosed && (
              <button
                onClick={handleClose}
                disabled={closing}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', fontSize: 12, fontWeight: 500,
                  color: '#DC2626', background: '#FFFFFF',
                  border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8,
                  cursor: closing ? 'not-allowed' : 'pointer',
                  opacity: closing ? 0.5 : 1,
                  transition: 'background 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { if (!closing) e.currentTarget.style.background = 'rgba(220,38,38,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
              >
                <X size={13} />
                {t('poker.room.closeSession')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Closed state */}
      {isClosed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            textAlign: 'center', padding: '40px 0',
            background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#64748B' }}>
              {t('poker.room.sessionClosed')}
            </p>
          </div>
          <RoundHistory rounds={rounds} />
        </div>
      )}

      {/* Active session */}
      {!isClosed && (
        <div className="poker-room-grid">
          {/* Main area */}
          <div className="poker-room-main" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Current task */}
            {currentRound && (
              <div style={{
                background: 'rgba(37,99,235,0.04)',
                border: '1px solid rgba(37,99,235,0.15)',
                borderRadius: 12,
                padding: '14px 20px',
              }}>
                <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563EB' }}>
                  {t('poker.room.estimating')}
                </p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
                  {currentRound.taskTitle}
                </p>
              </div>
            )}

            {/* Lobby -- no active round */}
            {session.status === 'LOBBY' && !currentRound && (
              <div style={{
                textAlign: 'center',
                padding: '56px 24px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  width: 56, height: 56, background: 'rgba(37,99,235,0.08)',
                  borderRadius: 12, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Zap size={24} strokeWidth={1.5} style={{ color: '#2563EB' }} />
                </div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1E293B' }}>
                  {t('poker.room.lobbyTitle')}
                </p>
                <p style={{ margin: '6px 0 20px', fontSize: 13, color: '#94A3B8' }}>
                  {t('poker.room.lobbySubtitle')}
                </p>
                {isFacilitator && (
                  <button
                    onClick={() => setShowTaskModal(true)}
                    style={{
                      padding: '10px 24px', fontSize: 14, fontWeight: 600,
                      background: '#2563EB', color: '#FFFFFF',
                      border: 'none', borderRadius: 8,
                      cursor: 'pointer', transition: 'background 0.15s',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.2)',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1D4ED8')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#2563EB')}
                  >
                    {t('poker.room.startRound')}
                  </button>
                )}
              </div>
            )}

            {/* Voting state */}
            {session.status === 'VOTING' && currentRound?.status === 'VOTING' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {isVoter ? (
                  <VotingCards
                    deck={session.deck}
                    selectedValue={selectedVote}
                    onVote={handleVote}
                  />
                ) : (
                  <div style={{
                    textAlign: 'center', padding: '40px',
                    background: '#FFFFFF', border: '1px solid #E2E8F0',
                    borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#64748B' }}>
                      {t('poker.room.waitingVotes')}
                    </p>
                  </div>
                )}

                {isFacilitator && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={sendReveal}
                      style={{
                        padding: '10px 28px', fontSize: 13, fontWeight: 600,
                        background: '#8B5CF6', color: '#FFFFFF',
                        border: 'none', borderRadius: 8,
                        cursor: 'pointer', transition: 'background 0.15s',
                        boxShadow: '0 2px 8px rgba(139,92,246,0.2)',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#7C3AED')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#8B5CF6')}
                    >
                      {t('poker.room.revealVotes')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Revealed state */}
            {(session.status === 'REVEALED' || currentRound?.status === 'REVEALED') && currentRound && (
              <VoteResults
                round={revealedRound ?? currentRound}
                participants={session.participants}
                isFacilitator={isFacilitator}
                onAccept={handleAcceptEstimate}
                onRevote={handleRevote}
              />
            )}

            <RoundHistory rounds={rounds} />
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ParticipantsList
              participants={session.participants}
              voteStatus={voteStatus}
              currentUserId={user?.id}
            />

            {isFacilitator && session.status === 'LOBBY' && !currentRound && rounds.length > 0 && (
              <button
                onClick={() => setShowTaskModal(true)}
                style={{
                  width: '100%', padding: '10px', fontSize: 13, fontWeight: 600,
                  color: '#2563EB', background: 'rgba(37,99,235,0.06)',
                  border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8,
                  cursor: 'pointer', transition: 'background 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(37,99,235,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(37,99,235,0.06)')}
              >
                {t('poker.room.nextTask')}
              </button>
            )}
          </div>
        </div>
      )}

      {showTaskModal && projectId && (
        <SelectTaskModal
          projectId={projectId}
          onClose={() => setShowTaskModal(false)}
          onSelect={handleStartRound}
        />
      )}

      {showJoinModal && (
        <JoinSessionModal
          defaultRole={member?.scrumRole === 'PRODUCT_OWNER' ? 'OBSERVER' : 'VOTER'}
          onClose={() => {
            setShowJoinModal(false);
            navigate(`/workspaces/${workspaceId}/projects/${projectId}/poker`);
          }}
          onJoin={async (displayName, role) => {
            await handleJoin(displayName, role);
            setShowJoinModal(false);
          }}
        />
      )}
    </div>
  );
}