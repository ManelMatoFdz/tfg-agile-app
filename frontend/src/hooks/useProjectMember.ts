import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { projectsApi } from '../api/projects';
import type { ProjectMember } from '../types';

export interface ProjectMemberPermissions {
  member: ProjectMember | null;
  loading: boolean;
  isAdmin: boolean;
  isScrumMaster: boolean;
  isProductOwner: boolean;
  isViewer: boolean;
  /** PO, SM or ADMIN — can activate/complete sprints */
  canManageSprint: boolean;
  /** PO, SM or ADMIN — can add/remove tasks from sprint */
  canPlanSprint: boolean;
  /** ADMIN, PO or SM — can delete tasks */
  canDeleteTask: boolean;
  /** Any role except VIEWER */
  canCreateTask: boolean;
  /** ADMIN or Developer (not PO, not SM) — can move/create tasks on the sprint board */
  canMoveTask: boolean;
}

export function useProjectMember(projectId: string | undefined): ProjectMemberPermissions {
  const currentUser = useAuthStore((s) => s.user);
  const [member, setMember] = useState<ProjectMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    projectsApi
      .getMembers(projectId)
      .then((members) => {
        setMember(members.find((m) => m.userId === currentUser.id) ?? null);
      })
      .catch(() => setMember(null))
      .finally(() => setLoading(false));
  }, [projectId, currentUser?.id]);

  const isAdmin = member?.role === 'ADMIN';
  const isScrumMaster = member?.scrumRole === 'SCRUM_MASTER';
  const isProductOwner = member?.scrumRole === 'PRODUCT_OWNER';
  const isViewer = member?.role === 'VIEWER';

  const canManageSprint = isAdmin || isScrumMaster || isProductOwner;
  const canPlanSprint = isAdmin || isScrumMaster || isProductOwner;
  const canDeleteTask = isAdmin || isScrumMaster || isProductOwner;
  const canCreateTask = !isViewer && member !== null;
  // Sprint board belongs to the Development Team: only Developers + ADMIN can move/create tasks
  const canMoveTask = isAdmin || (member !== null && !isViewer && !isProductOwner && !isScrumMaster);

  return {
    member,
    loading,
    isAdmin,
    isScrumMaster,
    isProductOwner,
    isViewer,
    canManageSprint,
    canPlanSprint,
    canDeleteTask,
    canCreateTask,
    canMoveTask,
  };
}
