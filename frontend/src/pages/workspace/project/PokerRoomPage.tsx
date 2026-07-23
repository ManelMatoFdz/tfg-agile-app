import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap, LogOut, X, Play, FileText, Clock, BookOpen, CheckSquare, Bug } from 'lucide-react';
import type { TaskType } from '../../../types';
import { pokerApi } from '../../../api/poker';
import { tasksApi } from '../../../api/tasks';
import { useAuthStore } from '../../../store/authStore';
import { usePokerSocket } from '../../../hooks/usePokerSocket';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useProjectMembers } from '../../../hooks/useProjectMembers';
import { AssigneeAvatar } from '../../../components/kanban/TaskModal';
import type { PokerSession, PokerRound, ParticipantRole, Task } from '../../../types';
import VotingCards from '../../../components/poker/VotingCards';

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

const TYPE_ICON: Record<TaskType, { icon: typeof BookOpen; color: string }> = {
  STORY: { icon: BookOpen, color: '#7C3AED' },
  TASK:  { icon: CheckSquare, color: '#2563EB' },
  BUG:   { icon: Bug, color: '#DC2626' },
};

const TIMER_OPTIONS = [
  { value: null, label: '' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
  { value: 300, label: '5 min' },
] as const;

const formatTimer = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
  const { userMap } = useProjectMembers(projectId);

  const [session, setSession] = useState<PokerSession | null>(null);
  const [rounds, setRounds] = useState<PokerRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [closing, setClosing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingTask, setPendingTask] = useState<Task | null>(null);
  const [pendingSubtasks, setPendingSubtasks] = useState<Task[]>([]);
  const [votingTask, setVotingTask] = useState<Task | null>(null);
  const [votingSubtasks, setVotingSubtasks] = useState<Task[]>([]);
  const hasLeftRef = useRef(false);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);

  const {
    connected,
    voteStatus,
    setVoteStatus,
    revealedRound,
    sessionState,
    participantUpdate,
    sendVote,
    sendReveal,
    sendNext,
    sendRevote,
    error: wsError,
    onReconnectRef,
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
        // Restore pending task from persisted currentTaskId
        if (s.status === 'LOBBY' && s.currentTaskId) {
          tasksApi.getById(s.currentTaskId)
            .then(setPendingTask)
            .catch(() => setPendingTask(null));
        }
        // Restore vote status from round data if session is in VOTING
        if (s.status === 'VOTING') {
          const votingRound = r.find((round: { status: string }) => round.status === 'VOTING');
          if (votingRound?.votes?.length) {
            const vs: Record<string, boolean> = {};
            votingRound.votes.forEach((v: { userId: string }) => { vs[v.userId] = true; });
            setVoteStatus(vs);
          }
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

  // Re-join on WebSocket reconnect to cancel pending disconnect and restore connected status
  useEffect(() => {
    onReconnectRef.current = () => {
      if (!sessionId || !user) return;
      const myP = session?.participants.find((p) => p.userId === user.id);
      if (!myP) return;
      pokerApi.joinSession(sessionId, { displayName: myP.displayName, role: myP.role })
        .then(() => pokerApi.getSession(sessionId))
        .then(setSession)
        .catch(() => {});
    };
    return () => { onReconnectRef.current = null; };
  });

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
        setSelectedVote(null);
        if (voteStorageKey) sessionStorage.removeItem(voteStorageKey);
      }
      // After accepting estimate (REVEALED → LOBBY), refresh rounds so currentRound clears
      if (sessionState.status === 'LOBBY' && prev?.status === 'REVEALED' && sessionId) {
        pokerApi.getRounds(sessionId).then(setRounds).catch(() => {});
      }
      // When currentTaskId changes in LOBBY, fetch the task for non-moderator participants
      if (sessionState.status === 'LOBBY' && sessionState.currentTaskId &&
          sessionState.currentTaskId !== prev?.currentTaskId) {
        tasksApi.getById(sessionState.currentTaskId)
          .then(setPendingTask)
          .catch(() => setPendingTask(null));
      }
      // If currentTaskId was cleared, clear pendingTask
      if (sessionState.status === 'LOBBY' && !sessionState.currentTaskId && prev?.currentTaskId) {
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
      setSession((prev) => prev ? { ...prev, status: 'REVEALED' as PokerSession['status'] } : prev);
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

  useEffect(() => {
    if (currentRound) {
      tasksApi.getById(currentRound.taskId)
        .then(setVotingTask)
        .catch(() => setVotingTask(null));
    } else {
      setVotingTask(null);
    }
  }, [currentRound?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (votingTask && votingTask.subtaskCount > 0) {
      tasksApi.getSubtasks(votingTask.id).then(setVotingSubtasks).catch(() => setVotingSubtasks([]));
    } else {
      setVotingSubtasks([]);
    }
  }, [votingTask?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer countdown
  const timerExpired = timerRemaining !== null && timerRemaining <= 0;

  useEffect(() => {
    const timerEndsAt = currentRound?.timerEndsAt;
    if (!timerEndsAt || currentRound?.status !== 'VOTING') {
      setTimerRemaining(null);
      return;
    }
    const endTime = new Date(timerEndsAt).getTime();
    const update = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimerRemaining(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [currentRound?.timerEndsAt, currentRound?.status]);

  const handleTimerChange = async (seconds: number | null) => {
    if (!sessionId) return;
    setSession((prev) => prev ? { ...prev, timerSeconds: seconds } : prev);
    await pokerApi.updateTimer(sessionId, seconds).catch(() => {});
  };

  const voteStorageKey = sessionId ? `poker_vote_${sessionId}` : '';

  // Restore selected vote from sessionStorage on mount
  useEffect(() => {
    if (!voteStorageKey) return;
    const saved = sessionStorage.getItem(voteStorageKey);
    if (saved) setSelectedVote(saved);
  }, [voteStorageKey]);

  const handleVote = (value: string) => {
    setSelectedVote(value);
    if (voteStorageKey) sessionStorage.setItem(voteStorageKey, value);
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

  const handleSelectTask = async (task: Task) => {
    setPendingTask(task);
    setShowTaskModal(false);
    setSuccessMessage(null);
    if (sessionId) {
      await pokerApi.selectTask(sessionId, task.id).catch(() => {});
    }
  };

  useEffect(() => {
    if (pendingTask && pendingTask.subtaskCount > 0) {
      tasksApi.getSubtasks(pendingTask.id).then(setPendingSubtasks).catch(() => setPendingSubtasks([]));
    } else {
      setPendingSubtasks([]);
    }
  }, [pendingTask?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartVoting = async () => {
    if (!sessionId || !pendingTask) return;
    setVotingTask(pendingTask);
    const round = await pokerApi.startRound(sessionId, { taskId: pendingTask.id, taskTitle: pendingTask.title });
    setRounds((prev) => [...prev, round]);
    setSelectedVote(null);
    if (voteStorageKey) sessionStorage.removeItem(voteStorageKey);
    setPendingTask(null);
    const updated = await pokerApi.getSession(sessionId);
    setSession(updated);
  };

  const handleAcceptEstimate = (finalEstimate: number | null) => {
    const taskTitle = currentRound?.taskTitle ?? votingTask?.title;
    if (finalEstimate != null && taskTitle) {
      setSuccessMessage(t('poker.room.estimateSaved', { task: taskTitle, points: finalEstimate }));
    }
    sendNext(finalEstimate);
    setSelectedVote(null);
    if (voteStorageKey) sessionStorage.removeItem(voteStorageKey);
  };

  const handleRevote = () => {
    sendRevote();
    setSelectedVote(null);
    if (voteStorageKey) sessionStorage.removeItem(voteStorageKey);
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
        .poker-lobby-full{display:grid;grid-template-columns:1fr;flex:1;min-height:0;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
        @media(min-width:1024px){.poker-lobby-full{grid-template-columns:2fr 3fr}}
        .poker-room-grid{display:grid;gap:20px;grid-template-columns:1fr}
        @media(min-width:1024px){.poker-room-grid{grid-template-columns:3fr 1fr}.poker-room-main{grid-column:1}}
      `}</style>
      {(error || wsError) && (
        <Alert type="error" message={error || wsError!} onClose={() => setError(null)} />
      )}

      {successMessage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          background: 'rgba(22,163,74,0.06)',
          border: '1px solid rgba(22,163,74,0.15)',
          borderRadius: 10,
          fontSize: 14, fontWeight: 500, color: '#16A34A',
        }}>
          <Zap size={16} strokeWidth={2} />
          {successMessage}
          <button
            onClick={() => setSuccessMessage(null)}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: '#16A34A', cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header card — only for CLOSED state */}
      {isClosed && (
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
      )}

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

      {/* ========== LOBBY STATE — full-height sidebar layout (mockup 22) ========== */}
      {!isClosed && session.status === 'LOBBY' && !currentRound && (
        <div className="poker-lobby-full">
          {/* Left sidebar: Task info */}
          <div style={{
            borderRight: '1px solid #E2E8F0',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
          }}>
            {pendingTask ? (() => {
              const ps = PRIORITY_STYLE[pendingTask.priority] ?? PRIORITY_STYLE.MEDIUM;
              const tc = TYPE_ICON[pendingTask.type as TaskType] ?? TYPE_ICON.TASK;
              const TypeIcon = tc.icon;
              return (
                <>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1E293B', lineHeight: 1.3 }}>
                    {pendingTask.title}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    <div>
                      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                        {t('tasks.modal.type')}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TypeIcon size={14} strokeWidth={2} style={{ color: tc.color }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: tc.color }}>
                          {t(`tasks.type.${pendingTask.type}`)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                        {t('tasks.modal.priority')}
                      </p>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: ps.color, background: ps.bg,
                        borderRadius: 6, padding: '3px 10px',
                      }}>
                        {t(`tasks.priority.${pendingTask.priority}`)}
                      </span>
                    </div>
                    {pendingTask.storyPoints != null && (
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                          Story Points
                        </p>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: '#2563EB', background: 'rgba(37,99,235,0.08)',
                          borderRadius: 6, padding: '3px 10px',
                        }}>
                          {pendingTask.storyPoints} SP
                        </span>
                      </div>
                    )}
                    {pendingTask.description && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                          {t('tasks.modal.description')}
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: '#1F2937', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {pendingTask.description}
                        </p>
                      </div>
                    )}
                    {pendingTask.definitionOfDone && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                          {t('tasks.modal.definitionOfDone')}
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: '#1F2937', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {pendingTask.definitionOfDone}
                        </p>
                      </div>
                    )}
                    {(pendingTask.labels?.length ?? 0) > 0 && (
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                          {t('tasks.modal.labels')}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {pendingTask.labels!.map((label) => (
                            <span key={label.id} style={{
                              fontSize: 11, fontWeight: 600, padding: '2px 10px',
                              borderRadius: 999, color: label.color,
                              background: `${label.color}14`, border: `1px solid ${label.color}30`,
                            }}>
                              {label.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {pendingSubtasks.length > 0 && (
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                          {t('tasks.modal.subtasks')}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {pendingSubtasks.map((st) => {
                            const isDone = st.completedAt != null;
                            return (
                              <div key={st.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 0', borderBottom: '1px solid #F1F5F9',
                              }}>
                                <div style={{
                                  width: 18, height: 18, borderRadius: 4,
                                  border: isDone ? 'none' : '2px solid #CBD5E1',
                                  background: isDone ? '#3B82F6' : '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  {isDone && (
                                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                      <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </div>
                                <span style={{
                                  fontSize: 13, fontWeight: 400,
                                  color: isDone ? '#94A3B8' : '#1F2937',
                                  textDecoration: isDone ? 'line-through' : 'none',
                                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                }}>
                                  {st.title}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {pendingTask.assigneeId && userMap[pendingTask.assigneeId] && (
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                          {t('tasks.modal.assignee')}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <AssigneeAvatar
                            name={userMap[pendingTask.assigneeId].fullName ?? userMap[pendingTask.assigneeId].username}
                            avatarUrl={userMap[pendingTask.assigneeId].avatarUrl}
                            size={24}
                          />
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>
                            {userMap[pendingTask.assigneeId].fullName ?? userMap[pendingTask.assigneeId].username}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
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

          {/* Right: Controls + Participants + Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', background: '#F8FAFC', overflow: 'hidden' }}>
            {/* Top bar with session controls */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderBottom: '1px solid #E2E8F0',
              background: '#FFFFFF', flexShrink: 0,
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
                  {isFacilitator ? (
                    <select
                      value={session.timerSeconds ?? ''}
                      onChange={(e) => handleTimerChange(e.target.value ? Number(e.target.value) : null)}
                      style={{
                        fontSize: 12, fontWeight: 500, color: '#64748B',
                        background: '#FFFFFF', border: '1px solid #E2E8F0',
                        borderRadius: 6, padding: '3px 6px',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {TIMER_OPTIONS.map((opt) => (
                        <option key={opt.value ?? 'none'} value={opt.value ?? ''}>
                          {opt.value === null ? t('poker.timer.noLimit') : opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    session.timerSeconds
                      ? formatTimer(session.timerSeconds)
                      : t('poker.timer.noLimit')
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                {isFacilitator && (
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
                      transition: 'background 0.15s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => { if (!closing) e.currentTarget.style.background = 'rgba(220,38,38,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                  >
                    <X size={13} />
                    {t('poker.room.closeSession')}
                  </button>
                )}
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
            </div>

            {/* Participants circle */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
              <LobbyParticipants
                participants={session.participants}
                currentUserId={user?.id}
                userMap={userMap}
              />
            </div>

            {/* Bottom: Locked voting cards */}
            <div style={{ flexShrink: 0, overflow: 'visible' }}>
              <VotingCards
                deck={session.deck}
                selectedValue={null}
                onVote={() => {}}
                disabled
                lockedMessage={t('poker.room.waitingForModerator')}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========== REVEALED STATE (full-width layout) ========== */}
      {!isClosed && (session.status === 'REVEALED' || currentRound?.status === 'REVEALED') && currentRound && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <VoteResults
            round={revealedRound ?? currentRound}
            participants={session.participants}
            isFacilitator={isFacilitator}
            onAccept={handleAcceptEstimate}
            onRevote={handleRevote}
            task={votingTask}
            subtasks={votingSubtasks}
            userMap={userMap}
          />
          <RoundHistory rounds={rounds} />
        </div>
      )}

      {/* ========== VOTING STATE (same sidebar layout as lobby) ========== */}
      {!isClosed && !(session.status === 'REVEALED' || currentRound?.status === 'REVEALED') &&
       (session.status !== 'LOBBY' || currentRound) && (
        <>
          <div className="poker-lobby-full" style={{ minHeight: '70vh' }}>
            {/* Left sidebar: Task info */}
            <div style={{
              borderRight: '1px solid #E2E8F0',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflowY: 'auto',
            }}>
              {currentRound && (() => {
                const task = votingTask;
                const ps = task ? (PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.MEDIUM) : null;
                const tc = task ? (TYPE_ICON[task.type as TaskType] ?? TYPE_ICON.TASK) : null;
                const TypeIcon = tc?.icon;
                return (
                  <>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1E293B', lineHeight: 1.3 }}>
                      {currentRound.taskTitle}
                    </h3>
                    {task && TypeIcon && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                        <div>
                          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                            {t('tasks.modal.type')}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TypeIcon size={14} strokeWidth={2} style={{ color: tc!.color }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: tc!.color }}>
                              {t(`tasks.type.${task.type}`)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                            {t('tasks.modal.priority')}
                          </p>
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: ps!.color, background: ps!.bg,
                            borderRadius: 6, padding: '3px 10px',
                          }}>
                            {t(`tasks.priority.${task.priority}`)}
                          </span>
                        </div>
                        {task.storyPoints != null && (
                          <div>
                            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                              Story Points
                            </p>
                            <span style={{
                              fontSize: 11, fontWeight: 700,
                              color: '#2563EB', background: 'rgba(37,99,235,0.08)',
                              borderRadius: 6, padding: '3px 10px',
                            }}>
                              {task.storyPoints} SP
                            </span>
                          </div>
                        )}
                        {task.description && (
                          <div>
                            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                              {t('tasks.modal.description')}
                            </p>
                            <p style={{ margin: 0, fontSize: 13, color: '#1F2937', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                              {task.description}
                            </p>
                          </div>
                        )}
                        {task.definitionOfDone && (
                          <div>
                            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                              {t('tasks.modal.definitionOfDone')}
                            </p>
                            <p style={{ margin: 0, fontSize: 13, color: '#1F2937', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                              {task.definitionOfDone}
                            </p>
                          </div>
                        )}
                        {(task.labels?.length ?? 0) > 0 && (
                          <div>
                            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                              {t('tasks.modal.labels')}
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {task.labels!.map((label) => (
                                <span key={label.id} style={{
                                  fontSize: 11, fontWeight: 600, padding: '2px 10px',
                                  borderRadius: 999, color: label.color,
                                  background: `${label.color}14`, border: `1px solid ${label.color}30`,
                                }}>
                                  {label.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {votingSubtasks.length > 0 && (
                          <div>
                            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                              {t('tasks.modal.subtasks')}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {votingSubtasks.map((st) => {
                                const isDone = st.completedAt != null;
                                return (
                                  <div key={st.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '6px 0', borderBottom: '1px solid #F1F5F9',
                                  }}>
                                    <div style={{
                                      width: 18, height: 18, borderRadius: 4,
                                      border: isDone ? 'none' : '2px solid #CBD5E1',
                                      background: isDone ? '#3B82F6' : '#fff',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      flexShrink: 0,
                                    }}>
                                      {isDone && (
                                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                          <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      )}
                                    </div>
                                    <span style={{
                                      fontSize: 13, fontWeight: 400,
                                      color: isDone ? '#94A3B8' : '#1F2937',
                                      textDecoration: isDone ? 'line-through' : 'none',
                                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                    }}>
                                      {st.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {task.assigneeId && userMap[task.assigneeId] && (
                          <div>
                            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                              {t('tasks.modal.assignee')}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <AssigneeAvatar
                                name={userMap[task.assigneeId].fullName ?? userMap[task.assigneeId].username}
                                avatarUrl={userMap[task.assigneeId].avatarUrl}
                                size={24}
                              />
                              <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>
                                {userMap[task.assigneeId].fullName ?? userMap[task.assigneeId].username}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Right: Controls + Participants + Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', background: '#F8FAFC', overflow: 'hidden' }}>
              {/* Top bar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderBottom: '1px solid #E2E8F0',
                background: '#FFFFFF', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 600,
                    color: '#F59E0B', background: 'rgba(245,158,11,0.08)',
                    borderRadius: 999, padding: '4px 12px',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} />
                    {t('poker.status.VOTING')}
                  </span>
                  {timerRemaining !== null && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                      color: timerExpired ? '#DC2626' : timerRemaining <= 10 ? '#F59E0B' : '#64748B',
                    }}>
                      <Clock size={13} />
                      {formatTimer(timerRemaining)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  {isFacilitator && (
                    <button
                      onClick={sendReveal}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 18px', fontSize: 13, fontWeight: 600,
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
                  )}
                </div>
              </div>

              {/* Participants circle with vote indicators */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
                <LobbyParticipants
                  participants={session.participants}
                  currentUserId={user?.id}
                  voteStatus={voteStatus}
                  isVoting
                  userMap={userMap}
                />
              </div>

              {/* Bottom: Voting cards */}
              <div style={{ flexShrink: 0, overflow: 'visible' }}>
                {isVoter ? (
                  <VotingCards
                    deck={session.deck}
                    selectedValue={selectedVote}
                    onVote={handleVote}
                    disabled={timerExpired}
                    lockedMessage={timerExpired ? t('poker.timer.expired') : undefined}
                  />
                ) : !isFacilitator ? (
                  <div style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <p style={{
                      margin: 0, fontSize: 13, color: '#94A3B8', fontWeight: 500,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <Zap size={14} />
                      {t('poker.room.waitingVotes')}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <RoundHistory rounds={rounds} />
        </>
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