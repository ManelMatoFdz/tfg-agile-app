import { useEffect, useState } from 'react';
import { projectsApi } from '../api/projects';
import { usersApi } from '../api/users';
import type { ProjectMember, UserSummary } from '../types';

export interface ProjectMembersResult {
  members: ProjectMember[];
  userMap: Record<string, UserSummary>;
  loading: boolean;
}

export function useProjectMembers(projectId: string | undefined): ProjectMembersResult {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [userMap, setUserMap] = useState<Record<string, UserSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    projectsApi
      .getMembers(projectId)
      .then(async (response) => {
        const ms = response.data;
        setMembers(ms);
        if (ms.length === 0) return;
        const summaries = await usersApi.batch(ms.map((m) => m.userId)).then((r) => r.data);
        const map: Record<string, UserSummary> = {};
        for (const s of summaries) map[s.id] = s;
        setUserMap(map);
      })
      .catch(() => {
        setMembers([]);
        setUserMap({});
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  return { members, userMap, loading };
}