import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Zap } from 'lucide-react';
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

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  LOBBY:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  VOTING:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  REVEALED: { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  CLOSED:   { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
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
    // Clear any stale refresh flag from a previous visit
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

    // On SPA navigation (no beforeunload), leave explicitly.
    // On refresh/tab-close, skip — WebSocketDisconnectListener handles it.
    return () => {
      if (sessionStorage.getItem('poker_reconnecting') === sessionId) {
        sessionStorage.removeItem('poker_reconnecting');
      } else {
        pokerApi.leaveSession(sessionId).catch(() => {});
      }
    };
  }, [sessionId, t]);

  // Mark refresh/tab-close so the cleanup above can distinguish it from SPA navigation
  useEffect(() => {
    if (!sessionId) return;
    const handleBeforeUnload = () => {
      sessionStorage.setItem('poker_reconnecting', sessionId);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId]);

  // Decide join flow once both session and project member data are ready
  useEffect(() => {
    if (!sessionReady || memberLoading || !session || !user) return;
    if (session.status === 'CLOSED') return;

    const myParticipant = session.participants.find((p) => p.userId === user.id);

    // Already registered but disconnected (direct URL access after leaving) → reconnect
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
    if (myParticipant) return; // already connected, nothing to do

    if (member?.scrumRole == null) {
      // No Scrum role → auto-join as OBSERVER silently
      const displayName = user.fullName || user.username || 'Observer';
      pokerApi.joinSession(session.id, { displayName, role: 'OBSERVER' })
        .then(() => pokerApi.getSession(session.id))
        .then(setSession)
        .catch(() => { /* ignore, user stays as observer UI */ });
    } else {
      // Has scrum role but arrived via direct URL → show join modal as fallback
      setShowJoinModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, memberLoading]);

  useEffect(() => {
    if (!sessionState) return;
    setSession((prev) => {
      // If a new round started (session moved to VOTING with a new task), reload rounds
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
          width: 24, height: 24,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {(error || wsError) && (
        <Alert type="error" message={error || wsError!} onClose={() => setError(null)} />
      )}

      {/* Header */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button
              onClick={() => navigate(`/workspaces/${workspaceId}/projects/${projectId}/poker`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, flexShrink: 0,
                background: 'none', border: 'none', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-faint)', cursor: 'pointer',
                transition: `background var(--duration), color var(--duration)`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)'; }}
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: statusStyle.color, background: statusStyle.bg,
                  borderRadius: 'var(--radius-sm)', padding: '1px 6px',
                  letterSpacing: '0.03em',
                }}>
                  {t(`poker.status.${session.status}`)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t(`poker.decks.${session.deck}`)}</span>
                {connected && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    {t('poker.room.connected')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {!isClosed && (
              <button
                onClick={handleLeave}
                style={{
                  padding: '5px 10px', fontSize: 11, fontWeight: 500,
                  color: 'var(--text-muted)', background: 'none',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', transition: `background var(--duration)`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                {t('poker.room.leave')}
              </button>
            )}
            {isFacilitator && !isClosed && (
              <button
                onClick={handleClose}
                disabled={closing}
                style={{
                  padding: '5px 10px', fontSize: 11, fontWeight: 500,
                  color: 'var(--danger)', background: 'none',
                  border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)',
                  cursor: closing ? 'not-allowed' : 'pointer',
                  opacity: closing ? 0.5 : 1,
                  transition: `background var(--duration)`,
                }}
                onMouseEnter={(e) => { if (!closing) e.currentTarget.style.background = 'var(--danger-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                {t('poker.room.closeSession')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Closed state */}
      {isClosed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
              {t('poker.room.sessionClosed')}
            </p>
          </div>
          <RoundHistory rounds={rounds} />
        </div>
      )}

      {/* Active session */}
      {!isClosed && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main area */}
          <div className="lg:col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Current task */}
            {currentRound && (
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
              }}>
                <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                  {t('poker.room.estimating')}
                </p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {currentRound.taskTitle}
                </p>
              </div>
            )}

            {/* Lobby — no active round */}
            {session.status === 'LOBBY' && !currentRound && (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{
                  width: 44, height: 44, background: 'var(--accent-muted)',
                  borderRadius: 'var(--radius-md)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <Zap size={20} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                </div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
                  {t('poker.room.lobbyTitle')}
                </p>
                <p style={{ margin: '4px 0 16px', fontSize: 12, color: 'var(--text-faint)' }}>
                  {t('poker.room.lobbySubtitle')}
                </p>
                {isFacilitator && (
                  <button
                    onClick={() => setShowTaskModal(true)}
                    style={{
                      padding: '8px 18px', fontSize: 12, fontWeight: 600,
                      background: 'var(--accent)', color: '#fff',
                      border: 'none', borderRadius: 'var(--radius-md)',
                      cursor: 'pointer', transition: `background var(--duration)`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
                  >
                    {t('poker.room.startRound')}
                  </button>
                )}
              </div>
            )}

            {/* Voting state */}
            {session.status === 'VOTING' && currentRound?.status === 'VOTING' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {isVoter ? (
                  <VotingCards
                    deck={session.deck}
                    selectedValue={selectedVote}
                    onVote={handleVote}
                  />
                ) : (
                  <div style={{
                    textAlign: 'center', padding: '32px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                      {t('poker.room.waitingVotes')}
                    </p>
                  </div>
                )}

                {isFacilitator && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={sendReveal}
                      style={{
                        padding: '8px 20px', fontSize: 12, fontWeight: 600,
                        background: '#7c3aed', color: '#fff',
                        border: 'none', borderRadius: 'var(--radius-md)',
                        cursor: 'pointer', transition: `background var(--duration)`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#6d28d9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#7c3aed')}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ParticipantsList
              participants={session.participants}
              voteStatus={voteStatus}
              currentUserId={user?.id}
            />

            {isFacilitator && session.status === 'LOBBY' && !currentRound && rounds.length > 0 && (
              <button
                onClick={() => setShowTaskModal(true)}
                style={{
                  width: '100%', padding: '8px', fontSize: 12, fontWeight: 500,
                  color: 'var(--accent)', background: 'var(--accent-muted)',
                  border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', transition: `background var(--duration)`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent-muted)')}
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