import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { teamsApi } from '../../api/teams';
import { useApiAction } from '../../hooks/useApiAction';
import { useUserMap } from '../../hooks/useUserMap';
import { buildAvatarSrc } from '../../utils/avatarUrl';
import Alert from '../../components/ui/Alert';
import PageTitle from '../../components/motion/PageTitle';
import type { Team, UserSummary } from '../../types';

const PAGE_SIZE = 5;
const MAX_AVATARS = 4;

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6d28d9', '#475569', '#1e293b',
];

const DEFAULT_COLOR = '#6366f1';

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-faint)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 13,
  color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 6,
};

export default function TeamsPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMemberIds, setTeamMemberIds] = useState<Record<string, string[]>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [page, setPage] = useState(0);

  const listAction = useApiAction<Team[]>();
  const createAction = useApiAction<Team>();

  // Collect all unique user IDs across all teams for batch resolution
  const allUserIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(teamMemberIds).forEach((arr) => arr.forEach((id) => ids.add(id)));
    return Array.from(ids);
  }, [teamMemberIds]);

  const userMap = useUserMap(allUserIds);

  const loadTeams = () => {
    if (!workspaceId) return;
    listAction.run(teamsApi.list(workspaceId)).then((data) => {
      if (data) {
        setTeams(data);
        data.forEach((team) => {
          teamsApi.getMembers(team.id).then((res) => {
            const ids = res.data.map((m) => m.userId);
            setTeamMemberIds((prev) => ({ ...prev, [team.id]: ids }));
          }).catch(() => {});
        });
      }
    });
  };

  useEffect(() => {
    loadTeams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    const data = await createAction.run(
      teamsApi.create(workspaceId, { name, description: description || undefined, color: selectedColor }),
    );
    if (data) {
      setTeams((prev) => [...prev, data]);
      setTeamMemberIds((prev) => ({ ...prev, [data.id]: [] }));
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setSelectedColor(DEFAULT_COLOR);
      createAction.reset();
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setName('');
    setDescription('');
    setSelectedColor(DEFAULT_COLOR);
    createAction.reset();
  };

  const totalPages = Math.max(1, Math.ceil(teams.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedTeams = teams.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const from = teams.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min((safePage + 1) * PAGE_SIZE, teams.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PageTitle style={{ fontSize: 24 }}>
            {t('teams.title')}
          </PageTitle>
          {!listAction.loading && teams.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 500, color: 'var(--text-faint)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '1px 6px', fontFamily: 'var(--font-mono)',
            }}>
              {teams.length}
            </span>
          )}
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
          {t('teams.subtitle')}
        </p>
      </div>

      {listAction.error && (
        <Alert type="error" message={listAction.error} onClose={listAction.reset} />
      )}

      {/* Content */}
      {listAction.loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 24, height: 24,
            border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : teams.length === 0 ? (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)', padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: 44, height: 44, background: 'var(--bg-hover)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <Users size={20} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{t('teams.noTeams')}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>{t('teams.noTeamsSubtitle')}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              marginTop: 16, padding: '7px 16px', fontSize: 13, fontWeight: 500,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            {t('teams.newTeam')}
          </button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)', overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: '40%' }}>{t('teams.form.name')}</th>
                    <th style={{ ...thStyle, width: '25%' }}>{t('teams.members')}</th>
                    <th style={{ ...thStyle, width: '20%' }}>{t('teams.created')}</th>
                    <th style={{ ...thStyle, width: '15%' }}>{t('teams.manage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTeams.map((team) => {
                    const memberIds = teamMemberIds[team.id];
                    const members: UserSummary[] = memberIds
                      ? memberIds.map((id) => userMap.get(id)).filter((u): u is UserSummary => !!u)
                      : [];
                    return (
                      <TeamRow
                        key={team.id}
                        team={team}
                        memberCount={memberIds?.length}
                        memberIds={memberIds || []}
                        members={members}
                        color={team.color || DEFAULT_COLOR}
                        to={`/workspaces/${workspaceId}/teams/${team.id}`}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {teams.length > PAGE_SIZE && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', borderTop: '1px solid var(--border)',
                fontSize: 12, color: 'var(--text-faint)',
              }}>
                <span>
                  {t('teams.showing', { from, to, total: teams.length })}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    disabled={safePage === 0}
                    onClick={() => setPage(safePage - 1)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', fontSize: 12, fontWeight: 500,
                      background: 'var(--bg)', color: safePage === 0 ? 'var(--text-faint)' : 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      cursor: safePage === 0 ? 'default' : 'pointer',
                      opacity: safePage === 0 ? 0.5 : 1,
                    }}
                  >
                    <ChevronLeft size={12} />
                    {t('common.previous')}
                  </button>
                  <button
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage(safePage + 1)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', fontSize: 12, fontWeight: 500,
                      background: 'var(--bg)', color: safePage >= totalPages - 1 ? 'var(--text-faint)' : 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      cursor: safePage >= totalPages - 1 ? 'default' : 'pointer',
                      opacity: safePage >= totalPages - 1 ? 0.5 : 1,
                    }}
                  >
                    {t('common.next')}
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CTA card */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)', padding: '24px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 16,
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.ctaTitle')}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
                {t('teams.ctaSubtitle')}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', fontSize: 13, fontWeight: 500,
                background: 'var(--accent)', color: 'var(--accent-fg)',
                border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              <Plus size={14} strokeWidth={2.5} />
              {t('teams.ctaButton')}
            </button>
          </div>
        </>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border)', width: '100%', maxWidth: 440,
            padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.form.title')}
              </h2>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {createAction.error && (
              <div style={{ marginBottom: 16 }}>
                <Alert type="error" message={createAction.error} onClose={createAction.reset} />
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>{t('teams.form.name')}</label>
                <input
                  type="text"
                  placeholder={t('teams.form.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  {t('teams.form.description', { optional: t('common.optional') })}
                </label>
                <input
                  type="text"
                  placeholder={t('teams.form.descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Color picker */}
              <div>
                <label style={labelStyle}>{t('workspace.settings.categories.modal.colorLabel')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      style={{
                        width: 24, height: 24,
                        borderRadius: 'var(--radius-sm)',
                        background: c,
                        border: selectedColor === c ? '2px solid var(--text)' : '2px solid transparent',
                        cursor: 'pointer',
                        padding: 0,
                        outline: selectedColor === c ? '2px solid var(--bg-elevated)' : 'none',
                        outlineOffset: -4,
                      }}
                    />
                  ))}
                </div>
                {/* Preview */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: selectedColor, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700,
                  }}>
                    {name.trim() ? name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                    {selectedColor}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '8px 16px', fontSize: 13, fontWeight: 500,
                    background: 'transparent', color: 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createAction.loading || !name.trim()}
                  style={{
                    padding: '8px 20px', fontSize: 13, fontWeight: 500,
                    background: 'var(--accent)', color: 'var(--accent-fg)',
                    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    opacity: createAction.loading || !name.trim() ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!createAction.loading && name.trim()) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                >
                  {createAction.loading ? '...' : t('teams.form.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberAvatars({ members, memberIds, total }: { members: UserSummary[]; memberIds: string[]; total: number }) {
  const size = 28;
  // Show up to MAX_AVATARS individual avatars, then a "+N" bubble for the rest
  const visibleCount = Math.min(total, MAX_AVATARS);
  const extra = total - visibleCount;

  // Build the list of visible slots using resolved users, falling back to ID-based placeholders
  const resolvedMap = new Map(members.map((u) => [u.id, u]));
  const slots: { id: string; user?: UserSummary }[] = [];
  for (let i = 0; i < visibleCount; i++) {
    const id = memberIds[i];
    if (id) {
      slots.push({ id, user: resolvedMap.get(id) });
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', paddingLeft: 6 }}>
        {slots.map((slot, i) => {
          const u = slot.user;
          const src = u ? buildAvatarSrc(u.avatarUrl) : null;
          return (
            <div
              key={slot.id}
              title={u ? (u.fullName || u.username) : undefined}
              style={{
                width: size, height: size, borderRadius: '50%',
                border: '2px solid var(--bg-elevated)',
                marginLeft: i === 0 ? 0 : -8,
                zIndex: slots.length - i,
                position: 'relative',
                flexShrink: 0,
                overflow: 'hidden',
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-fg)', fontSize: 11, fontWeight: 700,
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                u ? u.username.charAt(0).toUpperCase() : '?'
              )}
            </div>
          );
        })}
        {extra > 0 && (
          <div
            style={{
              width: size, height: size, borderRadius: '50%',
              border: '2px solid var(--bg-elevated)',
              marginLeft: -8,
              zIndex: 0,
              background: 'var(--bg-hover)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            +{extra}
          </div>
        )}
      </div>
      <span style={{
        marginLeft: 10, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
      }}>
        {total}
      </span>
    </div>
  );
}

function TeamRow({ team, memberCount, memberIds, members, color, to }: {
  team: Team;
  memberCount?: number;
  memberIds: string[];
  members: UserSummary[];
  color: string;
  to: string;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      style={{ background: hovered ? 'var(--bg-hover)' : 'transparent', transition: 'background var(--duration)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Team name */}
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0,
            background: color, borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14, fontWeight: 700,
          }}>
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {team.name}
            </p>
            {team.description && (
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {team.description}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Members */}
      <td style={tdStyle}>
        {memberCount !== undefined ? (
          memberCount > 0 ? (
            <MemberAvatars members={members} memberIds={memberIds} total={memberCount} />
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              {t('teams.member', { count: 0 })}
            </span>
          )
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>...</span>
        )}
      </td>

      {/* Created */}
      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-faint)' }}>
        {new Date(team.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>

      {/* Action */}
      <td style={tdStyle}>
        <Link
          to={to}
          style={{
            fontSize: 12, fontWeight: 500, color: 'var(--accent)',
            textDecoration: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        >
          {t('teams.manage')}
        </Link>
      </td>
    </tr>
  );
}