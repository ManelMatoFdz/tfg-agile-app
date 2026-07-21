import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap, LogOut, X, Play, FileText, Clock } from 'lucide-react';
import { pokerApi } from '../../../api/poker';
import { useAuthStore } from '../../../store/authStore';
import { usePokerSocket } from '../../../hooks/usePokerSocket';
import { useProjectMember } from '../../../hooks/useProjectMember';
import type { PokerSession, PokerRound, ParticipantRole, Task } from '../../../types';
import VotingCards from '../../../components/poker/VotingCards';
import ParticipantsList from '../../../components/poker/ParticipantsList';
import LobbyParticipants from '../../../components/poker/LobbyParticipants';
import VoteResults from '../../../components/poker/VoteResults';
import RoundHistory from '../../../components/poker/RoundHistory';
import SelectTaskModal from '../../../components/poker/SelectTaskModal';
import JoinSessionModal from '../../../components/poker/JoinSessionModal';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';

let pendingLeaveTimeout: ReturnType<typeof setTimeout> | null = null;

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  LOBBY:    { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  VOTING:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  REVEALED: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  CLOSED:   { color: '#94A3B8', bg: '#EDF0F4' },
};

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  HIGH:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  MEDIUM:   { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  LOW:      { color: '#94A3B8', bg: '#EDF0F4' },
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
  const [pendingTask, setPendingTask] = useState<Task | null>(null);
  const hasLeftRef = useRef(false);

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
    // Cancel any pending leave from a previous unmount (StrictMode remount)
    if (pendingLeaveTimeout) {
      clearTimeout(pendingLeaveTimeout);
      pendingLeaveTimeout = null;
    }
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
        const currentUser = useAuthStore.getState().user;
        if (currentUser && s.participants.some((p: { userId: string }) => p.userId === currentUser.id)) {
          hasJoinedRef.current = true;
        }
        setSessionReady(true);
      })
      .catch(() => setError(t('poker.room.loadError')))
      .finally(() => setLoading(false));

    return () => {
      if (hasLeftRef.current) return;
      if (sessionStorage.getItem('poker_reconnecting') === sessionId) {
        sessionStorage.removeItem('poker_reconnecting');
      } else {
        // Delay so StrictMode remount can cancel it
        pendingLeaveTimeout = setTimeout(() => {
          pokerApi.leaveSession(sessionId).catch(() => {});
          pendingLeaveTimeout = null;
        }, 200);
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

  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!sessionReady || memberLoading || !session || !user) return;
    if (session.status === 'CLOSED') return;

    const myParticipant = session.participants.find((p) => p.userId === user.id);

    if (myParticipant && !myParticipant.connected) {
      hasJoinedRef.current = true;
      pokerApi.joinSession(session.id, {
        displayName: myParticipant.displayName,
        role: myParticipant.role,
      })
        .then(() => pokerApi.getSession(session.id))
        .then(setSession)
        .catch(() => { /* ignore */ });
      return;
    }
    if (myParticipant) { hasJoinedRef.current = true; return; }
    if (hasJoinedRef.current) return;

    // Everyone sees the join modal
    setShowJoinModal(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, memberLoading]);

  useEffect(() => {
    if (!sessionState) return;
    setSession((prev) => {
      if (sessionState.status === 'VOTING' && prev?.status !== 'VOTING' && sessionId) {
        pokerApi.getRounds(sessionId).then(setRounds).catch(() => {});
        setPendingTask(null);
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

  const myParticipant = useMemo(
    () => session?.participants.find((p) => p.userId === user?.id),
    [session?.participants, user?.id],
  );

  const isFacilitator = myParticipant?.role === 'MODERATOR';
  const isVoter = myParticipant?.role === 'VOTER';

  const currentRound = useMemo(
    () => rounds.find((r) => r.status === 'VOTING' || r.status === 'REVEALED'),
    [rounds],
  );

  const handleVote = (value: string) => {
    setSelectedVote(value);
    sendVote(value);
  };

  const handleJoin = async (role: ParticipantRole) => {
    if (!sessionId) return;
    hasJoinedRef.current = true;
    const displayName = user?.fullName || user?.username || 'User';
    await pokerApi.joinSession(sessionId, { displayName, role });
    const updated = await pokerApi.getSession(sessionId);
    setSession(updated);
  };

  const handleSelectTask = (task: Task) => {
    setPendingTask(task);
    setShowTaskModal(false);
  };

  const handleStartVoting = async () => {
    if (!sessionId || !pendingTask) return;
    const round = await pokerApi.startRound(sessionId, { taskId: pendingTask.id, taskTitle: pendingTask.title });
    setRounds((prev) => [...prev, round]);
    setSelectedVote(null);
    setPendingTask(null);
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
    hasLeftRef.current = true;
    try {
      await pokerApi.leaveSession(sessionId);
    } catch {
      // ignore
    }
    navigate(`/workspaces/${workspaceId}/projects/${projectId}/poker`);
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
        .poker-lobby-layout{display:grid;gap:20px;grid-template-columns:1fr}
        @media(min-width:1024px){.poker-lobby-layout{grid-template-columns:2fr 3fr}}
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

      {/* ========== LOBBY STATE ========== */}
      {!isClosed && session.status === 'LOBBY' && !currentRound && (
        <>
          <div className="poker-lobby-layout">
            {/* Left: Task details panel */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              {pendingTask ? (() => {
                const ps = PRIORITY_STYLE[pendingTask.priority] ?? PRIORITY_STYLE.MEDIUM;
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: '#64748B',
                        background: '#F1F5F9', borderRadius: 6, padding: '3px 10px',
                        fontFamily: 'monospace',
                      }}>
                        {t(`tasks.types.${pendingTask.type}`)}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: ps.color, background: ps.bg,
                        borderRadius: 6, padding: '3px 10px',
                      }}>
                        {t(`tasks.priority.${pendingTask.priority}`)}
                      </span>
                      {pendingTask.storyPoints != null && (
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: '#2563EB', background: 'rgba(37,99,235,0.08)',
                          borderRadius: 6, padding: '3px 10px',
                        }}>
                          {pendingTask.storyPoints} SP
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1E293B', lineHeight: 1.3 }}>
                      {pendingTask.title}
                    </h3>
                    {(pendingTask.description || pendingTask.definitionOfDone) && (
                      <p style={{
                        margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {pendingTask.description || pendingTask.definitionOfDone}
                      </p>
                    )}
                    {isFacilitator && (
                      <button
                        onClick={() => setShowTaskModal(true)}
                        style={{
                          alignSelf: 'flex-start',
                          padding: '7px 14px', fontSize: 12, fontWeight: 500,
                          color: '#64748B', background: 'transparent',
                          border: '1px solid #E2E8F0', borderRadius: 8,
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#EDF0F4'; e.currentTarget.style.color = '#1E293B'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
                      >
                        {t('poker.room.changeTask')}
                      </button>
                    )}
                  </>
                );
              })() : (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', padding: '40px 16px',
                  flex: 1,
                }}>
                  <div style={{
                    width: 48, height: 48, background: 'rgba(37,99,235,0.08)',
                    borderRadius: 12, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 14,
                  }}>
                    <FileText size={22} strokeWidth={1.5} style={{ color: '#2563EB' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E293B' }}>
                    {t('poker.room.noTaskSelected')}
                  </p>
                  <p style={{ margin: '6px 0 18px', fontSize: 13, color: '#94A3B8', maxWidth: 280 }}>
                    {t('poker.room.noTaskSelectedSubtitle')}
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
                      {t('poker.room.selectTaskBtn')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Participants area */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {/* Top bar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderBottom: '1px solid #E2E8F0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 600,
                    color: '#16A34A', background: 'rgba(22,163,74,0.08)',
                    borderRadius: 999, padding: '4px 12px',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A' }} />
                    {t('poker.room.sessionActive')}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 500, color: '#94A3B8',
                  }}>
                    <Clock size={13} />
                    00:00
                  </span>
                </div>
                {isFacilitator && pendingTask && (
                  <button
                    onClick={handleStartVoting}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 18px', fontSize: 13, fontWeight: 600,
                      background: '#2563EB', color: '#FFFFFF',
                      border: 'none', borderRadius: 8,
                      cursor: 'pointer', transition: 'background 0.15s',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.2)',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1D4ED8')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#2563EB')}
                  >
                    <Play size={13} />
                    {t('poker.room.startVoting')}
                  </button>
                )}
              </div>

              {/* Participants circle */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LobbyParticipants
                  participants={session.participants}
                  currentUserId={user?.id}
                />
              </div>
            </div>
          </div>

          {/* Bottom: Disabled deck */}
          <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
            <VotingCards deck={session.deck} selectedValue={null} onVote={() => {}} disabled />
          </div>
          <p style={{
            margin: '-10px 0 0', textAlign: 'center',
            fontSize: 13, color: '#94A3B8', fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Zap size={14} />
            {t('poker.room.waitingForModerator')}
          </p>
        </>
      )}

      {/* ========== VOTING / REVEALED STATE ========== */}
      {!isClosed && (session.status !== 'LOBBY' || currentRound) && (
        <div className="poker-room-grid">
          {/* Main area */}
          <div className="poker-room-main" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          onSelect={handleSelectTask}
        />
      )}

      {showJoinModal && (() => {
        const hasModerator = session?.participants.some(
          (p) => p.role === 'MODERATOR' && p.connected
        );
        const scrumRole = member?.scrumRole;
        const canModerate = scrumRole === 'SCRUM_MASTER' || scrumRole === 'PRODUCT_OWNER' || member?.role === 'ADMIN';
        let roles: ParticipantRole[];
        let defRole: ParticipantRole;
        if (canModerate) {
          roles = hasModerator ? ['OBSERVER'] : ['MODERATOR', 'OBSERVER'];
          defRole = hasModerator ? 'OBSERVER' : 'MODERATOR';
        } else {
          roles = ['VOTER'];
          defRole = 'VOTER';
        }
        return (
          <JoinSessionModal
            displayName={user?.fullName || user?.username || 'User'}
            availableRoles={roles}
            defaultRole={defRole}
            onClose={() => {
              setShowJoinModal(false);
              navigate(`/workspaces/${workspaceId}/projects/${projectId}/poker`);
            }}
            onJoin={async (role) => {
              await handleJoin(role);
              setShowJoinModal(false);
            }}
          />
        );
      })()}
    </div>
  );
}