import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pokerApi } from '../../../api/poker';
import { useAuthStore } from '../../../store/authStore';
import type { PokerSession, DeckType, SessionStatus } from '../../../types';
import CreateSessionModal from '../../../components/poker/CreateSessionModal';
import Alert from '../../../components/ui/Alert';

const STATUS_BADGE: Record<SessionStatus, { bg: string; text: string }> = {
  LOBBY: { bg: 'bg-blue-100', text: 'text-blue-700' },
  VOTING: { bg: 'bg-amber-100', text: 'text-amber-700' },
  REVEALED: { bg: 'bg-purple-100', text: 'text-purple-700' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

export default function PokerPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

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

  return (
    <div>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t('poker.title')}</h2>
          {sessions.length > 0 && (
            <p className="text-sm text-gray-500">
              {sessions.length} {sessions.length === 1 ? t('poker.session') : t('poker.sessions')}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('poker.newSession')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h4l3-7 4 14 3-7h4" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">{t('poker.noSessions')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('poker.noSessionsSubtitle')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active sessions */}
          {activeSessions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('poker.activeSessions')}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleClick(session)}
                    className="w-full text-left glass-card p-4 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900 truncate">{session.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE[session.status].bg} ${STATUS_BADGE[session.status].text}`}>
                        {t(`poker.status.${session.status}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {session.participants.filter((p) => p.connected).length}
                      </span>
                      <span>{t(`poker.decks.${session.deck}`)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Closed sessions */}
          {closedSessions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('poker.closedSessions')}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {closedSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleClick(session)}
                    className="w-full text-left glass-card p-4 hover:shadow-md transition-all cursor-pointer opacity-70"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-gray-700 truncate">{session.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                        {t('poker.status.CLOSED')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {t(`poker.decks.${session.deck}`)} · {session.participants.length} {t('poker.room.participants').toLowerCase()}
                    </div>
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