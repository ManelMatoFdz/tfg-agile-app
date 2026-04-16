import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workspacesApi } from '../../api/workspaces';
import { useApiAction } from '../../hooks/useApiAction';
import { useWorkspaceStore } from '../../store/workspaceStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import type { Workspace } from '../../types';

export default function WorkspaceSelectorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const listAction = useApiAction<Workspace[]>();
  const createAction = useApiAction<Workspace>();

  useEffect(() => {
    listAction.run(workspacesApi.list()).then((data) => {
      if (data) setWorkspaces(data);
      else setLoadError(t('workspace.selector.loadError'));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (workspace: Workspace) => {
    setWorkspace(workspace.id);
    navigate(`/workspaces/${workspace.id}`);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const data = await createAction.run(workspacesApi.create({ name, description: description || undefined }));
    if (data) {
      setWorkspace(data.id);
      navigate(`/workspaces/${data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 flex flex-col items-center justify-center px-4 py-12">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary-100/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-accent-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl shadow-xl shadow-primary-500/25 mb-5">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('workspace.selector.title')}</h1>
          <p className="mt-2 text-gray-500">{t('workspace.selector.subtitle')}</p>
        </div>

        {loadError && <Alert type="error" message={loadError} onClose={() => setLoadError(null)} />}

        {/* Workspace list */}
        {listAction.loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : workspaces.length > 0 ? (
          <div className="space-y-3 mb-6">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSelect(ws)}
                className="w-full glass-card-strong p-5 text-left hover:shadow-lg hover:shadow-primary-500/10 hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{ws.name}</p>
                    {ws.description && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">{ws.description}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        ) : (
          !listAction.loading && (
            <div className="text-center py-10 mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">{t('workspace.selector.noWorkspaces')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('workspace.selector.noWorkspacesSubtitle')}</p>
            </div>
          )
        )}

        {/* Create workspace */}
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/40 transition-all duration-200 font-medium text-sm cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('workspace.selector.createNew')}
          </button>
        ) : (
          <div className="glass-card-strong p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">{t('workspace.selector.form.title')}</h3>
            {createAction.error && (
              <Alert type="error" message={createAction.error} onClose={createAction.reset} />
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label={t('workspace.selector.form.name')}
                placeholder={t('workspace.selector.form.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label={t('workspace.selector.form.description', { optional: t('common.optional') })}
                placeholder={t('workspace.selector.form.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex gap-3 pt-1">
                <Button type="submit" loading={createAction.loading} className="flex-1">
                  {t('workspace.selector.form.submit')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowCreateForm(false); createAction.reset(); }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}