import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { teamsApi } from '../../api/teams';
import { useApiAction } from '../../hooks/useApiAction';
import { useUserMap } from '../../hooks/useUserMap';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import type { Team, TeamMember } from '../../types';

function MemberRow({
  member,
  displayName,
  avatarUrl,
  onRemove,
  removing,
}: {
  member: TeamMember;
  displayName: string;
  avatarUrl?: string;
  onRemove: (userId: string) => void;
  removing: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50/70 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
          {avatarUrl && !imgError ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-400">
            Desde {new Date(member.joinedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <button
        onClick={() => onRemove(member.userId)}
        disabled={removing}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer flex-shrink-0"
        title="Eliminar del equipo"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function MemberList({ members, onRemove, removingId }: {
  members: TeamMember[];
  onRemove: (userId: string) => void;
  removingId: string | null;
}) {
  const userMap = useUserMap(members.map((m) => m.userId));
  return (
    <div className="divide-y divide-gray-100/60">
      {members.map((m) => {
        const u = userMap.get(m.userId);
        return (
          <MemberRow
            key={m.id}
            member={m}
            displayName={u?.fullName || u?.username || m.userId}
            avatarUrl={u?.avatarUrl}
            onRemove={onRemove}
            removing={removingId === m.userId}
          />
        );
      })}
    </div>
  );
}

export default function TeamDetailPage() {
  const { workspaceId, teamId } = useParams<{ workspaceId: string; teamId: string }>();
  const navigate = useNavigate();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const teamAction = useApiAction<Team>();
  const membersAction = useApiAction<TeamMember[]>();
  const addAction = useApiAction<TeamMember>();
  const deleteAction = useApiAction<void>();

  useEffect(() => {
    if (!teamId) return;
    teamAction.run(teamsApi.getById(teamId)).then((data) => {
      if (data) setTeam(data);
    });
    membersAction.run(teamsApi.getMembers(teamId)).then((data) => {
      if (data) setMembers(data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!teamId || !newUserId.trim()) return;
    const data = await addAction.run(teamsApi.addMember(teamId, newUserId.trim()));
    if (data) {
      setMembers((prev) => [...prev, data]);
      setNewUserId('');
      setShowAddMember(false);
      addAction.reset();
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!teamId) return;
    setRemovingId(userId);
    try {
      await teamsApi.removeMember(teamId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch {
      // ignore, could show error
    } finally {
      setRemovingId(null);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamId) return;
    await deleteAction.run(teamsApi.delete(teamId));
    navigate(`/workspaces/${workspaceId}/teams`);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to={`/workspaces/${workspaceId}/teams`} className="hover:text-primary-600 transition-colors">
          Equipos
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-medium truncate">{team?.name ?? '...'}</span>
      </nav>

      {teamAction.error && (
        <Alert type="error" message={teamAction.error} onClose={teamAction.reset} />
      )}

      {teamAction.loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : team ? (
        <div className="space-y-6">
          {/* Team header */}
          <div className="glass-card-strong p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xl font-bold shadow-md flex-shrink-0">
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{team.name}</h1>
                  {team.description && (
                    <p className="text-gray-500 mt-0.5">{team.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">
                    Creado {new Date(team.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer flex-shrink-0"
                title="Eliminar equipo"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Members */}
          <div className="glass-card-strong p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Miembros
                {members.length > 0 && (
                  <span className="ml-2 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {members.length}
                  </span>
                )}
              </h2>
              {!showAddMember && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Añadir miembro
                </button>
              )}
            </div>

            {/* Add member form */}
            {showAddMember && (
              <div className="mb-4 p-4 bg-gray-50/70 rounded-xl animate-fade-in">
                {addAction.error && (
                  <Alert type="error" message={addAction.error} onClose={addAction.reset} />
                )}
                <form onSubmit={handleAddMember} className="flex gap-2">
                  <Input
                    placeholder="ID de usuario (UUID)"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" loading={addAction.loading}>
                    Añadir
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setShowAddMember(false); setNewUserId(''); addAction.reset(); }}
                  >
                    Cancelar
                  </Button>
                </form>
              </div>
            )}

            {membersAction.loading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">Este equipo no tiene miembros todavía.</p>
                {!showAddMember && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700 cursor-pointer transition-colors"
                  >
                    Añadir el primero
                  </button>
                )}
              </div>
            ) : (
              <MemberList members={members} onRemove={handleRemoveMember} removingId={removingId} />
            )}
          </div>
        </div>
      ) : null}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm glass-card-strong p-6 shadow-2xl animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Eliminar equipo</h2>
            <p className="text-sm text-gray-500 mb-5">
              ¿Seguro que quieres eliminar <strong>{team?.name}</strong>? Esta acción no se puede deshacer.
            </p>
            {deleteAction.error && (
              <Alert type="error" message={deleteAction.error} onClose={deleteAction.reset} />
            )}
            <div className="flex gap-3">
              <Button
                variant="danger"
                loading={deleteAction.loading}
                onClick={handleDeleteTeam}
                className="flex-1"
              >
                Eliminar
              </Button>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}