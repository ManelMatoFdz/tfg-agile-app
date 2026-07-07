import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { projectsApi } from '../api/projects';
import { workspacesApi } from '../api/workspaces';
import type { TeamMember } from '../types';

export interface ProjectMemberPermissions {
  member: TeamMember | null;
  loading: boolean;
  isAdmin: boolean;
  isScrumMaster: boolean;
  isProductOwner: boolean;
  isDeveloper: boolean;
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
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [wsAdmin, setWsAdmin] = useState(false);
  const [teamAdmin, setTeamAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const fetchPermissions = async () => {
      try {
        // Fetch team members for this project
        const teamMembersRes = await projectsApi.getTeamMembers(projectId);
        const me = teamMembersRes.data.find((m) => m.userId === currentUser.id) ?? null;
        setMember(me);
        setTeamAdmin(me?.role === 'ADMIN');

        // Check workspace admin status
        if (workspaceId) {
          const wsMembers = await workspacesApi.getMembers(workspaceId);
          const wsMember = wsMembers.data.find((m) => m.userId === currentUser.id);
          setWsAdmin(wsMember?.role === 'ADMIN');
        }
      } catch {
        setMember(null);
        setWsAdmin(false);
        setTeamAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [projectId, currentUser?.id, workspaceId]);

  const isAdmin = wsAdmin || teamAdmin;
  const isScrumMaster = member?.scrumRole === 'SCRUM_MASTER';
  const isProductOwner = member?.scrumRole === 'PRODUCT_OWNER';
  // Developer: any team member who is not admin, PO, or SM
  const isDeveloper = (member !== null || wsAdmin) && !isAdmin && !isProductOwner && !isScrumMaster;

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