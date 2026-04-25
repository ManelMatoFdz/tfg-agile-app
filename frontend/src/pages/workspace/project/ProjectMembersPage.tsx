import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '../../../api/projects';
import { useApiAction } from '../../../hooks/useApiAction';
import { useUserMap } from '../../../hooks/useUserMap';
import Alert from '../../../components/ui/Alert';
import type { ProjectMember, ProjectRole } from '../../../types';

const ROLE_COLORS: Record<ProjectRole, string> = {
  ADMIN: 'bg-primary-100 text-primary-700',
  MEMBER: 'bg-emerald-100 text-emerald-700',
  VIEWER: 'bg-gray-100 text-gray-600',
};

function MemberRow({ member, displayName, avatarUrl }: { member: ProjectMember; displayName: string; avatarUrl?: string }) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50/70 transition-colors">
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
            {t('common.since', { date: new Date(member.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {member.scrumRole && (
          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
            {member.scrumRole.replace('_', ' ')}
          </span>
        )}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[member.role]}`}>
          {t(`projects.members.roles.${member.role}`)}
        </span>
      </div>
    </div>
  );
}

export default function ProjectMembersPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const membersAction = useApiAction<ProjectMember[]>();

  useEffect(() => {
    if (!projectId) return;
    membersAction.run(projectsApi.getMembers(projectId)).then((data) => {
      if (data) setMembers(data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const userMap = useUserMap(members.map((m) => m.userId));

  return (
    <div className="glass-card-strong p-6">
      {membersAction.error && (
        <Alert type="error" message={membersAction.error} onClose={membersAction.reset} />
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          {t('projects.members.title')}
          {members.length > 0 && (
            <span className="ml-2 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {members.length}
            </span>
          )}
        </h2>
      </div>

      {membersAction.loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">{t('projects.members.noMembers')}</p>
      ) : (
        <div className="divide-y divide-gray-100/60">
          {members.map((m) => {
            const u = userMap.get(m.userId);
            return (
              <MemberRow
                key={m.id}
                member={m}
                displayName={u?.fullName || u?.username || m.userId}
                avatarUrl={u?.avatarUrl}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}