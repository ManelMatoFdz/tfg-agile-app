import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GitBranch, GitCommit, GitPullRequest, ExternalLink, CheckSquare, ChevronDown } from 'lucide-react';
import type { GitEvent, GitEventType, GitIntegration } from '../../../types';
import { gitApi } from '../../../api/git';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import { relativeTime } from '../../../utils/relativeTime';

const PR_STATUS_COLORS: Record<string, string> = {
  open: '#16A34A',
  merged: '#7C3AED',
  closed: '#DC2626',
};

const PAGE_SIZE = 10;

interface PagedEvents {
  items: GitEvent[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  failed: boolean;
  loadMore: () => void;
}

/**
 * Carga incremental de eventos git de un tipo concreto. Cada seccion de la
 * pantalla usa su propia instancia, de modo que "cargar mas" solo afecta a
 * la lista sobre la que se pulsa.
 */
function usePagedEvents(
  projectId: string | undefined,
  enabled: boolean,
  type: GitEventType,
  status?: string,
): PagedEvents {
  const [items, setItems] = useState<GitEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const pageRef = useRef(0);

  const fetchPage = useCallback(
    async (page: number) => {
      if (!projectId) return;
      try {
        const res = await gitApi.getProjectEvents(projectId, { type, status, page, size: PAGE_SIZE });
        setItems(prev => (page === 0 ? res.items : [...prev, ...res.items]));
        setTotal(res.totalElements);
        setHasMore(res.hasNext);
        pageRef.current = page;
      } catch {
        setFailed(true);
      }
    },
    [projectId, type, status],
  );

  useEffect(() => {
    if (!projectId || !enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPage(0).finally(() => setLoading(false));
  }, [projectId, enabled, fetchPage]);

  const loadMore = () => {
    setLoadingMore(true);
    fetchPage(pageRef.current + 1).finally(() => setLoadingMore(false));
  };

  return { items, total, hasMore, loading, loadingMore, failed, loadMore };
}

export default function RepositoryPage() {
  const { t, i18n } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();

  const [integration, setIntegration] = useState<GitIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    gitApi
      .getConfig(projectId)
      .then(setIntegration)
      .catch(() => setError(t('projects.repository.loadError')))
      .finally(() => setLoading(false));
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const connected = !!integration;
  const openPrs = usePagedEvents(projectId, connected, 'PULL_REQUEST', 'open');
  const commits = usePagedEvents(projectId, connected, 'COMMIT');
  const branches = usePagedEvents(projectId, connected, 'BRANCH');

  const sectionFailed = openPrs.failed || commits.failed || branches.failed;

  const renderEvent = (event: GitEvent, icon: React.ReactNode, prefix?: string) => (
    <a
      key={event.id}
      href={event.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderTop: '1px solid var(--border)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 150ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ display: 'flex', flexShrink: 0, color: 'var(--text-muted)' }}>{icon}</span>

      {prefix && (
        <code style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono, monospace)',
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}>
          {prefix}
        </code>
      )}

      <span style={{
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}>
        {event.title}
      </span>

      {event.status && (
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: PR_STATUS_COLORS[event.status] ?? 'var(--text-muted)',
          background: `${PR_STATUS_COLORS[event.status] ?? '#6B7280'}14`,
          border: `1px solid ${PR_STATUS_COLORS[event.status] ?? '#6B7280'}35`,
          borderRadius: 'var(--radius-sm)',
          padding: '1px 7px',
          flexShrink: 0,
        }}>
          {event.status}
        </span>
      )}

      {event.taskTitle ? (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          color: '#2563EB',
          background: 'rgba(37,99,235,0.08)',
          border: '1px solid rgba(37,99,235,0.2)',
          borderRadius: 'var(--radius-pill)',
          padding: '2px 8px',
          flexShrink: 0,
          maxWidth: 420,
        }}>
          <CheckSquare size={10} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {event.taskTitle}
          </span>
        </span>
      ) : (
        <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>—</span>
      )}

      {event.author && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>@{event.author}</span>
      )}

      <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>
        {relativeTime(event.receivedAt, i18n.language)}
      </span>

      <ExternalLink size={12} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
    </a>
  );

  const renderSection = (
    title: string,
    emptyLabel: string,
    icon: React.ReactNode,
    paged: PagedEvents,
    renderItem: (event: GitEvent) => React.ReactNode,
  ) => (
    <section style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px' }}>
        <span style={{ display: 'flex', color: 'var(--text-muted)' }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</h3>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          background: 'var(--bg-hover)',
          borderRadius: 'var(--radius-pill)',
          padding: '1px 8px',
        }}>
          {paged.hasMore ? `${paged.items.length}/${paged.total}` : paged.total}
        </span>
      </header>

      {paged.loading ? (
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: '20px 0', borderTop: '1px solid var(--border)',
        }}>
          <div style={{
            width: 18, height: 18,
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent-text)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : paged.items.length === 0 ? (
        <p style={{
          margin: 0,
          padding: '16px 18px',
          borderTop: '1px solid var(--border)',
          fontSize: 13,
          color: 'var(--text-faint)',
          fontStyle: 'italic',
        }}>
          {emptyLabel}
        </p>
      ) : (
        <>
          {paged.items.map(renderItem)}
          {paged.hasMore && (
            <button
              onClick={paged.loadMore}
              disabled={paged.loadingMore}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                borderTop: '1px solid var(--border)',
                background: 'transparent',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--accent-text)',
                cursor: paged.loadingMore ? 'default' : 'pointer',
                opacity: paged.loadingMore ? 0.6 : 1,
                transition: 'background 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {paged.loadingMore ? (
                <div style={{
                  width: 13, height: 13,
                  border: '2px solid var(--border)',
                  borderTopColor: 'var(--accent-text)',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <ChevronDown size={13} strokeWidth={2.5} />
              )}
              {t('projects.repository.loadMore')}
            </button>
          )}
        </>
      )}
    </section>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{
          width: 28, height: 28,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent-text)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(error || sectionFailed) && (
        <Alert
          type="error"
          message={error ?? t('projects.repository.loadError')}
          onClose={() => setError(null)}
        />
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GitBranch size={22} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          <PageTitle as="h2" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {t('projects.repository.title')}
          </PageTitle>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>
          {t('projects.repository.subtitle')}
        </p>
      </div>

      {!integration ? (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '64px 32px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            width: 56, height: 56,
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <GitBranch size={24} strokeWidth={1.5} style={{ color: 'var(--accent-text)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {t('projects.repository.notConnected')}
          </p>
          <p style={{ margin: '8px 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
            {t('projects.repository.notConnectedSubtitle')}
          </p>
          <Link
            to={`/workspaces/${workspaceId}/projects/${projectId}/settings`}
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              background: 'var(--accent)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            {t('projects.repository.goToSettings')}
          </Link>
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <GitBranch size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('projects.repository.connectedTo')}
            </span>
            <a
              href={integration.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text)', textDecoration: 'none' }}
            >
              {integration.repositoryUrl.replace(/^https?:\/\//, '')}
            </a>
          </div>

          {renderSection(
            t('projects.repository.openPullRequests'),
            t('projects.repository.noPullRequests'),
            <GitPullRequest size={16} strokeWidth={2} />,
            openPrs,
            e => renderEvent(e, <GitPullRequest size={14} strokeWidth={2} />, `#${e.externalId}`),
          )}

          {renderSection(
            t('projects.repository.recentCommits'),
            t('projects.repository.noCommits'),
            <GitCommit size={16} strokeWidth={2} />,
            commits,
            e => renderEvent(e, <GitCommit size={14} strokeWidth={2} />, e.externalId.slice(0, 7)),
          )}

          {renderSection(
            t('projects.repository.branches'),
            t('projects.repository.noBranches'),
            <GitBranch size={16} strokeWidth={2} />,
            branches,
            e => renderEvent(e, <GitBranch size={14} strokeWidth={2} />),
          )}

        </>
      )}
    </div>
  );
}
