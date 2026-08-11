import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GitBranch, GitCommit, GitPullRequest, ExternalLink } from 'lucide-react';
import type { GitEvent, GitIntegration } from '../../../types';
import { gitApi } from '../../../api/git';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import { relativeTime } from '../../../utils/relativeTime';

const PR_STATUS_COLORS: Record<string, string> = {
  open: '#16A34A',
  merged: '#7C3AED',
  closed: '#DC2626',
};

export default function RepositoryPage() {
  const { t, i18n } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();

  const [integration, setIntegration] = useState<GitIntegration | null>(null);
  const [events, setEvents] = useState<GitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([gitApi.getConfig(projectId), gitApi.getProjectEvents(projectId)])
      .then(([config, gitEvents]) => {
        setIntegration(config);
        setEvents(gitEvents);
      })
      .catch(() => setError(t('projects.repository.loadError')))
      .finally(() => setLoading(false));
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openPrs = events.filter(e => e.type === 'PULL_REQUEST' && e.status === 'open');
  const commits = events.filter(e => e.type === 'COMMIT').slice(0, 20);
  const branches = events.filter(e => e.type === 'BRANCH');

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

      <span style={{
        fontSize: 11,
        color: 'var(--text-faint)',
        flexShrink: 0,
        maxWidth: 180,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}>
        {event.taskTitle ?? t('projects.repository.unlinked')}
      </span>

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
    items: GitEvent[],
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
          {items.length}
        </span>
      </header>
      {items.length === 0 ? (
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
        items.map(renderItem)
      )}
    </section>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{
          width: 28, height: 28,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

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
            <GitBranch size={24} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
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
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
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
