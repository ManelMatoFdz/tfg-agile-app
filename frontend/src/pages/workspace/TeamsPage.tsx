import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { teamsApi } from '../../api/teams';
import { useApiAction } from '../../hooks/useApiAction';
import Alert from '../../components/ui/Alert';
import PageTitle from '../../components/motion/PageTitle';
import type { Team } from '../../types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: 12,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
};

function TeamCard({ team, to }: { team: Team; to: string }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        textDecoration: 'none',
        background: 'var(--bg-elevated)',
        border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        transition: `border-color var(--duration), background var(--duration)`,
        ...(hovered ? { background: 'var(--bg-hover)' } : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, flexShrink: 0,
          background: 'var(--accent)', borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-fg)', fontSize: 14, fontWeight: 700,
        }}>
          {team.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {team.name}
          </p>
          <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-faint)', fontStyle: team.description ? 'normal' : 'italic', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {team.description ?? t('common.noDescription')}
          </p>
        </div>
        <ChevronRight size={14} strokeWidth={2} style={{ color: hovered ? 'var(--accent)' : 'var(--text-faint)', flexShrink: 0, transition: `color var(--duration)` }} />
      </div>
      <p style={{ margin: '8px 0 0 48px', fontSize: 10, color: 'var(--text-faint)' }}>
        {t('common.createdAt', { date: new Date(team.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
      </p>
    </Link>
  );
}

export default function TeamsPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const listAction = useApiAction<Team[]>();
  const createAction = useApiAction<Team>();

  const loadTeams = () => {
    if (!workspaceId) return;
    listAction.run(teamsApi.list(workspaceId)).then((data) => {
      if (data) setTeams(data);
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
      teamsApi.create(workspaceId, { name, description: description || undefined }),
    );
    if (data) {
      setTeams((prev) => [...prev, data]);
      setShowCreateForm(false);
      setName('');
      setDescription('');
      createAction.reset();
    }
  };

  const closeForm = () => {
    setShowCreateForm(false);
    setName('');
    setDescription('');
    createAction.reset();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', fontSize: 12, fontWeight: 500,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Plus size={12} strokeWidth={2.5} />
            {t('teams.newTeam')}
          </button>
        )}
      </div>

      {listAction.error && (
        <Alert type="error" message={listAction.error} onClose={listAction.reset} />
      )}

      {/* Create form */}
      {showCreateForm && (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: 16,
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {t('teams.form.title')}
          </h3>
          {createAction.error && (
            <Alert type="error" message={createAction.error} onClose={createAction.reset} />
          )}
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            <div style={{ display: 'flex', gap: 6, paddingTop: 2 }}>
              <button
                type="submit"
                disabled={createAction.loading || !name.trim()}
                style={{
                  flex: 1, padding: '6px 12px', fontSize: 12, fontWeight: 500,
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  opacity: createAction.loading || !name.trim() ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!createAction.loading && name.trim()) (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
              >
                {createAction.loading ? '…' : t('teams.form.submit')}
              </button>
              <button
                type="button"
                onClick={closeForm}
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 500,
                  background: 'transparent', color: 'var(--text-muted)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
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
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                marginTop: 16, padding: '6px 14px', fontSize: 12, fontWeight: 500,
                background: 'var(--accent)', color: 'var(--accent-fg)',
                border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              {t('teams.newTeam')}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              to={`/workspaces/${workspaceId}/teams/${team.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}