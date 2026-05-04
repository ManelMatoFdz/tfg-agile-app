import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pokerApi } from '../../../api/poker';
import { useAuthStore } from '../../../store/authStore';
import { usePokerSocket } from '../../../hooks/usePokerSocket';
import type { PokerSession, PokerRound, ParticipantRole } from '../../../types';
import VotingCards from '../../../components/poker/VotingCards';
import ParticipantsList from '../../../components/poker/ParticipantsList';
import VoteResults from '../../../components/poker/VoteResults';
import RoundHistory from '../../../components/poker/RoundHistory';
import SelectTaskModal from '../../../components/poker/SelectTaskModal';
import JoinSessionModal from '../../../components/poker/JoinSessionModal';
import Alert from '../../../components/ui/Alert';

export default function PokerRoomPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId, sessionId } = useParams<{
    workspaceId: string;
    projectId: string;
    sessionId: string;
  }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

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
    sendVote,
    sendReveal,
    sendNext,
    sendRevote,
    error: wsError,
  } = usePokerSocket(sessionId);

  // Load session data
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    Promise.all([
      pokerApi.getSession(sessionId),
      pokerApi.getRounds(sessionId),
    ])
      .then(([s, r]) => {
        setSession(s);
        setRounds(r);
        // Check if user needs to join
        const isParticipant = s.participants.some((p) => p.userId === user?.id);
        if (!isParticipant && s.status !== 'CLOSED') {
          setShowJoinModal(true);
        }
      })
      .catch(() => setError(t('poker.room.loadError')))
      .finally(() => setLoading(false));
  }, [sessionId, user?.id, t]);

  // Sync WebSocket state updates
  useEffect(() => {
    if (sessionState) {
      setSession(sessionState);
    }
  }, [sessionState]);

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
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Alert type="error" message={t('poker.room.loadError')} />;
  }

  const isClosed = session.status === 'CLOSED';

  return (
    <div>
      {(error || wsError) && (
        <div className="mb-4">
          <Alert type="error" message={error || wsError!} onClose={() => setError(null)} />
        </div>
      )}

      {/* Header */}
      <div className="glass-card-strong p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/workspaces/${workspaceId}/projects/${projectId}/poker`)}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">{session.name}</h2>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  isClosed ? 'bg-gray-100 text-gray-500' :
                  session.status === 'VOTING' ? 'bg-amber-100 text-amber-700' :
                  session.status === 'REVEALED' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {t(`poker.status.${session.status}`)}
                </span>
                <span>{t(`poker.decks.${session.deck}`)}</span>
                {connected && (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {t('poker.room.connected')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isClosed && (
              <button
                onClick={handleLeave}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                {t('poker.room.leave')}
              </button>
            )}
            {isFacilitator && !isClosed && (
              <button
                onClick={handleClose}
                disabled={closing}
                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {t('poker.room.closeSession')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Closed state */}
      {isClosed && (
        <div className="space-y-4">
          <div className="text-center py-8">
            <p className="text-gray-500 font-medium">{t('poker.room.sessionClosed')}</p>
          </div>
          <RoundHistory rounds={rounds} />
        </div>
      )}

      {/* Active session */}
      {!isClosed && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Current task info */}
            {currentRound && (
              <div className="glass-card-strong p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('poker.room.estimating')}</p>
                <p className="text-base font-semibold text-gray-900">{currentRound.taskTitle}</p>
              </div>
            )}

            {/* Lobby state - no active round */}
            {session.status === 'LOBBY' && !currentRound && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h4l3-7 4 14 3-7h4" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium mb-1">{t('poker.room.lobbyTitle')}</p>
                <p className="text-sm text-gray-400 mb-4">{t('poker.room.lobbySubtitle')}</p>
                {isFacilitator && (
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors cursor-pointer"
                  >
                    {t('poker.room.startRound')}
                  </button>
                )}
              </div>
            )}

            {/* Voting state */}
            {session.status === 'VOTING' && currentRound?.status === 'VOTING' && (
              <div className="space-y-4">
                {isVoter ? (
                  <VotingCards
                    deck={session.deck}
                    selectedValue={selectedVote}
                    onVote={handleVote}
                  />
                ) : (
                  <div className="text-center py-8 glass-card-strong">
                    <p className="text-gray-500">{t('poker.room.waitingVotes')}</p>
                  </div>
                )}

                {/* Facilitator reveal button */}
                {isFacilitator && (
                  <div className="flex justify-center">
                    <button
                      onClick={sendReveal}
                      className="px-6 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors cursor-pointer"
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

            {/* Round history */}
            <RoundHistory rounds={rounds} />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <ParticipantsList
              participants={session.participants}
              voteStatus={voteStatus}
              currentUserId={user?.id}
            />

            {/* Facilitator: start next round */}
            {isFacilitator && session.status === 'LOBBY' && !currentRound && rounds.length > 0 && (
              <button
                onClick={() => setShowTaskModal(true)}
                className="w-full px-4 py-2.5 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors cursor-pointer"
              >
                {t('poker.room.nextTask')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showTaskModal && projectId && (
        <SelectTaskModal
          projectId={projectId}
          onClose={() => setShowTaskModal(false)}
          onSelect={handleStartRound}
        />
      )}

      {showJoinModal && (
        <JoinSessionModal
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