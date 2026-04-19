import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { teamsApi } from '../../api/teams';
import { useApiAction } from '../../hooks/useApiAction';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import type { Team } from '../../types';

function TeamCard({ team, to }: { team: Team; to: string }) {
  const { t } = useTranslation();
  return (
    <Link
      to={to}
      className="glass-card-strong p-5 hover:shadow-lg hover:shadow-primary-500/10 hover:-translate-y-0.5 transition-all duration-200 group block"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0">
          {team.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors truncate">
            {team.name}
          </p>
          {team.description ? (
            <p className="text-sm text-gray-500 truncate mt-0.5">{team.description}</p>
          ) : (
            <p className="text-sm text-gray-400 italic mt-0.5">{t('common.noDescription')}</p>
          )}
        </div>
        <svg
          className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <p className="text-xs text-gray-400 mt-3 ml-15">
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
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('teams.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {teams.length === 0 ? t('teams.noTeamsYet') : t('teams.count', { count: teams.length })}
          </p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('teams.newTeam')}
          </Button>
        )}
      </div>

      {listAction.error && (
        <Alert type="error" message={listAction.error} onClose={listAction.reset} />
      )}

      {/* Create form */}
      {showCreateForm && (
        <div className="glass-card-strong p-6 mb-6 animate-fade-in">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{t('teams.form.title')}</h3>
          {createAction.error && (
            <Alert type="error" message={createAction.error} onClose={createAction.reset} />
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label={t('teams.form.name')}
              placeholder={t('teams.form.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label={t('teams.form.description', { optional: t('common.optional') })}
              placeholder={t('teams.form.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={createAction.loading} className="flex-1">
                {t('teams.form.submit')}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Content */}
      {listAction.loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">{t('teams.noTeams')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('teams.noTeamsSubtitle')}</p>
          {!showCreateForm && (
            <Button className="mt-5" onClick={() => setShowCreateForm(true)}>
              {t('teams.form.submit')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
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