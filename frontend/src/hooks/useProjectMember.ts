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
  isDeveloper: boolean;
  isViewer: boolean;
  /** PO or ADMIN — tasks always start in the backlog, owned by the PO */
  canCreateTask: boolean;
  /** PO or ADMIN — Product Backlog is owned by the PO */
  canEditBacklogTask: boolean;
  /** Developer or ADMIN — Sprint Backlog is owned by the Development Team */
  canEditSprintTask: boolean;
  /** PO or ADMIN */
  canDeleteBacklogTask: boolean;
  /** Developer or ADMIN */
  canDeleteSprintTask: boolean;
  /** Developer or ADMIN — moving tasks on the Kanban board */
  canMoveTask: boolean;
  /** Developer, PO or ADMIN — Sprint Planning: Developers select, PO proposes */
  canPlanSprint: boolean;
  /** Developer or ADMIN — add/remove tasks from an ACTIVE sprint (team self-organizes) */
  canAddToActiveSprint: boolean;
  /** SM or ADMIN — sprint lifecycle (create, activate, complete) */
  canManageSprint: boolean;
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
      .then((response) => {
        const members = response.data;
        setMember(members.find((m) => m.userId === currentUser.id) ?? null);
      })
      .catch(() => setMember(null))
      .finally(() => setLoading(false));
  }, [projectId, currentUser?.id]);

  const isAdmin = member?.role === 'ADMIN';
  const isScrumMaster = member?.scrumRole === 'SCRUM_MASTER';
  const isProductOwner = member?.scrumRole === 'PRODUCT_OWNER';
  const isViewer = member?.role === 'VIEWER';
  // Developer: any project member who is not ADMIN, VIEWER, PO, or SM
  const isDeveloper = member !== null && !isAdmin && !isViewer && !isProductOwner && !isScrumMaster;

  const canCreateTask = isAdmin || isProductOwner;
  const canEditBacklogTask = isAdmin || isProductOwner;
  const canEditSprintTask = isAdmin || isDeveloper;
  const canDeleteBacklogTask = isAdmin || isProductOwner;
  const canDeleteSprintTask = isAdmin || isDeveloper;
  const canMoveTask = isAdmin || isDeveloper;
  const canPlanSprint = isAdmin || isProductOwner || isDeveloper;
  const canAddToActiveSprint = isAdmin || isDeveloper;
  const canManageSprint = isAdmin || isScrumMaster;

  return {
    member,
    loading,
    isAdmin,
    isScrumMaster,
    isProductOwner,
    isDeveloper,
    isViewer,
    canCreateTask,
    canEditBacklogTask,
    canEditSprintTask,
    canDeleteBacklogTask,
    canDeleteSprintTask,
    canMoveTask,
    canPlanSprint,
    canAddToActiveSprint,
    canManageSprint,
  };
}
